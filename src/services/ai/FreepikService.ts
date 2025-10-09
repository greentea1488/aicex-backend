import axios from 'axios';
import { logger } from '../../utils/logger';
import { PromptEnhancerService } from '../PromptEnhancerService';

// Интерфейс для конфигурации модели изображений
interface FreepikImageModelConfig {
  name: string;
  description: string;
  endpoint: string;
  fallbackEndpoint: string;
  requiresModelParam: boolean;
  model?: string; // Опциональный параметр model (например, для Mystic)
}

// Модели для генерации изображений (согласно официальной документации Freepik API)
// Источники: https://docs.freepik.com/api-reference
export const FREEPIK_IMAGE_MODELS: Record<string, FreepikImageModelConfig> = {
  // Seedream (v3) - стабильная версия
  // Docs: https://docs.freepik.com/api-reference/text-to-image/seedream/post-seedream
  'seedream': {
    name: 'Seedream v3',
    description: 'Креативная генерация изображений',
    endpoint: '/v1/ai/text-to-image/seedream',    // Специфичный endpoint для Seedream v3
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                      // НЕ передаем model
  },
  
  // Убраны Seedream 4 и Seedream Edit - эти модели еще не вышли
  
  
  // Flux Dev - быстрая генерация
  // Docs: https://docs.freepik.com/api-reference/text-to-image/flux-dev
  'flux-dev': {
    name: 'Flux Dev',
    description: 'Быстрая генерация изображений',
    endpoint: '/v1/ai/text-to-image/flux-dev',    // Специфичный endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                      // НЕ передаем model
  },
  'flux_dev': {
    name: 'Flux Dev',
    description: 'Быстрая генерация изображений',
    endpoint: '/v1/ai/text-to-image/flux-dev',
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false
  },
  
  // Flux Pro v1.1 - профессиональная генерация
  // Docs: https://docs.freepik.com/api-reference/text-to-image/flux-pro-v1-1/post-flux-pro-v1-1
  'flux-pro': {
    name: 'Flux Pro v1.1',
    description: 'Профессиональная генерация изображений',
    endpoint: '/v1/ai/text-to-image/flux-pro-v1-1', // Специфичный endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                        // НЕ передаем model
  },
  'flux_pro': {
    name: 'Flux Pro v1.1',
    description: 'Профессиональная генерация изображений',
    endpoint: '/v1/ai/text-to-image/flux-pro-v1-1',
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false
  },
  
  // Hyperflux - гибридная быстрая генерация
  // Docs: https://docs.freepik.com/api-reference/text-to-image/get-hyperflux
  'hyperflux': {
    name: 'Hyperflux',
    description: 'Гибридная быстрая генерация изображений',
    endpoint: '/v1/ai/text-to-image/hyperflux',    // Специфичный endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                       // НЕ передаем model
  },
  
  // Mystic - высококачественная генерация (имеет собственный endpoint)
  // Docs: https://docs.freepik.com/api-reference/mystic/post-mystic
  'mystic': {
    name: 'Freepik Mystic',
    description: 'Ultra-realistic, high-resolution images (Freepik exclusive)',
    endpoint: '/v1/ai/mystic',                     // Специфичный endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    model: 'realism',                              // Mystic требует model: 'realism', 'fluid' или 'zen'
    requiresModelParam: true                       // Передаем model в параметре
  },
  
  // Classic Fast - базовая быстрая генерация
  // Docs: https://docs.freepik.com/api-reference/text-to-image/get-image-from-text
  'classic': {
    name: 'Classic Fast',
    description: 'Быстрая базовая генерация изображений',
    endpoint: '/v1/ai/text-to-image',              // Базовый endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                      // НЕ передаем model
  },
  
  // Google Imagen 3
  // Docs: https://docs.freepik.com/api-reference/text-to-image/imagen3
  'imagen3': {
    name: 'Google Imagen 3',
    description: 'Google\'s latest image generation model',
    endpoint: '/v1/ai/text-to-image/imagen3',      // Специфичный endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                      // НЕ передаем model
  },
  
  // Gemini 2.5 Flash
  // Docs: https://docs.freepik.com/api-reference/ai/gemini-2-5-flash-image-preview
  'gemini': {
    name: 'Gemini 2.5 Flash',
    description: 'Google\'s Gemini for image generation',
    endpoint: '/v1/ai/gemini-2-5-flash-image-preview', // Специфичный endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                      // НЕ передаем model
  },
  
  // Gemini Flash - альтернативное название
  'gemini-flash': {
    name: 'Gemini 2.5 Flash',
    description: 'Google\'s Gemini for image generation',
    endpoint: '/v1/ai/gemini-2-5-flash-image-preview', // Специфичный endpoint
    fallbackEndpoint: '/v1/ai/text-to-image',
    requiresModelParam: false                      // НЕ передаем model
  }
};

// Альтернативные endpoints для тестирования (используются как последний fallback)
// В основном используются специфичные endpoints из конфигурации моделей
export const FREEPIK_ALTERNATIVE_ENDPOINTS = [
  '/v1/ai/text-to-image',     // Classic Fast - базовый endpoint
  '/v1/ai/mystic',             // Mystic endpoint
];

// Модели для генерации видео (из Freepik API - заменяют Runway и Kling)
// ВАЖНО: endpoint'ы БЕЗ /v1/ в начале, т.к. baseUrl уже содержит /v1
export const FREEPIK_VIDEO_MODELS = {
  // 🎬 Kling v2.5 Pro - Новейшая модель
  kling_v2_5_pro: {
    name: 'Kling 2.5 Pro',
    description: 'Кинематографические видео с улучшенным движением и детализацией',
    endpoint: '/ai/image-to-video/kling-v2-5-pro',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'negative_prompt', 'cfg_scale', 'duration'],
    resolution: '1080p'
  },
  
  // 🎬 MiniMax Hailuo 02 - 768p
  minimax_hailuo_768p: {
    name: 'MiniMax Hailuo 02 768p',
    description: 'Качество 768p от Minimax',
    endpoint: '/ai/image-to-video/minimax-hailuo-02-768p',
    supportedDurations: [6, 10],
    requiredFields: ['prompt', 'first_frame_image'],
    optionalFields: ['last_frame_image', 'prompt_optimizer', 'duration'],
    resolution: '768p'
  },
  
  // 🎬 MiniMax Hailuo 02 - 1080p
  minimax_hailuo_1080p: {
    name: 'MiniMax Hailuo 02 1080p',
    description: 'Качество 1080p от Minimax (только 6 сек)',
    endpoint: '/ai/image-to-video/minimax-hailuo-02-1080p',
    supportedDurations: [6],
    requiredFields: ['prompt', 'first_frame_image'],
    optionalFields: ['last_frame_image', 'prompt_optimizer', 'duration'],
    resolution: '1080p'
  },
  
  // 🎬 Kling v2.1 Master
  kling_v2_1_master: {
    name: 'Kling 2.1 Master',
    description: 'Мастер версия Kling v2.1 с продвинутыми возможностями',
    endpoint: '/ai/image-to-video/kling-v2-1-master',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'negative_prompt', 'cfg_scale', 'duration', 'static_mask', 'dynamic_masks'],
    resolution: '1080p'
  },
  
  // 🎬 Kling Pro v2.1
  kling_v2_1_pro: {
    name: 'Kling Pro v2.1',
    description: 'Премиум генерация видео из изображений',
    endpoint: '/ai/image-to-video/kling-v2-1-pro',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['image_tail', 'prompt', 'negative_prompt', 'cfg_scale', 'duration', 'static_mask', 'dynamic_masks'],
    resolution: '1080p'
  },
  
  // 🎬 Kling Std v2.1
  kling_v2_1_std: {
    name: 'Kling Std v2.1',
    description: 'Стандартная генерация видео из изображений',
    endpoint: '/ai/image-to-video/kling-v2-1-std',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'negative_prompt', 'cfg_scale', 'duration', 'static_mask', 'dynamic_masks'],
    resolution: '720p'
  },
  
  // 🎬 PixVerse V5
  pixverse_v5: {
    name: 'PixVerse V5',
    description: 'Универсальная генерация видео с разными стилями',
    endpoint: '/ai/image-to-video/pixverse-v5',
    supportedDurations: [5, 8],
    supportedResolutions: ['360p', '540p', '720p', '1080p'],
    requiredFields: ['prompt', 'image_url'],
    optionalFields: ['resolution', 'duration', 'negative_prompt', 'style', 'seed'],
    resolution: '1080p'
  },
  
  // 🎬 PixVerse V5 Transition
  pixverse_v5_transition: {
    name: 'PixVerse V5 Transition',
    description: 'Переходы и анимации между двумя изображениями',
    endpoint: '/ai/image-to-video/pixverse-v5-transition',
    supportedDurations: [5, 8],
    requiredFields: ['start_image_url', 'end_image_url'],
    optionalFields: ['resolution', 'duration', 'prompt'],
    resolution: '1080p'
  },
  
  // 🎬 Kling v2
  kling_v2: {
    name: 'Kling v2',
    description: 'Базовая версия Kling v2',
    endpoint: '/ai/image-to-video/kling-v2',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'negative_prompt', 'cfg_scale', 'duration'],
    resolution: '720p'
  },
  
  // 🎬 Kling Pro 1.6
  kling_pro_1_6: {
    name: 'Kling Pro 1.6',
    description: 'Профессиональная версия 1.6',
    endpoint: '/ai/image-to-video/kling-pro',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'negative_prompt', 'cfg_scale', 'duration', 'static_mask', 'dynamic_masks'],
    resolution: '1080p'
  },
  
  // 🎬 Kling Std 1.6
  kling_std_1_6: {
    name: 'Kling Std 1.6',
    description: 'Стандартная версия 1.6',
    endpoint: '/ai/image-to-video/kling-std',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'negative_prompt', 'cfg_scale', 'duration', 'static_mask', 'dynamic_masks'],
    resolution: '720p'
  },
  
  // 🎬 Kling Elements Pro 1.6
  kling_elements_pro_1_6: {
    name: 'Kling Elements Pro 1.6',
    description: 'Работа с несколькими изображениями (до 4)',
    endpoint: '/ai/image-to-video/kling-elements-pro',
    supportedDurations: [5, 10],
    requiredFields: ['images'],
    optionalFields: ['prompt', 'negative_prompt', 'duration', 'aspect_ratio'],
    resolution: '1080p'
  },
  
  // 🎬 Kling Elements Std 1.6
  kling_elements_std_1_6: {
    name: 'Kling Elements Std 1.6',
    description: 'Стандартная версия Elements (до 4 изображений)',
    endpoint: '/ai/image-to-video/kling-elements-std',
    supportedDurations: [5, 10],
    requiredFields: ['images'],
    optionalFields: ['prompt', 'negative_prompt', 'duration', 'aspect_ratio'],
    resolution: '720p'
  },
  
  // 🎬 Seedance Pro 1080p
  seedance_pro_1080p: {
    name: 'Seedance Pro 1080p',
    description: 'Профессиональная генерация видео',
    endpoint: '/ai/image-to-video/seedance-pro-1080p',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'duration'],
    resolution: '1080p'
  },
  
  // 🎬 Wan v2.2 720p
  wan_v2_2_720p: {
    name: 'Wan v2.2 720p',
    description: 'Модель Wan для генерации видео',
    endpoint: '/ai/image-to-video/wan-v2-2-720p',
    supportedDurations: [5, 10],
    requiredFields: ['image'],
    optionalFields: ['prompt', 'duration'],
    resolution: '720p'
  }
};

export interface FreepikImageRequest {
  prompt: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '2:3' | '3:4' | '3:2' | '4:3';
  model?: keyof typeof FREEPIK_IMAGE_MODELS;
  resolution?: '1k' | '2k' | '4k';
  creative_detailing?: number; // 0-100
  enhancePrompt?: boolean; // Включить улучшение промпта
  promptStyle?: 'photographic' | 'artistic' | 'realistic' | 'fantasy' | 'anime';
  promptQuality?: 'high' | 'medium' | 'low';
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
    promptEnhancement?: {
      original: string;
      enhanced: string;
      improvements: string[];
      style: string;
      quality: string;
    } | null;
  };
  error?: string;
}

export class FreepikService {
  private apiKey: string;
  private baseUrl = process.env.FREEPIK_API_URL || 'https://api.freepik.com';
  private promptEnhancer: PromptEnhancerService;
  
  // Только один правильный базовый URL (endpoints уже содержат /v1/)
  private alternativeBaseUrls = [
    'https://api.freepik.com',        // Официальный API URL (БЕЗ /v1 в конце!)
  ];

  constructor() {
    this.apiKey = process.env.FREEPIK_API_KEY || '';
    if (!this.apiKey) {
      logger.error('FREEPIK_API_KEY is not set in environment variables');
      throw new Error('FREEPIK_API_KEY is required');
    }
    this.promptEnhancer = new PromptEnhancerService();
    logger.info('FreepikService initialized with API key:', this.apiKey.substring(0, 8) + '...');
  }

  /**
   * Конвертирует формат aspect_ratio из "1:1" в "square_1_1" для Freepik API
   */
  private convertAspectRatio(ratio?: string): string {
    const ratioMap: Record<string, string> = {
      '1:1': 'square_1_1',
      '16:9': 'widescreen_16_9',
      '9:16': 'social_story_9_16',
      '2:3': 'portrait_2_3',
      '3:4': 'traditional_3_4',
      '3:2': 'standard_3_2',
      '4:3': 'classic_4_3'
    };
    
    return ratioMap[ratio || '1:1'] || 'square_1_1';
  }

  /**
   * Генерация изображения через Freepik AI
   */
  async generateImage(request: FreepikImageRequest): Promise<FreepikResponse> {
    try {
      // Проверяем API ключ
      if (!this.apiKey) {
        logger.error('Freepik API key is not set');
        return {
          success: false,
          error: 'Freepik API key is not configured'
        };
      }

      const model = request.model || 'seedream';
      const modelConfig = FREEPIK_IMAGE_MODELS[model];
      
      // Улучшаем промпт если включено
      let finalPrompt = request.prompt;
      let promptEnhancement = null;
      
      // КРИТИЧНО: enhancePrompt должно быть явно true, чтобы улучшать промпт
      // Если undefined или false - НЕ улучшаем (для русских промптов)
      if (request.enhancePrompt === true) {
        console.log('==================== PROMPT ENHANCEMENT START ====================');
        console.log('Original Prompt:', request.prompt);
        console.log('Enhancement Options:', {
          style: request.promptStyle || 'photographic',
          quality: request.promptQuality || 'high'
        });
        console.log('===============================================================');
        
        try {
          promptEnhancement = await this.promptEnhancer.enhancePrompt(request.prompt, {
            style: request.promptStyle || 'photographic',
            quality: request.promptQuality || 'high',
            language: 'ru',
            model: model // Передаем модель для адаптации
          });
          finalPrompt = promptEnhancement.enhanced;
          
          console.log('==================== PROMPT ENHANCED ====================');
          console.log('Original:', promptEnhancement.original);
          console.log('Enhanced:', promptEnhancement.enhanced);
          console.log('Improvements:', promptEnhancement.improvements);
          console.log('===============================================================');
        } catch (error) {
          console.log('==================== PROMPT ENHANCEMENT FAILED ====================');
          console.log('Error:', error);
          console.log('Using original prompt');
          console.log('===============================================================');
        }
      }

      logger.info('🔥 FREEPIK GENERATION START:', { 
        originalPrompt: request.prompt.substring(0, 50),
        finalPrompt: finalPrompt.substring(0, 50),
        model: request.model,
        aspect_ratio: request.aspect_ratio,
        promptEnhanced: !!promptEnhancement,
        timestamp: new Date().toISOString()
      });
      
      logger.info('🔍 Freepik model lookup:', { 
        requestedModel: model,
        availableModels: Object.keys(FREEPIK_IMAGE_MODELS),
        modelConfig: modelConfig ? 'found' : 'not found',
        modelEndpoint: modelConfig?.endpoint,
        modelName: modelConfig?.name
      });
      
      if (!modelConfig) {
        console.log('MODEL CONFIG IS UNDEFINED!');
        console.log('Trying to find model:', model);
        console.log('Available models:', Object.keys(FREEPIK_IMAGE_MODELS));
        
        logger.error('Unknown Freepik model:', { 
          requestedModel: model,
          availableModels: Object.keys(FREEPIK_IMAGE_MODELS)
        });
        return {
          success: false,
          error: `Unknown model: ${model}. Available models: ${Object.keys(FREEPIK_IMAGE_MODELS).join(', ')}`
        };
      }
      
      logger.info('Freepik image generation started:', { 
        prompt: request.prompt,
        model: modelConfig.name,
        endpoint: `${this.baseUrl}${modelConfig.endpoint}`,
        apiKeyPresent: !!this.apiKey
      });

      // Создаем базовый запрос согласно официальной документации Freepik API
      const baseRequestData: any = {
        prompt: finalPrompt, // Используем улучшенный промпт
        aspect_ratio: this.convertAspectRatio(request.aspect_ratio)
      };
      
      logger.info('Freepik API request prepared:', {
        prompt: request.prompt.substring(0, 50),
        aspect_ratio: baseRequestData.aspect_ratio,
        model: modelConfig.name
      });

      // Только официальный заголовок из документации
      const headerVariations = [
        { 'x-freepik-api-key': this.apiKey, 'Content-Type': 'application/json' },  // Официальный заголовок
      ];

      // Используем только базовый endpoint (модель передается параметром)
      const endpointsToTest = [modelConfig.endpoint];
      
      // Попробуем разные комбинации базовых URL, endpoints и заголовков
      let attemptCount = 0;
      const totalAttempts = this.alternativeBaseUrls.length * endpointsToTest.length * headerVariations.length;
      
      logger.info(`Starting Freepik API testing for ${modelConfig.name}: ${totalAttempts} total combinations to test`);
      logger.info(`Model-specific endpoints: ${modelConfig.endpoint}, fallback: ${modelConfig.fallbackEndpoint}`);
      
      for (const baseUrl of this.alternativeBaseUrls) {
        for (const endpoint of endpointsToTest) {
          for (const headers of headerVariations) {
            attemptCount++;
            
            const url = `${baseUrl}${endpoint}`;
            
            logger.info(`🚀 FREEPIK ATTEMPT ${attemptCount}/${totalAttempts}:`, {
              url,
              headers: Object.keys(headers),
              model: modelConfig.name,
              endpoint: endpoint
            });
            
            // Условно добавляем параметр model только если модель это требует
            const requestData: any = { ...baseRequestData };
            
            // Добавляем model только если requiresModelParam === true (например, для Mystic)
            if (modelConfig.requiresModelParam && modelConfig.model) {
              requestData.model = modelConfig.model;
              logger.info(`📝 Added model param to request:`, { model: modelConfig.model });
            }
            
            try {
              
              logger.info(`Testing Freepik endpoint (${attemptCount}/${totalAttempts}): ${url}`);
              
              logger.info('Testing Freepik endpoint:', {
                attempt: `${attemptCount}/${totalAttempts}`,
                url,
                baseUrl,
                endpoint,
                data: requestData,
                headers: {
                  ...headers,
                  // Скрываем API ключ в логах
                  [Object.keys(headers)[0]]: Object.values(headers)[0].toString().substring(0, 8) + '...'
                }
              });

              const response = await axios.post(url, requestData, {
                headers,
                timeout: 30000 // 30 секунд для тестирования
              });

              // КРИТИЧЕСКИ ВАЖНОЕ логирование через console.log (гарантированно видно)
              console.log('==================== FREEPIK API SUCCESS ====================');
              console.log('URL:', url);
              console.log('Request Body:', JSON.stringify(requestData, null, 2));
              console.log('Request Headers:', headers);
              console.log('Response Status:', response.status);
              console.log('Response Data:', JSON.stringify(response.data, null, 2));
              console.log('Response Headers:', response.headers);
              console.log('=============================================================');

              // Простое логирование для отладки
              logger.info(`🔥 FREEPIK SUCCESS: ${baseUrl}${endpoint} | Status: ${response.status} | Headers: ${Object.keys(headers).join(',')}`);
              
              // Детальное логирование
              logger.info('🔥 Freepik endpoint success:', { 
                baseUrl, 
                endpoint, 
                headers: Object.keys(headers),
                status: response.status,
                responseData: response.data,
                responseDataType: typeof response.data,
                hasImages: !!response.data?.images,
                imagesLength: response.data?.images?.length
              });
              
              // Если успешно, обрабатываем ответ
              const processedResponse = await this.processFreepikResponse(response, promptEnhancement);
              
              console.log('==================== PROCESSED RESPONSE ====================');
              console.log('Processed Response:', JSON.stringify(processedResponse, null, 2));
              console.log('===========================================================');
              
              return processedResponse;
              
            } catch (error: any) {
              // Простое логирование для отладки
              logger.warn(`Freepik failed: ${baseUrl}${endpoint} | Status: ${error.response?.status || 'NO_STATUS'} | Message: ${error.message}`);
              
              // КРИТИЧЕСКИ ВАЖНОЕ логирование через console.log (гарантированно видно)
              console.log('==================== FREEPIK API ERROR ====================');
              console.log('URL:', `${baseUrl}${endpoint}`);
              console.log('Request Body:', JSON.stringify(requestData, null, 2));
              console.log('Request Headers:', headers);
              console.log('Response Status:', error.response?.status);
              console.log('Response Status Text:', error.response?.statusText);
              console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
              console.log('Response Headers:', error.response?.headers);
              console.log('Error Message:', error.message);
              console.log('=========================================================');
              
              // Продолжаем с следующим вариантом
              continue;
            }
          }
        }
      }

      // Если все endpoints не сработали, выбрасываем ошибку
      throw new Error('All Freepik endpoints failed');

    } catch (error: any) {
      logger.error('Freepik image generation error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        },
        fullError: error
      });
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Обработка ответа от Freepik API
   */
  private async processFreepikResponse(response: any, promptEnhancement?: any): Promise<FreepikResponse> {
    console.log('==================== PROCESS FREEPIK RESPONSE START ====================');
    console.log('Raw Response Data:', JSON.stringify(response.data, null, 2));
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    console.log('===============================================================');
    
    logger.info('🔥 PROCESS FREEPIK RESPONSE:', JSON.stringify(response.data, null, 2));

    // Обрабатываем ответ в зависимости от структуры
    let taskId = response.data.data?.task_id || response.data.task_id || response.data.id;
    let images = response.data.data?.generated || response.data.generated || response.data.images;
    let status = response.data.data?.status || response.data.status;
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если статус CREATED и generated пустой, но есть images в data - используем images!
    if (status === 'CREATED' && (!images || images.length === 0)) {
      images = response.data.data?.images || response.data.images;
      if (images && images.length > 0) {
        status = 'COMPLETED'; // Обновляем статус
        console.log('🔥 FIXED: Found images in data.images, updating status to COMPLETED');
      }
    }

    console.log('==================== PARSED FREEPIK RESPONSE ====================');
    console.log('Task ID:', taskId);
    console.log('Status:', status);
    console.log('Images:', images);
    console.log('Images Type:', typeof images);
    console.log('Images Is Array:', Array.isArray(images));
    console.log('Images Length:', images?.length);
    console.log('===============================================================');

    logger.info('🔥 Parsed Freepik response:', {
      taskId,
      status,
      images,
      imagesType: typeof images,
      imagesIsArray: Array.isArray(images),
      imagesLength: images?.length
    });

    // Если изображения уже готовы - возвращаем сразу
    if (images && images.length > 0) {
      console.log('==================== IMAGES READY IMMEDIATELY ====================');
      console.log('Images Count:', images.length);
      console.log('Images:', images);
      console.log('===============================================================');
      
      logger.info('🔥 Freepik images ready immediately:', { count: images.length, images });
      
      // Обрабатываем разные структуры images
      const processedImages = images.map((item: any, index: number) => {
        let url: string | null = null;
        
        console.log(`==================== PROCESSING IMAGE ${index + 1} ====================`);
        console.log('Image Item:', item);
        console.log('Image Type:', typeof item);
        console.log('===============================================================');
        
        // Если это объект с полем url
        if (typeof item === 'object' && item.url) {
          logger.info(`🔥 Image item ${index + 1} is object with url:`, item);
          url = item.url;
        }
        // Если это просто строка URL
        else if (typeof item === 'string') {
          logger.info('Image item is string URL:', item);
          url = item;
        }
        // Если это объект, но без url - проверим другие поля
        else if (typeof item === 'object') {
          logger.warn('Image item is object WITHOUT url field:', item);
          // Ищем любое поле, которое выглядит как URL
          for (const [key, value] of Object.entries(item)) {
            if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
              logger.info(`Found URL in field "${key}":`, value);
              url = value;
              break;
            }
          }
        }
        
        // Неизвестный формат
        if (!url) {
          logger.warn('Unknown image format, no URL found:', item);
          return null;
        }
        
        // Обработка относительных URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          // Если это относительный URL, добавляем базовый домен
          if (url.startsWith('/')) {
            logger.warn('Found relative URL, converting to absolute:', url);
            url = `https://api.freepik.com${url}`;
          }
          // Если это URL без протокола (начинается с домена)
          else if (url.includes('.')) {
            logger.warn('Found URL without protocol, adding https:', url);
            url = `https://${url}`;
          }
          // Иначе это точно не URL
          else {
            logger.error('Invalid URL (not a valid format):', url);
            return null;
          }
        }
        
        logger.info('Final validated URL:', url);
        return { url, id: item.id || Math.random().toString() };
      }).filter(Boolean);
      
      logger.info('Processed images:', processedImages);
      
      return {
        success: true,
        data: {
          id: taskId,
          status: 'completed',
          images: processedImages,
          // Добавляем информацию об улучшении промпта
          promptEnhancement: promptEnhancement ? {
            original: promptEnhancement.original,
            enhanced: promptEnhancement.enhanced,
            improvements: promptEnhancement.improvements,
            style: promptEnhancement.style,
            quality: promptEnhancement.quality
          } : null
        }
      };
    }

    // Если задача создана, но изображения не готовы - опрашиваем статус
    if (taskId && status === 'CREATED') {
      logger.info('Freepik task created, polling for results:', { taskId });
      
      // Опрашиваем статус каждые 2 секунды, максимум 30 секунд
      const maxAttempts = 15;
      const pollInterval = 2000;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        try {
          // Получаем endpoint из исходного URL
          const endpoint = response.config.url.replace(this.baseUrl, '');
          
          logger.info(`Polling Freepik task status (${attempt + 1}/${maxAttempts}):`, { taskId, endpoint });
          
          const statusResponse = await axios.get(
            `${this.baseUrl}${endpoint}/${taskId}`,
            {
              headers: {
                'x-freepik-api-key': this.apiKey
              }
            }
          );
          
          const taskStatus = statusResponse.data.data?.status || statusResponse.data.status;
          const taskImages = statusResponse.data.data?.generated || statusResponse.data.generated || statusResponse.data.images;
          
          logger.info('Freepik task status:', { taskId, status: taskStatus, imagesReady: !!taskImages?.length });
          
          if (taskStatus === 'COMPLETED' && taskImages && taskImages.length > 0) {
            logger.info('Freepik task completed successfully:', { taskId, imageCount: taskImages.length });
            
            // Обрабатываем разные структуры generated
            const images = taskImages.map((item: any) => {
              let url: string | null = null;
              
              // Структурированное логирование с Pino
              logger.info({ 
                message: 'Polling: Processing image item',
                itemJson: JSON.stringify(item),
                itemType: typeof item,
                itemValue: item
              });
              
              // Если это объект с полем url
              if (typeof item === 'object' && item.url) {
                logger.info({ message: 'Polling: Found url field', urlValue: item.url });
                url = item.url;
              }
              // Если это просто строка URL
              else if (typeof item === 'string') {
                logger.info({ 
                  message: 'Polling: Item is string',
                  stringValue: item,
                  stringLength: item.length,
                  first100chars: item.substring(0, 100)
                });
                url = item;
              }
              // Если это объект, но без url - проверим другие поля
              else if (typeof item === 'object') {
                logger.warn('Polling: Image item is object WITHOUT url field:', JSON.stringify(item));
                // Ищем любое поле, которое выглядит как URL или путь к файлу
                for (const [key, value] of Object.entries(item)) {
                  if (typeof value === 'string') {
                    logger.info(`Polling: Checking field "${key}":`, value);
                    // Проверяем на http/https URL
                    if (value.startsWith('http://') || value.startsWith('https://')) {
                      logger.info(`Polling: Found URL in field "${key}":`, value);
                      url = value;
                      break;
                    }
                    // Проверяем на относительный путь или домен
                    if (value.startsWith('/') || value.includes('.')) {
                      logger.info(`Polling: Found potential URL/path in field "${key}":`, value);
                      url = value;
                      break;
                    }
                  }
                }
              }
              
              // Неизвестный формат
              if (!url) {
                logger.warn('Polling: Unknown image format, no URL found:', JSON.stringify(item));
                return null;
              }
              
              logger.info({ 
                message: 'Polling: Before validation',
                urlValue: url,
                urlType: typeof url,
                urlLength: url?.length
              });
              
              // Обработка относительных URL
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                // Если это относительный URL, добавляем базовый домен
                if (url.startsWith('/')) {
                  logger.warn('Polling: Found relative URL, converting to absolute:', url);
                  url = `https://api.freepik.com${url}`;
                }
                // Если это URL без протокола (начинается с домена)
                else if (url.includes('.')) {
                  logger.warn('Polling: Found URL without protocol, adding https:', url);
                  url = `https://${url}`;
                }
                // Иначе это точно не URL
                else {
                  logger.error('Polling: Invalid URL (not a valid format):', url);
                  return null;
                }
              }
              
              logger.info('Polling: Final validated URL:', url);
              return { url, id: item.id || Math.random().toString() };
            }).filter(Boolean);
            
            logger.info('Processed images:', { images });
            
            return {
              success: true,
              data: {
                id: taskId,
                status: 'completed',
                images
              }
            };
          }
          
          if (taskStatus === 'FAILED') {
            logger.error('Freepik task failed:', { taskId });
            return {
              success: false,
              error: 'Task generation failed'
            };
          }
          
        } catch (pollError: any) {
          logger.warn('Freepik polling error:', { taskId, attempt: attempt + 1, error: pollError.message });
        }
      }
      
      // Если не дождались результата - возвращаем task_id для последующей проверки
      logger.warn('Freepik task polling timeout, returning task_id:', { taskId });
      return {
        success: true,
        data: {
          id: taskId,
          status: 'processing',
          images: []
        }
      };
    }

    // Дефолтный возврат
    return {
      success: true,
      data: {
        id: taskId,
        status: 'processing',
        images: []
      }
    };
  }

  /**
   * Генерация видео из изображения через Freepik API
   */
  async generateVideoFromImage(imageUrl: string, prompt?: string, model: keyof typeof FREEPIK_VIDEO_MODELS = 'kling_v2_5_pro', duration?: number): Promise<FreepikResponse> {
    try {
      console.log('🎬 generateVideoFromImage called with:', { model, imageUrl: imageUrl.substring(0, 50), prompt });
      
      const modelConfig = FREEPIK_VIDEO_MODELS[model];
      
      if (!modelConfig) {
        console.error('❌ Unknown video model:', model);
        throw new Error(`Unknown video model: ${model}`);
      }
      
      console.log('🎬 Model config found:', { 
        name: modelConfig.name, 
        endpoint: modelConfig.endpoint,
        baseUrl: this.baseUrl 
      });
      
      logger.info('🎬 Freepik image-to-video generation started:', { 
        imageUrl: imageUrl.substring(0, 50) + '...',
        prompt: prompt?.substring(0, 100),
        model: modelConfig.name,
        modelId: model,
        endpoint: modelConfig.endpoint,
        baseUrl: this.baseUrl,
        duration
      });

      const requestData: any = {};
      
      // Добавляем webhook только если BACKEND_URL настроен
      let backendUrl = process.env.BACKEND_URL || 
                       process.env.RAILWAY_PUBLIC_DOMAIN || 
                       process.env.RAILWAY_STATIC_URL ||
                       'https://aicexaibot-production.up.railway.app';
      
      // Добавляем https:// если отсутствует
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
                         
      console.log('🔗 Backend URL for webhook:', backendUrl);
      
      if (backendUrl && backendUrl !== 'undefined' && backendUrl !== 'https://undefined') {
        requestData.webhook_url = `${backendUrl}/api/webhooks/freepik`;
        console.log('✅ Webhook URL set:', requestData.webhook_url);
      } else {
        console.log('⚠️ No webhook URL - will use polling mode');
      }

      // Обработка специфичных полей для разных моделей
      switch (model) {
        // MiniMax модели требуют prompt и first_frame_image
        case 'minimax_hailuo_768p':
        case 'minimax_hailuo_1080p':
          requestData.prompt = prompt || 'Create a cinematic video';
          requestData.first_frame_image = imageUrl;
          // Отключаем prompt_optimizer для русских промптов
          const isRussianPrompt = /[а-яё]/i.test(prompt || '');
          if (!isRussianPrompt) {
            requestData.prompt_optimizer = true;
          }
          // MiniMax 1080p поддерживает только 6 секунд
          if (model === 'minimax_hailuo_1080p') {
            requestData.duration = 6;
          } else {
            requestData.duration = duration && [6, 10].includes(duration) ? duration : 6;
          }
          break;

        // PixVerse V5 требует prompt и image_url
        case 'pixverse_v5':
          requestData.prompt = prompt || 'Create a cinematic video';
          requestData.image_url = imageUrl;
          requestData.resolution = '1080p';
          requestData.duration = duration && [5, 8].includes(duration) ? duration : 5;
          break;

        // PixVerse V5 Transition требует start_image_url и end_image_url
        case 'pixverse_v5_transition':
          requestData.start_image_url = imageUrl;
          requestData.end_image_url = imageUrl; // Можно добавить второе изображение позже
          if (prompt) requestData.prompt = prompt;
          requestData.duration = duration && [5, 8].includes(duration) ? duration : 5;
          break;

        // Kling Elements требуют массив images
        case 'kling_elements_pro_1_6':
        case 'kling_elements_std_1_6':
          requestData.images = [imageUrl];
          if (prompt) requestData.prompt = prompt;
          requestData.duration = duration && [5, 10].includes(duration) ? String(duration) : "5";
          requestData.aspect_ratio = 'widescreen_16_9';
          break;

        // Все остальные Kling модели используют image
        case 'kling_v2_5_pro':
          requestData.image = imageUrl;
          if (prompt) requestData.prompt = prompt;
          requestData.cfg_scale = 0.5;
          // Kling v2.5 Pro поддерживает только 5s и 10s
          requestData.duration = duration && [5, 10].includes(duration) ? String(duration) : "5";
          break;

        default:
          // Для всех остальных моделей (Kling Pro/Std 1.6, 2.1, v2, Seedance, Wan)
          requestData.image = imageUrl;
          if (prompt) requestData.prompt = prompt;
          
          // Добавляем cfg_scale для Kling моделей
          if (model.includes('kling')) {
            requestData.cfg_scale = 0.5;
          }
          
          // Обрабатываем duration
          if (modelConfig.supportedDurations) {
            const validDuration = duration && modelConfig.supportedDurations.includes(duration) 
              ? duration 
              : modelConfig.supportedDurations[0];
            requestData.duration = String(validDuration);
          }
          break;
      }

      const fullUrl = `${this.baseUrl}${modelConfig.endpoint}`;
      
      console.log('🎬 Request data:', { 
        model, 
        endpoint: modelConfig.endpoint,
        fullUrl,
        requestData 
      });
      
      logger.info('🎬 Request data:', { 
        model, 
        endpoint: modelConfig.endpoint,
        fullUrl,
        requestData: { ...requestData, image: requestData.image?.substring(0, 50) + '...' } 
      });

      const response = await axios.post(
        fullUrl,
        requestData,
        {
          headers: {
            'x-freepik-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 минут
        }
      );

      console.log('🎬 Freepik image-to-video FULL response:', JSON.stringify(response.data, null, 2));
      console.log('🎬 Response headers:', JSON.stringify(response.headers, null, 2));
      
      logger.info('🎬 Freepik image-to-video response:', {
        status: response.status,
        taskId: response.data.data?.task_id,
        taskStatus: response.data.data?.status,
        selfUrl: response.data.data?.self,
        webhookUrl: response.data.data?.webhook_url,
        data: response.data
      });

      return {
        success: true,
        data: {
          id: response.data.data?.task_id,
          status: 'processing',
          videos: response.data.data?.generated?.map((url: string) => ({ url, id: Math.random().toString() }))
        }
      };

    } catch (error: any) {
      console.error('🎬 Freepik image-to-video error:', {
        model,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        invalidParams: error.response?.data?.invalid_params,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
        requestBody: error.config?.data
      });
      
      logger.error('🎬 Freepik image-to-video error:', {
        model,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      
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
      supportedDurations: model.supportedDurations || [],
      resolution: model.resolution
    }));
  }

  /**
   * Проверка статуса задачи (универсальный метод)
   */
  async checkTaskStatus(taskId: string, type: 'image' | 'video' = 'image', model?: string): Promise<FreepikResponse> {
    try {
      // Для изображений используем Mystic endpoint по умолчанию
      let endpoint = `/ai/mystic/${taskId}`;
      
      // Для видео endpoint для проверки статуса: GET /{model}/{task-id}
      // БЕЗ /ai/image-to-video/ префикса!
      if (type === 'video' && model) {
        const modelConfig = FREEPIK_VIDEO_MODELS[model as keyof typeof FREEPIK_VIDEO_MODELS];
        if (modelConfig) {
          // Извлекаем название модели (последняя часть endpoint)
          const modelName = modelConfig.endpoint.split('/').pop();
          endpoint = `/${modelName}/${taskId}`;
        } else {
          endpoint = `/kling-v2-1-std/${taskId}`;
        }
      } else if (type === 'video') {
        endpoint = `/kling-v2-1-std/${taskId}`;
      }

      const fullUrl = `${this.baseUrl}${endpoint}`;
      
      console.log('🔍 Checking task status:', {
        taskId,
        type,
        model,
        endpoint,
        fullUrl
      });

      const response = await axios.get(
        fullUrl,
        {
          headers: {
            'x-freepik-api-key': this.apiKey
          }
        }
      );

      console.log('🔍 Task status response:', {
        taskId,
        status: response.status,
        data: response.data
      });

      const status = response.data.data?.status;
      const generated = response.data.data?.generated;
      
      console.log('🔍 Parsed status:', {
        status,
        generatedLength: generated?.length,
        generated
      });
      
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
      console.error('🔍 Task status check ERROR:', {
        taskId,
        type,
        model,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      
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
      return 'Invalid API key - проверьте FREEPIK_API_KEY';
    }
    
    if (error.response?.status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }
    
    if (error.response?.status === 400) {
      return `Invalid request parameters: ${JSON.stringify(error.response?.data)}`;
    }
    
    if (error.response?.status === 403) {
      return 'API access forbidden - проверьте права доступа';
    }
    
    if (error.response?.status === 404) {
      return 'API endpoint not found';
    }
    
    if (error.response?.status >= 500) {
      return 'Server error on Freepik side';
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
