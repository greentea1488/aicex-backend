import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';

/**
 * Специализированный сервис для работы с видео API Freepik
 * Поддерживает image-to-video и потенциально text-to-video
 */

// Типы для видео моделей
interface VideoModelConfig {
  endpoint: string;
  name: string;
  description: string;
  type: string;
  durations: number[];
  working: boolean;
  requiresPaidPlan?: boolean;
  requiresImageUrl?: boolean;
  requiresResolution?: boolean;
}

// Конфигурация видео моделей на основе тестирования
export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  // ✅ РАБОТАЮЩИЕ IMAGE-TO-VIDEO МОДЕЛИ
  'kling-v2-5-pro': {
    endpoint: '/v1/ai/image-to-video/kling-v2-5-pro',
    name: 'Kling 2.5 Turbo Pro',
    description: 'Новейшая модель с плавным движением и высокой детализацией',
    type: 'image-to-video',
    durations: [5, 10],
    working: true
  },
  'kling-v2-1-master': {
    endpoint: '/v1/ai/image-to-video/kling-v2-1-master',
    name: 'Kling v2.1 Master',
    description: 'Мастер версия для профессиональной анимации',
    type: 'image-to-video',
    durations: [5, 10],
    working: true
  },
  'kling-v2': {
    endpoint: '/v1/ai/image-to-video/kling-v2',
    name: 'Kling v2',
    description: 'Базовая версия Kling v2',
    type: 'image-to-video',
    durations: [5, 10],
    working: true
  },
  'pixverse-v5': {
    endpoint: '/v1/ai/image-to-video/pixverse-v5',
    name: 'PixVerse V5',
    description: 'Новая модель PixVerse для креативной анимации',
    type: 'image-to-video',
    durations: [5, 8],
    requiresImageUrl: true,
    requiresResolution: true,
    working: true
  },

  // ⚠️ МОДЕЛИ ТРЕБУЮЩИЕ ПЛАТНУЮ ПОДПИСКУ
  'minimax-hailuo-1080p': {
    endpoint: '/v1/ai/text-image-to-video/minimax-hailuo-02-1080p',
    name: 'Minimax Hailuo 1080p',
    description: 'Text-to-video и image-to-video в 1080p',
    type: 'text-image-to-video',
    durations: [5, 6],
    requiresPaidPlan: true,
    working: false
  },
  'minimax-hailuo-768p': {
    endpoint: '/v1/ai/text-image-to-video/minimax-hailuo-02-768p',
    name: 'Minimax Hailuo 768p',
    description: 'Text-to-video и image-to-video в 768p',
    type: 'text-image-to-video',
    durations: [5, 6],
    requiresPaidPlan: true,
    working: false
  },

  // Другие Kling модели (не протестированы из-за лимитов)
  'kling-pro-v2-1': {
    endpoint: '/v1/ai/image-to-video/kling-pro-v2-1',
    name: 'Kling Pro v2.1',
    description: 'Профессиональная версия',
    type: 'image-to-video',
    durations: [5, 10],
    working: false
  },
  'kling-std-v2-1': {
    endpoint: '/v1/ai/image-to-video/kling-std-v2-1',
    name: 'Kling Std v2.1',
    description: 'Стандартная версия',
    type: 'image-to-video',
    durations: [5, 10],
    working: false
  },

  // PixVerse Transition (требует платную подписку)
  'pixverse-v5-transition': {
    endpoint: '/v1/ai/image-to-video/pixverse-v5-transition',
    name: 'PixVerse V5 Transition',
    description: 'Специализированная модель для переходов',
    type: 'image-to-video',
    durations: [5, 8],
    requiresImageUrl: true,
    requiresResolution: true,
    requiresPaidPlan: true,
    working: false
  },

  // Seedance модели (требуют платную подписку)
  'seedance-pro-1080p': {
    endpoint: '/v1/ai/image-to-video/seedance-pro-1080p',
    name: 'Seedance Pro 1080p',
    description: 'Профессиональное качество 1080p',
    type: 'image-to-video',
    durations: [5, 10],
    requiresPaidPlan: true,
    working: false
  },
  'seedance-pro-720p': {
    endpoint: '/v1/ai/image-to-video/seedance-pro-720p',
    name: 'Seedance Pro 720p',
    description: 'Профессиональное качество 720p',
    type: 'image-to-video',
    durations: [5, 10],
    requiresPaidPlan: true,
    working: false
  },

  // Wan модели (требуют платную подписку)
  'wan-v2-2-720p': {
    endpoint: '/v1/ai/image-to-video/wan-v2-2-720p',
    name: 'Wan v2.2 720p',
    description: 'Wan модель 720p',
    type: 'image-to-video',
    durations: [5],
    requiresPaidPlan: true,
    working: false
  }
};

export interface VideoGenerationRequest {
  // Для image-to-video
  image?: string;
  // Для text-to-video (если поддерживается)
  text?: string;
  // Описание движения
  prompt?: string;
  // Модель
  model?: string;
  // Длительность
  duration?: number;
  // Разрешение (для некоторых моделей)
  resolution?: string;
  // Webhook для получения результата
  webhook_url?: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  taskId?: string;
  status?: string;
  videoUrl?: string;
  error?: string;
  requiresPaidPlan?: boolean;
}

export class FreepikVideoService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FREEPIK_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('FREEPIK_API_KEY is not configured');
    }

    this.client = axios.create({
      baseURL: 'https://api.freepik.com',
      headers: {
        'x-freepik-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Генерация видео из изображения
   */
  async generateVideoFromImage(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      const modelKey = request.model || 'kling-v2-5-pro';
      const modelConfig = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS];
      
      if (!modelConfig) {
        return {
          success: false,
          error: `Unknown model: ${modelKey}`
        };
      }

      // Проверяем, работает ли модель
      if (!modelConfig.working) {
        if (modelConfig.requiresPaidPlan) {
          return {
            success: false,
            error: `Model ${modelConfig.name} requires a paid subscription`,
            requiresPaidPlan: true
          };
        }
        return {
          success: false,
          error: `Model ${modelConfig.name} is currently unavailable`
        };
      }

      // Проверяем обязательные параметры
      if (!request.image) {
        return {
          success: false,
          error: 'Image URL is required for video generation'
        };
      }

      // Формируем запрос
      const requestData: any = {};
      
      // PixVerse требует особые параметры
      if (modelConfig.requiresImageUrl) {
        requestData.image_url = request.image;
      } else {
        requestData.image = request.image;
      }

      // Добавляем описание движения
      if (request.prompt) {
        requestData.prompt = request.prompt;
      }

      // Длительность (всегда строка!)
      const duration = request.duration || modelConfig.durations[0];
      requestData.duration = String(duration);

      // Разрешение для PixVerse
      if (modelConfig.requiresResolution) {
        requestData.resolution = request.resolution || '1080p';
      }

      // Webhook
      if (request.webhook_url || process.env.BACKEND_URL) {
        requestData.webhook_url = request.webhook_url || 
          `${process.env.BACKEND_URL}/api/webhooks/freepik`;
      }

      logger.info('Video generation request:', {
        model: modelKey,
        endpoint: modelConfig.endpoint,
        hasImage: !!request.image,
        duration: requestData.duration
      });

      const response = await this.client.post(
        modelConfig.endpoint,
        requestData
      );

      if (response.data?.data?.task_id) {
        return {
          success: true,
          taskId: response.data.data.task_id,
          status: response.data.data.status || 'CREATED'
        };
      }

      return {
        success: false,
        error: 'Invalid response from API'
      };

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Генерация видео из текста (для Minimax, требует платную подписку)
   */
  async generateVideoFromText(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      // Пока только Minimax поддерживает text-to-video
      const modelKey = request.model || 'minimax-hailuo-1080p';
      const modelConfig = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS];
      
      if (!modelConfig || modelConfig.type !== 'text-image-to-video') {
        return {
          success: false,
          error: 'Text-to-video is only available with Minimax models (paid subscription required)'
        };
      }

      if (modelConfig.requiresPaidPlan) {
        return {
          success: false,
          error: 'Text-to-video requires a paid Freepik subscription',
          requiresPaidPlan: true
        };
      }

      const requestData: any = {
        prompt: request.text || request.prompt,
        duration: String(request.duration || modelConfig.durations[0])
      };

      // Опционально можно добавить изображение
      if (request.image) {
        requestData.image = request.image;
      }

      const response = await this.client.post(
        modelConfig.endpoint,
        requestData
      );

      if (response.data?.data?.task_id) {
        return {
          success: true,
          taskId: response.data.data.task_id,
          status: response.data.data.status || 'CREATED'
        };
      }

      return {
        success: false,
        error: 'Invalid response from API'
      };

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Проверка статуса задачи
   */
  async checkTaskStatus(taskId: string, modelKey: string): Promise<VideoGenerationResponse> {
    try {
      const modelConfig = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS];
      
      if (!modelConfig) {
        return {
          success: false,
          error: 'Unknown model'
        };
      }

      const response = await this.client.get(
        `${modelConfig.endpoint}/${taskId}`
      );

      const data = response.data?.data;
      
      if (data) {
        const result: VideoGenerationResponse = {
          success: true,
          taskId: taskId,
          status: data.status
        };

        if (data.status === 'COMPLETED' && data.generated?.length > 0) {
          result.videoUrl = data.generated[0];
        }

        return result;
      }

      return {
        success: false,
        error: 'Invalid response from API'
      };

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Получить список доступных моделей
   */
  getAvailableModels() {
    const working = [];
    const requiresPaid = [];
    const unavailable = [];

    Object.entries(VIDEO_MODELS).forEach(([key, model]) => {
      const info = {
        id: key,
        name: model.name,
        description: model.description,
        type: model.type,
        durations: model.durations
      };

      if (model.working) {
        working.push(info);
      } else if (model.requiresPaidPlan) {
        requiresPaid.push(info);
      } else {
        unavailable.push(info);
      }
    });

    return {
      working,
      requiresPaid,
      unavailable
    };
  }

  /**
   * Обработка ошибок
   */
  private handleError(error: any): VideoGenerationResponse {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 429) {
        return {
          success: false,
          error: 'API rate limit exceeded or free trial limit reached',
          requiresPaidPlan: true
        };
      }

      if (status === 404) {
        return {
          success: false,
          error: 'Endpoint not found - model may not be available'
        };
      }

      if (status === 400) {
        return {
          success: false,
          error: data?.message || 'Invalid request parameters'
        };
      }

      return {
        success: false,
        error: data?.message || `API error: ${status}`
      };
    }

    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}
