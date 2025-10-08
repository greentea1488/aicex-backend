import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Проверяем переменные окружения
const backendUrl = import.meta.env.VITE_APP_HOST_URL || 'https://aicexaibot-production.up.railway.app';
console.log('🔧 Environment variables:', {
  VITE_APP_HOST_URL: import.meta.env.VITE_APP_HOST_URL,
  BACKEND_URL_USED: backendUrl,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD
});

// Предупреждение если переменная не установлена
if (!import.meta.env.VITE_APP_HOST_URL) {
  console.warn('⚠️ VITE_APP_HOST_URL not set, using fallback:', backendUrl);
}

// Инициализация Telegram WebApp
if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  
  try {
    // Настраиваем WebApp
    tg.ready();
    tg.expand();
    
    // Настраиваем тему
    tg.headerColor = '#1e293b'; // slate-800
    tg.backgroundColor = '#0f172a'; // slate-900
    
    console.log('📱 Telegram WebApp initialized:', {
      initData: tg.initData,
      initDataLength: tg.initData?.length,
      user: tg.initDataUnsafe?.user,
      isExpanded: tg.isExpanded,
      viewportHeight: tg.viewportHeight
    });
  } catch (error) {
    console.error('❌ Error initializing Telegram WebApp:', error);
  }
} else {
  console.warn('⚠️ Not running in Telegram WebApp environment');
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
