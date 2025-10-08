import Bull from 'bull';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

export interface TaskData {
  userId: number;
  prompt: string;
  model: string;
  service: 'freepik' | 'midjourney' | 'runway' | 'chatgpt';
  type?: string;
  metadata?: any;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export class TaskQueue {
  private imageQueue: Bull.Queue;
  private videoQueue: Bull.Queue;
  private textQueue: Bull.Queue;

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '1') // Используем другую БД для очередей
    };

    // Создаем разные очереди для разных типов задач
    this.imageQueue = new Bull('image-generation', { redis: redisConfig });
    this.videoQueue = new Bull('video-generation', { redis: redisConfig });
    this.textQueue = new Bull('text-generation', { redis: redisConfig });

    this.setupProcessors();
    this.setupEventHandlers();
  }

  /**
   * Настраивает обработчики задач
   */
  private setupProcessors(): void {
    // Обработчик генерации изображений
    this.imageQueue.process('freepik-image', 3, async (job) => {
      return await this.processFreepikImage(job.data);
    });

    this.imageQueue.process('midjourney-image', 2, async (job) => {
      return await this.processMidjourneyImage(job.data);
    });

    this.imageQueue.process('chatgpt-image', 5, async (job) => {
      return await this.processChatGPTImage(job.data);
    });

    // Обработчик генерации видео
    this.videoQueue.process('freepik-video', 2, async (job) => {
      return await this.processFreepikVideo(job.data);
    });

    this.videoQueue.process('runway-video', 1, async (job) => {
      return await this.processRunwayVideo(job.data);
    });

    // Обработчик текста
    this.textQueue.process('chatgpt-text', 10, async (job) => {
      return await this.processChatGPTText(job.data);
    });
  }

  /**
   * Настраивает обработчики событий
   */
  private setupEventHandlers(): void {
    // События для очереди изображений
    this.imageQueue.on('completed', (job, result) => {
      logger.info(`Image generation job ${job.id} completed for user ${job.data.userId}`);
      this.handleJobCompleted(job, result);
    });

    this.imageQueue.on('failed', (job, err) => {
      logger.error(`Image generation job ${job.id} failed:`, err);
      this.handleJobFailed(job, err);
    });

    // События для очереди видео
    this.videoQueue.on('completed', (job, result) => {
      logger.info(`Video generation job ${job.id} completed for user ${job.data.userId}`);
      this.handleJobCompleted(job, result);
    });

    this.videoQueue.on('failed', (job, err) => {
      logger.error(`Video generation job ${job.id} failed:`, err);
      this.handleJobFailed(job, err);
    });

    // События для очереди текста
    this.textQueue.on('completed', (job, result) => {
      logger.info(`Text generation job ${job.id} completed for user ${job.data.userId}`);
      this.handleJobCompleted(job, result);
    });

    this.textQueue.on('failed', (job, err) => {
      logger.error(`Text generation job ${job.id} failed:`, err);
      this.handleJobFailed(job, err);
    });
  }

  /**
   * Добавляет задачу генерации изображения
   */
  async addImageGeneration(taskData: TaskData): Promise<Bull.Job> {
    const jobName = `${taskData.service}-image`;
    const options: Bull.JobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5,
      delay: 0
    };

    // Приоритет в зависимости от сервиса
    switch (taskData.service) {
      case 'chatgpt':
        options.priority = 1; // Высокий приоритет
        break;
      case 'midjourney':
        options.priority = 2;
        break;
      case 'freepik':
        options.priority = 3;
        break;
    }

    return await this.imageQueue.add(jobName, taskData, options);
  }

  /**
   * Добавляет задачу генерации видео
   */
  async addVideoGeneration(taskData: TaskData): Promise<Bull.Job> {
    const jobName = `${taskData.service}-video`;
    const options: Bull.JobOptions = {
      attempts: 2, // Меньше попыток для видео (дороже)
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: 5,
      removeOnFail: 3,
      delay: 0
    };

    return await this.videoQueue.add(jobName, taskData, options);
  }

  /**
   * Добавляет задачу генерации текста
   */
  async addTextGeneration(taskData: TaskData): Promise<Bull.Job> {
    const jobName = `${taskData.service}-text`;
    const options: Bull.JobOptions = {
      attempts: 5,
      backoff: {
        type: 'fixed',
        delay: 1000
      },
      removeOnComplete: 20,
      removeOnFail: 10,
      delay: 0,
      priority: 1 // Высокий приоритет для текста
    };

    return await this.textQueue.add(jobName, taskData, options);
  }

  /**
   * Обрабатывает генерацию изображения через Freepik
   */
  private async processFreepikImage(data: TaskData): Promise<TaskResult> {
    try {
      const { FreepikLoraService } = await import('../bot/services/ai/FreepikLoraService');
      const service = new FreepikLoraService();

      // Используем chat метод для генерации изображения
      const response = await service.chat([
        { role: 'user', content: data.prompt }
      ], data.userId.toString());

      // Обновляем статус задачи в БД
      await this.updateTaskStatus(data, 'processing');

      return {
        success: true,
        data: response,
        imageUrl: this.extractImageUrl(response.content)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Freepik image generation error:', error);
      await this.updateTaskStatus(data, 'failed', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Обрабатывает генерацию изображения через Midjourney
   */
  private async processMidjourneyImage(data: TaskData): Promise<TaskResult> {
    try {
      // Здесь будет логика для Midjourney
      // Пока заглушка
      await this.updateTaskStatus(data, 'processing');

      // Симуляция обработки
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 секунд

      return {
        success: true,
        data: { message: 'Midjourney generation completed' },
        imageUrl: 'https://example.com/midjourney-image.jpg'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Midjourney image generation error:', error);
      await this.updateTaskStatus(data, 'failed', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Обрабатывает генерацию изображения через ChatGPT
   */
  private async processChatGPTImage(data: TaskData): Promise<TaskResult> {
    try {
      const { ChatGPTService } = await import('../bot/services/ai/ChatGPTService');
      const service = new ChatGPTService();

      const imageUrl = await service.generateImage(data.prompt);

      return {
        success: true,
        data: { imageUrl },
        imageUrl
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('ChatGPT image generation error:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Обрабатывает генерацию видео через Freepik
   */
  private async processFreepikVideo(data: TaskData): Promise<TaskResult> {
    try {
      const { FreepikLoraService } = await import('../bot/services/ai/FreepikLoraService');
      const service = new FreepikLoraService();

      const response = await service.generateVideo(
        data.prompt, 
        data.userId.toString(), 
        data.model || 'kling-v2'
      );

      await this.updateTaskStatus(data, 'processing');

      return {
        success: true,
        data: response,
        videoUrl: this.extractVideoUrl(response.content)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Freepik video generation error:', error);
      await this.updateTaskStatus(data, 'failed', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Обрабатывает генерацию видео через Runway
   */
  private async processRunwayVideo(data: TaskData): Promise<TaskResult> {
    try {
      // Здесь будет логика для Runway
      await this.updateTaskStatus(data, 'processing');

      // Симуляция обработки
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 минута

      return {
        success: true,
        data: { message: 'Runway generation completed' },
        videoUrl: 'https://example.com/runway-video.mp4'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Runway video generation error:', error);
      await this.updateTaskStatus(data, 'failed', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Обрабатывает генерацию текста через ChatGPT
   */
  private async processChatGPTText(data: TaskData): Promise<TaskResult> {
    try {
      const { ChatGPTService } = await import('../bot/services/ai/ChatGPTService');
      const service = new ChatGPTService();

      const response = await service.chat([
        { role: 'user', content: data.prompt }
      ], data.userId.toString());

      return {
        success: true,
        data: response
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('ChatGPT text generation error:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Обновляет статус задачи в базе данных
   */
  private async updateTaskStatus(
    data: TaskData, 
    status: string, 
    error?: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: data.userId },
        select: { id: true }
      });

      if (!user) return;

      // Обновляем в соответствующей таблице
      switch (data.service) {
        case 'freepik':
          await prisma.freepikTask.updateMany({
            where: { 
              userId: user.id,
              prompt: data.prompt,
              status: { in: ['CREATED', 'PROCESSING'] }
            },
            data: { 
              status: status.toUpperCase(),
              error,
              updatedAt: new Date()
            }
          });
          break;

        case 'midjourney':
          await prisma.midjourneyTask.updateMany({
            where: { 
              userId: user.id,
              prompt: data.prompt,
              status: { in: ['pending', 'processing'] }
            },
            data: { 
              status,
              error,
              updatedAt: new Date()
            }
          });
          break;

        case 'runway':
          await prisma.runwayTask.updateMany({
            where: { 
              userId: user.id,
              prompt: data.prompt,
              status: { in: ['CREATED', 'PROCESSING'] }
            },
            data: { 
              status: status.toUpperCase(),
              error,
              updatedAt: new Date()
            }
          });
          break;
      }
    } catch (error) {
      logger.error('Error updating task status:', error);
    }
  }

  /**
   * Обрабатывает успешное завершение задачи
   */
  private async handleJobCompleted(job: Bull.Job, result: TaskResult): Promise<void> {
    try {
      if (result.success) {
        await this.updateTaskStatus(job.data, 'completed');
        
        // Отправляем результат пользователю через webhook или уведомление
        await this.notifyUser(job.data.userId, {
          type: 'task_completed',
          service: job.data.service,
          result
        });
      }
    } catch (error) {
      logger.error('Error handling job completion:', error);
    }
  }

  /**
   * Обрабатывает неудачное завершение задачи
   */
  private async handleJobFailed(job: Bull.Job, error: Error): Promise<void> {
    try {
      await this.updateTaskStatus(job.data, 'failed', error.message);
      
      // Возвращаем токены пользователю
      const { TokenService } = await import('./TokenService');
      const tokenService = new TokenService();
      
      const cost = tokenService.getServiceCost(job.data.service, 'image_generation');
      await tokenService.refundTokens(
        job.data.userId,
        cost,
        job.data.service,
        'Task failed in queue'
      );

      // Уведомляем пользователя об ошибке
      await this.notifyUser(job.data.userId, {
        type: 'task_failed',
        service: job.data.service,
        error: error.message
      });
    } catch (error) {
      logger.error('Error handling job failure:', error);
    }
  }

  /**
   * Отправляет уведомление пользователю
   */
  private async notifyUser(userId: number, notification: any): Promise<void> {
    try {
      // Здесь можно добавить логику отправки уведомлений
      // Например, через Telegram Bot API или WebSocket
      logger.info(`Notification for user ${userId}:`, notification);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  /**
   * Извлекает URL изображения из ответа
   */
  private extractImageUrl(content: string): string | undefined {
    const urlMatch = content.match(/https?:\/\/[^\s)]+\.(jpg|jpeg|png|gif|webp)/i);
    return urlMatch ? urlMatch[0] : undefined;
  }

  /**
   * Извлекает URL видео из ответа
   */
  private extractVideoUrl(content: string): string | undefined {
    const urlMatch = content.match(/https?:\/\/[^\s)]+\.(mp4|webm|avi|mov)/i);
    return urlMatch ? urlMatch[0] : undefined;
  }

  /**
   * Получает статистику очередей
   */
  async getQueueStats(): Promise<{
    imageQueue: any;
    videoQueue: any;
    textQueue: any;
  }> {
    try {
      const [imageStats, videoStats, textStats] = await Promise.all([
        {
          waiting: await this.imageQueue.getWaiting().then(jobs => jobs.length),
          active: await this.imageQueue.getActive().then(jobs => jobs.length),
          completed: await this.imageQueue.getCompleted().then(jobs => jobs.length),
          failed: await this.imageQueue.getFailed().then(jobs => jobs.length)
        },
        {
          waiting: await this.videoQueue.getWaiting().then(jobs => jobs.length),
          active: await this.videoQueue.getActive().then(jobs => jobs.length),
          completed: await this.videoQueue.getCompleted().then(jobs => jobs.length),
          failed: await this.videoQueue.getFailed().then(jobs => jobs.length)
        },
        {
          waiting: await this.textQueue.getWaiting().then(jobs => jobs.length),
          active: await this.textQueue.getActive().then(jobs => jobs.length),
          completed: await this.textQueue.getCompleted().then(jobs => jobs.length),
          failed: await this.textQueue.getFailed().then(jobs => jobs.length)
        }
      ]);

      return {
        imageQueue: imageStats,
        videoQueue: videoStats,
        textQueue: textStats
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return {
        imageQueue: {},
        videoQueue: {},
        textQueue: {}
      };
    }
  }

  /**
   * Очищает все очереди
   */
  async clearAllQueues(): Promise<void> {
    try {
      await Promise.all([
        this.imageQueue.clean(0, 'completed'),
        this.imageQueue.clean(0, 'failed'),
        this.videoQueue.clean(0, 'completed'),
        this.videoQueue.clean(0, 'failed'),
        this.textQueue.clean(0, 'completed'),
        this.textQueue.clean(0, 'failed')
      ]);
      
      logger.info('All queues cleared successfully');
    } catch (error) {
      logger.error('Error clearing queues:', error);
    }
  }

  /**
   * Закрывает все очереди
   */
  async close(): Promise<void> {
    try {
      await Promise.all([
        this.imageQueue.close(),
        this.videoQueue.close(),
        this.textQueue.close()
      ]);
      
      logger.info('All queues closed successfully');
    } catch (error) {
      logger.error('Error closing queues:', error);
    }
  }
}
