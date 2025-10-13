import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prismaClient";
import { logger } from "../utils/logger";

/**
 * 🔐 Middleware для проверки роли админа
 * Должен использоваться после jwtMw (который устанавливает req.user)
 */
export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Проверяем что пользователь авторизован
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      logger.warn("Admin middleware: No user ID in request");
      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      });
    }
    
    // Проверяем роль пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true }
    });
    
    if (!user) {
      logger.warn(`Admin middleware: User ${userId} not found`);
      return res.status(401).json({
        success: false,
        error: "User not found"
      });
    }
    
    if (user.role !== 'ADMIN') {
      logger.warn(`Admin middleware: User ${user.username} (${userId}) attempted to access admin panel`);
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin role required."
      });
    }
    
    logger.info(`Admin access granted for user ${user.username} (${userId})`);
    next();
  } catch (error) {
    logger.error("Admin middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

