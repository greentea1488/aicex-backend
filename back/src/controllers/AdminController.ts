import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

export class AdminController {

  /**
   * Получает общую статистику системы
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalPayments,
        totalTokensSpent,
        totalTasks,
        completedTasks
      ] = await Promise.all([
        // Общее количество пользователей
        prisma.user.count(),
        
        // Активные пользователи (за последние 30 дней)
        prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Общая сумма платежей
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'COMPLETED' }
        }),
        
        // Общее количество потраченных токенов
        prisma.tokenHistory.aggregate({
          _sum: { amount: true },
          where: { amount: { lt: 0 } }
        }),
        
        // Общее количество задач
        Promise.all([
          prisma.freepikTask.count(),
          prisma.midjourneyTask.count(),
          prisma.runwayTask.count()
        ]).then(counts => counts.reduce((sum, count) => sum + count, 0)),
        
        // Завершенные задачи
        Promise.all([
          prisma.freepikTask.count({ where: { status: 'COMPLETED' } }),
          prisma.midjourneyTask.count({ where: { status: 'completed' } }),
          prisma.runwayTask.count({ where: { status: 'COMPLETED' } })
        ]).then(counts => counts.reduce((sum, count) => sum + count, 0))
      ]);

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          growth: await this.calculateUserGrowth()
        },
        revenue: {
          total: totalPayments._sum.amount || 0,
          monthly: await this.getMonthlyRevenue(),
          growth: await this.calculateRevenueGrowth()
        },
        tokens: {
          spent: Math.abs(totalTokensSpent._sum.amount || 0),
          purchased: await this.getTotalTokensPurchased(),
          usage: await this.getTokenUsageByService()
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          successRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0,
          byService: await this.getTasksByService()
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0'
        }
      };

      res.json(stats);

    } catch (error) {
      logger.error('Failed to get dashboard stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает список пользователей с пагинацией
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as string || 'desc';

      const skip = (page - 1) * limit;

      // Строим условия поиска
      const where: any = {};
      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            phone: true,
            tokens: true,
            subscription: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                payments: true,
                tokenHistory: true,
                freepikTasks: true,
                midjourneyTasks: true,
                runwayTasks: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      logger.error('Failed to get users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает детальную информацию о пользователе
   */
  async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          tokenHistory: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          freepikTasks: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          midjourneyTasks: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          runwayTasks: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          auditLogs: {
            orderBy: { timestamp: 'desc' },
            take: 20
          }
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);

    } catch (error) {
      logger.error('Failed to get user details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Обновляет токены пользователя
   */
  async updateUserTokens(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const { tokens, reason } = req.body;

      if (typeof tokens !== 'number') {
        res.status(400).json({ error: 'Invalid tokens amount' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const balanceBefore = user.tokens;
      const balanceAfter = tokens;
      const difference = balanceAfter - balanceBefore;

      // Обновляем токены пользователя
      await prisma.user.update({
        where: { id: userId },
        data: { tokens: balanceAfter }
      });

      // Записываем в историю
      await prisma.tokenHistory.create({
        data: {
          userId,
          amount: difference,
          type: 'ADMIN_ADJUST',
          description: reason || 'Админская корректировка',
          balanceBefore,
          balanceAfter,
          metadata: {
            adminAction: true,
            reason
          }
        }
      });

      // Записываем в аудит лог
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'admin_token_adjustment',
          metadata: {
            balanceBefore,
            balanceAfter,
            difference,
            reason
          }
        }
      });

      logger.info('Admin token adjustment', {
        userId,
        balanceBefore,
        balanceAfter,
        difference,
        reason
      });

      res.json({ success: true, newBalance: balanceAfter });

    } catch (error) {
      logger.error('Failed to update user tokens:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает аналитику по платежам
   */
  async getPaymentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const period = req.query.period as string || '30d';
      const startDate = this.getStartDate(period);

      const [
        totalRevenue,
        paymentsByStatus,
        revenueByDay,
        topUsers
      ] = await Promise.all([
        // Общая выручка за период
        prisma.payment.aggregate({
          _sum: { amount: true },
          _count: true,
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startDate }
          }
        }),

        // Платежи по статусам
        prisma.payment.groupBy({
          by: ['status'],
          _count: true,
          _sum: { amount: true },
          where: { createdAt: { gte: startDate } }
        }),

        // Выручка по дням
        this.getRevenueByDay(startDate),

        // Топ пользователей по платежам
        prisma.payment.groupBy({
          by: ['userId'],
          _sum: { amount: true },
          _count: true,
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startDate }
          },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ]);

      res.json({
        totalRevenue: totalRevenue._sum.amount || 0,
        totalPayments: totalRevenue._count,
        paymentsByStatus,
        revenueByDay,
        topUsers
      });

    } catch (error) {
      logger.error('Failed to get payment analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает аналитику по использованию сервисов
   */
  async getServiceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const period = req.query.period as string || '30d';
      const startDate = this.getStartDate(period);

      const [
        freepikStats,
        midjourneyStats,
        runwayStats,
        tokenUsage
      ] = await Promise.all([
        // Статистика Freepik
        prisma.freepikTask.groupBy({
          by: ['status'],
          _count: true,
          where: { createdAt: { gte: startDate } }
        }),

        // Статистика Midjourney
        prisma.midjourneyTask.groupBy({
          by: ['status'],
          _count: true,
          where: { createdAt: { gte: startDate } }
        }),

        // Статистика Runway
        prisma.runwayTask.groupBy({
          by: ['status'],
          _count: true,
          where: { createdAt: { gte: startDate } }
        }),

        // Использование токенов по сервисам
        prisma.tokenHistory.groupBy({
          by: ['service'],
          _sum: { amount: true },
          _count: true,
          where: {
            amount: { lt: 0 },
            createdAt: { gte: startDate }
          }
        })
      ]);

      res.json({
        services: {
          freepik: freepikStats,
          midjourney: midjourneyStats,
          runway: runwayStats
        },
        tokenUsage
      });

    } catch (error) {
      logger.error('Failed to get service analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Вспомогательные методы

  private async calculateUserGrowth(): Promise<number> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    const [currentMonth, previousMonth] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: lastMonth } }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: twoMonthsAgo,
            lt: lastMonth
          }
        }
      })
    ]);

    if (previousMonth === 0) return 0;
    return ((currentMonth - previousMonth) / previousMonth * 100);
  }

  private async getMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth }
      }
    });

    return result._sum.amount || 0;
  }

  private async calculateRevenueGrowth(): Promise<number> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [currentRevenue, previousRevenue] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          createdAt: { gte: thisMonth }
        }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: lastMonth,
            lt: thisMonth
          }
        }
      })
    ]);

    const current = currentRevenue._sum.amount || 0;
    const previous = previousRevenue._sum.amount || 0;

    if (previous === 0) return 0;
    return ((current - previous) / previous * 100);
  }

  private async getTotalTokensPurchased(): Promise<number> {
    const result = await prisma.tokenHistory.aggregate({
      _sum: { amount: true },
      where: { amount: { gt: 0 } }
    });

    return result._sum.amount || 0;
  }

  private async getTokenUsageByService(): Promise<any> {
    return await prisma.tokenHistory.groupBy({
      by: ['service'],
      _sum: { amount: true },
      where: { amount: { lt: 0 } }
    });
  }

  private async getTasksByService(): Promise<any> {
    const [freepik, midjourney, runway] = await Promise.all([
      prisma.freepikTask.count(),
      prisma.midjourneyTask.count(),
      prisma.runwayTask.count()
    ]);

    return { freepik, midjourney, runway };
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private async getRevenueByDay(startDate: Date): Promise<any[]> {
    // Упрощенная версия - в реальности нужно группировать по дням
    return await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      select: {
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
