import { Request, Response } from 'express';
import { LavaTopWebhookService } from '../services/LavaTopWebhookService';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

/**
 * Контроллер для обработки webhook'ов от Lava Top
 */
export class LavaTopController {
  private webhookService: LavaTopWebhookService | null = null;

  constructor() {
    // Создаем сервис только если есть секретный ключ
    if (process.env.LAVA_TOP_SECRET_KEY) {
      this.webhookService = new LavaTopWebhookService();
    } else {
      console.warn('⚠️ LAVA_TOP_SECRET_KEY not configured - LavaTop webhooks disabled');
    }
  }

  private getWebhookService(): LavaTopWebhookService {
    if (!this.webhookService) {
      throw new Error('LavaTop service is not configured');
    }
    return this.webhookService;
  }

  /**
   * Обработка webhook'а от Lava Top
   * POST /api/webhooks/lava-top
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      // Проверяем, что сервис доступен
      if (!this.webhookService) {
        res.status(503).json({ error: 'LavaTop service not configured' });
        return;
      }

      const webhookData = req.body;
      
      logger.info('Received Lava Top webhook:', {
        id: webhookData.id,
        status: webhookData.status,
        orderId: webhookData.orderId,
        amount: webhookData.amount
      });

      // Проверяем обязательные поля
      if (!webhookData.id || !webhookData.status || !webhookData.orderId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const service = this.getWebhookService();
      
      // Обрабатываем в зависимости от статуса
      if (webhookData.status === 'success') {
        await service.handleSuccessfulPayment(webhookData);
      } else if (webhookData.status === 'fail') {
        await service.handleFailedPayment(webhookData);
      } else {
        logger.warn('Unknown payment status:', webhookData.status);
      }

      // Отвечаем успехом (обязательно для Lava Top)
      res.status(200).json({ success: true });
      
    } catch (error) {
      logger.error('Error processing Lava Top webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Создание платежа для подписки
   * POST /api/payment/lava/subscription
   */
  async createSubscriptionPayment(req: Request, res: Response) {
    try {
      const { plan, duration = 30 } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!plan || !['basic', 'pro', 'premium'].includes(plan)) {
        res.status(400).json({ error: 'Invalid subscription plan' });
        return;
      }

      // Получаем пользователя для telegramId
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Цены планов
      const prices = {
        basic: { rub: 920, usd: 10, eur: 9.5 },
        pro: { rub: 2760, usd: 30, eur: 28.5 },
        premium: { rub: 4600, usd: 50, eur: 47.5 }
      };

      const planPrice = prices[plan as keyof typeof prices];
      const orderId = `sub_${plan}_${user.telegramId}_${Date.now()}`;

      // Здесь должна быть интеграция с Lava Top API
      // Пока возвращаем мок-данные
      const paymentData = {
        success: true,
        paymentId: `lava_${Date.now()}`,
        paymentUrl: `https://pay.lava.ru/invoice/${orderId}`,
        amount: planPrice.rub,
        currency: 'RUB',
        orderId
      };

      res.json(paymentData);
      
    } catch (error) {
      logger.error('Error creating subscription payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Создание платежа для токенов
   * POST /api/payment/lava/tokens
   */
  async createTokenPayment(req: Request, res: Response) {
    try {
      const { amount } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'Invalid token amount' });
        return;
      }

      // Получаем пользователя для telegramId
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Курс: 1 рубль = 10 токенов
      const price = Math.ceil(amount / 10);
      const orderId = `tokens_${amount}_${user.telegramId}_${Date.now()}`;

      // Здесь должна быть интеграция с Lava Top API
      // Пока возвращаем мок-данные
      const paymentData = {
        success: true,
        paymentId: `lava_${Date.now()}`,
        paymentUrl: `https://pay.lava.ru/invoice/${orderId}`,
        amount: price,
        currency: 'RUB',
        orderId
      };

      res.json(paymentData);
      
    } catch (error) {
      logger.error('Error creating token payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получение статуса платежа
   * GET /api/payment/lava/status/:paymentId
   */
  async getPaymentStatus(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        res.status(400).json({ error: 'Payment ID is required' });
        return;
      }

      // Ищем платеж в базе данных
      const payment = await prisma.payment.findFirst({
        where: { providerId: paymentId }
      });

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      res.json({
        id: payment.providerId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt
      });
      
    } catch (error) {
      logger.error('Error getting payment status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
