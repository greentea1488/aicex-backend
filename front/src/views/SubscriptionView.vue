<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSubscriptionPlans } from '@/http/endpoints'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const selectedPlan = ref('basic')
const loading = ref(true)
const error = ref('')

// Планы подписки с API
const plans = ref<any[]>([])
const currentPlan = ref<string>('free') // Текущий план пользователя

// Функция для форматирования цены
const formatPrice = (plan: any) => {
  if (plan.id === 'free' || plan.price?.rub === 0) {
    return 'Бесплатно'
  }
  return `${plan.price?.rub}₽ / ${plan.price?.eur}€ / ${plan.price?.usd}$`
}

// Функция для получения градиента
const getPlanGradient = (planName: string) => {
  const gradients: Record<string, string> = {
    free: 'from-gray-500/20 to-gray-600/20',
    basic: 'from-cyan-500/20 to-purple-500/20',
    pro: 'from-purple-500/20 to-pink-500/20',
    premium: 'from-pink-500/20 to-rose-500/20'
  }
  return gradients[planName] || 'from-gray-500/20 to-gray-600/20'
}

// Функция для получения градиента кнопки
const getButtonGradient = (planName: string) => {
  const gradients: Record<string, string> = {
    free: 'from-gray-500 to-gray-600',
    basic: 'from-cyan-500 to-purple-500',
    pro: 'from-purple-500 to-pink-500',
    premium: 'from-pink-500 to-rose-500'
  }
  return gradients[planName] || 'from-gray-500 to-gray-600'
}

// Функция для получения фич плана
const getPlanFeatures = (plan: any) => {
  const baseFeatures = [
    { text: `${plan.tokens} токенов`, included: true },
    { text: plan.description, included: true }
  ]
  
  if (plan.features?.imageGeneration) {
    baseFeatures.push({ text: 'Генерация изображений', included: true })
  }
  
  if (plan.features?.videoGeneration) {
    baseFeatures.push({ text: 'Генерация видео', included: true })
  }
  
  if (plan.features?.prioritySupport) {
    baseFeatures.push({ text: 'Приоритетная поддержка', included: true })
  }
  
  if (plan.features?.analytics) {
  }
  
  return baseFeatures
}

// Загрузка текущего плана пользователя
const loadCurrentPlan = async () => {
  try {
    // TODO: Добавить API для получения текущей подписки пользователя
    // const response = await getUserSubscription()
    // currentPlan.value = response.data.subscription || 'free'
    currentPlan.value = 'free' // Временно
  } catch (err) {
    console.error('❌ Error loading current plan:', err)
    currentPlan.value = 'free'
  }
}

// Загрузка планов подписки
const loadPlans = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const response = await getSubscriptionPlans()
    console.log('✅ Subscription plans from API (v1.0.2):', response.data)
    
    // Преобразуем данные API в формат для отображения
    plans.value = response.data.map((plan: any) => ({
      id: plan.id,
      name: plan.displayName,
      price: formatPrice(plan),
      tokens: plan.tokens,
      features: getPlanFeatures(plan),
      gradient: getPlanGradient(plan.id),
      buttonGradient: getButtonGradient(plan.id),
      popular: plan.id === 'basic',
      canSubscribe: plan.id !== 'free',
      isCurrentPlan: plan.id === currentPlan.value, // Отмечаем текущий план
      lavaOfferId: plan.lavaOfferId,
      priceRub: plan.price?.rub
    }))
  } catch (err) {
    console.error('❌ Error loading subscription plans from API:', err)
    error.value = 'Используются локальные планы'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCurrentPlan()
  await loadPlans()
})
</script>

<template>
  <!-- Animated background elements -->
  <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 px-4 sm:px-6">
      <!-- Header -->
      <div class="text-center mb-6 sm:mb-8">
        <h1 class="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Выберите план
        </h1>
        <p class="text-gray-300 text-lg">Разблокируйте всю мощь AI-технологий</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
        <SkeletonLoader type="card" v-for="i in 4" :key="i" />
      </div>

      <!-- Plans Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="group relative"
          @click="selectedPlan = plan.id"
        >
          <!-- Glow effect -->
          <div 
            class="absolute inset-0 rounded-3xl blur-xl transition-all duration-500"
            :class="[
              `bg-gradient-to-r ${plan.gradient}`,
              selectedPlan === plan.id ? 'opacity-100 blur-2xl' : 'opacity-50 blur-xl'
            ]"
          ></div>
          
          <!-- Card -->
          <div 
            class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 transition-all duration-500 hover:bg-white/15 hover:scale-[1.03] hover:shadow-2xl"
            :class="[
              selectedPlan === plan.id ? 'bg-white/20 border-white/40' : ''
            ]"
          >
            <!-- Popular badge -->
            <div 
              v-if="plan.popular"
              class="absolute -top-3 left-1/2 transform -translate-x-1/2"
            >
              <div class="bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                Популярный
              </div>
            </div>

            <!-- Plan header -->
            <div class="text-center mb-6">
              <h3 class="text-white font-bold text-xl mb-2">{{ plan.name }}</h3>
              <div class="text-2xl font-bold text-white mb-2">{{ plan.price }}</div>
              <div class="text-sm text-gray-300">/месяц</div>
            </div>

            <!-- Tokens -->
            <div class="bg-white/10 rounded-2xl p-4 mb-6 text-center">
              <div class="flex items-center justify-center space-x-2 mb-1">
                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                <span class="text-white font-semibold">{{ plan.tokens }} токенов</span>
              </div>
              <div class="text-xs text-gray-400">в месяц</div>
            </div>

            <!-- Features -->
            <div class="space-y-3 mb-6">
              <div
                v-for="feature in plan.features"
                :key="feature.text"
                class="flex items-center space-x-3"
              >
                <div 
                  class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="[
                    feature.included 
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-500' 
                      : 'bg-gray-600'
                  ]"
                >
                  <svg 
                    v-if="feature.included"
                    class="w-3 h-3 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <svg 
                    v-else
                    class="w-3 h-3 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <span 
                  class="text-sm"
                  :class="[
                    feature.included ? 'text-white' : 'text-gray-400'
                  ]"
                >
                  {{ feature.text }}
                </span>
              </div>
            </div>

            <!-- Button -->
            <div v-if="plan.isCurrentPlan" class="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center space-x-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Текущий план</span>
            </div>
            <router-link
              v-else-if="plan.canSubscribe"
              :to="`/payment/subscription?plan=${plan.id}`"
              class="w-full bg-gradient-to-r text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg flex items-center justify-center space-x-2"
              :class="plan.buttonGradient"
            >
              <span>Выбрать план</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </router-link>
            
            <!-- Free plan message -->
            <div 
              v-else
              class="w-full bg-gray-600/50 text-gray-300 font-semibold py-4 px-6 rounded-2xl text-center"
            >
              Текущий план
            </div>
          </div>
        </div>
      </div>

      <!-- Additional info -->
      <div class="mt-8 sm:mt-12 text-center">
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-2xl mx-auto">
          <h3 class="text-white font-semibold text-lg mb-3">💡 Почему выбирают AICEX ONE?</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-cyan-400 rounded-full"></div>
              <span>Быстрые ответы</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Множество AI-моделей</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span>24/7 поддержка</span>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped>
/* Blob animation */
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Glass morphism */
.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}

/* Smooth card animations */
.group:hover {
  z-index: 10;
}
</style>