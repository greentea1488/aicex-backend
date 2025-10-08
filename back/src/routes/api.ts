import { Router } from 'express';
import { UserAPIController } from '../controllers/UserAPIController';
import { authMiddleware, telegramAuthMiddleware } from '../middlewares/auth';

const router = Router();
const userController = new UserAPIController();

// Публичные роуты (без авторизации)
router.post('/auth/telegram', async (req, res) => {
  await userController.telegramAuth(req, res);
});

router.get('/packages', async (req, res) => {
  await userController.getTokenPackages(req, res);
});

// Защищенные роуты (требуют авторизации)
router.use(authMiddleware);

// Профиль пользователя
router.get('/profile', async (req, res) => {
  await userController.getProfile(req, res);
});

router.put('/profile', async (req, res) => {
  await userController.updateProfile(req, res);
});

// Токены
router.get('/tokens/balance', async (req, res) => {
  await userController.getTokenBalance(req, res);
});

router.get('/tokens/history', async (req, res) => {
  await userController.getTokenHistory(req, res);
});

// Платежи
router.post('/payments', async (req, res) => {
  await userController.createPayment(req, res);
});

router.get('/payments/history', async (req, res) => {
  await userController.getPaymentHistory(req, res);
});

// Генерация контента
router.post('/generate/midjourney', async (req, res) => {
  await userController.generateMidjourneyImage(req, res);
});

router.post('/generate/kling', async (req, res) => {
  await userController.generateKlingVideo(req, res);
});

// История генераций
router.get('/generations', async (req, res) => {
  await userController.getGenerationHistory(req, res);
});

// Статистика пользователя
router.get('/stats', async (req, res) => {
  await userController.getUserStats(req, res);
});

// Загрузка аватарки
router.post('/avatar/upload', async (req, res) => {
  await userController.uploadAvatar(req, res);
});

// Опции сервисов
router.get('/services/:service/options', async (req, res) => {
  await userController.getServiceOptions(req, res);
});

export default router;
