<template>
  <div class="animate-pulse">
    <!-- Card Skeleton -->
    <div v-if="type === 'card'" class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-white/20 rounded-2xl"></div>
          <div>
            <div class="h-4 bg-white/20 rounded w-24 mb-2"></div>
            <div class="h-3 bg-white/15 rounded w-16"></div>
          </div>
        </div>
        <div class="w-8 h-8 bg-white/20 rounded-full"></div>
      </div>
      <div class="h-3 bg-white/15 rounded w-full mb-4"></div>
      <div class="grid grid-cols-2 gap-3">
        <div class="h-10 bg-white/20 rounded-xl"></div>
        <div class="h-10 bg-white/20 rounded-xl"></div>
      </div>
    </div>

    <!-- Profile Skeleton -->
    <div v-else-if="type === 'profile'" class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6">
      <div class="flex items-center space-x-4 mb-6">
        <div class="w-16 h-16 bg-white/20 rounded-2xl"></div>
        <div class="flex-1">
          <div class="h-5 bg-white/20 rounded w-32 mb-2"></div>
          <div class="h-4 bg-white/15 rounded w-24 mb-2"></div>
          <div class="h-3 bg-white/10 rounded w-40"></div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="text-center">
          <div class="h-8 bg-white/20 rounded w-12 mx-auto mb-2"></div>
          <div class="h-3 bg-white/15 rounded w-16 mx-auto"></div>
        </div>
        <div class="text-center">
          <div class="h-8 bg-white/20 rounded w-12 mx-auto mb-2"></div>
          <div class="h-3 bg-white/15 rounded w-20 mx-auto"></div>
        </div>
        <div class="text-center">
          <div class="h-8 bg-white/20 rounded w-12 mx-auto mb-2"></div>
          <div class="h-3 bg-white/15 rounded w-18 mx-auto"></div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="h-12 bg-white/20 rounded-xl"></div>
        <div class="h-12 bg-white/20 rounded-xl"></div>
      </div>
    </div>

    <!-- List Item Skeleton -->
    <div v-else-if="type === 'list-item'" class="bg-white/5 rounded-2xl p-4 mb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-white/20 rounded-2xl"></div>
          <div>
            <div class="h-4 bg-white/20 rounded w-24 mb-2"></div>
            <div class="h-3 bg-white/15 rounded w-32"></div>
          </div>
        </div>
        <div class="text-right">
          <div class="h-4 bg-white/20 rounded w-16 mb-1"></div>
          <div class="h-3 bg-white/15 rounded w-12"></div>
        </div>
      </div>
    </div>

    <!-- Button Skeleton -->
    <div v-else-if="type === 'button'" class="h-12 bg-white/20 rounded-xl"></div>

    <!-- Text Skeleton -->
    <div v-else-if="type === 'text'" class="space-y-2">
      <div class="h-4 bg-white/20 rounded" :style="{ width: `${Math.random() * 40 + 60}%` }"></div>
      <div class="h-4 bg-white/15 rounded" :style="{ width: `${Math.random() * 30 + 50}%` }"></div>
      <div class="h-4 bg-white/10 rounded" :style="{ width: `${Math.random() * 50 + 40}%` }"></div>
    </div>

    <!-- Custom Skeleton -->
    <div v-else :class="customClass">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'card' | 'profile' | 'list-item' | 'button' | 'text' | 'custom'
  customClass?: string
}

withDefaults(defineProps<Props>(), {
  type: 'card',
  customClass: 'h-4 bg-white/20 rounded'
})
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
