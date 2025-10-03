import { Request, Response } from 'express';
import { integratedGenerationService } from '../services/IntegratedGenerationService';
import { accessControlService } from '../services/AccessControlService';
import { generationLogService } from '../services/GenerationLogService';
import { subscriptionService } from '../services/SubscriptionService';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

/**
 * Контроллер для AI генерации через веб-приложение
 */
export class GenerationController {

  /**
   * Генерация изображения
   * POST /api/generation/image
   */
  async generateImage(req: Request, res: Response) {
    try {
      const { telegramId, service, model, prompt, settings } = req.body;

      if (!telegramId || !service || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'Отсутствуют обязательные параметры: telegramId, service, prompt'
        });
      }

      // Генерируем изображение через интегрированный сервис
      const result = await integratedGenerationService.generateContent({
        telegramId,
        service,
        type: 'image',
        prompt,
        model,
        settings
      });

      if (result.success) {
        res.json({
          success: true,
          generationId: result.generationId,
          resultUrl: result.resultUrl,
          tokensUsed: result.tokensUsed,
          estimatedTime: result.estimatedTime
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          tokensUsed: result.tokensUsed || 0
        });
      }
    } catch (error) {
      logger.error('Image generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Генерация видео
   * POST /api/generation/video
   */
  async generateVideo(req: Request, res: Response) {
    try {
      const { telegramId, service, model, prompt, settings } = req.body;

      if (!telegramId || !service || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'Отсутствуют обязательные параметры: telegramId, service, prompt'
        });
      }

      const result = await integratedGenerationService.generateContent({
        telegramId,
        service,
        type: 'video',
        prompt,
        model,
        settings
      });

      if (result.success) {
        res.json({
          success: true,
          generationId: result.generationId,
          resultUrl: result.resultUrl,
          tokensUsed: result.tokensUsed,
          estimatedTime: result.estimatedTime
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          tokensUsed: result.tokensUsed || 0
        });
      }
    } catch (error) {
      logger.error('Video generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * ChatGPT генерация
   * POST /api/generation/chat
   */
  async generateChat(req: Request, res: Response) {
    try {
      const { telegramId, prompt, model, settings } = req.body;

      if (!telegramId || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'Отсутствуют обязательные параметры: telegramId, prompt'
        });
      }

      const result = await integratedGenerationService.generateContent({
        telegramId,
        service: 'chatgpt',
        type: 'text',
        prompt,
        model: model || 'gpt-4',
        settings
      });

      if (result.success) {
        res.json({
          success: true,
          generationId: result.generationId,
          response: result.resultUrl, // Для текста используем resultUrl как ответ
          tokensUsed: result.tokensUsed,
          estimatedTime: result.estimatedTime
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          tokensUsed: result.tokensUsed || 0
        });
      }
    } catch (error) {
      logger.error('Chat generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получить статус генерации
   * GET /api/generation/status/:generationId
   */
  async getGenerationStatus(req: Request, res: Response) {
    try {
      const { generationId } = req.params;

      if (!generationId) {
        return res.status(400).json({
          success: false,
          error: 'Не указан ID генерации'
        });
      }

      const status = await integratedGenerationService.getGenerationStatus(generationId);

      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      logger.error('Get generation status error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получить историю генераций пользователя
   * GET /api/generation/history/:telegramId
   */
  async getGenerationHistory(req: Request, res: Response) {
    try {
      const { telegramId } = req.params;
      const { limit = 20, service } = req.query;

      if (!telegramId) {
        return res.status(400).json({
          success: false,
          error: 'Не указан telegramId'
        });
      }

      const history = await generationLogService.getUserGenerationHistory(
        parseInt(telegramId),
        parseInt(limit as string),
        service as string
      );

      res.json({
        success: true,
        history
      });
    } catch (error) {
      logger.error('Get generation history error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получить статистику генераций пользователя
   * GET /api/generation/stats/:telegramId
   */
  async getGenerationStats(req: Request, res: Response) {
    try {
      const { telegramId } = req.params;

      if (!telegramId) {
        return res.status(400).json({
          success: false,
          error: 'Не указан telegramId'
        });
      }

      const stats = await generationLogService.getUserGenerationStats(parseInt(telegramId));

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Get generation stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Проверить доступ к сервису
   * GET /api/generation/access/:telegramId/:serviceName
   */
  async checkAccess(req: Request, res: Response) {
    try {
      const { telegramId, serviceName } = req.params;

      if (!telegramId || !serviceName) {
        return res.status(400).json({
          success: false,
          error: 'Не указаны telegramId или serviceName'
        });
      }

      const accessResult = await accessControlService.checkAccess(
        parseInt(telegramId),
        serviceName
      );

      res.json({
        success: true,
        access: accessResult
      });
    } catch (error) {
      logger.error('Check access error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получить доступные сервисы для пользователя
   * GET /api/generation/services/:telegramId
   */
  async getAvailableServices(req: Request, res: Response) {
    try {
      const { telegramId } = req.params;

      if (!telegramId) {
        return res.status(400).json({
          success: false,
          error: 'Не указан telegramId'
        });
      }

      const services = await accessControlService.getUserAvailableServices(parseInt(telegramId));

      res.json({
        success: true,
        services
      });
    } catch (error) {
      logger.error('Get available services error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получить информацию о пользователе и его подписке
   * GET /api/generation/user/:telegramId
   */
  async getUserInfo(req: Request, res: Response) {
    try {
      const { telegramId } = req.params;

      if (!telegramId) {
        return res.status(400).json({
          success: false,
          error: 'Не указан telegramId'
        });
      }

      const user = await prisma.user.findUnique({
        where: { telegramId: parseInt(telegramId) },
        include: {
          subscription: {
            include: { plan: true }
          },
          balance: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          tokens: user.tokens,
          subscription: user.subscription ? {
            plan: user.subscription.plan.displayName,
            status: user.subscription.status,
            endDate: user.subscription.endDate,
            tokensGranted: user.subscription.tokensGranted
          } : null,
          balance: user.balance
        }
      });
    } catch (error) {
      logger.error('Get user info error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }
}

export const generationController = new GenerationController();
