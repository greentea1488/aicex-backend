/**
 * Базовый класс для всех AI сервисов
 * Обеспечивает единообразие интерфейсов и обработки ошибок
 */

import { logger } from '../../utils/logger';
import { ErrorHandler, APIResponse } from '../../utils/errorHandler';

export interface AIServiceConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface GenerationRequest {
  prompt: string;
  model?: string;
  [key: string]: any;
}

export interface GenerationResponse {
  success: boolean;
  data?: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: {
      type: 'image' | 'video' | 'text';
      url?: string;
      urls?: string[];
      content?: string;
    };
    metadata?: any;
  };
  error?: string;
  tokensUsed?: number;
}

export abstract class BaseAIService {
  protected config: AIServiceConfig;
  protected serviceName: string;

  constructor(config: AIServiceConfig, serviceName: string) {
    this.validateConfig(config);
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
    this.serviceName = serviceName;
    
    logger.info(`${this.serviceName} service initialized`, {
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey
    });
  }

  /**
   * Валидация конфигурации сервиса
   */
  private validateConfig(config: AIServiceConfig): void {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error(`${this.serviceName}: API key is required`);
    }
    
    if (!config.baseUrl || config.baseUrl.trim() === '') {
      throw new Error(`${this.serviceName}: Base URL is required`);
    }

    try {
      new URL(config.baseUrl);
    } catch {
      throw new Error(`${this.serviceName}: Invalid base URL format`);
    }
  }

  /**
   * Валидация запроса
   */
  protected validateRequest(request: GenerationRequest): void {
    if (!request.prompt || request.prompt.trim() === '') {
      throw new Error('Prompt is required and cannot be empty');
    }

    if (request.prompt.length > 2500) {
      throw new Error('Prompt is too long (max 2500 characters)');
    }

    // Проверка на потенциально вредный контент
    const harmfulPatterns = [
      /\b(violence|gore|nsfw|explicit)\b/i,
      /\b(hack|exploit|malware)\b/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(request.prompt)) {
        throw new Error('Prompt contains potentially harmful content');
      }
    }
  }

  /**
   * Безопасное выполнение HTTP запроса с retry логикой
   */
  protected async safeRequest<T>(
    requestFn: () => Promise<T>,
    context: string
  ): Promise<APIResponse<T>> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        logger.debug(`${this.serviceName} ${context} attempt ${attempt}/${this.config.retryAttempts}`);
        
        const result = await requestFn();
        
        logger.info(`${this.serviceName} ${context} successful`, {
          attempt,
          serviceName: this.serviceName
        });
        
        return { success: true, data: result };
        
      } catch (error: any) {
        lastError = error;
        
        logger.warn(`${this.serviceName} ${context} attempt ${attempt} failed`, {
          error: error.message,
          status: error.response?.status,
          attempt,
          serviceName: this.serviceName
        });
        
        // Не повторяем при критических ошибках
        if (error.response?.status === 401 || error.response?.status === 403) {
          break;
        }
        
        // Ждем перед следующей попыткой
        if (attempt < this.config.retryAttempts!) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error(`${this.serviceName} ${context} failed after all attempts`, {
      error: lastError.message,
      attempts: this.config.retryAttempts,
      serviceName: this.serviceName
    });
    
    return this.handleError(lastError);
  }

  /**
   * Обработка ошибок специфичная для сервиса
   */
  protected abstract handleError(error: any): APIResponse<never>;

  /**
   * Проверка статуса задачи (для асинхронных операций)
   */
  protected abstract checkTaskStatus(taskId: string): Promise<GenerationResponse>;

  /**
   * Основной метод генерации (должен быть реализован в наследниках)
   */
  abstract generate(request: GenerationRequest): Promise<GenerationResponse>;

  /**
   * Получение информации о сервисе
   */
  getServiceInfo(): { name: string; baseUrl: string; status: 'active' | 'inactive' } {
    return {
      name: this.serviceName,
      baseUrl: this.config.baseUrl,
      status: this.config.apiKey ? 'active' : 'inactive'
    };
  }

  /**
   * Проверка здоровья сервиса
   */
  abstract healthCheck(): Promise<boolean>;
}
