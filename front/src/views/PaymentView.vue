<script setup lang="ts">
import { useRoute } from "vue-router";
import { ref, computed, onMounted } from "vue";
import { useStore } from "@/stores/store";
import lavaTopService from "@/services/LavaTopService";

const route = useRoute();
const store = useStore();

const loading = ref(false);
const error = ref("");
const paymentMethods = ref<Array<{
  id: string;
  name: string;
  icon: string;
  minAmount: number;
  maxAmount: number;
  currency: string[];
}>>([]);

const plans = {
  free: "Бесплатный",
  basic: "Базовая",
  base: "Базовая", // Для обратной совместимости
  pro: "Про",
  premium: "Премиум",
};

const planPrices = {
  basic: { rub: 499, eur: 4.5, usd: 5 },
  base: { rub: 499, eur: 4.5, usd: 5 }, // Для обратной совместимости
  pro: { rub: 1699, eur: 16, usd: 18 },
  premium: { rub: 2999, eur: 28, usd: 31 },
};

function getPlan(plan: string): string | undefined {
  return plans[plan as keyof typeof plans];
}

const isSubscription = computed(() => route.params.type === "subscription");

// Получаем параметры из URL
const planId = computed(() => route.query.plan as string);
const tokenAmount = computed(() => parseInt(route.query.amount as string) || 1000);

// Функция создания платежа через Lava Top
const createPayment = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = '';

    let paymentResponse;

    if (isSubscription.value && planId.value) {
      // Проверяем наличие пользователя
      if (!store.user?.id) {
        throw new Error('User not found. Please refresh the page.');
      }
      
      // Создаем платеж для подписки
      paymentResponse = await lavaTopService.createSubscriptionPaymentWithUserId(
        planId.value as 'basic' | 'pro' | 'premium',
        store.user.id
      );
    } else {
      // Создаем платеж для токенов
      paymentResponse = await lavaTopService.createTokenPayment(tokenAmount.value);
    }

    // Перенаправляем на страницу оплаты
    if (paymentResponse.url) {
      window.location.href = paymentResponse.url;
    } else {
      throw new Error('Не получена ссылка для оплаты');
    }

  } catch (err: any) {
    console.error('Payment creation error:', err);
    
    // Более детальная обработка ошибок
    if (err.response?.status === 401) {
      error.value = 'Ошибка авторизации. Перезагрузите страницу.';
    } else if (err.response?.status === 400) {
      error.value = 'Неверные данные платежа. Попробуйте еще раз.';
    } else if (err.response?.status === 500) {
      error.value = 'Сервер временно недоступен. Попробуйте позже.';
    } else if (err.message?.includes('Network Error')) {
      error.value = 'Проблема с подключением. Проверьте интернет.';
    } else {
      error.value = err.message || 'Не удалось создать платеж. Попробуйте позже.';
    }
  } finally {
    loading.value = false;
  }
};

// Загрузка доступных методов оплаты
const loadPaymentMethods = async () => {
  try {
    const methods = await lavaTopService.getPaymentMethods();
    paymentMethods.value = methods;
  } catch (err) {
    console.error('Error loading payment methods:', err);
  }
};

const totalPrice = computed(() => {
  if (isSubscription.value && planId.value && planId.value !== "free") {
    return planPrices[planId.value as keyof typeof planPrices]?.rub || 0;
  }
  if (!isSubscription.value && tokenAmount.value > 0) {
    return Math.round(tokenAmount.value * 1.43); // 1.43 рубля за токен
  }
  return 0;
});

onMounted(() => {
  loadPaymentMethods();
});


onMounted(() => {
  if (!store.user) {
    store.fetchUserProfile();
  }
});
</script>

<template>
  <!-- Animated background elements -->
  <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 container-mobile space-y-6 px-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <button
          @click="$router.back()"
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
          Оплата
        </h1>
        
        <div class="w-10"></div>
      </div>

      <!-- Payment Card -->
      <div class="max-w-md mx-auto px-4">
        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-500">
            
            <!-- Plan Info -->
            <div class="text-center mb-8">
              <div class="w-20 h-20 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="isSubscription" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              
              <h2 class="text-2xl font-bold text-white mb-2 text-center">
                {{ isSubscription ? getPlan(planId || 'free') + " подписка" : "Покупка токенов" }}
              </h2>
              
              <p class="text-gray-300">
                {{ isSubscription ? "Разблокируйте все возможности AI" : `${tokenAmount} токенов для генерации` }}
              </p>
            </div>

            <!-- Payment Details -->
            <div class="space-y-4 mb-8">
              <div class="bg-white/5 rounded-lg p-4 space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-gray-300">Получатель:</span>
                  <span class="text-white font-medium">{{ store.user?.firstName || store.user?.username || "Пользователь" }}</span>
                </div>
                
                <div v-if="isSubscription" class="flex justify-between items-center">
                  <span class="text-gray-300">Период:</span>
                  <span class="text-white font-medium">1 месяц</span>
                </div>
                
                <div v-if="!isSubscription" class="flex justify-between items-center">
                  <span class="text-gray-300">Количество:</span>
                  <span class="text-white font-medium">{{ tokenAmount }} токенов</span>
                </div>
                
                <div class="border-t border-white/10 pt-3">
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold text-white">Итого:</span>
                    <span class="text-2xl font-bold text-cyan-400">{{ totalPrice }} ₽</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Button -->
            <button
              @click="createPayment"
              :disabled="loading || totalPrice === 0"
              class="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span v-if="loading" class="flex items-center space-x-2">
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Обработка...</span>
              </span>
              <span v-else class="flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
                <span>Оплатить через Lava.top</span>
              </span>
            </button>

            <!-- Error Message -->
            <div v-if="error" class="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p class="text-red-300 text-center">{{ error }}</p>
            </div>

            <!-- Info -->
            <div class="mt-6 text-center">
              <p class="text-gray-400 text-sm">
                Безопасная оплата через Lava.top<br>
                Поддерживаются карты, СБП, криптовалюты
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped lang="scss"></style>
