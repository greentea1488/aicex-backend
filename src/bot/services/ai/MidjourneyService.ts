import axios from 'axios';

export interface MidjourneyGenerationRequest {
  prompt: string;
  version?: '5.0' | '5.1' | '5.2' | '6.0' | '6.1' | '7.0';
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  quality?: 'low' | 'medium' | 'high';
  style?: 'photorealistic' | 'artistic' | 'anime' | 'cartoon';
  callback_url?: string;
}

export interface MidjourneyGenerationResponse {
  success: boolean;
  task_id?: string;
  image_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  cost?: number;
}

export interface MidjourneyTaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url?: string;
  error?: string;
  progress?: number;
}

export class MidjourneyService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GEN_API_KEY || '';
    this.baseUrl = 'https://api.gen-api.ru';
    
    if (!this.apiKey) {
      console.warn('⚠️ GEN_API_KEY not found - Midjourney service will be disabled');
    }
  }

  /**
   * Генерирует изображение с помощью Midjourney
   */
  async generateImage(request: MidjourneyGenerationRequest): Promise<MidjourneyGenerationResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        status: 'failed',
        error: 'GEN_API_KEY не настроен. Обратитесь к администратору.'
      };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/generate`, {
        model: 'midjourney',
        prompt: request.prompt,
        version: request.version || '7.0',
        aspect_ratio: request.aspect_ratio || '1:1',
        quality: request.quality || 'high',
        style: request.style || 'photorealistic',
        callback_url: request.callback_url
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 секунд таймаут
      });

      return {
        success: true,
        task_id: response.data.task_id,
        image_url: response.data.image_url,
        status: response.data.status || 'completed',
        cost: this.calculateCost(request.version || '7.0')
      };

    } catch (error: any) {
      console.error('Midjourney API Error:', error.response?.data || error.message);
      
      return {
        success: false,
        status: 'failed',
        error: error.response?.data?.message || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Проверяет статус задачи
   */
  async getTaskStatus(taskId: string): Promise<MidjourneyTaskStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        task_id: taskId,
        status: response.data.status,
        image_url: response.data.image_url,
        error: response.data.error,
        progress: response.data.progress
      };

    } catch (error: any) {
      console.error('Midjourney Status Check Error:', error.response?.data || error.message);
      
      return {
        task_id: taskId,
        status: 'failed',
        error: error.response?.data?.message || error.message || 'Status check failed'
      };
    }
  }

  /**
   * Получает историю генераций пользователя
   */
  async getHistory(limit: number = 10): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/history`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          limit
        }
      });

      return response.data.history || [];

    } catch (error: any) {
      console.error('Midjourney History Error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Рассчитывает стоимость генерации
   */
  private calculateCost(version: string): number {
    const versionNumber = parseFloat(version);
    
    if (versionNumber >= 7.0) {
      return 8; // 8₽ за версию 7.*
    } else {
      return 7; // 7₽ за версии 5.* и 6.*
    }
  }

  /**
   * Получает доступные модели
   */
  getAvailableModels(): Array<{id: string, name: string, cost: number}> {
    return [
      { id: '5.0', name: 'Midjourney 5.0', cost: 7 },
      { id: '5.1', name: 'Midjourney 5.1', cost: 7 },
      { id: '5.2', name: 'Midjourney 5.2', cost: 7 },
      { id: '6.0', name: 'Midjourney 6.0', cost: 7 },
      { id: '6.1', name: 'Midjourney 6.1', cost: 7 },
      { id: '7.0', name: 'Midjourney 7.0', cost: 8 }
    ];
  }

  /**
   * Получает доступные стили
   */
  getAvailableStyles(): Array<{id: string, name: string, description: string}> {
    return [
      { id: 'photorealistic', name: 'Фотореалистичный', description: 'Максимально реалистичные изображения' },
      { id: 'artistic', name: 'Художественный', description: 'Творческий и выразительный стиль' },
      { id: 'anime', name: 'Аниме', description: 'Японский анимационный стиль' },
      { id: 'cartoon', name: 'Мультяшный', description: 'Детский и игривый стиль' }
    ];
  }

  /**
   * Получает доступные соотношения сторон
   */
  getAvailableAspectRatios(): Array<{id: string, name: string, description: string}> {
    return [
      { id: '1:1', name: 'Квадрат (1:1)', description: 'Идеально для Instagram' },
      { id: '16:9', name: 'Широкоэкранный (16:9)', description: 'Для видео и презентаций' },
      { id: '9:16', name: 'Вертикальный (9:16)', description: 'Для Stories и мобильных' },
      { id: '4:3', name: 'Классический (4:3)', description: 'Традиционный формат' },
      { id: '3:4', name: 'Портретный (3:4)', description: 'Для портретов' }
    ];
  }

  /**
   * Получает доступные уровни качества
   */
  getAvailableQuality(): Array<{id: string, name: string, description: string}> {
    return [
      { id: 'low', name: 'Быстро', description: 'Быстрая генерация, экономично' },
      { id: 'medium', name: 'Сбалансированно', description: 'Оптимальное соотношение' },
      { id: 'high', name: 'Максимальное', description: 'Лучшее качество' }
    ];
  }

  /**
   * Валидирует промпт
   */
  validatePrompt(prompt: string): { valid: boolean; error?: string } {
    if (!prompt || prompt.trim().length === 0) {
      return { valid: false, error: 'Промпт не может быть пустым' };
    }

    if (prompt.length > 1000) {
      return { valid: false, error: 'Промпт слишком длинный (максимум 1000 символов)' };
    }

    // Проверка на запрещенные слова
    const forbiddenWords = ['nsfw', 'adult', 'explicit', 'nude', 'naked'];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const word of forbiddenWords) {
      if (lowerPrompt.includes(word)) {
        return { valid: false, error: 'Промпт содержит запрещенный контент' };
      }
    }

    return { valid: true };
  }

  /**
   * Форматирует промпт для лучших результатов
   */
  formatPrompt(prompt: string, style?: string): string {
    let formattedPrompt = prompt.trim();

    // Добавляем стилевые модификаторы
    if (style === 'photorealistic') {
      formattedPrompt += ', photorealistic, high quality, detailed';
    } else if (style === 'artistic') {
      formattedPrompt += ', artistic, creative, expressive';
    } else if (style === 'anime') {
      formattedPrompt += ', anime style, manga, japanese art';
    } else if (style === 'cartoon') {
      formattedPrompt += ', cartoon style, colorful, fun';
    }

    return formattedPrompt;
  }
}