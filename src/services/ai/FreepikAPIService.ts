import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';

/**
 * Современный сервис для работы с Freepik API
 * Соответствует последней документации API
 */

// Типы для запросов и ответов
export interface FreepikImageGenerationRequest {
  prompt: string;
  model?: string;
  aspect_ratio?: string;
  resolution?: string;
  creative_detailing?: number;
  filter_nsfw?: boolean;
  webhook_url?: string;
}

export interface FreepikVideoGenerationRequest {
  image: string; // URL изображения (обязательный параметр)
  prompt?: string; // Описание движения (опциональный)
  model?: string;
  duration?: number;
  aspect_ratio?: string;
  webhook_url?: string;
}

export interface FreepikTaskResponse {
  data?: {
    task_id: string;
    status: 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    generated?: string[];
    error?: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

// Конфигурация моделей изображений
export const IMAGE_MODELS = {
  // Mystic - фотореалистичная генерация
  'mystic': {
    endpoint: '/v1/ai/mystic',
    name: 'Freepik Mystic',
    description: 'Фотореалистичная генерация 1K-4K',
    supportedParams: ['model', 'resolution', 'aspect_ratio', 'creative_detailing', 'filter_nsfw']
  },
  // Flux модели
  'flux-dev': {
    endpoint: '/v1/ai/text-to-image/flux-dev',
    name: 'Flux Dev',
    description: 'Быстрая генерация для разработки'
  },
  'flux-pro': {
    endpoint: '/v1/ai/text-to-image/flux-pro-v1-1',
    name: 'Flux Pro v1.1',
    description: 'Профессиональная генерация'
  },
  // Seedream модели
  'seedream-v4': {
    endpoint: '/v1/ai/text-to-image/seedream-v4',
    name: 'Seedream v4',
    description: 'Креативная генерация'
  },
  // Google модели
  'imagen3': {
    endpoint: '/v1/ai/text-to-image/google-imagen-3',
    name: 'Google Imagen 3',
    description: 'Продвинутая модель от Google'
  },
  'gemini-flash': {
    endpoint: '/v1/ai/text-to-image/gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Быстрая генерация от Google'
  },
  // Другие модели
  'hyperflux': {
    endpoint: '/v1/ai/text-to-image/hyperflux',
    name: 'Hyperflux',
    description: 'Сверхбыстрая генерация'
  },
  'classic-fast': {
    endpoint: '/v1/ai/text-to-image/classic-fast',
    name: 'Classic Fast',
    description: 'Классическая быстрая генерация'
  }
};

// Типы для видео моделей
interface VideoModelConfig {
  endpoint: string;
  name: string;
  description: string;
  durations: number[];
  requiresImageUrl?: boolean;
  requiresResolution?: boolean;
}

// Конфигурация моделей видео (IMAGE-TO-VIDEO)
export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  // Kling модели для image-to-video
  'kling-v2-5-pro': {
    endpoint: '/v1/ai/image-to-video/kling-v2-5-pro',
    name: 'Kling 2.5 Turbo Pro',
    description: 'Кинематографичное видео из изображения с плавным движением',
    durations: [5, 10]
  },
  'kling-v2-1-pro': {
    endpoint: '/v1/ai/image-to-video/kling-v2-1-pro',
    name: 'Kling v2.1 Pro',
    description: 'Профессиональная версия для image-to-video',
    durations: [5, 10]
  },
  'kling-v2-1-std': {
    endpoint: '/v1/ai/image-to-video/kling-v2-1-std',
    name: 'Kling v2.1 Standard',
    description: 'Стандартная версия для image-to-video',
    durations: [5]
  },
  // PixVerse модели для image-to-video
  'pixverse-v5': {
    endpoint: '/v1/ai/image-to-video/pixverse-v5',
    name: 'PixVerse V5',
    description: 'Новая модель PixVerse для анимации изображений',
    durations: [5, 8], // PixVerse поддерживает 5 и 8 секунд
    requiresImageUrl: true, // Требует image_url вместо image
    requiresResolution: true // Требует resolution
  },
  // Seedance модели для image-to-video
  'seedance-pro-1080p': {
    endpoint: '/v1/ai/image-to-video/seedance-pro-1080p',
    name: 'Seedance Pro 1080p',
    description: 'Профессиональная версия 1080p',
    durations: [5, 10] // Seedance поддерживает 5 и 10 секунд
  }
};

export class FreepikAPIService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FREEPIK_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('FREEPIK_API_KEY is not configured');
    }

    // Создаем axios клиент с базовой конфигурацией
    this.client = axios.create({
      baseURL: 'https://api.freepik.com',
      headers: {
        'x-freepik-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 минуты
    });

    // Добавляем interceptor для логирования
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Freepik API Request:', {
          method: config.method,
          url: config.url,
          model: config.data?.model
        });
        return config;
      },
      (error) => {
        logger.error('Freepik API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('Freepik API Response:', {
          status: response.status,
          taskId: response.data?.data?.task_id
        });
        return response;
      },
      (error) => {
        logger.error('Freepik API Response Error:', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Генерация изображения
   */
  async generateImage(request: FreepikImageGenerationRequest): Promise<FreepikTaskResponse> {
    try {
      const modelKey = request.model || 'flux-dev';
      const modelConfig = IMAGE_MODELS[modelKey as keyof typeof IMAGE_MODELS];
      
      if (!modelConfig) {
        throw new Error(`Unknown image model: ${modelKey}`);
      }

      // Подготавливаем данные запроса
      const requestData: any = {
        prompt: request.prompt
      };

      // Добавляем webhook если есть
      if (request.webhook_url || process.env.BACKEND_URL) {
        requestData.webhook_url = request.webhook_url || `${process.env.BACKEND_URL}/api/webhooks/freepik`;
      }

      // Специальные параметры для Mystic
      if (modelKey === 'mystic') {
        requestData.model = 'realism'; // или другие: artistic, fantasy, anime
        requestData.resolution = request.resolution || '2k';
        requestData.aspect_ratio = request.aspect_ratio || 'square_1_1';
        requestData.creative_detailing = request.creative_detailing ?? 33;
        requestData.filter_nsfw = request.filter_nsfw ?? true;
      } else {
        // Для других моделей
        if (request.aspect_ratio) {
          requestData.aspect_ratio = request.aspect_ratio;
        }
      }

      const response = await this.client.post<FreepikTaskResponse>(
        modelConfig.endpoint,
        requestData
      );

      return response.data;

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Генерация видео из изображения (Image-to-Video)
   */
  async generateVideoFromImage(request: FreepikVideoGenerationRequest): Promise<FreepikTaskResponse> {
    try {
      if (!request.image) {
        throw new Error('Image URL is required for video generation');
      }

      const modelKey = request.model || 'kling-v2-5-pro';
      const modelConfig = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS];
      
      if (!modelConfig) {
        throw new Error(`Unknown video model: ${modelKey}`);
      }

      // Определяем формат данных в зависимости от модели
      const requestData: any = {};
      
      // PixVerse требует image_url вместо image
      if (modelConfig.requiresImageUrl) {
        requestData.image_url = request.image;
      } else {
        requestData.image = request.image;
      }

      // Добавляем описание движения если есть
      if (request.prompt) {
        requestData.prompt = request.prompt;
      }

      // Добавляем webhook
      if (request.webhook_url || process.env.BACKEND_URL) {
        requestData.webhook_url = request.webhook_url || `${process.env.BACKEND_URL}/api/webhooks/freepik`;
      }

      // Добавляем длительность (всегда как строка!)
      if (request.duration && modelConfig.durations) {
        const validDuration = modelConfig.durations.includes(request.duration) 
          ? request.duration 
          : modelConfig.durations[0];
        requestData.duration = String(validDuration); // Преобразуем в строку!
      } else if (modelConfig.durations) {
        requestData.duration = String(modelConfig.durations[0]);
      }
      
      // PixVerse требует resolution
      if (modelConfig.requiresResolution) {
        requestData.resolution = '1080p';
      }

      if (request.aspect_ratio) {
        requestData.aspect_ratio = request.aspect_ratio;
      }

      logger.info('Image-to-Video request:', {
        model: modelKey,
        endpoint: modelConfig.endpoint,
        hasImage: !!request.image,
        hasPrompt: !!request.prompt
      });

      const response = await this.client.post<FreepikTaskResponse>(
        modelConfig.endpoint,
        requestData
      );

      return response.data;

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Проверка статуса задачи
   */
  async checkTaskStatus(taskId: string, modelKey: string): Promise<FreepikTaskResponse> {
    try {
      // Определяем endpoint на основе модели
      let endpoint = '';
      
      if (IMAGE_MODELS[modelKey as keyof typeof IMAGE_MODELS]) {
        const model = IMAGE_MODELS[modelKey as keyof typeof IMAGE_MODELS];
        endpoint = `${model.endpoint}/${taskId}`;
      } else if (VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS]) {
        const model = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS];
        endpoint = `${model.endpoint}/${taskId}`;
      } else {
        // Fallback на Mystic для изображений
        endpoint = `/v1/ai/mystic/${taskId}`;
      }

      const response = await this.client.get<FreepikTaskResponse>(endpoint);
      return response.data;

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Получить список доступных моделей
   */
  getAvailableModels() {
    return {
      images: Object.entries(IMAGE_MODELS).map(([key, model]) => ({
        id: key,
        name: model.name,
        description: model.description,
        endpoint: model.endpoint
      })),
      videos: Object.entries(VIDEO_MODELS).map(([key, model]) => ({
        id: key,
        name: model.name,
        description: model.description,
        endpoint: model.endpoint
      }))
    };
  }

  /**
   * Обработка ошибок
   */
  private handleError(error: any): FreepikTaskResponse {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      let errorMessage = 'Неизвестная ошибка Freepik API';
      
      if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        switch (status) {
          case 401:
            errorMessage = 'Неверный API ключ';
            break;
          case 403:
            errorMessage = 'Доступ запрещен. Проверьте права API ключа';
            break;
          case 429:
            errorMessage = 'Превышен лимит запросов. Попробуйте позже';
            break;
          case 400:
            errorMessage = 'Неверные параметры запроса';
            break;
          case 500:
            errorMessage = 'Внутренняя ошибка сервера Freepik';
            break;
        }
      }

      return {
        error: {
          message: errorMessage,
          code: status.toString()
        }
      };
    }

    return {
      error: {
        message: error.message || 'Ошибка подключения к Freepik API',
        code: 'NETWORK_ERROR'
      }
    };
  }

  /**
   * Проверка валидности API ключа
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Пробуем получить список задач Mystic
      const response = await this.client.get('/v1/ai/mystic', {
        params: { limit: 1 }
      });
      return response.status === 200;
    } catch (error) {
      logger.error('API key validation failed:', error);
      return false;
    }
  }
}
