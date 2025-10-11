import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

export class ReferralService {
  // Бонусы за реферальную программу
  private static readonly REFERRER_BONUS = 100; // Бонус пригласившему
  private static readonly REFEREE_BONUS = 50;   // Бонус новому пользователю

  /**
   * Обработать реферальную ссылку при регистрации
   */
  static async processReferral(
    newUserId: string,
    newUserTelegramId: number,
    referrerTelegramId: number
  ): Promise<{ success: boolean; referrerBonus?: number; refereeBonus?: number }> {
    try {
      // Найти пригласившего пользователя
      const referrer = await prisma.user.findUnique({
        where: { telegramId: referrerTelegramId },
        select: { id: true, tokens: true, telegramId: true, username: true }
      });

      if (!referrer) {
        logger.warn(`Referrer not found: ${referrerTelegramId}`);
        return { success: false };
      }

      // Проверяем, что пользователь не пытается пригласить сам себя
      if (referrer.telegramId === newUserTelegramId) {
        logger.warn(`User tried to refer themselves: ${newUserTelegramId}`);
        return { success: false };
      }

      // Обновляем связь реферала
      await prisma.user.update({
        where: { id: newUserId },
        data: { referral: referrer.id }
      });

      // Увеличиваем счетчик рефералов у пригласившего
      await prisma.user.update({
        where: { id: referrer.id },
        data: { 
          friendsReferred: { increment: 1 },
          tokens: { increment: this.REFERRER_BONUS }
        }
      });

      // Добавляем бонусные токены новому пользователю
      await prisma.user.update({
        where: { id: newUserId },
        data: { tokens: { increment: this.REFEREE_BONUS } }
      });

      // Записываем транзакции в историю токенов
      await Promise.all([
        // Бонус пригласившему
        prisma.tokenHistory.create({
          data: {
            userId: referrer.id,
            amount: this.REFERRER_BONUS,
            type: 'REFERRAL',
            description: `Бонус за приглашение друга (@${newUserTelegramId})`,
            balanceBefore: referrer.tokens,
            balanceAfter: referrer.tokens + this.REFERRER_BONUS
          }
        }),
        // Бонус новому пользователю
        prisma.tokenHistory.create({
          data: {
            userId: newUserId,
            amount: this.REFEREE_BONUS,
            type: 'BONUS',
            description: `Бонус за регистрацию по реферальной ссылке`,
            balanceBefore: 100, // Стартовые токены
            balanceAfter: 100 + this.REFEREE_BONUS
          }
        })
      ]);

      logger.info(`Referral processed: ${referrerTelegramId} -> ${newUserTelegramId}`);
      
      return {
        success: true,
        referrerBonus: this.REFERRER_BONUS,
        refereeBonus: this.REFEREE_BONUS
      };
    } catch (error) {
      logger.error('Error processing referral:', error);
      return { success: false };
    }
  }

  /**
   * Получить статистику рефералов для пользователя
   */
  static async getReferralStats(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true, friendsReferred: true, tokens: true }
      });

      if (!user) return null;

      // Получить список рефералов
      const referrals = await prisma.user.findMany({
        where: { referral: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          createdAt: true,
          tokens: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Подсчитать заработанные токены за рефералов
      const earnedTokens = user.friendsReferred * this.REFERRER_BONUS;

      const botUsername = process.env.BOT_USERNAME || 'aicex_bot';
      
      return {
        referralLink: `https://t.me/${botUsername}?start=ref_${user.telegramId}`,
        totalReferrals: user.friendsReferred,
        earnedTokens,
        referrerBonus: this.REFERRER_BONUS,
        refereeBonus: this.REFEREE_BONUS,
        referrals: referrals.map(r => ({
          id: r.id,
          username: r.username,
          firstName: r.firstName,
          createdAt: r.createdAt,
          tokens: r.tokens
        }))
      };
    } catch (error) {
      logger.error('Error getting referral stats:', error);
      return null;
    }
  }

  /**
   * Отправить уведомление о новом реферале через бот
   */
  static async notifyReferrer(referrerTelegramId: number, newUserInfo: { username?: string; firstName?: string }) {
    try {
      // Эта функция будет вызываться из production-bot.ts
      // где есть доступ к bot.api
      logger.info(`Should notify referrer ${referrerTelegramId} about new referral`);
      return true;
    } catch (error) {
      logger.error('Error notifying referrer:', error);
      return false;
    }
  }
}

