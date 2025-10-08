import { prisma } from "../utils/prismaClient";
import { logger } from "../utils/logger";

export interface TokenTransaction {
  userId: string;
  amount: number;
  type: 'deduction' | 'addition' | 'refund';
  service: string;
  metadata?: any;
}

export class TokenService {
  /**
   * Проверяет, достаточно ли токенов у пользователя
   */
  async checkTokenBalance(telegramId: number, requiredAmount: number): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { tokens: true }
      });

      if (!user) {
        logger.warn(`User not found for telegram ID: ${telegramId}`);
        return false;
      }

      return user.tokens >= requiredAmount;
    } catch (error) {
      logger.error('Error checking token balance:', error);
      return false;
    }
  }

  /**
   * Списывает токены у пользователя с аудитом
   */
  async deductTokens(
    telegramId: number, 
    amount: number, 
    service: string,
    metadata?: any
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Получаем пользователя
        const user = await tx.user.findUnique({
          where: { telegramId }
        });

        if (!user) {
          return { success: false, error: 'Пользователь не найден' };
        }

        // Проверяем баланс
        if (user.tokens < amount) {
          return { 
            success: false, 
            error: `Недостаточно токенов. Требуется: ${amount}, доступно: ${user.tokens}` 
          };
        }

        // Списываем токены
        const updatedUser = await tx.user.update({
          where: { telegramId },
          data: { tokens: { decrement: amount } }
        });

        // Записываем в историю токенов
        await tx.tokenHistory.create({
          data: {
            userId: user.id,
            amount: -amount,
            type: 'SPEND_FREEPIK',
            balanceBefore: user.tokens,
            balanceAfter: user.tokens - amount
          }
        });

        // Записываем в аудит
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'token_deduction',
            metadata: {
              amount,
              service,
              previousBalance: user.tokens,
              newBalance: updatedUser.tokens,
              ...metadata
            }
          }
        });

        logger.info(`Tokens deducted: ${amount} from user ${telegramId} for ${service}`);

        return { 
          success: true, 
          newBalance: updatedUser.tokens 
        };
      });
    } catch (error) {
      logger.error('Error deducting tokens:', error);
      return { 
        success: false, 
        error: 'Ошибка при списании токенов' 
      };
    }
  }

  /**
   * Добавляет токены пользователю
   */
  async addTokens(
    telegramId: number, 
    amount: number, 
    reason: string,
    metadata?: any
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Получаем пользователя
        const user = await tx.user.findUnique({
          where: { telegramId }
        });

        if (!user) {
          return { success: false, error: 'Пользователь не найден' };
        }

        // Добавляем токены
        const updatedUser = await tx.user.update({
          where: { telegramId },
          data: { tokens: { increment: amount } }
        });

        // Записываем в историю токенов
        await tx.tokenHistory.create({
          data: {
            userId: user.id,
            amount: amount,
            type: 'BONUS',
            balanceBefore: user.tokens,
            balanceAfter: user.tokens + amount
          }
        });

        // Записываем в аудит
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'token_addition',
            metadata: {
              amount,
              reason,
              previousBalance: user.tokens,
              newBalance: updatedUser.tokens,
              ...metadata
            }
          }
        });

        logger.info(`Tokens added: ${amount} to user ${telegramId} for ${reason}`);

        return { 
          success: true, 
          newBalance: updatedUser.tokens 
        };
      });
    } catch (error) {
      logger.error('Error adding tokens:', error);
      return { 
        success: false, 
        error: 'Ошибка при добавлении токенов' 
      };
    }
  }

  /**
   * Возвращает токены пользователю (например, при ошибке генерации)
   */
  async refundTokens(
    telegramId: number, 
    amount: number, 
    originalService: string,
    reason: string,
    metadata?: any
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegramId }
        });

        if (!user) {
          return { success: false, error: 'Пользователь не найден' };
        }

        // Возвращаем токены
        const updatedUser = await tx.user.update({
          where: { telegramId },
          data: { tokens: { increment: amount } }
        });

        // Записываем в историю токенов
        await tx.tokenHistory.create({
          data: {
            userId: user.id,
            amount: amount,
            type: 'REFUND',
            balanceBefore: user.tokens,
            balanceAfter: user.tokens + amount
          }
        });

        // Записываем в аудит
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'token_refund',
            metadata: {
              amount,
              originalService,
              reason,
              previousBalance: user.tokens,
              newBalance: updatedUser.tokens,
              ...metadata
            }
          }
        });

        logger.info(`Tokens refunded: ${amount} to user ${telegramId} for ${originalService} - ${reason}`);

        return { 
          success: true, 
          newBalance: updatedUser.tokens 
        };
      });
    } catch (error) {
      logger.error('Error refunding tokens:', error);
      return { 
        success: false, 
        error: 'Ошибка при возврате токенов' 
      };
    }
  }

  /**
   * Получает баланс токенов пользователя
   */
  async getTokenBalance(telegramId: number): Promise<number | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { tokens: true }
      });

      return user?.tokens ?? null;
    } catch (error) {
      logger.error('Error getting token balance:', error);
      return null;
    }
  }

  /**
   * Получает историю токенов пользователя
   */
  async getTokenHistory(
    telegramId: number, 
    limit: number = 10
  ): Promise<any[] | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true }
      });

      if (!user) return null;

      const history = await prisma.tokenHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          amount: true,
          type: true,
          createdAt: true
        }
      });

      return history;
    } catch (error) {
      logger.error('Error getting token history:', error);
      return null;
    }
  }

  /**
   * Получает стоимость операции для разных AI сервисов
   */
  getServiceCost(service: string, operation: string): number {
    const costs: { [key: string]: { [key: string]: number } } = {
      'freepik': {
        'image_generation': 5,
        'video_generation': 15
      },
      'midjourney': {
        'image_generation': 10
      },
      'chatgpt': {
        'text_generation': 1,
        'image_generation': 8,
        'image_analysis': 3
      },
      'runway': {
        'video_generation': 20
      }
    };

    return costs[service]?.[operation] ?? 1;
  }

  /**
   * Создает задачу с автоматическим списанием токенов
   */
  async createTaskWithTokenDeduction(
    telegramId: number,
    service: string,
    operation: string,
    taskData: any
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    const cost = this.getServiceCost(service, operation);
    
    // Сначала списываем токены
    const deductionResult = await this.deductTokens(
      telegramId, 
      cost, 
      service,
      { operation, taskData }
    );

    if (!deductionResult.success) {
      return { 
        success: false, 
        error: deductionResult.error 
      };
    }

    try {
      // Создаем задачу в соответствующей таблице
      let taskId: string;
      
      switch (service) {
        case 'freepik':
          const freepikTask = await prisma.freepikTask.create({
            data: {
              taskId: `freepik_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: (await prisma.user.findUnique({ 
                where: { telegramId }, 
                select: { id: true } 
              }))!.id,
              prompt: taskData.prompt,
              model: taskData.model,
              type: taskData.type || 'image',
              cost
            }
          });
          taskId = freepikTask.taskId;
          break;

        case 'midjourney':
          const midjourneyTask = await prisma.midjourneyTask.create({
            data: {
              taskId: `midjourney_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: (await prisma.user.findUnique({ 
                where: { telegramId }, 
                select: { id: true } 
              }))!.id,
              telegramId,
              prompt: taskData.prompt,
              model: taskData.model || '7.0',
              style: taskData.style || 'photorealistic',
              aspect_ratio: taskData.aspect_ratio || '1:1',
              quality: taskData.quality || 'high',
              cost
            }
          });
          taskId = midjourneyTask.taskId;
          break;

        case 'runway':
          const runwayTask = await prisma.runwayTask.create({
            data: {
              taskId: `runway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: (await prisma.user.findUnique({ 
                where: { telegramId }, 
                select: { id: true } 
              }))!.id,
              prompt: taskData.prompt,
              model: taskData.model || 'gen3',
              type: taskData.type || 'text_to_video',
              cost
            }
          });
          taskId = runwayTask.taskId;
          break;

        default:
          // Если неизвестный сервис, возвращаем токены
          await this.refundTokens(
            telegramId, 
            cost, 
            service, 
            'Unknown service'
          );
          return { 
            success: false, 
            error: 'Неизвестный AI сервис' 
          };
      }

      return { 
        success: true, 
        taskId 
      };

    } catch (error) {
      logger.error('Error creating task, refunding tokens:', error);
      
      // Возвращаем токены при ошибке создания задачи
      await this.refundTokens(
        telegramId, 
        cost, 
        service, 
        'Task creation failed'
      );

      return { 
        success: false, 
        error: 'Ошибка создания задачи' 
      };
    }
  }
}
