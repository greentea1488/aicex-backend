import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export class UserService {
  private static readonly DEFAULT_STARTING_TOKENS = 500; // Единые стартовые токены для всех

  /**
   * Находит или создает пользователя с едиными настройками
   */
  static async findOrCreateUser(telegramUserData: TelegramUserData): Promise<any> {
    try {
      // Сначала пытаемся найти существующего пользователя
      let user = await prisma.user.findUnique({
        where: { telegramId: telegramUserData.id }
      });

      if (!user) {
        // Создаем нового пользователя с едиными настройками
        user = await prisma.user.create({
          data: {
            telegramId: telegramUserData.id,
            username: telegramUserData.username || `user_${telegramUserData.id}`,
            firstName: telegramUserData.first_name || '',
            lastName: telegramUserData.last_name || '',
            tokens: this.DEFAULT_STARTING_TOKENS,
            subscription: null
          }
        });

        logger.info('✅ New user created with unified settings', {
          userId: user.id,
          telegramId: user.telegramId,
          username: user.username,
          startingTokens: user.tokens
        });

        console.log('==================== NEW USER CREATED (UNIFIED) ====================');
        console.log('User ID:', user.id);
        console.log('Telegram ID:', user.telegramId);
        console.log('Username:', user.username);
        console.log('Starting tokens:', user.tokens);
        console.log('===============================================================');
      } else {
        logger.info('📱 Existing user found', {
          userId: user.id,
          telegramId: user.telegramId,
          currentTokens: user.tokens
        });

        console.log('==================== EXISTING USER LOGIN (UNIFIED) ====================');
        console.log('User ID:', user.id);
        console.log('Telegram ID:', user.telegramId);
        console.log('Current tokens:', user.tokens);
        console.log('===============================================================');
      }

      return user;
    } catch (error) {
      logger.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  /**
   * Получает профиль пользователя
   */
  static async getUserProfile(telegramId: number): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          tokens: true,
          subscription: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Обновляет токены пользователя
   */
  static async updateUserTokens(telegramId: number, newTokenCount: number): Promise<void> {
    try {
      await prisma.user.update({
        where: { telegramId },
        data: { tokens: newTokenCount }
      });

      logger.info('User tokens updated', {
        telegramId,
        newTokenCount
      });
    } catch (error) {
      logger.error('Error updating user tokens:', error);
      throw error;
    }
  }

  /**
   * Получает статистику пользователя
   */
  static async getUserStats(telegramId: number): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: {
          tokens: true,
          _count: {
            select: {
              freepikTasks: true,
              midjourneyTasks: true,
              runwayTasks: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const totalGenerations = 
        user._count.freepikTasks + 
        user._count.midjourneyTasks + 
        user._count.runwayTasks;

      return {
        tokens: user.tokens,
        totalGenerations,
        freepikGenerations: user._count.freepikTasks,
        midjourneyGenerations: user._count.midjourneyTasks,
        runwayGenerations: user._count.runwayTasks
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}
