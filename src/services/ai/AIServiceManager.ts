import { FreepikService, FreepikImageRequest, FreepikVideoRequest } from './FreepikService';
import { OpenAIService, ChatMessage } from './OpenAIService';
import { RunwayService, RunwayVideoRequest } from './RunwayService';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prismaClient';

export interface GenerationResult {
  success: boolean;
  data?: {
    type?: 'image' | 'video' | 'text';
    url?: string;
    content?: string;
    metadata?: any;
    task_id?: string;
    status?: string;
    message?: string;
  };
  resultUrl?: string; // Для совместимости со старым кодом
  taskId?: string;
  error?: string;
  tokensUsed?: number;
}
export interface UserContext {
  telegramId: number;
  currentTokens: number;
}

export class AIServiceManager {
  private freepik: FreepikService;
  private openai: OpenAIService;
  private runway: RunwayService;

  // Стоимость в токенах для разных операций
  private readonly TOKEN_COSTS = {
    freepik_image: 5,
    freepik_video: 25,
    midjourney_image: 10,
    runway_video: 50,
    openai_chat: 2,
    openai_vision: 5,
    dalle_image: 15
  };

  constructor() {
    try {
      this.freepik = new FreepikService();
      this.openai = new OpenAIService();
      this.runway = new RunwayService();
      logger.info('AI Service Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Service Manager:', error);
      throw error;
    }
  }

  /**
   * Генерация изображения
   */
  async generateImage(
    prompt: string, 
    service: 'freepik' | 'dalle' | 'midjourney',
    userContext: UserContext,
    model?: string,
    options?: any
  ): Promise<GenerationResult> {
    try {
      const tokenCost = this.getTokenCost(service, 'image');
      
      // Проверяем баланс токенов
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost);
      if (!balanceCheck.success) {
        return balanceCheck;
      }

      logger.info('Starting image generation:', { service, prompt: prompt.substring(0, 50) });

      let result: GenerationResult;

      switch (service) {
        case 'freepik':
          result = await this.generateFreepikImage(prompt, model, options);
          break;
          
        case 'dalle':
          result = await this.generateDalleImage(prompt, options);
          break;
          
        case 'midjourney':
          result = {
            success: false,
            error: 'Midjourney integration coming soon'
          };
          break;
          
        default:
          result = {
            success: false,
            error: 'Unknown image generation service'
          };
      }

      // Если генерация не удалась, возвращаем токены
      if (!result.success) {
        await this.refundTokens(userContext.telegramId, tokenCost, `Failed ${service} image generation`);
      } else {
        result.tokensUsed = tokenCost;
        
        // Сохраняем в историю
        await this.saveToHistory(userContext.telegramId, {
          type: 'image',
          service,
          prompt,
          result: result.data?.url || 'Generated',
          tokensUsed: tokenCost
        });
      }

      return result;

    } catch (error: any) {
      logger.error('Image generation error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during image generation'
      };
    }
  }

  /**
   * Генерация видео
   */
  async generateVideo(
    prompt: string,
    service: 'freepik' | 'runway',
    userContext: UserContext,
    options?: any
  ): Promise<GenerationResult> {
    try {
      const tokenCost = this.getTokenCost(service, 'video');
      
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost);
      if (!balanceCheck.success) {
        return balanceCheck;
      }

      logger.info('Starting video generation:', { service, prompt: prompt.substring(0, 50) });

      let result: GenerationResult;

      switch (service) {
        case 'freepik':
          result = await this.generateFreepikVideo(prompt, options);
          break;
          
        case 'runway':
          result = await this.generateRunwayVideo(prompt, options);
          break;
          
        default:
          result = {
            success: false,
            error: 'Unknown video generation service'
          };
      }

      if (!result.success) {
        await this.refundTokens(userContext.telegramId, tokenCost, `Failed ${service} video generation`);
      } else {
        result.tokensUsed = tokenCost;
        
        await this.saveToHistory(userContext.telegramId, {
          type: 'video',
          service,
          prompt,
          result: result.data?.url || 'Generated',
          tokensUsed: tokenCost
        });
      }

      return result;

    } catch (error: any) {
      logger.error('Video generation error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during video generation'
      };
    }
  }

  /**
   * Чат с AI
   */
  async chatWithAI(
    messages: ChatMessage[],
    service: 'gpt4' | 'gpt3.5',
    userContext: UserContext
  ): Promise<GenerationResult> {
    try {
      const tokenCost = this.TOKEN_COSTS.openai_chat;
      
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost);
      if (!balanceCheck.success) {
        return balanceCheck;
      }

      const model = service === 'gpt4' ? 'gpt-4' : 'gpt-3.5-turbo';
      const response = await this.openai.chat(messages, model);

      if (!response.success) {
        await this.refundTokens(userContext.telegramId, tokenCost, 'Failed OpenAI chat');
        return {
          success: false,
          error: response.error || 'Chat failed'
        };
      }

      await this.saveToHistory(userContext.telegramId, {
        type: 'chat',
        service: 'openai',
        prompt: messages[messages.length - 1]?.content || '',
        result: response.content || '',
        tokensUsed: tokenCost
      });

      return {
        success: true,
        data: {
          type: 'text',
          content: response.content
        },
        tokensUsed: tokenCost
      };

    } catch (error: any) {
      logger.error('Chat error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during chat'
      };
    }
  }

  /**
   * Анализ изображения с GPT-4 Vision
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string,
    userContext: UserContext
  ): Promise<GenerationResult> {
    try {
      const tokenCost = this.TOKEN_COSTS.openai_vision;
      
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost);
      if (!balanceCheck.success) {
        return balanceCheck;
      }

      const response = await this.openai.analyzeImage(imageUrl, prompt);

      if (!response.success) {
        await this.refundTokens(userContext.telegramId, tokenCost, 'Failed GPT-4 Vision');
        return {
          success: false,
          error: response.error || 'Image analysis failed'
        };
      }

      await this.saveToHistory(userContext.telegramId, {
        type: 'vision',
        service: 'openai',
        prompt,
        result: response.content || '',
        tokensUsed: tokenCost
      });

      return {
        success: true,
        data: {
          type: 'text',
          content: response.content
        },
        tokensUsed: tokenCost
      };

    } catch (error: any) {
      logger.error('Vision analysis error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during image analysis'
      };
    }
  }

  /**
   * Генерация изображения через Freepik
   */
  private async generateFreepikImage(prompt: string, model?: string, options?: any): Promise<GenerationResult> {
    const request: FreepikImageRequest = {
      prompt,
      aspect_ratio: options?.size || 'square_1_1',
      model: (model as any) || 'flux_dev' // Используем переданную модель или flux_dev по умолчанию
    };

    const response = await this.freepik.generateImage(request);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Freepik generation failed'
      };
    }

    // Freepik API работает асинхронно - возвращаем task_id
    // Результат придет через webhook
    return {
      success: true,
      data: {
        type: 'image',
        task_id: response.data?.id,
        status: 'processing',
        message: 'Изображение генерируется, результат придет через несколько секунд'
      }
    };
  }

  /**
   * Генерация изображения через DALL-E
   */
  private async generateDalleImage(prompt: string, options?: any): Promise<GenerationResult> {
    const response = await this.openai.generateImage(prompt, options?.size || '1024x1024');
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'DALL-E generation failed'
      };
    }

    return {
      success: true,
      data: {
        type: 'image',
        url: response.content,
        metadata: { service: 'dalle' }
      }
    };
  }

  /**
   * Генерация видео через Freepik
   */
  private async generateFreepikVideo(prompt: string, options?: any): Promise<GenerationResult> {
    // For video generation, we need an image URL as input
    // This should be provided in options or we need to generate an image first
    if (!options?.image) {
      throw new Error('Image URL is required for Freepik video generation');
    }

    const request: FreepikVideoRequest = {
      image: options.image,
      duration: options?.duration || '5',
      prompt,
      model: options?.model || 'kling-v2'
    };

    const response = await this.freepik.generateVideo(request);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Freepik video generation failed'
      };
    }

    const videoUrl = response.data?.videos?.[0]?.url;
    if (!videoUrl) {
      return {
        success: false,
        error: 'No video URL received from Freepik'
      };
    }

    return {
      success: true,
      data: {
        type: 'video',
        url: videoUrl,
        metadata: response.data
      }
    };
  }

  /**
   * Генерация видео через Runway
   */
  private async generateRunwayVideo(prompt: string, options?: any): Promise<GenerationResult> {
    const request: RunwayVideoRequest = {
      prompt,
      model: options?.model || 'gen3a_turbo',
      duration: options?.duration || 5,
      resolution: options?.resolution || '1280x768'
    };

    const response = await this.runway.generateVideo(request);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Runway video generation failed'
      };
    }

    const videoUrl = response.data?.output?.[0];
    if (!videoUrl) {
      return {
        success: false,
        error: 'No video URL received from Runway'
      };
    }

    return {
      success: true,
      data: {
        type: 'video',
        url: videoUrl,
        metadata: response.data
      }
    };
  }

  /**
   * Проверка и списание токенов
   */
  private async checkAndDeductTokens(userContext: UserContext, tokenCost: number): Promise<GenerationResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: userContext.telegramId }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (user.tokens < tokenCost) {
        return {
          success: false,
          error: `Недостаточно токенов. Нужно: ${tokenCost}, у вас: ${user.tokens}`
        };
      }

      // Списываем токены
      await prisma.user.update({
        where: { telegramId: userContext.telegramId },
        data: { tokens: { decrement: tokenCost } }
      });

      return { success: true };

    } catch (error) {
      logger.error('Token deduction error:', error);
      return {
        success: false,
        error: 'Error processing tokens'
      };
    }
  }

  /**
   * Возврат токенов при ошибке
   */
  private async refundTokens(telegramId: number, amount: number, reason: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { telegramId },
        data: { tokens: { increment: amount } }
      });

      logger.info('Tokens refunded:', { telegramId, amount, reason });
    } catch (error) {
      logger.error('Token refund error:', error);
    }
  }

  /**
   * Сохранение в историю
   */
  private async saveToHistory(telegramId: number, data: any): Promise<void> {
    try {
      // Здесь можно сохранить в базу данных историю генераций
      logger.info('Generation saved to history:', { telegramId, type: data.type, service: data.service });
    } catch (error) {
      logger.error('History save error:', error);
    }
  }

  /**
   * Получение стоимости в токенах
   */
  private getTokenCost(service: string, type: string): number {
    const key = `${service}_${type}` as keyof typeof this.TOKEN_COSTS;
    return this.TOKEN_COSTS[key] || 10;
  }

  /**
   * Получение баланса пользователя
   */
  async getUserBalance(telegramId: number): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { tokens: true }
      });

      return user?.tokens || 0;
    } catch (error) {
      logger.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * Проверка здоровья всех сервисов
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const results = {
      freepik: false,
      openai: false,
      runway: false
    };

    try {
      results.freepik = await this.freepik.validateApiKey();
    } catch (error) {
      logger.error('Freepik health check failed:', error);
    }

    try {
      results.openai = await this.openai.validateApiKey();
    } catch (error) {
      logger.error('OpenAI health check failed:', error);
    }

    try {
      results.runway = await this.runway.validateApiKey();
    } catch (error) {
      logger.error('Runway health check failed:', error);
    }

    return results;
  }
}
