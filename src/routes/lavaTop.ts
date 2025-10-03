import { Router } from 'express';
import { LavaTopController } from '../controllers/LavaTopController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Ленивая инициализация контроллера
let lavaTopController: LavaTopController | null = null;
const getLavaTopController = () => {
  if (!lavaTopController) {
    lavaTopController = new LavaTopController();
  }
  return lavaTopController;
};

/**
 * Webhook для обработки уведомлений от Lava Top
 * Не требует авторизации, так как приходит от внешнего сервиса
 */
router.post('/webhook', (req, res) => getLavaTopController().handleWebhook(req, res));

/**
 * Создание платежа для подписки
 * Требует авторизации
 */
router.post('/subscription', authenticateToken, (req, res) => 
  getLavaTopController().createSubscriptionPayment(req, res)
);

/**
 * Создание платежа для токенов
 * Требует авторизации
 */
router.post('/tokens', authenticateToken, (req, res) => 
  getLavaTopController().createTokenPayment(req, res)
);

/**
 * Получение статуса платежа
 * Требует авторизации
 */
router.get('/status/:paymentId', authenticateToken, (req, res) => 
  getLavaTopController().getPaymentStatus(req, res)
);

export default router;
