import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import { TokenService } from './TokenService';
import { CONFIG } from '../config';

export interface PaymentRequest {
  userId: string;
  amount: number;
  tokensAmount: number;
  description?: string;
  successUrl?: string;
  failUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  error?: string;
}

export interface LavaWebhookData {
  id: string;
  status: string;
  amount: number;
  currency: string;
  custom_fields?: any;
  created_at: string;
  updated_at: string;
}

export class PaymentService {
  private apiUrl: string;
  private apiKey: string;
  private secretKey: string;
  private tokenService: TokenService;

  constructor() {
    this.apiUrl = process.env.LAVA_API_URL || 'https://api.lava.ru/business';
    this.apiKey = process.env.LAVA_API_KEY || '';
    this.secretKey = process.env.LAVA_SECRET_KEY || '';
    this.tokenService = new TokenService();
  }

  /**
   * Создает платеж в системе Lava
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      if (!this.apiKey || !this.secretKey) {
        throw new Error('Lava API credentials not configured');
      }

      // Создаем запись о платеже в БД
      const payment = await prisma.payment.create({
        data: {
          userId: request.userId,
          amount: request.amount,
          currency: 'RUB',
          status: 'PENDING',
          provider: 'lava',
          description: request.description || `Покупка ${request.tokensAmount} токенов`,
          tokensAdded: request.tokensAmount,
          metadata: {
            tokensAmount: request.tokensAmount,
            successUrl: request.successUrl,
            failUrl: request.failUrl
          }
        }
      });

      // Создаем платеж в Lava
      const lavaResponse = await axios.post(
        `${this.apiUrl}/invoice/create`,
        {
          sum: request.amount,
          orderId: payment.id,
          shopId: process.env.LAVA_SHOP_ID,
          hookUrl: `${CONFIG.app.baseUrl}/api/webhooks/lava`,
          successUrl: request.successUrl || `${CONFIG.app.frontendUrl}/payment/success`,
          failUrl: request.failUrl || `${CONFIG.app.frontendUrl}/payment/fail`,
          expire: 3600, // 1 час на оплату
          customFields: JSON.stringify({
            userId: request.userId,
            tokensAmount: request.tokensAmount,
            paymentId: payment.id
          }),
          comment: request.description || `Покупка ${request.tokensAmount} токенов`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (lavaResponse.data.status === 'success') {
        // Обновляем платеж с ID от Lava
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            providerId: lavaResponse.data.data.id,
            status: 'PROCESSING'
          }
        });

        logger.info('Payment created successfully', {
          paymentId: payment.id,
          lavaId: lavaResponse.data.data.id,
          amount: request.amount,
          userId: request.userId
        });

        return {
          success: true,
          paymentId: payment.id,
          paymentUrl: lavaResponse.data.data.url
        };
      } else {
        throw new Error(`Lava API error: ${lavaResponse.data.message}`);
      }

    } catch (error) {
      logger.error('Payment creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Обрабатывает webhook от Lava
   */
  async handleWebhook(webhookData: LavaWebhookData): Promise<boolean> {
    try {
      logger.info('Processing Lava webhook', { webhookData });

      // Находим платеж по providerId
      const payment = await prisma.payment.findFirst({
        where: { providerId: webhookData.id },
        include: { user: true }
      });

      if (!payment) {
        logger.error('Payment not found for webhook', { lavaId: webhookData.id });
        return false;
      }

      // Обновляем статус платежа
      const newStatus = this.mapLavaStatusToPaymentStatus(webhookData.status);
      
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus as any,
          updatedAt: new Date()
        }
      });

      // Если платеж успешен, добавляем токены
      if (newStatus === 'COMPLETED') {
        await this.processSuccessfulPayment(payment);
      }

      logger.info('Webhook processed successfully', {
        paymentId: payment.id,
        status: newStatus,
        userId: payment.userId
      });

      return true;

    } catch (error) {
      logger.error('Webhook processing failed:', error);
      return false;
    }
  }

  /**
   * Обрабатывает успешный платеж
   */
  private async processSuccessfulPayment(payment: any): Promise<void> {
    try {
      // Добавляем токены пользователю
      await this.tokenService.addTokens(
        parseInt(payment.userId),
        payment.tokensAdded,
        'PURCHASE',
        `Покупка токенов за ${payment.amount}₽`
      );

      logger.info('Tokens added for successful payment', {
        paymentId: payment.id,
        userId: payment.userId,
        tokensAdded: payment.tokensAdded
      });

    } catch (error) {
      logger.error('Failed to process successful payment:', error);
      throw error;
    }
  }

  /**
   * Преобразует статус Lava в наш статус
   */
  private mapLavaStatusToPaymentStatus(lavaStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'success': 'COMPLETED',
      'error': 'FAILED',
      'cancel': 'CANCELLED',
      'wait': 'PROCESSING'
    };

    return statusMap[lavaStatus] || 'PENDING';
  }

  /**
   * Получает информацию о платеже
   */
  async getPaymentInfo(paymentId: string): Promise<any> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        tokensAdded: payment.tokensAdded,
        description: payment.description,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      };

    } catch (error) {
      logger.error('Failed to get payment info:', error);
      throw error;
    }
  }

  /**
   * Получает историю платежей пользователя
   */
  async getUserPayments(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const payments = await prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        tokensAdded: payment.tokensAdded,
        description: payment.description,
        createdAt: payment.createdAt
      }));

    } catch (error) {
      logger.error('Failed to get user payments:', error);
      throw error;
    }
  }

  /**
   * Возвращает доступные пакеты токенов
   */
  getTokenPackages(): Array<{
    id: string;
    name: string;
    tokens: number;
    price: number;
    bonus?: number;
    popular?: boolean;
  }> {
    return [
      {
        id: 'starter',
        name: 'Стартовый',
        tokens: 100,
        price: 99,
        bonus: 0
      },
      {
        id: 'basic',
        name: 'Базовый',
        tokens: 500,
        price: 399,
        bonus: 50,
        popular: true
      },
      {
        id: 'premium',
        name: 'Премиум',
        tokens: 1000,
        price: 699,
        bonus: 200
      },
      {
        id: 'pro',
        name: 'Профессиональный',
        tokens: 2500,
        price: 1499,
        bonus: 750
      },
      {
        id: 'enterprise',
        name: 'Корпоративный',
        tokens: 5000,
        price: 2499,
        bonus: 2000
      }
    ];
  }

  /**
   * Проверяет статус платежа в Lava
   */
  async checkPaymentStatus(providerId: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('Lava API key not configured');
      }

      const response = await axios.get(
        `${this.apiUrl}/invoice/info`,
        {
          params: { id: providerId },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;

    } catch (error) {
      logger.error('Failed to check payment status:', error);
      throw error;
    }
  }
}
