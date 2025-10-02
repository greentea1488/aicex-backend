import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Расширяем интерфейс Request для добавления user
// Используем UserPayload из jwtMw.ts

/**
 * Middleware для проверки админских прав
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Проверяем админские права
    // В реальном проекте это должно проверяться через БД или конфиг
    const adminTelegramIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || [];
    
    if (!adminTelegramIds.includes(user.telegramId)) {
      logger.warn('Unauthorized admin access attempt', {
        userId: user.id,
        telegramId: user.telegramId,
        username: user.username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Логируем админские действия
    logger.info('Admin action', {
      userId: user.id,
      telegramId: user.telegramId,
      username: user.username,
      action: `${req.method} ${req.path}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();

  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
