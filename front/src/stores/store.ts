import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { User, ChatHistory, Payment, TokenHistory } from "@/types";
import { getUserProfile, getUserTokens, getUserSubscription } from "@/http/endpoints";
import { getTelegramUser } from "@/config/development";

export const useStore = defineStore("store", () => {
  const user = ref<User | null>(null);
  const currentDialog = ref<ChatHistory | null>(null);
  const dialogs = ref<ChatHistory[]>([]);
  const payments = ref<Payment[]>([]);
  const tokenHistory = ref<TokenHistory[]>([]);
  const isSubscribed = computed(() => user.value?.subscription !== null && user.value?.subscription !== undefined);

  // User actions
  const fetchUserProfile = async () => {
    try {
      console.log('🔄 Fetching user profile from API...');
      const response = await getUserProfile();
      console.log('✅ User profile received:', response.data);
      user.value = response.data;
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching user profile:", error);
      console.log('🔍 API Error details:', {
        status: (error as any)?.response?.status,
        statusText: (error as any)?.response?.statusText,
        data: (error as any)?.response?.data
      });
      
      // Пытаемся получить данные из Telegram WebApp или мок данные
      const tgUser = getTelegramUser();
      console.log('📱 Telegram user data:', tgUser);
      console.log('📱 Telegram user photo_url:', tgUser?.photo_url);
      
      if (tgUser) {
        user.value = {
          id: `tg_${tgUser.id}`,
          telegramId: tgUser.id,
          username: tgUser.username || 'unknown',
          firstName: tgUser.first_name,
          lastName: tgUser.last_name || '',
          email: null,
          avatar: tgUser.photo_url || null, // Добавляем аватарку из Telegram
          tokens: 10, // Стартовые токены
          subscription: null,
          friendsReferred: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any;
        console.log('🎭 Created fallback user from Telegram data:', user.value);
        return user.value;
      }
      
      // Создаем тестового пользователя для разработки
      if (!import.meta.env.PROD) {
        user.value = {
          id: "test-user-id",
          telegramId: 123456789,
          username: "testuser",
          firstName: "Тест",
          lastName: "Пользователь",
          email: "test@example.com",
          tokens: 150,
          subscription: null,
          friendsReferred: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any;
        return user.value;
      }
      
      throw error;
    }
  };

  const updateUserTokens = async () => {
    try {
      const response = await getUserTokens();
      if (user.value) {
        user.value.tokens = response.data.tokens;
      }
      return response.data.tokens;
    } catch (error) {
      console.error("Error updating user tokens:", error);
      throw error;
    }
  };

  const updateUserSubscription = async () => {
    try {
      const response = await getUserSubscription();
      if (user.value) {
        user.value.subscription = response.data.subscription as any;
      }
      return response.data.subscription;
    } catch (error) {
      console.error("Error updating user subscription:", error);
      throw error;
    }
  };

  return {
    user,
    currentDialog,
    dialogs,
    payments,
    tokenHistory,
    isSubscribed,
    fetchUserProfile,
    updateUserTokens,
    updateUserSubscription,
  };
});
