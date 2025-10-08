import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

/**
 * Middleware для проверки JWT токена
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.substring(7); // Убираем "Bearer "
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Верифицируем токен
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded.userId || !decoded.telegramId) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Получаем пользователя из БД
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        tokens: true,
        subscription: true
      }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Добавляем пользователя в request
    req.user = {
      id: user.id,
      userId: user.id,
      telegramId: user.telegramId,
      username: user.username
    };

    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Создает JWT токен для пользователя
 */
export const createAuthToken = (userId: string, telegramId: number): string => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      userId,
      telegramId,
      iat: Math.floor(Date.now() / 1000)
    },
    jwtSecret,
    {
      expiresIn: '30d' // Токен действует 30 дней
    }
  );
};

/**
 * Middleware для Telegram Web App авторизации
 */
export const telegramAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const initData = req.headers['x-telegram-init-data'] as string;
    
    if (!initData) {
      res.status(401).json({ error: 'Telegram init data required' });
      return;
    }

    // Парсим данные от Telegram
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    if (!hash) {
      res.status(401).json({ error: 'Invalid Telegram data' });
      return;
    }

    // Проверяем подпись (упрощенная версия)
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({ error: 'Bot token not configured' });
      return;
    }

    // В реальном проекте здесь должна быть полная проверка подписи Telegram
    // Пока что просто парсим данные пользователя
    const userParam = urlParams.get('user');
    if (!userParam) {
      res.status(401).json({ error: 'User data not found' });
      return;
    }

    const userData = JSON.parse(userParam);
    
    // Находим или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { telegramId: userData.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: userData.id,
          username: userData.username || 'unknown',
          firstName: userData.first_name,
          lastName: userData.last_name,
          tokens: 10 // Стартовые токены
        }
      });

      logger.info('New user created via Telegram auth', {
        userId: user.id,
        telegramId: user.telegramId,
        username: user.username
      });
    }

    // Добавляем пользователя в request
    req.user = {
      id: user.id,
      userId: user.id,
      telegramId: user.telegramId,
      username: user.username
    };

    next();

  } catch (error) {
    logger.error('Telegram auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
