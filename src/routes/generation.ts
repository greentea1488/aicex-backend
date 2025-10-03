import { Router } from 'express';
import { generationController } from '../controllers/GenerationController';
import { accessControlService } from '../services/AccessControlService';

const router = Router();

/**
 * Middleware для проверки базовых параметров
 */
const validateTelegramId = (req: any, res: any, next: any) => {
  const telegramId = req.body.telegramId || req.params.telegramId;
  
  if (!telegramId || isNaN(parseInt(telegramId))) {
    return res.status(400).json({
      success: false,
      error: 'Некорректный telegramId'
    });
  }
  
  next();
};

/**
 * Генерация изображений
 */
router.post('/image', validateTelegramId, generationController.generateImage.bind(generationController));

/**
 * Генерация видео
 */
router.post('/video', validateTelegramId, generationController.generateVideo.bind(generationController));

/**
 * ChatGPT генерация
 */
router.post('/chat', validateTelegramId, generationController.generateChat.bind(generationController));

/**
 * Получить статус генерации
 */
router.get('/status/:generationId', generationController.getGenerationStatus.bind(generationController));

/**
 * История генераций пользователя
 */
router.get('/history/:telegramId', validateTelegramId, generationController.getGenerationHistory.bind(generationController));

/**
 * Статистика генераций пользователя
 */
router.get('/stats/:telegramId', validateTelegramId, generationController.getGenerationStats.bind(generationController));

/**
 * Проверить доступ к сервису
 */
router.get('/access/:telegramId/:serviceName', validateTelegramId, generationController.checkAccess.bind(generationController));

/**
 * Получить доступные сервисы
 */
router.get('/services/:telegramId', validateTelegramId, generationController.getAvailableServices.bind(generationController));

/**
 * Информация о пользователе
 */
router.get('/user/:telegramId', validateTelegramId, generationController.getUserInfo.bind(generationController));

export default router;
