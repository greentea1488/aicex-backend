<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/stores/store'

const store = useStore()

// Получаем инициалы пользователя
const userInitials = computed(() => {
  const firstName = store.user?.firstName || ''
  const lastName = store.user?.lastName || ''
  return `${firstName.charAt(0)}${lastName.charAt(0)}` || 'U'
})

const handleImageError = (e: Event) => {
  console.log('Avatar image failed to load, showing initials instead')
  console.log('User avatar URL:', store.user?.avatar)
  // Не скрываем изображение, просто логируем ошибку
}

</script>

<template>
  <div class="flex flex-row gap-3 mb-6">
    <!-- User Profile Card -->
    <div class="flex-1 relative group">
      <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
      <div class="relative bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-4 hover:bg-white/25 transition-all duration-500 shadow-lg">
        <div class="flex items-center space-x-4">
          <router-link to="/profile" class="relative">
            <div class="w-12 h-12 rounded-xl overflow-hidden group-hover:scale-105 transition-transform duration-300 border border-white/20">
              <img 
                v-if="store.user?.avatar && store.user.avatar !== ''" 
                :src="store.user.avatar" 
                :alt="store.user?.firstName || 'Avatar'"
                class="w-full h-full object-cover"
                @error="handleImageError"
                @load="console.log('Avatar loaded successfully:', store.user?.avatar)"
              />
              <div 
                v-else
                class="w-full h-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-inner"
              >
                <span class="text-white font-black text-lg drop-shadow-lg">
                  {{ userInitials }}
                </span>
              </div>
            </div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full border-2 border-white/20"></div>
          </router-link>
          <div class="flex-1">
            <h3 class="text-white font-semibold text-lg drop-shadow-sm">{{ store.user?.tokens || 0 }}</h3>
            <p class="text-white/90 text-sm font-medium">токенов доступно</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex gap-3">
      <router-link to="/settings" class="relative group">
        <div class="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 hover:bg-white/15 transition-all duration-500 hover:scale-105">
          <div class="text-center">
            <div class="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-xl flex items-center justify-center mx-auto mb-2">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div class="text-white text-xs font-medium">Настройки</div>
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
</style>
