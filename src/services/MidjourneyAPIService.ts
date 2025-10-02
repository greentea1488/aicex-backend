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
    this.apiUrl = process.env.MIDJOURNEY_API_URL || 'https://api.genapi.ai/v1';
    this.apiKey = process.env.MIDJOURNEY_API_KEY || '';
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

      // Отправляем запрос в Midjourney API
      const apiResponse = await axios.post(
        `${this.apiUrl}/midjourney/imagine`,
        {
          prompt: this.buildPrompt(request),
          model: request.model || 'midjourney-v7',
          aspect_ratio: request.aspect_ratio || '1:1',
          quality: request.quality || 'high',
          webhook_url: `${CONFIG.app.baseUrl}/api/webhooks/midjourney`,
          webhook_secret: process.env.WEBHOOK_SECRET || 'default-secret'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (apiResponse.data.success) {
        const taskId = apiResponse.data.task_id;

        // Обновляем задачу с ID от API
        await prisma.midjourneyTask.update({
          where: { id: task.id },
          data: {
            taskId,
            status: 'processing'
          }
        });

        // Списываем токены
        await this.deductTokens(user.id, cost, taskId);

        logger.info('Midjourney generation started', {
          taskId,
          userId: user.id,
          cost,
          prompt: request.prompt
        });

        return {
          success: true,
          taskId,
          estimatedTime: 60 // 1 минута примерно
        };

      } else {
        throw new Error(`API error: ${apiResponse.data.message}`);
      }

    } catch (error) {
      logger.error('Midjourney generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Получает статус задачи
   */
  async getTaskStatus(taskId: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Midjourney API not configured');
      }

      const response = await axios.get(
        `${this.apiUrl}/midjourney/task/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;

    } catch (error) {
      logger.error('Failed to get Midjourney task status:', error);
      throw error;
    }
  }

  /**
   * Строит промпт с учетом стиля и параметров
   */
  private buildPrompt(request: MidjourneyGenerationRequest): string {
    let prompt = request.prompt;

    // Добавляем стиль если указан
    if (request.style && request.style !== 'default') {
      const stylePrompts = {
        'photorealistic': ', photorealistic, high quality, detailed',
        'artistic': ', artistic style, creative, expressive',
        'anime': ', anime style, manga, japanese art',
        'cartoon': ', cartoon style, colorful, fun'
      };

      const styleAddition = stylePrompts[request.style as keyof typeof stylePrompts];
      if (styleAddition) {
        prompt += styleAddition;
      }
    }

    // Добавляем параметры качества
    if (request.quality === 'high') {
      prompt += ', 4K, ultra detailed, masterpiece';
    }

    return prompt;
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
