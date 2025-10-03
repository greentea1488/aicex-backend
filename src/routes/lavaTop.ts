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

router.post('/subscription', authenticateToken, (req, res) => 
  getLavaTopController().createSubscriptionPayment(req, res)
);

router.get('/plans', (req, res) => 
  getLavaTopController().getSubscriptionPlans(req, res)
);

router.get('/status/:invoiceId', authenticateToken, (req, res) => 
  getLavaTopController().getInvoiceStatus(req, res)
);

export default router;
