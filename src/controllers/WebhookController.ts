import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PaymentService } from '../services/PaymentService';
import { prisma } from '../utils/prismaClient';
import crypto from 'crypto';
import { webhookCallback } from 'grammy';
import { userStateService } from '../services/UserStateService';
import { GenerationService } from '../services/GenerationService';

export class WebhookController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Убеждается, что пользователь существует в базе данных
   */
  private async ensureUserExists(telegramId: number, telegramUser: any): Promise<void> {
    try {
      // Проверяем, существует ли пользователь
      const existingUser = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!existingUser) {
        logger.info(`Creating new user: ${telegramId} (@${telegramUser.username})`);
        
        try {
          // Создаем нового пользователя (без связей для избежания транзакций)
          await prisma.user.create({
            data: {
              telegramId,
              username: telegramUser.username || `user_${telegramId}`,
              firstName: telegramUser.first_name || '',
              lastName: telegramUser.last_name || '',
              tokens: 10 // Стартовые токены
            }
          });
          
          logger.info(`✅ User created successfully: ${telegramId}`);
        } catch (createError: any) {
          // Возможно пользователь уже создан другим процессом
          logger.warn(`User creation failed, but this is likely a race condition: ${createError.message}`);
          
          // Проверяем еще раз, возможно пользователь уже создан
          const userCheck = await prisma.user.findUnique({
            where: { telegramId }
          });
          
          if (!userCheck) {
            logger.error(`Failed to create user ${telegramId} and user still doesn't exist`);
            throw createError;
          } else {
            logger.info(`✅ User ${telegramId} exists after race condition`);
          }
        }
      }
    } catch (error) {
      logger.error('Error ensuring user exists:', error);
      throw error;
    }
  }

  /**
   * Обрабатывает webhook от Telegram
   */
  async handleTelegramWebhook(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Received Telegram webhook', { 
        body: req.body,
        update_id: req.body?.update_id,
        message: req.body?.message?.text,
        from: req.body?.message?.from?.username
      });
      
      // Обрабатываем callback_query (нажатия на кнопки)
      if (req.body?.callback_query) {
        logger.info('🔥 Processing callback query...');
        
        const callbackQuery = req.body.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;
        
        const { bot } = await import('../bot/bot');
        
        if (bot) {
          try {
            // Отвечаем на callback query
            await bot.api.answerCallbackQuery(callbackQuery.id);
            
            if (data === 'photo_generation') {
              await bot.api.editMessageText(chatId, messageId, "📸 **Генерация фотографий** - Выберите модель:", {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🎨 Freepik AI", callback_data: "freepik_photo" }],
                    [{ text: "🎨 Midjourney", callback_data: "midjourney_photo" }],
                    [{ text: "🔙 Назад", callback_data: "back_to_main" }]
                  ]
                }
              });
            } else if (data === 'video_generation') {
              await bot.api.editMessageText(chatId, messageId, "🎬 **Генерация видео** - Выберите модель:", {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🎨 Freepik AI", callback_data: "freepik_video" }],
                    [{ text: "✨ Kling", callback_data: "kling_video" }],
                    [{ text: "🚀 Runway ML", callback_data: "runway_video" }],
                    [{ text: "🔙 Назад", callback_data: "back_to_main" }]
                  ]
                }
              });
            } else if (data === 'freepik_photo') {
              // Устанавливаем состояние пользователя
              userStateService.setState(callbackQuery.from.id, 'freepik_photo');
              
              await bot.api.editMessageText(chatId, messageId, `🎨 **Freepik AI** - генерация изображений\n\n📝 Отправьте текстовый промпт для генерации\n📷 Или отправьте изображение с описанием\n\n💰 Стоимость: 5 токенов`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "photo_generation" }]
                  ]
                }
              });
            } else if (data === 'midjourney_photo') {
              userStateService.setState(callbackQuery.from.id, 'midjourney_photo');
              
              await bot.api.editMessageText(chatId, messageId, `🎨 **Midjourney** - генерация изображений\n\n📝 Отправьте текстовый промпт для генерации\n\n💰 Стоимость: 10 токенов`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "photo_generation" }]
                  ]
                }
              });
            } else if (data === 'freepik_video') {
              userStateService.setState(callbackQuery.from.id, 'freepik_video');
              
              await bot.api.editMessageText(chatId, messageId, `🎬 **Freepik AI** - генерация видео\n\n📝 Отправьте текстовый промпт для генерации\n📷 Или отправьте изображение для анимации\n\n💰 Стоимость: 25 токенов`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "video_generation" }]
                  ]
                }
              });
            } else if (data === 'kling_video') {
              userStateService.setState(callbackQuery.from.id, 'kling_video');
              
              await bot.api.editMessageText(chatId, messageId, `✨ **Kling AI** - генерация видео\n\n📝 Отправьте текстовый промпт для генерации\n📷 Или отправьте изображение для анимации\n\n💰 Стоимость: 30 токенов`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "video_generation" }]
                  ]
                }
              });
            } else if (data === 'runway_video') {
              userStateService.setState(callbackQuery.from.id, 'runway_video');
              
              await bot.api.editMessageText(chatId, messageId, `🚀 **Runway ML** - генерация видео\n\n📝 Отправьте текстовый промпт для генерации\n📷 Или отправьте изображение для анимации\n\n💰 Стоимость: 50 токенов`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "video_generation" }]
                  ]
                }
              });
            } else if (data === 'chatgpt') {
              userStateService.setState(callbackQuery.from.id, 'chatgpt');
              
              await bot.api.editMessageText(chatId, messageId, `💬 **ChatGPT** готов к работе!\n\n📝 Отправьте ваш вопрос или запрос\n\n💰 Стоимость: 1 токен за сообщение`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "back_to_main" }]
                  ]
                }
              });
            } else if (data === 'midjourney') {
              userStateService.setState(callbackQuery.from.id, 'midjourney');
              
              await bot.api.editMessageText(chatId, messageId, `🎨 **Midjourney** - генерация изображений\n\n📝 Отправьте текстовый промпт для генерации\n\n💰 Стоимость: 10 токенов`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "back_to_main" }]
                  ]
                }
              });
            } else if (data === 'kling') {
              userStateService.setState(callbackQuery.from.id, 'kling');
              
              await bot.api.editMessageText(chatId, messageId, `✨ **Kling AI** - генерация видео\n\n📝 Отправьте текстовый промпт для генерации\n📷 Или отправьте изображение для анимации\n\n💰 Стоимость: 30 токенов`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔙 Назад", callback_data: "back_to_main" }]
                  ]
                }
              });
            } else if (data === 'back_to_main') {
              await bot.api.editMessageText(chatId, messageId, "🤖 **AICEX AI Bot** - Выберите сервис:", {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "📸 Генерация фотографий", callback_data: "photo_generation" }],
                    [{ text: "🎬 Генерация видео", callback_data: "video_generation" }],
                    [{ text: "💬 ChatGPT", callback_data: "chatgpt" }],
                    [{ text: "👤 Профиль", web_app: { url: "https://aicexonefrontend-production.up.railway.app/home" } }]
                  ]
                }
              });
            }
            
            logger.info(`✅ Callback query ${data} processed successfully`);
            res.status(200).json({ ok: true });
            return;
            
          } catch (callbackError) {
            logger.error('Failed to process callback query:', callbackError);
          }
        }
      }
      
      // Обрабатываем загрузку изображений
      if (req.body?.message?.photo) {
        const chatId = req.body.message.chat.id;
        const userId = req.body.message.from.id;
        const photos = req.body.message.photo;
        const caption = req.body.message.caption || '';
        
        // Проверяем, ожидает ли пользователь ввода
        const userState = userStateService.getState(userId);
        
        if (userState && userStateService.isWaitingForInput(userId)) {
          logger.info(`Processing image upload from user ${userId}`);
          
          const { bot } = await import('../bot/bot');
          if (bot) {
            try {
              // Получаем самое большое изображение
              const largestPhoto = photos[photos.length - 1];
              const fileInfo = await bot.api.getFile(largestPhoto.file_id);
              const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`;
              
              if (!caption.trim()) {
                await bot.api.sendMessage(chatId, "📝 Пожалуйста, добавьте описание к изображению или отправьте текстовое сообщение с промптом для редактирования.");
                res.status(200).json({ ok: true });
                return;
              }
              
              // Отправляем сообщение о начале генерации
              await bot.api.sendMessage(chatId, "🎨 Начинаю обработку изображения... Это может занять несколько минут.");
              
              const generationService = new GenerationService();
              
              // Определяем тип сервиса и контента
              let service: 'freepik' | 'midjourney' | 'runway' | 'kling' | 'chatgpt';
              let type: 'image' | 'video' | 'text';
              
              switch (userState.action) {
                case 'freepik_photo':
                  service = 'freepik';
                  type = 'image';
                  break;
                case 'midjourney_photo':
                case 'midjourney':
                  service = 'midjourney';
                  type = 'image';
                  break;
                case 'freepik_video':
                  service = 'freepik';
                  type = 'video';
                  break;
                case 'kling_video':
                case 'kling':
                  service = 'kling';
                  type = 'video';
                  break;
                case 'runway_video':
                  service = 'runway';
                  type = 'video';
                  break;
                default:
                  await bot.api.sendMessage(chatId, "❌ Загрузка изображений не поддерживается для этого сервиса");
                  userStateService.clearState(userId);
                  res.status(200).json({ ok: true });
                  return;
              }
              
              // Сначала убеждаемся, что пользователь существует в базе
              await this.ensureUserExists(userId, req.body.message.from);
              
              // Запускаем генерацию с изображением
              const result = await generationService.generateContent({
                userId,
                service,
                type,
                prompt: caption,
                imageUrl
              });
              
              if (result.success) {
                if (type === 'image') {
                  await bot.api.sendPhoto(chatId, result.resultUrl!, {
                    caption: `✅ Изображение обработано!\n💰 Использовано токенов: ${result.tokensUsed}`
                  });
                } else if (type === 'video') {
                  await bot.api.sendVideo(chatId, result.resultUrl!, {
                    caption: `✅ Видео создано из изображения!\n💰 Использовано токенов: ${result.tokensUsed}`
                  });
                }
              } else {
                await bot.api.sendMessage(chatId, `❌ Ошибка обработки: ${result.error}`);
              }
              
              // Очищаем состояние пользователя
              userStateService.clearState(userId);
              
            } catch (error) {
              logger.error('Image processing error:', error);
              await bot.api.sendMessage(chatId, "❌ Произошла ошибка при обработке изображения. Попробуйте позже.");
              userStateService.clearState(userId);
            }
          }
          
          res.status(200).json({ ok: true });
          return;
        }
      }
      
      // Обрабатываем текстовые сообщения
      if (req.body?.message?.text && !req.body.message.text.startsWith('/')) {
        const chatId = req.body.message.chat.id;
        const userId = req.body.message.from.id;
        const text = req.body.message.text;
        
        // Проверяем, ожидает ли пользователь ввода
        const userState = userStateService.getState(userId);
        
        if (userState && userStateService.isWaitingForInput(userId)) {
          logger.info(`Processing generation request from user ${userId}: ${text}`);
          
          const { bot } = await import('../bot/bot');
          if (bot) {
            try {
              // Отправляем сообщение о начале генерации
              await bot.api.sendMessage(chatId, "🎨 Начинаю генерацию... Это может занять несколько минут.");
              
              const generationService = new GenerationService();
              
              // Определяем тип сервиса и контента
              let service: 'freepik' | 'midjourney' | 'runway' | 'kling' | 'chatgpt';
              let type: 'image' | 'video' | 'text';
              
              switch (userState.action) {
                case 'freepik_photo':
                  service = 'freepik';
                  type = 'image';
                  break;
                case 'midjourney_photo':
                case 'midjourney':
                  service = 'midjourney';
                  type = 'image';
                  break;
                case 'freepik_video':
                  service = 'freepik';
                  type = 'video';
                  break;
                case 'kling_video':
                case 'kling':
                  service = 'kling';
                  type = 'video';
                  break;
                case 'runway_video':
                  service = 'runway';
                  type = 'video';
                  break;
                case 'chatgpt':
                  service = 'chatgpt';
                  type = 'text';
                  break;
                default:
                  await bot.api.sendMessage(chatId, "❌ Неизвестный тип генерации");
                  userStateService.clearState(userId);
                  res.status(200).json({ ok: true });
                  return;
              }
              
              // Сначала убеждаемся, что пользователь существует в базе
              await this.ensureUserExists(userId, req.body.message.from);
              
              // Запускаем генерацию
              const result = await generationService.generateContent({
                userId,
                service,
                type,
                prompt: text
              });
              
              if (result.success) {
                if (type === 'text') {
                  // Для ChatGPT отправляем текстовый ответ
                  await bot.api.sendMessage(chatId, `💬 **ChatGPT ответ:**\n\n${result.resultUrl}\n\n💰 Использовано токенов: ${result.tokensUsed}`);
                } else if (type === 'image') {
                  // Для изображений отправляем фото
                  await bot.api.sendPhoto(chatId, result.resultUrl!, {
                    caption: `✅ Изображение создано!\n💰 Использовано токенов: ${result.tokensUsed}`
                  });
                } else if (type === 'video') {
                  // Для видео отправляем видео
                  await bot.api.sendVideo(chatId, result.resultUrl!, {
                    caption: `✅ Видео создано!\n💰 Использовано токенов: ${result.tokensUsed}`
                  });
                }
              } else {
                await bot.api.sendMessage(chatId, `❌ Ошибка генерации: ${result.error}`);
              }
              
              // Очищаем состояние пользователя
              userStateService.clearState(userId);
              
            } catch (error) {
              logger.error('Generation error:', error);
              await bot.api.sendMessage(chatId, "❌ Произошла ошибка при генерации. Попробуйте позже.");
              userStateService.clearState(userId);
            }
          }
          
          res.status(200).json({ ok: true });
          return;
        }
      }
      
      // Обрабатываем /start напрямую
      if (req.body?.message?.text === '/start') {
        logger.info('🔥 Direct /start processing...');
        
        const chatId = req.body.message.chat.id;
        const userId = req.body.message.from.id;
        const username = req.body.message.from.username;
        
        logger.info(`Processing /start for user ${userId} (@${username})`);
        
        // Создаем пользователя если его нет
        await this.ensureUserExists(userId, req.body.message.from);
        
        // Импортируем бота для отправки ответа
        const { bot } = await import('../bot/bot');
        
        if (bot) {
          try {
            await bot.api.sendMessage(chatId, "🤖 **AICEX AI Bot** - Выберите сервис:", {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📸 Генерация фотографий", callback_data: "photo_generation" }],
                  [{ text: "🎬 Генерация видео", callback_data: "video_generation" }],
                  [{ text: "💬 ChatGPT", callback_data: "chatgpt" }],
                  [{ text: "👤 Профиль", web_app: { url: "https://aicexonefrontend-production.up.railway.app/home" } }]
                ]
              }
            });
            
            logger.info('✅ Direct /start response sent successfully');
            res.status(200).json({ ok: true });
            return;
            
          } catch (sendError) {
            logger.error('Failed to send direct response:', sendError);
          }
        }
      }
      
      // Fallback: используем grammY webhook callback
      const { bot } = await import('../bot/bot');
      
      if (!bot) {
        logger.error('Bot not available for webhook processing');
        res.status(500).json({ error: 'Bot not available' });
        return;
      }

      logger.info('Processing update with grammY...');
      logger.info('Update data:', JSON.stringify(req.body, null, 2));
      
      try {
        const callback = webhookCallback(bot, 'express');
        await callback(req, res);
        logger.info('Webhook processed successfully');
      } catch (error) {
        logger.error('Error processing webhook with grammY:', error);
        logger.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
      
    } catch (error) {
      logger.error('Error handling Telegram webhook:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Обрабатывает webhook от Lava.top
   */
  async handleLavaWebhook(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Received Lava webhook', { body: req.body, headers: req.headers });

      // Проверяем подпись webhook
      const signature = req.headers['x-lava-signature'] as string;
      if (!this.verifyLavaSignature(req.body, signature)) {
        logger.error('Invalid Lava webhook signature');
        res.status(400).json({ error: 'Invalid signature' });
        return;
      }

      const webhookData = req.body;
      const success = await this.paymentService.handleWebhook(webhookData);

      if (success) {
        res.status(200).json({ status: 'ok' });
      } else {
        res.status(400).json({ error: 'Webhook processing failed' });
      }

    } catch (error) {
      logger.error('Lava webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Обрабатывает webhook от Freepik
   */
  async handleFreepikWebhook(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Received Freepik webhook', { body: req.body });

      const { task_id, status, result } = req.body;

      if (!task_id) {
        logger.error('Missing task_id in Freepik webhook');
        res.status(400).json({ error: 'Missing task_id' });
        return;
      }

      // Находим задачу в БД
      const task = await prisma.freepikTask.findFirst({
        where: { taskId: task_id },
        include: { user: true }
      });

      if (!task) {
        logger.error('Freepik task not found', { taskId: task_id });
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Обновляем статус задачи
      const updateData: any = {
        status: this.mapFreepikStatus(status),
        response: JSON.stringify(req.body),
        updatedAt: new Date()
      };

      // Если генерация завершена успешно
      if (status === 'completed' && result) {
        if (result.images && result.images.length > 0) {
          updateData.imageUrl = result.images[0].url;
        } else if (result.videos && result.videos.length > 0) {
          updateData.imageUrl = result.videos[0].url; // Для видео тоже используем imageUrl
        }
      } else if (status === 'failed') {
        updateData.error = result?.error || 'Generation failed';
      }

      await prisma.freepikTask.update({
        where: { id: task.id },
        data: updateData
      });

      // Отправляем уведомление пользователю через бота
      await this.notifyUserAboutTaskCompletion(task, status, updateData.imageUrl);

      logger.info('Freepik webhook processed successfully', {
        taskId: task_id,
        status,
        userId: task.userId
      });

      res.status(200).json({ status: 'ok' });

    } catch (error) {
      logger.error('Freepik webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Обрабатывает webhook от Midjourney
   */
  async handleMidjourneyWebhook(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Received Midjourney webhook', { body: req.body });

      const { task_id, status, result } = req.body;

      if (!task_id) {
        logger.error('Missing task_id in Midjourney webhook');
        res.status(400).json({ error: 'Missing task_id' });
        return;
      }

      // Находим задачу в БД
      const task = await prisma.midjourneyTask.findFirst({
        where: { taskId: task_id },
        include: { user: true }
      });

      if (!task) {
        logger.error('Midjourney task not found', { taskId: task_id });
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Обновляем статус задачи
      const updateData: any = {
        status: this.mapMidjourneyStatus(status),
        updatedAt: new Date()
      };

      if (status === 'completed' && result?.image_url) {
        updateData.imageUrl = result.image_url;
      } else if (status === 'failed') {
        updateData.error = result?.error || 'Generation failed';
      }

      await prisma.midjourneyTask.update({
        where: { id: task.id },
        data: updateData
      });

      // Отправляем уведомление пользователю
      await this.notifyUserAboutTaskCompletion(task, status, updateData.imageUrl);

      logger.info('Midjourney webhook processed successfully', {
        taskId: task_id,
        status,
        userId: task.userId
      });

      res.status(200).json({ status: 'ok' });

    } catch (error) {
      logger.error('Midjourney webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Обрабатывает webhook от Runway
   */
  async handleRunwayWebhook(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Received Runway webhook', { body: req.body });

      const { task_id, status, result } = req.body;

      if (!task_id) {
        logger.error('Missing task_id in Runway webhook');
        res.status(400).json({ error: 'Missing task_id' });
        return;
      }

      // Находим задачу в БД
      const task = await prisma.runwayTask.findFirst({
        where: { taskId: task_id },
        include: { user: true }
      });

      if (!task) {
        logger.error('Runway task not found', { taskId: task_id });
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Обновляем статус задачи
      const updateData: any = {
        status: this.mapRunwayStatus(status),
        response: JSON.stringify(req.body),
        updatedAt: new Date()
      };

      if (status === 'completed' && result?.video_url) {
        updateData.videoUrl = result.video_url;
      } else if (status === 'failed') {
        updateData.error = result?.error || 'Generation failed';
      }

      await prisma.runwayTask.update({
        where: { id: task.id },
        data: updateData
      });

      // Отправляем уведомление пользователю
      await this.notifyUserAboutTaskCompletion(task, status, updateData.videoUrl);

      logger.info('Runway webhook processed successfully', {
        taskId: task_id,
        status,
        userId: task.userId
      });

      res.status(200).json({ status: 'ok' });

    } catch (error) {
      logger.error('Runway webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Проверяет подпись webhook от Lava
   */
  private verifyLavaSignature(body: any, signature: string): boolean {
    try {
      const secretKey = process.env.LAVA_SECRET_KEY;
      if (!secretKey) {
        logger.error('Lava secret key not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(JSON.stringify(body))
        .digest('hex');

      return signature === expectedSignature;

    } catch (error) {
      logger.error('Error verifying Lava signature:', error);
      return false;
    }
  }

  /**
   * Преобразует статус Freepik в наш формат
   */
  private mapFreepikStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'CREATED',
      'processing': 'PROCESSING',
      'completed': 'COMPLETED',
      'failed': 'FAILED',
      'cancelled': 'FAILED'
    };

    return statusMap[status] || 'CREATED';
  }

  /**
   * Преобразует статус Midjourney в наш формат
   */
  private mapMidjourneyStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'failed'
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Преобразует статус Runway в наш формат
   */
  private mapRunwayStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'CREATED',
      'processing': 'PROCESSING',
      'completed': 'COMPLETED',
      'failed': 'FAILED',
      'cancelled': 'FAILED'
    };

    return statusMap[status] || 'CREATED';
  }

  /**
   * Отправляет уведомление пользователю о завершении задачи
   */
  private async notifyUserAboutTaskCompletion(
    task: any, 
    status: string, 
    mediaUrl?: string
  ): Promise<void> {
    try {
      // Здесь будет логика отправки уведомления через Telegram бота
      // Пока что просто логируем
      logger.info('Task completion notification', {
        userId: task.userId,
        telegramId: task.telegramId,
        taskId: task.taskId,
        status,
        mediaUrl
      });

      // TODO: Интегрировать с Telegram Bot API для отправки уведомлений

    } catch (error) {
      logger.error('Failed to notify user about task completion:', error);
    }
  }

  /**
   * Health check для webhook endpoints
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      endpoints: {
        telegram: '/api/webhooks/telegram',
        lava: '/api/webhooks/lava',
        freepik: '/api/webhooks/freepik',
        midjourney: '/api/webhooks/midjourney',
        runway: '/api/webhooks/runway'
      }
    });
  }
}
