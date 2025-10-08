<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStore } from '@/stores/store'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const store = useStore()
const isLoaded = ref(false)

// Получаем токены из store (для отображения в будущем)
// const userTokens = computed(() => store.user?.tokens || 0)

onMounted(async () => {
  // Загружаем данные пользователя если их нет
  if (!store.user) {
    try {
      await store.fetchUserProfile()
      await store.updateUserTokens()
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }
  
  setTimeout(() => {
    isLoaded.value = true
  }, 300)
})
</script>

<template>
  <div class="max-w-md mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6">
      <!-- Hero Section -->
      <div class="text-center mb-4 sm:mb-6">
        <h1 class="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          AICEX ONE
        </h1>
        <p class="text-gray-300 text-sm sm:text-base">Ваша персональная AI-лаборатория</p>
      </div>

      <!-- Main Cards Grid -->
      <div class="space-y-4 sm:space-y-5">
        <!-- Loading State -->
        <div v-if="!isLoaded" class="space-y-4">
          <SkeletonLoader type="card" />
          <SkeletonLoader type="profile" />
        </div>
        
        <!-- Loaded Content -->
        <div v-else class="space-y-4 sm:space-y-5">
          <!-- Subscription Card -->
          <div class="group relative">
            <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl sm:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:bg-white/15 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl min-h-[180px] sm:min-h-[200px] flex flex-col justify-between">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-white font-semibold text-lg">Premium</h3>
                  <p class="text-gray-300 text-sm">Подписка</p>
                </div>
              </div>
              <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
            
            <p class="text-gray-200 mb-6 leading-relaxed">
              Разблокируйте всю библиотеку нейросетей
            </p>
            
            <router-link
              to="/subscription"
              class="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center space-x-2"
            >
              <span>Оформить</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </router-link>
          </div>
        </div>

        <!-- Tokens Info Card (без кнопки покупки) -->
        <div class="group relative">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl sm:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8 hover:bg-white/15 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-white font-semibold text-lg">Токены</h3>
                  <p class="text-gray-300 text-sm">{{ store.user?.tokens || 0 }} доступно</p>
                </div>
              </div>
              <router-link to="/settings" class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </router-link>
            </div>
            
            <p class="text-gray-200 mb-6 leading-relaxed text-sm sm:text-base">
              Получайте токены с подпиской и используйте все AI-сервисы
            </p>
            
            <!-- Только подписка -->
            <router-link
              to="/subscription"
              class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-6 rounded-xl sm:rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center space-x-2 hover:scale-105"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <span>Оформить подписку</span>
            </router-link>
          </div>
        </div>
        </div>
      </div>

      <!-- Secondary Cards -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
        <!-- FAQ Card -->
        <div class="group relative">
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-4 hover:bg-white/15 transition-all duration-500 hover:scale-[1.03] min-h-[150px] sm:min-h-[160px] flex flex-col justify-between">
            <div class="text-center mb-4">
              <div class="w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-white font-semibold text-sm">FAQ</h3>
              <p class="text-gray-300 text-xs">Помощь</p>
            </div>
            
            <router-link
              to="/faq"
              class="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium py-2 px-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/25 flex items-center justify-center text-sm"
            >
              <span>Помощь</span>
            </router-link>
          </div>
        </div>

        <!-- News Card -->
        <div class="group relative">
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-4 hover:bg-white/15 transition-all duration-500 hover:scale-[1.03] min-h-[150px] sm:min-h-[160px] flex flex-col justify-between">
            <div class="text-center mb-3">
              <div class="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
                </svg>
              </div>
              <h3 class="text-white font-semibold text-sm">Новости</h3>
              <p class="text-gray-300 text-xs">Обновления</p>
            </div>
            
            
            <router-link
              to="/news"
              class="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-2 px-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 flex items-center justify-center text-sm"
            >
              <span>Новости</span>
            </router-link>
          </div>
        </div>
      </div>
  </div>
</template>

<style scoped>
/* Glass morphism effect */
.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}
</style>
