import { FreepikService, FreepikImageRequest, FreepikVideoRequest } from './FreepikService';
import { OpenAIService, ChatMessage } from './OpenAIService';
import { RunwayService, RunwayVideoRequest } from './RunwayService';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prismaClient';

export interface GenerationResult {
  success: boolean;
  data?: {
    type: 'image' | 'video' | 'text';
    url?: string;
    urls?: string[];
    content?: string;
    metadata?: any;
    taskId?: string;
    status?: string;
    message?: string;
  };
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
  private currentUserContext?: UserContext;

  // Стоимость в токенах для разных операций
  private readonly TOKEN_COSTS = {
    freepik_image: 8,
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
    options?: any
  ): Promise<GenerationResult> {
    // Сохраняем userContext для использования в методах
    this.currentUserContext = userContext;
    try {
      const tokenCost = this.getTokenCost(service, 'image');
      
      // Проверяем баланс токенов
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost, service);
      if (!balanceCheck.success) {
        return balanceCheck;
      }

      logger.info('Starting image generation:', { service, prompt: prompt.substring(0, 50) });

      let result: GenerationResult;

      switch (service) {
        case 'freepik':
          result = await this.generateFreepikImage(prompt, options);
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
        logger.warn('Image generation failed, refunding tokens:', { service, error: result.error });
        await this.refundTokens(userContext.telegramId, tokenCost, `Failed ${service} image generation`);
      } else {
        result.tokensUsed = tokenCost;
        
        logger.info('Image generation successful, saving to history:', { 
          service, 
          telegramId: userContext.telegramId,
          url: result.data?.url 
        });
        
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
      
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost, service);
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
          result = await this.generateRunwayVideo(prompt, userContext, options);
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
      
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost, 'chatgpt');
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
      
      const balanceCheck = await this.checkAndDeductTokens(userContext, tokenCost, 'chatgpt');
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
  private async generateFreepikImage(prompt: string, options?: any): Promise<GenerationResult> {
    try {
      // Включаем enhancePrompt для русских промптов - он переведет на английский!
      const isRussianPrompt = /[а-яё]/i.test(prompt);
      // Если промпт русский - ВСЕГДА включаем enhancePrompt для перевода на английский
      const shouldEnhancePrompt = isRussianPrompt ? true : (options?.enhancePrompt !== false);
      
      const request: FreepikImageRequest = {
        prompt,
        aspect_ratio: options?.aspect_ratio || '1:1',
        model: options?.model || 'seedream',
        enhancePrompt: shouldEnhancePrompt,
        promptStyle: isRussianPrompt ? undefined : (options?.promptStyle || 'photographic'),
        promptQuality: isRussianPrompt ? undefined : (options?.promptQuality || 'high')
      };
      
      console.log('==================== RUSSIAN PROMPT CHECK ====================');
      console.log('Prompt:', prompt);
      console.log('Is Russian:', isRussianPrompt);
      console.log('Enhance Prompt:', shouldEnhancePrompt, isRussianPrompt ? '(will translate to English)' : '(original language)');
      console.log('Prompt Style:', request.promptStyle);
      console.log('Prompt Quality:', request.promptQuality);
      console.log('===============================================================');

      console.log('==================== AI SERVICE MANAGER FREEPIK START ====================');
      console.log('Request:', JSON.stringify(request, null, 2));
      console.log('Options:', JSON.stringify(options, null, 2));
      console.log('===============================================================');

      logger.info('🔥 AI Service Manager - Trying Freepik generation with request:', { 
        prompt: prompt.substring(0, 50), 
        model: request.model,
        aspect_ratio: request.aspect_ratio,
        options: options
      });

      const response = await this.freepik.generateImage(request);
      
      console.log('==================== AI SERVICE MANAGER FREEPIK RESPONSE ====================');
      console.log('Response:', JSON.stringify(response, null, 2));
      console.log('===============================================================');
      
      // Сохраняем задачу в FreepikTask для webhook если есть task_id
      if (response.success && response.data?.id && this.currentUserContext) {
        try {
          const user = await prisma.user.findUnique({
            where: { telegramId: this.currentUserContext.telegramId }
          });
          
          if (user) {
            await prisma.freepikTask.create({
              data: {
                userId: user.id,
                taskId: response.data.id,
                prompt,
                model: request.model || 'seedream',
                type: 'image',
                status: 'processing',
                cost: 5
              }
            });
            console.log('✅ FreepikTask saved to DB for image generation:', response.data.id);
          }
        } catch (dbError) {
          console.error('Failed to save FreepikTask:', dbError);
          // Продолжаем даже при ошибке сохранения
        }
      }
      
      if (!response.success) {
        logger.warn('Freepik generation failed, trying DALL-E fallback:', response.error);
        
        // Fallback на DALL-E
        const dalleResult = await this.generateDalleImage(prompt, options);
        if (dalleResult.success) {
          logger.info('Successfully used DALL-E fallback');
          return dalleResult;
        }
        
        return {
          success: false,
          error: `Freepik failed: ${response.error}. DALL-E fallback also failed: ${dalleResult.error}`
        };
      }

      logger.info('Freepik response data structure:', {
        hasData: !!response.data,
        hasImages: !!response.data?.images,
        imagesLength: response.data?.images?.length,
        firstImage: response.data?.images?.[0],
        fullData: JSON.stringify(response.data, null, 2)
      });

      const imageUrl = response.data?.images?.[0]?.url;
      
      logger.info('Extracted image URL:', { imageUrl, type: typeof imageUrl });
      
      if (!imageUrl) {
        logger.warn('No image URL from Freepik, trying DALL-E fallback');
        
        // Fallback на DALL-E
        const dalleResult = await this.generateDalleImage(prompt, options);
        if (dalleResult.success) {
          logger.info('Successfully used DALL-E fallback for missing URL');
          return dalleResult;
        }
        
        return {
          success: false,
          error: 'No image URL received from Freepik and DALL-E fallback failed'
        };
      }

      logger.info('Freepik generation successful, returning image URL:', imageUrl);
      return {
        success: true,
        data: {
          type: 'image',
          url: imageUrl,
          metadata: { ...response.data, service: 'freepik' }
        }
      };
    } catch (error) {
      logger.error('Freepik generation error, trying DALL-E fallback:', error);
      
      // Fallback на DALL-E при любых ошибках
      const dalleResult = await this.generateDalleImage(prompt, options);
      if (dalleResult.success) {
        logger.info('Successfully used DALL-E fallback after error');
        return dalleResult;
      }
      
      return {
        success: false,
        error: `Freepik error: ${error instanceof Error ? error.message : 'Unknown error'}. DALL-E fallback also failed: ${dalleResult.error}`
      };
    }
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

    // Включаем enhancePrompt для русских промптов - он переведет на английский!
    const isRussianPrompt = /[а-яё]/i.test(prompt);
    let finalPrompt = prompt;
    
    if (isRussianPrompt) {
      console.log('==================== VIDEO RUSSIAN PROMPT CHECK ====================');
      console.log('Video Prompt:', prompt);
      console.log('Is Russian:', isRussianPrompt);
      console.log('Will enhance for translation to English');
      console.log('===============================================================');
      
      // Используем FreepikService для улучшения промпта (он уже имеет PromptEnhancerService)
      try {
        // Вызываем generateVideoFromImage напрямую, он уже имеет логику улучшения промпта
        const response = await this.freepik.generateVideoFromImage(
          options.image,
          prompt,
          options?.model || 'kling_v2_5_pro',
          options?.duration || 5
        );
        
        if (response.success) {
          return {
            success: true,
            data: {
              type: 'video',
              url: response.data?.videos?.[0]?.url,
              metadata: {
                id: response.data?.id,
                status: response.data?.status,
                videos: response.data?.videos,
                service: 'freepik'
              }
            },
            tokensUsed: options?.tokensUsed || 15
          };
        }
      } catch (error) {
        console.log('⚠️ Video prompt enhancement failed, using direct call:', error);
      }
    }

    const request: FreepikVideoRequest = {
      image: options.image,
      duration: options?.duration || '5',
      prompt: finalPrompt,
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
  private async generateRunwayVideo(prompt: string, userContext: UserContext, options?: any): Promise<GenerationResult> {
    console.log('==================== RUNWAY VIDEO GENERATION START ====================');
    console.log('Prompt:', prompt);
    console.log('UserContext:', JSON.stringify(userContext, null, 2));
    console.log('Options:', JSON.stringify(options, null, 2));
    console.log('===============================================================');

    try {
      // Получаем пользователя для создания задачи в БД
      const user = await prisma.user.findUnique({
        where: { telegramId: userContext.telegramId }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Рассчитываем стоимость
      const cost = 15; // Runway стоит 15 токенов
      
      // Проверяем баланс токенов
      if (user.tokens < cost) {
        return {
          success: false,
          error: `Insufficient tokens. Required: ${cost}, Available: ${user.tokens}`
        };
      }

      // Создаем задачу в БД
      const task = await prisma.runwayTask.create({
        data: {
          userId: user.id,
          prompt: prompt,
          model: options?.model || 'gen4_turbo',
          type: 'image_to_video',
          status: 'CREATED',
          cost,
          taskId: '' // Будет обновлен после создания в API
        }
      });

      // Создаем запрос для Runway API
      const request: RunwayVideoRequest = {
        promptText: prompt,
        model: options?.model || 'gen4_turbo',
        duration: options?.duration || 5,
        ratio: options?.ratio || '1280:720'
      };

      // Если есть imageUrl - добавляем promptImage
      if (options?.imageUrl) {
        request.promptImage = options.imageUrl;
      }

      console.log('==================== RUNWAY API REQUEST ====================');
      console.log('Request:', JSON.stringify(request, null, 2));
      console.log('===============================================================');

      // Отправляем запрос в Runway API
      const response = await this.runway.generateVideo(request);
      
      console.log('==================== RUNWAY API RESPONSE ====================');
      console.log('Response success:', response.success);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      console.log('Response error:', response.error);
      console.log('===============================================================');
      
      if (!response.success) {
        // Обновляем статус задачи на FAILED
        await prisma.runwayTask.update({
          where: { id: task.id },
          data: { 
            status: 'FAILED',
            error: response.error || 'Runway API error'
          }
        });
        
        return {
          success: false,
          error: response.error || 'Runway video generation failed'
        };
      }

      const taskId = response.data?.id;
      if (!taskId) {
        await prisma.runwayTask.update({
          where: { id: task.id },
          data: { 
            status: 'FAILED',
            error: 'No task ID received from Runway'
          }
        });
        
        return {
          success: false,
          error: 'No task ID received from Runway'
        };
      }

      // Обновляем задачу с taskId от API
      await prisma.runwayTask.update({
        where: { id: task.id },
        data: { 
          taskId,
          status: 'PROCESSING'
        }
      });

      // Списываем токены
      await prisma.tokenHistory.create({
        data: {
          userId: user.id,
          type: 'SPEND_RUNWAY',
          amount: -cost,
          taskId: taskId,
          description: `Runway video generation: ${prompt.substring(0, 50)}...`,
          balanceBefore: user.tokens,
          balanceAfter: user.tokens - cost
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: user.tokens - cost }
      });

      // ВРЕМЕННОЕ РЕШЕНИЕ: прямая проверка статуса вместо TaskQueue
      console.log('🔄 Starting direct Runway polling...');
      
      // Запускаем polling в фоне
      this.startRunwayPolling(taskId, user.telegramId, prompt, cost);
      
      console.log('✅ Runway polling started in background');

      return {
        success: true,
        data: {
          type: 'video',
          taskId: taskId,
          status: 'PROCESSING',
          message: 'Video generation started, result will be delivered via webhook'
        }
      };

    } catch (error: any) {
      console.error('❌ Runway video generation error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Запускает polling статуса Runway задачи
   */
  private startRunwayPolling(taskId: string, userId: number, prompt: string, cost: number): void {
    console.log('🎬 Starting Runway polling for task:', taskId);
    
    // Запускаем polling в фоне
    setTimeout(async () => {
      await this.pollRunwayTaskStatus(taskId, userId, prompt, cost);
    }, 2000); // Начинаем через 2 секунды
  }

  /**
   * Polling статуса Runway задачи
   */
  private async pollRunwayTaskStatus(taskId: string, userId: number, prompt: string, cost: number, attempt: number = 1, maxAttempts: number = 120): Promise<void> {
    try {
      console.log(`📡 Runway polling attempt ${attempt}/${maxAttempts} for task ${taskId}`);
      
      const statusResponse = await this.runway.getTaskStatus(taskId);
      
      if (!statusResponse.success) {
        console.error(`Runway status check failed for task ${taskId}:`, statusResponse.error);
        if (attempt < maxAttempts) {
          setTimeout(() => this.pollRunwayTaskStatus(taskId, userId, prompt, cost, attempt + 1, maxAttempts), 5000);
        }
        return;
      }

      const { status, output } = statusResponse.data;
      console.log(`📊 Runway task ${taskId} status:`, { status, hasOutput: !!output });

      if (status === 'SUCCEEDED' && output && output.length > 0) {
        console.log(`✅ Runway task ${taskId} completed successfully`);
        await this.notifyUserAboutRunwayCompletion(taskId, userId, prompt, output[0], cost);
        return;
      }

      if (status === 'FAILED') {
        console.error(`❌ Runway task ${taskId} failed`);
        await this.notifyUserAboutRunwayFailure(taskId, userId, prompt);
        return;
      }

      // Продолжаем polling
      if (attempt < maxAttempts) {
        setTimeout(() => this.pollRunwayTaskStatus(taskId, userId, prompt, cost, attempt + 1, maxAttempts), 5000);
      } else {
        console.error(`❌ Runway task ${taskId} timeout after ${maxAttempts} attempts`);
      }

    } catch (error: any) {
      console.error(`Runway polling attempt ${attempt} failed:`, error.message);
      if (attempt < maxAttempts) {
        setTimeout(() => this.pollRunwayTaskStatus(taskId, userId, prompt, cost, attempt + 1, maxAttempts), 10000);
      }
    }
  }

  /**
   * Уведомляет пользователя о завершении Runway задачи
   */
  private async notifyUserAboutRunwayCompletion(taskId: string, userId: number, prompt: string, videoUrl: string, cost: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { telegramId: userId } });
      if (!user || !user.telegramId) {
        console.error('User not found for Runway notification:', userId);
        return;
      }

      // Импортируем bot
      const { bot } = await import('../../bot/production-bot');
      
      console.log(`📤 Sending Runway video to user ${user.telegramId}`);
      
      await bot.api.sendVideo(user.telegramId, videoUrl, {
        caption: `✨ <b>Видео готово!</b>\n\n📝 "${prompt}"\n🎬 Runway ML\n💰 Потрачено: ${cost} токенов`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Еще одно', callback_data: 'generate_video' }, { text: '📊 Статистика', callback_data: 'stats' }],
            [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
          ]
        }
      });

      console.log('✅ Runway video sent to user successfully');

    } catch (error) {
      console.error('Failed to send Runway video to user:', error);
    }
  }

  /**
   * Уведомляет пользователя о неудаче Runway задачи
   */
  private async notifyUserAboutRunwayFailure(taskId: string, userId: number, prompt: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { telegramId: userId } });
      if (!user || !user.telegramId) {
        console.error('User not found for Runway failure notification:', userId);
        return;
      }

      // Импортируем bot
      const { bot } = await import('../../bot/production-bot');
      
      await bot.api.sendMessage(user.telegramId, `❌ <b>Видео не удалось создать</b>\n\n📝 "${prompt}"\n🎬 Runway ML\n\nПопробуйте еще раз или обратитесь в поддержку.`, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Попробовать еще раз', callback_data: 'generate_video' }],
            [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
          ]
        }
      });

    } catch (error) {
      console.error('Failed to send Runway failure notification to user:', error);
    }
  }

  /**
   * Проверка и списание токенов
   */
  private async checkAndDeductTokens(userContext: UserContext, tokenCost: number, service: string = 'freepik'): Promise<GenerationResult> {
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

      // Баланс до операции
      const balanceBefore = user.tokens;
      const balanceAfter = balanceBefore - tokenCost;

      // Списываем токены
      await prisma.user.update({
        where: { telegramId: userContext.telegramId },
        data: { tokens: { decrement: tokenCost } }
      });

      // Определяем тип транзакции по сервису
      const typeMap: Record<string, any> = {
        'freepik': 'SPEND_FREEPIK',
        'dalle': 'SPEND_CHATGPT',
        'midjourney': 'SPEND_MIDJOURNEY',
        'runway': 'SPEND_RUNWAY',
        'chatgpt': 'SPEND_CHATGPT'
      };
      
      const transactionType = typeMap[service.toLowerCase()] || 'SPEND_FREEPIK';

      // Сохраняем в историю токенов
      const tokenHistoryEntry = await prisma.tokenHistory.create({
        data: {
          userId: user.id,
          amount: -tokenCost, // Отрицательное для трат
          type: transactionType,
          service: service,
          balanceBefore,
          balanceAfter,
          description: `Token deduction for ${service} generation`
        }
      });

      logger.info('Tokens deducted and saved to history:', {
        telegramId: userContext.telegramId,
        userId: user.id,
        amount: tokenCost,
        balanceBefore,
        balanceAfter,
        transactionType,
        tokenHistoryId: tokenHistoryEntry.id
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
      // Получаем пользователя
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true }
      });

      if (!user) {
        logger.warn('User not found for history save:', { telegramId });
        return;
      }

      // Сохраняем в базу данных историю генераций
      await prisma.generationHistory.create({
        data: {
          userId: user.id,
          service: data.service,
          type: data.type,
          prompt: data.prompt,
          resultUrl: data.result,
          tokensUsed: data.tokensUsed,
          status: 'completed'
        }
      });

      logger.info('Generation saved to history:', { 
        telegramId, 
        userId: user.id,
        type: data.type, 
        service: data.service,
        tokensUsed: data.tokensUsed
      });
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
