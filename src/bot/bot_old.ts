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

const bot = new Bot(process.env.BOT_TOKEN!);
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

bot.callbackQuery("help", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "🆘 Помощь\n\n" + 
    "• Выберите AI сервис из меню\n" + 
    "• Отправьте сообщение для начала диалога\n" + 
    "• Напишите 'STOP' для завершения разговора\n" + 
    "• Используйте /start для возврата в меню"
  );
});

bot.callbackQuery("knowledge", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply("📚 База знаний будет доступна в ближайшее время!");
});

// 🎯 ВСЕ CALLBACK HANDLERS ПЕРЕНЕСЕНЫ В ROUTERS
// Все Freepik handlers перенесены в FreepikRouter

// Все старые handlers удалены - теперь используется роутинг

bot.callbackQuery("freepik_settings_aspect_ratio", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showAspectRatioSettings(ctx);
});

bot.callbackQuery("freepik_settings_person_generation", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showPersonGenerationSettings(ctx);
});

bot.callbackQuery("freepik_settings_safety", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showSafetySettings(ctx);
});

bot.callbackQuery("freepik_settings_video_duration", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showVideoDurationSettings(ctx);
});

bot.callbackQuery("freepik_settings_video_params", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showVideoParamsSettings(ctx);
});

bot.callbackQuery("freepik_task_status", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showTaskStatus(ctx);
});

// Навигация назад к главному Freepik меню
bot.callbackQuery("freepik_back_to_main", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showMainMenu(ctx);
});

// Старые handlers для совместимости
bot.callbackQuery("freepik_image_gen", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showTextToImageMenu(ctx);
});

bot.callbackQuery("freepik_video_gen", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showImageToVideoMenu(ctx);
});

bot.callbackQuery("freepik_edit", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showEditMenu(ctx);
});

bot.callbackQuery("freepik_filters", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showFiltersMenu(ctx);
});

bot.callbackQuery("freepik_backgrounds", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("🚧 Функция 'Фоны и маски' в разработке!", { reply_markup: freepikHandler.getBackButton() });
});

bot.callbackQuery("freepik_style_transfer", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("🚧 Функция 'Стили переноса' в разработке!", { reply_markup: freepikHandler.getBackButton() });
});

// Image model handlers
bot.callbackQuery("freepik_model_mystic", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectImageModel(ctx, "mystic");
});

bot.callbackQuery("freepik_model_artistic", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectImageModel(ctx, "artistic");
});

bot.callbackQuery("freepik_model_fantasy", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectImageModel(ctx, "fantasy");
});

bot.callbackQuery("freepik_model_photography", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectImageModel(ctx, "photography");
});

bot.callbackQuery("freepik_model_portrait", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectImageModel(ctx, "portrait");
});

bot.callbackQuery("freepik_model_landscape", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectImageModel(ctx, "landscape");
});

bot.callbackQuery("freepik_model_architecture", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectImageModel(ctx, "architecture");
});

// 📐 НАСТРОЙКИ СООТНОШЕНИЙ СТОРОН
bot.callbackQuery("freepik_aspect_square_1_1", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectAspectRatio(ctx, "square_1_1");
});

bot.callbackQuery("freepik_aspect_social_story_9_16", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectAspectRatio(ctx, "social_story_9_16");
});

bot.callbackQuery("freepik_aspect_widescreen_16_9", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectAspectRatio(ctx, "widescreen_16_9");
});

bot.callbackQuery("freepik_aspect_traditional_3_4", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectAspectRatio(ctx, "traditional_3_4");
});

bot.callbackQuery("freepik_aspect_classic_4_3", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectAspectRatio(ctx, "classic_4_3");
});

// 👥 НАСТРОЙКИ ПЕРСОНАЖЕЙ
bot.callbackQuery("freepik_person_dont_allow", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectPersonGeneration(ctx, "dont_allow");
});

bot.callbackQuery("freepik_person_allow_adult", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectPersonGeneration(ctx, "allow_adult");
});

bot.callbackQuery("freepik_person_allow_all", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectPersonGeneration(ctx, "allow_all");
});

// 🔐 НАСТРОЙКИ БЕЗОПАСНОСТИ
bot.callbackQuery("freepik_safety_block_none", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectSafetySetting(ctx, "block_none");
});

bot.callbackQuery("freepik_safety_block_only_high", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectSafetySetting(ctx, "block_only_high");
});

bot.callbackQuery("freepik_safety_block_medium_and_above", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectSafetySetting(ctx, "block_medium_and_above");
});

bot.callbackQuery("freepik_safety_block_low_and_above", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectSafetySetting(ctx, "block_low_and_above");
});

// ⏱️ НАСТРОЙКИ ДЛИТЕЛЬНОСТИ ВИДЕО
bot.callbackQuery("freepik_duration_5", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoDuration(ctx, "5");
});

bot.callbackQuery("freepik_duration_10", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoDuration(ctx, "10");
});

// 🎬 Video submenu navigation handlers
bot.callbackQuery("freepik_video_kling_new", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showKlingNewMenu(ctx);
});

bot.callbackQuery("freepik_video_kling_classic", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showKlingClassicMenu(ctx);
});

bot.callbackQuery("freepik_video_pixverse", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showPixVerseMenu(ctx);
});

bot.callbackQuery("freepik_video_minimax", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showMinimaxMenu(ctx);
});

bot.callbackQuery("freepik_video_seedance", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showSeedanceMenu(ctx);
});

bot.callbackQuery("freepik_video_wan", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showWanMenu(ctx);
});

// 🚀 Kling New Models
bot.callbackQuery("freepik_video_kling-v2.5-pro", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-v2.5-pro");
});

bot.callbackQuery("freepik_video_kling-v2.1-master", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-v2.1-master");
});

bot.callbackQuery("freepik_video_kling-pro-v2.1", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-pro-v2.1");
});

bot.callbackQuery("freepik_video_kling-std-v2.1", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-std-v2.1");
});

bot.callbackQuery("freepik_video_kling-v2", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-v2");
});

// ⭐ Kling Classic Models
bot.callbackQuery("freepik_video_kling-pro-1.6", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-pro-1.6");
});

bot.callbackQuery("freepik_video_kling-std-1.6", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-std-1.6");
});

bot.callbackQuery("freepik_video_kling-elements-pro-1.6", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-elements-pro-1.6");
});

bot.callbackQuery("freepik_video_kling-elements-std-1.6", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "kling-elements-std-1.6");
});

// 🎯 PixVerse Models
bot.callbackQuery("freepik_video_pixverse-v5", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "pixverse-v5");
});

bot.callbackQuery("freepik_video_pixverse-v5-transition", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "pixverse-v5-transition");
});

// 🎪 Minimax Hailuo Models
bot.callbackQuery("freepik_video_minimax-hailuo-02-1080p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "minimax-hailuo-02-1080p");
});

bot.callbackQuery("freepik_video_minimax-hailuo-02-768p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "minimax-hailuo-02-768p");
});

// 🎭 Seedance Models
bot.callbackQuery("freepik_video_seedance-pro-1080p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "seedance-pro-1080p");
});

bot.callbackQuery("freepik_video_seedance-pro-720p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "seedance-pro-720p");
});

bot.callbackQuery("freepik_video_seedance-pro-480p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "seedance-pro-480p");
});

bot.callbackQuery("freepik_video_seedance-lite-1080p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "seedance-lite-1080p");
});

bot.callbackQuery("freepik_video_seedance-lite-720p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "seedance-lite-720p");
});

bot.callbackQuery("freepik_video_seedance-lite-480p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "seedance-lite-480p");
});

// 🌟 Wan Models
bot.callbackQuery("freepik_video_wan-v2.2-720p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "wan-v2.2-720p");
});

bot.callbackQuery("freepik_video_wan-v2.2-580p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "wan-v2.2-580p");
});

bot.callbackQuery("freepik_video_wan-v2.2-480p", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.selectVideoModel(ctx, "wan-v2.2-480p");
});

// Navigation handlers
bot.callbackQuery("freepik_back_to_functions", async ctx => {
  await ctx.answerCallbackQuery();
  await freepikHandler.showMainMenu(ctx);
});

bot.callbackQuery("back_to_main", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "🤖 AI Telegram Bot\n\nВыберите AI сервис:",
    { reply_markup: startMenu }
  );
});

// Start command
bot.command("start", async ctx => {
  // End any active AI session when user goes back to start
  const userId = ctx.from?.id.toString();
  if (userId && aiHandler.hasActiveSession(userId)) {
    const session = aiHandler.getActiveSession(userId);
    if (session) {
      await ctx.reply("✅ Предыдущий разговор завершен.");
    }
  }

  await ctx.reply("Добро пожаловать! Выберите действие:", {
    reply_markup: startMenu,
  });
});

// Stop command - alternative way to stop AI conversations
bot.command("stop", async ctx => {
  const userId = ctx.from?.id.toString();
  if (userId && aiHandler.hasActiveSession(userId)) {
    await aiHandler.handleMessage(ctx); // This will handle the STOP logic
  } else {
    await ctx.reply("ℹ️ У вас нет активного разговора.");
  }
});

// Status command - show current session info
bot.command("status", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const session = aiHandler.getActiveSession(userId);
  if (session) {
    await ctx.reply(
      `📊 Активный разговор:\n` +
        `🤖 AI: ${session.aiProvider}\n` +
        `💬 Сообщений: ${session.messages.length}\n` +
        `⏰ Начат: ${session.createdAt.toLocaleString("ru-RU")}\n\n` +
        `Напишите "STOP" для завершения разговора.`
    );
  } else {
    await ctx.reply("ℹ️ У вас нет активного разговора.");
  }
});

// Handle all text messages (for AI conversations)
bot.on("message:text", async ctx => {
  const userId = ctx.from?.id.toString();
  
  // Check if it's a Freepik session
  if (userId && freepikHandler.hasActiveFreepikSession(userId)) {
    const text = ctx.message?.text;
    if (text?.toUpperCase() === "STOP") {
      freepikHandler.endFreepikSession(userId);
      await ctx.reply("✅ Freepik сессия завершена.\n\nИспользуйте /start для возврата в главное меню.");
      return;
    }
    
    if (text) {
      await freepikHandler.processUserPrompt(ctx, text);
      return;
    }
  }
  
  // Handle regular AI sessions
  await aiHandler.handleMessage(ctx);
});

// Handle other message types during AI conversations
// 🖼️ ОБРАБОТКА ИЗОБРАЖЕНИЙ ДЛЯ CHATGPT
bot.on("message:photo", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const session = sessionManager.getSession(userId);
  if (session && session.aiProvider === 'chatgpt_vision') {
    try {
      // Получаем URL изображения
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      
      const prompt = ctx.message.caption || "Проанализируй это изображение и опиши что на нем изображено";
      
      await ctx.reply("🔍 Анализирую изображение...");
      
      const chatgptService = new (await import("./services/ai/ChatGPTService")).ChatGPTService();
      const result = await chatgptService.analyzeImage(imageUrl, prompt);
      
      await ctx.reply(`📸 **Анализ изображения GPT-4V:**\n\n${result.content}`);
      
    } catch (error: any) {
      console.error("Ошибка анализа изображения:", error);
      await ctx.reply(`❌ Ошибка анализа изображения: ${error.message}`);
    }
    return;
  }
});

// 💬 ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ДЛЯ CHATGPT
bot.on("message:text", async ctx => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  // Проверяем есть ли активная сессия ChatGPT image generation
  const imageSession = sessionManager.getSession(userId);
  if (imageSession && imageSession.aiProvider === 'chatgpt_image') {
    try {
      const prompt = ctx.message.text;
      
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
      console.error("Ошибка генерации изображения:", error);
      await ctx.reply(`❌ Ошибка генерации изображения: ${error.message}`);
    }
    return;
  }

  // Проверяем есть ли активная сессия Midjourney generation
  if (imageSession && imageSession.aiProvider === 'midjourney_generate') {
    try {
      const prompt = ctx.message.text;
      
      await ctx.reply("🎨 Генерирую изображение с помощью Midjourney...");
      
      await midjourneyHandler.startGeneration(ctx, prompt);
      
    } catch (error: any) {
      console.error("Ошибка генерации Midjourney:", error);
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

bot.on("message", async ctx => {
  const userId = ctx.from?.id.toString();
  if (userId && aiHandler.hasActiveSession(userId)) {
    await ctx.reply("ℹ️ В режиме AI разговора поддерживаются только текстовые сообщения.\n" + "Напишите 'STOP' для завершения разговора.");
  }
});

// 🎬 RUNWAY HANDLERS (MOVED HERE TO BE BEFORE UNKNOWN HANDLER)
// Главное меню
bot.callbackQuery("runway_back_to_main", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showMainMenu(ctx);
});

// Видео генерация
bot.callbackQuery("runway_video_gen", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showVideoModels(ctx);
});

bot.callbackQuery("runway_video_gen4_aleph", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.selectVideoModel(ctx, "gen4_aleph");
});

bot.callbackQuery("runway_video_gen4_turbo", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.selectVideoModel(ctx, "gen4_turbo");
});

bot.callbackQuery("runway_video_gen3a_turbo", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.selectVideoModel(ctx, "gen3a_turbo");
});

bot.callbackQuery("runway_video_act_two", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.selectVideoModel(ctx, "act_two");
});

// Изображения
bot.callbackQuery("runway_image_gen", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showImageModels(ctx);
});

bot.callbackQuery("runway_image_gen4_image", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.selectImageModel(ctx, "gen4_image");
});

bot.callbackQuery("runway_image_gen4_image_turbo", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.selectImageModel(ctx, "gen4_image_turbo");
});

// Редактирование и эффекты
bot.callbackQuery("runway_editing", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showEditingMenu(ctx);
});

bot.callbackQuery("runway_effects", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showEffectsMenu(ctx);
});

// Справка
bot.callbackQuery("runway_help", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showHelpMenu(ctx);
});

bot.callbackQuery("runway_help_usage", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showUsageHelp(ctx);
});

bot.callbackQuery("runway_help_examples", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showExamples(ctx);
});

bot.callbackQuery("runway_help_tips", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showTips(ctx);
});

bot.callbackQuery("runway_help_api", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.showApiInfo(ctx);
});

// Конфигурация длительности
bot.callbackQuery("runway_duration_3", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.setDuration(ctx, 3);
});

bot.callbackQuery("runway_duration_5", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.setDuration(ctx, 5);
});

bot.callbackQuery("runway_duration_10", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.setDuration(ctx, 10);
});

// Конфигурация соотношений
bot.callbackQuery("runway_ratio_16_9", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.setRatio(ctx, "1280:720");
});

bot.callbackQuery("runway_ratio_9_16", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.setRatio(ctx, "720:1280");
});

bot.callbackQuery("runway_ratio_1_1", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.setRatio(ctx, "960:960");
});

// Завершение конфигурации
bot.callbackQuery("runway_config_done", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.finishVideoConfig(ctx);
});

bot.callbackQuery("runway_img_config_done", async ctx => {
  await ctx.answerCallbackQuery();
  await runwayHandler.finishImageConfig(ctx);
});

// 🤖 CHATGPT HANDLERS
// Главное меню
bot.callbackQuery("chatgpt_back_to_main", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.showMainMenu(ctx);
});

// Текстовый чат
bot.callbackQuery("chatgpt_text_chat", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.startTextChat(ctx);
});

// Генерация изображений
bot.callbackQuery("chatgpt_image_gen", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.showImageGenMenu(ctx);
});

// Анализ изображений
bot.callbackQuery("chatgpt_image_analyze", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.showImageAnalyzeMenu(ctx);
});

// Настройки модели
bot.callbackQuery("chatgpt_model_settings", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.showModelsMenu(ctx);
});

// Выбор конкретных моделей ChatGPT
bot.callbackQuery("chatgpt_model_gpt-4o", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.selectModel(ctx, "gpt-4o");
});

bot.callbackQuery("chatgpt_model_gpt-4o-mini", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.selectModel(ctx, "gpt-4o-mini");
});

bot.callbackQuery("chatgpt_model_gpt-4-turbo", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.selectModel(ctx, "gpt-4-turbo");
});

bot.callbackQuery("chatgpt_model_gpt-4", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.selectModel(ctx, "gpt-4");
});

bot.callbackQuery("chatgpt_model_gpt-3.5-turbo", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.selectModel(ctx, "gpt-3.5-turbo");
});

// Выбор моделей DALL-E
bot.callbackQuery("chatgpt_dalle_3", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.selectImageModel(ctx, "dall-e-3");
});

bot.callbackQuery("chatgpt_dalle_2", async ctx => {
  await ctx.answerCallbackQuery();
  await chatgptHandler.selectImageModel(ctx, "dall-e-2");
});

// 🔄 УНИВЕРСАЛЬНЫЕ КНОПКИ УПРАВЛЕНИЯ
bot.callbackQuery("action_start", async ctx => {
  await ctx.answerCallbackQuery("▶️ Запуск...");
});

bot.callbackQuery("action_stop", async ctx => {
  await ctx.answerCallbackQuery("⏹️ Остановка...");
});

bot.callbackQuery("action_repeat", async ctx => {
  await ctx.answerCallbackQuery("🔄 Повтор...");
});

bot.callbackQuery("action_status", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "📊 Статус системы\n\n✅ ChatGPT - Активен\n⚠️ Midjourney - Настройка\n⚠️ Kling - Настройка\n✅ Freepik - Активен\n⚠️ Runway - Требует подписки",
    { reply_markup: backToMainMenu }
  );
});

// 🔙 НАВИГАЦИЯ
bot.callbackQuery("back_to_start", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "🤖 AI Creative Bot\n\nВыберите AI сервис для работы:",
    { reply_markup: startMenu }
  );
});

bot.callbackQuery("back_to_ai_selection", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "🤖 Выберите AI сервис:",
    { reply_markup: startMenu }
  );
});

// 🎨 MIDJOURNEY HANDLERS
// Главное меню
bot.callbackQuery("midjourney_back_to_main", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showMainMenu(ctx);
});

// Генерация изображений
bot.callbackQuery("midjourney_generate", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showGenerateMenu(ctx);
});

bot.callbackQuery("midjourney_quick_gen", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showQuickGenMenu(ctx);
});

bot.callbackQuery("midjourney_configure", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showConfigureMenu(ctx);
});

bot.callbackQuery("midjourney_start_generation", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.startGenerationSession(ctx);
});

// Настройки
bot.callbackQuery("midjourney_settings", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showSettingsMenu(ctx);
});

bot.callbackQuery("midjourney_select_model", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showModelsMenu(ctx);
});

bot.callbackQuery("midjourney_select_style", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showStylesMenu(ctx);
});

bot.callbackQuery("midjourney_select_ratio", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showAspectRatiosMenu(ctx);
});

bot.callbackQuery("midjourney_select_quality", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showQualityMenu(ctx);
});

// Выбор моделей
bot.callbackQuery("midjourney_model_7.0", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectModel(ctx, "7.0");
});

bot.callbackQuery("midjourney_model_6.1", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectModel(ctx, "6.1");
});

bot.callbackQuery("midjourney_model_6.0", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectModel(ctx, "6.0");
});

bot.callbackQuery("midjourney_model_5.2", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectModel(ctx, "5.2");
});

bot.callbackQuery("midjourney_model_5.1", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectModel(ctx, "5.1");
});

bot.callbackQuery("midjourney_model_5.0", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectModel(ctx, "5.0");
});

// Выбор стилей
bot.callbackQuery("midjourney_style_photorealistic", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectStyle(ctx, "photorealistic");
});

bot.callbackQuery("midjourney_style_artistic", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectStyle(ctx, "artistic");
});

bot.callbackQuery("midjourney_style_anime", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectStyle(ctx, "anime");
});

bot.callbackQuery("midjourney_style_cartoon", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectStyle(ctx, "cartoon");
});

// Выбор соотношений сторон
bot.callbackQuery("midjourney_ratio_1:1", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectAspectRatio(ctx, "1:1");
});

bot.callbackQuery("midjourney_ratio_16:9", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectAspectRatio(ctx, "16:9");
});

bot.callbackQuery("midjourney_ratio_9:16", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectAspectRatio(ctx, "9:16");
});

bot.callbackQuery("midjourney_ratio_4:3", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectAspectRatio(ctx, "4:3");
});

bot.callbackQuery("midjourney_ratio_3:4", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectAspectRatio(ctx, "3:4");
});

// Выбор качества
bot.callbackQuery("midjourney_quality_low", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectQuality(ctx, "low");
});

bot.callbackQuery("midjourney_quality_medium", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectQuality(ctx, "medium");
});

bot.callbackQuery("midjourney_quality_high", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.selectQuality(ctx, "high");
});

// История
bot.callbackQuery("midjourney_history", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showHistoryMenu(ctx);
});

bot.callbackQuery("midjourney_history_10", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showHistory(ctx, 10);
});

bot.callbackQuery("midjourney_history_25", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showHistory(ctx, 25);
});

bot.callbackQuery("midjourney_history_50", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showHistory(ctx, 50);
});

// Помощь
bot.callbackQuery("midjourney_help", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showHelpMenu(ctx);
});

bot.callbackQuery("midjourney_help_usage", async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "📖 **Как использовать Midjourney**\n\n" +
    "1️⃣ **Выберите модель** - версию Midjourney\n" +
    "2️⃣ **Настройте параметры** - стиль, соотношение, качество\n" +
    "3️⃣ **Введите описание** - что хотите создать\n" +
    "4️⃣ **Получите результат** - готовое изображение\n\n" +
    "💡 **Советы:**\n" +
    "• Используйте детальные описания\n" +
    "• Добавляйте стилистические указания\n" +
    "• Экспериментируйте с разными стилями",
    { parse_mode: 'Markdown' }
  );
});

bot.callbackQuery("midjourney_help_examples", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showExamplesMenu(ctx);
});

bot.callbackQuery("midjourney_help_pricing", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showPricingMenu(ctx);
});

// Примеры промптов
bot.callbackQuery("midjourney_examples_portraits", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showPromptExamples(ctx, "portraits");
});

bot.callbackQuery("midjourney_examples_landscapes", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showPromptExamples(ctx, "landscapes");
});

bot.callbackQuery("midjourney_examples_architecture", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showPromptExamples(ctx, "architecture");
});

bot.callbackQuery("midjourney_examples_art", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showPromptExamples(ctx, "art");
});

bot.callbackQuery("midjourney_examples_scifi", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showPromptExamples(ctx, "scifi");
});

bot.callbackQuery("midjourney_examples_fantasy", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showPromptExamples(ctx, "fantasy");
});

// Навигация
bot.callbackQuery("midjourney_back_to_settings", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showSettingsMenu(ctx);
});

bot.callbackQuery("midjourney_back_to_generate", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showGenerateMenu(ctx);
});

bot.callbackQuery("midjourney_back_to_help", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showHelpMenu(ctx);
});

bot.callbackQuery("midjourney_back_to_examples", async ctx => {
  await ctx.answerCallbackQuery();
  await midjourneyHandler.showExamplesMenu(ctx);
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

// Cleanup inactive sessions every 30 minutes
setInterval(() => {
  aiHandler.cleanupSessions();
}, 30 * 60 * 1000);

// Error handling
bot.catch(err => {
  logger.error("Bot error:", err);
});

// Start bot function
export async function startBot() {
  try {
    // Start bot (database already connected in index.ts)
    await bot.start();
    logger.info("Telegram bot started successfully");
  } catch (error) {
    logger.error("Failed to start bot:", error);
    throw error;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down bot...");
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down bot...");
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});

// startBot is called from index.ts

export { bot };
