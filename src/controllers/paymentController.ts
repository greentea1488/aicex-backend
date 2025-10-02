import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient";
import { PaymentService } from "../services/PaymentService";
import { logger } from "../utils/logger";

// Create a new payment
export const createPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount, currency, type } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!amount || !currency || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency,
        status: "PENDING",
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get payment history
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await prisma.payment.findMany({
      where: { userId },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const totalCount = await prisma.payment.count({
      where: { userId },
    });

    res.json({
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get token history
export const getTokenHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const tokenHistory = await prisma.tokenHistory.findMany({
      where: { userId },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const totalCount = await prisma.tokenHistory.count({
      where: { userId },
    });

    res.json({
      tokenHistory,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching token history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Buy tokens
export const buyTokens = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }

    // Check if user has active subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: true },
    });

    if (!user?.subscription) {
      return res.status(403).json({ error: "Active subscription required to buy tokens" });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: amount * 1.4342, // Price per token in stars
        currency: "STARS",
        status: "PENDING",
      },
    });

    // In a real application, you would integrate with a payment provider here
    // For now, we'll simulate a successful payment

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });

    // Get current user balance before update
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true },
    });
    
    if (!userBefore) {
      throw new Error("User not found");
    }

    const balanceBefore = userBefore.tokens;
    const balanceAfter = balanceBefore + amount;

    // Add tokens to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        tokens: { increment: amount },
      },
    });

    // Create token history record
    await prisma.tokenHistory.create({
      data: {
        userId,
        amount,
        type: "PURCHASE",
        balanceBefore,
        balanceAfter,
        description: `Token purchase via payment`,
        paymentId: payment.id,
      },
    });

    res.json({
      success: true,
      payment,
      tokensAdded: amount,
    });
  } catch (error) {
    console.error("Error buying tokens:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update subscription
export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { plan, duration = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validPlans = ["base", "pro", "premium"];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }

    // Calculate price based on plan
    const prices = {
      base: { rub: 920, eur: 9.5, usd: 10, tokens: 100 },
      pro: { rub: 2760, eur: 28.5, usd: 30, tokens: 300 },
      premium: { rub: 4600, eur: 47.5, usd: 50, tokens: 600 },
    };

    const planPrice = prices[plan as keyof typeof prices];

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: planPrice.rub * duration,
        currency: "RUB",
        status: "PENDING",
      },
    });

    // In a real application, you would integrate with a payment provider here
    // For now, we'll simulate a successful payment

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });

    // Get current user balance before update
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true },
    });
    
    if (!userBefore) {
      throw new Error("User not found");
    }

    const tokenAmount = planPrice.tokens * duration;
    const balanceBefore = userBefore.tokens;
    const balanceAfter = balanceBefore + tokenAmount;

    // Update user subscription and add tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscription: plan as any,
        tokens: { increment: tokenAmount },
      },
    });

    // Create token history record
    await prisma.tokenHistory.create({
      data: {
        userId,
        amount: tokenAmount,
        type: "PURCHASE",
        balanceBefore,
        balanceAfter,
        description: `Subscription purchase: ${plan} for ${duration} month(s)`,
        paymentId: payment.id,
      },
    });

    res.json({
      success: true,
      payment,
      subscription: plan,
      tokensAdded: planPrice.tokens * duration,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get subscription plans
export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const plans = [
      {
        id: "free",
        name: "Бесплатный уровень",
        price: { rub: 0, eur: 0, usd: 0 },
        tokens: 100,
        features: ["1 запрос в минуту"],
      },
      {
        id: "base",
        name: "Базовый уровень",
        price: { rub: 920, eur: 9.5, usd: 10 },
        tokens: 100,
        features: ["10 000 текстовых запросов GPT", "Х изображений в MidJourney", "Х секунд видео в Kling", "Х изображений в Freepik + Lora", "Х секунд видео в Runway"],
      },
      {
        id: "pro",
        name: "Про уровень",
        price: { rub: 2760, eur: 28.5, usd: 30 },
        tokens: 300,
        features: [
          "10 000 текстовых запросов GPT",
          "Х изображений в MidJourney",
          "Х секунд видео в Kling",
          "Х изображений в Freepik + Lora",
          "Х секунд видео в Runway",
          "Приоритетная обработка запросов",
          "Доступ к кастомным моделям Lora для Freepik",
          "API-доступ для интеграции с внешними приложениями",
        ],
      },
      {
        id: "premium",
        name: "Премиум уровень",
        price: { rub: 4600, eur: 47.5, usd: 50 },
        tokens: 600,
        features: [
          "10 000 текстовых запросов GPT",
          "Х изображений в MidJourney",
          "Х секунд видео в Kling",
          "Х изображений в Freepik + Lora",
          "Х секунд видео в Runway",
          "Приоритетная обработка запросов",
          "Доступ к кастомным моделям Lora для Freepik",
          "API-доступ для интеграции с внешними приложениями",
          "Выделенная поддержка и возможность запроса новых функций",
        ],
      },
    ];

    res.json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Создание Lava платежа для подписки
export const createLavaSubscriptionPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { plan, duration = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!plan || !["base", "pro", "premium"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // Цены планов в рублях
    const planPrices = {
      base: 920,
      pro: 2760,
      premium: 4600,
    };

    const amount = planPrices[plan as keyof typeof planPrices] * duration;
    const paymentService = new PaymentService();

    const paymentResult = await paymentService.createPayment({
      userId,
      amount,
      tokensAmount: 0, // Для подписки токены не нужны
      description: `Подписка ${plan} на ${duration} месяц(ев)`,
      successUrl: `${process.env.FRONTEND_URL}/payment/success`,
      failUrl: `${process.env.FRONTEND_URL}/payment/fail`,
    });

    if (paymentResult.success && paymentResult.paymentUrl) {
      res.json({
        success: true,
        paymentId: paymentResult.paymentId,
        paymentUrl: paymentResult.paymentUrl,
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error || "Failed to create payment",
      });
    }
  } catch (error) {
    logger.error("Error creating Lava subscription payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Создание Lava платежа для токенов
export const createLavaTokenPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }

    // Цена за токен в рублях (примерно 1.43 рубля за токен)
    const pricePerToken = 1.43;
    const totalPrice = Math.round(amount * pricePerToken);

    const paymentService = new PaymentService();

    const paymentResult = await paymentService.createPayment({
      userId,
      amount: totalPrice,
      tokensAmount: amount,
      description: `Покупка ${amount} токенов`,
      successUrl: `${process.env.FRONTEND_URL}/payment/success`,
      failUrl: `${process.env.FRONTEND_URL}/payment/fail`,
    });

    if (paymentResult.success && paymentResult.paymentUrl) {
      res.json({
        success: true,
        paymentId: paymentResult.paymentId,
        paymentUrl: paymentResult.paymentUrl,
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error || "Failed to create payment",
      });
    }
  } catch (error) {
    logger.error("Error creating Lava token payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
