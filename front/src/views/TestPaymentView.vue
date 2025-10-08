<template>
  <div class="max-w-md mx-auto pt-8 px-4">
      <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h1 class="text-2xl font-bold text-white mb-6 text-center">
          🧪 Тест Платежей Lava.top
        </h1>

        <!-- Форма создания тестового пользователя -->
        <div v-if="!user" class="space-y-4 mb-6">
          <h2 class="text-lg font-semibold text-white">Создать тестового пользователя:</h2>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Telegram ID
            </label>
            <input
              v-model="testUser.telegramId"
              type="number"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              placeholder="123456789"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Имя
            </label>
            <input
              v-model="testUser.firstName"
              type="text"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              placeholder="Тест"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              v-model="testUser.username"
              type="text"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              placeholder="testuser"
            />
          </div>

          <button
            @click="createTestUser"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {{ loading ? 'Создание...' : 'Создать пользователя' }}
          </button>
        </div>

        <!-- Информация о пользователе -->
        <div v-if="user" class="mb-6 p-4 bg-white/5 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Текущий пользователь:</h3>
          <div class="text-sm text-gray-300 space-y-1">
            <p><strong>ID:</strong> {{ user.id }}</p>
            <p><strong>Telegram ID:</strong> {{ user.telegramId }}</p>
            <p><strong>Имя:</strong> {{ user.firstName }} {{ user.lastName }}</p>
            <p><strong>Username:</strong> @{{ user.username }}</p>
            <p><strong>Токены:</strong> {{ user.tokens || 0 }}</p>
          </div>
        </div>

        <!-- Выбор плана -->
        <div v-if="user" class="space-y-4">
          <h3 class="text-lg font-semibold text-white">Выберите план:</h3>
          
          <div class="space-y-2">
            <label v-for="plan in plans" :key="plan.value" class="flex items-center space-x-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <input
                v-model="selectedPlan"
                :value="plan.value"
                type="radio"
                class="text-purple-600"
              />
              <div class="flex-1">
                <div class="text-white font-medium">{{ plan.name }}</div>
                <div class="text-gray-300 text-sm">{{ plan.price }} ₽/мес</div>
              </div>
            </label>
          </div>

          <button
            @click="createPayment"
            :disabled="!selectedPlan || loading"
            class="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {{ loading ? 'Создание платежа...' : 'Создать платеж' }}
          </button>
        </div>

        <!-- Результат -->
        <div v-if="result" class="mt-6 p-4 rounded-lg" :class="result.success ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'">
          <h4 class="font-semibold mb-2" :class="result.success ? 'text-green-400' : 'text-red-400'">
            {{ result.success ? '✅ Успех!' : '❌ Ошибка!' }}
          </h4>
          <div class="text-sm text-gray-300">
            <pre class="whitespace-pre-wrap">{{ JSON.stringify(result.data, null, 2) }}</pre>
          </div>
          
          <div v-if="result.success && result.data.paymentUrl" class="mt-4">
            <a
              :href="result.data.paymentUrl"
              target="_blank"
              class="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              🔗 Открыть страницу оплаты
            </a>
          </div>
        </div>

        <!-- Логи -->
        <div v-if="logs.length > 0" class="mt-6">
          <h4 class="text-lg font-semibold text-white mb-2">Логи:</h4>
          <div class="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">
            <div v-for="(log, index) in logs" :key="index" class="text-xs text-gray-300 mb-1">
              <span class="text-gray-500">{{ log.time }}</span> {{ log.message }}
            </div>
          </div>
        </div>

        <!-- Кнопка очистки -->
        <div class="mt-6 flex space-x-2">
          <button
            @click="clearUser"
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Очистить пользователя
          </button>
          <button
            @click="clearLogs"
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Очистить логи
          </button>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

interface TestUser {
  telegramId: number
  firstName: string
  username: string
  lastName?: string
}

interface User {
  id: string
  telegramId: number
  firstName: string
  lastName?: string
  username: string
  tokens?: number
}

interface LogEntry {
  time: string
  message: string
}

const user = ref<User | null>(null)
const loading = ref(false)
const selectedPlan = ref('')
const result = ref<any>(null)
const logs = ref<LogEntry[]>([])

const testUser = ref<TestUser>({
  telegramId: 669231710,
  firstName: 'Тест',
  username: 'testuser'
})

const plans = [
  { value: 'basic', name: 'Базовый', price: 499 },
  { value: 'pro', name: 'Профессиональный', price: 999 },
  { value: 'premium', name: 'Премиум', price: 1999 }
]

const addLog = (message: string) => {
  logs.value.push({
    time: new Date().toLocaleTimeString(),
    message
  })
}

const createTestUser = async () => {
  loading.value = true
  result.value = null
  
  try {
    addLog('🔄 Создание тестового пользователя...')
    
    // Создаем пользователя напрямую для тестирования
    user.value = {
      id: `test_${testUser.value.telegramId}`,
      telegramId: testUser.value.telegramId,
      firstName: testUser.value.firstName,
      lastName: testUser.value.lastName || '',
      username: testUser.value.username,
      tokens: 100
    }
    
    addLog(`✅ Пользователь создан: ${user.value.firstName} (ID: ${user.value.id})`)
    
  } catch (error: any) {
    addLog(`❌ Ошибка создания пользователя: ${error.message}`)
    console.error('Error creating test user:', error)
  } finally {
    loading.value = false
  }
}

const createPayment = async () => {
  if (!user.value || !selectedPlan.value) return
  
  loading.value = true
  result.value = null
  
  try {
    addLog(`🔄 Создание платежа для плана: ${selectedPlan.value}`)
    
    const baseURL = import.meta.env.VITE_APP_HOST_URL || import.meta.env.VITE_BACKEND_URL || 'https://aicexaibot-production.up.railway.app'
    
    addLog(`🌐 Отправка запроса на: ${baseURL}/api/payment/lava-top/subscription`)
    addLog(`📦 Данные: plan=${selectedPlan.value}, userId=${user.value.id}`)
    
    const response = await axios.post(`${baseURL}/api/payment/lava-top/subscription`, {
      plan: selectedPlan.value,
      userId: user.value.id
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    addLog(`✅ Ответ получен: ${response.status}`)
    
    result.value = {
      success: true,
      data: response.data
    }
    
    addLog(`💰 Платеж создан: ${response.data.paymentId}`)
    
  } catch (error: any) {
    addLog(`❌ Ошибка: ${error.message}`)
    
    result.value = {
      success: false,
      data: {
        error: error.message,
        status: error.response?.status,
        response: error.response?.data
      }
    }
    
    console.error('Error creating payment:', error)
  } finally {
    loading.value = false
  }
}

const clearUser = () => {
  user.value = null
  result.value = null
  selectedPlan.value = ''
  addLog('🗑️ Пользователь очищен')
}

const clearLogs = () => {
  logs.value = []
}

onMounted(() => {
  addLog('🚀 Тестовая страница загружена')
})
</script>
