import { logger } from "../../utils/logger";
import { StateManager, GenerationTask } from "./StateManager";

// 🎯 Улучшенная система очередей и кеширования

export interface QueueConfig {
  maxConcurrentTasks: number;
  retryAttempts: number;
  retryDelay: number;
  taskTimeout: number;
}

export interface CachedResult {
  result: any;
  timestamp: number;
  hits: number;
  expires: number;
  metadata?: any;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

export class TaskQueue {
  private queue: GenerationTask[] = [];
  private processing = new Map<string, GenerationTask>();
  private completed = new Map<string, GenerationTask>();
  private cache = new Map<string, CachedResult>();
  private config: QueueConfig;
  private stateManager: StateManager;
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalWaitTime: 0,
    totalProcessingTime: 0
  };

  constructor(stateManager: StateManager, config?: Partial<QueueConfig>) {
    this.stateManager = stateManager;
    this.config = {
      maxConcurrentTasks: config?.maxConcurrentTasks || 5,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 5000,
      taskTimeout: config?.taskTimeout || 300000, // 5 минут
      ...config
    };

    // Запускаем обработчик очереди
    this.startQueueProcessor();
    
    // Очистка кеша каждые 10 минут
    setInterval(() => {
      this.cleanupCache();
    }, 10 * 60 * 1000);
  }

  /**
   * ➕ Добавление задачи в очередь
   */
  async addTask(task: GenerationTask): Promise<string> {
    const position = this.queue.length + 1;
    
    // Уведомляем пользователя о добавлении в очередь
    await this.notifyUser(task.userId, 
      `Задача добавлена в очередь. Позиция: ${position}`
    );

    this.queue.push(task);
    logger.info(`Task ${task.id} added to queue at position ${position}`);
    
    // Запускаем обработку
    this.processNext();
    
    return task.id;
  }

  /**
   * 🚀 Обработка следующей задачи
   */
  private async processNext(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrentTasks) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    // Проверяем кеш
    const cacheKey = this.generateCacheKey(task);
    const cachedResult = this.getCachedResult(cacheKey);
    
    if (cachedResult) {
      logger.info(`Using cached result for task ${task.id}`);
      this.stateManager.updateTask(task.id, {
        status: 'completed',
        result: cachedResult.result,
        progress: 100,
        completedAt: new Date()
      });
      
      await this.notifyUser(task.userId, 
        `Результат получен из кеша! 💾`
      );
      
      this.completed.set(task.id, task);
      this.processNext();
      return;
    }

    // Переводим в обработку
    this.processing.set(task.id, task);
    this.stateManager.updateTask(task.id, {
      status: 'processing',
      startedAt: new Date()
    });

    const startTime = Date.now();
    
    try {
      await this.notifyUser(task.userId, 
        `🚀 Начинаю обработку задачи...`
      );

      const result = await this.executeTask(task);
      
      const processingTime = Date.now() - startTime;
      this.stats.totalProcessingTime += processingTime;
      this.stats.totalProcessed++;

      // Сохраняем в кеш
      this.setCachedResult(cacheKey, result, task);

      this.stateManager.updateTask(task.id, {
        status: 'completed',
        result: result,
        progress: 100,
        completedAt: new Date()
      });

      this.completed.set(task.id, task);
      
      await this.notifyUser(task.userId, 
        `✅ Задача выполнена за ${this.formatTime(processingTime)}`
      );

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.stats.totalFailed++;

      this.stateManager.updateTask(task.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date()
      });

      logger.error(`Task ${task.id} failed:`, error);
      
      // Планируем повтор если возможно
      const retryCount = this.stateManager.getSession(task.userId.toString())?.retryCount || 0;
      if (retryCount < this.config.retryAttempts) {
        this.stateManager.scheduleRetry(task.id, this.config.retryDelay);
        await this.notifyUser(task.userId, 
          `⚠️ Ошибка. Повтор через ${this.formatTime(this.config.retryDelay / 1000)}`
        );
      } else {
        await this.notifyUser(task.userId, 
          `❌ Задача не выполнена после ${this.config.retryAttempts} попыток`
        );
      }
    } finally {
      this.processing.delete(task.id);
      
      // Обрабатываем следующую задачу
      setTimeout(() => this.processNext(), 100);
    }
  }

  /**
   * ⚙️ Выполнение задачи
   */
  private async executeTask(task: GenerationTask): Promise<any> {
    // Здесь будет логика выполнения конкретной задачи
    // Пока что заглушка
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% успеха
          resolve({ url: `https://example.com/${task.type}_${Date.now()}.jpg` });
        } else {
          reject(new Error('Simulated task failure'));
        }
      }, Math.random() * 3000 + 1000); // 1-4 секунды
    });
  }

  /**
   * 💾 Кеширование результатов
   */
  private generateCacheKey(task: GenerationTask): string {
    const promptHash = this.hashString(task.prompt);
    return `${task.type}_${task.service}_${promptHash}`;
  }

  private getCachedResult(key: string): CachedResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    cached.hits++;
    return cached;
  }

  private setCachedResult(key: string, result: any, task: GenerationTask): void {
    const ttl = this.getCacheTTL(task.type);
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 1,
      expires: Date.now() + ttl,
      metadata: {
        type: task.type,
        service: task.service,
        prompt: task.prompt.substring(0, 100)
      }
    });
  }

  private getCacheTTL(type: string): number {
    const ttlMap = {
      'image': 60 * 60 * 1000, // 1 час
      'video': 2 * 60 * 60 * 1000, // 2 часа
      'chat': 30 * 60 * 1000 // 30 минут
    };
    
    return ttlMap[type as keyof typeof ttlMap] || 60 * 60 * 1000;
  }

  /**
   * 🧹 Очистка кеша
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * 📊 Статистика очереди
   */
  getQueueStats(): QueueStats {
    const averageWaitTime = this.stats.totalProcessed > 0 ? 
      this.stats.totalWaitTime / this.stats.totalProcessed : 0;
    
    const averageProcessingTime = this.stats.totalProcessed > 0 ? 
      this.stats.totalProcessingTime / this.stats.totalProcessed : 0;

    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.stats.totalFailed,
      averageWaitTime,
      averageProcessingTime
    };
  }

  /**
   * 📋 Получение задач пользователя
   */
  getUserTasks(userId: number): GenerationTask[] {
    const queueTasks = this.queue.filter(task => task.userId === userId);
    const processingTasks = Array.from(this.processing.values()).filter(task => task.userId === userId);
    const completedTasks = Array.from(this.completed.values()).filter(task => task.userId === userId);
    
    return [...queueTasks, ...processingTasks, ...completedTasks]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 🚫 Отмена задачи
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // Ищем в очереди
    const queueIndex = this.queue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      const task = this.queue.splice(queueIndex, 1)[0];
      this.stateManager.updateTask(taskId, {
        status: 'failed',
        error: 'Task cancelled by user',
        completedAt: new Date()
      });
      
      await this.notifyUser(task.userId, '❌ Задача отменена');
      return true;
    }

    // Ищем в обработке
    const processingTask = this.processing.get(taskId);
    if (processingTask) {
      this.processing.delete(taskId);
      this.stateManager.updateTask(taskId, {
        status: 'failed',
        error: 'Task cancelled by user',
        completedAt: new Date()
      });
      
      await this.notifyUser(processingTask.userId, '❌ Задача отменена');
      return true;
    }

    return false;
  }

  /**
   * 🔄 Повтор задачи
   */
  async retryTask(taskId: string): Promise<boolean> {
    const completedTask = this.completed.get(taskId);
    if (!completedTask) return false;

    // Создаем новую задачу на основе старой
    const newTask = this.stateManager.createTask(
      completedTask.userId,
      completedTask.type,
      completedTask.service,
      completedTask.prompt
    );

    await this.addTask(newTask);
    return true;
  }

  /**
   * 📢 Уведомление пользователя
   */
  private async notifyUser(userId: number, message: string): Promise<void> {
    // Здесь будет отправка уведомления пользователю
    logger.info(`Notification for user ${userId}: ${message}`);
  }

  /**
   * 🚀 Запуск обработчика очереди
   */
  private startQueueProcessor(): void {
    // Проверяем очередь каждую секунду
    setInterval(() => {
      this.processNext();
    }, 1000);
  }

  /**
   * ⏱️ Форматирование времени
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}с`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}м ${remainingSeconds}с`;
  }

  /**
   * 🔐 Хеширование строки
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 📊 Получение статистики кеша
   */
  getCacheStats(): { size: number; hitRate: number; totalHits: number } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, cached) => sum + cached.hits, 0);
    const hitRate = this.stats.totalProcessed > 0 ? totalHits / this.stats.totalProcessed : 0;
    
    return {
      size: this.cache.size,
      hitRate,
      totalHits
    };
  }

  /**
   * 🧹 Очистка всех данных
   */
  clearAll(): void {
    this.queue = [];
    this.processing.clear();
    this.completed.clear();
    this.cache.clear();
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      totalWaitTime: 0,
      totalProcessingTime: 0
    };
  }
}
