import { Router } from 'express';
import { LavaTopController } from '../controllers/LavaTopController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
const lavaTopController = new LavaTopController();

/**
 * Webhook для обработки уведомлений от Lava Top
 * Не требует авторизации, так как приходит от внешнего сервиса
 */
router.post('/webhook', (req, res) => lavaTopController.handleWebhook(req, res));

/**
 * Создание платежа для подписки
 * Требует авторизации
 */
router.post('/subscription', authenticateToken, (req, res) => 
  lavaTopController.createSubscriptionPayment(req, res)
);

/**
 * Создание платежа для токенов
 * Требует авторизации
 */
router.post('/tokens', authenticateToken, (req, res) => 
  lavaTopController.createTokenPayment(req, res)
);

/**
 * Получение статуса платежа
 * Требует авторизации
 */
router.get('/status/:paymentId', authenticateToken, (req, res) => 
  lavaTopController.getPaymentStatus(req, res)
);

export default router;
