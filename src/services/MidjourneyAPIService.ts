import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import { CONFIG } from '../config';

export interface MidjourneyGenerationRequest {
  prompt: string;
  model?: string;
  aspect_ratio?: string;
  quality?: string;
  style?: string;
  seed?: number;  // Опциональный параметр для детерминизма
  negative_prompt?: string;  // Опциональный негативный промпт
  userId: number;
  telegramId: number;
}

export interface MidjourneyGenerationResponse {
  success: boolean;
  taskId?: string;
  error?: string;
  estimatedTime?: number;
}

export class MidjourneyAPIService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.GEN_API_URL || 'https://api.gen-api.ru';
    this.apiKey = process.env.GEN_API_KEY || '';
  }

  /**
   * Проверяет конфигурацию API
   */
  isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey);
  }

  /**
   * Генерирует изображение через Midjourney
   */
  async generateImage(request: MidjourneyGenerationRequest): Promise<MidjourneyGenerationResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Midjourney API not configured');
      }

      // Получаем пользователя для проверки токенов
      const user = await prisma.user.findUnique({
        where: { telegramId: request.telegramId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Рассчитываем стоимость
      const cost = this.calculateCost(request.model || '7.0', request.quality || 'high');

      // Проверяем баланс токенов
      if (user.tokens < cost) {
        throw new Error(`Insufficient tokens. Required: ${cost}, Available: ${user.tokens}`);
      }

      // Создаем задачу в БД
      const task = await prisma.midjourneyTask.create({
        data: {
          userId: user.id,
          telegramId: request.telegramId,
          prompt: request.prompt,
          model: request.model || '7.0',
          style: request.style || 'photorealistic',
          aspect_ratio: request.aspect_ratio || '1:1',
          quality: request.quality || 'high',
          status: 'pending',
          cost,
          taskId: '' // Будет обновлен после создания в API
        }
      });

      // Отправляем запрос в Gen API для Midjourney
      // Согласно официальной документации GenAPI - минимальный набор параметров
      const baseUrl = CONFIG.app.baseUrl.startsWith('http') ? CONFIG.app.baseUrl : `https://${CONFIG.app.baseUrl}`;
      const callbackUrl = `${baseUrl}/api/webhooks/midjourney`;
      console.log('🔗 Using callback URL:', callbackUrl);
      
      const requestBody: any = {
        prompt: this.buildPrompt(request),
        callback_url: callbackUrl
      };

      // Добавляем опциональные параметры (согласно документации)
      if (request.model) {
        requestBody.model = request.model;
      }
      
      if (request.aspect_ratio && request.aspect_ratio !== '1:1') {
        requestBody.aspectRatio = request.aspect_ratio;  // camelCase!
      }
      
      if (request.seed !== undefined) {
        requestBody.seed = request.seed;
      }
      
      if (request.negative_prompt) {
        requestBody.no = request.negative_prompt;  // Параметр 'no' согласно документации
      }

      console.log('==================== MIDJOURNEY API REQUEST ====================');
      console.log('API URL:', this.apiUrl);
      console.log('Endpoint:', `${this.apiUrl}/api/v1/networks/midjourney`);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Has API Key:', !!this.apiKey);
      console.log('🚀 RAILWAY TEST: Using CORRECT GenAPI endpoint from documentation!');
      console.log('===============================================================');

      // POST запрос согласно примеру в документации
      const apiResponse = await axios.post(
        `${this.apiUrl}/api/v1/networks/midjourney`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log('==================== MIDJOURNEY API RESPONSE ====================');
      console.log('Status:', apiResponse.status);
      console.log('Response Data:', JSON.stringify(apiResponse.data, null, 2));
      console.log('===============================================================');

      // GenAPI возвращает request_id при успешном создании задачи
      // Проверяем оба возможных варианта ответа
      const requestId = apiResponse.data.request_id || apiResponse.data.id;
      
      if (requestId) {

        // Обновляем задачу с request_id от API
        await prisma.midjourneyTask.update({
          where: { id: task.id },
          data: {
            taskId: requestId.toString(),  // Преобразуем число в строку для Prisma
            status: 'processing'
          }
        });

        // Списываем токены
        await this.deductTokens(user.id, cost, requestId.toString());

        logger.info('Midjourney generation started via Gen API', {
          requestId,
          userId: user.id,
          cost,
          prompt: request.prompt,
          apiUrl: this.apiUrl
        });

        return {
          success: true,
          taskId: requestId,  // Возвращаем request_id
          estimatedTime: 90
        };

      } else {
        throw new Error(`Gen API error: ${apiResponse.data.message || apiResponse.data.error || 'No request_id returned'}`);
      }

    } catch (error: any) {
      console.log('==================== MIDJOURNEY API ERROR ====================');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('Error Code:', error.code);
      console.log('Response Status:', error.response?.status);
      console.log('Response Status Text:', error.response?.statusText);
      console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Request URL:', error.config?.url);
      console.log('Request Method:', error.config?.method);
      console.log('===============================================================');

      logger.error('Midjourney generation failed:', error);
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = 'Unknown error';
      
      if (error.response?.status === 404) {
        errorMessage = '🔧 Сервис Midjourney временно недоступен\n\n💡 Попробуйте позже или используйте другой AI сервис';
      } else if (error.response?.status === 401) {
        errorMessage = '🔑 Проблема с авторизацией GenAPI\n\n💡 Обратитесь к администратору';
      } else if (error.response?.status === 402) {
        const apiErrorMessage = error.response?.data?.error || 'У Вас недостаточно средств на балансе';
        errorMessage = `💰 Недостаточно средств на GenAPI\n\n${apiErrorMessage}\n\n💡 Попробуйте пополнить баланс GenAPI или используйте другой AI сервис`;
      } else if (error.response?.status === 429) {
        errorMessage = '⏰ Превышен лимит запросов GenAPI\n\n💡 Попробуйте позже или используйте другой AI сервис';
      } else if (error.response?.data?.message) {
        errorMessage = `❌ Ошибка GenAPI: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `❌ Ошибка: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Получает статус задачи через Gen API
   * Согласно документации: GET /api/v1/result/{request_id}
   */
  async getTaskStatus(requestId: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Gen API not configured');
      }

      console.log('==================== CHECKING MIDJOURNEY STATUS ====================');
      console.log('Request ID:', requestId);
      console.log('Endpoint:', `${this.apiUrl}/api/v1/result/${requestId}`);
      console.log('===============================================================');

      const response = await axios.get(
        `${this.apiUrl}/api/v1/result/${requestId}`,  // Правильный endpoint согласно документации
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      console.log('==================== MIDJOURNEY STATUS RESPONSE ====================');
      console.log('Status:', response.data.status);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
      console.log('===============================================================');

      // GenAPI возвращает согласно документации:
      // {
      //   "status": "processing" | "failed" | "success",
      //   "result": { ... }  // при success
      // }

      return response.data;

    } catch (error) {
      logger.error('Failed to get Gen API task status:', error);
      throw error;
    }
  }

  /**
   * Строит промпт (GenAPI для Midjourney принимает промпт как есть)
   */
  private buildPrompt(request: MidjourneyGenerationRequest): string {
    // GenAPI для Midjourney принимает промпт напрямую
    // Все параметры стиля/качества передаются через input параметры
    return request.prompt;
  }

  /**
   * Рассчитывает стоимость генерации
   */
  private calculateCost(model: string, quality: string): number {
    const baseCosts = {
      '5.0': 7,
      '5.1': 7,
      '5.2': 7,
      '6.0': 7,
      '6.1': 7,
      '7.0': 8
    };

    const qualityMultiplier = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.2
    };

    const baseCost = baseCosts[model as keyof typeof baseCosts] || 8;
    const multiplier = qualityMultiplier[quality as keyof typeof qualityMultiplier] || 1.0;

    return Math.ceil(baseCost * multiplier);
  }

  /**
   * Списывает токены у пользователя
   */
  private async deductTokens(userId: string, amount: number, taskId: string): Promise<void> {
    try {
      // Обновляем баланс пользователя
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokens: {
            decrement: amount
          }
        }
      });

      // Записываем в историю токенов
      await prisma.tokenHistory.create({
        data: {
          userId,
          amount: -amount,
          type: 'SPEND_MIDJOURNEY',
          description: `Генерация изображения Midjourney`,
          service: 'midjourney',
          taskId,
          balanceBefore: 0, // TODO: получить текущий баланс
          balanceAfter: 0,   // TODO: рассчитать новый баланс
          metadata: {
            taskId,
            service: 'midjourney'
          }
        }
      });

      logger.info('Tokens deducted for Midjourney generation', {
        userId,
        amount,
        taskId
      });

    } catch (error) {
      logger.error('Failed to deduct tokens:', error);
      throw error;
    }
  }

  /**
   * Получает доступные модели
   */
  getAvailableModels(): Array<{
    id: string;
    name: string;
    cost: number;
    description: string;
  }> {
    return [
      {
        id: '5.0',
        name: 'Midjourney 5.0',
        cost: 7,
        description: 'Классическая версия с хорошим качеством'
      },
      {
        id: '5.1',
        name: 'Midjourney 5.1',
        cost: 7,
        description: 'Улучшенная версия 5.0'
      },
      {
        id: '5.2',
        name: 'Midjourney 5.2',
        cost: 7,
        description: 'Последняя версия линейки 5.x'
      },
      {
        id: '6.0',
        name: 'Midjourney 6.0',
        cost: 7,
        description: 'Новое поколение с улучшенным качеством'
      },
      {
        id: '6.1',
        name: 'Midjourney 6.1',
        cost: 7,
        description: 'Стабильная версия 6-го поколения'
      },
      {
        id: '7.0',
        name: 'Midjourney 7.0',
        cost: 8,
        description: 'Новейшая версия с лучшим качеством'
      }
    ];
  }

  /**
   * Получает доступные стили
   */
  getAvailableStyles(): Array<{
    id: string;
    name: string;
    description: string;
  }> {
    return [
      {
        id: 'photorealistic',
        name: 'Фотореализм',
        description: 'Реалистичные изображения как фотографии'
      },
      {
        id: 'artistic',
        name: 'Художественный',
        description: 'Творческий художественный стиль'
      },
      {
        id: 'anime',
        name: 'Аниме',
        description: 'Японский стиль аниме и манга'
      },
      {
        id: 'cartoon',
        name: 'Мультяшный',
        description: 'Яркий мультяшный стиль'
      }
    ];
  }

  /**
   * Получает доступные соотношения сторон
   */
  getAvailableAspectRatios(): Array<{
    id: string;
    name: string;
    description: string;
  }> {
    return [
      {
        id: '1:1',
        name: 'Квадрат (1:1)',
        description: 'Идеально для соцсетей'
      },
      {
        id: '16:9',
        name: 'Широкий (16:9)',
        description: 'Для обложек и баннеров'
      },
      {
        id: '9:16',
        name: 'Вертикальный (9:16)',
        description: 'Для историй и мобильных экранов'
      },
      {
        id: '4:3',
        name: 'Классический (4:3)',
        description: 'Традиционное соотношение'
      },
      {
        id: '3:4',
        name: 'Портрет (3:4)',
        description: 'Вертикальный портретный формат'
      }
    ];
  }

  /**
   * Получает уровни качества
   */
  getAvailableQuality(): Array<{
    id: string;
    name: string;
    description: string;
    costMultiplier: number;
  }> {
    return [
      {
        id: 'low',
        name: 'Базовое',
        description: 'Быстрая генерация, стандартное качество',
        costMultiplier: 0.8
      },
      {
        id: 'medium',
        name: 'Среднее',
        description: 'Баланс скорости и качества',
        costMultiplier: 1.0
      },
      {
        id: 'high',
        name: 'Высокое',
        description: 'Максимальное качество и детализация',
        costMultiplier: 1.2
      }
    ];
  }
}
