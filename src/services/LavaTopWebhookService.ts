import crypto from 'crypto';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

/**
 * Сервис для обработки webhook'ов от Lava Top
 */
export class LavaTopWebhookService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.LAVA_TOP_SECRET_KEY || '';
    if (!this.secretKey) {
      console.warn('⚠️ LAVA_TOP_SECRET_KEY is not configured - LavaTop payments will be disabled');
    }
  }

  /**
   * Валидация подписи webhook'а
   */
  validateSignature(data: any, signature: string): boolean {
    try {
      // Сортируем параметры по алфавиту
      const sortedKeys = Object.keys(data).sort();
      const signString = sortedKeys
        .map(key => `${key}=${data[key]}`)
        .join('&') + this.secretKey;

      // Генерируем SHA-256 хеш
      const expectedSignature = crypto
        .createHash('sha256')
        .update(signString)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Error validating Lava Top signature:', error);
      return false;
    }
  }

  /**
   * Обработка успешного платежа
   */
  async handleSuccessfulPayment(webhookData: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    orderId: string;
    signature: string;
  }) {
    try {
      // Валидируем подпись
      if (!this.validateSignature(webhookData, webhookData.signature)) {
        throw new Error('Invalid webhook signature');
      }

      // Парсим orderId для определения типа платежа
      const { orderId } = webhookData;
      
      if (orderId.startsWith('sub_')) {
        // Это платеж за подписку
        await this.handleSubscriptionPayment(webhookData);
      } else if (orderId.startsWith('tokens_')) {
        // Это платеж за токены
        await this.handleTokenPayment(webhookData);
      } else {
        logger.warn('Unknown payment type:', orderId);
      }

      // Сохраняем информацию о платеже
      await prisma.payment.create({
        data: {
          userId: await this.extractUserIdFromOrder(webhookData.orderId) || '',
          providerId: webhookData.id,
          amount: webhookData.amount,
          currency: webhookData.currency,
          status: 'COMPLETED',
          provider: 'lava_top',
          description: `Payment for order ${webhookData.orderId}`,
          metadata: {
            orderId: webhookData.orderId,
            webhookData
          }
        }
      });

      logger.info('Lava Top payment processed successfully:', webhookData.id);
    } catch (error) {
      logger.error('Error processing Lava Top payment:', error);
      throw error;
    }
  }

  /**
   * Обработка платежа за подписку
   */
  private async handleSubscriptionPayment(webhookData: any) {
    try {
      // Извлекаем план из orderId (например: sub_pro_1728000000000)
      const orderParts = webhookData.orderId.split('_');
      const planType = orderParts[1]; // basic, pro, premium
      
      // Находим пользователя по telegramId (можно добавить в orderId)
      // Пока используем заглушку - нужно будет передавать telegramId в orderId
      const userId = await this.extractUserIdFromOrder(webhookData.orderId);
      
      if (!userId) {
        throw new Error('Cannot determine user from order ID');
      }

      // Получаем план подписки
      const subscriptionPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: planType }
      });

      if (!subscriptionPlan) {
        throw new Error(`Subscription plan not found: ${planType}`);
      }

      // Создаем или обновляем подписку
      const subscription = await prisma.subscription.upsert({
        where: { userId },
        update: {
          planId: subscriptionPlan.id,
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
          updatedAt: new Date()
        },
        create: {
          userId,
          planId: subscriptionPlan.id,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
        }
      });

      logger.info('Subscription created/updated:', subscription);
    } catch (error) {
      logger.error('Error handling subscription payment:', error);
      throw error;
    }
  }

  /**
   * Обработка платежа за токены
   */
  private async handleTokenPayment(webhookData: any) {
    try {
      // Извлекаем количество токенов из orderId (например: tokens_1000_1728000000000)
      const orderParts = webhookData.orderId.split('_');
      const tokenAmount = parseInt(orderParts[1]);
      
      const userId = await this.extractUserIdFromOrder(webhookData.orderId);
      
      if (!userId) {
        throw new Error('Cannot determine user from order ID');
      }

      // Добавляем токены пользователю
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          tokens: { increment: tokenAmount }
        }
      });

      // Создаем запись в истории токенов
      await prisma.tokenHistory.create({
        data: {
          userId,
          amount: tokenAmount,
          type: 'PURCHASE',
          description: `Покупка ${tokenAmount} токенов через Lava Top`,
          balanceBefore: user.tokens - tokenAmount,
          balanceAfter: user.tokens,
          metadata: {
            paymentId: webhookData.id,
            orderId: webhookData.orderId
          }
        }
      });

      logger.info('Tokens added to user:', { userId, tokenAmount });
    } catch (error) {
      logger.error('Error handling token payment:', error);
      throw error;
    }
  }

  /**
   * Извлечение ID пользователя из orderId
   * В реальной реализации нужно будет включать telegramId в orderId
   */
  private async extractUserIdFromOrder(orderId: string): Promise<string | null> {
    try {
      // Временная заглушка - в реальности нужно включать telegramId в orderId
      // Например: sub_pro_123456789_1728000000000 где 123456789 - telegramId
      
      const parts = orderId.split('_');
      if (parts.length >= 4) {
        const telegramId = parseInt(parts[2]);
        const user = await prisma.user.findUnique({
          where: { telegramId },
          select: { id: true }
        });
        return user?.id || null;
      }
      
      return null;
    } catch (error) {
      logger.error('Error extracting user ID from order:', error);
      return null;
    }
  }

  /**
   * Обработка неуспешного платежа
   */
  async handleFailedPayment(webhookData: any) {
    try {
      // Сохраняем информацию о неуспешном платеже
      await prisma.payment.create({
        data: {
          userId: await this.extractUserIdFromOrder(webhookData.orderId) || '',
          providerId: webhookData.id,
          amount: webhookData.amount,
          currency: webhookData.currency,
          status: 'FAILED',
          provider: 'lava_top',
          description: `Failed payment for order ${webhookData.orderId}`,
          metadata: {
            orderId: webhookData.orderId,
            webhookData
          }
        }
      });

      logger.info('Failed payment recorded:', webhookData.id);
    } catch (error) {
      logger.error('Error handling failed payment:', error);
      throw error;
    }
  }
}
