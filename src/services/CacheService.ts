import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private redis: Redis;
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly DEFAULT_PREFIX = 'aicex:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  /**
   * Получает значение из кэша
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const value = await this.redis.get(fullKey);
      
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        // Если не JSON, возвращаем как строку
        return value as unknown as T;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Устанавливает значение в кэш
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const ttl = options.ttl || this.DEFAULT_TTL;
      
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      await this.redis.setex(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Удаляет значение из кэша
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Проверяет существование ключа
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Устанавливает TTL для существующего ключа
   */
  async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Получает TTL ключа
   */
  async getTTL(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      logger.error(`Cache getTTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Удаляет все ключи по паттерну
   */
  async deletePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options.prefix);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      logger.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Получает настройки пользователя с кэшированием
   */
  async getUserSettings(userId: number): Promise<any | null> {
    const cacheKey = `user_settings_${userId}`;
    
    // Проверяем кэш
    let settings = await this.get(cacheKey, { ttl: 1800 }); // 30 минут
    
    if (settings) {
      return settings;
    }

    // Загружаем из БД (здесь нужно импортировать prisma)
    try {
      const { prisma } = await import('../utils/prismaClient');
      
      const user = await prisma.user.findUnique({
        where: { telegramId: userId },
        select: {
          id: true,
          tokens: true,
          subscription: true,
          gptSettings: true,
          midjourneySettings: true,
          runwaySettings: true,
          appSettings: true
        }
      });

      if (user) {
        settings = {
          gpt: user.gptSettings,
          midjourney: user.midjourneySettings,
          runway: user.runwaySettings,
          app: user.appSettings,
          tokens: user.tokens,
          subscription: user.subscription
        };
        
        await this.set(cacheKey, settings, { ttl: 1800 });
      }

      return settings;
    } catch (error) {
      logger.error('Error loading user settings:', error);
      return null;
    }
  }

  /**
   * Инвалидирует кэш настроек пользователя
   */
  async invalidateUserSettings(userId: number): Promise<boolean> {
    const cacheKey = `user_settings_${userId}`;
    return await this.delete(cacheKey);
  }

  /**
   * Кэширует результат AI генерации
   */
  async cacheAIResponse(
    service: string, 
    prompt: string, 
    model: string, 
    response: any
  ): Promise<boolean> {
    const cacheKey = `ai_response_${service}_${this.hashString(prompt)}_${model}`;
    return await this.set(cacheKey, response, { ttl: 3600 }); // 1 час
  }

  /**
   * Получает кэшированный результат AI генерации
   */
  async getCachedAIResponse(
    service: string, 
    prompt: string, 
    model: string
  ): Promise<any | null> {
    const cacheKey = `ai_response_${service}_${this.hashString(prompt)}_${model}`;
    return await this.get(cacheKey);
  }

  /**
   * Кэширует статус задачи
   */
  async cacheTaskStatus(taskId: string, status: any): Promise<boolean> {
    const cacheKey = `task_status_${taskId}`;
    return await this.set(cacheKey, status, { ttl: 300 }); // 5 минут
  }

  /**
   * Получает кэшированный статус задачи
   */
  async getCachedTaskStatus(taskId: string): Promise<any | null> {
    const cacheKey = `task_status_${taskId}`;
    return await this.get(cacheKey);
  }

  /**
   * Кэширует список активных задач пользователя
   */
  async cacheUserActiveTasks(userId: number, tasks: any[]): Promise<boolean> {
    const cacheKey = `user_active_tasks_${userId}`;
    return await this.set(cacheKey, tasks, { ttl: 60 }); // 1 минута
  }

  /**
   * Получает кэшированный список активных задач пользователя
   */
  async getCachedUserActiveTasks(userId: number): Promise<any[] | null> {
    const cacheKey = `user_active_tasks_${userId}`;
    return await this.get(cacheKey);
  }

  /**
   * Инвалидирует кэш активных задач пользователя
   */
  async invalidateUserActiveTasks(userId: number): Promise<boolean> {
    const cacheKey = `user_active_tasks_${userId}`;
    return await this.delete(cacheKey);
  }

  /**
   * Получает статистику кэша
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Парсим количество ключей
      const dbMatch = keyspace.match(/db0:keys=(\d+)/);
      const totalKeys = dbMatch ? parseInt(dbMatch[1]) : 0;
      
      // Парсим использование памяти
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      return {
        totalKeys,
        memoryUsage
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown'
      };
    }
  }

  /**
   * Очищает весь кэш (осторожно!)
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Закрывает соединение с Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Строит полный ключ с префиксом
   */
  private buildKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.DEFAULT_PREFIX;
    return `${finalPrefix}${key}`;
  }

  /**
   * Создает хэш строки для кэширования
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Проверяет подключение к Redis
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return { status: 'healthy', latency };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { status: 'unhealthy' };
    }
  }
}
