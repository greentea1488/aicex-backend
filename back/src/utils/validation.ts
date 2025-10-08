/**
 * Система валидации входных данных
 * Обеспечивает безопасность и корректность данных
 */

import { logger } from './logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

export class InputValidator {
  /**
   * Валидация промпта для AI генерации
   */
  static validatePrompt(prompt: string): ValidationResult {
    const errors: string[] = [];

    // Проверка на пустоту
    if (!prompt || typeof prompt !== 'string') {
      errors.push('Prompt must be a non-empty string');
      return { isValid: false, errors };
    }

    const trimmedPrompt = prompt.trim();
    
    if (trimmedPrompt.length === 0) {
      errors.push('Prompt cannot be empty');
    }

    // Проверка длины
    if (trimmedPrompt.length > 2500) {
      errors.push('Prompt is too long (maximum 2500 characters)');
    }

    if (trimmedPrompt.length < 3) {
      errors.push('Prompt is too short (minimum 3 characters)');
    }

    // Проверка на вредоносный контент
    const harmfulPatterns = [
      { pattern: /\b(violence|gore|blood|kill|murder|death)\b/i, message: 'Contains violent content' },
      { pattern: /\b(nsfw|explicit|sexual|nude|naked)\b/i, message: 'Contains explicit content' },
      { pattern: /\b(hack|exploit|malware|virus|ddos)\b/i, message: 'Contains malicious content' },
      { pattern: /\b(suicide|self-harm|depression)\b/i, message: 'Contains harmful mental health content' },
      { pattern: /<script|javascript:|data:|vbscript:/i, message: 'Contains potentially malicious code' }
    ];

    for (const { pattern, message } of harmfulPatterns) {
      if (pattern.test(trimmedPrompt)) {
        errors.push(message);
      }
    }

    // Проверка на спам паттерны
    const spamPatterns = [
      /(.)\1{10,}/g, // Повторяющиеся символы
      /\b(buy now|click here|free money|earn \$\d+)\b/i, // Спам фразы
      /[A-Z]{20,}/, // Слишком много заглавных букв подряд
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(trimmedPrompt)) {
        errors.push('Prompt appears to be spam or low quality');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? this.sanitizePrompt(trimmedPrompt) : undefined
    };
  }

  /**
   * Валидация URL изображения
   */
  static validateImageUrl(url: string): ValidationResult {
    const errors: string[] = [];

    if (!url || typeof url !== 'string') {
      errors.push('Image URL must be a non-empty string');
      return { isValid: false, errors };
    }

    // Проверка формата URL
    try {
      const parsedUrl = new URL(url);
      
      // Проверка протокола
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push('Image URL must use HTTP or HTTPS protocol');
      }

      // Проверка расширения файла
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const pathname = parsedUrl.pathname.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
      
      if (!hasValidExtension && !pathname.includes('upload') && !pathname.includes('image')) {
        errors.push('URL does not appear to be a valid image');
      }

      // Проверка на подозрительные домены
      const suspiciousDomains = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (suspiciousDomains.includes(parsedUrl.hostname)) {
        errors.push('Local URLs are not allowed');
      }

    } catch {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? url : undefined
    };
  }

  /**
   * Валидация параметров модели
   */
  static validateModelParams(params: any, allowedModels: string[]): ValidationResult {
    const errors: string[] = [];

    if (params.model && !allowedModels.includes(params.model)) {
      errors.push(`Invalid model. Allowed models: ${allowedModels.join(', ')}`);
    }

    if (params.duration) {
      const duration = parseInt(params.duration);
      if (isNaN(duration) || duration < 1 || duration > 30) {
        errors.push('Duration must be between 1 and 30 seconds');
      }
    }

    if (params.cfg_scale !== undefined) {
      const cfgScale = parseFloat(params.cfg_scale);
      if (isNaN(cfgScale) || cfgScale < 0 || cfgScale > 1) {
        errors.push('CFG scale must be between 0 and 1');
      }
    }

    if (params.seed !== undefined) {
      const seed = parseInt(params.seed);
      if (isNaN(seed) || seed < 0 || seed > 2147483647) {
        errors.push('Seed must be a valid integer between 0 and 2147483647');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? params : undefined
    };
  }

  /**
   * Валидация Telegram ID
   */
  static validateTelegramId(telegramId: any): ValidationResult {
    const errors: string[] = [];

    if (telegramId === undefined || telegramId === null) {
      errors.push('Telegram ID is required');
      return { isValid: false, errors };
    }

    const id = parseInt(telegramId);
    if (isNaN(id) || id <= 0 || id > 9999999999) {
      errors.push('Invalid Telegram ID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? id : undefined
    };
  }

  /**
   * Валидация количества токенов
   */
  static validateTokenAmount(amount: any): ValidationResult {
    const errors: string[] = [];

    if (amount === undefined || amount === null) {
      errors.push('Token amount is required');
      return { isValid: false, errors };
    }

    const tokens = parseInt(amount);
    if (isNaN(tokens) || tokens < 0) {
      errors.push('Token amount must be a non-negative integer');
    }

    if (tokens > 1000000) {
      errors.push('Token amount is too large (maximum 1,000,000)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? tokens : undefined
    };
  }

  /**
   * Очистка промпта от потенциально вредных символов
   */
  private static sanitizePrompt(prompt: string): string {
    return prompt
      .replace(/<[^>]*>/g, '') // Удаляем HTML теги
      .replace(/[<>'"&]/g, '') // Удаляем потенциально опасные символы
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .trim();
  }

  /**
   * Валидация всех параметров запроса
   */
  static validateGenerationRequest(request: any): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Валидация промпта
    if (request.prompt) {
      const promptValidation = this.validatePrompt(request.prompt);
      if (!promptValidation.isValid) {
        errors.push(...promptValidation.errors);
      } else {
        sanitizedData.prompt = promptValidation.sanitizedData;
      }
    }

    // Валидация изображения (если есть)
    if (request.image) {
      const imageValidation = this.validateImageUrl(request.image);
      if (!imageValidation.isValid) {
        errors.push(...imageValidation.errors);
      } else {
        sanitizedData.image = imageValidation.sanitizedData;
      }
    }

    // Валидация Telegram ID
    if (request.telegramId !== undefined) {
      const telegramValidation = this.validateTelegramId(request.telegramId);
      if (!telegramValidation.isValid) {
        errors.push(...telegramValidation.errors);
      } else {
        sanitizedData.telegramId = telegramValidation.sanitizedData;
      }
    }

    // Копируем остальные безопасные параметры
    const safeParams = ['model', 'duration', 'cfg_scale', 'seed', 'negative_prompt'];
    for (const param of safeParams) {
      if (request[param] !== undefined) {
        sanitizedData[param] = request[param];
      }
    }

    if (errors.length > 0) {
      logger.warn('Validation failed for generation request', {
        errors,
        originalRequest: { ...request, prompt: request.prompt?.substring(0, 100) }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }
}
