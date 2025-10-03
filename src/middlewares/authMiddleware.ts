import { Request, Response, NextFunction } from 'express';
import { TelegramAuthService } from '../services/TelegramAuthService';
import { logger } from '../utils/logger';

// Используем существующий тип UserPayload из jwtMw.ts
// Он уже расширяет Express.Request

/**
 * Middleware для проверки аутентификации через токен
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const authService = new TelegramAuthService();
    const user = await authService.verifySessionToken(token);

    // Добавляем пользователя в request (используем формат UserPayload)
    req.user = {
      id: user.id,
      userId: user.id,
      telegramId: Number(user.telegramId), // Преобразуем в число для совместимости
      username: user.username || undefined
    } as any;

    next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

/**
 * Middleware для опциональной аутентификации
 * Не блокирует запрос, но добавляет user если токен валидный
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const authService = new TelegramAuthService();
      const user = await authService.verifySessionToken(token);
      
      req.user = {
        id: user.id,
        userId: user.id,
        telegramId: Number(user.telegramId),
        username: user.username || undefined
      } as any;
    }

    next();
  } catch (error) {
    // Игнорируем ошибки, просто продолжаем без user
    next();
  }
}

/**
 * Middleware для проверки Telegram WebApp данных
 * Используется для первичной аутентификации
 */
export async function validateWebAppData(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        success: false,
        error: 'initData is required'
      });
    }

    const authService = new TelegramAuthService();
    const isValid = authService.validateWebAppData(initData);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid WebApp data signature'
      });
    }

    next();
  } catch (error: any) {
    logger.error('WebApp validation error:', error);
    return res.status(401).json({
      success: false,
      error: 'WebApp validation failed'
    });
  }
}

/**
 * Middleware для проверки лимитов пользователя
 */
export async function checkUserLimits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Здесь можно добавить проверку лимитов
    // Например, количество запросов в минуту, баланс токенов и т.д.

    next();
  } catch (error: any) {
    logger.error('Limits check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check limits'
    });
  }
}

/**
 * Middleware для логирования активности
 */
export function logActivity(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (userId) {
        // Логируем активность асинхронно, не блокируя запрос
        setImmediate(async () => {
          try {
            const { prisma } = await import('../utils/prismaClient');
            await prisma.activityLog.create({
              data: {
                userId,
                action,
                details: {
                  method: req.method,
                  path: req.path,
                  query: req.query,
                  body: req.body ? Object.keys(req.body) : []
                },
                ip: req.ip || req.connection.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null
              }
            });
          } catch (error) {
            logger.error('Failed to log activity:', error);
          }
        });
      }

      next();
    } catch (error) {
      // Не блокируем запрос при ошибке логирования
      next();
    }
  };
}
