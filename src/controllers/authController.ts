import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prismaClient";
import { UserService } from "../services/UserService";
import { verifyTelegramInitData, parseInitData } from "../utils";
import { config } from "dotenv";
import { logger } from "../utils/logger";
config();

/**
 * POST /auth
 * - Принимает initData из Telegram
 * - Проверяет, существует ли пользователь в БД, если нет — создаёт
 * - Генерирует пару accessToken / refreshToken
 * - Сохраняет refreshToken в БД
 */
export const authUser = async (req: Request, res: Response) => {
  try {
    const { initData, referralCode } = req.body;
    if (!initData) {
      res.status(400).json({ error: "Missing initData" });
      return;
    }
    // Проверяем подпись Telegram
    const isValid = verifyTelegramInitData(initData);
    if (!isValid) {
      res.status(403).json({ error: "Invalid initData" });
      return;
    }

    // Парсим данные (userData)
    const data = parseInitData(initData);
    const userData = data.user as {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      language_code?: string;
    };

    // Проверяем пользователя в БД (по telegramId)
    let user = await prisma.user.findUnique({
      where: { telegramId: userData.id },
    });

    // Если пользователь существует, но у него нет аватарки - обновляем
    if (user && !user.avatar && userData.photo_url) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatar: userData.photo_url }
      });
      logger.info(`✅ Avatar updated for user ${user.telegramId}`);
    }

    // Если нет — создаём
    if (!user) {
      let referralUserId: string | null = null;
      
      // Проверяем реферальный код, если он есть
      if (referralCode && referralCode !== '') {
        const referredByUser = await prisma.user.findUnique({
          where: { telegramId: parseInt(referralCode) },
          select: { id: true },
        });

        if (referredByUser?.id) {
          referralUserId = referredByUser.id;
          // Увеличиваем счетчик рефералов у пригласившего
          await prisma.user.update({
            where: { id: referredByUser.id },
            data: {
              friendsReferred: { increment: 1 },
            },
          });
        }
      }

      // Create the new user
      user = await prisma.user.create({
        data: {
          telegramId: userData.id,
          username: userData.username || `user_${userData.id}`,
          firstName: userData.first_name || null,
          lastName: userData.last_name || null,
          avatar: userData.photo_url || null,
          referral: referralUserId,
          tokens: 100, // Starting tokens
          friendsReferred: 0,
          runwaySettings: {},
          midjourneySettings: {},
          gptSettings: { model: "gpt-4.1-mini" }, // Set correct default model
          appSettings: {},
        },
      });
    }

    // Генерируем токены
    const accessToken = jwt.sign({ userId: user.id, telegramId: user.telegramId }, process.env.JWT_SECRET!, { expiresIn: "5m" });

    // Сохраняем refreshToken в БД
    res.json({ accessToken }).end();
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * GET /myself
 * С помощью нашего JWT middleware req.user уже заполнен.
 */
export const getMyself = async (req: Request, res: Response) => {
  try {
    // Если middleware не смог декодировать токен, он вернёт 401 до прихода сюда
    // Но на всякий случай проверим:
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Возвращаем основные данные
    res.json(user).end();
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
