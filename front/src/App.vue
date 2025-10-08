<script setup lang="ts">
import { onMounted } from "vue";
import MyFooter from "@/components/MyFooter.vue";
import MyHeader from "@/components/MyHeader.vue";
import { useAuthStore } from "@/stores/auth";
import { authUser } from "@/http/endpoints";
import { useStore } from "@/stores/store";
import { getTelegramWebApp } from "@/types/telegram";

const authStore = useAuthStore();
const store = useStore();
const tg = getTelegramWebApp();

onMounted(async () => {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }
  }

  if (authStore.accessToken === "undefined") {
    authStore.clearTokens();
  }

  // ВСЕГДА загружаем данные пользователя
  try {
    // Сначала пробуем загрузить через API
    if (import.meta.env.PROD && tg?.initData) {
      const { data: tokensData } = await authUser({
        initData: tg.initData,
        referralCode: tg?.initDataUnsafe?.start_param ?? "",
      });

      authStore.setTokens(tokensData.accessToken);
    }

    // Загружаем профиль пользователя
    await store.fetchUserProfile();
    
    // Обновляем токены и подписку
    await store.updateUserTokens();
    await store.updateUserSubscription();
    
  } catch (error) {
    console.error('Auth error:', error);
    
    // Fallback - загружаем тестовые данные
    try {
      await store.fetchUserProfile();
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-x-hidden telegram-app" style="padding-bottom: calc(6rem + env(safe-area-inset-bottom));">
    <MyHeader v-if="$route.path === '/' || $route.path === '/home'" />
    <RouterView />
    <MyFooter v-if="!$route.fullPath.includes('settings')" />
  </div>
</template>

<style lang="scss">
/* Базовые стили для мобильной адаптивности */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Безопасные зоны для iPhone */
.pb-safe-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);
}

.pt-safe-top {
  padding-top: env(safe-area-inset-top);
}

/* Адаптивные контейнеры */
.container-mobile {
  width: 100%;
  max-width: 100vw;
  padding: 0 1rem;
  margin: 0 auto;
}

/* Закругленные контейнеры */
.rounded-container {
  border-radius: 1rem;
  overflow: hidden;
}

.rounded-container-sm {
  border-radius: 0.75rem;
}

.rounded-container-lg {
  border-radius: 1.5rem;
}

/* Унифицированные размеры для навигационных элементов */
.nav-item {
  height: 4rem;
  min-height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  padding: 0.75rem;
}

.nav-item-large {
  height: 5rem;
  min-height: 5rem;
}

/* Адаптивная сетка */
.grid-mobile {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid-mobile {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .grid-mobile {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Существующие стили */
.bg {
  background: url(@/assets/img/image.png) center center/cover no-repeat;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to,
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from,
.fade-fast-enter-to,
.fade-fast-leave-from {
  opacity: 1;
}

.gray {
  background: radial-gradient(circle at 30% 30%, #8a8a8a, #5f5f5f 40%, #2e2e2e 100%);
  backdrop-filter: blur(80px);
}

/* Исправление для предотвращения горизонтального скролла */
.no-overflow {
  overflow-x: hidden;
  max-width: 100vw;
}

/* Адаптивные отступы для Telegram Mini App */
.telegram-app {
  /* Добавляем отступы сверху и по бокам */
  padding-top: 1rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

/* Специальные отступы для контента внутри страниц */
.telegram-content {
  /* Базовые отступы для всех экранов */
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

@media (min-width: 640px) {
  .telegram-app {
    padding-top: 1.25rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .telegram-content {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

@media (min-width: 768px) {
  .telegram-app {
    padding-top: 1.5rem;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
  
  .telegram-content {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (min-width: 1024px) {
  .telegram-app {
    padding-top: 2rem;
    padding-left: 2rem;
    padding-right: 2rem;
  }
  
  .telegram-content {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}
</style>
