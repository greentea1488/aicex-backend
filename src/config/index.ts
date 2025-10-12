import { AppConfig, RateLimitConfig } from '../types';

/**
 * Валидирует переменные окружения при запуске
 */
function validateEnvironment(): void {
  const required = [
    'BOT_TOKEN',
    'DATABASE_URL',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Предупреждения для опциональных, но важных переменных
  const optional = [
    'OPENAI_API_KEY',
    'FREEPIK_API_KEY',
    'MIDJOURNEY_API_KEY',
    'RUNWAY_API_KEY',
    'REDIS_HOST'
  ];

  const missingOptional = optional.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(`⚠️  Missing optional environment variables: ${missingOptional.join(', ')}`);
    console.warn('Some AI services may not work properly');
  }
}

/**
 * Централизованная конфигурация приложения
 */
export const CONFIG: AppConfig = {
  app: {
    baseUrl: process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://aicexaibot-production.up.railway.app'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development'
  },

  server: {
    port: parseInt(process.env.PORT || '3025'),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000'],
      credentials: true
    }
  },

  database: {
    url: process.env.DATABASE_URL!
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },

  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL
    },
    freepik: {
      apiKey: process.env.FREEPIK_API_KEY || '',
      baseUrl: process.env.FREEPIK_API_URL || 'https://api.freepik.com/v1'
    },
    midjourney: {
      apiKey: process.env.MIDJOURNEY_API_KEY || '',
      baseUrl: process.env.MIDJOURNEY_API_URL || 'https://api.gen-api.ru'
    },
    runway: {
      apiKey: process.env.RUNWAY_API_KEY || '',
      baseUrl: process.env.RUNWAY_API_URL || 'https://api.runwayml.com'
    }
  },

  telegram: {
    botToken: process.env.BOT_TOKEN!,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL
  },

  security: {
    jwtSecret: process.env.JWT_SECRET!,
    rateLimits: {
      // Общие лимиты
      'global': {
        maxRequests: parseInt(process.env.RATE_LIMIT_GLOBAL || '100'),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000') // 1 минута
      },
      
      // Лимиты для AI сервисов
      'ai_generation': {
        maxRequests: parseInt(process.env.RATE_LIMIT_AI || '10'),
        windowMs: 60000 // 1 минута
      },
      
      // Лимиты для изображений
      'image_generation': {
        maxRequests: parseInt(process.env.RATE_LIMIT_IMAGE || '5'),
        windowMs: 60000 // 1 минута
      },
      
      // Лимиты для видео (строже)
      'video_generation': {
        maxRequests: parseInt(process.env.RATE_LIMIT_VIDEO || '2'),
        windowMs: 60000 // 1 минута
      },
      
      // Лимиты для текста (мягче)
      'text_generation': {
        maxRequests: parseInt(process.env.RATE_LIMIT_TEXT || '20'),
        windowMs: 60000 // 1 минута
      }
    }
  }
};

/**
 * Константы для AI сервисов
 */
export const AI_CONSTANTS = {
  // Стоимость операций в токенах
  COSTS: {
    freepik: {
      image_generation: parseInt(process.env.COST_FREEPIK_IMAGE || '5'),
      video_generation: parseInt(process.env.COST_FREEPIK_VIDEO || '15')
    },
    midjourney: {
      image_generation: parseInt(process.env.COST_MIDJOURNEY_IMAGE || '10')
    },
    chatgpt: {
      text_generation: parseInt(process.env.COST_CHATGPT_TEXT || '1'),
      image_generation: parseInt(process.env.COST_CHATGPT_IMAGE || '8'),
      image_analysis: parseInt(process.env.COST_CHATGPT_ANALYSIS || '3')
    },
    runway: {
      video_generation: parseInt(process.env.COST_RUNWAY_VIDEO || '20')
    }
  },

  // Таймауты для API запросов
  TIMEOUTS: {
    freepik: parseInt(process.env.TIMEOUT_FREEPIK || '60000'), // 1 минута
    midjourney: parseInt(process.env.TIMEOUT_MIDJOURNEY || '90000'), // 1.5 минуты
    chatgpt: parseInt(process.env.TIMEOUT_CHATGPT || '30000'), // 30 секунд
    runway: parseInt(process.env.TIMEOUT_RUNWAY || '120000') // 2 минуты
  },

  // Максимальные попытки повтора
  MAX_RETRIES: {
    freepik: parseInt(process.env.RETRIES_FREEPIK || '3'),
    midjourney: parseInt(process.env.RETRIES_MIDJOURNEY || '2'),
    chatgpt: parseInt(process.env.RETRIES_CHATGPT || '3'),
    runway: parseInt(process.env.RETRIES_RUNWAY || '2')
  },

  // Задержки между попытками (в миллисекундах)
  RETRY_DELAYS: {
    freepik: parseInt(process.env.RETRY_DELAY_FREEPIK || '2000'),
    midjourney: parseInt(process.env.RETRY_DELAY_MIDJOURNEY || '3000'),
    chatgpt: parseInt(process.env.RETRY_DELAY_CHATGPT || '1000'),
    runway: parseInt(process.env.RETRY_DELAY_RUNWAY || '5000')
  }
} as const;

/**
 * Константы для кэширования
 */
export const CACHE_CONSTANTS = {
  TTL: {
    USER_SETTINGS: parseInt(process.env.CACHE_USER_SETTINGS_TTL || '1800'), // 30 минут
    AI_RESPONSES: parseInt(process.env.CACHE_AI_RESPONSES_TTL || '3600'), // 1 час
    TASK_STATUS: parseInt(process.env.CACHE_TASK_STATUS_TTL || '300'), // 5 минут
    VALIDATION_CACHE: parseInt(process.env.CACHE_VALIDATION_TTL || '300'), // 5 минут
    RATE_LIMIT: parseInt(process.env.CACHE_RATE_LIMIT_TTL || '60') // 1 минута
  },
  
  PREFIXES: {
    USER_SETTINGS: 'user_settings:',
    AI_RESPONSE: 'ai_response:',
    TASK_STATUS: 'task_status:',
    RATE_LIMIT: 'rate_limit:',
    VALIDATION: 'validation:',
    SESSION: 'session:'
  }
} as const;

/**
 * Константы для безопасности
 */
export const SECURITY_CONSTANTS = {
  // Максимальные длины
  MAX_PROMPT_LENGTH: parseInt(process.env.MAX_PROMPT_LENGTH || '1000'),
  MAX_PROMPT_WORDS: parseInt(process.env.MAX_PROMPT_WORDS || '100'),
  MIN_PROMPT_LENGTH: parseInt(process.env.MIN_PROMPT_LENGTH || '3'),
  
  // Лимиты для блокировки пользователей
  SUSPICIOUS_ACTIVITY: {
    MAX_FAILED_REQUESTS_PER_HOUR: parseInt(process.env.MAX_FAILED_REQUESTS_HOUR || '20'),
    MAX_REQUESTS_PER_5_MINUTES: parseInt(process.env.MAX_REQUESTS_5MIN || '50'),
    DEFAULT_BLOCK_DURATION_MINUTES: parseInt(process.env.DEFAULT_BLOCK_DURATION || '30')
  },

  // Запрещенные слова и паттерны
  FORBIDDEN_WORDS: [
    'nsfw', 'adult', 'explicit', 'nude', 'naked', 'porn', 'sex', 'erotic',
    'hack', 'crack', 'virus', 'malware', 'spam', 'scam', 'phishing',
    'violence', 'kill', 'murder', 'suicide', 'death', 'blood',
    'drugs', 'cocaine', 'heroin', 'marijuana', 'cannabis'
  ],

  // Подозрительные IP диапазоны (базовые)
  SUSPICIOUS_IP_PATTERNS: [
    /^185\./, // Часто используется VPN
    /^46\./, // Подозрительные диапазоны
    /^37\./, // Еще один подозрительный диапазон
  ]
} as const;

/**
 * Константы для очередей
 */
export const QUEUE_CONSTANTS = {
  NAMES: {
    IMAGE_GENERATION: 'image-generation',
    VIDEO_GENERATION: 'video-generation',
    TEXT_GENERATION: 'text-generation'
  },

  CONCURRENCY: {
    FREEPIK_IMAGE: parseInt(process.env.QUEUE_FREEPIK_IMAGE_CONCURRENCY || '3'),
    MIDJOURNEY_IMAGE: parseInt(process.env.QUEUE_MIDJOURNEY_IMAGE_CONCURRENCY || '2'),
    CHATGPT_IMAGE: parseInt(process.env.QUEUE_CHATGPT_IMAGE_CONCURRENCY || '5'),
    FREEPIK_VIDEO: parseInt(process.env.QUEUE_FREEPIK_VIDEO_CONCURRENCY || '2'),
    RUNWAY_VIDEO: parseInt(process.env.QUEUE_RUNWAY_VIDEO_CONCURRENCY || '1'),
    CHATGPT_TEXT: parseInt(process.env.QUEUE_CHATGPT_TEXT_CONCURRENCY || '10')
  },

  JOB_OPTIONS: {
    IMAGE: {
      attempts: parseInt(process.env.QUEUE_IMAGE_ATTEMPTS || '3'),
      backoffDelay: parseInt(process.env.QUEUE_IMAGE_BACKOFF || '2000'),
      removeOnComplete: parseInt(process.env.QUEUE_IMAGE_KEEP_COMPLETED || '10'),
      removeOnFail: parseInt(process.env.QUEUE_IMAGE_KEEP_FAILED || '5')
    },
    VIDEO: {
      attempts: parseInt(process.env.QUEUE_VIDEO_ATTEMPTS || '2'),
      backoffDelay: parseInt(process.env.QUEUE_VIDEO_BACKOFF || '5000'),
      removeOnComplete: parseInt(process.env.QUEUE_VIDEO_KEEP_COMPLETED || '5'),
      removeOnFail: parseInt(process.env.QUEUE_VIDEO_KEEP_FAILED || '3')
    },
    TEXT: {
      attempts: parseInt(process.env.QUEUE_TEXT_ATTEMPTS || '5'),
      backoffDelay: parseInt(process.env.QUEUE_TEXT_BACKOFF || '1000'),
      removeOnComplete: parseInt(process.env.QUEUE_TEXT_KEEP_COMPLETED || '20'),
      removeOnFail: parseInt(process.env.QUEUE_TEXT_KEEP_FAILED || '10')
    }
  }
} as const;

/**
 * Константы для мониторинга и логирования
 */
export const MONITORING_CONSTANTS = {
  LOG_LEVELS: {
    DEVELOPMENT: 'debug',
    PRODUCTION: 'info',
    TEST: 'error'
  },

  CLEANUP_INTERVALS: {
    RATE_LIMITER: parseInt(process.env.CLEANUP_RATE_LIMITER_MS || '1800000'), // 30 минут
    CACHE: parseInt(process.env.CLEANUP_CACHE_MS || '3600000'), // 1 час
    SESSIONS: parseInt(process.env.CLEANUP_SESSIONS_MS || '1800000'), // 30 минут
    AUDIT_LOGS: parseInt(process.env.CLEANUP_AUDIT_LOGS_MS || '86400000') // 24 часа
  },

  HEALTH_CHECK: {
    INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '30000'), // 30 секунд
    TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '5000') // 5 секунд
  }
} as const;

/**
 * Получает конфигурацию для конкретного AI сервиса
 */
export function getAIServiceConfig(service: 'freepik' | 'midjourney' | 'chatgpt' | 'runway') {
  // Используем openai для chatgpt
  const configKey = service === 'chatgpt' ? 'openai' : service;
  const config = CONFIG.ai[configKey as keyof typeof CONFIG.ai];
  
  return {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    timeout: AI_CONSTANTS.TIMEOUTS[service],
    maxRetries: AI_CONSTANTS.MAX_RETRIES[service],
    retryDelay: AI_CONSTANTS.RETRY_DELAYS[service],
    costs: AI_CONSTANTS.COSTS[service]
  };
}

/**
 * Получает конфигурацию rate limiting для действия
 */
export function getRateLimitConfig(action: string): RateLimitConfig {
  return CONFIG.security.rateLimits[action] || CONFIG.security.rateLimits.global;
}

/**
 * Проверяет, включен ли AI сервис
 */
export function isAIServiceEnabled(service: 'freepik' | 'midjourney' | 'chatgpt' | 'runway'): boolean {
  const configKey = service === 'chatgpt' ? 'openai' : service;
  return !!CONFIG.ai[configKey as keyof typeof CONFIG.ai].apiKey;
}

/**
 * Получает список включенных AI сервисов
 */
export function getEnabledAIServices(): string[] {
  const services = ['freepik', 'midjourney', 'chatgpt', 'runway'] as const;
  return services.filter(service => isAIServiceEnabled(service));
}

/**
 * Инициализирует конфигурацию (вызывается при запуске)
 */
export function initializeConfig(): void {
  validateEnvironment();
  
  console.log('🔧 Configuration initialized:');
  console.log(`   Server: ${CONFIG.server.host}:${CONFIG.server.port}`);
  console.log(`   Base URL: ${CONFIG.app.baseUrl}`);
  console.log(`   Database: ${CONFIG.database.url.replace(/\/\/.*@/, '//***@')}`);
  console.log(`   Redis: ${CONFIG.redis.host}:${CONFIG.redis.port}`);
  console.log(`   Enabled AI services: ${getEnabledAIServices().join(', ')}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Development mode - additional logging enabled');
  }
}

// Экспорт для удобства
export default CONFIG;
