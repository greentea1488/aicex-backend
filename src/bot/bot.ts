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
  
  // Попытка маршрутизации через AI routers
  let handled = false;
  
  try {
    // Freepik router
    if (data.startsWith("freepik_")) {
      handled = await freepikRouter.handleCallback(ctx);
    }
    // Runway router  
    else if (data.startsWith("runway_")) {
      handled = await runwayRouter.handleCallback(ctx);
    }
    // ChatGPT router
    else if (data.startsWith("chatgpt_")) {
      handled = await chatgptRouter.handleCallback(ctx);
    }
    // Midjourney router
    else if (data.startsWith("midjourney_")) {
      handled = await midjourneyRouter.handleCallback(ctx);
    }
    
    // Если не обработано - логируем
    if (!handled) {
      logger.warn(`Unhandled callback: ${data}`);
    }
  } catch (error) {
    logger.error(`Error handling callback ${data}:`, error);
    await ctx.reply("❌ Произошла ошибка при обработке команды");
  }
});

// 🖼️ ОБРАБОТКА ИЗОБРАЖЕНИЙ ДЛЯ CHATGPT
bot.on("message:photo", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const session = sessionManager.getSession(userId);
  if (session && session.aiProvider === 'chatgpt_vision') {
    try {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      
      const prompt = ctx.message.caption || "Проанализируй это изображение и опиши что на нем изображено";
      
      // Валидация промпта
      const validation = securityService.validatePrompt(prompt);
      if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}`);
        return;
      }
      
      await ctx.reply("🔍 Анализирую изображение...");
      
      const chatgptService = new (await import("./services/ai/ChatGPTService")).ChatGPTService();
      const result = await chatgptService.analyzeImage(imageUrl, prompt);
      
      await ctx.reply(`📸 **Анализ изображения GPT-4V:**\n\n${result.content}`);
      
    } catch (error: any) {
      logger.error("Ошибка анализа изображения:", error);
      await ctx.reply(`❌ Ошибка анализа изображения: ${error.message}`);
    }
    return;
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

// 🚀 ТЕСТ: Обработка всех сообщений (кроме команд)
bot.on("message:text", async ctx => {
  logger.info(`📨 Text message received: "${ctx.message.text}" from user ${ctx.from?.id} (@${ctx.from?.username})`);
  
  // Не обрабатываем команды здесь, они обрабатываются отдельно
  if (ctx.message.text?.startsWith('/')) {
    return;
  }
  
  await ctx.reply("Получил ваше сообщение! Используйте /start для главного меню.");
});

// 🚀 START COMMAND
bot.command("start", async ctx => {
  const userId = ctx.from?.id;
  logger.info(`🎯 /start command from user ${userId} (@${ctx.from?.username})`);
  
  if (!userId) {
    logger.error("❌ No user ID in start command");
    return;
  }

  try {
    logger.info("🔄 Creating/updating user in database...");
    
    // Простое создание пользователя БЕЗ ТРАНЗАКЦИЙ
    let user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: userId,
          username: ctx.from?.username || "",
          firstName: ctx.from?.first_name || "",
          lastName: ctx.from?.last_name || "",
          tokens: 10
        }
      });
      logger.info(`✅ New user created: ${user.id}`);
    } else {
      logger.info(`✅ Existing user found: ${user.id}`);
    }

    logger.info(`✅ User created/updated: ${user.id}`);
    logger.info("📤 Sending start menu...");
    
    await ctx.reply("🤖 **AICEX AI Bot** - Выберите AI сервис:", {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 Веб-приложение", web_app: { url: "https://aicexonefrontend-production.up.railway.app/" } }],
          [{ text: "💬 ChatGPT", callback_data: "chatgpt" }, { text: "🎨 Midjourney", callback_data: "midjourney" }],
          [{ text: "🖼️ Freepik", callback_data: "freepik" }, { text: "🎬 Runway", callback_data: "runway" }],
          [{ text: "⚙️ Настройки", callback_data: "settings" }, { text: "❓ Помощь", callback_data: "help" }]
        ]
      }
    });
    
    logger.info("✅ Start command completed successfully");
    
  } catch (error) {
    logger.error("Error in start command:", error);
    logger.error("Error stack:", error.stack);
    
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
    logger.error("Error details:", error.message);
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
