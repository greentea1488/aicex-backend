import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

/**
 * Сервис управления подписками
 */
export class SubscriptionService {
  
  /**
   * Инициализация планов подписок в базе данных
   */
  async initializeSubscriptionPlans() {
    try {
      const plans = [
        {
          name: 'basic',
          displayName: 'Базовая подписка',
          description: 'Базовый доступ к AI генерации изображений и видео',
          priceRub: 499,
          priceUsd: 500, // центы
          priceEur: 450, // центы
          tokens: 1000,
          features: {
            imageGeneration: true,
            videoGeneration: true,
            models: ['flux-dev', 'seedream-v4', 'kling-v2', 'pixverse-v5'],
            priority: 'normal'
          },
          lavaOfferId: '009b0062-7c4a-4c8c-944c-a3313d8ac424'
        },
        {
          name: 'pro',
          displayName: 'Про подписка',
          description: 'Профессиональный доступ ко всем AI моделям',
          priceRub: 1699,
          priceUsd: 1800, // центы
          priceEur: 1600, // центы
          tokens: 5000,
          features: {
            imageGeneration: true,
            videoGeneration: true,
            models: ['flux-dev', 'flux-pro', 'mystic', 'seedream-v4', 'kling-2-5-pro', 'kling-v2-1-master', 'pixverse-v5'],
            priority: 'high',
            analytics: true
          },
          lavaOfferId: '9018f9c8-2e1a-4402-8240-4a2587f8b82a'
        },
        {
          name: 'premium',
          displayName: 'Премиум подписка',
          description: 'Максимальный доступ для профессионалов',
          priceRub: 2999,
          priceUsd: 3100, // центы
          priceEur: 2800, // центы
          tokens: 15000,
          features: {
            imageGeneration: true,
            videoGeneration: true,
            models: 'all',
            priority: 'highest',
            analytics: true,
            apiAccess: true,
            commercialLicense: true
          },
          lavaOfferId: '155e0453-b562-4af2-b588-3bcef486c3e3'
        }
      ];

      for (const planData of plans) {
        await prisma.subscriptionPlan.upsert({
          where: { name: planData.name },
          update: planData,
          create: planData
        });
      }

      logger.info('Subscription plans initialized successfully');
    } catch (error) {
      logger.error('Error initializing subscription plans:', error);
      throw error;
    }
  }

  /**
   * Получить все планы подписок
   */
  async getSubscriptionPlans() {
    try {
      return await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { priceRub: 'asc' }
      });
    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      throw error;
    }
  }

  /**
   * Получить план по offerId из Lava.top
   */
  async getPlanByOfferId(offerId: string) {
    try {
      return await prisma.subscriptionPlan.findUnique({
        where: { lavaOfferId: offerId }
      });
    } catch (error) {
      logger.error('Error getting plan by offerId:', error);
      throw error;
    }
  }

  /**
   * Получить текущую подписку пользователя
   */
  async getUserSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true }
      });

      // Проверяем не истекла ли подписка
      if (subscription && subscription.endDate < new Date()) {
        await this.expireSubscription(subscription.id);
        return null;
      }

      return subscription;
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      throw error;
    }
  }

  /**
   * Активировать подписку после оплаты
   */
  async activateSubscription(userId: string, planId: string, lavaContractId?: string) {
    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId }
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 дней

      // Деактивируем старую подписку если есть
      await prisma.subscription.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'CANCELLED' }
      });

      // Создаем новую подписку
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId,
          status: 'ACTIVE',
          startDate,
          endDate,
          lavaContractId,
          tokensGranted: plan.tokens
        },
        include: { plan: true }
      });

      // Начисляем токены пользователю
      await prisma.user.update({
        where: { id: userId },
        data: { tokens: { increment: plan.tokens } }
      });

      logger.info('Subscription activated:', { userId, planId, tokens: plan.tokens });
      return subscription;
    } catch (error) {
      logger.error('Error activating subscription:', error);
      throw error;
    }
  }

  /**
   * Продлить подписку (автопродление)
   */
  async renewSubscription(userId: string) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const newEndDate = new Date(subscription.endDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 дней

      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { 
          endDate: newEndDate,
          tokensGranted: { increment: subscription.plan.tokens }
        },
        include: { plan: true }
      });

      // Начисляем токены за продление
      await prisma.user.update({
        where: { id: userId },
        data: { tokens: { increment: subscription.plan.tokens } }
      });

      logger.info('Subscription renewed:', { userId, newEndDate });
      return updatedSubscription;
    } catch (error) {
      logger.error('Error renewing subscription:', error);
      throw error;
    }
  }

  /**
   * Отменить подписку
   */
  async cancelSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { 
          status: 'CANCELLED',
          autoRenew: false
        }
      });

      logger.info('Subscription cancelled:', { userId });
      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Пометить подписку как истекшую
   */
  private async expireSubscription(subscriptionId: string) {
    try {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'EXPIRED' }
      });

      logger.info('Subscription expired:', { subscriptionId });
    } catch (error) {
      logger.error('Error expiring subscription:', error);
      throw error;
    }
  }

  /**
   * Проверить доступ к функции
   */
  async checkAccess(userId: string, feature: string) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return { hasAccess: false, reason: 'No active subscription' };
      }

      const features = subscription.plan.features as any;
      
      switch (feature) {
        case 'image_generation':
          return { hasAccess: features.imageGeneration || false };
        case 'video_generation':
          return { hasAccess: features.videoGeneration || false };
        case 'api_access':
          return { hasAccess: features.apiAccess || false };
        case 'commercial_license':
          return { hasAccess: features.commercialLicense || false };
        default:
          return { hasAccess: false, reason: 'Unknown feature' };
      }
    } catch (error) {
      logger.error('Error checking access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Cron задача для проверки истекших подписок
   */
  async checkExpiredSubscriptions() {
    try {
      const expiredSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { lt: new Date() }
        }
      });

      for (const subscription of expiredSubscriptions) {
        await this.expireSubscription(subscription.id);
      }

      logger.info(`Expired ${expiredSubscriptions.length} subscriptions`);
    } catch (error) {
      logger.error('Error checking expired subscriptions:', error);
    }
  }
}

export const subscriptionService = new SubscriptionService();
