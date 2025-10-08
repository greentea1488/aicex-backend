<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

// Типы для данных
interface Referral {
  id: string
  name?: string
  email?: string
  earnings?: number
  status?: string
}

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
}

const selectedTab = ref("tab1");
const loading = ref(false);
const referrals = ref<Referral[]>([]);
const referralStats = ref<ReferralStats>({
  totalReferrals: 0,
  activeReferrals: 0,
  totalEarnings: 0
});

watch(selectedTab, newVal => {
  if (newVal === "tab1") {
    loadReferrals();
  } else {
    loadReferralStats();
  }
});

async function loadReferrals() {
  try {
    loading.value = true;
    // Здесь будет API вызов для получения списка рефералов
    // const response = await getReferrals();
    // referrals.value = response.data;
    
    // Пока что пустой массив
    referrals.value = [];
  } catch (error) {
    console.error("Error loading referrals:", error);
  } finally {
    loading.value = false;
  }
}

async function loadReferralStats() {
  try {
    // Здесь будет API вызов для получения статистики рефералов
    // const response = await getReferralStats();
    // referralStats.value = response.data;
  } catch (error) {
    console.error("Error loading referral stats:", error);
  }
}

onMounted(() => {
  loadReferrals();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Total Referrals -->
      <div class="relative group h-full">
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-500 hover:scale-105 h-full min-h-[140px]">
          <div class="text-center flex flex-col items-center justify-center h-full">
            <div class="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ referralStats.totalReferrals }}</div>
            <div class="text-gray-300 text-sm">Партнерский баланс</div>
          </div>
        </div>
      </div>

      <!-- Active Referrals -->
      <div class="relative group h-full">
        <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-500 hover:scale-105 h-full min-h-[140px]">
          <div class="text-center flex flex-col items-center justify-center h-full">
            <div class="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ referralStats.activeReferrals }}</div>
            <div class="text-gray-300 text-sm">Всего продаж</div>
          </div>
        </div>
      </div>

      <!-- Total Earnings -->
      <div class="relative group h-full">
        <div class="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-500 hover:scale-105 h-full min-h-[140px]">
          <div class="text-center flex flex-col items-center justify-center h-full">
            <div class="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ referralStats.totalEarnings }}₽</div>
            <div class="text-gray-300 text-sm">Сумма продаж</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="relative group">
      <div class="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-gray-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-500">
        <h3 class="text-white font-bold text-lg mb-6 flex items-center space-x-3">
          <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <span>Управление рефералами</span>
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
              Полный список
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
              Статистика
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="min-h-[300px]">
          <transition name="fade" mode="out-in">
            <!-- Referrals List -->
            <div v-if="selectedTab === 'tab1'" class="space-y-4">
              <div v-if="loading" class="text-center py-8">
                <div class="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-cyan-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </div>
                <p class="text-gray-400">Загрузка рефералов...</p>
              </div>
              
              <div v-else-if="referrals.length === 0" class="text-center py-12">
                <div class="w-20 h-20 bg-gray-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h4 class="text-white font-semibold text-lg mb-2">Рефералы отсутствуют</h4>
                <p class="text-gray-400 mb-6">Пригласите друзей и начните зарабатывать вместе с AICEX ONE</p>
                <div class="bg-white/5 rounded-2xl p-4 max-w-md mx-auto">
                  <p class="text-gray-300 text-sm mb-3">💡 Как пригласить друзей:</p>
                  <ul class="text-gray-400 text-sm space-y-2 text-left">
                    <li>• Поделитесь партнерской ссылкой</li>
                    <li>• Расскажите о преимуществах AICEX ONE</li>
                    <li>• Получайте комиссию с их покупок</li>
                  </ul>
                </div>
              </div>
              
              <div v-else class="space-y-3">
                <div
                  v-for="referral in referrals"
                  :key="referral.id"
                  class="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                      <span class="text-white font-bold text-lg">{{ referral.name?.charAt(0) || 'U' }}</span>
                    </div>
                    <div>
                      <div class="text-white font-medium">{{ referral.name || 'Пользователь' }}</div>
                      <div class="text-gray-400 text-sm">{{ referral.email || 'Не указан email' }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-emerald-400 font-semibold">+{{ referral.earnings || 0 }}₽</div>
                    <div class="text-gray-400 text-sm">{{ referral.status || 'Активен' }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Statistics -->
            <div v-else class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Monthly Chart Placeholder -->
                <div class="bg-white/5 rounded-2xl p-6">
                  <h4 class="text-white font-semibold mb-4 flex items-center space-x-2">
                    <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    <span>Заработок по месяцам</span>
                  </h4>
                  <div class="h-32 bg-gray-600/20 rounded-xl flex items-center justify-center">
                    <p class="text-gray-400 text-sm">График будет доступен в следующих обновлениях</p>
                  </div>
                </div>

                <!-- Top Referrals -->
                <div class="bg-white/5 rounded-2xl p-6">
                  <h4 class="text-white font-semibold mb-4 flex items-center space-x-2">
                    <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                    <span>Топ рефералы</span>
                  </h4>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-gray-400 text-sm">Пока нет данных</span>
                      <span class="text-gray-500 text-sm">0₽</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Performance Metrics -->
              <div class="bg-white/5 rounded-2xl p-6">
                <h4 class="text-white font-semibold mb-4 flex items-center space-x-2">
                  <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <span>Показатели эффективности</span>
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-white mb-1">0%</div>
                    <div class="text-gray-400 text-sm">Конверсия</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-white mb-1">0₽</div>
                    <div class="text-gray-400 text-sm">Средний чек</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-white mb-1">0₽</div>
                    <div class="text-gray-400 text-sm">За месяц</div>
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