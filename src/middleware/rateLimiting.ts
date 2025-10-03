import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

interface RateLimitConfig {
  windowMs: number; // Временное окно в миллисекундах
  maxRequests: number; // Максимальное количество запросов
  message?: string; // Сообщение об ошибке
  keyGenerator?: (req: Request) => string; // Функция генерации ключа
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory хранилище для rate limiting
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.get(key);

    if (existing) {
      existing.count++;
      return existing;
    } else {
      const newEntry = { count: 1, resetTime: now + windowMs };
      this.set(key, newEntry);
      return newEntry;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new RateLimitStore();

// Очистка старых записей каждые 5 минут
setInterval(() => {
  rateLimitStore.cleanup();
}, 5 * 60 * 1000);

/**
 * Создает middleware для rate limiting
 */
export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Слишком много запросов, попробуйте позже',
    keyGenerator = (req) => req.ip || 'unknown'
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const { count, resetTime } = rateLimitStore.increment(key, windowMs);

      // Добавляем заголовки с информацией о лимитах
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - count).toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      });

      if (count > maxRequests) {
        logger.warn(`Rate limit exceeded for key: ${key}, count: ${count}`);
        
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // В случае ошибки пропускаем запрос
      next();
    }
  };
}

/**
 * Rate limiting для API генерации (по telegramId)
 */
export const generationRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 10, // 10 запросов в минуту
  message: 'Слишком много запросов на генерацию. Максимум 10 запросов в минуту.',
  keyGenerator: (req) => {
    const telegramId = req.body?.telegramId || req.params?.telegramId;
    return telegramId ? `generation:${telegramId}` : req.ip || 'unknown';
  }
});

/**
 * Rate limiting для подписок (по telegramId)
 */
export const subscriptionRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 минут
  maxRequests: 3, // 3 запроса в 5 минут
  message: 'Слишком много запросов на подписку. Попробуйте через 5 минут.',
  keyGenerator: (req) => {
    const telegramId = req.body?.telegramId || req.params?.telegramId;
    return telegramId ? `subscription:${telegramId}` : req.ip || 'unknown';
  }
});

/**
 * Общий rate limiting для API (по IP)
 */
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  maxRequests: 100, // 100 запросов в 15 минут
  message: 'Слишком много запросов с вашего IP. Попробуйте позже.'
});

/**
 * Строгий rate limiting для админских функций
 */
export const adminRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 5, // 5 запросов в минуту
  message: 'Слишком много админских запросов. Попробуйте через минуту.'
});

/**
 * Database-based rate limiting для критических операций
 */
export function createDatabaseRateLimit(config: RateLimitConfig & { 
  operation: string;
  checkSubscription?: boolean;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const telegramId = req.body?.telegramId || req.params?.telegramId;
      
      if (!telegramId) {
        return next();
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - config.windowMs);

      // Подсчитываем количество операций в окне
      const operationCount = await prisma.activityLog.count({
        where: {
          user: {
            telegramId: parseInt(telegramId)
          },
          action: config.operation,
          createdAt: {
            gte: windowStart
          }
        }
      });

      // Проверяем подписку если требуется
      if (config.checkSubscription) {
        const user = await prisma.user.findUnique({
          where: { telegramId: parseInt(telegramId) },
          include: { subscription: { include: { plan: true } } }
        });

        // Увеличиваем лимиты для платных пользователей
        let adjustedMaxRequests = config.maxRequests;
        if (user?.subscription?.status === 'ACTIVE') {
          const planName = user.subscription.plan.name;
          if (planName === 'pro') adjustedMaxRequests *= 2;
          if (planName === 'premium') adjustedMaxRequests *= 5;
        }

        if (operationCount >= adjustedMaxRequests) {
          return res.status(429).json({
            success: false,
            error: `Превышен лимит операций ${config.operation}. Максимум ${adjustedMaxRequests} в ${Math.round(config.windowMs / 60000)} минут.`,
            upgradeUrl: user?.subscription ? undefined : `${process.env.FRONTEND_URL}/subscription`
          });
        }
      } else {
        if (operationCount >= config.maxRequests) {
          return res.status(429).json({
            success: false,
            error: config.message || `Превышен лимит операций. Попробуйте позже.`
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Database rate limiting error:', error);
      next();
    }
  };
}

/**
 * Rate limiting для генерации с учетом подписки
 */
export const smartGenerationRateLimit = createDatabaseRateLimit({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 5, // 5 для бесплатных, 10 для pro, 25 для premium
  operation: 'GENERATION_STARTED',
  checkSubscription: true,
  message: 'Превышен лимит генераций. Обновите подписку для увеличения лимитов.'
});

/**
 * Middleware для защиты от злоупотреблений
 */
export async function antiAbuseMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramId = req.body?.telegramId || req.params?.telegramId;
    
    if (!telegramId) {
      return next();
    }

    const userId = parseInt(telegramId);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Проверяем подозрительную активность
    const [
      recentFailures,
      recentGenerations,
      user
    ] = await Promise.all([
      // Количество неудачных генераций за час
      prisma.generationHistory.count({
        where: {
          user: { telegramId: userId },
          status: 'failed',
          createdAt: { gte: oneHourAgo }
        }
      }),
      
      // Общее количество генераций за час
      prisma.generationHistory.count({
        where: {
          user: { telegramId: userId },
          createdAt: { gte: oneHourAgo }
        }
      }),
      
      // Информация о пользователе
      prisma.user.findUnique({
        where: { telegramId: userId },
        include: { subscription: true }
      })
    ]);

    // Блокируем при подозрительной активности
    if (recentFailures > 20) {
      logger.warn(`Suspicious activity detected for user ${userId}: ${recentFailures} failures in 1 hour`);
      return res.status(429).json({
        success: false,
        error: 'Обнаружена подозрительная активность. Обратитесь в поддержку.'
      });
    }

    // Проверяем чрезмерное использование для бесплатных пользователей
    if (!user?.subscription && recentGenerations > 50) {
      return res.status(429).json({
        success: false,
        error: 'Превышен дневной лимит для бесплатных пользователей.',
        upgradeUrl: `${process.env.FRONTEND_URL}/subscription`
      });
    }

    next();
  } catch (error) {
    logger.error('Anti-abuse middleware error:', error);
    next();
  }
}
