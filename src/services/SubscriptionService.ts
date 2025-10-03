import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

/**
 * Тарифные планы
 */
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tokens: 100,
    features: {
      imageGeneration: true,
      videoGeneration: false,
      maxImagesPerDay: 5,
      maxVideosPerDay: 0
    }
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 499,
    tokens: 500,
    features: {
      imageGeneration: true,
      videoGeneration: true,
      maxImagesPerDay: 50,
      maxVideosPerDay: 5
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1999,
    tokens: 2500,
    features: {
      imageGeneration: true,
      videoGeneration: true,
      maxImagesPerDay: 200,
      maxVideosPerDay: 20
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9999,
    tokens: 10000,
    features: {
      imageGeneration: true,
      videoGeneration: true,
      maxImagesPerDay: -1, // unlimited
      maxVideosPerDay: -1
    }
  }
};

/**
 * Сервис управления подписками
 */
export class SubscriptionService {
  /**
   * Получить текущую подписку пользователя
   */
  async getSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      // Если нет подписки, создаем бесплатную
      if (!subscription) {
        return await this.createFreeSubscription(userId);
      }

      // Проверяем не истекла ли подписка
      if (subscription.endDate && subscription.endDate < new Date()) {
        return await this.downgradeToFree(userId);
      }

      return subscription;
    } catch (error) {
      logger.error('Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * Создать бесплатную подписку
   */
  private async createFreeSubscription(userId: string) {
    try {
      const freePlan = SUBSCRIPTION_PLANS.free;
      
      return await prisma.subscription.create({
        data: {
          userId,
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          features: freePlan.features
        }
      });
    } catch (error) {
      logger.error('Error creating free subscription:', error);
      throw error;
    }
  }

  /**
   * Понизить до бесплатного плана
   */
  private async downgradeToFree(userId: string) {
    try {
      const freePlan = SUBSCRIPTION_PLANS.free;
      
      const subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          endDate: null,
          features: freePlan.features
        }
      });

      return subscription;
    } catch (error) {
      logger.error('Error downgrading subscription:', error);
      throw error;
    }
  }

  /**
   * Проверить лимиты подписки
   */
  async checkLimits(userId: string, service: string, type: string) {
    try {
      const subscription = await this.getSubscription(userId);
      const plan = SUBSCRIPTION_PLANS[subscription.plan as keyof typeof SUBSCRIPTION_PLANS];

      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      const features = plan.features as any;
      
      if (service === 'image' && !features.imageGeneration) {
        return {
          allowed: false,
          reason: 'Image generation not available in your plan'
        };
      }

      if (service === 'video' && !features.videoGeneration) {
        return {
          allowed: false,
          reason: 'Video generation not available in your plan'
        };
      }

      return {
        allowed: true,
        priority: 'medium'
      };
    } catch (error) {
      logger.error('Error checking limits:', error);
      throw error;
    }
  }

  /**
   * Получить все доступные планы
   */
  getAvailablePlans() {
    return Object.values(SUBSCRIPTION_PLANS);
  }
}
