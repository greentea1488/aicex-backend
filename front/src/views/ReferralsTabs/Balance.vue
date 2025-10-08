<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { getReferralStats, getPaymentHistory, getTokenHistory } from "@/http/endpoints";
import type { ReferralStats, Payment, TokenHistory } from "@/types";

const selectedTab = ref("tab1");
const loading = ref(false);
const referralStats = ref<ReferralStats | null>(null);
const referralPayments = ref<Payment[]>([]);
const tokenMovements = ref<TokenHistory[]>([]);
const copySuccess = ref(false);

watch(selectedTab, newVal => {
  if (newVal === "tab1") {
    loadReferralPayments();
  } else {
    loadTokenMovements();
  }
});

async function loadReferralStats() {
  try {
    loading.value = true;
    const response = await getReferralStats();
    referralStats.value = response.data;
  } catch (error) {
    console.error("Error loading referral stats:", error);
  } finally {
    loading.value = false;
  }
}

async function loadReferralPayments() {
  try {
    const response = await getPaymentHistory({ limit: 10 });
    referralPayments.value = response.data.payments.filter(p => p.status === "completed");
  } catch (error) {
    console.error("Error loading referral payments:", error);
  }
}

async function loadTokenMovements() {
  try {
    const response = await getTokenHistory({ limit: 10 });
    tokenMovements.value = response.data.tokenHistory;
  } catch (error) {
    console.error("Error loading token movements:", error);
  }
}

async function copyReferralLink() {
  if (referralStats.value?.referralLink) {
    try {
      await navigator.clipboard.writeText(referralStats.value.referralLink);
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    } catch (error) {
      console.error("Error copying link:", error);
    }
  }
}

onMounted(() => {
  loadReferralStats();
  loadReferralPayments();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Referral Link Card -->
    <div class="relative group">
      <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
          </div>
          <h3 class="text-white font-bold text-xl mb-2">Партнерская ссылка</h3>
          <p class="text-gray-300 text-sm leading-relaxed">
            Делитесь своей уникальной ссылкой и зарабатывайте вместе с AICEX ONE
          </p>
        </div>
        
        <div 
          class="bg-white/10 hover:bg-white/20 rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-105"
          @click="copyReferralLink"
        >
          <div class="flex items-center justify-between">
            <span class="text-white text-sm font-medium truncate mr-3">
              {{ referralStats?.referralLink || "Загрузка..." }}
            </span>
            <div class="flex-shrink-0">
              <div 
                v-if="copySuccess"
                class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center"
              >
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div 
                v-else
                class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
              >
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div class="text-center mt-3">
          <span class="text-gray-400 text-xs">
            {{ copySuccess ? "Ссылка скопирована!" : "Нажмите чтобы скопировать" }}
          </span>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Referral Balance -->
      <div class="relative group">
        <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all duration-500 hover:scale-105">
          <div class="text-center">
            <div class="w-12 h-12 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ referralStats?.referralBalance || 0 }}</div>
            <div class="text-gray-300 text-sm">Партнерский баланс</div>
          </div>
        </div>
      </div>

      <!-- Total Sales -->
      <div class="relative group">
        <div class="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all duration-500 hover:scale-105">
          <div class="text-center">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ referralStats?.totalSales || 0 }}</div>
            <div class="text-gray-300 text-sm">Всего продаж</div>
          </div>
        </div>
      </div>

      <!-- Sales Amount -->
      <div class="relative group">
        <div class="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all duration-500 hover:scale-105">
          <div class="text-center">
            <div class="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div class="text-lg font-bold text-white mb-1">
              {{ referralStats?.salesAmount?.rub || 0 }}₽
            </div>
            <div class="text-sm text-white mb-1">
              {{ referralStats?.salesAmount?.eur || 0 }}€
            </div>
            <div class="text-gray-300 text-sm">Сумма продаж</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaction History -->
    <div class="relative group">
      <div class="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-gray-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500">
        <h3 class="text-white font-bold text-lg mb-6 flex items-center space-x-3">
          <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <span>История транзакций</span>
        </h3>

        <!-- Tab Navigation -->
        <div class="bg-white/5 rounded-2xl p-1 mb-6">
          <div class="flex">
            <button
              @click="selectedTab = 'tab1'"
              class="flex-1 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-300"
              :class="[
                selectedTab === 'tab1' 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              ]"
            >
              Платежи рефералов
            </button>
            <button
              @click="selectedTab = 'tab2'"
              class="flex-1 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-300"
              :class="[
                selectedTab === 'tab2' 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              ]"
            >
              Движение токенов
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="min-h-[200px]">
          <transition name="fade" mode="out-in">
            <div v-if="selectedTab === 'tab1'" class="space-y-3">
              <div v-if="referralPayments.length === 0" class="text-center py-8">
                <div class="w-16 h-16 bg-gray-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <p class="text-gray-400">Транзакции отсутствуют</p>
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="payment in referralPayments"
                  :key="payment.id"
                  class="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                      </svg>
                    </div>
                    <div>
                      <div class="text-white font-medium">{{ payment.amount }} {{ payment.currency }}</div>
                      <div class="text-gray-400 text-sm">{{ new Date(payment.createdAt).toLocaleDateString() }}</div>
                    </div>
                  </div>
                  <div class="text-emerald-400 font-semibold">+</div>
                </div>
              </div>
            </div>
            
            <div v-else class="space-y-3">
              <div v-if="tokenMovements.length === 0" class="text-center py-8">
                <div class="w-16 h-16 bg-gray-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                </div>
                <p class="text-gray-400">Транзакции отсутствуют</p>
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="movement in tokenMovements"
                  :key="movement.id"
                  class="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div class="flex items-center space-x-3">
                    <div 
                      class="w-10 h-10 rounded-xl flex items-center justify-center"
                      :class="[
                        movement.amount > 0 
                          ? 'bg-emerald-500/20' 
                          : 'bg-red-500/20'
                      ]"
                    >
                      <svg 
                        class="w-5 h-5" 
                        :class="[
                          movement.amount > 0 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        ]"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                      </svg>
                    </div>
                    <div>
                      <div class="text-white font-medium">{{ movement.type }}</div>
                      <div class="text-gray-400 text-sm">{{ new Date(movement.createdAt).toLocaleDateString() }}</div>
                    </div>
                  </div>
                  <div 
                    class="font-semibold"
                    :class="[
                      movement.amount > 0 
                        ? 'text-emerald-400' 
                        : 'text-red-400'
                    ]"
                  >
                    {{ movement.amount > 0 ? "+" : "" }}{{ movement.amount }}
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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