import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

/**
 * Сервис управления балансом и токенами пользователей
 */
export class BalanceService {
  /**
   * Получить баланс пользователя
   */
  async getBalance(userId: string) {
    try {
      let balance = await prisma.balance.findUnique({
        where: { userId }
      });

      // Создаем баланс если его нет
      if (!balance) {
        balance = await prisma.balance.create({
          data: {
            userId,
            tokens: 100, // Начальный бонус
            freeTokens: 100,
            paidTokens: 0,
            totalSpent: 0
          }
        });
      }

      return balance;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Добавить токены (покупка или бонус)
   */
  async addTokens(
    userId: string,
    amount: number,
    type: 'PURCHASE' | 'BONUS' | 'REFERRAL' | 'ADMIN_ADJUST',
    description?: string,
    paymentId?: string
  ) {
    try {
      // Получаем текущий баланс
      const balance = await prisma.balance.findUnique({
        where: { userId }
      });

      if (!balance) {
        throw new Error('Balance not found');
      }

      const balanceBefore = balance.tokens;
      const balanceAfter = balanceBefore + amount;

      // Обновляем баланс
      const updatedBalance = await prisma.balance.update({
        where: { userId },
        data: {
          tokens: balanceAfter,
          paidTokens: type === 'PURCHASE' ? balance.paidTokens + amount : balance.paidTokens,
          freeTokens: type !== 'PURCHASE' ? balance.freeTokens + amount : balance.freeTokens
        }
      });

      // Записываем в историю
      await prisma.tokenHistory.create({
        data: {
          userId,
          amount,
          type,
          description: description || `${type}: +${amount} tokens`,
          balanceBefore,
          balanceAfter,
          paymentId,
          metadata: {
            timestamp: new Date().toISOString(),
            source: type
          }
        }
      });

      logger.info(`Tokens added: userId=${userId}, amount=${amount}, type=${type}`);
      return updatedBalance;
    } catch (error) {
      logger.error('Error adding tokens:', error);
      throw error;
    }
  }

  /**
   * Списать токены за использование сервиса
   */
  async deductTokens(
    userId: string,
    amount: number,
    service: string,
    taskId?: string,
    description?: string
  ) {
    try {
      // Получаем текущий баланс
      const balance = await prisma.balance.findUnique({
        where: { userId }
      });

      if (!balance) {
        throw new Error('Balance not found');
      }

      if (balance.tokens < amount) {
        throw new Error('Insufficient balance');
      }

      const balanceBefore = balance.tokens;
      const balanceAfter = balanceBefore - amount;

      // Обновляем баланс
      const updatedBalance = await prisma.balance.update({
        where: { userId },
        data: {
          tokens: balanceAfter,
          totalSpent: balance.totalSpent + amount
        }
      });

      // Определяем тип транзакции
      const typeMap: Record<string, string> = {
        'freepik': 'SPEND_FREEPIK',
        'midjourney': 'SPEND_MIDJOURNEY',
        'runway': 'SPEND_RUNWAY',
        'chatgpt': 'SPEND_CHATGPT'
      };

      // Записываем в историю
      await prisma.tokenHistory.create({
        data: {
          userId,
          amount: -amount, // Отрицательное значение для списания
          type: (typeMap[service.toLowerCase()] || 'SPEND_FREEPIK') as any,
          description: description || `${service}: -${amount} tokens`,
          service,
          taskId,
          balanceBefore,
          balanceAfter,
          metadata: {
            timestamp: new Date().toISOString(),
            service,
            taskId
          }
        }
      });

      logger.info(`Tokens deducted: userId=${userId}, amount=${amount}, service=${service}`);
      return updatedBalance;
    } catch (error) {
      logger.error('Error deducting tokens:', error);
      throw error;
    }
  }

  /**
   * Проверить достаточно ли токенов
   */
  async hasEnoughTokens(userId: string, amount: number): Promise<boolean> {
    try {
      const balance = await this.getBalance(userId);
      return balance.tokens >= amount;
    } catch (error) {
      logger.error('Error checking tokens:', error);
      return false;
    }
  }
}
