import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient";

// Get all subscription plans
export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    // Если нет подключения к БД, возвращаем статичные планы
    if (!process.env.DATABASE_URL) {
      const staticPlans = [
        {
          id: 'free-plan',
          name: 'free',
          displayName: 'Бесплатный',
          description: 'Базовые функции AI',
          priceRub: 0,
          priceUsd: 0,
          priceEur: 0,
          tokens: 100,
          features: {
            imageGeneration: true,
            chatGPT: true,
            videoGeneration: false,
            prioritySupport: false,
            maxGenerationsPerDay: 10
          },
          lavaOfferId: 'free-plan',
          isActive: true
        },
        {
          id: 'basic-plan',
          name: 'basic',
          displayName: 'Базовый',
          description: 'Расширенные возможности AI',
          priceRub: 499,
          priceUsd: 500,
          priceEur: 450,
          tokens: 1000,
          features: {
            imageGeneration: true,
            chatGPT: true,
            videoGeneration: true,
            prioritySupport: false,
            maxGenerationsPerDay: 50
          },
          lavaOfferId: 'basic-plan-monthly',
          isActive: true
        },
        {
          id: 'pro-plan',
          name: 'pro',
          displayName: 'Про',
          description: 'Профессиональные инструменты AI',
          priceRub: 1699,
          priceUsd: 1800,
          priceEur: 1600,
          tokens: 5000,
          features: {
            imageGeneration: true,
            chatGPT: true,
            videoGeneration: true,
            prioritySupport: true,
            maxGenerationsPerDay: 200,
            advancedModels: true
          },
          lavaOfferId: 'pro-plan-monthly',
          isActive: true
        }
      ];
      
      return res.json(staticPlans);
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceRub: 'asc' }
    });

    res.json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's current subscription
export const getUserSubscription = async (req: Request, res: Response) => {
  try {
    const telegramId = req.user?.telegramId;

    if (!telegramId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: telegramId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.subscription) {
      // Пользователь без подписки - возвращаем бесплатный план
      const freePlan = await prisma.subscriptionPlan.findUnique({
        where: { name: 'free' }
      });
      
      return res.json({
        plan: freePlan?.displayName || 'Бесплатный',
        status: 'ACTIVE',
        endDate: null,
        isActive: true,
        features: freePlan?.features || {}
      });
    }

    const subscription = {
      plan: user.subscription.plan.displayName,
      status: user.subscription.status,
      startDate: user.subscription.startDate,
      endDate: user.subscription.endDate,
      isActive: user.subscription.status === 'ACTIVE' && user.subscription.endDate > new Date(),
      features: user.subscription.plan.features,
      tokensGranted: user.subscription.tokensGranted
    };

    res.json(subscription);
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create or update user subscription
export const createSubscription = async (req: Request, res: Response) => {
  try {
    const telegramId = req.user?.telegramId;
    const { planName, lavaContractId, duration = 30 } = req.body;

    if (!telegramId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Находим план подписки
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { name: planName }
    });

    if (!plan) {
      return res.status(404).json({ error: "Subscription plan not found" });
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // Создаем или обновляем подписку
    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        lavaContractId,
        tokensGranted: plan.tokens
      },
      create: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        lavaContractId,
        tokensGranted: plan.tokens
      },
      include: {
        plan: true
      }
    });

    // Обновляем баланс токенов пользователя
    await prisma.balance.upsert({
      where: { userId: user.id },
      update: {
        tokens: { increment: plan.tokens },
        paidTokens: { increment: plan.tokens }
      },
      create: {
        userId: user.id,
        tokens: plan.tokens,
        freeTokens: 0,
        paidTokens: plan.tokens
      }
    });

    res.json({
      success: true,
      subscription,
      message: `Подписка ${plan.displayName} успешно активирована`
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Cancel user subscription
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const telegramId = req.user?.telegramId;

    if (!telegramId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'CANCELLED',
        autoRenew: false
      },
      include: {
        plan: true
      }
    });

    res.json({
      success: true,
      subscription,
      message: "Подписка успешно отменена"
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
