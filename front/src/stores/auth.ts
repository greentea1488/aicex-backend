import { defineStore } from "pinia";
import { ref } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(null);

  function setTokens(newAccessToken: string) {
    console.log('🔐 Setting auth token:', newAccessToken ? 'Token received' : 'No token');
    accessToken.value = newAccessToken;
  }

  function clearTokens() {
    console.log('🔓 Clearing auth tokens');
    accessToken.value = null;
  }

  return {
    accessToken,
    setTokens,
    clearTokens,
  };
});
