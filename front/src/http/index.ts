import type { IJWTDecode } from "@/types";
import { jwtDecode } from "@/utils";
import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth";
import { getInitData } from "@/config/development";

const $api = axios.create({
  baseURL: import.meta.env.VITE_APP_HOST_URL || import.meta.env.VITE_BACKEND_URL || 'https://aicexaibot-production.up.railway.app',
});

$api.interceptors.request.use(async config => {
  const authStore = useAuthStore();
  const accessToken = authStore.accessToken;

  console.log('🔄 HTTP Request interceptor:', {
    url: config.url,
    baseURL: config.baseURL,
    hasToken: !!accessToken
  });

  // Проверяем, есть ли Telegram WebApp
  const hasTelegramWebApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
  console.log('📱 Telegram WebApp available:', hasTelegramWebApp);
  
  if (!accessToken) {
    // Если нет токена, пытаемся авторизоваться
    try {
      const initData = getInitData();
      const referralCode = hasTelegramWebApp ? 
        (window.Telegram.WebApp.initDataUnsafe.start_param ?? "") : 
        "";

      const baseURL = import.meta.env.VITE_APP_HOST_URL || import.meta.env.VITE_BACKEND_URL || 'https://aicexaibot-production.up.railway.app';
      
      console.log('🔐 Attempting auth with:', {
        initDataLength: initData?.length,
        referralCode,
        authURL: `${baseURL}/api/auth/auth`
      });

      const { data: tokensData } = await axios.post(`${baseURL}/api/auth/auth`, {
        initData,
        referralCode,
      });

      console.log('✅ Auth successful, received token');
      authStore.setTokens(tokensData.accessToken);
      config.headers.Authorization = `Bearer ${tokensData.accessToken}`;
      return config;
    } catch (error) {
      console.error("❌ Initial auth failed:", error);
      console.log('🔍 Auth error details:', {
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data
      });
      return config; // Продолжаем без авторизации
    }
  }

  if (!accessToken) return config;

  const decodedToken: IJWTDecode = jwtDecode(accessToken);
  const currentTime = Math.floor(Date.now() / 1000);

  if (decodedToken.exp && decodedToken.exp > currentTime) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    // Токен истек, обновляем его
    try {
      const initData = getInitData();
      const referralCode = hasTelegramWebApp ? 
        (window.Telegram.WebApp.initDataUnsafe.start_param ?? "") : 
        "";

      const baseURL = import.meta.env.VITE_APP_HOST_URL || import.meta.env.VITE_BACKEND_URL || 'https://aicexaibot-production.up.railway.app';
      
      const { data: tokensData } = await axios.post(`${baseURL}/api/auth/auth`, {
        initData,
        referralCode,
      });

      authStore.setTokens(tokensData.accessToken);
      config.headers.Authorization = `Bearer ${tokensData.accessToken}`;
    } catch (error) {
      const e = error as unknown as AxiosError;

      if (e.response && (e.response.status === 403 || e.response.status === 401)) {
        authStore.clearTokens();
        return Promise.reject(error);
      } else {
        console.error("Token refresh failed:", error);
        return Promise.reject(error);
      }
    }
  }

  return config;
});

$api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      delete error.stack;
    }
    return Promise.reject(error);
  }
);

export default $api;
