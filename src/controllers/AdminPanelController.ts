import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient";
import { logger } from "../utils/logger";

/**
 * 🔐 Админ-панель контроллер
 * Доступен только для пользователей с ролью ADMIN
 */

export class AdminPanelController {
  /**
   * 📊 Получить всех пользователей с пагинацией и фильтрами
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const subscription = req.query.subscription as string;
      
      const skip = (page - 1) * limit;
      
      // Построение фильтров
      const where: any = {};
      
      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { telegramId: isNaN(parseInt(search)) ? undefined : parseInt(search) }
        ].filter(f => f.telegramId !== undefined || f.username || f.firstName || f.lastName);
      }
      
      if (role) {
        where.role = role;
      }
      
      if (subscription) {
        where.subscription = subscription === 'none' ? null : subscription;
      }
      
      // Получение пользователей
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            tokens: true,
            subscription: true,
            subscriptionExpiresAt: true,
            friendsReferred: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                payments: true,
                tokenHistory: true,
                generationHistory: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);
      
      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error("Error getting all users:", error);
      res.status(500).json({ success: false, error: "Failed to get users" });
    }
  }

  /**
   * 👤 Получить подробную информацию о пользователе
   */
  static async getUserDetails(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          tokenHistory: {
            orderBy: { createdAt: 'desc' },
            take: 50
          },
          lavaSubscriptions: {
            orderBy: { createdAt: 'desc' }
          },
          generationHistory: {
            orderBy: { createdAt: 'desc' },
            take: 50
          },
          freepikTasks: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          midjourneyTasks: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          runwayTasks: {
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      });
      
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error("Error getting user details:", error);
      res.status(500).json({ success: false, error: "Failed to get user details" });
    }
  }

  /**
   * 💰 Получить все транзакции
   */
  static async getAllTransactions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;
      const userId = req.query.userId as string;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (status) where.status = status;
      if (userId) where.userId = userId;
      
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }),
        prisma.payment.count({ where })
      ]);
      
      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error("Error getting transactions:", error);
      res.status(500).json({ success: false, error: "Failed to get transactions" });
    }
  }

  /**
   * 📊 Получить общую статистику
   */
  static async getStatistics(req: Request, res: Response) {
    try {
      const [
        totalUsers,
        totalAdmins,
        activeSubscriptions,
        totalPayments,
        completedPayments,
        totalRevenue,
        totalTokensSpent,
        generationsToday,
        generationsTotal
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { subscription: { not: null } } }),
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'COMPLETED' } }),
        prisma.payment.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true }
        }),
        prisma.tokenHistory.aggregate({
          where: { amount: { lt: 0 } },
          _sum: { amount: true }
        }),
        prisma.generationHistory.count({
          where: {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }),
        prisma.generationHistory.count()
      ]);
      
      // Статистика по сервисам
      const serviceStats = await prisma.generationHistory.groupBy({
        by: ['service'],
        _count: { id: true },
        _sum: { tokensUsed: true }
      });
      
      // Статистика регистраций по дням (последние 30 дней)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const registrationsByDay = await prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: { id: true }
      });
      
      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            totalAdmins,
            activeSubscriptions,
            totalPayments,
            completedPayments,
            totalRevenue: totalRevenue._sum.amount || 0,
            totalTokensSpent: Math.abs(totalTokensSpent._sum.amount || 0),
            generationsToday,
            generationsTotal
          },
          serviceStats,
          registrationsByDay: registrationsByDay.map(day => ({
            date: day.createdAt,
            count: day._count.id
          }))
        }
      });
    } catch (error) {
      logger.error("Error getting statistics:", error);
      res.status(500).json({ success: false, error: "Failed to get statistics" });
    }
  }

  /**
   * ✏️ Обновить роль пользователя
   */
  static async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ success: false, error: "Invalid role" });
      }
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role }
      });
      
      logger.info(`Admin updated user ${userId} role to ${role}`);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error("Error updating user role:", error);
      res.status(500).json({ success: false, error: "Failed to update user role" });
    }
  }

  /**
   * 💎 Обновить токены пользователя (админская корректировка)
   */
  static async updateUserTokens(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { amount, description } = req.body;
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      
      const balanceBefore = user.tokens;
      const balanceAfter = balanceBefore + amount;
      
      // Обновляем токены и создаем запись в истории
      const [updatedUser, tokenHistory] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { tokens: balanceAfter }
        }),
        prisma.tokenHistory.create({
          data: {
            userId,
            amount,
            type: 'ADMIN_ADJUST',
            description: description || 'Admin adjustment',
            balanceBefore,
            balanceAfter
          }
        })
      ]);
      
      logger.info(`Admin adjusted tokens for user ${userId}: ${balanceBefore} → ${balanceAfter}`);
      
      res.json({
        success: true,
        data: {
          user: updatedUser,
          transaction: tokenHistory
        }
      });
    } catch (error) {
      logger.error("Error updating user tokens:", error);
      res.status(500).json({ success: false, error: "Failed to update tokens" });
    }
  }

  /**
   * 📝 Получить лог активности пользователя
   */
  static async getUserActivity(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' }
        }),
        prisma.auditLog.count({ where: { userId } })
      ]);
      
      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error("Error getting user activity:", error);
      res.status(500).json({ success: false, error: "Failed to get user activity" });
    }
  }
}

