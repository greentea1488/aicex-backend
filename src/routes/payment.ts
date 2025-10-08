import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from "../middlewares/auth";
import { createLavaSubscription as createLavaSubscriptionNew } from '../controllers/lavaController';
import { logger } from '../utils/logger';
import { 
  createLavaSubscription,
  getSubscriptionStatus,
  cancelSubscription
} from '../controllers/lavaSubscriptionController';
const prisma = new PrismaClient();
const router = Router();

// Логирование всех запросов к payment API
router.use((req, res, next) => {
  logger.info('Payment route accessed', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    hasBody: !!req.body,
    hasQuery: Object.keys(req.query).length > 0
  });
  next();
});

// Простая функция для планов подписки
const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'free',
        displayName: 'Бесплатный',
        description: 'Базовые функции',
        price: { rub: 0, usd: 0, eur: 0 },
        tokens: 10,
        features: ['10 токенов в день', 'Базовые модели AI']
      },
      {
        id: 'basic', 
        name: 'basic',
        displayName: 'Базовый',
        description: 'Для начинающих',
        price: { rub: 499, usd: 5, eur: 4 },
        tokens: 1000,
        features: ['1000 токенов', 'Все модели AI', 'Приоритетная поддержка']
      },
      {
        id: 'pro',
        name: 'pro', 
        displayName: 'Профессиональный',
        description: 'Для профессионалов',
        price: { rub: 1499, usd: 15, eur: 13 },
        tokens: 5000,
        features: ['5000 токенов', 'Премиум модели', 'Без ограничений', 'VIP поддержка']
      },
      {
        id: 'premium',
        name: 'premium',
        displayName: 'Премиум', 
        description: 'Максимальные возможности',
        price: { rub: 2999, usd: 30, eur: 25 },
        tokens: 15000,
        features: ['15000 токенов', 'Все функции', 'Индивидуальная поддержка', 'Ранний доступ']
      }
    ];
    
    logger.info('Sending subscription plans', { count: plans.length });
    res.json(plans); // Фронтенд ожидает массив напрямую
  } catch (error) {
    logger.error('Error getting subscription plans', { error });
    res.status(500).json({ success: false, error: 'Failed to get plans' });
  }
};

// Public routes
router.get("/subscription/plans", getSubscriptionPlans);

// NEW безопасный LAVA контроллер для отладки
router.post("/lava-safe/subscription", (req, res, next) => {
  logger.info('Lava-safe route hit', {
    method: req.method,
    path: req.path,
    hasAuth: !!req.headers.authorization,
    userId: req.body?.userId
  });
  next();
}, createLavaSubscriptionNew);

// Test endpoint
router.get("/lava-safe/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "LAVA Safe endpoint is accessible",
    timestamp: new Date().toISOString()
  });
});

// Protected routes
router.use(authMiddleware);

// Payment routes  
// router.post("/create", createPayment); // ВРЕМЕННО отключено

// История платежей
router.get("/history", async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        tokensAdded: true,
        description: true
      }
    });

    res.json({ payments });
  } catch (error) {
    logger.error('Get payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// История токенов
router.get("/tokens/history", async (req, res) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
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
});

// Новый LAVA Recurrent API
router.post('/lava/subscription', createLavaSubscription);
router.get('/lava/subscription/:orderId/status', getSubscriptionStatus);
router.post('/lava/subscription/:orderId/cancel', cancelSubscription);

export default router;
