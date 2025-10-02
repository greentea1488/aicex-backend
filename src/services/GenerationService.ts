/**
 * Сервис для генерации изображений и видео через различные AI сервисы
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

export interface GenerationRequest {
  userId: number;
  service: 'freepik' | 'midjourney' | 'runway' | 'kling' | 'chatgpt';
  type: 'image' | 'video' | 'text';
  prompt: string;
  imageUrl?: string; // для редактирования изображений
  options?: {
    style?: string;
    size?: string;
    quality?: string;
    duration?: number; // для видео
  };
}

export interface GenerationResult {
  success: boolean;
  resultUrl?: string;
  taskId?: string;
  error?: string;
  tokensUsed: number;
}

// Стоимость токенов для каждого сервиса
const TOKEN_COSTS = {
  freepik_image: 5,
  freepik_video: 25,
  midjourney: 10,
  runway: 50,
  kling: 30,
  chatgpt: 1
};

export class GenerationService {
  
  /**
   * Основной метод для генерации контента
   */
  async generateContent(request: GenerationRequest): Promise<GenerationResult> {
    try {
      // Проверяем баланс пользователя
      let user = await prisma.user.findUnique({
        where: { telegramId: request.userId }
      });

      // Если пользователь не найден, создаем его
      if (!user) {
        logger.info(`Creating user ${request.userId} during generation`);
        try {
          user = await prisma.user.create({
            data: {
              telegramId: request.userId,
              username: `user_${request.userId}`,
              firstName: '',
              lastName: '',
              tokens: 10, // Стартовые токены
              subscription: null
            }
          });
        } catch (createError: any) {
          // Возможно пользователь уже создан другим процессом
          logger.warn(`User creation failed, trying to find existing user: ${createError.message}`);
          user = await prisma.user.findUnique({
            where: { telegramId: request.userId }
          });
          
          if (!user) {
            return { success: false, error: 'Не удалось создать или найти пользователя', tokensUsed: 0 };
          }
        }
      }

      const cost = this.getTokenCost(request.service, request.type);
      
      if (user.tokens < cost) {
        return { 
          success: false, 
          error: `Недостаточно токенов. Требуется: ${cost}, доступно: ${user.tokens}`, 
          tokensUsed: 0 
        };
      }

      let result: GenerationResult;

      // Выбираем сервис для генерации
      switch (request.service) {
        case 'freepik':
          result = await this.generateWithFreepik(request);
          break;
        case 'midjourney':
          result = await this.generateWithMidjourney(request);
          break;
        case 'runway':
          result = await this.generateWithRunway(request);
          break;
        case 'kling':
          result = await this.generateWithKling(request);
          break;
        case 'chatgpt':
          result = await this.generateWithChatGPT(request);
          break;
        default:
          return { success: false, error: 'Неизвестный сервис', tokensUsed: 0 };
      }

      // Если генерация успешна, списываем токены
      if (result.success) {
        await prisma.user.update({
          where: { telegramId: request.userId },
          data: { tokens: { decrement: cost } }
        });

        // Сохраняем историю генерации
        await this.saveGenerationHistory(request, result, cost);
      }

      result.tokensUsed = cost;
      return result;

    } catch (error) {
      logger.error('Generation error:', error);
      return { success: false, error: 'Ошибка при генерации', tokensUsed: 0 };
    }
  }

  /**
   * Генерация через Freepik API
   */
  private async generateWithFreepik(request: GenerationRequest): Promise<GenerationResult> {
    try {
      const apiKey = process.env.FREEPIK_API_KEY;
      if (!apiKey) {
        return { success: false, error: 'Freepik API ключ не настроен', tokensUsed: 0 };
      }

      const endpoint = request.type === 'image' 
        ? 'https://api.freepik.com/v1/ai/text-to-image'
        : 'https://api.freepik.com/v1/ai/text-to-video';

      const payload = {
        prompt: request.prompt,
        ...(request.imageUrl && { image: request.imageUrl }),
        ...(request.options?.style && { style: request.options.style }),
        ...(request.options?.size && { size: request.options.size })
      };

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          resultUrl: response.data.data.url,
          taskId: response.data.data.id,
          tokensUsed: 0
        };
      } else {
        return { success: false, error: response.data.message, tokensUsed: 0 };
      }

    } catch (error: any) {
      logger.error('Freepik API error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Ошибка Freepik API', 
        tokensUsed: 0 
      };
    }
  }

  /**
   * Генерация через Midjourney (заглушка - нужна интеграция)
   */
  private async generateWithMidjourney(request: GenerationRequest): Promise<GenerationResult> {
    // TODO: Интеграция с Midjourney API
    logger.info('Midjourney generation requested:', request.prompt);
    
    // Временная заглушка
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      resultUrl: 'https://via.placeholder.com/512x512/6366f1/ffffff?text=Midjourney+Generated',
      taskId: `mj_${Date.now()}`,
      tokensUsed: 0
    };
  }

  /**
   * Генерация через Runway (использует Freepik API)
   */
  private async generateWithRunway(request: GenerationRequest): Promise<GenerationResult> {
    logger.info('Runway generation requested (using Freepik API):', request.prompt);
    
    try {
      const freepikService = new (await import('../services/ai/FreepikService')).FreepikService();
      
      // Определяем какую Freepik модель использовать для Runway
      let freepikModel = 'kling_v2_1_std'; // По умолчанию
      
      // Можно добавить логику выбора модели на основе request или других параметров
      if (request.imageUrl) {
        const result = await freepikService.generateVideoFromImage(
          request.imageUrl,
          request.prompt,
          freepikModel as any
        );
        
        if (result.success && result.data?.id) {
          return {
            success: true,
            resultUrl: result.data.videos?.[0]?.url || '',
            taskId: result.data.id,
            tokensUsed: 0
          };
        }
      }
      
      // Fallback для текстовой генерации (пока заглушка)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        success: true,
        resultUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        taskId: `runway_freepik_${Date.now()}`,
        tokensUsed: 0
      };
      
    } catch (error) {
      logger.error('Runway (Freepik) generation error:', error);
      return {
        success: false,
        error: 'Ошибка генерации через Runway',
        tokensUsed: 0
      };
    }
  }

  /**
   * Генерация через Kling (использует Freepik API)
   */
  private async generateWithKling(request: GenerationRequest): Promise<GenerationResult> {
    logger.info('Kling generation requested (using Freepik API):', request.prompt);
    
    try {
      const freepikService = new (await import('../services/ai/FreepikService')).FreepikService();
      
      // Определяем какую Freepik модель использовать для Kling
      let freepikModel = 'kling_v2_5_pro'; // По умолчанию используем более быструю модель
      
      if (request.imageUrl) {
        const result = await freepikService.generateVideoFromImage(
          request.imageUrl,
          request.prompt,
          freepikModel as any
        );
        
        if (result.success && result.data?.id) {
          return {
            success: true,
            resultUrl: result.data.videos?.[0]?.url || '',
            taskId: result.data.id,
            tokensUsed: 0
          };
        }
      }
      
      // Fallback для текстовой генерации (пока заглушка)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      return {
        success: true,
        resultUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        taskId: `kling_freepik_${Date.now()}`,
        tokensUsed: 0
      };
      
    } catch (error) {
      logger.error('Kling (Freepik) generation error:', error);
      return {
        success: false,
        error: 'Ошибка генерации через Kling',
        tokensUsed: 0
      };
    }
  }

  /**
   * Генерация через ChatGPT
   */
  private async generateWithChatGPT(request: GenerationRequest): Promise<GenerationResult> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return { success: false, error: 'OpenAI API ключ не настроен', tokensUsed: 0 };
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: request.prompt }
        ],
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const answer = response.data.choices[0]?.message?.content;
      
      return {
        success: true,
        resultUrl: answer, // Для текста используем resultUrl как текст ответа
        tokensUsed: 0
      };

    } catch (error: any) {
      logger.error('ChatGPT API error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || 'Ошибка ChatGPT API', 
        tokensUsed: 0 
      };
    }
  }

  /**
   * Получить стоимость генерации в токенах
   */
  private getTokenCost(service: string, type: string): number {
    const key = service === 'freepik' ? `${service}_${type}` : service;
    return TOKEN_COSTS[key as keyof typeof TOKEN_COSTS] || 5;
  }

  /**
   * Сохранить историю генерации
   */
  private async saveGenerationHistory(
    request: GenerationRequest, 
    result: GenerationResult, 
    tokensUsed: number
  ): Promise<void> {
    try {
      await prisma.generationHistory.create({
        data: {
          userId: request.userId.toString(),
          service: request.service,
          type: request.type,
          prompt: request.prompt,
          resultUrl: result.resultUrl,
          taskId: result.taskId,
          tokensUsed,
          status: result.success ? 'completed' : 'failed'
        }
      });
    } catch (error) {
      logger.error('Error saving generation history:', error);
    }
  }
}
