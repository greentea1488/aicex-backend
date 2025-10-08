<script setup lang="ts">
import { useStore } from "@/stores/store";
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

const store = useStore();
const router = useRouter();

const counter = ref(2500);
const isAnimating = ref(false);

onMounted(() => {
  if (!store.user) {
    store.fetchUserProfile();
  }
});

const tokenPrice = 0.122; // EUR per token
const totalPrice = computed(() => {
  return (counter.value * tokenPrice).toFixed(2);
});

const priceInRubles = computed(() => {
  return (counter.value * tokenPrice * 87).toFixed(0); // Approximate RUB rate
});

const priceInUSD = computed(() => {
  return (counter.value * tokenPrice * 1.08).toFixed(2); // Approximate USD rate
});

function updateCounter(delta: number) {
  isAnimating.value = true;
  counter.value = Math.max(100, Math.min(10000, counter.value + delta));
  setTimeout(() => {
    isAnimating.value = false;
  }, 200);
}

function navigateToBuy() {
  if (store.isSubscribed) {
    router.push(`/payment/tokens?tokens=${counter.value}`);
  } else {
    router.push("/subscription");
  }
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
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Покупка токенов
        </h1>
        <p class="text-gray-300 text-lg">Пополните баланс для использования AI-сервисов</p>
      </div>

      <!-- Current balance -->
      <div class="max-w-md mx-auto mb-8">
        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500">
            <div class="text-center">
              <div class="flex items-center justify-center space-x-2 mb-2">
                <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                <span class="text-white font-semibold text-lg">Текущий баланс</span>
              </div>
              <div class="text-3xl font-bold text-white">{{ store.user?.tokens || 0 }}</div>
              <div class="text-sm text-gray-300">токенов доступно</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Token selector -->
      <div class="max-w-md mx-auto mb-8">
        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-500">
            <h3 class="text-white font-semibold text-xl text-center mb-6">Выберите количество токенов</h3>
            
            <!-- Counter -->
            <div class="flex items-center justify-between mb-6">
              <button
                @click="updateCounter(-100)"
                class="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
                :disabled="counter <= 100"
              >
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                </svg>
              </button>
              
              <div class="flex items-center space-x-3">
                <input
                  v-model="counter"
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  class="text-4xl font-bold text-white bg-transparent text-center w-32 border-none outline-none"
                />
                <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              
              <button
                @click="updateCounter(100)"
                class="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
                :disabled="counter >= 10000"
              >
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </button>
            </div>

            <!-- Price display -->
            <div class="bg-white/5 rounded-2xl p-4 mb-6">
              <div class="text-center">
                <div class="text-2xl font-bold text-white mb-2">{{ totalPrice }}€</div>
                <div class="text-sm text-gray-300 space-y-1">
                  <div>{{ priceInRubles }}₽</div>
                  <div>{{ priceInUSD }}$</div>
                  <div class="text-xs opacity-75">За 1 токен: {{ tokenPrice }}€</div>
                </div>
              </div>
            </div>

            <!-- Quick select buttons -->
            <div class="grid grid-cols-3 gap-3 mb-6">
              <button
                v-for="amount in [1000, 2500, 5000]"
                :key="amount"
                @click="counter = amount"
                class="bg-white/5 hover:bg-white/10 rounded-xl py-2 px-3 text-sm text-white transition-all duration-300 hover:scale-105"
                :class="{ 'bg-white/20': counter === amount }"
              >
                {{ amount }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Purchase button -->
      <div class="max-w-md mx-auto">
        <div 
          v-if="!store.isSubscribed"
          class="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-4 mb-6"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <div>
              <div class="text-amber-400 font-semibold">Требуется подписка</div>
              <div class="text-amber-300 text-sm">Купить токены можно только с активной подпиской</div>
            </div>
          </div>
        </div>

        <button
          @click="navigateToBuy"
          class="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center space-x-2"
        >
          <span>{{ store.isSubscribed ? "Купить токены" : "Приобрести подписку" }}</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </button>
      </div>

      <!-- Info section -->
      <div class="mt-12 max-w-2xl mx-auto">
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 class="text-white font-semibold text-lg mb-4 text-center">💡 Как работают токены?</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div class="flex items-start space-x-3">
              <div class="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div class="font-semibold text-white mb-1">Текстовые запросы</div>
                <div>1 токен ≈ 1-2 слова в ответе</div>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div class="font-semibold text-white mb-1">Генерация изображений</div>
                <div>10-50 токенов за изображение</div>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="w-2 h-2 bg-pink-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div class="font-semibold text-white mb-1">Генерация видео</div>
                <div>100-500 токенов за видео</div>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div class="font-semibold text-white mb-1">Безлимитное использование</div>
                <div>Токены не сгорают</div>
              </div>
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

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>