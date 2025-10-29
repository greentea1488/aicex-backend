import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient";
import axios from "axios";

// Get user profile
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user settings
export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { appSettings, gptSettings, midjourneySettings, runwaySettings } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updateData: any = {};

    if (appSettings) updateData.appSettings = appSettings;
    if (gptSettings) updateData.gptSettings = gptSettings;
    if (midjourneySettings) updateData.midjourneySettings = midjourneySettings;
    if (runwaySettings) updateData.runwaySettings = runwaySettings;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user tokens balance
export const getUserTokens = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tokens: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ tokens: user.tokens });
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user token history
export const getUserTokenHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Получаем историю токенов с пагинацией
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const tokenHistory = await prisma.tokenHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Считаем общее количество записей
    const total = await prisma.tokenHistory.count({
      where: { userId }
    });

    res.json({ 
      history: tokenHistory,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching token history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user subscription status
export const getUserSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ subscription: user.subscription });
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user payment history
export const getUserPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Получаем историю платежей с пагинацией
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const paymentHistory = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Считаем общее количество записей
    const total = await prisma.payment.count({
      where: { userId }
    });

    res.json({ 
      history: paymentHistory,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get referral statistics
export const getReferralStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        friendsReferred: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get referrals count
    const referralsCount = await prisma.user.count({
      where: { referral: userId },
    });

    // Get referral payments
    const referralPayments = await prisma.payment.findMany({
      where: {
        user: {
          referral: userId,
        },
        status: "COMPLETED",
      },
      select: {
        amount: true,
        currency: true,
      },
    });

    // Calculate total earnings by currency
    const earnings = referralPayments.reduce((acc, payment) => {
      if (!acc[payment.currency]) {
        acc[payment.currency] = 0;
      }
      acc[payment.currency] += payment.amount * 0.1; // 10% commission
      return acc;
    }, {} as Record<string, number>);

    const referralLink = `https://t.me/syntxaibot?start=aff_${user.telegramId}`;

    res.json({
      referralLink,
      totalReferrals: referralsCount,
      friendsReferred: user.friendsReferred,
      earnings,
      totalSales: referralPayments.length,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's referrals list
export const getUserReferrals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const referrals = await prisma.user.findMany({
      where: { referral: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        subscription: true,
        tokens: true,
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const totalCount = await prisma.user.count({
      where: { referral: userId },
    });

    res.json({
      referrals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching user referrals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      bio, 
      location, 
      website 
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user statistics
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tokens: true,
        friendsReferred: true,
        subscription: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get chat dialogs count
    const dialogsCount = await prisma.chatHistory.count({
      where: { userId },
    });

    // Get total payments
    const totalPayments = await prisma.payment.aggregate({
      where: { 
        userId,
        status: "COMPLETED"
      },
      _sum: {
        amount: true,
      },
    });

    // Get token history stats
    const tokenStats = await prisma.tokenHistory.aggregate({
      where: { userId },
      _sum: {
        amount: true,
      },
    });

    // Get referrals count
    const referralsCount = await prisma.user.count({
      where: { referral: userId },
    });

    res.json({
      tokens: user.tokens,
      friendsReferred: user.friendsReferred,
      subscription: user.subscription,
      memberSince: user.createdAt,
      dialogsCount,
      totalGenerations: dialogsCount, // Добавляем алиас для совместимости с фронтом
      totalSpent: totalPayments._sum.amount || 0,
      totalTokensEarned: tokenStats._sum.amount || 0,
      referralsCount,
      referrals: referralsCount, // Добавляем алиас для совместимости с фронтом
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user avatar from Telegram
export const getUserAvatar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Если аватарка уже есть в базе - возвращаем её
    if (user.avatar) {
      return res.json({ avatar: user.avatar });
    }

    // Пытаемся получить аватарку из Telegram
    try {
      const BOT_TOKEN = process.env.BOT_TOKEN;
      if (!BOT_TOKEN) {
        throw new Error("BOT_TOKEN not found");
      }

      const profilePhotosResponse = await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos`,
        {
          params: {
            user_id: user.telegramId,
            limit: 1,
          },
        }
      );

      const photos = profilePhotosResponse.data?.result?.photos;
      if (!photos || photos.length === 0) {
        return res.json({ avatar: null });
      }

      // Берем самое большое фото
      const largestPhoto = photos[0][photos[0].length - 1];
      const fileResponse = await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getFile`,
        {
          params: {
            file_id: largestPhoto.file_id,
          },
        }
      );

      const filePath = fileResponse.data?.result?.file_path;
      if (!filePath) {
        return res.json({ avatar: null });
      }

      const avatarUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // Сохраняем аватарку в базу
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: avatarUrl },
      });

      res.json({ avatar: avatarUrl });
    } catch (telegramError) {
      console.error("Error fetching avatar from Telegram:", telegramError);
      res.json({ avatar: null });
    }
  } catch (error) {
    console.error("Error fetching user avatar:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
