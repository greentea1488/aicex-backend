import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import { PaymentService } from '../services/PaymentService';
import { MidjourneyAPIService } from '../services/MidjourneyAPIService';
import { KlingAPIService } from '../services/KlingAPIService';
import { UserService } from '../services/UserService';
import { ReferralService } from '../services/ReferralService';
import { createAuthToken } from '../middlewares/auth';

export class UserAPIController {
  private paymentService: PaymentService;
  private midjourneyService: MidjourneyAPIService;
  private klingService: KlingAPIService;

  constructor() {
    this.paymentService = new PaymentService();
    this.midjourneyService = new MidjourneyAPIService();
    this.klingService = new KlingAPIService();
  }

  /**
   * Авторизация через Telegram
   */
  async telegramAuth(req: Request, res: Response): Promise<void> {
    try {
      const { initData } = req.body;

      if (!initData) {
        res.status(400).json({ error: 'Init data required' });
        return;
      }

      // Парсим данные от Telegram
      const urlParams = new URLSearchParams(initData);
      const userParam = urlParams.get('user');
      
      if (!userParam) {
        res.status(400).json({ error: 'User data not found' });
        return;
      }

      const userData = JSON.parse(userParam);

      // Используем единый сервис для создания/поиска пользователя
      const user = await UserService.findOrCreateUser(userData);

      // Создаем JWT токен
      const token = createAuthToken(user.id, user.telegramId);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          tokens: user.tokens,
          subscription: user.subscription
        }
      });

    } catch (error) {
      logger.error('Telegram auth error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает профиль пользователя
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
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
          appSettings: true,
          gptSettings: true,
          midjourneySettings: true,
          runwaySettings: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Обновляет профиль пользователя
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, email } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phone: email // Используем email как phone для совместимости
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          tokens: true,
          subscription: true
        }
      });

      res.json(user);

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает баланс токенов
   */
  async getTokenBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      console.log('==================== GET TOKEN BALANCE ====================');
      console.log('User ID:', userId);
      console.log('Headers:', req.headers);
      console.log('===============================================================');

      if (!userId) {
        console.log('❌ User not authenticated');
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tokens: true }
      });

      if (!user) {
        console.log('❌ User not found in database');
        res.status(404).json({ error: 'User not found' });
        return;
      }

      console.log('✅ User found, tokens:', user.tokens);
      res.json({ tokens: user.tokens });

    } catch (error) {
      logger.error('Get token balance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает историю токенов
   */
  async getTokenHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      console.log('==================== GET TOKEN HISTORY ====================');
      console.log('User ID:', userId);
      console.log('Page:', page);
      console.log('Limit:', limit);
      console.log('Headers:', req.headers);
      console.log('===============================================================');

      logger.info('Token history request:', {
        userId,
        page,
        limit,
        user: req.user
      });

      if (!userId) {
        logger.warn('User not authenticated for token history');
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const skip = (page - 1) * limit;

      const [history, total] = await Promise.all([
        prisma.tokenHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.tokenHistory.count({ where: { userId } })
      ]);

      console.log('✅ Token history found:', {
        userId,
        historyCount: history.length,
        total,
        history: history.map(h => ({
          id: h.id,
          amount: h.amount,
          type: h.type,
          service: h.service,
          createdAt: h.createdAt
        }))
      });

      logger.info('Token history result:', {
        userId,
        historyCount: history.length,
        total,
        history: history.map(h => ({
          id: h.id,
          amount: h.amount,
          type: h.type,
          service: h.service,
          createdAt: h.createdAt
        }))
      });

      res.json({
        history,
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
      logger.error('Get token history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Создает платеж
   */
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { packageId } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Получаем пакет токенов
      const packages = this.paymentService.getTokenPackages();
      const selectedPackage = packages.find(p => p.id === packageId);

      if (!selectedPackage) {
        res.status(400).json({ error: 'Invalid package' });
        return;
      }

      const totalTokens = selectedPackage.tokens + (selectedPackage.bonus || 0);

      const paymentResponse = await this.paymentService.createPayment({
        userId,
        amount: selectedPackage.price,
        tokensAmount: totalTokens,
        description: `Покупка пакета "${selectedPackage.name}"`
      });

      res.json(paymentResponse);

    } catch (error) {
      logger.error('Create payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает доступные пакеты токенов
   */
  async getTokenPackages(req: Request, res: Response): Promise<void> {
    try {
      const packages = this.paymentService.getTokenPackages();
      res.json({ packages });

    } catch (error) {
      logger.error('Get token packages error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает историю платежей
   */
  async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const payments = await this.paymentService.getUserPayments(userId, limit);
      res.json({ payments });

    } catch (error) {
      logger.error('Get payment history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Генерирует изображение через Midjourney
   */
  async generateMidjourneyImage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const telegramId = req.user?.telegramId;
      const { prompt, model, style, aspect_ratio, quality } = req.body;

      if (!userId || !telegramId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const result = await this.midjourneyService.generateImage({
        prompt,
        model,
        style,
        aspect_ratio,
        quality,
        userId: telegramId,
        telegramId
      });

      res.json(result);

    } catch (error) {
      logger.error('Midjourney generation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Генерирует видео через Kling
   */
  async generateKlingVideo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const telegramId = req.user?.telegramId;
      const { prompt, duration, aspect_ratio } = req.body;

      if (!userId || !telegramId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Валидируем промпт
      const validation = this.klingService.validatePrompt(prompt);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const result = await this.klingService.generateVideo({
        prompt,
        duration,
        aspect_ratio,
        userId: telegramId,
        telegramId
      });

      res.json(result);

    } catch (error) {
      logger.error('Kling generation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает историю генераций из всех сервисов
   */
  async getGenerationHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const service = req.query.service as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      console.log('==================== GET GENERATION HISTORY ====================');
      console.log('User ID:', userId);
      console.log('Service:', service);
      console.log('Page:', page);
      console.log('Limit:', limit);
      console.log('===============================================================');

      if (!userId) {
        console.log('❌ User not authenticated');
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const skip = (page - 1) * limit;
      const allGenerations: any[] = [];

      // Получаем данные из всех таблиц генераций
      const queries: Promise<any>[] = [];

      // Freepik tasks
      if (!service || service === 'freepik' || service === 'all') {
        queries.push(
          prisma.freepikTask.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              prompt: true,
              imageUrl: true,
              status: true,
              cost: true,
              createdAt: true,
              model: true
            }
          })
        );
      }

      // Midjourney tasks
      if (!service || service === 'midjourney' || service === 'all') {
        queries.push(
          prisma.midjourneyTask.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              prompt: true,
              imageUrl: true,
              status: true,
              cost: true,
              createdAt: true,
              model: true
            }
          })
        );
      }

      // Runway tasks
      if (!service || service === 'runway' || service === 'all') {
        queries.push(
          prisma.runwayTask.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              prompt: true,
              videoUrl: true,
              status: true,
              cost: true,
              createdAt: true
            }
          })
        );
      }

      // Выполняем все запросы параллельно
      const results = await Promise.all(queries);

      // Объединяем результаты и добавляем метаданные
      results.forEach((tasks, index) => {
        const serviceName = index === 0 ? 'freepik' : index === 1 ? 'midjourney' : 'runway';
        const type = serviceName === 'runway' ? 'video' : 'image';
        
        tasks.forEach((task: any) => {
          allGenerations.push({
            id: task.id,
            service: serviceName,
            type: type,
            prompt: task.prompt,
            resultUrl: task.imageUrl || task.videoUrl,
            tokensUsed: task.cost || 0,
            status: task.status,
            createdAt: task.createdAt,
            model: task.model || null
          });
        });
      });

      // Сортируем по дате создания (новые сначала)
      allGenerations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Применяем пагинацию
      const total = allGenerations.length;
      const paginatedGenerations = allGenerations.slice(skip, skip + limit);

      console.log('==================== GENERATION HISTORY RESULT ====================');
      console.log('Total generations:', total);
      console.log('History count:', paginatedGenerations.length);
      console.log('Services:', ['freepik', 'midjourney', 'runway'].filter((_, i) => results[i]?.length > 0));
      console.log('===============================================================');

      logger.info('Generation history fetched:', {
        userId,
        service,
        page,
        limit,
        total,
        historyCount: paginatedGenerations.length,
        servicesUsed: ['freepik', 'midjourney', 'runway']
      });

      res.json({
        history: paginatedGenerations,
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
      logger.error('Get generation history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает статистику пользователя
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      console.log('==================== GET USER STATS ====================');
      console.log('User ID:', userId);
      console.log('Headers:', req.headers);
      console.log('===============================================================');

      if (!userId) {
        console.log('❌ User not authenticated');
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Получаем пользователя
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          tokens: true,
          createdAt: true,
          subscription: true,
          friendsReferred: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Считаем общее количество генераций
      const totalGenerations = await prisma.generationHistory.count({
        where: { userId }
      });

      // Считаем потраченные токены (отрицательные транзакции)
      const tokenHistory = await prisma.tokenHistory.findMany({
        where: { 
          userId,
          amount: { lt: 0 }
        },
        select: { amount: true }
      });

      const tokensSpent = tokenHistory.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Получаем последнюю генерацию
      const lastGeneration = await prisma.generationHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          service: true,
          createdAt: true
        }
      });

      // Считаем генерации по сервисам
      const generationsByService = await prisma.generationHistory.groupBy({
        by: ['service'],
        where: { userId },
        _count: { service: true }
      });

      const favoriteService = generationsByService.length > 0
        ? generationsByService.reduce((max, curr) => 
            curr._count.service > max._count.service ? curr : max
          ).service
        : 'Нет';

      console.log('==================== USER STATS RESULT ====================');
      console.log('Total generations:', totalGenerations);
      console.log('Tokens spent:', tokensSpent);
      console.log('Current balance:', user.tokens);
      console.log('Last generation:', lastGeneration);
      console.log('Favorite service:', favoriteService);
      console.log('===============================================================');

      logger.info('User stats fetched:', {
        userId,
        totalGenerations,
        tokensSpent,
        currentBalance: user.tokens
      });

      res.json({
        success: true,
        data: {
          tokens: user.tokens,
          totalGenerations,
          tokensSpent,
          lastGeneration: lastGeneration?.createdAt,
          favoriteService,
          memberSince: user.createdAt,
          subscription: user.subscription,
          referrals: user.friendsReferred
        }
      });

    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Загружает аватарку пользователя
   */
  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { avatarUrl } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!avatarUrl) {
        res.status(400).json({ error: 'Avatar URL is required' });
        return;
      }

      console.log('==================== UPLOAD AVATAR ====================');
      console.log('User ID:', userId);
      console.log('Avatar URL:', avatarUrl);
      console.log('===============================================================');

      // Обновляем аватарку пользователя
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: avatarUrl },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          telegramId: true
        }
      });

      logger.info('Avatar uploaded successfully:', {
        userId,
        avatarUrl,
        updatedUser
      });

      res.json({
        success: true,
        user: updatedUser
      });

    } catch (error) {
      logger.error('Upload avatar error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получает доступные модели и настройки
   */
  async getServiceOptions(req: Request, res: Response): Promise<void> {
    try {
      const service = req.params.service;

      let options: any = {};

      switch (service) {
        case 'midjourney':
          options = {
            models: this.midjourneyService.getAvailableModels(),
            styles: this.midjourneyService.getAvailableStyles(),
            aspectRatios: this.midjourneyService.getAvailableAspectRatios(),
            quality: this.midjourneyService.getAvailableQuality()
          };
          break;

        case 'kling':
          options = {
            durations: this.klingService.getAvailableDurations(),
            aspectRatios: this.klingService.getAvailableAspectRatios(),
            examples: this.klingService.getPromptExamples()
          };
          break;

        default:
          res.status(400).json({ error: 'Invalid service' });
          return;
      }

      res.json(options);

    } catch (error) {
      logger.error('Get service options error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получить реферальную статистику пользователя
   */
  async getReferralStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await ReferralService.getReferralStats(userId);

      if (!stats) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(stats);

    } catch (error) {
      logger.error('Get referral stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получить список рефералов пользователя
   */
  async getReferralList(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { page = 1, limit = 20 } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [referrals, totalCount] = await Promise.all([
        prisma.user.findMany({
          where: { referral: userId },
          select: {
            id: true,
            username: true,
            firstName: true,
            createdAt: true,
            tokens: true
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({
          where: { referral: userId }
        })
      ]);

      res.json({
        referrals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      });

    } catch (error) {
      logger.error('Get referral list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
