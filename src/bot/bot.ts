import { Bot } from "grammy";
import { startMenu, aiHandler, universalControlKeyboard, helpKeyboard, settingsKeyboard, backToMainMenu } from "./keyboards/startKeyboard";
import { FreepikHandler } from "./handlers/freepikHandler";
import { RunwayHandler } from "./handlers/runwayHandler";
import { ChatGPTHandler } from "./handlers/chatgptHandler";
import { MidjourneyHandler } from "./handlers/midjourneyHandler";
import { SessionManager } from "./services/SessionManager";
import { SecurityService } from "../services/SecurityService";
import { FreepikRouter } from "./routers/FreepikRouter";
import { RunwayRouter } from "./routers/RunwayRouter";
import { ChatGPTRouter } from "./routers/ChatGPTRouter";
import { MidjourneyRouter } from "./routers/MidjourneyRouter";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prismaClient";

// Создаем бота только если токен доступен
let bot: Bot | null = null;
if (process.env.BOT_TOKEN) {
  bot = new Bot(process.env.BOT_TOKEN);
} else {
  logger.warn("BOT_TOKEN not provided, bot functionality will be disabled");
}

// Экспортируем бота для webhook
export { bot };

const sessionManager = new SessionManager();
const securityService = new SecurityService();

// Инициализация handlers
const freepikHandler = new FreepikHandler();
const runwayHandler = new RunwayHandler(sessionManager);
const chatgptHandler = new ChatGPTHandler(sessionManager);
const midjourneyHandler = new MidjourneyHandler(sessionManager);

// Инициализация routers
const freepikRouter = new FreepikRouter(freepikHandler);
const runwayRouter = new RunwayRouter(runwayHandler);
const chatgptRouter = new ChatGPTRouter(chatgptHandler);
const midjourneyRouter = new MidjourneyRouter(midjourneyHandler);

// Инициализируем обработчики только если бот доступен
if (bot) {
  // 🚀 ГЛАВНЫЕ МЕНЮ AI СЕРВИСОВ
  bot.callbackQuery("chatgpt", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.showMainMenu(ctx);
});

bot.callbackQuery("midjourney", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showMainMenu(ctx);
});

bot.callbackQuery("freepik", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showMainMenu(ctx);
});

bot.callbackQuery("runway", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showMainMenu(ctx);
});

bot.callbackQuery("kling", async ctx => {
  await ctx.answerCallbackQuery();
  await aiHandler.handleAISelection(ctx, "kling");
});

// Помощь и настройки
bot.callbackQuery("help", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "🆘 Помощь\n\n" + 
    "• Выберите AI сервис из меню\n" + 
    "• Отправьте сообщение для начала диалога\n" + 
    "• Напишите 'STOP' для завершения разговора\n" + 
    "• Используйте inline кнопки для навигации",
    { reply_markup: helpKeyboard }
  );
});

bot.callbackQuery("knowledge", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply("📚 База знаний будет доступна в ближайшее время!");
});

bot.callbackQuery("settings", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "⚙️ Настройки\n\n" + 
    "• Выберите AI сервис для настройки\n" + 
    "• Настройте параметры генерации\n" + 
    "• Сохраните предпочтения",
    { reply_markup: settingsKeyboard }
  );
});

// Универсальные кнопки управления
bot.callbackQuery("back_to_start", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🤖 **AICEX AI Bot** - Выберите AI сервис:", {
    parse_mode: 'Markdown',
    reply_markup: startMenu
  });
});

// 🎯 ЕДИНЫЙ CALLBACK ROUTER
bot.on("callback_query:data", async ctx => {
  await ctx.answerCallbackQuery();
  
  const data = ctx.callbackQuery.data;
  if (!data) return;
  
  logger.info(`🔘 Callback received: "${data}" from user ${ctx.from?.id}`);
  
  // Попытка маршрутизации через AI routers
  let handled = false;
  
  try {
    // Freepik router
    if (data.startsWith("freepik_")) {
      logger.info(`🎨 Routing to Freepik router: ${data}`);
      handled = await freepikRouter.handleCallback(ctx);
    }
    // Runway router  
    else if (data.startsWith("runway_")) {
      logger.info(`🚀 Routing to Runway router: ${data}`);
      handled = await runwayRouter.handleCallback(ctx);
    }
    // ChatGPT router
    else if (data.startsWith("chatgpt_")) {
      logger.info(`🤖 Routing to ChatGPT router: ${data}`);
      handled = await chatgptRouter.handleCallback(ctx);
    }
    // Midjourney router
    else if (data.startsWith("midjourney_")) {
      logger.info(`🖼️ Routing to Midjourney router: ${data}`);
      handled = await midjourneyRouter.handleCallback(ctx);
    }
    
    // Если не обработано - логируем
    if (!handled) {
      logger.warn(`⚠️ Unhandled callback: ${data} - no router matched`);
    } else {
      logger.info(`✅ Callback handled successfully: ${data}`);
    }
  } catch (error) {
    logger.error(`❌ Error handling callback ${data}:`, error);
    await ctx.reply("❌ Произошла ошибка при обработке команды");
  }
});

// 🖼️ ОБРАБОТКА ИЗОБРАЖЕНИЙ ДЛЯ CHATGPT
bot.on("message:photo", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  logger.info(`📸 Photo received from user ${userId}`);

  const session = sessionManager.getSession(userId);
  logger.info(`🔍 Session check for photo: ${session ? `active (${session.aiProvider})` : 'none'}`);
  
  if (session && session.aiProvider === 'chatgpt_vision') {
    logger.info(`✅ ChatGPT Vision session active, processing image...`);
    try {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      
      logger.info(`📥 Image downloaded: ${imageUrl}`);
      
      const prompt = ctx.message.caption || "Проанализируй это изображение и опиши что на нем изображено";
      logger.info(`📝 Image analysis prompt: ${prompt}`);
      
      // Валидация промпта
      const validation = securityService.validatePrompt(prompt);
      if (!validation.valid) {
        logger.warn(`❌ Prompt validation failed: ${validation.error}`);
        await ctx.reply(`❌ ${validation.error}`);
        return;
      }
      
      await ctx.reply("🔍 Анализирую изображение...");
      logger.info(`🤖 Calling ChatGPT Vision API...`);
      
      const chatgptService = new (await import("./services/ai/ChatGPTService")).ChatGPTService();
      const result = await chatgptService.analyzeImage(imageUrl, prompt);
      
      logger.info(`✅ ChatGPT Vision analysis completed, length: ${result.content.length}`);
      
      await ctx.reply(`📸 **Анализ изображения GPT-4V:**\n\n${result.content}`);
      
    } catch (error: any) {
      logger.error("❌ Ошибка анализа изображения:", error);
      await ctx.reply(`❌ Ошибка анализа изображения: ${error.message}`);
    }
    return;
  }
});

// 📄 ОБРАБОТКА ДОКУМЕНТОВ ДЛЯ CHATGPT
bot.on("message:document", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  logger.info(`📄 Document received from user ${userId}`);

  const session = sessionManager.getSession(userId);
  logger.info(`🔍 Session check for document: ${session ? `active (${session.aiProvider})` : 'none'}`);
  
  if (session && session.aiProvider === 'chatgpt_document') {
    logger.info(`✅ ChatGPT Document session active, processing...`);
    try {
      const document = ctx.message.document;
      const fileName = document.file_name || 'document';
      const fileSize = document.file_size || 0;
      
      logger.info(`📋 Document info: name=${fileName}, size=${fileSize} bytes, mime=${document.mime_type}`);
      
      // Проверка размера файла (макс 20 МБ)
      const maxSize = 20 * 1024 * 1024;
      if (fileSize > maxSize) {
        logger.warn(`❌ Document too large: ${fileSize} > ${maxSize}`);
        await ctx.reply("❌ Файл слишком большой. Максимальный размер: 20 МБ");
        return;
      }

      await ctx.reply("📄 Обрабатываю документ...");

      // Скачиваем файл
      logger.info(`📥 Downloading document...`);
      const { FileHandler } = await import("../utils/fileHandler");
      const fileHandler = new FileHandler();
      const { filePath, buffer } = await fileHandler.downloadFile(document.file_id);
      logger.info(`✅ Document downloaded to: ${filePath}`);

      try {
        // Извлекаем текст из файла
        logger.info(`📝 Extracting text from document...`);
        const fileContent = await fileHandler.extractText(filePath, document.mime_type);
        logger.info(`✅ Text extracted, length: ${fileContent.length} chars`);
        
        // Ограничиваем размер контента (макс 15000 символов)
        const maxContentLength = 15000;
        const truncatedContent = fileContent.length > maxContentLength 
          ? fileContent.substring(0, maxContentLength) + "\n\n[... текст обрезан ...]"
          : fileContent;

        const prompt = ctx.message.caption || "Проанализируй этот документ и дай краткое резюме";
        logger.info(`📝 Analysis prompt: ${prompt}`);

        // Валидация промпта
        const validation = securityService.validatePrompt(prompt);
        if (!validation.valid) {
          logger.warn(`❌ Prompt validation failed: ${validation.error}`);
          await ctx.reply(`❌ ${validation.error}`);
          fileHandler.cleanupFile(filePath);
          return;
        }

        // Анализируем файл с помощью ChatGPT
        logger.info(`🤖 Calling ChatGPT for file analysis...`);
        const chatgptService = new (await import("./services/ai/ChatGPTService")).ChatGPTService();
        const result = await chatgptService.analyzeFile(truncatedContent, fileName, prompt, userId);
        
        logger.info(`✅ ChatGPT analysis completed, length: ${result.content.length}`);

        await ctx.reply(
          `📄 **Анализ документа "${fileName}":**\n\n${result.content}`,
          { parse_mode: 'Markdown' }
        );

        // Очищаем временный файл
        fileHandler.cleanupFile(filePath);
        logger.info(`🗑️ Temporary file cleaned up`);

      } catch (error: any) {
        fileHandler.cleanupFile(filePath);
        throw error;
      }

    } catch (error: any) {
      logger.error("❌ Ошибка обработки документа:", error);
      await ctx.reply(`❌ Ошибка обработки документа: ${error.message}`);
    }
    return;
  } else {
    logger.info(`ℹ️ Document received but no chatgpt_document session active`);
  }
});

// 🎤 ОБРАБОТКА АУДИО ФАЙЛОВ ДЛЯ CHATGPT
bot.on("message:audio", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  logger.info(`🎤 Audio received from user ${userId}`);

  const session = sessionManager.getSession(userId);
  logger.info(`🔍 Session check for audio: ${session ? `active (${session.aiProvider})` : 'none'}`);
  
  if (session && session.aiProvider === 'chatgpt_audio') {
    logger.info(`✅ ChatGPT Audio session active, transcribing...`);
    try {
      const audio = ctx.message.audio;
      const fileName = audio.file_name || 'audio';
      const fileSize = audio.file_size || 0;
      
      logger.info(`🎵 Audio info: name=${fileName}, size=${fileSize} bytes, mime=${audio.mime_type}`);
      
      // Проверка размера файла (макс 25 МБ для Whisper)
      const maxSize = 25 * 1024 * 1024;
      if (fileSize > maxSize) {
        logger.warn(`❌ Audio too large: ${fileSize} > ${maxSize}`);
        await ctx.reply("❌ Файл слишком большой. Максимальный размер для аудио: 25 МБ");
        return;
      }

      await ctx.reply("🎤 Транскрибирую аудио...");

      // Скачиваем файл
      logger.info(`📥 Downloading audio...`);
      const { FileHandler } = await import("../utils/fileHandler");
      const fileHandler = new FileHandler();
      const { filePath } = await fileHandler.downloadFile(audio.file_id);
      logger.info(`✅ Audio downloaded to: ${filePath}`);

      try {
        // Транскрибируем аудио с помощью Whisper
        logger.info(`🎙️ Calling Whisper API for transcription...`);
        const chatgptService = new (await import("./services/ai/ChatGPTService")).ChatGPTService();
        const result = await chatgptService.transcribeAudio(filePath);
        
        logger.info(`✅ Whisper transcription completed, length: ${result.content.length}`);

        await ctx.reply(
          `🎤 **Транскрипция аудио "${fileName}":**\n\n${result.content}`,
          { parse_mode: 'Markdown' }
        );

        // Очищаем временный файл
        fileHandler.cleanupFile(filePath);
        logger.info(`🗑️ Audio file cleaned up`);

      } catch (error: any) {
        fileHandler.cleanupFile(filePath);
        throw error;
      }

    } catch (error: any) {
      logger.error("❌ Ошибка транскрипции аудио:", error);
      await ctx.reply(`❌ Ошибка транскрипции аудио: ${error.message}`);
    }
    return;
  } else {
    logger.info(`ℹ️ Audio received but no chatgpt_audio session active`);
  }
});

// 🎙️ ОБРАБОТКА ГОЛОСОВЫХ СООБЩЕНИЙ ДЛЯ CHATGPT
bot.on("message:voice", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  logger.info(`🎙️ Voice message received from user ${userId}`);

  const session = sessionManager.getSession(userId);
  logger.info(`🔍 Session check for voice: ${session ? `active (${session.aiProvider})` : 'none'}`);
  
  if (session && session.aiProvider === 'chatgpt_audio') {
    logger.info(`✅ ChatGPT Audio session active, transcribing voice...`);
    try {
      const voice = ctx.message.voice;
      const fileSize = voice.file_size || 0;
      const duration = voice.duration || 0;
      
      logger.info(`🎙️ Voice info: duration=${duration}s, size=${fileSize} bytes, mime=${voice.mime_type}`);
      
      // Проверка размера файла (макс 25 МБ для Whisper)
      const maxSize = 25 * 1024 * 1024;
      if (fileSize > maxSize) {
        logger.warn(`❌ Voice too large: ${fileSize} > ${maxSize}`);
        await ctx.reply("❌ Голосовое сообщение слишком большое. Максимальный размер: 25 МБ");
        return;
      }

      await ctx.reply("🎙️ Транскрибирую голосовое сообщение...");

      // Скачиваем файл
      logger.info(`📥 Downloading voice message...`);
      const { FileHandler } = await import("../utils/fileHandler");
      const fileHandler = new FileHandler();
      const { filePath } = await fileHandler.downloadFile(voice.file_id);
      logger.info(`✅ Voice downloaded to: ${filePath}`);

      try {
        // Транскрибируем голосовое сообщение с помощью Whisper
        logger.info(`🎙️ Calling Whisper API for voice transcription...`);
        const chatgptService = new (await import("./services/ai/ChatGPTService")).ChatGPTService();
        const result = await chatgptService.transcribeAudio(filePath);
        
        logger.info(`✅ Voice transcription completed, length: ${result.content.length}`);

        await ctx.reply(
          `🎙️ **Транскрипция голосового сообщения:**\n\n${result.content}`,
          { parse_mode: 'Markdown' }
        );

        // Очищаем временный файл
        fileHandler.cleanupFile(filePath);
        logger.info(`🗑️ Voice file cleaned up`);

      } catch (error: any) {
        fileHandler.cleanupFile(filePath);
        throw error;
      }

    } catch (error: any) {
      logger.error("❌ Ошибка транскрипции голосового сообщения:", error);
      await ctx.reply(`❌ Ошибка транскрипции голосового сообщения: ${error.message}`);
    }
    return;
  } else {
    logger.info(`ℹ️ Voice received but no chatgpt_audio session active`);
  }
});

// 💬 ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
bot.on("message:text", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const imageSession = sessionManager.getSession(userId);
  
  // ChatGPT генерация изображений
  if (imageSession && imageSession.aiProvider === 'chatgpt_image') {
    try {
      const prompt = ctx.message.text;
      
      // Валидация промпта
      const validation = securityService.validatePrompt(prompt);
      if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}`);
        return;
      }
      
      // Проверка rate limit
      const rateLimitOk = await securityService.checkRateLimit(ctx.from!.id, 'image_generation');
      if (!rateLimitOk) {
        await ctx.reply("⏰ Слишком много запросов. Подождите минуту.");
        return;
      }
      
      await ctx.reply("🎨 Генерирую изображение...");
      
      const imageUrl = await chatgptHandler.generateImage(prompt, userId);
      
      if (imageUrl.startsWith('http')) {
        await ctx.replyWithPhoto(imageUrl, { 
          caption: `🖼️ **DALL-E сгенерировал изображение:**\n\n📝 Промпт: ${prompt}` 
        });
      } else {
        await ctx.reply(imageUrl); // Это сообщение об ошибке
      }
      
    } catch (error: any) {
      logger.error("Ошибка генерации изображения:", error);
      await ctx.reply(`❌ Ошибка генерации изображения: ${error.message}`);
    }
    return;
  }

  // Midjourney генерация
  if (imageSession && imageSession.aiProvider === 'midjourney_generate') {
    try {
      const prompt = ctx.message.text;
      
      // Валидация промпта
      const validation = securityService.validatePrompt(prompt);
      if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}`);
        return;
      }
      
      await ctx.reply("🎨 Генерирую изображение с помощью Midjourney...");
      
      await midjourneyHandler.startGeneration(ctx, prompt);
      
    } catch (error: any) {
      logger.error("Ошибка генерации Midjourney:", error);
      await ctx.reply(`❌ Ошибка генерации изображения: ${error.message}`);
    }
    return;
  }

  // Обычная обработка сообщений для других AI
  if (aiHandler.hasActiveSession(userId)) {
    // Это обрабатывается aiHandler
    return;
  }
});

// 🎬 ОБРАБОТКА ВИДЕО
bot.on("message:video", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const session = sessionManager.getSession(userId);
  if (session && session.aiProvider === 'runway') {
    try {
      const video = ctx.message.video;
      const file = await ctx.api.getFile(video.file_id);
      const videoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      
      await ctx.reply("🎬 Обрабатываю видео через Runway...");
      
      // Здесь будет логика обработки видео
      await ctx.reply("🚧 Обработка видео в разработке!");
      
    } catch (error: any) {
      logger.error("Ошибка обработки видео:", error);
      await ctx.reply(`❌ Ошибка обработки видео: ${error.message}`);
    }
    return;
  }
});

// 🚀 ТЕСТ: Обработка всех сообщений
bot.on("message", async ctx => {
  logger.info(`📨 Message received: "${ctx.message.text}" from user ${ctx.from?.id} (@${ctx.from?.username})`);
  
  // Простой тест ответа
  if (ctx.message.text === "/start") {
    logger.info("🔥 Detected /start command, sending simple reply...");
    try {
      await ctx.reply("✅ Бот работает! Webhook получен и обработан.");
      logger.info("✅ Simple reply sent successfully");
    } catch (error) {
      logger.error("❌ Failed to send simple reply:", error);
    }
  }
});

// 🚀 START COMMAND
bot.command("start", async ctx => {
  const userId = ctx.from?.id;
  logger.info(`📨 /start command from user ${userId} (@${ctx.from?.username})`);
  
  if (!userId) {
    logger.error("No user ID in start command");
    return;
  }

  try {
    logger.info("Creating/updating user in database...");
    
    // Создаем или обновляем пользователя
    await prisma.user.upsert({
      where: { telegramId: userId },
      update: { 
        username: ctx.from?.username || undefined,
        firstName: ctx.from?.first_name || undefined,
        lastName: ctx.from?.last_name || undefined
      },
      create: {
        telegramId: userId,
        username: ctx.from?.username || "",
        firstName: ctx.from?.first_name || "",
        lastName: ctx.from?.last_name || ""
      }
    });

    logger.info("Sending start menu...");
    
    await ctx.reply("🤖 **AICEX AI Bot** - Выберите AI сервис:", {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 Веб-приложение", web_app: { url: "https://aicexonefrontend-production.up.railway.app/home" } }],
          [{ text: "💬 ChatGPT", callback_data: "chatgpt" }, { text: "🎨 Midjourney", callback_data: "midjourney" }],
          [{ text: "🖼️ Freepik", callback_data: "freepik" }, { text: "🎬 Runway", callback_data: "runway" }],
          [{ text: "⚙️ Настройки", callback_data: "settings" }, { text: "❓ Помощь", callback_data: "help" }]
        ]
      }
    });
    
    logger.info("✅ Start command completed successfully");
    
  } catch (error) {
    logger.error("Error in start command:", error);
    logger.error("Error stack:", (error as Error).stack);
    
    try {
      await ctx.reply("❌ Произошла ошибка при запуске бота");
    } catch (replyError) {
      logger.error("Could not send error message:", replyError);
    }
  }
});

} // Закрываем блок if (bot)

// 🧹 Очистка неактивных сессий каждые 30 минут
setInterval(() => {
  aiHandler.cleanupSessions();
  securityService.cleanupRateLimiter();
}, 30 * 60 * 1000);

// 🗑️ Очистка старых временных файлов каждые 6 часов
setInterval(async () => {
  try {
    const { FileHandler } = await import("../utils/fileHandler");
    const fileHandler = new FileHandler();
    fileHandler.cleanupOldFiles(24); // Удаляем файлы старше 24 часов
    logger.info("Old temporary files cleaned up");
  } catch (error) {
    logger.error("Error cleaning up old files:", error);
  }
}, 6 * 60 * 60 * 1000);

// 📊 Функция запуска бота
export async function startBot() {
  try {
    if (!bot) {
      logger.warn("Bot not initialized, skipping bot startup");
      return;
    }
    
    logger.info("🔄 Initializing bot...");
    
    // Проверяем, что бот работает
    const me = await bot.api.getMe();
    logger.info(`✅ Bot verified: @${me.username} (${me.first_name})`);
    
    // ИСПОЛЬЗУЕМ WEBHOOK ВМЕСТО POLLING для Railway
    const webhookUrl = `${process.env.BACKEND_URL || 'https://aicexaibot-production.up.railway.app'}/api/webhooks/telegram`;
    
    try {
      await bot.api.setWebhook(webhookUrl, {
        drop_pending_updates: true,
        allowed_updates: ["message", "callback_query"]
      });
      logger.info(`✅ Webhook set to: ${webhookUrl}`);
    } catch (webhookError) {
      logger.error("Could not set webhook:", webhookError);
      throw webhookError;
    }
    
    // Настраиваем обработку ошибок
    bot.catch((err) => {
      logger.error("Bot error:", err);
    });
    
    logger.info("🤖 Bot configured with webhook successfully!");
    logger.info("✅ Telegram bot ready to receive messages via webhook");
    
  } catch (error) {
    logger.error("Failed to start bot:", error);
    logger.error("Error details:", (error as Error).message);
    throw error;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down bot...");
  if (bot) {
    await bot.stop();
  }
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down bot...");
  if (bot) {
    await bot.stop();
  }
  await prisma.$disconnect();
  process.exit(0);
});
