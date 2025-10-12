import axios from 'axios';
import { logger } from '../../utils/logger';

export interface RunwayVideoRequest {
  promptText: string; // Текстовый промпт (обязательный)
  promptImage?: string; // URL или base64 изображения для image-to-video (опциональный)
  model?: 'gen4_turbo' | 'gen4_aleph' | 'gen3a_turbo' | 'gen3'; // Модели согласно документации
  ratio?: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672'; // Согласно API Runway (в пикселях)
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
      console.log('==================== RUNWAY VIDEO GENERATION START ====================');
      console.log('Original Request:', JSON.stringify(request, null, 2));
      console.log('API Key exists:', !!this.apiKey);
      console.log('Base URL:', this.baseUrl);
      console.log('Has Image:', !!request.promptImage);
      console.log('===============================================================');

      logger.info('Runway video generation started:', { 
        promptText: request.promptText.substring(0, 100),
        hasImage: !!request.promptImage,
        model: request.model || 'gen4_turbo'
      });

      // Согласно документации Runway, используем /v1/image_to_video для всех случаев
      // Если есть изображение - добавляем promptImage, если нет - просто promptText
      const hasImage = !!request.promptImage;
      const endpoint = `${this.baseUrl}/image_to_video`;
      
      const requestBody: any = {
        model: request.model || 'gen4_turbo',
        promptText: request.promptText,
        duration: request.duration || 5,
        ratio: request.ratio || '1280:720', // По умолчанию 16:9 в пикселях
        watermark: false, // Всегда без watermark
        callback_url: `${process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://aicexaibot-production.up.railway.app')}/api/webhooks/runway`
      };

      // Если есть seed - добавляем
      if (request.seed !== undefined) {
        requestBody.seed = request.seed;
      }

      // Если есть изображение - добавляем promptImage
      if (hasImage) {
        requestBody.promptImage = request.promptImage;
      }

      console.log('==================== RUNWAY API REQUEST ====================');
      console.log('Endpoint:', endpoint);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Headers:', {
        'Authorization': `Bearer ${this.apiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      });
      console.log('===============================================================');

      const response = await axios.post(
        endpoint,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06' // Согласно документации
          },
          timeout: 30000 // 30 секунд на создание задачи
        }
      );

      console.log('==================== RUNWAY API RESPONSE ====================');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
      console.log('===============================================================');

      logger.info('Runway task created:', response.data);

      const taskId = response.data.id;
      if (!taskId) {
        return {
          success: false,
          error: 'No task ID received from Runway'
        };
      }

      // ✅ Возвращаем успех сразу - результат придет через webhook
      return {
        success: true,
        data: {
          id: taskId,
          status: 'PENDING',
          progress: 0
        }
      };

    } catch (error: any) {
      console.log('==================== RUNWAY API ERROR ====================');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('Error Code:', error.code);
      console.log('Response Status:', error.response?.status);
      console.log('Response Status Text:', error.response?.statusText);
      console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Request URL:', error.config?.url);
      console.log('Request Method:', error.config?.method);
      console.log('Request Headers:', error.config?.headers);
      console.log('Request Data:', error.config?.data);
      console.log('===============================================================');

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
          ratio: options?.ratio || '1280:720',
          seed: options?.seed,
          watermark: false // Всегда без watermark
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
      console.log('🔍 Checking Runway task status:', taskId);
      
      const response = await axios.get(
        `${this.baseUrl}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Runway-Version': '2024-11-06'
          }
        }
      );

      console.log('📊 Runway status response:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        data: response.data
      };

    } catch (error: any) {
      console.log('❌ Runway status check error:', error.response?.data || error.message);
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
    if (!request.promptText || request.promptText.trim().length === 0) {
      return { valid: false, error: 'Prompt text is required' };
    }

    if (request.promptText.length > 500) {
      return { valid: false, error: 'Prompt text is too long (max 500 characters)' };
    }

    if (request.duration && ![5, 10].includes(request.duration)) {
      return { valid: false, error: 'Duration must be 5 or 10 seconds' };
    }

    const validRatios = ['1280:720', '720:1280', '1104:832', '832:1104', '960:960', '1584:672'];
    if (request.ratio && !validRatios.includes(request.ratio)) {
      return { valid: false, error: 'Invalid ratio. Must be one of: 1280:720, 720:1280, 1104:832, 832:1104, 960:960, 1584:672' };
    }

    return { valid: true };
  }
}
