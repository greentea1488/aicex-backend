import axios from 'axios';
import { logger } from '../../utils/logger';

export interface RunwayVideoRequest {
  promptText: string; // Согласно документации
  promptImage?: string; // URL изображения для image-to-video
  model?: 'gen4_turbo' | 'gen3a_turbo' | 'gen3'; // Обновленные модели
  ratio?: '1280:720' | '720:1280' | '1408:768' | '768:1408' | '1920:1080' | '1080:1920'; // Согласно документации
  duration?: number; // 5 or 10 seconds
  seed?: number;
  watermark?: boolean;
}

export interface RunwayResponse {
  success: boolean;
  data?: {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    output?: string[]; // URLs to generated videos
    progress?: number;
    eta?: number;
  };
  error?: string;
}

export class RunwayService {
  private apiKey: string;
  private baseUrl = 'https://api.dev.runwayml.com/v1'; // Исправлен URL согласно документации

  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('RUNWAY_API_KEY is required');
    }
  }

  /**
   * Генерация видео через Runway ML
   */
  async generateVideo(request: RunwayVideoRequest): Promise<RunwayResponse> {
    try {
      logger.info('Runway video generation started:', { 
        promptText: request.promptText.substring(0, 100),
        model: request.model || 'gen4_turbo'
      });

      // Используем правильный endpoint согласно документации
      const endpoint = `${this.baseUrl}/image_to_video`;

      const response = await axios.post(
        endpoint,
        {
          model: request.model || 'gen4_turbo',
          promptText: request.promptText, // Согласно документации Runway
          ratio: request.ratio || '1280:720', // Обновлено согласно документации
          duration: request.duration || 5,
          seed: request.seed,
          watermark: request.watermark !== false // По умолчанию true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06' // Согласно документации
          },
          timeout: 30000 // 30 секунд на создание задачи
        }
      );

      logger.info('Runway task created:', response.data);

      const taskId = response.data.id;
      if (!taskId) {
        return {
          success: false,
          error: 'No task ID received from Runway'
        };
      }

      // Ждем завершения генерации
      return await this.waitForCompletion(taskId);

    } catch (error: any) {
      logger.error('Runway video generation error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Генерация видео из изображения
   */
  async generateVideoFromImage(imageUrl: string, prompt?: string, options?: Partial<RunwayVideoRequest>): Promise<RunwayResponse> {
    try {
      logger.info('Runway image-to-video generation started:', { 
        imageUrl: imageUrl.substring(0, 50) + '...',
        prompt: prompt?.substring(0, 100)
      });

      const response = await axios.post(
        `${this.baseUrl}/image_to_video`,
        {
          model: options?.model || 'gen3a_turbo',
          prompt_image: imageUrl,
          prompt_text: prompt || '',
          duration: options?.duration || 5,
          resolution: options?.resolution || '1280x768',
          seed: options?.seed,
          watermark: options?.watermark !== false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const taskId = response.data.id;
      if (!taskId) {
        return {
          success: false,
          error: 'No task ID received from Runway'
        };
      }

      return await this.waitForCompletion(taskId);

    } catch (error: any) {
      logger.error('Runway image-to-video error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Проверка статуса задачи
   */
  async getTaskStatus(taskId: string): Promise<RunwayResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error: any) {
      logger.error('Runway status check error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Ожидание завершения генерации
   */
  private async waitForCompletion(taskId: string, maxAttempts = 120): Promise<RunwayResponse> {
    logger.info('Waiting for Runway task completion:', taskId);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusResponse = await this.getTaskStatus(taskId);
        
        if (!statusResponse.success) {
          return statusResponse;
        }

        const status = statusResponse.data?.status;
        const progress = statusResponse.data?.progress || 0;
        
        logger.info(`Runway task ${taskId} status:`, { status, progress, attempt: attempt + 1 });

        if (status === 'SUCCEEDED') {
          logger.info('Runway video generation completed successfully');
          return statusResponse;
        }
        
        if (status === 'FAILED') {
          return {
            success: false,
            error: 'Video generation failed'
          };
        }

        // Ждем 5 секунд перед следующей проверкой
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error: any) {
        logger.error(`Runway status check attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === maxAttempts - 1) {
          return {
            success: false,
            error: 'Timeout waiting for video generation'
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    return {
      success: false,
      error: 'Max attempts reached for video generation'
    };
  }

  /**
   * Получение информации о доступных моделях
   */
  async getAvailableModels(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;

    } catch (error: any) {
      logger.error('Error getting Runway models:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Получение информации об аккаунте и лимитах
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/account`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;

    } catch (error: any) {
      logger.error('Error getting Runway account info:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Отмена задачи генерации
   */
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/tasks/${taskId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      logger.info('Runway task cancelled:', taskId);
      return true;

    } catch (error: any) {
      logger.error('Error cancelling Runway task:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Парсинг ошибок API
   */
  private parseError(error: any): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    
    if (error.response?.status === 401) {
      return 'Invalid Runway API key';
    }
    
    if (error.response?.status === 429) {
      return 'Runway rate limit exceeded. Please try again later.';
    }
    
    if (error.response?.status === 400) {
      return 'Invalid request parameters for Runway';
    }
    
    if (error.response?.status === 402) {
      return 'Insufficient credits in Runway account';
    }
    
    if (error.response?.status === 503) {
      return 'Runway service temporarily unavailable';
    }
    
    return error.message || 'Unknown Runway error occurred';
  }

  /**
   * Проверка валидности API ключа
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const accountInfo = await this.getAccountInfo();
      return accountInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Получение стоимости генерации
   */
  getEstimatedCost(duration: number = 5, model: string = 'gen3a_turbo'): number {
    // Примерные цены (могут отличаться)
    const pricePerSecond = model === 'gen3' ? 0.05 : 0.025; // USD
    return duration * pricePerSecond;
  }

  /**
   * Конвертация разрешения в aspect ratio для официального SDK
   */
  private convertResolutionToAspectRatio(resolution: string): string {
    const resolutionMap: { [key: string]: string } = {
      '1280x768': '16:9',
      '768x1280': '9:16', 
      '1408x768': '16:9',
      '768x1408': '9:16'
    };
    
    return resolutionMap[resolution] || '16:9';
  }

  /**
   * Валидация параметров запроса
   */
  validateRequest(request: RunwayVideoRequest): { valid: boolean; error?: string } {
    if (!request.prompt || request.prompt.trim().length === 0) {
      return { valid: false, error: 'Prompt is required' };
    }

    if (request.prompt.length > 500) {
      return { valid: false, error: 'Prompt is too long (max 500 characters)' };
    }

    if (request.duration && ![5, 10].includes(request.duration)) {
      return { valid: false, error: 'Duration must be 5 or 10 seconds' };
    }

    const validResolutions = ['1280x768', '768x1280', '1408x768', '768x1408'];
    if (request.resolution && !validResolutions.includes(request.resolution)) {
      return { valid: false, error: 'Invalid resolution' };
    }

    return { valid: true };
  }
}
