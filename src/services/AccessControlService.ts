import { prisma } from '../utils/prismaClient';
import { subscriptionService } from './SubscriptionService';
import { logger } from '../utils/logger';

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: string;
  subscriptionRequired?: boolean;
  tokensRequired?: number;
  currentTokens?: number;
  upgradeUrl?: string;
}

export interface ServiceConfig {
  name: string;
  displayName: string;
  tokensRequired: number;
  subscriptionRequired: boolean;
  minSubscriptionLevel: 'basic' | 'pro' | 'premium' | null;
}

/**
 * Сервис контроля доступа к AI функциям
 */
export class AccessControlService {
  
  // Конфигурация доступа к сервисам
  private serviceConfigs: { [key: string]: ServiceConfig } = {
    'freepik_image': {
      name: 'freepik_image',
      displayName: 'Freepik Изображения',
      tokensRequired: 5,
      subscriptionRequired: false,
      minSubscriptionLevel: null
    },
    'freepik_video': {
      name: 'freepik_video',
      displayName: 'Freepik Видео',
      tokensRequired: 15,
      subscriptionRequired: true,
      minSubscriptionLevel: 'basic'
    },
    'midjourney_basic': {
      name: 'midjourney_basic',
      displayName: 'Midjourney Базовый',
      tokensRequired: 10,
      subscriptionRequired: false,
      minSubscriptionLevel: null
    },
    'midjourney_pro': {
      name: 'midjourney_pro',
      displayName: 'Midjourney Pro',
      tokensRequired: 15,
      subscriptionRequired: true,
      minSubscriptionLevel: 'pro'
    },
    'runway_video': {
      name: 'runway_video',
      displayName: 'Runway Видео',
      tokensRequired: 20,
      subscriptionRequired: true,
      minSubscriptionLevel: 'basic'
    },
    'chatgpt_basic': {
      name: 'chatgpt_basic',
      displayName: 'ChatGPT Базовый',
      tokensRequired: 1,
      subscriptionRequired: false,
      minSubscriptionLevel: null
    },
    'chatgpt_advanced': {
      name: 'chatgpt_advanced',
      displayName: 'ChatGPT Продвинутый',
      tokensRequired: 3,
      subscriptionRequired: true,
      minSubscriptionLevel: 'pro'
    }
  };

  /**
   * Проверяет доступ пользователя к конкретному сервису
   */
  async checkAccess(telegramId: number, serviceName: string): Promise<AccessCheckResult> {
    try {
      const config = this.serviceConfigs[serviceName];
      
      if (!config) {
        return {
          hasAccess: false,
          reason: 'Неизвестный сервис'
        };
      }

      // Получаем пользователя
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { 
          id: true, 
          tokens: true,
          subscription: {
            include: { plan: true }
          }
        }
      });

      if (!user) {
        return {
          hasAccess: false,
          reason: 'Пользователь не найден'
        };
      }

      // Проверяем токены
      if (user.tokens < config.tokensRequired) {
        return {
          hasAccess: false,
          reason: 'Недостаточно токенов',
          tokensRequired: config.tokensRequired,
          currentTokens: user.tokens,
          upgradeUrl: this.getUpgradeUrl('tokens')
        };
      }

      // Проверяем подписку если требуется
      if (config.subscriptionRequired) {
        const subscription = user.subscription;
        
        if (!subscription || subscription.status !== 'ACTIVE') {
          return {
            hasAccess: false,
            reason: 'Требуется активная подписка',
            subscriptionRequired: true,
            upgradeUrl: this.getUpgradeUrl('subscription')
          };
        }

        // Проверяем уровень подписки
        if (config.minSubscriptionLevel) {
          const hasRequiredLevel = this.checkSubscriptionLevel(
            subscription.plan.name, 
            config.minSubscriptionLevel
          );

          if (!hasRequiredLevel) {
            return {
              hasAccess: false,
              reason: `Требуется подписка уровня ${config.minSubscriptionLevel} или выше`,
              subscriptionRequired: true,
              upgradeUrl: this.getUpgradeUrl('upgrade', config.minSubscriptionLevel)
            };
          }
        }
      }

      return {
        hasAccess: true,
        currentTokens: user.tokens
      };

    } catch (error) {
      logger.error('Error checking access:', error);
      return {
        hasAccess: false,
        reason: 'Ошибка проверки доступа'
      };
    }
  }

  /**
   * Проверяет уровень подписки
   */
  private checkSubscriptionLevel(currentLevel: string, requiredLevel: string): boolean {
    const levels = ['basic', 'pro', 'premium'];
    const currentIndex = levels.indexOf(currentLevel);
    const requiredIndex = levels.indexOf(requiredLevel);
    
    return currentIndex >= requiredIndex;
  }

  /**
   * Генерирует URL для апгрейда
   */
  private getUpgradeUrl(type: 'tokens' | 'subscription' | 'upgrade', level?: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app';
    
    switch (type) {
      case 'tokens':
        return `${baseUrl}/payment?type=tokens`;
      case 'subscription':
        return `${baseUrl}/payment?type=subscription&plan=basic`;
      case 'upgrade':
        return `${baseUrl}/payment?type=subscription&plan=${level}`;
      default:
        return `${baseUrl}/subscription`;
    }
  }

  /**
   * Получает список всех доступных сервисов для пользователя
   */
  async getUserAvailableServices(telegramId: number): Promise<{
    available: string[];
    restricted: { [key: string]: AccessCheckResult };
  }> {
    const available: string[] = [];
    const restricted: { [key: string]: AccessCheckResult } = {};

    for (const serviceName of Object.keys(this.serviceConfigs)) {
      const accessResult = await this.checkAccess(telegramId, serviceName);
      
      if (accessResult.hasAccess) {
        available.push(serviceName);
      } else {
        restricted[serviceName] = accessResult;
      }
    }

    return { available, restricted };
  }

  /**
   * Получает конфигурацию сервиса
   */
  getServiceConfig(serviceName: string): ServiceConfig | null {
    return this.serviceConfigs[serviceName] || null;
  }

  /**
   * Получает все конфигурации сервисов
   */
  getAllServiceConfigs(): { [key: string]: ServiceConfig } {
    return this.serviceConfigs;
  }

  /**
   * Создает кнопку для Telegram бота с проверкой доступа
   */
  async createTelegramButton(
    telegramId: number, 
    serviceName: string, 
    buttonText: string,
    callbackData: string
  ): Promise<{
    text: string;
    callback_data?: string;
    web_app?: { url: string };
    disabled?: boolean;
  }> {
    const accessResult = await this.checkAccess(telegramId, serviceName);
    
    if (accessResult.hasAccess) {
      return {
        text: buttonText,
        callback_data: callbackData
      };
    } else {
      // Кнопка с крестиком для недоступных функций
      return {
        text: `❌ ${buttonText}`,
        web_app: { url: accessResult.upgradeUrl || this.getUpgradeUrl('subscription') }
      };
    }
  }

  /**
   * Создает inline keyboard с проверкой доступа
   */
  async createAccessControlledKeyboard(
    telegramId: number,
    buttons: Array<{
      text: string;
      serviceName: string;
      callbackData: string;
    }>
  ): Promise<any[][]> {
    const keyboard: any[][] = [];
    
    for (const button of buttons) {
      const telegramButton = await this.createTelegramButton(
        telegramId,
        button.serviceName,
        button.text,
        button.callbackData
      );
      
      keyboard.push([telegramButton]);
    }
    
    return keyboard;
  }

  /**
   * Middleware для проверки доступа в API
   */
  createAccessMiddleware(serviceName: string) {
    return async (req: any, res: any, next: any) => {
      try {
        const telegramId = req.user?.telegramId || req.body?.telegramId;
        
        if (!telegramId) {
          return res.status(401).json({
            success: false,
            error: 'Не авторизован'
          });
        }

        const accessResult = await this.checkAccess(telegramId, serviceName);
        
        if (!accessResult.hasAccess) {
          return res.status(403).json({
            success: false,
            error: accessResult.reason,
            upgradeUrl: accessResult.upgradeUrl,
            tokensRequired: accessResult.tokensRequired,
            currentTokens: accessResult.currentTokens
          });
        }

        req.accessInfo = accessResult;
        next();
      } catch (error) {
        logger.error('Access middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Ошибка проверки доступа'
        });
      }
    };
  }
}

export const accessControlService = new AccessControlService();
