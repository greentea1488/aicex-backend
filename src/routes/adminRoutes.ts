import express from "express";
import { AdminPanelController } from "../controllers/AdminPanelController";
import jwtMw from "../middlewares/jwtMw";
import { adminAuthMiddleware } from "../middlewares/adminAuth";

const router = express.Router();

/**
 * 🔐 Все роуты админ-панели защищены JWT и проверкой роли ADMIN
 */

// Применяем middleware для всех роутов
router.use(jwtMw);
router.use(adminAuthMiddleware);

/**
 * 📊 Статистика
 */
router.get("/stats", AdminPanelController.getStatistics);

/**
 * 👥 Пользователи
 */
router.get("/users", AdminPanelController.getAllUsers);
router.get("/users/:userId", AdminPanelController.getUserDetails);
router.patch("/users/:userId/role", AdminPanelController.updateUserRole);
router.patch("/users/:userId/tokens", AdminPanelController.updateUserTokens);
router.get("/users/:userId/activity", AdminPanelController.getUserActivity);

/**
 * 💰 Транзакции
 */
router.get("/transactions", AdminPanelController.getAllTransactions);

export default router;

