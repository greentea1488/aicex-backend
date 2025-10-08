import { defineStore } from "pinia";
import { ref } from "vue";

export const useAuthStore = defineStore("auth", () => {
  // Инициализируем токен из localStorage при загрузке
  const accessToken = ref<string | null>(localStorage.getItem('auth_token'));
  
  console.log('🔐 Auth store initialized, token from localStorage:', accessToken.value ? 'Present' : 'None');

  function setTokens(newAccessToken: string) {
    console.log('==================== SETTING AUTH TOKEN ====================');
    console.log('🔐 Setting auth token:', newAccessToken ? 'Token received' : 'No token');
    console.log('Token preview:', newAccessToken ? newAccessToken.substring(0, 20) + '...' : 'none');
    console.log('localStorage before:', localStorage.getItem('auth_token') ? 'Present' : 'None');
    
    accessToken.value = newAccessToken;
    
    // Сохраняем токен в localStorage для API интерцептора
    if (newAccessToken) {
      localStorage.setItem('auth_token', newAccessToken);
      console.log('💾 Token saved to localStorage');
      console.log('localStorage after:', localStorage.getItem('auth_token') ? 'Present' : 'None');
    } else {
      localStorage.removeItem('auth_token');
      console.log('🗑️ Token removed from localStorage');
    }
    console.log('===============================================================');
  }

  function clearTokens() {
    console.log('🔓 Clearing auth tokens');
    accessToken.value = null;
    localStorage.removeItem('auth_token');
    console.log('🗑️ Token cleared from localStorage');
  }

  return {
    accessToken,
    setTokens,
    clearTokens,
  };
});
