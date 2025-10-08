import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { logger } from '../utils/logger';

const router = Router();
const webhookController = new WebhookController();

// Middleware для логирования всех webhook запросов
router.use((req, res, next) => {
  logger.info('Webhook request received', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    ip: req.ip
  });
  next();
});

// Telegram bot webhook
router.post('/telegram', async (req, res) => {
  await webhookController.handleTelegramWebhook(req, res);
});

// Lava.top payment webhooks (поддерживаем оба варианта URL)
router.post('/lava', async (req, res) => {
  await webhookController.handleLavaWebhook(req, res);
});

router.post('/lava-top', async (req, res) => {
  await webhookController.handleLavaWebhook(req, res);
});

// Freepik generation webhooks
router.post('/freepik', async (req, res) => {
  await webhookController.handleFreepikWebhook(req, res);
});

// Midjourney generation webhooks
router.post('/midjourney', async (req, res) => {
  await webhookController.handleMidjourneyWebhook(req, res);
});

// Runway generation webhooks
router.post('/runway', async (req, res) => {
  await webhookController.handleRunwayWebhook(req, res);
});

// Health check endpoint
router.get('/health', async (req, res) => {
  await webhookController.healthCheck(req, res);
});

// Catch-all для неизвестных webhook'ов - используем более безопасный подход
router.use((req, res, next) => {
  // Если запрос не был обработан предыдущими маршрутами
  logger.warn('Unknown webhook endpoint accessed', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Webhook endpoint not found',
    availableEndpoints: [
      'POST /api/webhooks/lava',
      'POST /api/webhooks/lava-top',
      'POST /api/webhooks/freepik',
      'POST /api/webhooks/midjourney',
      'POST /api/webhooks/runway',
      'GET /api/webhooks/health'
    ]
  });
});

export default router;
