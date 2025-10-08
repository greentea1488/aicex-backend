<template>
  <!-- Header -->
  <div class="mb-4 pt-4 telegram-content">
    <div class="flex items-center gap-3">
      <button 
        @click="goBack"
        class="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
      >
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
      <div>
        <h1 class="text-xl font-bold text-white">История генераций</h1>
        <p class="text-white/90 text-sm font-medium">{{ totalGenerations }} {{ getGenerationsText(totalGenerations) }}</p>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-4xl mx-auto px-4 telegram-content">
    <div class="relative group">
      <div class="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      <div class="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-500">
          
          <!-- Stats -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gradient-to-br from-blue-500/40 to-purple-500/40 backdrop-blur-xl border border-blue-400/60 rounded-xl p-4 hover:border-blue-400/80 transition-all duration-300 shadow-lg">
              <div class="text-white text-xs font-bold mb-1 uppercase tracking-wide">Всего генераций</div>
              <div class="text-2xl font-bold text-white drop-shadow-sm">{{ totalGenerations }}</div>
            </div>
            <div class="bg-gradient-to-br from-green-500/40 to-emerald-500/40 backdrop-blur-xl border border-green-400/60 rounded-xl p-4 hover:border-green-400/80 transition-all duration-300 shadow-lg">
              <div class="text-white text-xs font-bold mb-1 uppercase tracking-wide">Токенов потрачено</div>
              <div class="text-2xl font-bold text-white drop-shadow-sm">{{ tokensSpent }}</div>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="generations.length === 0" class="text-center py-16">
            <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 backdrop-blur-xl border border-purple-400/30 flex items-center justify-center">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-white mb-3 drop-shadow-sm">История генераций пуста</h3>
            <p class="text-white/90 text-base px-4 max-w-md mx-auto leading-relaxed font-medium">У вас пока нет созданных изображений. Начните создавать с помощью нашего бота и ваши генерации появятся здесь!</p>
            <button 
              @click="goBack"
              class="mt-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-xl hover:shadow-purple-500/30 border border-white/20"
            >
              Начать создавать
            </button>
          </div>

          <!-- Generations Grid -->
          <div v-else class="grid grid-cols-1 gap-4">
            <div 
              v-for="generation in generations" 
              :key="generation.id"
              class="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-xl border border-white/30 rounded-xl overflow-hidden hover:bg-white/25 hover:border-white/40 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 group shadow-lg"
            >
              <div class="flex p-4">
                <!-- Image -->
                <div class="w-24 h-24 flex-shrink-0 relative group rounded-xl overflow-hidden border border-white/40 shadow-md">
                  <img 
                    :src="generation.resultUrl" 
                    :alt="generation.prompt"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  <!-- Download button -->
                  <button 
                    @click="downloadImage(generation.resultUrl, generation.prompt)"
                    class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm"
                  >
                    <div class="bg-white/20 backdrop-blur-md rounded-full p-2">
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                  </button>
                </div>

                <!-- Content -->
                <div class="flex-1 pl-4 min-w-0 flex flex-col justify-between">
                  <!-- Service and Type -->
                  <div class="flex items-center gap-2 mb-2">
                    <span class="px-3 py-1 rounded-full text-xs font-medium shadow-sm" :class="getServiceBadgeClass(generation.service)">
                      {{ getServiceName(generation.service) }}
                    </span>
                    <span class="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/20">
                      {{ generation.type }}
                    </span>
                  </div>

                  <!-- Prompt -->
                  <p class="text-white text-sm line-clamp-2 mb-3 leading-relaxed font-semibold drop-shadow-sm">
                    {{ generation.prompt }}
                  </p>

                  <!-- Date and Tokens -->
                  <div class="flex items-center justify-between text-xs text-white/90 font-medium">
                    <div class="flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>{{ formatDate(generation.createdAt) }}</span>
                    </div>
                    <div class="flex items-center gap-1 bg-white/20 border border-white/30 px-2 py-1 rounded-full shadow-sm">
                      <svg class="w-3 h-3 text-yellow-300 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      <span class="font-semibold text-white">{{ generation.tokensUsed }} ток.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Load More Button -->
          <div v-if="hasNextPage && !loading" class="mt-8 text-center">
            <button 
              @click="loadMore"
              class="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl border border-purple-400/30 hover:border-purple-400/50 hover:from-purple-500/30 hover:to-blue-500/30 text-white px-8 py-4 rounded-2xl transition-all duration-300 font-medium shadow-lg hover:shadow-purple-500/25"
            >
              Загрузить еще
            </button>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/http/api'

const router = useRouter()

// State
const loading = ref(false)
const generations = ref<any[]>([])
const currentPage = ref(1)
const hasNextPage = ref(false)
const totalGenerations = ref(0)
const tokensSpent = ref(0)

// Computed
const getServiceName = (service: string) => {
  const names: Record<string, string> = {
    'freepik': 'Freepik',
    'dalle': 'DALL-E',
    'midjourney': 'Midjourney',
    'runway': 'Runway',
    'openai': 'ChatGPT',
    'kling': 'Kling'
  }
  return names[service] || service
}

const getServiceBadgeClass = (service: string) => {
  const classes: Record<string, string> = {
    'freepik': 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-blue-200 border border-blue-400/30',
    'dalle': 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border border-purple-400/30',
    'midjourney': 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-200 border border-green-400/30',
    'runway': 'bg-gradient-to-r from-orange-500/30 to-red-500/30 text-orange-200 border border-orange-400/30',
    'openai': 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-indigo-200 border border-indigo-400/30',
    'kling': 'bg-gradient-to-r from-violet-500/30 to-purple-500/30 text-violet-200 border border-violet-400/30'
  }
  return classes[service] || 'bg-gradient-to-r from-gray-500/30 to-slate-500/30 text-gray-200 border border-gray-400/30'
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getGenerationsText = (count: number) => {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'генераций'
  }
  
  if (lastDigit === 1) {
    return 'генерация'
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'генерации'
  }
  
  return 'генераций'
}

const downloadImage = async (url: string, filename: string) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename.slice(0, 50)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('Download error:', error)
  }
}

const loadGenerations = async (page = 1, append = false) => {
  try {
    loading.value = true
    
    const response = await api.generations.getHistory(undefined, page, 20)
    
    if (response.data) {
      // API возвращает { history, pagination }, а не { data: { data, pagination } }
      const data = response.data as any
      
      if (append) {
        generations.value = [...generations.value, ...data.history]
      } else {
        generations.value = data.history
      }
      
      hasNextPage.value = data.pagination.hasNext
      currentPage.value = page
      
      // Update stats based on loaded generations
      totalGenerations.value = generations.value.length
      tokensSpent.value = generations.value.reduce((sum, gen) => sum + (gen.tokensUsed || 0), 0)
    }
  } catch (error) {
    console.error('Error loading generations:', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await api.stats.get()
    
    if (response.data?.success && response.data.data) {
      const stats = response.data.data
      totalGenerations.value = stats.totalGenerations || 0
      tokensSpent.value = stats.tokensSpent || 0
    } else {
      // Fallback: count from loaded generations
      totalGenerations.value = generations.value.length
      tokensSpent.value = generations.value.reduce((sum, gen) => sum + (gen.tokensUsed || 0), 0)
    }
  } catch (error) {
    console.error('Error loading stats:', error)
    // Fallback: count from loaded generations
    totalGenerations.value = generations.value.length
    tokensSpent.value = generations.value.reduce((sum, gen) => sum + (gen.tokensUsed || 0), 0)
  }
}

const loadMore = () => {
  loadGenerations(currentPage.value + 1, true)
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await Promise.all([
    loadGenerations(),
    loadStats()
  ])
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
