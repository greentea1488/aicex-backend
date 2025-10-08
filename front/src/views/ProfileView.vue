<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useStore } from '@/stores/store'
import { api } from '@/http/api'

const store = useStore()
const isLoaded = ref(false)
const stats = ref<any>(null)

// Получаем данные из статистики или store
const userTokens = computed(() => stats.value?.tokens || store.user?.tokens || 0)
const userGenerations = computed(() => stats.value?.totalGenerations || 0)
const userReferrals = computed(() => stats.value?.referrals || store.user?.friendsReferred || 0)
const tokensSpent = computed(() => stats.value?.tokensSpent || 0)
const lastGeneration = computed(() => stats.value?.lastGeneration || null)
const joinDate = computed(() => {
  if (stats.value?.memberSince) {
    return new Date(stats.value.memberSince).toLocaleDateString('ru-RU')
  }
  if (!store.user?.createdAt) return 'Недавно'
  return new Date(store.user.createdAt).toLocaleDateString('ru-RU')
})

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
  
  // Загружаем статистику
  try {
    const response = await api.stats.get()
    if (response.data.success) {
      stats.value = response.data.data
      console.log('📊 User stats loaded:', stats.value)
    }
  } catch (error) {
    console.error('Error loading user stats:', error)
  }
  
  setTimeout(() => {
    isLoaded.value = true
  }, 300)
})

const handleImageError = (e: Event) => {
  console.log('Avatar image failed to load, showing initials instead')
  // Не скрываем изображение, просто логируем ошибку
}

const formatLastGeneration = (generation: any) => {
  if (!generation?.createdAt) return 'Недавно'
  const date = new Date(generation.createdAt)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <!-- Navigation Header -->
  <div class="flex items-center justify-between mb-8 pt-4 telegram-content">
      <router-link to="/" class="flex items-center space-x-3 text-white hover:text-cyan-400 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        <span class="font-medium">Назад</span>
      </router-link>
      
      <h1 class="text-2xl font-bold text-white">Профиль</h1>
      
      <div class="w-20"></div> <!-- Spacer for centering -->
    </div>

    <!-- Profile Card -->
    <div class="max-w-md mx-auto telegram-content">
      <div class="relative group mb-6">
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6 hover:bg-white/25 transition-all duration-500 shadow-xl">
          <!-- Avatar and basic info -->
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
              <img 
                v-if="store.user?.avatar && store.user.avatar !== ''" 
                :src="store.user.avatar" 
                :alt="store.user?.firstName || 'Avatar'"
                class="w-full h-full object-cover"
                @error="handleImageError"
              />
              <div 
                v-else
                class="w-full h-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-inner"
              >
                <span class="text-white font-black text-2xl drop-shadow-lg">
                  {{ store.user?.firstName?.charAt(0) || 'U' }}{{ store.user?.lastName?.charAt(0) || '' }}
                </span>
              </div>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white drop-shadow-sm">
                {{ store.user?.firstName || 'Пользователь' }} {{ store.user?.lastName || '' }}
              </h2>
              <p class="text-white/90 font-medium">@{{ store.user?.username || 'user' }}</p>
              <p class="text-sm text-white/80 font-medium">Присоединился: {{ joinDate }}</p>
            </div>
          </div>

          <!-- Main Stats -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="text-center bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-4 border border-cyan-400/30">
              <div class="text-3xl font-bold text-cyan-300 drop-shadow-sm">{{ userTokens }}</div>
              <div class="text-sm text-white/90 font-medium">Токенов</div>
            </div>
            <div class="text-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-400/30">
              <div class="text-3xl font-bold text-purple-300 drop-shadow-sm">{{ userGenerations }}</div>
              <div class="text-sm text-white/90 font-medium">Генераций</div>
            </div>
          </div>

          <!-- Secondary Stats -->
          <div class="grid grid-cols-2 gap-3">
            <div class="text-center bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg p-3 border border-emerald-400/30">
              <div class="text-xl font-bold text-emerald-300 drop-shadow-sm">{{ tokensSpent }}</div>
              <div class="text-xs text-white/90 font-medium">Потрачено</div>
            </div>
            <div class="text-center bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-3 border border-pink-400/30">
              <div class="text-xl font-bold text-pink-300 drop-shadow-sm">{{ userReferrals }}</div>
              <div class="text-xs text-white/90 font-medium">Рефералов</div>
            </div>
          </div>

          <!-- Last Generation Info -->
          <div v-if="lastGeneration" class="mt-4 p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg border border-indigo-400/30">
            <div class="text-center">
              <div class="text-sm text-white/80 font-medium mb-1">Последняя генерация</div>
              <div class="text-xs text-white/90">{{ formatLastGeneration(lastGeneration) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="grid grid-cols-3 gap-3">
        <router-link to="/history" class="block">
          <div class="relative group h-full">
            <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur group-hover:blur-lg transition-all duration-300"></div>
            <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 flex flex-col items-center justify-center min-h-[120px] h-full">
              <div class="w-12 h-12 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center mb-3">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="text-white font-medium text-sm text-center">История</div>
              <div class="text-gray-400 text-xs text-center">платежей</div>
            </div>
          </div>
        </router-link>

        <router-link to="/generations" class="block">
          <div class="relative group h-full">
            <div class="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur group-hover:blur-lg transition-all duration-300"></div>
            <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 flex flex-col items-center justify-center min-h-[120px] h-full">
              <div class="w-12 h-12 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center mb-3">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div class="text-white font-medium text-sm text-center">История</div>
              <div class="text-gray-400 text-xs text-center">генераций</div>
            </div>
          </div>
        </router-link>

        <router-link to="/settings" class="block">
          <div class="relative group h-full">
            <div class="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-2xl blur group-hover:blur-lg transition-all duration-300"></div>
            <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 flex flex-col items-center justify-center min-h-[120px] h-full">
              <div class="w-12 h-12 bg-gradient-to-r from-pink-400 to-rose-500 rounded-xl flex items-center justify-center mb-3">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <div class="text-white font-medium text-sm text-center">Настройки</div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
</template>

<style scoped>
.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}

* {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
