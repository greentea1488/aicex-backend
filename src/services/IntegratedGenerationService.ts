import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import { accessControlService } from './AccessControlService';
import { generationLogService } from './GenerationLogService';
import { TokenService } from './TokenService';
import { subscriptionService } from './SubscriptionService';
import { AIServiceManager } from './ai/AIServiceManager';

const tokenService = new TokenService();
const aiManager = new AIServiceManager();

export interface GenerationRequest {
  telegramId: number;
  service: 'freepik' | 'midjourney' | 'runway' | 'chatgpt';
  type: 'image' | 'video' | 'text';
  prompt: string;
  model?: string;
  settings?: any;
}

export interface GenerationResult {
  success: boolean;
  generationId?: string;
  resultUrl?: string;
  error?: string;
  tokensUsed?: number;
  estimatedTime?: number;
}

/**
 * Интегрированный сервис для AI генерации с полным контролем доступа
 */
export class IntegratedGenerationService {

  /**
   * Основной метод для генерации с полной проверкой доступа
   */
  async generateContent(request: GenerationRequest): Promise<GenerationResult> {
    try {
      // 1. Получаем пользователя
      const user = await prisma.user.findUnique({
        where: { telegramId: request.telegramId },
        include: { 
          subscription: { include: { plan: true } },
          balance: true
        }
      });

      if (!user) {
        return { success: false, error: 'Пользователь не найден' };
      }

      // 2. Определяем сервис для проверки доступа
      const serviceName = this.getServiceName(request.service, request.type, request.model);
      
      // 3. Проверяем доступ
      const accessResult = await accessControlService.checkAccess(request.telegramId, serviceName);
      if (!accessResult.hasAccess) {
        return { 
          success: false, 
          error: accessResult.reason,
          tokensUsed: 0
        };
      }

      // 4. Получаем стоимость операции
      const tokensRequired = tokenService.getServiceCost(request.service, `${request.type}_generation`);

      // 5. Создаем задачу с автоматическим списанием токенов
      const taskResult = await tokenService.createTaskWithTokenDeduction(
        request.telegramId,
        request.service,
        `${request.type}_generation`,
        {
          prompt: request.prompt,
          model: request.model,
          type: request.type,
          settings: request.settings
        }
      );

      if (!taskResult.success) {
        return { 
          success: false, 
          error: taskResult.error,
          tokensUsed: 0
        };
      }

      // 6. Логируем начало генерации
      const generationId = await generationLogService.logGenerationStart({
        userId: user.id,
        telegramId: request.telegramId,
        service: request.service,
        type: request.type,
        prompt: request.prompt,
        model: request.model,
        tokensUsed: tokensRequired,
        taskId: taskResult.taskId,
        metadata: request.settings
      });

      // 7. Запускаем генерацию
      await generationLogService.logGenerationProcessing(generationId);

      let result: any;
      let estimatedTime = 30; // секунды по умолчанию

      try {
        switch (request.service) {
          case 'freepik':
            if (request.type === 'image') {
              result = await this.generateFreepikImage(request);
              estimatedTime = 45;
            } else if (request.type === 'video') {
              result = await this.generateFreepikVideo(request);
              estimatedTime = 120;
            }
            break;

          case 'midjourney':
            result = await this.generateMidjourneyImage(request);
            estimatedTime = 60;
            break;

          case 'runway':
            result = await this.generateRunwayVideo(request);
            estimatedTime = 180;
            break;

          case 'chatgpt':
            result = await this.generateChatGPTResponse(request);
            estimatedTime = 10;
            break;

          default:
            throw new Error(`Неподдерживаемый сервис: ${request.service}`);
        }

        if (result && result.success && result.resultUrl) {
          // 8. Логируем успешное завершение
          await generationLogService.logGenerationCompleted(generationId, result.resultUrl, {
            model: request.model,
            settings: request.settings
          });

          return {
            success: true,
            generationId,
            resultUrl: result.resultUrl,
            tokensUsed: tokensRequired,
            estimatedTime
          };
        } else {
          // 9. Логируем ошибку и возвращаем токены
          await generationLogService.logGenerationFailed(generationId, result?.error || 'Unknown error');
          await tokenService.refundTokens(
            request.telegramId, 
            tokensRequired, 
            request.service, 
            'Generation failed'
          );

          return {
            success: false,
            error: result?.error || 'Ошибка генерации',
            tokensUsed: 0
          };
        }

      } catch (generationError: any) {
        // Логируем ошибку и возвращаем токены
        await generationLogService.logGenerationFailed(generationId, generationError.message);
        await tokenService.refundTokens(
          request.telegramId, 
          tokensRequired, 
          request.service, 
          'Generation error'
        );

        logger.error('Generation error:', generationError);
        return {
          success: false,
          error: 'Произошла ошибка при генерации',
          tokensUsed: 0
        };
      }

    } catch (error: any) {
      logger.error('Integrated generation service error:', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервиса',
        tokensUsed: 0
      };
    }
  }

  /**
   * Определяет имя сервиса для проверки доступа
   */
  private getServiceName(service: string, type: string, model?: string): string {
    switch (service) {
      case 'freepik':
        return type === 'image' ? 'freepik_image' : 'freepik_video';
      case 'midjourney':
        return model?.includes('pro') ? 'midjourney_pro' : 'midjourney_basic';
      case 'runway':
        return 'runway_video';
      case 'chatgpt':
        return model?.includes('advanced') ? 'chatgpt_advanced' : 'chatgpt_basic';
      default:
        return 'unknown_service';
    }
  }

  /**
   * Генерация изображения через Freepik
   */
  private async generateFreepikImage(request: GenerationRequest): Promise<any> {
    try {
      const freepikService = aiManager.getFreepikService();
      
      const result = await freepikService.generateImage({
        prompt: request.prompt,
        model: request.model as any || 'mystic',
        aspect_ratio: request.settings?.aspect_ratio || 'square_1_1',
        resolution: request.settings?.resolution || '1k'
      });

      return {
        success: result.success,
        resultUrl: result.data?.images?.[0]?.url || null,
        error: result.error,
        metadata: {
          model: request.model || 'mystic',
          prompt: request.prompt,
          settings: request.settings,
          taskId: result.data?.id
        }
      };
    } catch (error) {
      logger.error('Freepik image generation error:', error);
      return {
        success: false,
        error: 'Ошибка генерации изображения Freepik'
      };
    }
  }

  /**
   * Генерация видео через Freepik
   */
  private async generateFreepikVideo(request: GenerationRequest): Promise<any> {
    try {
      const freepikService = aiManager.getFreepikService();
      
      // Для видео нужно изображение, если его нет - генерируем сначала изображение
      let imageUrl = request.settings?.imageUrl;
      if (!imageUrl) {
        const imageResult = await this.generateFreepikImage(request);
        if (!imageResult.success || !imageResult.resultUrl) {
          return {
            success: false,
            error: 'Не удалось создать изображение для генерации видео'
          };
        }
        imageUrl = imageResult.resultUrl;
      }

      const result = await freepikService.generateVideoFromImage(
        imageUrl,
        request.prompt,
        request.model as any || 'kling_v2_5_pro'
      );

      return {
        success: result.success,
        resultUrl: result.data?.videos?.[0]?.url || null,
        error: result.error,
        metadata: {
          model: request.model || 'kling-v2-5-pro',
          prompt: request.prompt,
          settings: request.settings,
          taskId: result.data?.id,
          sourceImage: imageUrl
        }
      };
    } catch (error) {
      logger.error('Freepik video generation error:', error);
      return {
        success: false,
        error: 'Ошибка генерации видео Freepik'
      };
    }
  }

  /**
   * Генерация изображения через Midjourney
   */
  private async generateMidjourneyImage(request: GenerationRequest): Promise<any> {
    try {
      // Midjourney API пока недоступен, возвращаем ошибку
      return {
        success: false,
        error: 'Midjourney API временно недоступен. Используйте Freepik для генерации изображений.'
      };
    } catch (error) {
      logger.error('Midjourney generation error:', error);
      return {
        success: false,
        error: 'Ошибка генерации Midjourney'
      };
    }
  }

  /**
   * Генерация видео через Runway
   */
  private async generateRunwayVideo(request: GenerationRequest): Promise<any> {
    try {
      const runwayService = aiManager.getRunwayService();
      
      const result = await runwayService.generateVideo({
        prompt: request.prompt,
        model: (request.model as any) || 'gen3a_turbo',
        duration: request.settings?.duration || 5
      });

      return {
        success: result.success,
        resultUrl: result.data?.output?.[0] || null,
        error: result.error,
        metadata: {
          model: request.model || 'gen3a_turbo',
          prompt: request.prompt,
          settings: request.settings
        }
      };
    } catch (error) {
      logger.error('Runway generation error:', error);
      return {
        success: false,
        error: 'Ошибка генерации Runway'
      };
    }
  }

  /**
   * Генерация ответа через ChatGPT
   */
  private async generateChatGPTResponse(request: GenerationRequest): Promise<any> {
    try {
      const openaiService = aiManager.getOpenAIService();
      
      const result = await openaiService.chat([{
        role: 'user',
        content: request.prompt
      }], request.model || 'gpt-4');

      return {
        success: result.success,
        resultUrl: result.content, // Для текста используем content как resultUrl
        error: result.error,
        metadata: {
          model: request.model || 'gpt-4',
          prompt: request.prompt,
          usage: result.usage
        }
      };
    } catch (error) {
      logger.error('ChatGPT generation error:', error);
      return {
        success: false,
        error: 'Ошибка генерации ChatGPT'
      };
    }
  }

  /**
   * Получить статус генерации
   */
  async getGenerationStatus(generationId: string): Promise<{
    status: string;
    resultUrl?: string;
    error?: string;
  }> {
    try {
      const generation = await prisma.generationHistory.findUnique({
        where: { id: generationId },
        select: {
          status: true,
          resultUrl: true
        }
      });

      if (!generation) {
        return { status: 'not_found' };
      }

      return {
        status: generation.status,
        resultUrl: generation.resultUrl || undefined
      };
    } catch (error) {
      logger.error('Error getting generation status:', error);
      return { status: 'error', error: 'Ошибка получения статуса' };
    }
  }
}

export const integratedGenerationService = new IntegratedGenerationService();
