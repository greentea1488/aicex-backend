/**
 * Lava Top Payment Service
 * Интеграция с платежной системой Lava Top согласно их API документации
 * https://dev.lava.ru/
 */

import axios from 'axios'
import { apiClient } from '@/http/api'

export interface LavaTopPaymentRequest {
  amount: number
  currency: 'RUB' | 'USD' | 'EUR'
  orderId: string
  description?: string
  successUrl?: string
  failUrl?: string
  webhookUrl?: string
  customerEmail?: string
  customerPhone?: string
}

export interface LavaTopPaymentResponse {
  id?: string
  url?: string
  amount?: number
  currency?: string
  status?: 'created' | 'pending' | 'success' | 'fail' | 'expired'
  orderId?: string
  createdAt?: string
  success?: boolean
  error?: string
}

export interface LavaTopWebhookData {
  id: string
  status: 'success' | 'fail'
  amount: number
  currency: string
  orderId: string
  signature: string
}

class LavaTopService {
  private baseUrl = 'https://api.lava.top'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Создание платежа через API v2
   */
  async createPayment(paymentData: LavaTopPaymentRequest): Promise<LavaTopPaymentResponse> {
    try {
      // Используем новый API v2 с offerId
      const response = await axios.post(`${this.baseUrl}/api/v2/invoice`, {
        email: paymentData.customerEmail || 'user@example.com',
        offerId: paymentData.orderId, // В новом API используется offerId
        currency: paymentData.currency,
        description: paymentData.description || 'Покупка токенов AICEX ONE',
        webhookUrl: paymentData.webhookUrl || `${import.meta.env.VITE_BACKEND_URL}/api/webhooks/lava-top`,
        successUrl: paymentData.successUrl || `${window.location.origin}/payment/success`,
        failUrl: paymentData.failUrl || `${window.location.origin}/payment/fail`
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      return {
        id: response.data.id,
        url: response.data.url,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'created',
        orderId: paymentData.orderId,
        createdAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Lava Top payment creation error:', error)
      throw new Error('Не удалось создать платеж')
    }
  }

  /**
   * Проверка статуса платежа через API v2
   */
  async getPaymentStatus(paymentId: string): Promise<LavaTopPaymentResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/invoices/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      })

      return response.data
    } catch (error) {
      console.error('Lava Top payment status error:', error)
      throw new Error('Не удалось получить статус платежа')
    }
  }

  /**
   * Валидация webhook подписи (заглушка для совместимости)
   */
  validateWebhookSignature(_webhookData: LavaTopWebhookData): boolean {
    // В новом API валидация происходит на бэкенде
    return true
  }

  /**
   * Получение доступных методов оплаты (заглушка для совместимости)
   */
  async getPaymentMethods(): Promise<Array<{
    id: string
    name: string
    icon: string
    minAmount: number
    maxAmount: number
    currency: string[]
  }>> {
    // Возвращаем стандартные методы оплаты
    return [
      {
        id: 'card',
        name: 'Банковская карта',
        icon: '💳',
        minAmount: 1,
        maxAmount: 100000,
        currency: ['RUB', 'USD', 'EUR']
      },
      {
        id: 'qiwi',
        name: 'QIWI Кошелек',
        icon: '🥝',
        minAmount: 1,
        maxAmount: 50000,
        currency: ['RUB']
      }
    ]
  }

  /**
   * Создание платежа для подписки через backend API (с передачей userId)
   */
  async createSubscriptionPaymentWithUserId(
    plan: 'basic' | 'pro' | 'premium',
    userId: string
  ): Promise<LavaTopPaymentResponse> {
    console.log('🔍 Creating subscription payment with userId:', userId);
    
    try {
      // Используем NEW безопасный endpoint для отладки
      const baseUrl = import.meta.env.VITE_API_URL || 
                     (import.meta.env.VITE_APP_HOST_URL || 'https://aicexaibot-production.up.railway.app');
      const response = await axios.post(`${baseUrl}/api/payment/lava-safe/subscription`, {
        plan,
        userId: userId
      });

      console.log('✅ Subscription payment created:', response.data);
      
      if (response.data.success) {
        return {
          success: true,
          url: response.data.paymentUrl,
          orderId: response.data.paymentId
        };
      } else {
        throw new Error(response.data.error || 'Payment creation failed');
      }
    } catch (error: any) {
      console.error('❌ Error creating subscription payment:', error);
      throw error;
    }
  }

  /**
   * Создание платежа для подписки через backend API (старый метод)
   */
  async createSubscriptionPayment(
    plan: 'basic' | 'pro' | 'premium'
  ): Promise<LavaTopPaymentResponse> {
    try {
      const baseURL = import.meta.env.VITE_APP_HOST_URL || import.meta.env.VITE_BACKEND_URL || 'https://aicexaibot-production.up.railway.app';
      
      // Получаем userId из store или Telegram WebApp
      let userId = null;
      
      // Пытаемся получить из Pinia store
      const store = (window as any).__PINIA_STORE__;
      if (store?.user?.id) {
        userId = store.user.id;
        console.log('🔍 User ID from store:', userId);
      }
      
      // Если нет в store, пытаемся получить из Telegram WebApp
      if (!userId && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        userId = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
        console.log('🔍 User ID from Telegram:', userId);
      }

      // Fallback для разработки
      if (!userId && !import.meta.env.PROD) {
        userId = "test-user-id";
        console.log('🔍 Using test user ID for development');
      }

      if (!userId) {
        console.error('❌ No user ID found anywhere');
        throw new Error('User ID not found. Please login again.');
      }

      console.log('✅ Using user ID:', userId);

      const response = await axios.post(`${baseURL}/api/payment/lava-top/subscription`, {
        plan: plan,
        userId: userId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          url: response.data.paymentUrl,
          orderId: response.data.invoiceId
        };
      } else {
        throw new Error(response.data.error || 'Failed to create payment');
      }
    } catch (error: any) {
      console.error('Error creating subscription payment:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create payment'
      };
    }
  }

  /**
   * Создание платежа для токенов
   */
  async createTokenPayment(tokenAmount: number): Promise<LavaTopPaymentResponse> {
    // Примерный курс: 1 рубль = 10 токенов
    const amount = Math.ceil(tokenAmount / 10)
    const orderId = `tokens_${tokenAmount}_${Date.now()}`

    return this.createPayment({
      amount,
      currency: 'RUB',
      orderId,
      description: `Покупка ${tokenAmount} токенов`,
      webhookUrl: `${import.meta.env.VITE_APP_HOST_URL}/api/webhooks/lava-top`
    })
  }
}

// Создаем экземпляр сервиса с конфигурацией
const lavaTopService = new LavaTopService(
  import.meta.env.VITE_LAVA_TOP_API_KEY || 'demo_api_key'
)

export default lavaTopService
export { LavaTopService }
