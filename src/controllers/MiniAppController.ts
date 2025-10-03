import { Request, Response } from 'express';
import { TelegramAuthService } from '../services/TelegramAuthService';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

/**
 * Controller для Telegram Mini App
 */
export class MiniAppController {
  private authService: TelegramAuthService;

  constructor() {
    this.authService = new TelegramAuthService();
  }

  /**
   * Аутентификация пользователя через Telegram WebApp
   */
  async authenticate(req: Request, res: Response) {
    try {
      const { initData } = req.body;

      if (!initData) {
        return res.status(400).json({
          success: false,
          error: 'initData is required'
        });
      }

      // Аутентифицируем пользователя
      const result = await this.authService.authenticateUser(initData);

      // Добавляем IP и UserAgent в лог
      await prisma.activityLog.updateMany({
        where: {
          userId: result.user.id,
          action: 'LOGIN',
          ip: null
        },
        data: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });

      res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            telegramId: result.user.telegramId,
            username: result.user.username,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            photoUrl: result.user.photoUrl,
            isPremium: result.user.isPremium,
            balance: result.user.balance,
            profile: result.user.profile,
            subscription: result.user.subscription
          },
          sessionToken: result.sessionToken
        }
      });
    } catch (error: any) {
      logger.error('Authentication error:', error);
      res.status(401).json({
        success: false,
        error: error.message || 'Authentication failed'
      });
    }
  }

  /**
   * Получение профиля пользователя
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          balance: true,
          profile: true,
          subscription: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: user.photoUrl,
            isPremium: user.isPremium,
            balance: user.balance,
            profile: user.profile,
            subscription: user.subscription
          }
        }
      });
    } catch (error: any) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  /**
   * Обновление профиля пользователя
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { bio, location, website, preferences } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Обновляем профиль
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          bio,
          location,
          website,
          profile: {
            update: {
              preferences: preferences || {}
            }
          }
        },
        include: {
          balance: true,
          profile: true,
          subscription: true
        }
      });

      res.json({
        success: true,
        data: {
          user: updatedUser
        }
      });
    } catch (error: any) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  /**
   * Получение баланса пользователя
   */
  async getBalance(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const balance = await prisma.balance.findUnique({
        where: { userId }
      });

      if (!balance) {
        return res.status(404).json({
          success: false,
          error: 'Balance not found'
        });
      }

      res.json({
        success: true,
        data: {
          balance: {
            total: balance.tokens,
            free: balance.freeTokens,
            paid: balance.paidTokens,
            spent: balance.totalSpent
          }
        }
      });
    } catch (error: any) {
      logger.error('Get balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get balance'
      });
    }
  }

  /**
   * Получение истории генераций
   */
  async getHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { service, limit = 20, offset = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const where: any = { userId };
      if (service) {
        where.service = service as string;
      }

      const history = await prisma.generationHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.generationHistory.count({ where });

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset)
          }
        }
      });
    } catch (error: any) {
      logger.error('Get history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get history'
      });
    }
  }

  /**
   * Получение истории транзакций токенов
   */
  async getTokenHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { type, limit = 20, offset = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const where: any = { userId };
      if (type) {
        where.type = type as string;
      }

      const transactions = await prisma.tokenHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.tokenHistory.count({ where });

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset)
          }
        }
      });
    } catch (error: any) {
      logger.error('Get token history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get token history'
      });
    }
  }

  /**
   * Получение статистики пользователя
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Получаем статистику по генерациям
      const generationStats = await prisma.generationHistory.groupBy({
        by: ['service'],
        where: { userId },
        _count: true,
        _sum: {
          tokensUsed: true
        }
      });

      // Получаем статистику по тратам
      const spendingStats = await prisma.tokenHistory.groupBy({
        by: ['type'],
        where: { 
          userId,
          amount: { lt: 0 } // Только траты
        },
        _sum: {
          amount: true
        }
      });

      // Получаем общую статистику
      const totalGenerations = await prisma.generationHistory.count({
        where: { userId }
      });

      const balance = await prisma.balance.findUnique({
        where: { userId }
      });

      res.json({
        success: true,
        data: {
          stats: {
            totalGenerations,
            totalTokensSpent: balance?.totalSpent || 0,
            currentBalance: balance?.tokens || 0,
            generationsByService: generationStats,
            spendingByType: spendingStats
          }
        }
      });
    } catch (error: any) {
      logger.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get stats'
      });
    }
  }
}
