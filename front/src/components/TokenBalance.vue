<template>
  <div class="token-balance">
    <div class="balance-card">
      <div class="balance-header">
        <h3>Баланс токенов</h3>
        <button @click="refreshBalance" class="refresh-btn" :disabled="loading">
          <i class="icon-refresh" :class="{ spinning: loading }"></i>
        </button>
      </div>
      
      <div class="balance-amount">
        <span class="amount">{{ balance }}</span>
        <span class="currency">токенов</span>
      </div>
      
      <div class="balance-actions">
        <button @click="showPurchaseModal = true" class="btn-primary">
          Купить токены
        </button>
        <button @click="showHistoryModal = true" class="btn-secondary">
          История
        </button>
      </div>
    </div>

    <!-- Модальное окно покупки токенов -->
    <div v-if="showPurchaseModal" class="modal-overlay" @click="showPurchaseModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Покупка токенов</h3>
          <button @click="showPurchaseModal = false" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="packages-grid">
            <div 
              v-for="pkg in packages" 
              :key="pkg.id"
              class="package-card"
              :class="{ 
                selected: selectedPackage?.id === pkg.id,
                popular: pkg.popular 
              }"
              @click="selectedPackage = pkg"
            >
              <div v-if="pkg.popular" class="popular-badge">Популярный</div>
              
              <h4>{{ pkg.name }}</h4>
              <div class="package-tokens">
                <span class="base-tokens">{{ pkg.tokens }}</span>
                <span v-if="pkg.bonus" class="bonus-tokens">+{{ pkg.bonus }} бонус</span>
              </div>
              <div class="package-price">{{ pkg.price }}₽</div>
              
              <div v-if="pkg.bonus" class="savings">
                Экономия: {{ Math.round(pkg.bonus / pkg.tokens * 100) }}%
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="showPurchaseModal = false" class="btn-secondary">
            Отмена
          </button>
          <button 
            @click="purchaseTokens" 
            :disabled="!selectedPackage || purchasing"
            class="btn-primary"
          >
            {{ purchasing ? 'Обработка...' : 'Купить' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Модальное окно истории -->
    <div v-if="showHistoryModal" class="modal-overlay" @click="showHistoryModal = false">
      <div class="modal modal-large" @click.stop>
        <div class="modal-header">
          <h3>История токенов</h3>
          <button @click="showHistoryModal = false" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div v-if="historyLoading" class="loading">
            Загрузка истории...
          </div>
          
          <div v-else-if="history.length === 0" class="empty-state">
            История транзакций пуста
          </div>
          
          <div v-else class="history-list">
            <div 
              v-for="transaction in history" 
              :key="transaction.id"
              class="history-item"
              :class="{ 
                positive: transaction.amount > 0,
                negative: transaction.amount < 0 
              }"
            >
              <div class="transaction-info">
                <div class="transaction-type">{{ getTransactionTypeText(transaction.type) }}</div>
                <div class="transaction-description">{{ transaction.description }}</div>
                <div class="transaction-date">{{ formatDate(transaction.createdAt) }}</div>
              </div>
              
              <div class="transaction-amount">
                <span class="amount">{{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}</span>
                <div class="balance-info">
                  Баланс: {{ transaction.balanceAfter }}
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="hasMoreHistory" class="load-more">
            <button @click="loadMoreHistory" :disabled="historyLoading" class="btn-secondary">
              Загрузить еще
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTokenStore } from '../stores/token'
import { useNotificationStore } from '../stores/notification'

// Типы для данных
interface TokenPackage {
  id: string
  name: string
  tokens: number
  price: number
  bonus?: number
  popular?: boolean
}

interface TokenHistory {
  id: string
  amount: number
  type: string
  description?: string
  createdAt: string
  balanceAfter?: number
}

const tokenStore = useTokenStore()
const notificationStore = useNotificationStore()

const balance = ref(0)
const loading = ref(false)
const showPurchaseModal = ref(false)
const showHistoryModal = ref(false)
const purchasing = ref(false)
const historyLoading = ref(false)
const hasMoreHistory = ref(true)
const historyPage = ref(1)

const packages = ref<TokenPackage[]>([])
const selectedPackage = ref<TokenPackage | null>(null)
const history = ref<TokenHistory[]>([])

onMounted(async () => {
  await loadBalance()
  await loadPackages()
})

const loadBalance = async () => {
  try {
    loading.value = true
    balance.value = await tokenStore.getBalance()
  } catch (error) {
    notificationStore.showError('Ошибка загрузки баланса')
  } finally {
    loading.value = false
  }
}

const refreshBalance = async () => {
  await loadBalance()
}

const loadPackages = async () => {
  try {
    packages.value = await tokenStore.getPackages()
  } catch (error) {
    notificationStore.showError('Ошибка загрузки пакетов')
  }
}

const loadHistory = async (page = 1) => {
  try {
    historyLoading.value = true
    const response = await tokenStore.getHistory(page)
    
    if (page === 1) {
      history.value = response.history
    } else {
      history.value.push(...response.history)
    }
    
    hasMoreHistory.value = response.pagination.hasNext
  } catch (error) {
    notificationStore.showError('Ошибка загрузки истории')
  } finally {
    historyLoading.value = false
  }
}

const loadMoreHistory = async () => {
  historyPage.value++
  await loadHistory(historyPage.value)
}

const purchaseTokens = async () => {
  if (!selectedPackage.value) return
  
  try {
    purchasing.value = true
    const response = await tokenStore.createPayment(selectedPackage.value.id)
    
    if (response.success && response.paymentUrl) {
      // Открываем страницу оплаты
      window.open(response.paymentUrl, '_blank')
      showPurchaseModal.value = false
      notificationStore.showSuccess('Перенаправление на страницу оплаты...')
    } else {
      throw new Error(response.error || 'Ошибка создания платежа')
    }
  } catch (error: any) {
    notificationStore.showError(error.message || 'Ошибка покупки токенов')
  } finally {
    purchasing.value = false
  }
}

const getTransactionTypeText = (type: string) => {
  const types: Record<string, string> = {
    'PURCHASE': 'Покупка',
    'BONUS': 'Бонус',
    'REFERRAL': 'Реферал',
    'SPEND_FREEPIK': 'Freepik',
    'SPEND_MIDJOURNEY': 'Midjourney',
    'SPEND_RUNWAY': 'Runway',
    'SPEND_CHATGPT': 'ChatGPT',
    'REFUND': 'Возврат',
    'ADMIN_ADJUST': 'Корректировка'
  }
  return types[type] || type
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU')
}

// Открываем историю при показе модального окна
const openHistoryModal = async () => {
  showHistoryModal.value = true
  historyPage.value = 1
  await loadHistory(1)
}

// Обновляем метод показа истории
const showHistory = () => {
  openHistoryModal()
}

// Используем функцию, чтобы избежать предупреждения
showHistory
</script>

<style scoped>
.token-balance {
  max-width: 400px;
  margin: 0 auto;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.balance-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.icon-refresh {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}

.icon-refresh.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.balance-amount {
  text-align: center;
  margin: 2rem 0;
}

.amount {
  font-size: 3rem;
  font-weight: 700;
  display: block;
}

.currency {
  font-size: 1rem;
  opacity: 0.8;
}

.balance-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Модальные окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 1rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #eee;
}

/* Пакеты токенов */
.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.package-card {
  position: relative;
  border: 2px solid #eee;
  border-radius: 0.5rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.package-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.package-card.selected {
  border-color: #667eea;
  background: #f8f9ff;
}

.package-card.popular {
  border-color: #ffd700;
}

.popular-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffd700;
  color: #333;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.package-card h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.package-tokens {
  margin-bottom: 1rem;
}

.base-tokens {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
}

.bonus-tokens {
  display: block;
  color: #28a745;
  font-weight: 600;
  margin-top: 0.25rem;
}

.package-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.savings {
  color: #28a745;
  font-size: 0.9rem;
  font-weight: 600;
}

/* История транзакций */
.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.history-item:last-child {
  border-bottom: none;
}

.transaction-info {
  flex: 1;
}

.transaction-type {
  font-weight: 600;
  color: #333;
}

.transaction-description {
  color: #666;
  font-size: 0.9rem;
  margin: 0.25rem 0;
}

.transaction-date {
  color: #999;
  font-size: 0.8rem;
}

.transaction-amount {
  text-align: right;
}

.transaction-amount .amount {
  font-weight: 700;
  font-size: 1.1rem;
}

.history-item.positive .amount {
  color: #28a745;
}

.history-item.negative .amount {
  color: #dc3545;
}

.balance-info {
  color: #666;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.loading, .empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.load-more {
  text-align: center;
  margin-top: 1rem;
}
</style>
