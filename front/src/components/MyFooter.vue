<script setup lang="ts">
// No imports needed - using inline SVGs
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-50">
    <!-- Glass morphism background -->
    <div class="absolute inset-0 bg-white/10 backdrop-blur-2xl border-t border-white/20"></div>
    
    <!-- Navigation -->
    <nav class="relative flex justify-around items-center px-4 pb-safe-bottom" style="height: calc(5rem + env(safe-area-inset-bottom)); min-height: 5rem;">
      <!-- Home -->
      <router-link
        to="/home"
        class="flex flex-col items-center justify-center transition-all duration-300 group"
        :class="[$route.path.includes('home') || $route.path.includes('settings') ? 'text-white' : 'text-gray-400']"
      >
        <div class="relative">
          <div 
            v-if="$route.path.includes('home') || $route.path.includes('settings')"
            class="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-2xl blur-lg"
          ></div>
          <div 
            class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
            :class="[$route.path.includes('home') || $route.path.includes('settings') ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10']"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                v-if="$route.path.includes('home') || $route.path.includes('settings')"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
              <path 
                v-else
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>
        <span class="text-xs mt-2 font-medium">Главная</span>
      </router-link>

      <!-- Partnership -->
      <router-link
        to="/referrals"
        class="flex flex-col items-center justify-center transition-all duration-300 group"
        :class="[$route.path.includes('referrals') ? 'text-white' : 'text-gray-400']"
      >
        <div class="relative">
          <div 
            v-if="$route.path.includes('referrals')"
            class="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-2xl blur-lg"
          ></div>
          <div 
            class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
            :class="[$route.path.includes('referrals') ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10']"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                v-if="$route.path.includes('referrals')"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
              <path 
                v-else
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>
        <span class="text-xs mt-2 font-medium">Партнерство</span>
      </router-link>

      <!-- News -->
      <router-link
        to="/news"
        class="flex flex-col items-center justify-center transition-all duration-300 group"
        :class="[$route.path.includes('news') ? 'text-white' : 'text-gray-400']"
      >
        <div class="relative">
          <div 
            v-if="$route.path.includes('news')"
            class="absolute inset-0 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-2xl blur-lg"
          ></div>
          <div 
            class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
            :class="[$route.path.includes('news') ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10']"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                v-if="$route.path.includes('news')"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
              <path 
                v-else
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>
        <span class="text-xs mt-2 font-medium">Новости</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.backdrop-blur-2xl {
  backdrop-filter: blur(40px);
}
</style>