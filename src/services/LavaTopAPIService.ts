import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface LavaTopInvoiceResponse {
  success: boolean;
  paymentUrl?: string;
  invoiceId?: string;
  error?: string;
}

/**
 * Сервис для работы с Lava.top API (актуальные offerId)
 */
export class LavaTopAPIService {
  private client: AxiosInstance;
  private apiKey: string;

  // Реальные offerId подписок из Lava.top
  private readonly SUBSCRIPTION_OFFERS = {
    basic: '009b0062-7c4a-4c8c-944c-a3313d8ac424',
    pro: '9018f9c8-2e1a-4402-8240-4a2587f8b82a',
    premium: '155e0453-b562-4af2-b588-3bcef486c3e3'
  };

  constructor() {
    this.apiKey = process.env.LAVA_TOP_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️ LAVA_TOP_API_KEY not configured - Lava.top payments disabled');
    }

    this.client = axios.create({
      baseURL: 'https://gate.lava.top',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Логирование запросов
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Lava.top API Request:', {
          method: config.method,
          url: config.url,
          offerId: config.data?.offerId
        });
        return config;
      },
      (error) => {
        logger.error('Lava.top API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('Lava.top API Response:', {
          status: response.status,
          invoiceId: response.data?.id
        });
        return response;
      },
      (error) => {
        logger.error('Lava.top API Error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Создание инвойса для подписки
   */
  async createSubscriptionInvoice(
    plan: 'basic' | 'pro' | 'premium',
    userEmail: string
  ): Promise<LavaTopInvoiceResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Lava.top API key not configured');
      }

      const offerId = this.SUBSCRIPTION_OFFERS[plan];
      if (!offerId) {
        throw new Error(`Unknown subscription plan: ${plan}`);
      }

      const planNames = {
        basic: 'AICEX Basic',
        pro: 'AICEX Pro',
        premium: 'AICEX Premium'
      };

      const response = await this.client.post('/api/v2/invoice', {
        email: userEmail,
        offerId: offerId,
        currency: 'RUB',
        description: `${planNames[plan]} подписка - AICEX AI Bot`,
        webhookUrl: `${process.env.RAILWAY_PUBLIC_DOMAIN || 'https://aicexaibot-production.up.railway.app'}/api/webhooks/lava-top`,
        successUrl: `${process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app'}/payment/success`,
        failUrl: `${process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app'}/payment/fail`
      });

      return {
        success: true,
        paymentUrl: response.data.url,
        invoiceId: response.data.id
      };
    } catch (error: any) {
      logger.error('Error creating subscription invoice:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Получение статуса инвойса
   */
  async getInvoiceStatus(invoiceId: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('Lava.top API key not configured');
      }

      const response = await this.client.get(`/api/v2/invoices/${invoiceId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Error getting invoice status:', error);
      throw error;
    }
  }

  /**
   * Проверка конфигурации
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Получение списка доступных планов
   */
  getAvailablePlans() {
    return {
      basic: {
        offerId: this.SUBSCRIPTION_OFFERS.basic,
        name: 'AICEX Basic',
        price: 499,
        currency: 'RUB',
        tokens: 1000
      },
      pro: {
        offerId: this.SUBSCRIPTION_OFFERS.pro,
        name: 'AICEX Pro', 
        price: 1699,
        currency: 'RUB',
        tokens: 5000
      },
      premium: {
        offerId: this.SUBSCRIPTION_OFFERS.premium,
        name: 'AICEX Premium',
        price: 2999,
        currency: 'RUB',
        tokens: 15000
      }
    };
  }
}

export const lavaTopAPI = new LavaTopAPIService();
