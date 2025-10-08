<script setup lang="ts">
import Balance from "@/views/ReferralsTabs/Balance.vue";
import Docs from "@/views/ReferralsTabs/Docs.vue";
import Referrals from "@/views/ReferralsTabs/Referrals.vue";
import { ref } from "vue";

const components = [Balance, Referrals, Docs];
const tabs = [
  { id: "balance", label: "Баланс", icon: "💰" },
  { id: "referrals", label: "Рефералы", icon: "👥" },
  { id: "docs", label: "Документация", icon: "📚" },
];

const currentComponentIdx = ref(0);
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
          Партнерская программа
        </h1>
        <p class="text-gray-300 text-lg">Приглашайте друзей и зарабатывайте вместе с AICEX ONE</p>
      </div>

      <!-- Tab Navigation -->
      <div class="max-w-4xl mx-auto mb-8">
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-2">
          <div class="flex flex-row justify-around gap-2">
            <button
              v-for="(tab, index) in tabs"
              :key="tab.id"
              class="flex-1 h-12 text-sm rounded-2xl flex items-center justify-center space-x-2 transition-all duration-300"
              :class="[
                currentComponentIdx === index 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              ]"
              @click="currentComponentIdx = index"
            >
              <span class="text-lg">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Dynamic Content with Transition -->
      <div class="max-w-4xl mx-auto">
        <transition
          name="fade"
          mode="out-in"
        >
          <keep-alive>
            <component :is="components[currentComponentIdx]" />
          </keep-alive>
        </transition>
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

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

* {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>