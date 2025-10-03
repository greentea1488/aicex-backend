import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

export interface GenerationLogData {
  userId: string;
  telegramId: number;
  service: string;
  type: 'image' | 'video' | 'text';
  prompt: string;
  model?: string;
  settings?: any;
  tokensUsed: number;
  status: 'started' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  error?: string;
  taskId?: string;
  metadata?: any;
}

/**
 * Сервис для логирования всех AI генераций
 */
export class GenerationLogService {

  /**
   * Создает запись о начале генерации
   */
  async logGenerationStart(data: Omit<GenerationLogData, 'status'>): Promise<string> {
    try {
      const generationLog = await prisma.generationHistory.create({
        data: {
          userId: data.userId,
          service: data.service,
          type: data.type,
          prompt: data.prompt,
          tokensUsed: data.tokensUsed,
          status: 'started',
          taskId: data.taskId,
          resultUrl: null
        }
      });

      // Также записываем в ActivityLog для детального трекинга
      await prisma.activityLog.create({
        data: {
          userId: data.userId,
          action: 'GENERATION_STARTED',
          details: {
            service: data.service,
            type: data.type,
            prompt: data.prompt.substring(0, 100), // Обрезаем для экономии места
            model: data.model,
            tokensUsed: data.tokensUsed,
            taskId: data.taskId,
            ...data.metadata
          }
        }
      });

      logger.info('Generation started:', {
        id: generationLog.id,
        userId: data.userId,
        service: data.service,
        type: data.type,
        tokensUsed: data.tokensUsed
      });

      return generationLog.id;
    } catch (error) {
      logger.error('Error logging generation start:', error);
      throw error;
    }
  }

  /**
   * Обновляет статус генерации на "processing"
   */
  async logGenerationProcessing(generationId: string, metadata?: any): Promise<void> {
    try {
      await prisma.generationHistory.update({
        where: { id: generationId },
        data: { 
          status: 'processing'
        }
      });

      if (metadata) {
        const generation = await prisma.generationHistory.findUnique({
          where: { id: generationId },
          select: { userId: true, service: true }
        });

        if (generation) {
          await prisma.activityLog.create({
            data: {
              userId: generation.userId,
              action: 'GENERATION_PROCESSING',
              details: {
                generationId,
                service: generation.service,
                ...metadata
              }
            }
          });
        }
      }

      logger.info('Generation processing:', { generationId });
    } catch (error) {
      logger.error('Error logging generation processing:', error);
    }
  }

  /**
   * Завершает генерацию успешно
   */
  async logGenerationCompleted(
    generationId: string, 
    resultUrl: string, 
    metadata?: any
  ): Promise<void> {
    try {
      const updatedGeneration = await prisma.generationHistory.update({
        where: { id: generationId },
        data: { 
          status: 'completed',
          resultUrl: resultUrl
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: updatedGeneration.userId,
          action: 'GENERATION_COMPLETED',
          details: {
            generationId,
            service: updatedGeneration.service,
            resultUrl,
            ...metadata
          }
        }
      });

      logger.info('Generation completed:', {
        generationId,
        service: updatedGeneration.service,
        resultUrl
      });
    } catch (error) {
      logger.error('Error logging generation completion:', error);
    }
  }

  /**
   * Логирует ошибку генерации
   */
  async logGenerationFailed(
    generationId: string, 
    error: string, 
    shouldRefundTokens: boolean = true
  ): Promise<void> {
    try {
      const updatedGeneration = await prisma.generationHistory.update({
        where: { id: generationId },
        data: { 
          status: 'failed'
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: updatedGeneration.userId,
          action: 'GENERATION_FAILED',
          details: {
            generationId,
            service: updatedGeneration.service,
            error,
            shouldRefundTokens
          }
        }
      });

      logger.error('Generation failed:', {
        generationId,
        service: updatedGeneration.service,
        error
      });
    } catch (logError) {
      logger.error('Error logging generation failure:', logError);
    }
  }

  /**
   * Получает историю генераций пользователя
   */
  async getUserGenerationHistory(
    telegramId: number, 
    limit: number = 20,
    service?: string
  ): Promise<any[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true }
      });

      if (!user) return [];

      const whereClause: any = { userId: user.id };
      if (service) {
        whereClause.service = service;
      }

      const history = await prisma.generationHistory.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          service: true,
          type: true,
          prompt: true,
          status: true,
          resultUrl: true,
          tokensUsed: true,
          createdAt: true
        }
      });

      return history;
    } catch (error) {
      logger.error('Error getting user generation history:', error);
      return [];
    }
  }

  /**
   * Получает статистику генераций пользователя
   */
  async getUserGenerationStats(telegramId: number): Promise<{
    totalGenerations: number;
    completedGenerations: number;
    failedGenerations: number;
    totalTokensUsed: number;
    serviceBreakdown: { [service: string]: number };
    typeBreakdown: { [type: string]: number };
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true }
      });

      if (!user) {
        return {
          totalGenerations: 0,
          completedGenerations: 0,
          failedGenerations: 0,
          totalTokensUsed: 0,
          serviceBreakdown: {},
          typeBreakdown: {}
        };
      }

      const [
        totalGenerations,
        completedGenerations,
        failedGenerations,
        tokenStats,
        serviceStats,
        typeStats
      ] = await Promise.all([
        // Общее количество генераций
        prisma.generationHistory.count({
          where: { userId: user.id }
        }),
        
        // Успешные генерации
        prisma.generationHistory.count({
          where: { userId: user.id, status: 'completed' }
        }),
        
        // Неудачные генерации
        prisma.generationHistory.count({
          where: { userId: user.id, status: 'failed' }
        }),
        
        // Общие потраченные токены
        prisma.generationHistory.aggregate({
          where: { userId: user.id },
          _sum: { tokensUsed: true }
        }),
        
        // Статистика по сервисам
        prisma.generationHistory.groupBy({
          by: ['service'],
          where: { userId: user.id },
          _count: { service: true }
        }),
        
        // Статистика по типам
        prisma.generationHistory.groupBy({
          by: ['type'],
          where: { userId: user.id },
          _count: { type: true }
        })
      ]);

      const serviceBreakdown: { [service: string]: number } = {};
      serviceStats.forEach(stat => {
        serviceBreakdown[stat.service] = stat._count.service;
      });

      const typeBreakdown: { [type: string]: number } = {};
      typeStats.forEach(stat => {
        typeBreakdown[stat.type] = stat._count.type;
      });

      return {
        totalGenerations,
        completedGenerations,
        failedGenerations,
        totalTokensUsed: tokenStats._sum.tokensUsed || 0,
        serviceBreakdown,
        typeBreakdown
      };
    } catch (error) {
      logger.error('Error getting user generation stats:', error);
      return {
        totalGenerations: 0,
        completedGenerations: 0,
        failedGenerations: 0,
        totalTokensUsed: 0,
        serviceBreakdown: {},
        typeBreakdown: {}
      };
    }
  }

  /**
   * Получает общую статистику системы (для админов)
   */
  async getSystemGenerationStats(): Promise<{
    totalGenerations: number;
    todayGenerations: number;
    activeUsers: number;
    topServices: Array<{ service: string; count: number }>;
    recentActivity: any[];
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalGenerations,
        todayGenerations,
        activeUsers,
        topServices,
        recentActivity
      ] = await Promise.all([
        // Общее количество генераций
        prisma.generationHistory.count(),
        
        // Генерации за сегодня
        prisma.generationHistory.count({
          where: {
            createdAt: { gte: today }
          }
        }),
        
        // Активные пользователи (генерировали что-то за последние 7 дней)
        prisma.generationHistory.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          select: { userId: true },
          distinct: ['userId']
        }).then(users => users.length),
        
        // Топ сервисов
        prisma.generationHistory.groupBy({
          by: ['service'],
          _count: { service: true },
          orderBy: { _count: { service: 'desc' } },
          take: 5
        }),
        
        // Недавняя активность
        prisma.generationHistory.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            service: true,
            type: true,
            status: true,
            tokensUsed: true,
            createdAt: true
          }
        })
      ]);

      return {
        totalGenerations,
        todayGenerations,
        activeUsers,
        topServices: topServices.map(s => ({
          service: s.service,
          count: s._count.service
        })),
        recentActivity
      };
    } catch (error) {
      logger.error('Error getting system generation stats:', error);
      return {
        totalGenerations: 0,
        todayGenerations: 0,
        activeUsers: 0,
        topServices: [],
        recentActivity: []
      };
    }
  }
}

export const generationLogService = new GenerationLogService();
