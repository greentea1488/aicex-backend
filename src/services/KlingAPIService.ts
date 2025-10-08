import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import { CONFIG } from '../config';

export interface KlingGenerationRequest {
  prompt: string;
  duration?: number;
  aspect_ratio?: string;
  userId: number;
  telegramId: number;
}

export interface KlingGenerationResponse {
  success: boolean;
  taskId?: string;
  error?: string;
  estimatedTime?: number;
}

export class KlingAPIService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.KLING_API_URL || 'https://api.kling.ai/v1';
    this.apiKey = process.env.KLING_API_KEY || '';
  }

  /**
   * Проверяет конфигурацию API
   */
  isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey);
  }

  /**
   * Генерирует видео через Kling
   */
  async generateVideo(request: KlingGenerationRequest): Promise<KlingGenerationResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Kling API not configured');
      }

      // Получаем пользователя для проверки токенов
      const user = await prisma.user.findUnique({
        where: { telegramId: request.telegramId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Рассчитываем стоимость
      const cost = this.calculateCost(request.duration || 5);

      // Проверяем баланс токенов
      if (user.tokens < cost) {
        throw new Error(`Insufficient tokens. Required: ${cost}, Available: ${user.tokens}`);
      }

      // Создаем задачу в БД (используем RunwayTask для видео)
      const task = await prisma.runwayTask.create({
        data: {
          userId: user.id,
          prompt: request.prompt,
          model: 'kling-v2',
          type: 'text_to_video',
          status: 'CREATED',
          cost,
          taskId: '' // Будет обновлен после создания в API
        }
      });

      // Отправляем запрос в Kling API
      const apiResponse = await axios.post(
        `${this.apiUrl}/videos/text2video`,
        {
          prompt: request.prompt,
          duration: request.duration || 5,
          aspect_ratio: request.aspect_ratio || '16:9',
          webhook_url: `${CONFIG.app.baseUrl}/api/webhooks/runway`, // Используем runway webhook
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
        await prisma.runwayTask.update({
          where: { id: task.id },
          data: {
            taskId,
            status: 'PROCESSING'
          }
        });

        // Списываем токены
        await this.deductTokens(user.id, cost, taskId);

        logger.info('Kling video generation started', {
          taskId,
          userId: user.id,
          cost,
          prompt: request.prompt
        });

        return {
          success: true,
          taskId,
          estimatedTime: request.duration ? request.duration * 20 : 100 // ~20 сек на секунду видео
        };

      } else {
        throw new Error(`API error: ${apiResponse.data.message}`);
      }

    } catch (error) {
      logger.error('Kling video generation failed:', error);
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
        throw new Error('Kling API not configured');
      }

      const response = await axios.get(
        `${this.apiUrl}/videos/task/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;

    } catch (error) {
      logger.error('Failed to get Kling task status:', error);
      throw error;
    }
  }

  /**
   * Рассчитывает стоимость генерации видео
   */
  private calculateCost(duration: number): number {
    // Базовая стоимость: 10 токенов за секунду
    const costPerSecond = 10;
    return duration * costPerSecond;
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
          type: 'SPEND_RUNWAY', // Используем RUNWAY для видео
          description: `Генерация видео Kling`,
          service: 'kling',
          taskId,
          balanceBefore: 0, // TODO: получить текущий баланс
          balanceAfter: 0,   // TODO: рассчитать новый баланс
          metadata: {
            taskId,
            service: 'kling'
          }
        }
      });

      logger.info('Tokens deducted for Kling generation', {
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
   * Получает доступные длительности видео
   */
  getAvailableDurations(): Array<{
    id: number;
    name: string;
    cost: number;
    description: string;
  }> {
    return [
      {
        id: 3,
        name: '3 секунды',
        cost: 30,
        description: 'Короткий клип для превью'
      },
      {
        id: 5,
        name: '5 секунд',
        cost: 50,
        description: 'Стандартная длительность'
      },
      {
        id: 10,
        name: '10 секунд',
        cost: 100,
        description: 'Расширенный клип'
      },
      {
        id: 15,
        name: '15 секунд',
        cost: 150,
        description: 'Длинное видео для соцсетей'
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
        id: '16:9',
        name: 'Широкий (16:9)',
        description: 'Для YouTube и горизонтальных видео'
      },
      {
        id: '9:16',
        name: 'Вертикальный (9:16)',
        description: 'Для TikTok, Instagram Stories'
      },
      {
        id: '1:1',
        name: 'Квадрат (1:1)',
        description: 'Для Instagram постов'
      },
      {
        id: '4:3',
        name: 'Классический (4:3)',
        description: 'Традиционное соотношение'
      }
    ];
  }

  /**
   * Получает примеры промптов для видео
   */
  getPromptExamples(): Array<{
    category: string;
    examples: string[];
  }> {
    return [
      {
        category: 'Природа',
        examples: [
          'Волны океана на закате, медленное движение',
          'Падающие листья в осеннем лесу',
          'Горный водопад с радугой',
          'Звездное небо с движущимися облаками'
        ]
      },
      {
        category: 'Городская жизнь',
        examples: [
          'Движение машин по ночному городу',
          'Люди идут по оживленной улице',
          'Неоновые вывески мигают в дождь',
          'Метро прибывает на станцию'
        ]
      },
      {
        category: 'Абстракция',
        examples: [
          'Цветные чернила растворяются в воде',
          'Геометрические фигуры трансформируются',
          'Световые лучи танцуют в темноте',
          'Жидкий металл принимает форму'
        ]
      },
      {
        category: 'Животные',
        examples: [
          'Кот играет с мячиком',
          'Птицы летят в небе клином',
          'Рыбы плавают в аквариуме',
          'Собака бежит по полю'
        ]
      }
    ];
  }

  /**
   * Валидирует промпт для видео генерации
   */
  validatePrompt(prompt: string): { valid: boolean; error?: string } {
    if (!prompt || prompt.trim().length === 0) {
      return { valid: false, error: 'Промпт не может быть пустым' };
    }

    if (prompt.length < 10) {
      return { valid: false, error: 'Промпт слишком короткий (минимум 10 символов)' };
    }

    if (prompt.length > 500) {
      return { valid: false, error: 'Промпт слишком длинный (максимум 500 символов)' };
    }

    // Проверка на запрещенный контент
    const forbiddenWords = ['nsfw', 'nude', 'sex', 'porn', 'violence', 'blood'];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const word of forbiddenWords) {
      if (lowerPrompt.includes(word)) {
        return { valid: false, error: 'Промпт содержит запрещенный контент' };
      }
    }

    return { valid: true };
  }
}
