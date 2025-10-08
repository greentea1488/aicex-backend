import { LavaClient, WebhookHandler, Currency, Periodicity } from 'lava-top-sdk';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import crypto from 'crypto';

export interface LavaSubscriptionRequest {
  plan: string;
  userEmail: string;
  userId: string;
}

export interface LavaSubscriptionResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

export class LavaTopSDKService {
  private client: LavaClient;
  private webhookHandler: WebhookHandler;
  private webhookSecret: string;

  constructor() {
    const apiKey = process.env.LAVA_API_KEY;
    const webhookSecret = process.env.LAVA_TOP_WEBHOOK_SECRET;
    
    if (!apiKey) {
      throw new Error('LAVA_API_KEY is required');
    }

    // Генерируем или используем webhook secret
    this.webhookSecret = webhookSecret || this.generateWebhookSecret();

    // Инициализируем клиент согласно реальной документации SDK
    this.client = new LavaClient({
      apiKey: apiKey,
      baseURL: 'https://gate.lava.top',
      webhookSecretKey: this.webhookSecret
    });
    
    // Инициализируем webhook handler с секретом
    this.webhookHandler = new WebhookHandler(this.webhookSecret);

    logger.info('LavaTop SDK Service initialized', {
      hasApiKey: !!apiKey,
      hasWebhookSecret: !!webhookSecret,
      generatedSecret: !webhookSecret,
      webhookSecretPreview: this.webhookSecret.substring(0, 8) + '...'
    });
  }

  /**
   * Генерирует webhook secret согласно документации Lava.top
   */
  private generateWebhookSecret(): string {
    const secret = crypto.randomBytes(32).toString('hex');
    logger.info('🔑 Generated new webhook secret:', secret);
    logger.warn('⚠️ Please add this to your environment variables as LAVA_TOP_WEBHOOK_SECRET');
    return secret;
  }

  /**
   * Создает подписку через официальный SDK
   */
  async createSubscription(request: LavaSubscriptionRequest): Promise<LavaSubscriptionResponse> {
    try {
      logger.info('🔍 LAVA SDK: Creating subscription', { plan: request.plan });

      // Получаем план подписки из БД
      const subscriptionPlan = await (prisma as any).subscriptionPlan.findUnique({
        where: { name: request.plan }
      });

      if (!subscriptionPlan) {
        logger.error('Subscription plan not found', { plan: request.plan });
        return {
          success: false,
          error: 'Subscription plan not found'
        };
      }

      // Создаем уникальный email для пользователя
      const userEmail = `user${Date.now()}@aicex.bot`;
      
      logger.info('🔍 LAVA SDK: Creating subscription with parameters', {
        email: userEmail,
        offerId: subscriptionPlan.lavaOfferId,
        currency: Currency.RUB,
        periodicity: Periodicity.MONTHLY
      });

      // Создаем подписку через SDK согласно реальному API
      const response = await this.client.createSubscription(
        userEmail,                          // email
        subscriptionPlan.lavaOfferId,       // offerId
        Currency.RUB,                       // currency
        Periodicity.MONTHLY                 // periodicity для подписки
      );

      logger.info('🔍 LAVA SDK: Response received', {
        success: !!response.id,
        invoiceId: response.id,
        status: response.status,
        hasPaymentUrl: !!response.paymentUrl
      });

      if (response.id && response.paymentUrl) {
        // Сохраняем информацию о платеже в БД
        await prisma.payment.create({
          data: {
            userId: request.userId,
            amount: subscriptionPlan.priceRub,
            currency: 'RUB',
            status: 'PENDING',
            metadata: JSON.stringify({
              lavaInvoiceId: response.id,
              offerId: subscriptionPlan.lavaOfferId,
              userEmail: userEmail,
              plan: request.plan,
              planId: subscriptionPlan.id,
              webhookSecret: this.webhookSecret
            })
          }
        });

        return {
          success: true,
          paymentId: response.id,
          paymentUrl: response.paymentUrl
        };
      } else {
        logger.error('Invalid response from Lava.top SDK', response);
        return {
          success: false,
          error: 'Invalid response from payment provider'
        };
      }

    } catch (error: any) {
      logger.error('Error creating Lava subscription via SDK:', error);
      return {
        success: false,
        error: error.message || 'Payment creation failed'
      };
    }
  }

  /**
   * Обрабатывает webhook события от Lava.top через SDK
   */
  async handleWebhook(req: any): Promise<boolean> {
    try {
      logger.info('🔍 LAVA SDK WEBHOOK: Processing via official SDK');

      // Проверяем подпись webhook через SDK
      const signature = req.headers['x-lava-signature'] || req.headers['x-api-key'];
      const isValid = this.client.verifyWebhookSignature(req.body, signature, this.webhookSecret);
      
      if (!isValid) {
        logger.error('❌ Invalid webhook signature from Lava.top');
        return false;
      }

      const webhookData = req.body;
      
      logger.info('✅ LAVA SDK WEBHOOK: Signature verified', {
        type: webhookData.type,
        id: webhookData.id,
        status: webhookData.status,
        amount: webhookData.amountTotal?.amount
      });

      // Обрабатываем разные типы событий
      switch (webhookData.type) {
        case 'payment.success':
          return await this.handlePaymentSuccess(webhookData);
        
        case 'payment.failed':
          return await this.handlePaymentFailed(webhookData);
        
        case 'subscription.recurring.payment.success':
          return await this.handleRecurringSuccess(webhookData);
        
        case 'subscription.recurring.payment.failed':
          return await this.handleRecurringFailed(webhookData);
        
        case 'subscription.cancelled':
          return await this.handleSubscriptionCancelled(webhookData);
        
        default:
          logger.warn('Unknown webhook event type', { type: webhookData.type });
          return true;
      }

    } catch (error) {
      logger.error('Error processing Lava SDK webhook:', error);
      return false;
    }
  }

  /**
   * Обрабатывает успешный платеж
   */
  private async handlePaymentSuccess(webhookData: any): Promise<boolean> {
    try {
      logger.info('✅ LAVA SDK: Processing successful payment', {
        invoiceId: webhookData.id,
        amount: webhookData.amountTotal?.amount
      });

      // Находим платеж в БД по ID из webhook (success)
      const payment = await (prisma as any).payment.findFirst({
        where: {
          metadata: {
            contains: String(webhookData.id)
          }
        }
      });

      if (payment) {
        // Обновляем статус платежа
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' }
        });

        logger.info('✅ Payment marked as completed', {
          paymentId: payment.id,
          userId: payment.userId
        });
      }

      return true;
    } catch (error) {
      logger.error('Error handling payment success:', error);
      return false;
    }
  }

  /**
   * Обрабатывает неуспешный платеж
   */
  private async handlePaymentFailed(webhookData: any): Promise<boolean> {
    try {
      logger.info('❌ LAVA SDK: Processing failed payment', {
        invoiceId: webhookData.id
      });

      // Находим платеж в БД по ID из webhook (failed)
      const payment = await (prisma as any).payment.findFirst({
        where: {
          metadata: {
            contains: String(webhookData.id)
          }
        }
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' }
        });
      }

      return true;
    } catch (error) {
      logger.error('Error handling payment failure:', error);
      return false;
    }
  }

  /**
   * Обрабатывает успешное продление подписки
   */
  private async handleRecurringSuccess(webhookData: any): Promise<boolean> {
    try {
      logger.info('🔄 LAVA SDK: Processing recurring payment success', {
        invoiceId: webhookData.id
      });
      return true;
    } catch (error) {
      logger.error('Error handling recurring success:', error);
      return false;
    }
  }

  /**
   * Обрабатывает неуспешное продление подписки
   */
  private async handleRecurringFailed(webhookData: any): Promise<boolean> {
    try {
      logger.warn('⚠️ LAVA SDK: Recurring payment failed', {
        invoiceId: webhookData.id
      });
      return true;
    } catch (error) {
      logger.error('Error handling recurring failure:', error);
      return false;
    }
  }

  /**
   * Обрабатывает отмену подписки
   */
  private async handleSubscriptionCancelled(webhookData: any): Promise<boolean> {
    try {
      logger.info('🚫 LAVA SDK: Subscription cancelled', {
        invoiceId: webhookData.id
      });
      return true;
    } catch (error) {
      logger.error('Error handling subscription cancellation:', error);
      return false;
    }
  }

  /**
   * Получает webhook secret для настройки в Lava.top
   */
  getWebhookSecret(): string {
    return this.webhookSecret;
  }

  /**
   * Проверяет статус платежа через SDK
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      // Временно возвращаем заглушку
      logger.info('Getting payment status for:', paymentId);
      return { id: paymentId, status: 'unknown' };
    } catch (error) {
      logger.error('Error getting payment status via SDK:', error);
      throw error;
    }
  }
}
