/**
 * Улучшенная система обработки ошибок
 * Исправляет проблемы с undefined, Not found и другими ошибками
 */

import { logger } from './logger';

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export type APIResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Безопасная обработка ошибок API
 */
export class ErrorHandler {
  /**
   * Обработка ошибок Freepik API
   */
  static handleFreepikError(error: any): ErrorResponse {
    logger.error('Freepik API Error:', error);

    // Проверка на undefined response
    if (!error.response) {
      return {
        success: false,
        error: 'Сетевая ошибка: нет ответа от сервера',
        code: 'NETWORK_ERROR'
      };
    }

    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 401:
        return {
          success: false,
          error: 'Неверный API ключ Freepik',
          code: 'UNAUTHORIZED'
        };
      
      case 404:
        return {
          success: false,
          error: 'Endpoint не найден. Возможно модель недоступна',
          code: 'NOT_FOUND'
        };
      
      case 429:
        return {
          success: false,
          error: 'Превышен лимит запросов. Попробуйте позже',
          code: 'RATE_LIMIT'
        };
      
      case 402:
        return {
          success: false,
          error: 'Недостаточно кредитов на аккаунте',
          code: 'INSUFFICIENT_CREDITS'
        };
      
      case 400:
        const message = data?.message || data?.error || 'Неверные параметры запроса';
        return {
          success: false,
          error: `Ошибка валидации: ${message}`,
          code: 'VALIDATION_ERROR',
          details: data
        };
      
      default:
        return {
          success: false,
          error: data?.message || error.message || 'Неизвестная ошибка Freepik API',
          code: 'UNKNOWN_ERROR',
          details: { status, data }
        };
    }
  }

  /**
   * Обработка ошибок Runway API
   */
  static handleRunwayError(error: any): ErrorResponse {
    logger.error('Runway API Error:', error);

    if (!error.response) {
      return {
        success: false,
        error: 'Сетевая ошибка: нет подключения к Runway',
        code: 'NETWORK_ERROR'
      };
    }

    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 401:
        return {
          success: false,
          error: 'Неверный API ключ Runway ML',
          code: 'UNAUTHORIZED'
        };
      
      case 404:
        return {
          success: false,
          error: 'Runway endpoint не найден',
          code: 'NOT_FOUND'
        };
      
      case 429:
        return {
          success: false,
          error: 'Превышен лимит Runway API',
          code: 'RATE_LIMIT'
        };
      
      case 402:
        return {
          success: false,
          error: 'Недостаточно кредитов Runway',
          code: 'INSUFFICIENT_CREDITS'
        };
      
      case 503:
        return {
          success: false,
          error: 'Сервис Runway временно недоступен',
          code: 'SERVICE_UNAVAILABLE'
        };
      
      default:
        return {
          success: false,
          error: data?.message || error.message || 'Ошибка Runway API',
          code: 'UNKNOWN_ERROR',
          details: { status, data }
        };
    }
  }

  /**
   * Безопасное извлечение данных из ответа API
   */
  static safeExtract<T>(obj: any, path: string, defaultValue: T): T {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current === null || current === undefined) {
          return defaultValue;
        }
        current = current[key];
      }
      
      return current !== undefined ? current : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Проверка валидности URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Безопасная обрезка строки
   */
  static safeTruncate(str: string | undefined, maxLength: number): string {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  /**
   * Форматирование ошибки для пользователя
   */
  static formatUserError(error: ErrorResponse): string {
    const errorMessages: { [key: string]: string } = {
      'UNAUTHORIZED': '🔑 Проблема с авторизацией API',
      'NOT_FOUND': '🔍 Сервис или модель не найдены',
      'RATE_LIMIT': '⏳ Превышен лимит запросов',
      'INSUFFICIENT_CREDITS': '💳 Недостаточно кредитов',
      'NETWORK_ERROR': '🌐 Проблема с сетью',
      'VALIDATION_ERROR': '❌ Ошибка в параметрах',
      'SERVICE_UNAVAILABLE': '🔧 Сервис временно недоступен'
    };

    const icon = errorMessages[error.code || ''] || '❌';
    return `${icon} ${error.error}`;
  }
}

/**
 * Декоратор для безопасного выполнения асинхронных функций
 */
export function safeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<APIResponse<R>> {
  return async (...args: T): Promise<APIResponse<R>> => {
    try {
      const result = await fn(...args);
      return { success: true, data: result };
    } catch (error: any) {
      logger.error('Safe async error:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка',
        code: 'ASYNC_ERROR'
      };
    }
  };
}

/**
 * Retry механизм для API запросов
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`Retry attempt ${i + 1}/${maxRetries} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}
