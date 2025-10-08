export interface IJWTDecode {
  iat: number;
  exp: number;
  jti: string;
  userId?: string;
}

export interface User {
  id: string;
  telegramId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  referral?: string;
  tokens: number;
  friendsReferred: number;
  subscription?: "base" | "pro" | "premium" | null;
  appSettings: AppSettings;
  gptSettings: GptSettings;
  midjourneySettings: MidjourneySettings;
  runwaySettings: RunwaySettings;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  notifications: boolean;
}

export interface GptSettings {
  model: string;
  audioResponse: boolean;
  voice: string;
  logModelName: boolean;
  userPrompt: string;
}

export interface MidjourneySettings {
  userPrompt: string;
  exceptions: string;
  seamlessMode: boolean;
  version: string;
  style: string;
  quality: number;
  aspectRatio: string;
  chaos: number;
  stylize: number;
  weird: number;
  aesthetics: number;
  reference: string;
  referenceScale: number;
}

export interface RunwaySettings {
  length: number;
  seed: number;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenHistory {
  id: string;
  userId: string;
  amount: number;
  type: string;
  service?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistory {
  id: string;
  userId: string;
  messages: any[];
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralStats {
  referralLink: string;
  totalReferrals: number;
  totalEarnings: number;
  referralBalance: number;
  totalSales: number;
  salesAmount: {
    rub: number;
    eur: number;
    usd: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: {
    rub: number;
    eur: number;
    usd: number;
  };
  tokens: number;
  features: string[];
}
