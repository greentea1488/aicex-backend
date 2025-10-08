<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getPaymentHistory, getTokenHistory } from "@/http/endpoints";
import type { Payment, TokenHistory } from "@/types";

const router = useRouter();
const selectedTab = ref("tab1");
const payments = ref<Payment[]>([]);
const tokenHistory = ref<TokenHistory[]>([]);
const loading = ref(false);

watch(selectedTab, newVal => {
  if (newVal === "tab1") {
    loadPaymentHistory();
  } else {
    loadTokenHistory();
  }
});

async function loadPaymentHistory() {
  try {
    loading.value = true;
    const response = await getPaymentHistory({ limit: 20 });
    payments.value = response.data.payments;
    console.log('💰 Payment history loaded:', response.data);
  } catch (error) {
    console.error("Error loading payment history:", error);
  } finally {
    loading.value = false;
  }
}

async function loadTokenHistory() {
  try {
    loading.value = true;
    console.log('🔄 Loading token history...');
    const response = await getTokenHistory({ page: 1, limit: 20 });
    console.log('📊 Token history response:', response);
    console.log('📊 Token history data:', response.data);
    console.log('📊 Token history array:', response.data.history);
    tokenHistory.value = response.data.history;
    console.log('📊 Token history loaded:', response.data);
  } catch (error) {
    console.error("Error loading token history:", error);
    console.error("Error details:", error);
  } finally {
    loading.value = false;
  }
}

const goBack = () => {
  router.back();
};

const getTransactionTypeText = (type: string) => {
  const types: Record<string, string> = {
    'PURCHASE': 'Покупка',
    'BONUS': 'Бонус',
    'REFERRAL': 'Реферал',
    'SPEND_FREEPIK': 'Freepik',
    'SPEND_MIDJOURNEY': 'Midjourney',
    'SPEND_RUNWAY': 'Runway',
    'SPEND_CHATGPT': 'ChatGPT',
    'REFUND': 'Возврат',
    'ADMIN_ADJUST': 'Корректировка'
  };
  return types[type] || type;
};

onMounted(() => {
  loadPaymentHistory();
});
</script>

<template>
  <!-- Animated background elements -->
  <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 px-6 telegram-content">
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
          История платежей
        </h1>
        
        <div class="w-10"></div> <!-- Spacer for centering -->
      </div>

      <!-- Main Content -->
      <div class="max-w-4xl mx-auto">
        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-gray-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500">
            <!-- Tab Navigation -->
            <div class="bg-white/5 rounded-2xl p-1 mb-6">
              <div class="flex gap-1">
                <button
                  @click="selectedTab = 'tab1'"
                  class="flex-1 py-2.5 px-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 min-w-0"
                  :class="[
                    selectedTab === 'tab1' 
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  ]"
                >
                  <span class="truncate">История платежей</span>
                </button>
                <button
                  @click="selectedTab = 'tab2'"
                  class="flex-1 py-2.5 px-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 min-w-0"
                  :class="[
                    selectedTab === 'tab2' 
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  ]"
                >
                  <span class="truncate">История токенов</span>
                </button>
              </div>
            </div>

            <!-- Tab Content -->
            <div class="min-h-[400px]">
              <transition name="fade" mode="out-in">
                <!-- Payment History -->
                <div v-if="selectedTab === 'tab1'" class="space-y-4">
                  <div v-if="loading" class="text-center py-12">
                    <div class="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg class="w-8 h-8 text-cyan-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    </div>
                    <p class="text-gray-400">Загрузка истории платежей...</p>
                  </div>
                  
                  <div v-else-if="payments.length === 0" class="text-center py-12">
                    <div class="w-20 h-20 bg-gray-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                    </div>
                    <h4 class="text-white font-semibold text-lg mb-2">Платежи отсутствуют</h4>
                    <p class="text-gray-400 mb-6">У вас пока нет истории платежей</p>
                    <router-link
                      to="/subscription"
                      class="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 inline-flex items-center space-x-2"
                    >
                      <span>Купить токены</span>
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                      </svg>
                    </router-link>
                  </div>
                  
                  <div v-else class="space-y-3">
                    <div
                      v-for="payment in payments"
                      :key="payment.id"
                      class="bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                          <div 
                            class="w-12 h-12 rounded-2xl flex items-center justify-center"
                            :class="[
                              payment.status === 'completed' 
                                ? 'bg-emerald-500/20' 
                                : payment.status === 'pending'
                                ? 'bg-amber-500/20'
                                : 'bg-red-500/20'
                            ]"
                          >
                            <svg 
                              class="w-6 h-6" 
                              :class="[
                                payment.status === 'completed' 
                                  ? 'text-emerald-400' 
                                  : payment.status === 'pending'
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              ]"
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                v-if="payment.status === 'completed'"
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M5 13l4 4L19 7"
                              />
                              <path 
                                v-else-if="payment.status === 'pending'"
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                              <path 
                                v-else
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </div>
                          <div>
                            <div class="text-white font-semibold text-lg">
                              {{ payment.amount }} {{ payment.currency }}
                            </div>
                            <div class="text-gray-400 text-sm">
                              {{ new Date(payment.createdAt).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) }}
                            </div>
                          </div>
                        </div>
                        <div class="text-right">
                          <div 
                            class="text-sm font-semibold px-3 py-1 rounded-full"
                            :class="[
                              payment.status === 'completed' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : payment.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            ]"
                          >
                            {{ 
                              payment.status === 'completed' ? 'Завершен' :
                              payment.status === 'pending' ? 'В обработке' :
                              'Отклонен'
                            }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Token History -->
                <div v-else class="space-y-4">
                  <div v-if="loading" class="text-center py-12">
                    <div class="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg class="w-8 h-8 text-cyan-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    </div>
                    <p class="text-gray-400">Загрузка истории токенов...</p>
                  </div>
                  
                  <div v-else-if="tokenHistory.length === 0" class="text-center py-12">
                    <div class="w-20 h-20 bg-gray-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                      </svg>
                    </div>
                    <h4 class="text-white font-semibold text-lg mb-2">История токенов пуста</h4>
                    <p class="text-gray-400 mb-6">У вас пока нет операций с токенами</p>
                    <router-link
                      to="/subscription"
                      class="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 inline-flex items-center space-x-2"
                    >
                      <span>Купить токены</span>
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                      </svg>
                    </router-link>
                  </div>
                  
                  <div v-else class="space-y-3">
                    <div
                      v-for="history in tokenHistory"
                      :key="history.id"
                      class="bg-gradient-to-r from-white/5 to-white/3 rounded-xl p-3 hover:from-white/10 hover:to-white/5 transition-all duration-300 border border-white/10 hover:border-white/20"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <!-- Icon and Type -->
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                          <div 
                            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            :class="[
                              history.amount > 0 
                                ? 'bg-emerald-500/20 border border-emerald-400/30' 
                                : 'bg-red-500/20 border border-red-400/30'
                            ]"
                          >
                            <svg 
                              class="w-4 h-4" 
                              :class="[
                                history.amount > 0 
                                  ? 'text-emerald-400' 
                                  : 'text-red-400'
                              ]"
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                v-if="history.amount > 0"
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                              <path 
                                v-else
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M18 12H6"
                              />
                            </svg>
                          </div>
                          
                          <!-- Type and Date in one line -->
                          <div class="flex-1 min-w-0">
                            <div class="text-white font-medium text-sm truncate">
                              {{ getTransactionTypeText(history.type) }}
                              <span class="text-gray-400 text-xs ml-2">
                                {{ new Date(history.createdAt).toLocaleDateString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) }}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Amount in one line -->
                        <div class="flex items-center gap-1 flex-shrink-0">
                          <span 
                            class="text-sm font-bold"
                            :class="[
                              history.amount > 0 
                                ? 'text-emerald-400' 
                                : 'text-red-400'
                            ]"
                          >
                            {{ history.amount > 0 ? "+" : "" }}{{ history.amount }}
                          </span>
                          <span class="text-gray-400 text-xs">ток.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
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