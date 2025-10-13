import express from "express";
import { prisma } from "../utils/prismaClient";
import { logger } from "../utils/logger";

const router = express.Router();

// Простой endpoint для назначения админа (без авторизации для простоты)
router.post("/make-admin", async (req, res) => {
  try {
    const { telegramId, secretKey } = req.body;
    
    // Простая защита - только с секретным ключом
    if (secretKey !== "admin2024secret") {
      return res.status(403).json({ success: false, error: "Invalid secret key" });
    }
    
    if (!telegramId) {
      return res.status(400).json({ success: false, error: "Telegram ID required" });
    }
    
    logger.info(`Making user ${telegramId} an admin...`);
    
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramId.toString() }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    const updatedUser = await prisma.user.update({
      where: { telegramId: telegramId.toString() },
      data: { role: "ADMIN" },
      select: { id: true, telegramId: true, role: true, firstName: true, lastName: true }
    });
    
    logger.info(`User ${telegramId} is now ADMIN:`, updatedUser);
    
    res.json({ 
      success: true, 
      message: `User ${telegramId} is now ADMIN`,
      user: updatedUser
    });
    
  } catch (error) {
    logger.error("Error making admin:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
