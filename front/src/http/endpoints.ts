import type { AxiosResponse } from "axios";
import $api from ".";
import type { User, Payment, TokenHistory, ChatHistory, ReferralStats, SubscriptionPlan } from "@/types";

// Auth endpoints
export const authUser = async (data: { initData: string; referralCode: string }): Promise<AxiosResponse> => {
  return $api.post("/api/auth/auth", data);
};

export const getMyself = async (): Promise<AxiosResponse<User>> => {
  return $api.get("/api/auth/myself");
};

// User endpoints
export const getUserProfile = async (): Promise<AxiosResponse<User>> => {
  return $api.get("/api/profile");
};

export const updateUserProfile = async (profile: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
}): Promise<AxiosResponse<User>> => {
  return $api.put("/api/user/profile", profile);
};

export const getUserStats = async (): Promise<AxiosResponse<{
  tokens: number;
  friendsReferred: number;
  subscription: string | null;
  memberSince: string;
  dialogsCount: number;
  totalSpent: number;
  totalTokensEarned: number;
  referralsCount: number;
}>> => {
  return $api.get("/api/user/stats");
};

export const updateUserSettings = async (settings: { appSettings?: any; gptSettings?: any; midjourneySettings?: any; runwaySettings?: any }): Promise<AxiosResponse<User>> => {
  return $api.put("/api/user/settings", settings);
};

export const getUserTokens = async (): Promise<AxiosResponse<{ tokens: number }>> => {
  return $api.get("/api/tokens/balance");
};

export const getUserSubscription = async (): Promise<AxiosResponse<{ subscription: string | null }>> => {
  return $api.get("/api/user/subscription");
};

// Referral endpoints
export const getReferralStats = async (): Promise<AxiosResponse<ReferralStats>> => {
  return $api.get("/api/user/referral/stats");
};

export const getUserReferrals = async (params?: {
  page?: number;
  limit?: number;
}): Promise<
  AxiosResponse<{
    referrals: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>
> => {
  return $api.get("/api/user/referral/list", { params });
};

// Payment endpoints
export const createPayment = async (data: { amount: number; currency: string; type: string }): Promise<AxiosResponse<Payment>> => {
  return $api.post("/api/payment/create", data);
};

export const getPaymentHistory = async (params?: {
  page?: number;
  limit?: number;
}): Promise<
  AxiosResponse<{
    payments: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>
> => {
  return $api.get("/api/payments/history", { params });
};

export const getTokenHistory = async (params?: {
  page?: number;
  limit?: number;
}): Promise<
  AxiosResponse<{
    history: TokenHistory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>
> => {
  return $api.get("/api/tokens/history", { params });
};

export const buyTokens = async (data: {
  amount: number;
  paymentMethod?: string;
}): Promise<
  AxiosResponse<{
    success: boolean;
    payment: Payment;
    tokensAdded: number;
  }>
> => {
  return $api.post("/api/payment/tokens/buy", data);
};

export const updateSubscription = async (data: {
  plan: "base" | "pro" | "premium";
  duration?: number;
}): Promise<
  AxiosResponse<{
    success: boolean;
    payment: Payment;
    subscription: string;
    tokensAdded: number;
  }>
> => {
  return $api.post("/api/payment/subscription/update", data);
};

// Создание Lava платежа для подписки
export const createLavaPayment = async (data: {
  plan: "base" | "pro" | "premium";
  duration?: number;
}): Promise<
  AxiosResponse<{
    success: boolean;
    paymentId: string;
    paymentUrl: string;
  }>
> => {
  return $api.post("/api/payment/lava-top/subscription", data);
};

// Создание Lava платежа для токенов
export const createLavaTokenPayment = async (data: {
  amount: number;
}): Promise<
  AxiosResponse<{
    success: boolean;
    paymentId: string;
    paymentUrl: string;
  }>
> => {
  return $api.post("/api/payment/lava/create-tokens", data);
};

export const getSubscriptionPlans = async (): Promise<AxiosResponse<SubscriptionPlan[]>> => {
  return $api.get("/api/payment/subscription/plans");
};

// Chat endpoints
export const getChatDialogs = async (): Promise<
  AxiosResponse<
    Array<{
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    }>
  >
> => {
  return $api.get("/api/chat/dialogs");
};

export const createDialog = async (data?: { title?: string }): Promise<AxiosResponse<ChatHistory>> => {
  return $api.post("/api/chat/dialogs", data);
};

export const getChatHistory = async (dialogId: string): Promise<AxiosResponse<ChatHistory>> => {
  return $api.get(`/api/chat/dialogs/${dialogId}`);
};

export const updateDialog = async (
  dialogId: string,
  data: {
    title?: string;
    message?: any;
  }
): Promise<AxiosResponse<ChatHistory>> => {
  return $api.put(`/api/chat/dialogs/${dialogId}`, data);
};

export const deleteDialog = async (dialogId: string): Promise<AxiosResponse<{ success: boolean }>> => {
  return $api.delete(`/api/chat/dialogs/${dialogId}`);
};

export const sendMessage = async (
  dialogId: string,
  data: {
    message: string;
    model?: string;
  }
): Promise<
  AxiosResponse<{
    response: string;
    tokensRemaining: number;
  }>
> => {
  return $api.post(`/api/chat/dialogs/${dialogId}/message`, data);
};
