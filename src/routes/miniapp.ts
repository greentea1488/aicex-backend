import { Router } from 'express';
import { MiniAppController } from '../controllers/MiniAppController';
import { 
  authenticateToken, 
  validateWebAppData,
  logActivity,
  checkUserLimits
} from '../middlewares/authMiddleware';

const router = Router();
const controller = new MiniAppController();

/**
 * Публичные роуты (не требуют аутентификации)
 */

// Аутентификация через Telegram WebApp
router.post(
  '/auth',
  validateWebAppData,
  logActivity('MINI_APP_AUTH'),
  async (req, res) => controller.authenticate(req, res)
);

/**
 * Защищенные роуты (требуют токен)
 */

// Профиль пользователя
router.get(
  '/profile',
  authenticateToken,
  logActivity('GET_PROFILE'),
  (req, res) => controller.getProfile(req, res)
);

router.put(
  '/profile',
  authenticateToken,
  logActivity('UPDATE_PROFILE'),
  (req, res) => controller.updateProfile(req, res)
);

// Баланс
router.get(
  '/balance',
  authenticateToken,
  logActivity('GET_BALANCE'),
  (req, res) => controller.getBalance(req, res)
);

// История генераций
router.get(
  '/history',
  authenticateToken,
  logActivity('GET_HISTORY'),
  (req, res) => controller.getHistory(req, res)
);

// История токенов
router.get(
  '/tokens/history',
  authenticateToken,
  logActivity('GET_TOKEN_HISTORY'),
  (req, res) => controller.getTokenHistory(req, res)
);

// Статистика
router.get(
  '/stats',
  authenticateToken,
  logActivity('GET_STATS'),
  (req, res) => controller.getStats(req, res)
);

/**
 * Роуты для генерации контента (с проверкой лимитов)
 */

// Генерация изображения
router.post(
  '/generate/image',
  authenticateToken,
  checkUserLimits,
  logActivity('GENERATE_IMAGE'),
  async (req, res) => {
    // Здесь будет интеграция с FreepikService
    res.json({
      success: true,
      message: 'Image generation endpoint (to be implemented)'
    });
  }
);

// Генерация видео
router.post(
  '/generate/video',
  authenticateToken,
  checkUserLimits,
  logActivity('GENERATE_VIDEO'),
  async (req, res) => {
    // Здесь будет интеграция с FreepikVideoService
    res.json({
      success: true,
      message: 'Video generation endpoint (to be implemented)'
    });
  }
);

// Генерация текста (ChatGPT)
router.post(
  '/generate/text',
  authenticateToken,
  checkUserLimits,
  logActivity('GENERATE_TEXT'),
  async (req, res) => {
    // Здесь будет интеграция с OpenAIService
    res.json({
      success: true,
      message: 'Text generation endpoint (to be implemented)'
    });
  }
);

/**
 * Роуты для подписок и платежей
 */

// Получить доступные планы подписок
router.get(
  '/subscriptions/plans',
  logActivity('GET_SUBSCRIPTION_PLANS'),
  async (req, res) => {
    res.json({
      success: true,
      data: {
        plans: [
          {
            id: 'free',
            name: 'Free',
            price: 0,
            tokens: 100,
            features: ['Basic image generation', 'Limited video generation']
          },
          {
            id: 'basic',
            name: 'Basic',
            price: 499,
            tokens: 500,
            features: ['All image models', 'HD video generation', 'Priority support']
          },
          {
            id: 'pro',
            name: 'Pro',
            price: 1999,
            tokens: 2500,
            features: ['All features', 'Unlimited generations', 'API access', 'Custom models']
          }
        ]
      }
    });
  }
);

// Получить текущую подписку
router.get(
  '/subscriptions/current',
  authenticateToken,
  logActivity('GET_CURRENT_SUBSCRIPTION'),
  async (req, res) => {
    // Здесь будет логика получения подписки
    res.json({
      success: true,
      message: 'Subscription endpoint (to be implemented)'
    });
  }
);

// Создать платеж
router.post(
  '/payments/create',
  authenticateToken,
  logActivity('CREATE_PAYMENT'),
  async (req, res) => {
    // Здесь будет интеграция с платежной системой
    res.json({
      success: true,
      message: 'Payment creation endpoint (to be implemented)'
    });
  }
);

// Webhook для платежной системы
router.post(
  '/payments/webhook',
  logActivity('PAYMENT_WEBHOOK'),
  async (req, res) => {
    // Здесь будет обработка webhook от платежной системы
    res.json({
      success: true,
      message: 'Payment webhook endpoint (to be implemented)'
    });
  }
);

/**
 * Health check для Mini App API
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
