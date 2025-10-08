<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const settings = ref([
  {
    id: 'notifications',
    title: 'Уведомления об обновлениях',
    description: 'Получайте уведомления о новых функциях и улучшениях AICEX ONE',
    enabled: true,
    icon: '🔔'
  },
  {
    id: 'marketing',
    title: 'Маркетинговые уведомления',
    description: 'Информация о специальных предложениях и акциях',
    enabled: false,
    icon: '📢'
  },
  {
    id: 'security',
    title: 'Уведомления безопасности',
    description: 'Важные уведомления о безопасности вашего аккаунта',
    enabled: true,
    icon: '🔒'
  },
  {
    id: 'referrals',
    title: 'Уведомления о рефералах',
    description: 'Получайте уведомления о новых рефералах и заработке',
    enabled: true,
    icon: '👥'
  }
])

const toggleSetting = (settingId: string) => {
  const setting = settings.value.find(s => s.id === settingId)
  if (setting) {
    setting.enabled = !setting.enabled
  }
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <!-- Animated background elements -->
  <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 px-6">
      <!-- Navigation Header -->
      <div class="flex items-center justify-between mb-8">
        <button
          @click="goBack"
          class="flex items-center space-x-3 text-white hover:text-cyan-400 transition-colors duration-300"
        >
          <div class="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all duration-300">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </div>
          <span class="font-medium">Назад</span>
        </button>
        
        <h1 class="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Настройки
        </h1>
        
        <div class="w-10"></div> <!-- Spacer for centering -->
      </div>

      <!-- Settings Content -->
      <div class="max-w-2xl mx-auto space-y-6">
        <!-- Notifications Section -->
        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500">
            <div class="flex items-center space-x-4 mb-6">
              <div class="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-3xl flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.5 19.5a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 6v12a1.5 1.5 0 01-1.5 1.5h-15z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-white font-bold text-xl">Уведомления</h3>
                <p class="text-gray-300 text-sm">Настройте получение уведомлений</p>
              </div>
            </div>
            
            <div class="space-y-4">
              <div
                v-for="setting in settings"
                :key="setting.id"
                class="bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4 flex-1">
                    <div class="text-2xl">{{ setting.icon }}</div>
                    <div class="flex-1">
                      <h4 class="text-white font-semibold text-lg">{{ setting.title }}</h4>
                      <p class="text-gray-300 text-sm leading-relaxed">{{ setting.description }}</p>
                    </div>
                  </div>
                  
                  <button
                    @click="toggleSetting(setting.id)"
                    class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-transparent"
                    :class="[
                      setting.enabled 
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500' 
                        : 'bg-gray-600'
                    ]"
                  >
                    <span
                      class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300"
                      :class="[
                        setting.enabled ? 'translate-x-7' : 'translate-x-1'
                      ]"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Support Section -->
        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500">
            <div class="flex items-center space-x-4 mb-6">
              <div class="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-white font-bold text-xl">Поддержка</h3>
                <p class="text-gray-300 text-sm">Помощь и обратная связь</p>
              </div>
    </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://t.me/AicexOne"
                target="_blank"
                class="bg-white/5 hover:bg-white/10 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-105 block"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                  <div>
                    <div class="text-white font-semibold">Telegram поддержка</div>
                    <div class="text-gray-400 text-sm">Быстрая помощь</div>
    </div>
  </div>
              </a>
              
              <button class="bg-white/5 hover:bg-white/10 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-105">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
    </div>
                  <div>
                    <div class="text-white font-semibold">Сообщить об ошибке</div>
                    <div class="text-gray-400 text-sm">Помогите улучшить</div>
    </div>
  </div>
              </button>
    </div>
    </div>
  </div>
    </div>
    </div>
</template>

<style scoped>
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

.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}

* {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
