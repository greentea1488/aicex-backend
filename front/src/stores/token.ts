import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '../http/api'

export const useTokenStore = defineStore('token', () => {
  const balance = ref(0)
  const loading = ref(false)

  /**
   * Получает текущий баланс токенов
   */
  const getBalance = async (): Promise<number> => {
    try {
      loading.value = true
      const response = await apiClient.get('/tokens/balance')
      balance.value = response.data.tokens
      return balance.value
    } catch (error) {
      console.error('Failed to get token balance:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Получает историю токенов
   */
  const getHistory = async (page = 1, limit = 20) => {
    try {
      const response = await apiClient.get('/tokens/history', {
        params: { page, limit }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get token history:', error)
      throw error
    }
  }

  /**
   * Получает доступные пакеты токенов
   */
  const getPackages = async () => {
    try {
      const response = await apiClient.get('/packages')
      return response.data.packages
    } catch (error) {
      console.error('Failed to get token packages:', error)
      throw error
    }
  }

  /**
   * Создает платеж для покупки токенов
   */
  const createPayment = async (packageId: string) => {
    try {
      const response = await apiClient.post('/payments', { packageId })
      return response.data
    } catch (error) {
      console.error('Failed to create payment:', error)
      throw error
    }
  }

  /**
   * Получает историю платежей
   */
  const getPaymentHistory = async (limit = 10) => {
    try {
      const response = await apiClient.get('/payments/history', {
        params: { limit }
      })
      return response.data.payments
    } catch (error) {
      console.error('Failed to get payment history:', error)
      throw error
    }
  }

  /**
   * Обновляет баланс токенов
   */
  const updateBalance = (newBalance: number) => {
    balance.value = newBalance
  }

  /**
   * Списывает токены (локально)
   */
  const deductTokens = (amount: number) => {
    balance.value = Math.max(0, balance.value - amount)
  }

  /**
   * Добавляет токены (локально)
   */
  const addTokens = (amount: number) => {
    balance.value += amount
  }

  return {
    balance,
    loading,
    getBalance,
    getHistory,
    getPackages,
    createPayment,
    getPaymentHistory,
    updateBalance,
    deductTokens,
    addTokens
  }
})
