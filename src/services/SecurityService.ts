import { logger } from "../utils/logger";
import { ValidationResult, RateLimitConfig } from "../types";
import { prisma } from "../utils/prismaClient";

export class SecurityService {
  private readonly FORBIDDEN_WORDS: readonly string[] = [
    'nsfw', 'adult', 'explicit', 'nude', 'naked', 'porn', 'sex', 'erotic',
    'hack', 'crack', 'virus', 'malware', 'spam', 'scam', 'phishing',
    'violence', 'kill', 'murder', 'suicide', 'death', 'blood',
    'drugs', 'cocaine', 'heroin', 'marijuana', 'cannabis'
  ] as const;

  private readonly NSFW_PATTERNS: readonly RegExp[] = [
    /\b(nude|naked|sex|porn|adult|explicit|erotic)\b/gi,
    /\b(hack|crack|virus|malware|exploit|phishing)\b/gi,
    /\b(kill|murder|suicide|death|violence|blood)\b/gi,
    /\b(drugs|cocaine|heroin|marijuana|cannabis|weed)\b/gi,
    /\b(bomb|explosive|weapon|gun|knife)\b/gi
  ] as const;

  private readonly SUSPICIOUS_PATTERNS: readonly RegExp[] = [
    /(.)\1{10,}/g, // Повторяющиеся символы (спам)
    /[^\w\s]{5,}/g, // Много специальных символов подряд
    /\b\w{50,}\b/g, // Слишком длинные слова
    /(https?:\/\/[^\s]+)/gi // URL в промптах (подозрительно)
  ] as const;
  
  private readonly rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private readonly rateLimitConfig: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000 // 1 минута
  };

  // Кэш для часто проверяемых промптов
  private readonly validationCache = new Map<string, { result: ValidationResult; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут
  
  /**
   * Валидирует промпт на безопасность с кэшированием
   */
  validatePrompt(prompt: string): ValidationResult {
    // Проверяем кэш
    const cacheKey = this.hashPrompt(prompt);
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.result;
    }

    // Проверка длины
    if (!prompt || prompt.trim().length === 0) {
      return this.cacheResult(cacheKey, { valid: false, error: 'Промпт не может быть пустым' });
    }
    
    if (prompt.length < 3) {
      return this.cacheResult(cacheKey, { valid: false, error: 'Промпт слишком короткий (минимум 3 символа)' });
    }
    
    if (prompt.length > 1000) {
      return this.cacheResult(cacheKey, { valid: false, error: 'Промпт слишком длинный (максимум 1000 символов)' });
    }

    // Проверка на подозрительные паттерны
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(prompt)) {
        return this.cacheResult(cacheKey, { 
          valid: false, 
          error: 'Промпт содержит подозрительные символы или структуру' 
        });
      }
    }
    
    // Проверка запрещенных слов (базовая)
    const lowerPrompt = prompt.toLowerCase();
    for (const word of this.FORBIDDEN_WORDS) {
      if (lowerPrompt.includes(word)) {
        return this.cacheResult(cacheKey, { 
          valid: false, 
          error: 'Промпт содержит запрещенный контент' 
        });
      }
    }

    // Проверка NSFW паттернов (продвинутая)
    for (const pattern of this.NSFW_PATTERNS) {
      if (pattern.test(prompt)) {
        return this.cacheResult(cacheKey, { 
          valid: false, 
          error: 'Контент нарушает правила использования' 
        });
      }
    }

    // Проверка на количество слов (защита от спама)
    const words = prompt.split(/\s+/);
    if (words.length > 100) {
      return this.cacheResult(cacheKey, { 
        valid: false, 
        error: 'Промпт слишком длинный (максимум 100 слов)' 
      });
    }

    // Проверка на повторяющиеся слова (спам)
    const wordCount = new Map<string, number>();
    for (const word of words) {
      const count = wordCount.get(word.toLowerCase()) || 0;
      wordCount.set(word.toLowerCase(), count + 1);
      if (count > 5) {
        return this.cacheResult(cacheKey, { 
          valid: false, 
          error: 'Промпт содержит слишком много повторяющихся слов' 
        });
      }
    }
    
    return this.cacheResult(cacheKey, { valid: true });
  }

  /**
   * Создает хэш промпта для кэширования
   */
  private hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Кэширует результат валидации
   */
  private cacheResult(key: string, result: ValidationResult): ValidationResult {
    this.validationCache.set(key, {
      result,
      expires: Date.now() + this.CACHE_TTL
    });
    return result;
  }
  
  /**
   * Проверяет rate limit для пользователя
   */
  async checkRateLimit(userId: number, action: string): Promise<boolean> {
    const key = `${userId}_${action}`;
    const now = Date.now();
    const limit = this.rateLimiter.get(key);
    
    // Если лимит не существует или истек, создаем новый
    if (!limit || now > limit.resetTime) {
      this.rateLimiter.set(key, { count: 1, resetTime: now + 60000 }); // 1 минута
      return true;
    }
    
    // Проверяем количество запросов
    if (limit.count >= this.rateLimitConfig.maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId}, action ${action}`);
      return false;
    }
    
    limit.count++;
    return true;
  }
  
  /**
   * Санитизирует пользовательский ввод
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  /**
   * Очищает старые записи rate limiter и кэш валидации
   */
  cleanupRateLimiter(): void {
    const now = Date.now();
    
    // Очистка rate limiter
    for (const [key, limit] of this.rateLimiter.entries()) {
      if (now > limit.resetTime) {
        this.rateLimiter.delete(key);
      }
    }

    // Очистка кэша валидации
    for (const [key, cached] of this.validationCache.entries()) {
      if (now > cached.expires) {
        this.validationCache.delete(key);
      }
    }
  }

  /**
   * Проверяет пользователя на подозрительную активность
   */
  async checkSuspiciousActivity(userId: number): Promise<{ suspicious: boolean; reason?: string }> {
    try {
      // Проверяем количество неудачных запросов за последний час
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const failedTasks = await prisma.auditLog.count({
        where: {
          user: { telegramId: userId },
          action: { in: ['task_failed', 'validation_failed'] },
          timestamp: { gte: oneHourAgo }
        }
      });

      if (failedTasks > 20) {
        return { 
          suspicious: true, 
          reason: 'Слишком много неудачных запросов за последний час' 
        };
      }

      // Проверяем частоту запросов
      const recentRequests = await prisma.auditLog.count({
        where: {
          user: { telegramId: userId },
          timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 минут
        }
      });

      if (recentRequests > 50) {
        return { 
          suspicious: true, 
          reason: 'Слишком высокая частота запросов' 
        };
      }

      return { suspicious: false };
    } catch (error) {
      logger.error('Error checking suspicious activity:', error);
      return { suspicious: false };
    }
  }

  /**
   * Блокирует пользователя временно
   */
  async blockUser(userId: number, reason: string, durationMinutes: number = 30): Promise<void> {
    const key = `blocked_${userId}`;
    const resetTime = Date.now() + (durationMinutes * 60 * 1000);
    
    this.rateLimiter.set(key, { count: 999, resetTime });

    // Записываем в аудит
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: userId },
        select: { id: true }
      });

      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'user_blocked',
            metadata: {
              reason,
              durationMinutes,
              blockedUntil: new Date(resetTime)
            }
          }
        });
      }
    } catch (error) {
      logger.error('Error logging user block:', error);
    }

    logger.warn(`User ${userId} blocked for ${durationMinutes} minutes. Reason: ${reason}`);
  }

  /**
   * Проверяет, заблокирован ли пользователь
   */
  isUserBlocked(userId: number): boolean {
    const key = `blocked_${userId}`;
    const blocked = this.rateLimiter.get(key);
    
    if (!blocked) return false;
    
    if (Date.now() > blocked.resetTime) {
      this.rateLimiter.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Валидирует IP адрес на подозрительность
   */
  validateIPAddress(ip: string): { valid: boolean; reason?: string } {
    // Проверка на локальные IP (в продакшене могут быть подозрительными)
    const localPatterns = [
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./
    ];

    for (const pattern of localPatterns) {
      if (pattern.test(ip)) {
        return { 
          valid: false, 
          reason: 'Запросы с локальных IP адресов запрещены' 
        };
      }
    }

    // Проверка на известные VPN/Proxy диапазоны (базовая)
    const suspiciousPatterns = [
      /^185\./, // Часто используется VPN
      /^46\./, // Подозрительные диапазоны
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(ip)) {
        logger.warn(`Suspicious IP detected: ${ip}`);
        // Не блокируем, но логируем
      }
    }

    return { valid: true };
  }

  /**
   * Получает статистику безопасности
   */
  getSecurityStats(): {
    rateLimiterEntries: number;
    validationCacheEntries: number;
    blockedUsers: number;
  } {
    let blockedUsers = 0;
    for (const [key] of this.rateLimiter.entries()) {
      if (key.startsWith('blocked_')) {
        blockedUsers++;
      }
    }

    return {
      rateLimiterEntries: this.rateLimiter.size,
      validationCacheEntries: this.validationCache.size,
      blockedUsers
    };
  }
}
