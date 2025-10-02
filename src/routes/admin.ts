import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/auth';
import { adminMiddleware } from '../middlewares/admin';

const router = Router();
const adminController = new AdminController();

// Применяем middleware для всех админских роутов
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard статистика
router.get('/dashboard/stats', async (req, res) => {
  await adminController.getDashboardStats(req, res);
});

// Управление пользователями
router.get('/users', async (req, res) => {
  await adminController.getUsers(req, res);
});

router.get('/users/:userId', async (req, res) => {
  await adminController.getUserDetails(req, res);
});

router.put('/users/:userId/tokens', async (req, res) => {
  await adminController.updateUserTokens(req, res);
});

// Аналитика платежей
router.get('/analytics/payments', async (req, res) => {
  await adminController.getPaymentAnalytics(req, res);
});

// Аналитика сервисов
router.get('/analytics/services', async (req, res) => {
  await adminController.getServiceAnalytics(req, res);
});

export default router;
