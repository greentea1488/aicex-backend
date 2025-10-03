import { Request, Response } from 'express';
import { LavaTopWebhookService } from '../services/LavaTopWebhookService';
import { lavaTopAPI } from '../services/LavaTopAPIService';
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

  /**
   * Обработка webhook'а от Lava Top
   * POST /api/webhooks/lava-top
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const webhookData = req.body;
      
      logger.info('Received Lava Top webhook:', {
        eventType: webhookData.eventType,
        status: webhookData.status,
        contractId: webhookData.contractId,
        amount: webhookData.amount
      });

      // Обрабатываем события подписок
      if (webhookData.eventType === 'PURCHASE_COMPLETED' && webhookData.status === 'PAID') {
        await this.handleSubscriptionActivation(webhookData);
      } else if (webhookData.eventType === 'SUBSCRIPTION_RENEWED') {
        await this.handleSubscriptionRenewal(webhookData);
      } else {
        logger.warn('Unknown webhook event:', webhookData.eventType);
      }

      // Отвечаем успехом (обязательно для Lava Top)
      res.status(200).json({ success: true });
      
    } catch (error) {
      logger.error('Error processing Lava Top webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Обработка активации подписки
   */
  private async handleSubscriptionActivation(webhookData: any) {
    try {
      const { buyer, product, amount, currency } = webhookData;
      
      // Определяем план подписки по названию продукта
      let plan = 'basic';
      if (product.name.includes('Pro')) plan = 'pro';
      if (product.name.includes('Premium')) plan = 'premium';

      // Находим пользователя по email
      const user = await prisma.user.findFirst({
        where: { email: buyer.email }
      });

      if (!user) {
        logger.error('User not found for email:', buyer.email);
        return;
      }

      // Активируем подписку
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          plan: plan,
          status: 'active',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          plan: plan,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
          features: {}
        }
      });

      // Начисляем токены согласно плану
      const tokenAmounts = { basic: 1000, pro: 5000, premium: 15000 };
      const tokens = tokenAmounts[plan as keyof typeof tokenAmounts];

      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: tokens } }
      });

      logger.info('Subscription activated:', { userId: user.id, plan, tokens });
    } catch (error) {
      logger.error('Error activating subscription:', error);
    }
  }

  /**
   * Обработка продления подписки
   */
  private async handleSubscriptionRenewal(webhookData: any) {
    try {
      const { buyer } = webhookData;
      
      // Находим пользователя по email
      const user = await prisma.user.findFirst({
        where: { email: buyer.email }
      });

      if (!user) {
        logger.error('User not found for renewal:', buyer.email);
        return;
      }

      // Продлеваем подписку на месяц
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
          updatedAt: new Date()
        }
      });

      logger.info('Subscription renewed:', { userId: user.id });
    } catch (error) {
      logger.error('Error renewing subscription:', error);
    }
  }

  /**
   * Создание платежа для подписки
   * POST /api/lava-top/subscription
   */
  async createSubscriptionPayment(req: Request, res: Response) {
    try {
      const { plan } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!plan || !['basic', 'pro', 'premium'].includes(plan)) {
        res.status(400).json({ error: 'Invalid subscription plan' });
        return;
      }

      // Получаем пользователя для email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, telegramId: true }
      });

      if (!user || !user.email) {
        res.status(404).json({ error: 'User not found or email not set' });
        return;
      }
      // Создаем платеж через Lava.top API
      const paymentResult = await lavaTopAPI.createSubscriptionInvoice(plan, user.email);
      
      if (!paymentResult.success) {
        res.status(500).json({ error: paymentResult.error });
        return;
      }

      const paymentData = {
        success: true,
        paymentUrl: paymentResult.paymentUrl,
        invoiceId: paymentResult.invoiceId,
        plan: plan,
        amount: lavaTopAPI.getAvailablePlans()[plan as keyof ReturnType<typeof lavaTopAPI.getAvailablePlans>].price,
        currency: 'RUB'
      };

      logger.info('Subscription payment created:', paymentData);
      res.json(paymentData);
      
    } catch (error) {
      logger.error('Error creating subscription payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получение доступных планов подписок
   * GET /api/lava-top/plans
   */
  async getSubscriptionPlans(req: Request, res: Response) {
    try {
      const plans = lavaTopAPI.getAvailablePlans();
      res.json({ success: true, plans });
    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Получение статуса инвойса
   * GET /api/lava-top/status/:invoiceId
   */
  async getInvoiceStatus(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;

      if (!invoiceId) {
        res.status(400).json({ error: 'Invoice ID is required' });
        return;
      }

      const status = await lavaTopAPI.getInvoiceStatus(invoiceId);
      res.json({ success: true, status });
      
    } catch (error) {
      logger.error('Error getting invoice status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
