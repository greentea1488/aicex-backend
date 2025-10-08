<script setup lang="ts">
import { ref } from 'vue'

const newsItems = ref([
  {
    id: 1,
    title: "ELEVEN V3 - Новое обновление!",
    description: "Тон разговора, крик, кашель - теперь AI может передавать эмоции в голосе",
    date: "23 сентября 2025",
    category: "Обновления",
    gradient: "from-amber-500/20 to-orange-500/20",
    buttonGradient: "from-amber-500 to-orange-500",
    icon: "🎤"
  },
  {
    id: 2,
    title: "Groq AI теперь доступен!",
    description: "Быстрые и бесплатные ответы от GPT OSS 20B модели",
    date: "22 сентября 2025",
    category: "Новости",
    gradient: "from-emerald-500/20 to-cyan-500/20",
    buttonGradient: "from-emerald-500 to-cyan-500",
    icon: "🚀"
  },
  {
    id: 3,
    title: "Новые AI-модели",
    description: "Midjourney, Kling, Runway и Freepik + Lora уже в разработке",
    date: "21 сентября 2025",
    category: "Разработка",
    gradient: "from-purple-500/20 to-pink-500/20",
    buttonGradient: "from-purple-500 to-pink-500",
    icon: "🎨"
  }
])

const socialLinks = [
  {
    name: "Telegram чат",
    description: "Помощь, поддержка и общение",
    icon: "💬",
    gradient: "from-cyan-500/20 to-blue-500/20",
    buttonGradient: "from-cyan-500 to-blue-500",
    url: "https://t.me/AicexOne",
    active: true
  },
  {
    name: "Telegram канал",
    description: "Гайды, инсайты и новости",
    icon: "📢",
    gradient: "from-blue-500/20 to-indigo-500/20",
    buttonGradient: "from-blue-500 to-indigo-500",
    url: "https://t.me/AicexOneNews",
    active: true
  },
  {
    name: "Instagram",
    description: "Тренды, лайфхаки и новинки",
    icon: "📸",
    gradient: "from-pink-500/20 to-rose-500/20",
    buttonGradient: "from-pink-500 to-rose-500",
    url: "#",
    active: false
  },
  {
    name: "ВКонтакте",
    description: "Мы ВКонтакте",
    icon: "👥",
    gradient: "from-blue-600/20 to-blue-700/20",
    buttonGradient: "from-blue-600 to-blue-700",
    url: "#",
    active: false
  }
]
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
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Новости и обновления
        </h1>
        <p class="text-gray-300 text-lg">Следите за последними новостями AICEX ONE</p>
      </div>

      <!-- News Section -->
      <div class="max-w-4xl mx-auto mb-12">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
          <span>📰</span>
          <span>Последние новости</span>
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="news in newsItems"
            :key="news.id"
            class="group relative"
          >
            <!-- Glow effect -->
            <div 
              class="absolute inset-0 rounded-3xl blur-xl transition-all duration-500"
              :class="[
                `bg-gradient-to-r ${news.gradient}`,
                'group-hover:blur-2xl group-hover:opacity-100'
              ]"
            ></div>
            
            <!-- Card -->
            <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
              <!-- Category badge -->
              <div class="flex items-center justify-between mb-4">
                <div 
                  class="text-xs font-semibold px-3 py-1 rounded-full"
                  :class="[
                    `bg-gradient-to-r ${news.gradient} text-white`
                  ]"
                >
                  {{ news.category }}
                </div>
                <div class="text-2xl">{{ news.icon }}</div>
              </div>

              <!-- Content -->
              <h3 class="text-white font-bold text-lg mb-3 leading-relaxed">
                {{ news.title }}
              </h3>
              
              <p class="text-gray-300 text-sm mb-4 leading-relaxed">
                {{ news.description }}
              </p>
              
              <div class="text-xs text-gray-400 mb-4">
                {{ news.date }}
              </div>

              <!-- Button -->
              <button
                class="w-full bg-gradient-to-r text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-lg flex items-center justify-center space-x-2"
                :class="[
                  `hover:shadow-${news.buttonGradient.split(' ')[1].split('-')[1]}-500/25`,
                  news.buttonGradient
                ]"
              >
                <span>Подробнее</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Social Links Section -->
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
          <span>🌐</span>
          <span>Мы в социальных сетях</span>
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            v-for="social in socialLinks"
            :key="social.name"
            :href="social.url"
            target="_blank"
            class="group relative block"
            :class="{ 'pointer-events-none opacity-50': !social.active }"
          >
            <!-- Glow effect -->
            <div 
              class="absolute inset-0 rounded-3xl blur-xl transition-all duration-500"
              :class="[
                `bg-gradient-to-r ${social.gradient}`,
                social.active ? 'group-hover:blur-2xl group-hover:opacity-100' : 'opacity-30'
              ]"
            ></div>
            
            <!-- Card -->
            <div 
              class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 transition-all duration-500"
              :class="[
                social.active 
                  ? 'hover:bg-white/15 hover:scale-105 hover:shadow-2xl' 
                  : 'cursor-not-allowed'
              ]"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <div class="text-2xl">{{ social.icon }}</div>
                  <div>
                    <h3 class="text-white font-semibold text-lg">{{ social.name }}</h3>
                    <div 
                      class="text-sm"
                      :class="[
                        social.active ? 'text-gray-300' : 'text-gray-500'
                      ]"
                    >
                      {{ social.description }}
                    </div>
                  </div>
                </div>
                
                <div 
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  :class="[
                    social.active 
                      ? 'bg-white/20 group-hover:bg-white/30' 
                      : 'bg-gray-600'
                  ]"
                >
                  <svg 
                    class="w-4 h-4 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </div>
              </div>

              <div 
                v-if="!social.active"
                class="text-center py-2"
              >
                <span class="text-gray-500 text-sm">Скоро будет доступно</span>
              </div>
            </div>
          </a>
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