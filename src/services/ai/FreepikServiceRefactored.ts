/**
 * Рефакторенный Freepik сервис с использованием базового класса
 * Исправлены все проблемы согласно API документации
 */

import axios from 'axios';
import { BaseAIService, AIServiceConfig, GenerationRequest, GenerationResponse } from './BaseAIService';
import { ErrorHandler, APIResponse } from '../../utils/errorHandler';
import { InputValidator, ValidationError } from '../../utils/validation';
import { logger } from '../../utils/logger';

// Строго типизированные интерфейсы согласно API документации
export interface FreepikImageRequest extends GenerationRequest {
  prompt: string;
  aspect_ratio?: 'square_1_1' | 'widescreen_16_9' | 'social_story_9_16' | 'portrait_2_3' | 'traditional_3_4' | 'standard_3_2' | 'classic_4_3';
  guidance_scale?: number; // 0-20
  seed?: number;
  model?: 'seedream-v4' | 'flux' | 'mystic' | 'imagen3';
  webhook_url?: string;
}

export interface FreepikVideoRequest extends Omit<GenerationRequest, 'prompt'> {
  image: string; // Обязательный параметр - URL изображения
  duration: '5' | '10'; // Строка согласно API документации
  prompt?: string; // Опциональный текстовый промпт для движения
  negative_prompt?: string; // Что избегать в видео
  cfg_scale?: number; // 0-1, гибкость генерации
  webhook_url?: string; // URL для webhook уведомлений
  model?: 'kling-v2' | 'kling-v2.5-pro' | 'kling-v2.1-master' | 'minimax-hailuo-02-1080p' | 'pixverse-v5';
}

export interface FreepikTaskResponse {
  data: {
    task_id: string;
    status: 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    generated?: Array<{
      url: string;
      base64?: string;
    }>;
    error_message?: string;
  };
}

export class FreepikServiceRefactored extends BaseAIService {
  private readonly SUPPORTED_IMAGE_MODELS = ['seedream-v4', 'flux', 'mystic', 'imagen3'];
  private readonly SUPPORTED_VIDEO_MODELS = ['kling-v2', 'kling-v2.5-pro', 'kling-v2.1-master', 'minimax-hailuo-02-1080p', 'pixverse-v5'];
  
  constructor() {
    const config: AIServiceConfig = {
      apiKey: process.env.FREEPIK_API_KEY || '',
      baseUrl: 'https://api.freepik.com',
      timeout: 120000, // 2 минуты для изображений
      retryAttempts: 3,
      retryDelay: 2000
    };

    super(config, 'Freepik');
  }

  /**
   * Основной метод генерации (реализация абстрактного метода)
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Определяем тип запроса по наличию параметра image
    if ('image' in request) {
      return this.generateVideoFromImage(request as FreepikVideoRequest);
    } else {
      return this.generateImage(request as FreepikImageRequest);
    }
  }

  /**
   * Генерация изображения с полной валидацией
   */
  async generateImage(request: FreepikImageRequest): Promise<GenerationResponse> {
    try {
      // Валидация входных данных
      this.validateRequest(request);
      const modelValidation = InputValidator.validateModelParams(
        { model: request.model },
        this.SUPPORTED_IMAGE_MODELS
      );
      
      if (!modelValidation.isValid) {
        throw new ValidationError(modelValidation.errors);
      }

      const model = request.model || 'seedream-v4';
      const endpoint = `${this.config.baseUrl}/v1/ai/text-to-image/${model}`;

      logger.info('Freepik image generation started', {
        model,
        promptLength: request.prompt.length,
        aspectRatio: request.aspect_ratio
      });

      const requestData = {
        prompt: request.prompt,
        aspect_ratio: request.aspect_ratio || 'square_1_1',
        guidance_scale: request.guidance_scale || 7.5,
        ...(request.seed && { seed: request.seed }),
        ...(request.webhook_url && { webhook_url: request.webhook_url })
      };

      const response = await this.safeRequest(async () => {
        return axios.post<FreepikTaskResponse>(endpoint, requestData, {
          headers: {
            'x-freepik-api-key': this.config.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        });
      }, 'image generation');

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Image generation failed'
        };
      }

      const taskData = response.data!.data.data;
      
      // Если есть task_id, ждем завершения
      if (taskData.task_id) {
        return await this.waitForTaskCompletion(taskData.task_id, 'image');
      }

      // Если изображение готово сразу
      if (taskData.generated && taskData.generated.length > 0) {
        return {
          success: true,
          data: {
            id: taskData.task_id || 'immediate',
            status: 'completed',
            result: {
              type: 'image',
              url: taskData.generated[0].url,
              urls: taskData.generated.map(img => img.url)
            }
          },
          tokensUsed: 8 // Стандартная стоимость для Freepik
        };
      }

      throw new Error('Unexpected response format from Freepik API');

    } catch (error: any) {
      logger.error('Freepik image generation failed', {
        error: error.message,
        prompt: request.prompt.substring(0, 100)
      });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }

      const errorResponse = this.handleError(error);
      return {
        success: false,
        error: errorResponse.error || 'Image generation failed'
      };
    }
  }

  /**
   * Генерация видео из изображения с полной валидацией
   */
  async generateVideoFromImage(request: FreepikVideoRequest): Promise<GenerationResponse> {
    try {
      // Валидация входных данных
      this.validateRequest(request);
      
      const imageValidation = InputValidator.validateImageUrl(request.image);
      if (!imageValidation.isValid) {
        throw new ValidationError(imageValidation.errors);
      }

      const modelValidation = InputValidator.validateModelParams(
        { model: request.model },
        this.SUPPORTED_VIDEO_MODELS
      );
      
      if (!modelValidation.isValid) {
        throw new ValidationError(modelValidation.errors);
      }

      const model = request.model || 'kling-v2';
      const endpoint = `${this.config.baseUrl}/v1/ai/image-to-video/${model}`;

      logger.info('Freepik video generation started', {
        model,
        imageUrl: request.image.substring(0, 50) + '...',
        duration: request.duration,
        hasPrompt: !!request.prompt
      });

      const requestData = {
        image: request.image,
        duration: request.duration || '5',
        ...(request.prompt && { prompt: request.prompt }),
        ...(request.negative_prompt && { negative_prompt: request.negative_prompt }),
        ...(request.cfg_scale && { cfg_scale: request.cfg_scale }),
        ...(request.webhook_url && { webhook_url: request.webhook_url })
      };

      const response = await this.safeRequest(async () => {
        return axios.post<FreepikTaskResponse>(endpoint, requestData, {
          headers: {
            'x-freepik-api-key': this.config.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 минут для видео
        });
      }, 'video generation');

      if (!response.success) {
        throw new Error((response as any).error || 'Video generation failed');
      }

      const taskData = response.data!.data.data;
      
      if (taskData.task_id) {
        return await this.waitForTaskCompletion(taskData.task_id, 'video');
      }

      throw new Error('No task ID received from Freepik API');

    } catch (error: any) {
      logger.error('Freepik video generation failed:', error.message,
        imageUrl: request.image.substring(0, 50) + '...'
      );

      if (error instanceof ValidationError) {
        return {
{{ ... }}
      }, `task status check for ${taskId}`);

      if (!response.success) {
        throw new Error((response as any).error || 'Failed to create image task');
      }

      const taskData = response.data!.data.data;
      
{{ ... }}
        success: true,
        data: {
          id: taskId,
          status: taskData.status.toLowerCase() as any,
          result: taskData.generated ? {
            type: taskData.generated[0].url.includes('.mp4') ? 'video' : 'image',
            url: taskData.generated[0].url,
            urls: taskData.generated.map(item => item.url)
          } : undefined
        }
      };

    } catch (error: any) {
      logger.error('Failed to check Freepik task status', {
        taskId,
        error: error.message
      });

      const errorResponse = this.handleError(error);
      return {
        success: false,
        error: errorResponse.error || 'Failed to check task status'
      };
    }
  }

  /**
   * Ожидание завершения задачи с таймаутом
   */
  private async waitForTaskCompletion(taskId: string, type: 'image' | 'video'): Promise<GenerationResponse> {
    const maxAttempts = type === 'image' ? 30 : 60; // 1.5 мин для изображений, 5 мин для видео
    const checkInterval = 3000; // 3 секунды

    logger.info(`Waiting for ${type} generation completion`, { taskId, maxAttempts });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const statusResponse = await this.checkTaskStatus(taskId);
      
      if (!statusResponse.success) {
        return statusResponse;
      }

      const status = statusResponse.data!.status;
      
      logger.debug(`Task ${taskId} status check ${attempt}/${maxAttempts}`, { status });

      if (status === 'completed') {
        logger.info(`${type} generation completed successfully`, { taskId, attempts: attempt });
        return {
          success: true,
          data: statusResponse.data!,
          tokensUsed: type === 'image' ? 8 : 25
        };
      }

      if (status === 'failed') {
        logger.error(`${type} generation failed`, { taskId, attempts: attempt });
        return {
          success: false,
          error: 'Generation failed on Freepik side'
        };
      }

      // Ждем перед следующей проверкой
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    logger.warn(`${type} generation timeout`, { taskId, maxAttempts });
    return {
      success: false,
      error: `Generation timeout after ${maxAttempts * checkInterval / 1000} seconds`
    };
  }

  /**
   * Обработка ошибок специфичная для Freepik
   */
  protected handleError(error: any): APIResponse<never> {
    return ErrorHandler.handleFreepikError(error);
  }

  /**
   * Проверка здоровья сервиса
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/ai/models`, {
        headers: {
          'x-freepik-api-key': this.config.apiKey
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Получение доступных моделей
   */
  async getAvailableModels(): Promise<{ images: string[]; videos: string[] }> {
    return {
      images: this.SUPPORTED_IMAGE_MODELS,
      videos: this.SUPPORTED_VIDEO_MODELS
    };
  }
}
