import crypto from 'crypto';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

/**
 * Сервис для аутентификации пользователей через Telegram Mini App
 */
export class TelegramAuthService {
  private botToken: string;

  constructor() {
    this.botToken = process.env.BOT_TOKEN || '';
    if (!this.botToken) {
      throw new Error('BOT_TOKEN is not configured');
    }
  }

  /**
   * Валидация данных от Telegram WebApp
   */
  validateWebAppData(initData: string): boolean {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      
      if (!hash) {
        logger.error('No hash in WebApp data');
        return false;
      }

      // Удаляем hash из параметров
      urlParams.delete('hash');
      
      // Сортируем параметры
      const params = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Создаем секретный ключ
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      // Проверяем подпись
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(params)
        .digest('hex');

      return calculatedHash === hash;
    } catch (error) {
      logger.error('Error validating WebApp data:', error);
      return false;
    }
  }

  /**
   * Парсинг данных пользователя из initData
   */
  parseUserData(initData: string): any {
    try {
      const urlParams = new URLSearchParams(initData);
      const userParam = urlParams.get('user');
      
      if (!userParam) {
        throw new Error('No user data in initData');
      }

      return JSON.parse(userParam);
    } catch (error) {
      logger.error('Error parsing user data:', error);
      throw error;
    }
  }

  /**
   * Создание или обновление пользователя
   */
  async authenticateUser(initData: string) {
    // Валидируем данные
    if (!this.validateWebAppData(initData)) {
      throw new Error('Invalid WebApp data signature');
    }

    // Парсим данные пользователя
    const userData = this.parseUserData(initData);
    
    // Создаем или обновляем пользователя в БД
    const user = await prisma.user.upsert({
      where: { 
        telegramId: parseInt(userData.id) 
      },
      update: {
        username: userData.username || null,
        firstName: userData.first_name,
        lastName: userData.last_name || null,
        photoUrl: userData.photo_url || null,
        languageCode: userData.language_code || 'en',
        isPremium: userData.is_premium || false,
        lastActive: new Date()
      },
      create: {
        telegramId: parseInt(userData.id),
        username: userData.username || null,
        firstName: userData.first_name,
        lastName: userData.last_name || null,
        photoUrl: userData.photo_url || null,
        languageCode: userData.language_code || 'en',
        isPremium: userData.is_premium || false,
        // Начальный баланс для новых пользователей
        balance: {
          create: {
            tokens: 100, // Бонус при регистрации
            freeTokens: 100,
            paidTokens: 0,
            totalSpent: 0
          }
        },
        // Создаем профиль
        profile: {
          create: {
            level: 1,
            experience: 0,
            achievements: [],
            preferences: {
              theme: 'light',
              language: userData.language_code || 'en',
              notifications: true
            }
          }
        }
      },
      include: {
        balance: true,
        profile: true,
        subscription: true
      }
    });

    // Создаем JWT токен для сессии
    const sessionToken = this.generateSessionToken(user);

    // Логируем вход
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: {
          platform: 'mini_app',
          ip: null, // Будет заполнено из request
          userAgent: null // Будет заполнено из request
        },
        ip: null,
        userAgent: null
      }
    });

    return {
      user,
      sessionToken
    };
  }

  /**
   * Генерация JWT токена для сессии
   */
  private generateSessionToken(user: any): string {
    // Здесь должна быть реализация JWT
    // Пока используем простой токен
    const payload = {
      userId: user.id,
      telegramId: user.telegramId,
      timestamp: Date.now()
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Проверка токена сессии
   */
  async verifySessionToken(token: string) {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Проверяем срок действия (24 часа)
      const tokenAge = Date.now() - payload.timestamp;
      if (tokenAge > 24 * 60 * 60 * 1000) {
        throw new Error('Token expired');
      }

      // Получаем пользователя
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          balance: true,
          profile: true,
          subscription: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error verifying session token:', error);
      throw error;
    }
  }

  /**
   * Обновление аватарки пользователя
   */
  async updateUserAvatar(userId: string, photoUrl: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { photoUrl }
    });
  }
}
