import axios from 'axios';
import { logger } from '../../utils/logger';

// Модели для генерации изображений
export const FREEPIK_IMAGE_MODELS = {
  mystic: {
    name: 'Freepik Mystic',
    description: 'Высококачественная генерация изображений 1K-4K',
    endpoint: '/ai/mystic',
    models: ['realism', 'artistic', 'fantasy', 'anime']
  },
  flux_dev: {
    name: 'Flux Dev',
    description: 'Быстрая генерация изображений',
    endpoint: '/ai/flux-dev'
  },
  flux_pro: {
    name: 'Flux Pro 1.1',
    description: 'Профессиональная генерация изображений',
    endpoint: '/ai/flux-pro-1-1'
  },
  seedream_v4: {
    name: 'Seedream v4',
    description: 'Креативная генерация изображений',
    endpoint: '/ai/seedream-v4'
  },
  imagen3: {
    name: 'Google Imagen 3',
    description: 'Google AI модель для изображений',
    endpoint: '/ai/imagen3'
  }
};

// Модели для генерации видео (из Freepik API - заменяют Runway и Kling)
export const FREEPIK_VIDEO_MODELS = {
  kling_v2_1_pro: {
    name: 'Kling 2.1 Pro',
    description: 'Премиум генерация видео из изображений',
    endpoint: '/ai/image-to-video/kling-v2-1-pro',
    maxDuration: 10,
    resolution: '1080p'
  },
  kling_v2_1_std: {
    name: 'Kling 2.1 Standard',
    description: 'Стандартная генерация видео из изображений',
    endpoint: '/ai/image-to-video/kling-v2-1-std',
    maxDuration: 5,
    resolution: '720p'
  },
  kling_v2_5_pro: {
    name: 'Kling 2.5 Turbo Pro',
    description: 'Быстрая премиум генерация видео',
    endpoint: '/ai/image-to-video/kling-v2-5-pro',
    maxDuration: 10,
    resolution: '1080p'
  },
  minimax_hailuo_1080p: {
    name: 'MiniMax Hailuo 1080p',
    description: 'Высококачественное видео из текста/изображения',
    endpoint: '/ai/text-image-to-video/minimax-hailuo-02-1080p',
    maxDuration: 6,
    resolution: '1080p'
  },
  pixverse_v5: {
    name: 'PixVerse V5',
    description: 'Универсальная генерация видео',
    endpoint: '/ai/image-to-video/pixverse-v5',
    maxDuration: 4,
    resolution: '720p'
  },
  seedance_pro_1080p: {
    name: 'Seedance Pro 1080p',
    description: 'Профессиональная генерация видео',
    endpoint: '/ai/image-to-video/seedance-pro-1080p',
    maxDuration: 4,
    resolution: '1080p'
  }
};

export interface FreepikImageRequest {
  prompt: string;
  aspect_ratio?: 'square_1_1' | 'widescreen_16_9' | 'social_story_9_16' | 'portrait_2_3' | 'traditional_3_4' | 'standard_3_2' | 'classic_4_3';
  model?: keyof typeof FREEPIK_IMAGE_MODELS;
  resolution?: '1k' | '2k' | '4k';
  creative_detailing?: number; // 0-100
}

export interface FreepikVideoRequest {
  image: string; // Обязательный параметр - URL изображения
  prompt?: string; // Опциональный текстовый промпт
  model?: keyof typeof FREEPIK_VIDEO_MODELS;
  duration?: number; // Продолжительность в секундах
}

export interface FreepikResponse {
  success: boolean;
  data?: {
    id: string;
    status: 'processing' | 'completed' | 'failed';
    images?: Array<{
      id: string;
      url: string;
      base64?: string;
    }>;
    videos?: Array<{
      id: string;
      url: string;
    }>;
  };
  error?: string;
}

export class FreepikService {
  private apiKey: string;
  private baseUrl = 'https://api.freepik.com/v1';

  constructor() {
    this.apiKey = process.env.FREEPIK_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FREEPIK_API_KEY is required');
    }
  }

  /**
   * Генерация изображения через Freepik AI
   */
  async generateImage(request: FreepikImageRequest): Promise<FreepikResponse> {
    try {
      const model = request.model || 'mystic';
      const modelConfig = FREEPIK_IMAGE_MODELS[model];
      
      logger.info('Freepik image generation started:', { 
        prompt: request.prompt,
        model: modelConfig.name 
      });

      let requestData: any = {
        prompt: request.prompt,
        webhook_url: `${process.env.BACKEND_URL}/api/webhooks/freepik`
      };

      // Настройки для разных моделей
      if (model === 'mystic') {
        requestData = {
          ...requestData,
          model: 'realism',
          resolution: request.resolution || '2k',
          aspect_ratio: request.aspect_ratio || 'square_1_1',
          creative_detailing: request.creative_detailing || 33,
          filter_nsfw: true
        };
      } else {
        requestData = {
          ...requestData,
          aspect_ratio: request.aspect_ratio || 'square_1_1'
        };
      }

      const response = await axios.post(
        `${this.baseUrl}${modelConfig.endpoint}`,
        requestData,
        {
          headers: {
            'x-freepik-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 минуты
        }
      );

      logger.info('Freepik image response:', response.data);

      return {
        success: true,
        data: {
          id: response.data.data?.task_id,
          status: 'processing',
          images: response.data.data?.generated?.map((url: string) => ({ url, id: Math.random().toString() }))
        }
      };

    } catch (error: any) {
      logger.error('Freepik image generation error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Генерация видео из изображения через Freepik API
   */
  async generateVideoFromImage(imageUrl: string, prompt?: string, model: keyof typeof FREEPIK_VIDEO_MODELS = 'kling_v2_1_std'): Promise<FreepikResponse> {
    try {
      const modelConfig = FREEPIK_VIDEO_MODELS[model];
      
      logger.info('Freepik image-to-video generation started:', { 
        imageUrl: imageUrl.substring(0, 50) + '...',
        prompt: prompt?.substring(0, 100),
        model: modelConfig.name
      });

      const requestData: any = {
        image: imageUrl,
        webhook_url: `${process.env.BACKEND_URL}/api/webhooks/freepik`
      };

      // Добавляем prompt если есть
      if (prompt) {
        requestData.prompt = prompt;
      }

      // Настройки продолжительности для разных моделей
      if (modelConfig.maxDuration) {
        requestData.duration = Math.min(modelConfig.maxDuration, 10);
      }

      const response = await axios.post(
        `${this.baseUrl}${modelConfig.endpoint}`,
        requestData,
        {
          headers: {
            'x-freepik-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 минут
        }
      );

      logger.info('Freepik image-to-video response:', response.data);

      return {
        success: true,
        data: {
          id: response.data.data?.task_id,
          status: 'processing',
          videos: response.data.data?.generated?.map((url: string) => ({ url, id: Math.random().toString() }))
        }
      };

    } catch (error: any) {
      logger.error('Freepik image-to-video error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Генерация видео через Freepik AI
   */
  async generateVideo(request: FreepikVideoRequest): Promise<FreepikResponse> {
    return await this.generateVideoFromImage(
      request.image,
      request.prompt,
      request.model || 'kling_v2_1_std'
    );
  }

  /**
   * Получает список доступных моделей для изображений
   */
  getImageModels() {
    return Object.entries(FREEPIK_IMAGE_MODELS).map(([key, model]) => ({
      id: key,
      name: model.name,
      description: model.description
    }));
  }

  /**
   * Получает список доступных моделей для видео
   */
  getVideoModels() {
    return Object.entries(FREEPIK_VIDEO_MODELS).map(([key, model]) => ({
      id: key,
      name: model.name,
      description: model.description,
      maxDuration: model.maxDuration,
      resolution: model.resolution
    }));
  }

  /**
   * Проверка статуса задачи (универсальный метод)
   */
  async checkTaskStatus(taskId: string, type: 'image' | 'video' = 'image'): Promise<FreepikResponse> {
    try {
      // Для изображений используем Mystic endpoint по умолчанию
      let endpoint = `/ai/mystic/${taskId}`;
      
      // Для видео используем Kling endpoint по умолчанию
      if (type === 'video') {
        endpoint = `/ai/image-to-video/kling-v2-1-std/${taskId}`;
      }

      const response = await axios.get(
        `${this.baseUrl}${endpoint}`,
        {
          headers: {
            'x-freepik-api-key': this.apiKey
          }
        }
      );

      const status = response.data.data?.status;
      const generated = response.data.data?.generated;
      
      return {
        success: true,
        data: {
          id: taskId,
          status: status === 'COMPLETED' ? 'completed' : status === 'FAILED' ? 'failed' : 'processing',
          images: type === 'image' && generated ? generated.map((url: string) => ({ url, id: Math.random().toString() })) : undefined,
          videos: type === 'video' && generated ? generated.map((url: string) => ({ url, id: Math.random().toString() })) : undefined
        }
      };

    } catch (error: any) {
      logger.error('Task status check failed:', error.response?.data || error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
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
    
    if (error.response?.status === 401) {
      return 'Invalid API key';
    }
    
    if (error.response?.status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }
    
    if (error.response?.status === 400) {
      return 'Invalid request parameters';
    }
    
    return error.message || 'Unknown error occurred';
  }

  /**
   * Проверка валидности API ключа
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Простая проверка - попытка получить список задач
      const response = await axios.get(
        `${this.baseUrl}/ai/mystic`,
        {
          headers: {
            'x-freepik-api-key': this.apiKey
          }
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
