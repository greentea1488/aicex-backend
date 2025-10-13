import { Bot } from "grammy";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prismaClient";
import { AIServiceManager } from "../services/ai/AIServiceManager";
import { ChatMessage } from "../services/ai/OpenAIService";
import { FREEPIK_IMAGE_MODELS, FREEPIK_VIDEO_MODELS, getPopularImageModels, getPopularVideoModels, getImageModelById, getVideoModelById } from "../services/ai/FreepikModels";
import { UXHelpers } from "./utils/UXHelpers";
import { StateManager } from "./utils/StateManager";
import { TaskQueue } from "./utils/TaskQueue";
import { MidjourneyAPIService } from "../services/MidjourneyAPIService";
import { ReferralService } from "../services/ReferralService";
import { UserService } from "../services/UserService";
import axios from "axios";

const bot = new Bot(process.env.BOT_TOKEN!);
const aiManager = new AIServiceManager();
const stateManager = new StateManager();
const taskQueue = new TaskQueue(stateManager);
const midjourneyService = new MidjourneyAPIService();

console.log("🤖 Starting AICEX Production Bot with enhanced UX...");

// 🎯 НАСТРОЙКА КОМАНД БОТА (Slash Commands Menu)
async function setupBotCommands() {
  try {
    // Список команд для всех языков (билингвальный)
    const commands = [
      { command: "start", description: "🚀 Start / Начать" },
      { command: "menu", description: "📋 Main menu / Главное меню" },
      { command: "image", description: "🎨 Generate image / Генерация изображения" },
      { command: "video", description: "🎬 Generate video / Генерация видео" },
      { command: "chat", description: "💬 AI Chat / Диалог с ИИ" },
      { command: "help", description: "❓ Help / Помощь" },
    ];

    // 1) По умолчанию (все чаты)
    await bot.api.setMyCommands(commands);

    // 2) Только приватные чаты
    await bot.api.setMyCommands(commands, {
      scope: { type: "all_private_chats" },
    });

    // 3) Русская локализация
    await bot.api.setMyCommands([
      { command: "start", description: "🚀 Начать работу с ботом" },
      { command: "menu", description: "📋 Главное меню" },
      { command: "image", description: "🎨 Генерация изображения" },
      { command: "video", description: "🎬 Генерация видео" },
      { command: "chat", description: "💬 Диалог с ИИ" },
      { command: "help", description: "❓ Помощь и информация" },
    ], {
      language_code: "ru",
    });

    // 4) Английская локализация
    await bot.api.setMyCommands([
      { command: "start", description: "🚀 Start the bot" },
      { command: "menu", description: "📋 Main menu" },
      { command: "image", description: "🎨 Generate image" },
      { command: "video", description: "🎬 Generate video" },
      { command: "chat", description: "💬 AI Chat" },
      { command: "help", description: "❓ Help and info" },
    ], {
      language_code: "en",
    });

    // Показать кнопку "Меню" с командами в чате
    await bot.api.setChatMenuButton({
      menu_button: { type: "commands" },
    });

    console.log("✅ Bot commands menu configured successfully");
  } catch (error) {
    console.error("❌ Failed to setup bot commands:", error);
  }
}

// 🎯 УЛУЧШЕННОЕ ГЛАВНОЕ МЕНЮ с быстрыми действиями
function getMainMenu(userId?: number) {
  return UXHelpers.getSmartMainMenu(userId);
}

// 🎨 МЕНЮ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
const imageMenu = {
  inline_keyboard: [
    [
      { text: '🎨 Freepik AI', callback_data: 'image_freepik' },
      { text: '🖼️ Midjourney', callback_data: 'image_midjourney' }
    ],
    [
      { text: '⬅️ Назад', callback_data: 'back_to_main' }
    ]
  ]
};

// 🎬 МЕНЮ ГЕНЕРАЦИИ ВИДЕО  
const videoMenu = {
  inline_keyboard: [
    [
      { text: '🎬 Freepik Video', callback_data: 'video_freepik' }
    ],
    [
      { text: '⚡ Kling AI', callback_data: 'video_kling' },
      { text: '🚀 Runway ML', callback_data: 'video_runway' }
    ],
    [
      { text: '⬅️ Назад', callback_data: 'back_to_main' }
    ]
  ]
};

// 💬 МЕНЮ ЧАТА
const chatMenu = {
  inline_keyboard: [
    [
      { text: '🧠 ChatGPT-4', callback_data: 'chat_gpt4' }
    ],
    [
      { text: '⬅️ Назад', callback_data: 'back_to_main' }
    ]
  ]
};

// 🎨 МЕНЮ МОДЕЛЕЙ FREEPIK - ПОПУЛЯРНЫЕ
function getFreepikImageModelsMenu() {
  const popularModels = getPopularImageModels();
  
  return {
    inline_keyboard: [
      [
        { text: '🔥 Популярные', callback_data: 'freepik_popular_images' },
        { text: '📋 Все модели', callback_data: 'freepik_all_images' }
      ],
      ...popularModels.slice(0, 4).map(model => ([
        { 
          text: `${model.isNew ? '🆕 ' : ''}${model.name}`, 
          callback_data: `freepik_img_${model.id}` 
        }
      ])),
      [
        { text: '⬅️ Назад', callback_data: 'generate_image' }
      ]
    ]
  };
}

// 🎬 МЕНЮ МОДЕЛЕЙ FREEPIK - ВИДЕО (БЕЗ KLING)
function getFreepikVideoModelsMenu() {
  // Исключаем Kling модели из Freepik меню
  const nonKlingModels = FREEPIK_VIDEO_MODELS.filter(m => !m.id.includes('kling'));
  
  return {
    inline_keyboard: [
      [
        { text: '🔥 Популярные', callback_data: 'freepik_popular_videos' },
        { text: '📋 Все модели', callback_data: 'freepik_all_videos' }
      ],
      ...nonKlingModels.slice(0, 4).map(model => ([
        { 
          text: `${model.isNew ? '🆕 ' : ''}${model.name}${model.resolution ? ` (${model.resolution})` : ''}`, 
          callback_data: `freepik_vid_${model.id}` 
        }
      ])),
      [
        { text: '⬅️ Назад', callback_data: 'generate_video' }
      ]
    ]
  };
}

// ⚡ МЕНЮ KLING МОДЕЛЕЙ (используют Freepik API)
function getKlingModelsMenu() {
  // Только Kling модели
  const klingModels = FREEPIK_VIDEO_MODELS.filter(m => m.id.includes('kling'));
  
  return {
    inline_keyboard: [
      [
        { text: '🔥 Популярные Kling', callback_data: 'kling_popular' },
        { text: '📋 Все Kling модели', callback_data: 'kling_all' }
      ],
      ...klingModels.slice(0, 4).map(model => ([
        { 
          text: `${model.isNew ? '🆕 ' : ''}${model.name}`, 
          callback_data: `freepik_vid_${model.id}` // Используем тот же callback, т.к. API один
        }
      ])),
      [
        { text: '⬅️ Назад', callback_data: 'generate_video' }
      ]
    ]
  };
}

// 📋 ВСЕ МОДЕЛИ ИЗОБРАЖЕНИЙ
function getAllImageModelsMenu(page: number = 0) {
  const modelsPerPage = 6;
  const startIndex = page * modelsPerPage;
  const models = FREEPIK_IMAGE_MODELS.slice(startIndex, startIndex + modelsPerPage);
  
  const keyboard = models.map(model => ([
    { 
      text: `${model.isNew ? '🆕 ' : ''}${model.name}`, 
      callback_data: `freepik_img_${model.id}` 
    }
  ]));
  
  // Навигация по страницам
  const navButtons: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) {
    navButtons.push({ text: '⬅️ Пред.', callback_data: `freepik_img_page_${page - 1}` });
  }
  if (startIndex + modelsPerPage < FREEPIK_IMAGE_MODELS.length) {
    navButtons.push({ text: 'След. ➡️', callback_data: `freepik_img_page_${page + 1}` });
  }
  
  if (navButtons.length > 0) {
    keyboard.push(navButtons);
  }
  
  keyboard.push([{ text: '⬅️ К популярным', callback_data: 'image_freepik' }]);
  
  return { inline_keyboard: keyboard };
}

// 📋 ВСЕ МОДЕЛИ ВИДЕО (БЕЗ KLING)
function getAllVideoModelsMenu(page: number = 0) {
  const modelsPerPage = 6;
  const startIndex = page * modelsPerPage;
  // Исключаем Kling модели
  const nonKlingModels = FREEPIK_VIDEO_MODELS.filter(m => !m.id.includes('kling'));
  const models = nonKlingModels.slice(startIndex, startIndex + modelsPerPage);
  
  const keyboard = models.map(model => ([
    { 
      text: `${model.isNew ? '🆕 ' : ''}${model.name}${model.resolution ? ` (${model.resolution})` : ''}`, 
      callback_data: `freepik_vid_${model.id}` 
    }
  ]));
  
  // Навигация по страницам
  const navButtons: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) {
    navButtons.push({ text: '⬅️ Пред.', callback_data: `freepik_vid_page_${page - 1}` });
  }
  if (startIndex + modelsPerPage < nonKlingModels.length) {
    navButtons.push({ text: 'След. ➡️', callback_data: `freepik_vid_page_${page + 1}` });
  }
  
  if (navButtons.length > 0) {
    keyboard.push(navButtons);
  }
  
  keyboard.push([{ text: '⬅️ К популярным', callback_data: 'video_freepik' }]);
  
  return { inline_keyboard: keyboard };
}

// 📋 ВСЕ МОДЕЛИ KLING
function getAllKlingModelsMenu(page: number = 0) {
  const modelsPerPage = 6;
  const startIndex = page * modelsPerPage;
  const klingModels = FREEPIK_VIDEO_MODELS.filter(m => m.id.includes('kling'));
  const models = klingModels.slice(startIndex, startIndex + modelsPerPage);
  
  const keyboard = models.map(model => ([
    { 
      text: `${model.isNew ? '🆕 ' : ''}${model.name}`, 
      callback_data: `freepik_vid_${model.id}` 
    }
  ]));
  
  // Навигация по страницам
  const navButtons: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) {
    navButtons.push({ text: '⬅️ Пред.', callback_data: `kling_page_${page - 1}` });
  }
  if (startIndex + modelsPerPage < klingModels.length) {
    navButtons.push({ text: 'След. ➡️', callback_data: `kling_page_${page + 1}` });
  }
  
  if (navButtons.length > 0) {
    keyboard.push(navButtons);
  }
  
  keyboard.push([{ text: '⬅️ К популярным', callback_data: 'video_kling' }]);
  
  return { inline_keyboard: keyboard };
}

// 🧭 Универсальная функция для создания кнопок навигации
function getNavigationButtons(backCallback?: string, includeHome: boolean = true) {
  const buttons: any[] = [];
  
  if (backCallback) {
    buttons.push([{ text: '⬅️ Назад', callback_data: backCallback }]);
  }
  
  if (includeHome) {
    buttons.push([{ text: '🏠 Главная', callback_data: 'back_to_main' }]);
  }
  
  return buttons;
}

// 🚀 УЛУЧШЕННАЯ КОМАНДА /start
bot.command("start", async (ctx) => {
  console.log("📨 /start from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Извлекаем реферальный код из параметров команды
    const startPayload = ctx.match; // Текст после /start
    let referrerTelegramId: number | null = null;

    if (startPayload && typeof startPayload === 'string') {
      const refMatch = startPayload.match(/^ref_(\d+)$/);
      if (refMatch) {
        referrerTelegramId = parseInt(refMatch[1]);
        console.log(`🔗 Referral detected: ${referrerTelegramId}`);
      }
    }

    // Проверяем, существует ли пользователь
    let existingUser = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    const isNewUser = !existingUser;

    // Создаем или обновляем пользователя через UserService
    const user = await UserService.findOrCreateUser({
      id: userId,
      first_name: ctx.from?.first_name || '',
      last_name: ctx.from?.last_name,
      username: ctx.from?.username
    });

    // Если новый пользователь и есть реферальный код
    if (isNewUser && referrerTelegramId && user.id) {
      const result = await ReferralService.processReferral(
        user.id,
        userId,
        referrerTelegramId
      );

      if (result.success) {
        // Отправляем уведомление новому пользователю
        await ctx.reply(
          `🎁 <b>Вы зарегистрировались по реферальной ссылке!</b>\n💰 Вам начислено +${result.refereeBonus} токенов бонусом`,
          { parse_mode: 'HTML' }
        );

        // Получаем обновленного пользователя с новым балансом
        const updatedUser = await prisma.user.findUnique({
          where: { telegramId: userId },
          select: { friendsReferred: true }
        });

        // Отправляем уведомление пригласившему
        try {
          await ctx.api.sendMessage(
            referrerTelegramId,
            `🎉 <b>Ваш друг присоединился к AICEX One!</b>\n\n💰 Вам начислено +${result.referrerBonus} токенов\n👥 Всего приглашено: ${(updatedUser?.friendsReferred || 0) + 1} друзей`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('Failed to notify referrer:', e);
        }
      }
    }

    // Получаем рекомендации для пользователя
    const recommendations = await UXHelpers.getUserRecommendations(userId);
    const stats = await UXHelpers.getUserStats(userId);

    let welcomeMessage = `🎉 <b>Добро пожаловать в AICEX AI!</b>\n\n`;
    
    if (stats && stats.totalGenerations > 0) {
      welcomeMessage += `👋 С возвращением! У вас ${stats.totalGenerations} генераций\n`;
      welcomeMessage += `💰 Токенов: ${stats.currentBalance}\n\n`;
    } else {
      welcomeMessage += `🎁 <b>Стартовый бонус:</b> 100 токенов\n`;
      welcomeMessage += `🚀 <b>30+ AI моделей</b> в одном боте\n\n`;
    }

    welcomeMessage += `🎯 <b>Быстрый старт:</b>\n`;
    welcomeMessage += `• 🎨 Быстрое изображение - мгновенная генерация\n`;
    welcomeMessage += `• 💬 AI Чат - общение с ChatGPT-4\n`;
    welcomeMessage += `• 🎬 Видео - создание видео из текста\n\n`;

    if (recommendations.length > 0) {
      welcomeMessage += `💡 <b>Рекомендации:</b>\n`;
      recommendations.forEach(rec => {
        welcomeMessage += `• ${rec.message}\n`;
      });
      welcomeMessage += `\n`;
    }

    welcomeMessage += `Выберите действие:`;

    await ctx.reply(welcomeMessage, {
      reply_markup: getMainMenu(userId),
      parse_mode: "HTML"
    });

    // Устанавливаем начальное состояние
    UXHelpers.setUserState(userId, {
      currentPath: ['main'],
      currentAction: null
    });

    console.log("✅ Enhanced welcome sent to user:", userId);

  } catch (error) {
    console.error("❌ Start error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// 📋 КОМАНДА /menu - Главное меню
bot.command("menu", async (ctx) => {
  console.log("📨 /menu from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply(
      "📋 <b>Главное меню</b>\n\nВыберите действие:",
      {
        reply_markup: getMainMenu(userId),
        parse_mode: "HTML"
      }
    );
  } catch (error) {
    console.error("❌ Menu error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// 🎨 КОМАНДА /image - Генерация изображения
bot.command("image", async (ctx) => {
  console.log("📨 /image from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply(
      "🎨 <b>Генерация изображения</b>\n\nВыберите сервис:",
      {
        reply_markup: imageMenu,
        parse_mode: "HTML"
      }
    );
  } catch (error) {
    console.error("❌ Image error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// 🎬 КОМАНДА /video - Генерация видео
bot.command("video", async (ctx) => {
  console.log("📨 /video from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply(
      "🎬 <b>Генерация видео</b>\n\nВыберите сервис:",
      {
        reply_markup: videoMenu,
        parse_mode: "HTML"
      }
    );
  } catch (error) {
    console.error("❌ Video error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// 💬 КОМАНДА /chat - Диалог с ИИ
bot.command("chat", async (ctx) => {
  console.log("📨 /chat from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply(
      "💬 <b>Диалог с ИИ</b>\n\nВыберите модель:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "💬 ChatGPT-4", callback_data: "chat_gpt4" },
              { text: "🎓 ChatGPT-4 Mini", callback_data: "chat_gpt4_mini" }
            ],
            [
              { text: "🔍 GPT Vision", callback_data: "start_vision_chat" }
            ],
            ...getNavigationButtons()
          ]
        },
        parse_mode: "HTML"
      }
    );
  } catch (error) {
    console.error("❌ Chat error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// ❓ КОМАНДА /help - Помощь
bot.command("help", async (ctx) => {
  console.log("📨 /help from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await showHelp(ctx, userId);
  } catch (error) {
    console.error("❌ Help error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// 🔘 УЛУЧШЕННАЯ ОБРАБОТКА CALLBACK КНОПОК
bot.on("callback_query", async (ctx) => {
  console.log("🔘 Callback:", ctx.callbackQuery.data, "from:", ctx.from?.id);
  
  await ctx.answerCallbackQuery();
  
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  
  if (!userId) return;
  
  // Получаем текущее состояние пользователя
  const userState = UXHelpers.getUserState(userId);
  const breadcrumb = UXHelpers.getBreadcrumb(userState?.currentPath || ['main']);
  
  try {
  // Обработка выбора конкретной модели для видео из фото
  if (data.startsWith('freepik_vid_')) {
    const modelId = data.replace('freepik_vid_', '');
    UXHelpers.setUserState(userId, {
      currentAction: 'waiting_for_photo_video',
      data: { service: 'freepik', model: modelId }
    });
    await ctx.editMessageText(
      `🎬 <b>${getVideoModelName(modelId)}</b>\n\n📸 Отправьте фото для создания видео:\n\n💡 <i>Модель автоматически создаст видео на основе вашего изображения</i>`,
      {
        reply_markup: {
          inline_keyboard: [
            ...getNavigationButtons('photo_to_video_menu')
          ]
        },
        parse_mode: "HTML"
      }
    );
    return;
  }

  switch (data) {
      // 🎯 НОВЫЕ БЫСТРЫЕ ДЕЙСТВИЯ
      case 'quick_image':
        await handleQuickImage(ctx, userId);
        break;
        
      case 'quick_chat':
        await handleQuickChat(ctx, userId);
        break;
        
      case 'midjourney_menu':
        await handleMidjourneyMenu(ctx, userId);
        break;
        
      case 'stats':
        await handleStats(ctx, userId);
        break;
        
      case 'back_to_main':
        await handleBackToMain(ctx, userId);
        break;
        
      case 'stop_action':
        await handleStopAction(ctx, userId);
        break;
        
      case 'retry_last_action':
        await handleRetryLastAction(ctx, userId);
        break;
        
      case 'cancel_retry':
        await handleCancelRetry(ctx, userId);
        break;

      // 🖼️ MIDJOURNEY ОБРАБОТЧИКИ
      case 'midjourney_7.0':
        await handleMidjourneyGeneration(ctx, userId, '7.0');
        break;
        
      case 'midjourney_6.1':
        await handleMidjourneyGeneration(ctx, userId, '6.1');
        break;
        
      case 'midjourney_quick':
        await handleMidjourneyQuick(ctx, userId);
        break;

    // 🔄 РЕГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ (кнопка "Еще одно")
    case (data.startsWith('regenerate_image_') ? data : null): {
      console.log(`🔄 REGENERATE CALLBACK: ${data} from user ${userId}`);
      const [, , service, model] = data.split('_');
      console.log(`🔍 Parsed: service=${service}, model=${model}`);
      
      const userState = UXHelpers.getUserState(userId);
      console.log(`🔍 User state for ${userId}:`, JSON.stringify(userState, null, 2));
      
      if (userState?.data?.lastPrompt) {
        console.log(`✅ Found saved prompt: "${userState.data.lastPrompt}"`);
        
        // Устанавливаем состояние ожидания промпта с предзаполненным текстом
        UXHelpers.setUserState(userId, {
          currentAction: 'waiting_image_prompt',
          data: { 
            service: service,
            model: model,
            prefilledPrompt: userState.data.lastPrompt
          }
        });
        
        // Показываем меню с предзаполненным промптом
        await UXHelpers.safeEditMessage(ctx,
          `🎨 <b>Генерация изображения</b>\n\n` +
          `📝 Промпт: "${userState.data.lastPrompt}"\n\n` +
          `Выберите модель или измените промпт:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔥 Seedream v3 (быстро)', callback_data: 'freepik_img_seedream' },
                  { text: '⚡ Flux Pro (качество)', callback_data: 'freepik_img_flux-pro' }
                ],
                [
                  { text: '🎭 Mystic', callback_data: 'freepik_img_mystic' },
                  { text: '🏃 Classic Fast', callback_data: 'freepik_img_classic-fast' }
                ],
                [
                  { text: '📋 Все модели', callback_data: 'image_freepik' },
                  { text: '⬅️ Назад', callback_data: 'generate_image' }
                ]
              ]
            },
            parse_mode: "HTML"
          }
        );
      } else {
        console.log(`❌ No saved prompt found for user ${userId}`);
        await UXHelpers.safeEditMessage(ctx,
          "❌ Не удалось найти предыдущий промпт. Выберите действие:",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎨 Генерация изображений', callback_data: 'generate_image' }],
                [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
              ]
            },
            parse_mode: "HTML"
          }
        );
      }
      break;
    }

    // 🔄 ПОВТОРНАЯ ГЕНЕРАЦИЯ (кнопка "Попробовать снова")
    case (data.startsWith('retry_generation_') ? data : null): {
      const [, , , retryService, retryModel, retryTaskType] = data.split('_');
      const retryUserState = UXHelpers.getUserState(userId);
      
      if (retryUserState?.data?.lastPrompt) {
        logger.info(`🔄 Retrying generation with saved prompt: "${retryUserState.data.lastPrompt}"`);
        
        if (retryTaskType === 'video') {
          await handleVideoGeneration(ctx, retryUserState.data.lastPrompt, retryService, { model: retryModel });
        } else {
          await handleImageGeneration(ctx, retryUserState.data.lastPrompt, retryService, { model: retryModel });
        }
      } else {
        await UXHelpers.safeEditMessage(ctx,
          "❌ Не удалось найти предыдущий промпт. Выберите действие:",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎨 Генерация изображений', callback_data: 'generate_image' }],
                [{ text: '🎬 Генерация видео', callback_data: 'generate_video' }],
                [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
              ]
            },
            parse_mode: "HTML"
          }
        );
      }
      break;
    }

    // 🎨 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ
    case 'generate_image':
      await ctx.editMessageText(
        "🎨 <b>Генерация изображений</b>\n\nВыберите нейросеть:",
        { 
          reply_markup: {
            inline_keyboard: [
              ...imageMenu.inline_keyboard,
              ...getNavigationButtons()
            ]
          },
          parse_mode: "HTML" 
        }
      );
      break;

    case 'image_freepik':
      const freepikImageMenu = getFreepikImageModelsMenu();
      await ctx.editMessageText(
        "🎨 <b>Freepik AI</b>\n\nВыберите модель для генерации:",
        { 
          reply_markup: {
            inline_keyboard: [
              ...freepikImageMenu.inline_keyboard,
              ...getNavigationButtons()
            ]
          },
          parse_mode: "HTML" 
        }
      );
      break;

    case 'freepik_all_images':
      await ctx.editMessageText(
        "📋 <b>Все модели изображений Freepik</b>\n\nВыберите модель:",
        { reply_markup: getAllImageModelsMenu(0), parse_mode: "HTML" }
      );
      break;


    case 'image_midjourney':
      await ctx.editMessageText(
        "🖼️ <b>Midjourney</b>\n\n🚧 Скоро будет доступен!\n\nПока используйте Freepik AI.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'generate_image' }]
            ]
          },
          parse_mode: "HTML"
        }
      );
      break;

    // 🎬 ГЕНЕРАЦИЯ ВИДЕО
    case 'generate_video':
      await UXHelpers.safeEditMessage(
        ctx,
        "🎬 <b>Генерация видео</b>\n\nВыберите нейросеть:",
        { 
          reply_markup: {
            inline_keyboard: [
              ...videoMenu.inline_keyboard,
              ...getNavigationButtons()
            ]
          },
          parse_mode: "HTML" 
        }
      );
      break;

    case 'video_freepik':
      const freepikVideoMenu = getFreepikVideoModelsMenu();
      await ctx.editMessageText(
        "🎬 <b>Freepik Video</b>\n\nВыберите модель для генерации:",
        { 
          reply_markup: {
            inline_keyboard: [
              ...freepikVideoMenu.inline_keyboard,
              ...getNavigationButtons()
            ]
          },
          parse_mode: "HTML" 
        }
      );
      break;

    case 'video_kling':
      const klingMenu = getKlingModelsMenu();
      await ctx.editMessageText(
        "⚡ <b>Kling AI Video</b>\n\nВыберите модель Kling для генерации видео:\n\n💡 Используется Freepik API",
        { 
          reply_markup: {
            inline_keyboard: [
              ...klingMenu.inline_keyboard,
              ...getNavigationButtons()
            ]
          },
          parse_mode: "HTML" 
        }
      );
      break;

    case 'kling_all':
      await ctx.editMessageText(
        "📋 <b>Все модели Kling AI</b>\n\nВыберите модель:",
        { reply_markup: getAllKlingModelsMenu(0), parse_mode: "HTML" }
      );
      break;

    case 'freepik_all_videos':
      await ctx.editMessageText(
        "📋 <b>Все модели видео Freepik</b>\n\nВыберите модель:",
        { reply_markup: getAllVideoModelsMenu(0), parse_mode: "HTML" }
      );
      break;

    case 'video_runway':
      // Runway ML работает только в режиме Image-to-Video (требует обязательно изображение)
      UXHelpers.setUserState(userId, {
        currentAction: 'waiting_runway_photo',
        data: { service: 'runway' }
      });
      await ctx.editMessageText(
        "🚀 <b>Runway ML - Image to Video</b>\n\n" +
        "📸 <b>Шаг 1:</b> Отправьте изображение для генерации видео\n\n" +
        "💡 После отправки фото вы сможете добавить текстовый промпт для управления видео",
        {
          reply_markup: {
            inline_keyboard: [
              ...getNavigationButtons('generate_video')
            ]
          },
          parse_mode: "HTML"
        }
      );
      break;

    // 🎬 ГЕНЕРАЦИЯ ВИДЕО ИЗ ФОТО
    case 'photo_to_video_menu':
      const photoVideoMenu = getFreepikVideoModelsMenu();
      await ctx.editMessageText(
        "🎬 <b>Создание видео из фото</b>\n\nВыберите модель для генерации:",
        { 
          reply_markup: {
            inline_keyboard: [
              ...photoVideoMenu.inline_keyboard,
              ...getNavigationButtons()
            ]
          },
          parse_mode: "HTML" 
        }
      );
      break;


    // 💬 AI ЧАТ
    case 'chat_ai':
      await ctx.editMessageText(
        "💬 <b>AI Чат</b>\n\nВыберите модель:",
        { 
          reply_markup: {
            inline_keyboard: [
              ...chatMenu.inline_keyboard,
              ...getNavigationButtons()
            ]
          },
          parse_mode: "HTML" 
        }
      );
      break;

    case 'chat_gpt4':
      logger.info(`🧠 ChatGPT-4 smart chat started for user ${userId}`);
      UXHelpers.setUserState(userId, {
        currentAction: 'chatting',
        data: { 
          service: 'gpt4', 
          chatHistory: [],
          fileContext: null 
        }
      });
      await UXHelpers.safeEditMessage(
        ctx,
        "🧠 <b>ChatGPT-4 Умный Чат</b>\n\n" +
        "💬 Можете:\n" +
        "• Задавать любые вопросы\n" +
        "• Отправлять документы для анализа\n" +
        "• Записывать голосовые (будут транскрибированы)\n" +
        "• Отправлять изображения для анализа\n\n" +
        "✨ Контекст диалога всегда сохраняется!\n\n" +
        "🛑 Напишите \"стоп\" для завершения.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'chat_ai' }]
            ]
          },
          parse_mode: "HTML"
        }
      );
      break;

    // Выполнить чат с сохраненным промптом (fix BUTTON_DATA_INVALID)
    case 'quick_chat_gpt4_execute':
      const state = UXHelpers.getUserState(userId);
      if (state?.data?.pendingPrompt) {
        logger.info(`🧠 Executing quick chat with saved prompt for user ${userId}`);
        const prompt = state.data.pendingPrompt;
        
        // Запускаем чат с этим промптом
        UXHelpers.setUserState(userId, {
          currentAction: 'chatting',
          data: { service: 'gpt4', chatHistory: [] }
        });
        
        await UXHelpers.safeEditMessage(ctx,
          "🧠 <b>ChatGPT-4</b>\n\n💬 Обрабатываю ваш запрос...",
          { parse_mode: "HTML" }
        );
        
        await handleChatGPT(ctx, prompt);
      }
      break;

    // 📄 АНАЛИЗ ДОКУМЕНТОВ
    case 'chatgpt_analyze_document':
      logger.info(`📄 Document analysis callback for user ${userId}`);
      UXHelpers.setUserState(userId, {
        currentAction: 'chatgpt_document_analysis',
        currentPath: ['quick_chat', 'document'],
        data: { service: 'chatgpt' }
      });
      await UXHelpers.safeEditMessage(
        ctx,
        "📄 <b>Анализ документов</b>\n\n" +
        "Отправьте мне документ (TXT, JSON, CSV, MD и др.) и я проанализирую его.\n\n" +
        "💡 Можете добавить подпись к файлу с вопросом.\n\n" +
        "📋 Поддерживаемые форматы: TXT, JSON, CSV, Markdown, HTML, XML",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'quick_chat' }]
            ]
          },
          parse_mode: "HTML"
        }
      );
      logger.info(`✅ Document analysis session created for user ${userId}`);
      break;

    // 🎤 ТРАНСКРИПЦИЯ АУДИО
    case 'chatgpt_transcribe_audio':
      logger.info(`🎤 Audio transcription callback for user ${userId}`);
      UXHelpers.setUserState(userId, {
        currentAction: 'chatgpt_audio_transcription',
        currentPath: ['quick_chat', 'audio'],
        data: { service: 'chatgpt' }
      });
      await UXHelpers.safeEditMessage(
        ctx,
        "🎤 <b>Транскрипция аудио</b>\n\n" +
        "Отправьте голосовое сообщение или аудио файл, и я преобразую его в текст через Whisper API.\n\n" +
        "💡 Поддерживаемые форматы: MP3, WAV, OGG, M4A, OPUS\n" +
        "📏 Максимальный размер: 25 МБ",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'quick_chat' }]
            ]
          },
          parse_mode: "HTML"
        }
      );
      logger.info(`✅ Audio transcription session created for user ${userId}`);
      break;

    // 🔙 НАВИГАЦИЯ
    case 'back_to_main':
      await handleBackToMain(ctx, userId);
      break;

    // 📋 МОИ ЗАДАЧИ
    case 'my_tasks':
      await handleMyTasks(ctx, userId);
      break;

    default:
      // 🎨 ОБРАБОТКА БЫСТРЫХ ДЕЙСТВИЙ С ТЕКСТОМ
      if (data?.startsWith('quick_img_')) {
        const prompt = data.replace('quick_img_', '');
        UXHelpers.setUserState(userId, {
          currentAction: 'waiting_image_prompt',
          data: { service: 'freepik', model: 'seedream' }
        });
        await handleImageGeneration(ctx, prompt, 'freepik', { model: 'seedream' });
        break;
      }
      
      if (data?.startsWith('quality_img_')) {
        const prompt = data.replace('quality_img_', '');
        UXHelpers.setUserState(userId, {
          currentAction: 'waiting_image_prompt',
          data: { service: 'freepik', model: 'flux-pro' }
        });
        await handleImageGeneration(ctx, prompt, 'freepik', { model: 'flux-pro' });
        break;
      }
      
      // 🎨 ОБРАБОТКА ВЫБОРА МОДЕЛЕЙ ИЗОБРАЖЕНИЙ
      if (data?.startsWith('freepik_img_')) {
        const modelId = data.replace('freepik_img_', '');
        const model = getImageModelById(modelId);
        
        if (model) {
          const userState = UXHelpers.getUserState(userId);
          const prefilledPrompt = userState?.data?.prefilledPrompt;
          
          // Используем UXHelpers для консистентности
          UXHelpers.setUserState(userId, { 
            currentAction: 'waiting_image_prompt', 
            data: { service: 'freepik', model: modelId, endpoint: model.endpoint } 
          });
          
          let messageText = `${model.isNew ? '🆕 ' : ''}<b>${model.name}</b>\n\n${model.description}\n\n`;
          
          if (prefilledPrompt) {
            messageText += `📝 <b>Предзаполненный промпт:</b> "${prefilledPrompt}"\n\n`;
            messageText += `✅ Для использования этого промпта просто отправьте любое сообщение\n`;
            messageText += `📝 Для изменения промпта отправьте новый текст:\n\n`;
          } else {
            messageText += `📝 Отправьте описание изображения:\n\n`;
          }
          
          messageText += `💡 Пример: "красивый закат над океаном"`;
          
          await ctx.editMessageText(messageText, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '⬅️ К моделям', callback_data: 'image_freepik' }]
              ]
            },
            parse_mode: "HTML"
          });
        }
      }
      // 🎬 ОБРАБОТКА ВЫБОРА МОДЕЛЕЙ ВИДЕО
      else if (data?.startsWith('freepik_vid_')) {
        const modelId = data.replace('freepik_vid_', '');
        const model = getVideoModelById(modelId);
        
        if (model) {
          UXHelpers.setUserState(userId, {
            currentAction: 'waiting_video_prompt',
            data: { service: 'freepik', model: modelId, endpoint: model.endpoint }
          });
          
          await ctx.editMessageText(
            `${model.isNew ? '🆕 ' : ''}<b>${model.name}</b>${model.resolution ? ` (${model.resolution})` : ''}\n\n${model.description}\n\n📝 Отправьте описание видео:\n\n💡 Пример: "кот играет с мячиком"`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '⬅️ К моделям', callback_data: 'video_freepik' }]
                ]
              },
              parse_mode: "HTML"
            }
          );
        }
      }
      // 📄 НАВИГАЦИЯ ПО СТРАНИЦАМ ИЗОБРАЖЕНИЙ
      else if (data?.startsWith('freepik_img_page_')) {
        const page = parseInt(data.replace('freepik_img_page_', ''));
        await ctx.editMessageText(
          "📋 <b>Все модели изображений Freepik</b>\n\nВыберите модель:",
          { reply_markup: getAllImageModelsMenu(page), parse_mode: "HTML" }
        );
      }
      // 📄 НАВИГАЦИЯ ПО СТРАНИЦАМ ВИДЕО
      else if (data?.startsWith('freepik_vid_page_')) {
        const page = parseInt(data.replace('freepik_vid_page_', ''));
        await ctx.editMessageText(
          "📋 <b>Все модели видео Freepik</b>\n\nВыберите модель:",
          { reply_markup: getAllVideoModelsMenu(page), parse_mode: "HTML" }
        );
      }
      // 📄 НАВИГАЦИЯ ПО СТРАНИЦАМ KLING
      else if (data?.startsWith('kling_page_')) {
        const page = parseInt(data.replace('kling_page_', ''));
        await ctx.editMessageText(
          "📋 <b>Все модели Kling AI</b>\n\nВыберите модель:",
          { reply_markup: getAllKlingModelsMenu(page), parse_mode: "HTML" }
        );
      }
      else {
        console.log("❓ Unknown callback:", data);
        await ctx.reply("❓ Неизвестная команда. Используйте /start для начала.");
      }
    }
  } catch (error) {
    console.error("❌ Callback error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// 📸 ОБРАБОТКА ФОТОГРАФИЙ
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  console.log("📸 Photo received from user:", userId);
  
  const userState = UXHelpers.getUserState(userId);
  
  if (userState?.currentAction === 'waiting_for_photo_video') {
    await handleVideoFromPhoto(ctx, userState.data?.service || 'freepik');
  } else if (userState?.currentAction === 'waiting_runway_photo') {
    // Runway ML - сохраняем фото и запрашиваем промпт
    await handleRunwayPhoto(ctx);
  } else if (userState?.currentAction === 'vision_chat') {
    await handleGPTVision(ctx);
  } else {
    // Предлагаем варианты использования фото
    await ctx.reply("📸 <b>Что хотите сделать с фото?</b>\n\nВыберите действие:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🎬 Создать видео", callback_data: "photo_to_video_menu" },
              { text: "🔍 Анализ GPT-4", callback_data: "start_vision_chat" }
            ],
            ...getNavigationButtons()
          ]
        },
        parse_mode: "HTML"
      }
    );
  }
});

// 📄 УМНАЯ ОБРАБОТКА ДОКУМЕНТОВ (работает в любом режиме чата)
bot.on("message:document", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  logger.info(`📄 Document received from user ${userId}`);
  
  const userState = UXHelpers.getUserState(userId);
  logger.info(`🔍 User state: ${userState ? userState.currentAction : 'none'}`);
  
  // Работает в режимах: chatting, chatting_with_file, chatgpt_document_analysis, или без сессии
  const allowedActions = ['chatting', 'chatting_with_file', 'chatgpt_document_analysis', 'waiting_chat_message'];
  const isInChatMode = userState && allowedActions.includes(userState.currentAction);
  
  if (isInChatMode || !userState) {
    logger.info(`✅ Processing document in smart chat mode...`);
    try {
      const document = ctx.message.document;
      const fileName = document.file_name || 'document';
      const fileSize = document.file_size || 0;
      
      logger.info(`📋 Document: name=${fileName}, size=${fileSize}, mime=${document.mime_type}`);
      
      // Проверка размера
      const maxSize = 20 * 1024 * 1024;
      if (fileSize > maxSize) {
        logger.warn(`❌ Document too large: ${fileSize}`);
        await ctx.reply("❌ Файл слишком большой. Максимум: 20 МБ");
        return;
      }

      await ctx.reply("📄 Анализирую документ...");

      // Скачиваем
      const { FileHandler } = await import("../utils/fileHandler");
      const fileHandler = new FileHandler();
      const { filePath } = await fileHandler.downloadFile(document.file_id);
      logger.info(`✅ Downloaded: ${filePath}`);

      try {
        // Извлекаем текст
        const fileContent = await fileHandler.extractText(filePath, document.mime_type);
        logger.info(`✅ Extracted: ${fileContent.length} chars`);
        
        const maxContentLength = 15000;
        const truncatedContent = fileContent.length > maxContentLength 
          ? fileContent.substring(0, maxContentLength) + "\n\n[...обрезано...]"
          : fileContent;

        const userPrompt = ctx.message.caption || "Проанализируй этот документ и дай краткое резюме";
        
        // Получаем существующую историю или создаем новую
        const existingHistory = userState?.data?.chatHistory || [];
        
        // Создаем сообщения с контекстом файла
        const messages: ChatMessage[] = [
          {
            role: "system",
            content: `Ты - умный помощник с доступом к файлам. Отвечай на русском языке. ${existingHistory.length > 0 ? 'Продолжай диалог с учетом предыдущего контекста.' : ''}`
          },
          ...existingHistory,
          {
            role: "user",
            content: `Файл "${fileName}":\n\n${truncatedContent}\n\nВопрос: ${userPrompt}`
          }
        ];

        const user = await prisma.user.findUnique({ where: { telegramId: userId } });
        if (!user) {
          await ctx.reply("❌ Пользователь не найден");
          fileHandler.cleanupFile(filePath);
          return;
        }

        logger.info(`🤖 Calling ChatGPT with file context...`);
        const result = await aiManager.chatWithAI(messages, 'gpt4', {
          telegramId: userId,
          currentTokens: user.tokens
        });
        
        if (result.success && result.data?.content) {
          logger.info(`✅ Analysis completed: ${result.data.content.length} chars`);
          
          await ctx.reply(
            `📄 <b>Анализ "${fileName}":</b>\n\n${result.data.content}\n\n💬 Продолжайте задавать вопросы!`,
            { parse_mode: 'HTML' }
          );

          // 💡 СОХРАНЯЕМ КОНТЕКСТ В ИСТОРИИ ЧАТА
          const updatedHistory: ChatMessage[] = [
            ...existingHistory,
            {
              role: "user",
              content: `[Файл: ${fileName}] ${userPrompt}`
            },
            {
              role: "assistant",
              content: result.data.content
            }
          ];

          // Обновляем состояние с сохраненным контекстом
          UXHelpers.setUserState(userId, {
            currentAction: 'chatting',
            data: { 
              service: 'gpt4',
              chatHistory: updatedHistory,
              lastFileName: fileName,
              lastFileContent: truncatedContent.substring(0, 3000) // Сохраняем часть для контекста
            }
          });
          
          logger.info(`✅ Chat history updated with file context, messages: ${updatedHistory.length}`);

        } else {
          await ctx.reply(`❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`);
        }

        fileHandler.cleanupFile(filePath);
        logger.info(`🗑️ File cleaned up`);

      } catch (error: any) {
        fileHandler.cleanupFile(filePath);
        throw error;
      }

    } catch (error: any) {
      logger.error("❌ Error:", error);
      await ctx.reply(`❌ Ошибка: ${error.message}`);
    }
  } else {
    logger.info(`ℹ️ Document received outside chat mode`);
    await ctx.reply(
      "📄 <b>Документ получен!</b>\n\nНачните чат чтобы я мог его проанализировать:",
      { 
        parse_mode: 'HTML', 
        reply_markup: { 
          inline_keyboard: [[{ text: '🧠 ChatGPT-4', callback_data: 'chat_gpt4' }]] 
        } 
      }
    );
  }
});

// 🎤 УМНАЯ ОБРАБОТКА АУДИО (работает в режиме чата)
bot.on("message:audio", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  logger.info(`🎤 Audio received from user ${userId}`);
  
  const userState = UXHelpers.getUserState(userId);
  const allowedActions = ['chatting', 'chatting_with_file', 'chatgpt_audio_transcription', 'waiting_chat_message'];
  const isInChatMode = userState && allowedActions.includes(userState.currentAction);
  
  if (isInChatMode || !userState) {
    logger.info(`✅ Transcribing audio in smart chat mode...`);
    try {
      const audio = ctx.message.audio;
      const fileName = audio.file_name || 'audio';
      const fileSize = audio.file_size || 0;
      
      logger.info(`🎵 Audio: name=${fileName}, size=${fileSize}`);
      
      const maxSize = 25 * 1024 * 1024;
      if (fileSize > maxSize) {
        await ctx.reply("❌ Файл слишком большой. Максимум: 25 МБ");
        return;
      }

      await ctx.reply("🎤 Транскрибирую аудио...");

      const { FileHandler } = await import("../utils/fileHandler");
      const fileHandler = new FileHandler();
      const { filePath } = await fileHandler.downloadFile(audio.file_id);

      try {
        const { OpenAIService } = await import("../services/ai/OpenAIService");
        const openaiService = new OpenAIService();
        const transcriptionResult = await openaiService.transcribeAudio(filePath, 'ru');
        
        if (transcriptionResult.success && transcriptionResult.content) {
          logger.info(`✅ Transcribed: ${transcriptionResult.content.length} chars`);
          
          // Показываем транскрипцию
          await ctx.reply(
            `🎤 <b>Распознано:</b> "${transcriptionResult.content}"\n\n🧠 Обрабатываю запрос...`,
            { parse_mode: 'HTML' }
          );

          // 🚀 ОТПРАВЛЯЕМ ТРАНСКРИПЦИЮ В CHATGPT КАК ПРОМПТ
          const existingHistory = userState?.data?.chatHistory || [];
          
          const user = await prisma.user.findUnique({ where: { telegramId: userId } });
          if (!user) {
            await ctx.reply("❌ Пользователь не найден");
            fileHandler.cleanupFile(filePath);
            return;
          }

          const systemPrompt: ChatMessage = {
            role: 'system',
            content: userState?.data?.lastFileName 
              ? `Ты - умный помощник. ${userState.data.lastFileName ? `У пользователя есть файл "${userState.data.lastFileName}".` : ''} Отвечай на вопросы с учетом контекста. Отвечай на русском.`
              : 'Ты - умный помощник. Отвечай на русском языке с учетом контекста диалога.'
          };

          const messages: ChatMessage[] = [
            systemPrompt,
            ...existingHistory,
            { role: 'user', content: transcriptionResult.content }
          ];

          logger.info(`🤖 Sending transcribed text to ChatGPT...`);
          const chatResult = await aiManager.chatWithAI(messages, 'gpt4', {
            telegramId: userId,
            currentTokens: user.tokens
          });

          if (chatResult.success && chatResult.data?.content) {
            logger.info(`✅ ChatGPT response: ${chatResult.data.content.length} chars`);
            
            await ctx.reply(
              `🧠 <b>ChatGPT-4:</b>\n\n${chatResult.data.content}\n\n💰 Токенов: ${chatResult.tokensUsed}`,
              { parse_mode: 'HTML' }
            );

            // Сохраняем в историю
            const updatedHistory: ChatMessage[] = [
              ...existingHistory,
              { role: 'user', content: transcriptionResult.content },
              { role: 'assistant', content: chatResult.data.content }
            ];

            const limitedHistory = updatedHistory.slice(-20);

            UXHelpers.setUserState(userId, {
              currentAction: 'chatting',
              data: { 
                ...userState?.data,
                service: 'gpt4',
                chatHistory: limitedHistory
              }
            });
            
            logger.info(`✅ Chat history updated: ${limitedHistory.length} messages`);
          } else {
            await ctx.reply(`❌ Ошибка ChatGPT: ${chatResult.error}`);
          }

        } else {
          await ctx.reply(`❌ Ошибка транскрипции: ${transcriptionResult.error}`);
        }

        fileHandler.cleanupFile(filePath);

      } catch (error: any) {
        fileHandler.cleanupFile(filePath);
        throw error;
      }

    } catch (error: any) {
      logger.error("❌ Error:", error);
      await ctx.reply(`❌ Ошибка: ${error.message}`);
    }
  } else {
    await ctx.reply(
      "🎤 <b>Аудио получен!</b>\n\nНачните чат для транскрипции:",
      { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🧠 ChatGPT-4', callback_data: 'chat_gpt4' }]] } }
    );
  }
});

// 🎙️ УМНАЯ ОБРАБОТКА ГОЛОСОВЫХ (работает в режиме чата)
bot.on("message:voice", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  logger.info(`🎙️ Voice received from user ${userId}`);
  
  const userState = UXHelpers.getUserState(userId);
  const allowedActions = ['chatting', 'chatting_with_file', 'chatgpt_audio_transcription', 'waiting_chat_message'];
  const isInChatMode = userState && allowedActions.includes(userState.currentAction);
  
  if (isInChatMode || !userState) {
    logger.info(`✅ Transcribing voice in smart chat mode...`);
    try {
      const voice = ctx.message.voice;
      const fileSize = voice.file_size || 0;
      const duration = voice.duration || 0;
      
      logger.info(`🎙️ Voice: duration=${duration}s, size=${fileSize}`);
      
      const maxSize = 25 * 1024 * 1024;
      if (fileSize > maxSize) {
        await ctx.reply("❌ Голосовое слишком большое. Максимум: 25 МБ");
        return;
      }

      await ctx.reply("🎙️ Транскрибирую...");

      const { FileHandler } = await import("../utils/fileHandler");
      const fileHandler = new FileHandler();
      const { filePath } = await fileHandler.downloadFile(voice.file_id);

      try {
        const { OpenAIService } = await import("../services/ai/OpenAIService");
        const openaiService = new OpenAIService();
        const transcriptionResult = await openaiService.transcribeAudio(filePath, 'ru');
        
        if (transcriptionResult.success && transcriptionResult.content) {
          logger.info(`✅ Transcribed: ${transcriptionResult.content.length} chars`);
          
          // Показываем транскрипцию
          await ctx.reply(
            `🎙️ <b>Распознано:</b> "${transcriptionResult.content}"\n\n🧠 Обрабатываю запрос...`,
            { parse_mode: 'HTML' }
          );

          // 🚀 ОТПРАВЛЯЕМ ТРАНСКРИПЦИЮ В CHATGPT
          const existingHistory = userState?.data?.chatHistory || [];
          
          const user = await prisma.user.findUnique({ where: { telegramId: userId } });
          if (!user) {
            await ctx.reply("❌ Пользователь не найден");
            fileHandler.cleanupFile(filePath);
            return;
          }

          const systemPrompt: ChatMessage = {
            role: 'system',
            content: userState?.data?.lastFileName 
              ? `Ты - умный помощник. ${userState.data.lastFileName ? `У пользователя есть файл "${userState.data.lastFileName}".` : ''} Отвечай на вопросы с учетом контекста. Отвечай на русском.`
              : 'Ты - умный помощник. Отвечай на русском языке с учетом контекста диалога.'
          };

          const messages: ChatMessage[] = [
            systemPrompt,
            ...existingHistory,
            { role: 'user', content: transcriptionResult.content }
          ];

          logger.info(`🤖 Sending transcribed voice to ChatGPT...`);
          const chatResult = await aiManager.chatWithAI(messages, 'gpt4', {
            telegramId: userId,
            currentTokens: user.tokens
          });

          if (chatResult.success && chatResult.data?.content) {
            logger.info(`✅ ChatGPT response: ${chatResult.data.content.length} chars`);
            
            await ctx.reply(
              `🧠 <b>ChatGPT-4:</b>\n\n${chatResult.data.content}\n\n💰 Токенов: ${chatResult.tokensUsed}`,
              { parse_mode: 'HTML' }
            );

            // Сохраняем в историю
            const updatedHistory: ChatMessage[] = [
              ...existingHistory,
              { role: 'user', content: transcriptionResult.content },
              { role: 'assistant', content: chatResult.data.content }
            ];

            const limitedHistory = updatedHistory.slice(-20);

            UXHelpers.setUserState(userId, {
              currentAction: 'chatting',
              data: { 
                ...userState?.data,
                service: 'gpt4',
                chatHistory: limitedHistory
              }
            });
            
            logger.info(`✅ Chat history updated: ${limitedHistory.length} messages`);
          } else {
            await ctx.reply(`❌ Ошибка ChatGPT: ${chatResult.error}`);
          }

        } else {
          await ctx.reply(`❌ Ошибка транскрипции: ${transcriptionResult.error}`);
        }

        fileHandler.cleanupFile(filePath);

      } catch (error: any) {
        fileHandler.cleanupFile(filePath);
        throw error;
      }

    } catch (error: any) {
      logger.error("❌ Error:", error);
      await ctx.reply(`❌ Ошибка: ${error.message}`);
    }
  } else {
    await ctx.reply(
      "🎙️ <b>Голосовое получено!</b>\n\nНачните чат для транскрипции:",
      { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🧠 ChatGPT-4', callback_data: 'chat_gpt4' }]] } }
    );
  }
});

// 📝 УЛУЧШЕННАЯ ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
bot.on("message:text", async (ctx) => {
  const userId = ctx.from?.id;
  const text = ctx.message.text;
  
  if (!userId || !text) return;
  
  console.log("📝 Text message:", text, "from:", userId);
  
  try {
    // Получаем состояние пользователя
    const userState = UXHelpers.getUserState(userId);
  
  if (!userState) {
    // Пользователь не в активном состоянии
    await ctx.reply(
        `🤖 Для начала работы используйте /start или выберите действие из меню.\n\n${UXHelpers.getBreadcrumb(['main'])}`,
        { reply_markup: getMainMenu(userId) }
    );
    return;
  }

  // Команда "стоп" - выход из любого режима
  if (text.toLowerCase() === 'стоп' || text.toLowerCase() === 'stop') {
      UXHelpers.clearUserState(userId);
      stateManager.endSession(userId.toString());
    await ctx.reply(
      "✅ Диалог завершен.\n\nВыберите новое действие:",
        { reply_markup: getMainMenu(userId) }
    );
    return;
  }

    // Команда "помощь" - показать помощь
    if (text.toLowerCase() === 'помощь' || text.toLowerCase() === 'help') {
      await showHelp(ctx, userId);
      return;
    }

    // Команда "статистика" - показать статистику
    if (text.toLowerCase() === 'статистика' || text.toLowerCase() === 'stats') {
      await handleStats(ctx, userId);
    return;
  }

  // Обработка по состояниям
    switch (userState.currentAction) {
    case 'waiting_image_prompt':
        // Если есть предзаполненный промпт и пользователь отправил короткое сообщение (например, "да", "ок", "хорошо")
        const prefilledPrompt = userState.data?.prefilledPrompt;
        const isShortConfirmation = text.length <= 10 && (
          text.toLowerCase().includes('да') || 
          text.toLowerCase().includes('ок') || 
          text.toLowerCase().includes('хорошо') ||
          text.toLowerCase().includes('yes') ||
          text.toLowerCase().includes('ok')
        );
        
        if (prefilledPrompt && isShortConfirmation) {
          // Используем предзаполненный промпт
          console.log(`✅ Using prefilled prompt: "${prefilledPrompt}"`);
          await handleImageGeneration(ctx, prefilledPrompt, userState.data?.service || 'freepik', userState.data);
        } else {
          // Используем новый промпт от пользователя
          console.log(`📝 Using new prompt: "${text}"`);
          await handleImageGeneration(ctx, text, userState.data?.service || 'freepik', userState.data);
        }
      break;
      
    case 'waiting_video_prompt':
        await handleVideoGeneration(ctx, text, userState.data?.service || 'freepik', userState.data);
      break;

    case 'waiting_runway_prompt':
      await handleRunwayPrompt(ctx, text);
      break;
      
      case 'waiting_midjourney_prompt':
        await handleMidjourneyTextInput(ctx, text, userState.data?.model || '7.0');
        break;
        
      case 'waiting_chat_message':
    case 'chatting':
      await handleChatGPT(ctx, text);
      break;
      
    default:
        // Если пользователь просто отправил текст без активного состояния
        // Предлагаем быстрые действия
        await handleQuickTextInput(ctx, userId, text);
    }
    
  } catch (error) {
    console.error("❌ Text message error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
});

// 🎯 Обработка быстрого текстового ввода
async function handleQuickTextInput(ctx: any, userId: number, text: string) {
  // Если текст похож на промпт для изображения (более умная логика)
  const imageKeywords = ['закат', 'рассвет', 'пейзаж', 'портрет', 'кошка', 'собака', 'дом', 'город', 'море', 'горы', 'лес', 'цветы', 'красивый', 'красивая', 'красивое', 'фантастический', 'фантастическая', 'космос', 'звезды', 'луна', 'солнце', 'небо', 'облака'];
  const hasImageKeywords = imageKeywords.some(keyword => text.toLowerCase().includes(keyword));
  
  if (text.length > 5 && (text.includes('изображение') || text.includes('картинка') || text.includes('фото') || hasImageKeywords)) {
    // Устанавливаем состояние и сразу генерируем изображение
    UXHelpers.setUserState(userId, {
      currentAction: 'waiting_image_prompt',
      data: { service: 'freepik', model: 'seedream' }
    });
    
    // Сразу запускаем генерацию
    await handleImageGeneration(ctx, text, 'freepik', { model: 'seedream' });
    return;
  }
  
  // Если текст похож на промпт для видео
  if (text.length > 15 && (text.includes('видео') || text.includes('анимация') || text.includes('движение'))) {
    await ctx.reply(
      `🎬 <b>Быстрая генерация видео</b>\n\nПромпт: "${text}"\n\nВыберите сервис:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ Kling AI', callback_data: `quick_vid_kling_${text}` },
              { text: '🚀 Runway ML', callback_data: `quick_vid_runway_${text}` }
            ],
            [{ text: '📋 Все сервисы', callback_data: 'generate_video' }]
          ]
        }
      }
    );
    return;
  }
  
  // По умолчанию предлагаем чат
  // Сохраняем промпт в состоянии вместо callback_data (fix для BUTTON_DATA_INVALID)
  UXHelpers.setUserState(userId, {
    currentAction: 'waiting_model_selection',
    data: { pendingPrompt: text }
  });
  
  await ctx.reply(
    `💬 <b>AI Чат</b>\n\nПромпт: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\nВыберите модель:`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🧠 ChatGPT-4', callback_data: 'quick_chat_gpt4_execute' }
          ],
          [{ text: '📋 Все модели', callback_data: 'chat_ai' }]
        ]
      }
    }
          );
}

// 📖 Показать помощь
async function showHelp(ctx: any, userId: number) {
  const message = `📖 <b>Справка по использованию бота</b>\n\n` +
    `🎯 <b>Быстрые команды:</b>\n` +
    `• "стоп" - завершить текущее действие\n` +
    `• "помощь" - показать эту справку\n` +
    `• "статистика" - показать вашу статистику\n\n` +
    `🎨 <b>Генерация изображений:</b>\n` +
    `Просто опишите что хотите увидеть\n` +
    `<i>Пример: "красивый закат над океаном"</i>\n\n` +
    `🎬 <b>Генерация видео:</b>\n` +
    `Опишите движение или сцену\n` +
    `<i>Пример: "кот играет с мячиком"</i>\n\n` +
    `💬 <b>AI Чат:</b>\n` +
    `Задавайте любые вопросы\n` +
    `<i>Пример: "Расскажи анекдот"</i>\n\n` +
    `📸 <b>Анализ изображений:</b>\n` +
    `Отправьте фото для анализа\n\n` +
    `💰 <b>Токены:</b>\n` +
    `• Изображения: 5-15 токенов\n` +
    `• Видео: 20-50 токенов\n` +
    `• Чат: 1-3 токена\n\n` +
    `💡 <b>Советы:</b>\n` +
    `• Используйте английский для лучших результатов\n` +
    `• Будьте конкретны в описаниях\n` +
    `• Проверяйте баланс токенов\n` +
    `• Используйте быстрые действия для экономии времени`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🎨 Попробовать изображение', callback_data: 'quick_image' },
        { text: '💬 Попробовать чат', callback_data: 'quick_chat' }
      ],
      [
        { text: '📊 Моя статистика', callback_data: 'stats' },
        { text: '⬅️ Главное меню', callback_data: 'back_to_main' }
      ]
    ]
  };
  
  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
}


// 🎨 УЛУЧШЕННАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
async function handleImageGeneration(ctx: any, prompt: string, service: string, data?: any) {
  const userId = ctx.from?.id;
  const startTime = Date.now();
  
  // 💡 СОХРАНЯЕМ СОСТОЯНИЕ СРАЗУ для кнопки "Еще одно"
  const model = data?.model || 'default';
  console.log(`💾 SAVING STATE for user ${userId}: prompt="${prompt}", service="${service}", model="${model}"`);
  
  UXHelpers.setUserState(userId, {
    currentAction: 'generating_image',
    data: { 
      lastPrompt: prompt,
      lastService: service,
      lastModel: model
    }
  });
  
  // Проверяем что состояние сохранилось
  const savedState = UXHelpers.getUserState(userId);
  console.log(`💾 VERIFIED saved state:`, JSON.stringify(savedState, null, 2));
  
  try {
    // Создаем задачу в очереди
    const task = stateManager.createTask(userId, 'image', service, prompt, data);
    
    // Функция для создания прогресс-бара
    const createProgressBar = (percent: number, width: number = 10): string => {
      const filled = Math.round((percent / 100) * width);
      const empty = width - filled;
      return '█'.repeat(filled) + '░'.repeat(empty);
    };
    
    // Одно сообщение с прогрессом (будем его обновлять)
    const progressMsg = await ctx.reply(`⏳ <b>Подготовка...</b>\n\n${createProgressBar(10)} 10%`, { parse_mode: 'HTML' });
    
    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    // Обновляем прогресс
    try {
      await ctx.api.editMessageText(
        progressMsg.chat.id,
        progressMsg.message_id,
        `🎨 <b>Генерирую изображение...</b>\n\n${createProgressBar(30)} 30%`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      // Игнорируем ошибку
    }
    
    console.log('==================== HANDLE IMAGE GENERATION START ====================');
    console.log('Service:', service);
    console.log('Prompt:', prompt);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('User Context:', JSON.stringify(userContext, null, 2));
    console.log('===============================================================');
    
    let result;
    
    if (service === 'freepik') {
      const freepikOptions = {
        model: data?.model || 'seedream',
        aspect_ratio: '1:1'
      };
      
      console.log('==================== FREEPIK GENERATION OPTIONS ====================');
      console.log('Options:', JSON.stringify(freepikOptions, null, 2));
      console.log('===============================================================');
      
      result = await aiManager.generateImage(prompt, 'freepik', userContext, freepikOptions);
    } else if (service === 'dalle') {
      result = await aiManager.generateImage(prompt, 'dalle', userContext);
    } else {
      result = { success: false, error: 'Неизвестный сервис' };
    }
    
    console.log('==================== HANDLE IMAGE GENERATION RESULT ====================');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('===============================================================');
    
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Обновляем финальный статус
    try {
      await ctx.api.editMessageText(
        progressMsg.chat.id,
        progressMsg.message_id,
        `✅ <b>Изображение готово!</b>\n\n${createProgressBar(100)} 100%`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      // Игнорируем ошибку
    }
    
    // Небольшая задержка для показа финального статуса
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Проверяем разные варианты URL в результате
    let imageUrl = null;
    if (result.success && result.data) {
      // Вариант 1: Прямой URL
      if (result.data.url) {
        imageUrl = result.data.url;
      }
      // Вариант 2: URL в массиве images
      else if (result.data.images && result.data.images.length > 0 && result.data.images[0].url) {
        imageUrl = result.data.images[0].url;
      }
    }

    console.log('==================== IMAGE URL CHECK ====================');
    console.log('Result success:', result.success);
    console.log('Result data:', result.data);
    console.log('Image URL found:', imageUrl);
    console.log('===============================================================');

    if (result.success && imageUrl) {
      logger.info('Image generation completed:', {
        service,
        data,
        dataModel: data?.model,
        resultMetadata: result.data?.metadata,
        imageUrl
      });
      
      // Обновляем прогресс-сообщение на финальное
      await ctx.api.editMessageText(
        progressMsg.chat.id,
        progressMsg.message_id,
        `✅ <b>Изображение готово!</b>\n\n${createProgressBar(100)} 100%\n\n📤 Отправляю...`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
      
      const modelText = data?.model ? ` (${data.model})` : '';
      
      // Обновляем состояние после успешной генерации
      console.log(`✅ UPDATING STATE after successful generation for user ${userId}`);
      UXHelpers.setUserState(userId, {
        currentAction: 'image_generated',
        data: { 
          lastPrompt: prompt,
          lastService: service,
          lastModel: model
        }
      });
      
      // Проверяем что состояние обновилось
      const updatedState = UXHelpers.getUserState(userId);
      console.log(`✅ VERIFIED updated state:`, JSON.stringify(updatedState, null, 2));

      // ВАЖНО: Отправляем НОВОЕ сообщение с изображением
      // Это гарантирует уведомление даже если пользователь ушел в другое меню
      await bot.api.sendPhoto(ctx.chat.id, imageUrl, {
        caption: `✅ <b>Изображение готово!</b>\n\n📝 Промпт: "${prompt}"\n🎨 Сервис: ${service === 'freepik' ? 'Freepik AI' + modelText : 'DALL-E'}\n💰 Потрачено токенов: ${result.tokensUsed}\n⏱️ Время: ${UXHelpers.formatTime(duration)}`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: `regenerate_image_${service}_${model}` },
              { text: '📊 Статистика', callback_data: 'stats' }
            ],
            ...getNavigationButtons()
          ]
        }
      });
      
    } else {
      console.log('==================== IMAGE GENERATION FAILED ====================');
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log('Image URL:', imageUrl);
      console.log('===============================================================');
      
      const errorMessage = result.error || 'Не удалось получить изображение';
      await UXHelpers.sendSmartErrorNotification(ctx, errorMessage);
    }
    
    // Обновляем состояние задачи
    stateManager.updateTask(task.id, {
      status: result.success ? 'completed' : 'failed',
      result: result.data,
      error: result.error,
      completedAt: new Date()
    });
    
    // Очищаем состояние после генерации
    UXHelpers.clearUserState(userId);
    
  } catch (error) {
    console.error("❌ Image generation error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
    UXHelpers.clearUserState(userId);
  }
}

// 🎬 УЛУЧШЕННАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ВИДЕО
async function handleVideoGeneration(ctx: any, prompt: string, service: string, data?: any) {
  const userId = ctx.from?.id;
  const startTime = Date.now();
  
  try {
    // Создаем задачу в очереди
    const task = stateManager.createTask(userId, 'video', service, prompt, data);
    
    // Показываем прогресс
    await UXHelpers.showProgress(ctx, {
      stage: 'Подготовка к генерации',
      progress: 5,
      estimatedTime: 180,
      message: 'Проверяю баланс токенов...'
    });
    
    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    await UXHelpers.showProgress(ctx, {
      stage: 'Генерация видео',
      progress: 20,
      estimatedTime: 160,
      message: 'Отправляю запрос в AI сервис...'
    });
    
    let result;
    
    if (service === 'freepik') {
      result = await aiManager.generateVideo(prompt, 'freepik', userContext, data);
    } else if (service === 'runway') {
      result = await aiManager.generateVideo(prompt, 'runway', userContext, data);
    } else {
      result = { success: false, error: 'Неизвестный сервис' };
    }
    
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    if (result.success && result.data?.url) {
      await UXHelpers.showProgress(ctx, {
        stage: 'Завершение',
        progress: 100,
        estimatedTime: 0,
        message: 'Видео готово!'
      });
      
      // Небольшая задержка для показа финального прогресса
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const serviceName = service === 'freepik' ? 'Freepik Video' : 'Runway ML';
      await ctx.replyWithVideo(result.data.url, {
        caption: `✅ <b>Видео готово!</b>\n\n📝 Промпт: "${prompt}"\n🎬 Сервис: ${serviceName}\n💰 Потрачено токенов: ${result.tokensUsed}\n⏱️ Время: ${UXHelpers.formatTime(duration)}`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: 'generate_video' },
              { text: '📊 Статистика', callback_data: 'stats' }
            ],
            [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
          ]
        }
      });
      
      // Отправляем уведомление об успехе
      await UXHelpers.sendSuccessNotification(ctx, {
        tokensUsed: result.tokensUsed,
        service: serviceName,
        duration,
        repeatAction: 'generate_video'
      });
      
    } else {
      await UXHelpers.sendSmartErrorNotification(ctx, result.error);
    }
    
    // Обновляем состояние задачи
    stateManager.updateTask(task.id, {
      status: result.success ? 'completed' : 'failed',
      result: result.data,
      error: result.error,
      completedAt: new Date()
    });
    
    // Очищаем состояние после генерации
    UXHelpers.clearUserState(userId);
    
  } catch (error) {
    console.error("❌ Video generation error:", error);
    await UXHelpers.sendSmartErrorNotification(ctx, error);
    UXHelpers.clearUserState(userId);
  }
}

// 💬 ФУНКЦИЯ ЧАТА С CHATGPT
async function handleChatGPT(ctx: any, message: string) {
  const userId = ctx.from?.id;
  
  try {
    await ctx.reply("🧠 Думаю...");
    
    // Получаем состояние пользователя с историей чата
    const userState = UXHelpers.getUserState(userId);
    const existingHistory = userState?.data?.chatHistory || [];
    
    logger.info(`💬 Chat message from user ${userId}, history length: ${existingHistory.length}`);
    
    // Получаем баланс
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    // Добавляем системный промпт если это первое сообщение
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: userState?.data?.lastFileName 
        ? `Ты - умный помощник. У пользователя есть файл "${userState.data.lastFileName}". Отвечай на вопросы с учетом контекста файла и предыдущих сообщений. Отвечай на русском.`
        : 'Ты - умный помощник. Отвечай на вопросы с учетом всего предыдущего контекста диалога. Отвечай на русском языке.'
    };
    
    // Создаем полную историю: system + предыдущие + новое сообщение
    const messages: ChatMessage[] = [
      systemPrompt,
      ...existingHistory,
      { role: 'user', content: message }
    ];
    
    logger.info(`📤 Sending to ChatGPT: ${messages.length} messages`);
    
    const result = await aiManager.chatWithAI(messages, 'gpt4', userContext);
    
    if (result.success && result.data?.content) {
      logger.info(`✅ ChatGPT response received: ${result.data.content.length} chars`);
      
      await ctx.reply(
        `🧠 <b>ChatGPT-4:</b>\n\n${result.data.content}\n\n💰 Токенов: ${result.tokensUsed}\n\n💬 Продолжайте диалог!`,
        { parse_mode: "HTML" }
      );

      // 💡 ОБНОВЛЯЕМ ИСТОРИЮ ЧАТА
      const updatedHistory: ChatMessage[] = [
        ...existingHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: result.data.content }
      ];

      // Ограничиваем историю последними 20 сообщениями
      const limitedHistory = updatedHistory.slice(-20);

      UXHelpers.setUserState(userId, {
        currentAction: 'chatting',
        data: {
          ...userState?.data,
          service: 'gpt4',
          chatHistory: limitedHistory
        }
      });

      logger.info(`✅ Chat history saved: ${limitedHistory.length} messages`);
      
    } else {
      await ctx.reply(`❌ Ошибка ChatGPT: ${result.error}`);
    }
    
  } catch (error) {
    logger.error("❌ ChatGPT error:", error);
    await ctx.reply("❌ Ошибка обращения к ChatGPT. Попробуйте еще раз.");
  }
}


// 🎯 НОВЫЕ ОБРАБОТЧИКИ ДЕЙСТВИЙ

// 🎨 Быстрое изображение
async function handleQuickImage(ctx: any, userId: number) {
  try {
    UXHelpers.updateUserPath(userId, 'quick_image');
    
    // НЕ устанавливаем модель по умолчанию - пусть пользователь выберет
    // Если пользователь просто введет текст, будет использована модель из предыдущего выбора
    
    const message = `🎨 <b>Быстрое изображение</b>\n\n` +
      `Выберите модель:\n\n` +
      `💡 <b>Совет:</b> Seedream быстрее, Flux Pro качественнее`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔥 Seedream v3 (быстро)', callback_data: 'freepik_img_seedream' },
          { text: '⚡ Flux Pro (качество)', callback_data: 'freepik_img_flux-pro' }
        ],
        [
          { text: '📋 Все модели', callback_data: 'image_freepik' },
          { text: '⬅️ Назад', callback_data: 'back_to_main' }
        ]
      ]
    };
    
    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 💬 Быстрый чат
async function handleQuickChat(ctx: any, userId: number) {
  try {
    UXHelpers.updateUserPath(userId, 'quick_chat');
    
    const message = `💬 <b>Умный AI Чат</b>\n\n` +
      `Выберите ChatGPT-4 для начала:\n\n` +
      `✨ <b>Возможности:</b>\n` +
      `• Обычный диалог с сохранением контекста\n` +
      `• Анализ документов (просто отправьте файл)\n` +
      `• Транскрипция аудио/голосовых\n` +
      `• Анализ изображений\n\n` +
      `💡 Все работает автоматически в одном чате!`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🧠 ChatGPT-4 (Умный чат)', callback_data: 'chat_gpt4' }
        ],
        [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
      ]
    };
    
    await UXHelpers.safeEditMessage(ctx, message, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
    
    // Устанавливаем состояние ожидания сообщения
    UXHelpers.setUserState(userId, {
      currentAction: 'waiting_chat_message',
      data: { service: 'gpt4', chatHistory: [] }
    });
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 🖼️ Midjourney Menu
async function handleMidjourneyMenu(ctx: any, userId: number) {
  try {
    UXHelpers.updateUserPath(userId, 'midjourney');

    if (!midjourneyService.isConfigured()) {
      await ctx.editMessageText(
        `🖼️ <b>Midjourney</b>\n\n` +
        `❌ Сервис временно недоступен.\n` +
        `Попробуйте другие варианты генерации изображений.`,
        {
          parse_mode: "HTML",
          reply_markup: UXHelpers.getBackButton('back_to_main')
        }
      );
      return;
    }

    const models = midjourneyService.getAvailableModels();
    const popularModels = models.slice(0, 4); // Показываем только популярные модели

    let message = `🖼️ <b>Midjourney - Премиум генерация</b>\n\n` +
      `🎯 Самая мощная нейросеть для создания изображений!\n` +
      `✨ Поддерживает русский язык\n\n` +
      `💰 <b>Стоимость:</b> 7-8 токенов за изображение\n\n` +
      `Выберите модель или отправьте описание изображения:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔥 Midjourney 7.0', callback_data: 'midjourney_7.0' },
          { text: '⚡ Midjourney 6.1', callback_data: 'midjourney_6.1' }
        ],
        [
          { text: '⬅️ Назад', callback_data: 'back_to_main' }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });

  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 🖼️ Midjourney Generation
async function handleMidjourneyGeneration(ctx: any, userId: number, model: string) {
  try {
    UXHelpers.setUserState(userId, {
      currentAction: 'waiting_midjourney_prompt',
      data: { model }
    });

    const modelInfo = midjourneyService.getAvailableModels().find(m => m.id === model);
    const cost = modelInfo?.cost || 8;

    const message = `🖼️ <b>Midjourney ${model}</b>\n\n` +
      `💰 Стоимость: ${cost} токенов\n` +
      `🎯 Модель: ${modelInfo?.name || `Midjourney ${model}`}\n\n` +
      `📝 Отправьте описание изображения:\n\n` +
      `💡 <b>Пример:</b> "красивый закат над океаном в стиле фэнтези"`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⬅️ Назад к моделям', callback_data: 'midjourney_menu' }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });

  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 🖼️ Midjourney Quick Start
async function handleMidjourneyQuick(ctx: any, userId: number) {
  try {
    UXHelpers.setUserState(userId, {
      currentAction: 'waiting_midjourney_prompt',
      data: { model: '7.0' } // По умолчанию используем самую новую модель
    });

    const message = `🎨 <b>Midjourney - Быстрый старт</b>\n\n` +
      `🚀 Модель: Midjourney 7.0 (по умолчанию)\n` +
      `💰 Стоимость: 8 токенов\n\n` +
      `📝 Просто отправьте описание изображения:\n\n` +
      `💡 <b>Примеры:</b>\n` +
      `• "красивый закат над океаном"\n` +
      `• "футуристический город в стиле киберпанк"\n` +
      `• "милая кошка в космосе"`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⬅️ Назад к моделям', callback_data: 'midjourney_menu' },
          { text: '⚙️ Выбрать модель', callback_data: 'midjourney_all_models' }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });

  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 🖼️ Midjourney Text Input Handler
async function handleMidjourneyTextInput(ctx: any, text: string, model: string) {
  const userId = ctx.from?.id;
  const startTime = Date.now();
  let progressMsg: any = null;

  try {
    // Создаем задачу в очереди
    const task = stateManager.createTask(userId, 'image', 'midjourney', text, { model });

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Рассчитываем стоимость
    const modelInfo = midjourneyService.getAvailableModels().find(m => m.id === model);
    const cost = modelInfo?.cost || 8;

    // Проверяем баланс
    if (user.tokens < cost) {
      throw new Error(`Недостаточно токенов. Требуется: ${cost}, доступно: ${user.tokens}`);
    }

    // Показываем простое сообщение о начале генерации
    progressMsg = await ctx.reply('🎨 Генерирую изображение...');

    // Вызываем Midjourney API
    const result = await midjourneyService.generateImage({
      prompt: text,
      model,
      userId: parseInt(user.id),
      telegramId: userId
    });

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Удаляем сообщение о прогрессе
    if (progressMsg) {
      try {
        await ctx.api.deleteMessage(progressMsg.chat.id, progressMsg.message_id);
      } catch (e) {
        // Игнорируем ошибку удаления
      }
    }

    if (result.success && result.taskId) {
      // Показываем успешное сообщение в едином стиле с Freepik/Kling
      const message = `🎨 <b>Генерация запущена!</b>\n\n` +
        `📝 "${text}"\n` +
        `🖼️ Midjourney ${model}\n` +
        `💰 Стоимость: ${cost} токенов\n\n` +
        `⚡ Можете создавать еще изображения параллельно!\n` +
        `🔔 Результат придет автоматически через 1-2 минуты`;

      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: 'midjourney_quick' },
              { text: '📊 Статистика', callback_data: 'stats' }
            ],
            [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
          ]
        }
      });

      // НЕ отправляем уведомление об успехе - изображение придет через webhook
      console.log('✅ Midjourney generation started successfully:', {
        taskId: result.taskId,
        userId: userId,
        prompt: text,
        model: model,
        cost: cost
      });

    } else {
      // Показываем понятную ошибку пользователю
      await ctx.reply(`❌ ${result.error || 'Произошла ошибка при создании изображения'}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Попробовать снова', callback_data: 'midjourney_7.0' },
              { text: '🏠 Главная', callback_data: 'back_to_main' }
            ]
          ]
        }
      });
    }

    // Обновляем состояние задачи
    stateManager.updateTask(task.id, {
      status: result.success ? 'processing' : 'failed',
      result: result.taskId,
      error: result.error,
      completedAt: new Date()
    });

    // Очищаем состояние после генерации
    UXHelpers.clearUserState(userId);

  } catch (error) {
    console.error("❌ Midjourney generation error:", error);
    
    // Удаляем сообщение о прогрессе если оно есть
    if (progressMsg) {
      try {
        await ctx.api.deleteMessage(progressMsg.chat.id, progressMsg.message_id);
      } catch (e) {
        // Игнорируем ошибку удаления
      }
    }
    
    // Показываем понятную ошибку пользователю
    await UXHelpers.sendSmartErrorNotification(ctx, error);
    UXHelpers.clearUserState(userId);
  }
}

// 📊 Статистика
async function handleStats(ctx: any, userId: number) {
  try {
    UXHelpers.updateUserPath(userId, 'stats');
    
    const stats = await UXHelpers.getUserStats(userId);
    const queueStats = taskQueue.getQueueStats();
    
    logger.info('Stats retrieved:', { 
      userId, 
      stats, 
      queueStats,
      hasStats: !!stats
    });
    
    let message = `📊 <b>Статистика</b>\n\n`;
    
    if (stats) {
      message += `👤 <b>Ваша статистика:</b>\n` +
        `🎯 Генераций: ${stats.totalGenerations}\n` +
        `💰 Потрачено токенов: ${stats.tokensSpent}\n` +
        `💎 Текущий баланс: ${stats.currentBalance}\n` +
        `🏆 Любимый сервис: ${stats.favoriteService}\n\n`;
    } else {
      logger.warn('No stats found for user:', userId);
    }
    
    // Получаем реальную статистику из базы данных
    const systemStats = await prisma.generationHistory.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    const completedCount = systemStats.find(s => s.status === 'completed')?._count.status || 0;
    const failedCount = systemStats.find(s => s.status === 'failed')?._count.status || 0;
    const processingCount = systemStats.find(s => s.status === 'processing')?._count.status || 0;
    
    message += `🌐 <b>Система:</b>\n` +
      `⏳ В очереди: ${queueStats.pending}\n` +
      `🔄 Обрабатывается: ${processingCount}\n` +
      `✅ Выполнено: ${completedCount}\n` +
      `❌ Ошибок: ${failedCount}`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Обновить', callback_data: 'stats' },
          { text: '⬅️ Назад', callback_data: 'back_to_main' }
        ]
      ]
    };
    
    // Пытаемся отредактировать, если это текстовое сообщение
    // Иначе отправляем новое
    try {
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    } catch (e) {
      // Если не удалось отредактировать (например, это фото), отправляем новое сообщение
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    }
    
    // Отвечаем на callback, чтобы убрать "часики"
    await ctx.answerCallbackQuery();
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 📋 Мои задачи
async function handleMyTasks(ctx: any, userId: number) {
  try {
    const userTasks = taskQueue.getUserTasks(userId);
    const activeTasks = userTasks.filter(t => t.status === 'processing' || t.status === 'pending');
    
    if (activeTasks.length === 0) {
      await ctx.editMessageText(
        "📋 <b>Мои задачи</b>\n\n✅ У вас нет активных задач",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              ...getNavigationButtons()
            ]
          }
        }
      );
      return;
    }
    
    let message = "📋 <b>Мои задачи</b>\n\n";
    
    activeTasks.forEach((task, index) => {
      const emoji = task.type === 'video' ? '🎬' : '🎨';
      const statusEmoji = task.status === 'processing' ? '⏳' : '⏸️';
      message += `${index + 1}. ${emoji} ${statusEmoji} ${task.prompt.substring(0, 30)}...\n`;
      message += `   Модель: ${task.model || 'default'}\n`;
      message += `   Прогресс: ${task.progress}%\n\n`;
    });
    
    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          ...getNavigationButtons()
        ]
      }
    });
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// ⬅️ Назад в главное меню
async function handleBackToMain(ctx: any, userId: number) {
  try {
    // Очищаем ВСЕ состояния пользователя
    UXHelpers.clearUserState(userId);
    stateManager.endSession(userId.toString());
    
    const message = `🏠 <b>Главное меню</b>\n\nВыберите действие:`;
    
    // Пытаемся отредактировать, если это текстовое сообщение
    // Иначе отправляем новое
    try {
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: getMainMenu(userId)
      });
    } catch (e) {
      // Если не удалось отредактировать (например, это фото), отправляем новое сообщение
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: getMainMenu(userId)
      });
    }
    
  } catch (error) {
    // Даже при ошибке пытаемся вернуть в главное меню
    try {
      await ctx.reply(
        "🏠 <b>Главное меню</b>\n\nВыберите действие:",
        { 
          parse_mode: "HTML",
          reply_markup: getMainMenu(userId) 
        }
      );
    } catch (fallbackError) {
      console.error('❌ Critical error returning to main menu:', fallbackError);
    }
  }
}

// 🛑 Остановить действие
async function handleStopAction(ctx: any, userId: number) {
  try {
    // Отменяем все задачи пользователя
    stateManager.cancelUserTasks(userId);
    
    const message = `🛑 <b>Действие остановлено</b>\n\nВсе активные задачи отменены.`;
    
    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: UXHelpers.getBackButton('back_to_main')
    });
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 🔄 Повторить последнее действие
async function handleRetryLastAction(ctx: any, userId: number) {
  try {
    const repeatContext = stateManager.getRepeatContext(userId);
    
    if (repeatContext.task) {
      await taskQueue.retryTask(repeatContext.task.id);
      
      const message = `🔄 <b>Повтор запланирован</b>\n\nЗадача добавлена в очередь на повторное выполнение.`;
      
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: UXHelpers.getBackButton('back_to_main')
      });
    } else {
      await ctx.reply("❌ Нет задач для повтора.");
    }
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// ❌ Отменить повтор
async function handleCancelRetry(ctx: any, userId: number) {
  try {
    const userTasks = taskQueue.getUserTasks(userId);
    const pendingTasks = userTasks.filter(task => task.status === 'pending');
    
    for (const task of pendingTasks) {
      await taskQueue.cancelTask(task.id);
    }
    
    const message = `❌ <b>Повтор отменен</b>\n\nВсе запланированные повторы отменены.`;
    
    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: UXHelpers.getBackButton('back_to_main')
    });
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
  }
}

// 📊 ЗАПУСК БОТА
export async function startProductionBot() {
  try {
    console.log("🚀 Starting production bot...");
    
    const me = await bot.api.getMe();
    console.log("✅ Bot info:", me);
    
    // Настраиваем меню команд
    await setupBotCommands();
    
    await bot.start();
    console.log("✅ Production bot started successfully!");
    
  } catch (error) {
    console.error("❌ Failed to start production bot:", error);
    throw error;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down bot...");
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});

// 🎬 ФУНКЦИИ ДЛЯ ГЕНЕРАЦИИ ВИДЕО ИЗ ФОТО

// 🚀 Обработка фото для Runway ML (Image-to-Video)
async function handleRunwayPhoto(ctx: any) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Получаем фото
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    
    console.log('📸 Runway photo received:', {
      userId,
      imageUrl: imageUrl.substring(0, 50) + '...'
    });

    // Скачиваем изображение и конвертируем в base64
    // Runway требует правильный Content-Type, а Telegram отдает application/octet-stream
    await ctx.reply("⏳ Обрабатываю изображение...");
    
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64Image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
    
    console.log('📸 Converted to base64:', base64Image.substring(0, 100) + '...');

    // Сохраняем base64 изображение в состоянии и запрашиваем промпт
    UXHelpers.setUserState(userId, {
      currentAction: 'waiting_runway_prompt',
      data: { 
        service: 'runway',
        imageUrl: base64Image  // Теперь base64 вместо URL
      }
    });

    await ctx.reply(
      "✅ <b>Изображение обработано!</b>\n\n" +
      "📝 <b>Шаг 2:</b> Отправьте текстовый промпт для управления видео\n\n" +
      "💡 Пример: \"камера медленно отдаляется, золотой час\"\n" +
      "💡 Или просто отправьте \".\" для генерации без промпта",
      { parse_mode: "HTML" }
    );

  } catch (error: any) {
    console.error('❌ Error handling Runway photo:', error);
    await ctx.reply(
      "❌ Ошибка при обработке изображения. Попробуйте еще раз.",
      { reply_markup: getMainMenu(ctx.from?.id) }
    );
  }
}

// 🚀 Обработка промпта для Runway ML (Image-to-Video)
async function handleRunwayPrompt(ctx: any, prompt: string) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userState = UXHelpers.getUserState(userId);
    
    if (!userState || !userState.data?.imageUrl) {
      await ctx.reply("❌ Изображение не найдено. Попробуйте заново.");
      return;
    }

    const imageUrl = userState.data.imageUrl;
    const finalPrompt = prompt === '.' ? '' : prompt;

    console.log('🎬 Starting Runway video generation:', {
      userId,
      imageUrl: imageUrl.substring(0, 50) + '...',
      prompt: finalPrompt.substring(0, 50)
    });

    // Очищаем состояние пользователя
    UXHelpers.clearUserState(userId);

    await ctx.reply("🎬 Создаю видео через Runway ML... Это может занять несколько минут.");

    // Получаем пользователя из БД
    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (!user) {
      await ctx.reply("❌ Пользователь не найден. Используйте /start");
      return;
    }

    // Генерируем видео через Runway
    const result = await aiManager.generateVideo(
      finalPrompt,
      'runway',
      { telegramId: userId, currentTokens: user.tokens },
      { imageUrl: imageUrl }
    );

    if (result.success) {
      if (result.data?.url && result.data.url !== 'processing') {
        // Видео готово сразу
        await ctx.replyWithVideo(result.data.url, {
          caption: "✅ <b>Видео готово!</b>\n\n🚀 Модель: Runway Gen-4 Turbo\n📝 Промпт: " + (finalPrompt || "без промпта"),
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: getNavigationButtons()
          }
        });
      } else {
        // Видео обрабатывается, показываем прогресс
        await ctx.reply(
          "🎬 <b>Создаю видео через Runway ML...</b>\n\n" +
          "📝 Промпт: " + (finalPrompt || "без промпта") + "\n" +
          "🚀 Модель: Runway Gen-4 Turbo\n" +
          "⏰ Время генерации: обычно 1-3 минуты\n\n" +
          "✨ Готовое видео будет доставлено автоматически!",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Еще одно', callback_data: 'generate_video' }],
                [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
      }
    } else {
      await UXHelpers.sendSmartErrorNotification(
        ctx,
        result.error || "Не удалось создать видео через Runway",
        'generate_video'
      );
    }

  } catch (error: any) {
    console.error('❌ Error handling Runway prompt:', error);
    await UXHelpers.sendSmartErrorNotification(
      ctx,
      "Произошла ошибка при генерации видео",
      'generate_video'
    );
  }
}

async function handleVideoFromPhoto(ctx: any, service: string) {
  try {
    const userId = ctx.from?.id;
    const userState = UXHelpers.getUserState(userId);
    
    if (!userState || userState.currentAction !== 'waiting_for_photo_video') {
      await ctx.reply("❌ Неожиданное состояние. Попробуйте заново.");
      return;
    }

    // Получаем фото
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    
    const prompt = ctx.message.caption || "Create a cinematic video from this image";
    let model = userState.data?.model || 'kling_v2_5_pro';
    
    // Конвертируем callback ID в FreepikService ID  
    const modelMapping: Record<string, string> = {
      'kling-v2-1-master': 'kling_v2_1_master',
      'kling-pro-v2-1': 'kling_v2_1_pro',
      'kling-std-v2-1': 'kling_v2_1_std',
      'kling-v2-5-pro': 'kling_v2_5_pro',
      'kling-v2': 'kling_v2',
      'kling-pro-1-6': 'kling_pro_1_6',
      'kling-std-1-6': 'kling_std_1_6',
      'kling-elements-pro-1-6': 'kling_elements_pro_1_6',
      'kling-elements-std-1-6': 'kling_elements_std_1_6',
      'minimax-hailuo-768p': 'minimax_hailuo_768p',
      'minimax-hailuo-1080p': 'minimax_hailuo_1080p',
      'pixverse-v5': 'pixverse_v5',
      'pixverse-v5-transition': 'pixverse_v5_transition',
      'seedance-pro-1080p': 'seedance_pro_1080p',
      'wan-v2-2-720p': 'wan_v2_2_720p'
    };
    model = modelMapping[model] || model;
    
    console.log('🎬 Starting video generation from photo:', {
      userId,
      service,
      model,
      prompt: prompt.substring(0, 50)
    });

    await ctx.reply("🎬 Создаю видео из вашего фото... Это может занять несколько минут.");

    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    // Используем FreepikService для генерации видео
    const freepikService = new (await import('../services/ai/FreepikService')).FreepikService();
    
    const startTime = Date.now();
    const result = await freepikService.generateVideoFromImage(
      imageUrl,
      prompt,
      model as any,
      5 // По умолчанию 5 секунд
    );
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('🎬 Video generation result:', {
      success: result.success,
      taskId: result.data?.id,
      error: result.error
    });

    if (result.success && result.data?.id) {
      // Получаем внутренний userId из БД
      const user = await prisma.user.findUnique({
        where: { telegramId: userId }
      });

      if (!user) {
        await ctx.reply("❌ Ошибка: пользователь не найден в базе данных");
        return;
      }

      // ВАЖНО: Сохраняем задачу в FreepikTask таблицу для webhook
      await prisma.freepikTask.create({
        data: {
          userId: user.id, // Внутренний ID пользователя
          taskId: result.data.id,
          prompt,
          model,
          type: 'video',
          status: 'processing',
          cost: 10 // Примерная стоимость генерации видео
        }
      });

      console.log('✅ FreepikTask saved to DB:', {
        taskId: result.data.id,
        userId: user.id,
        telegramId: userId,
        model,
        type: 'video'
      });

      // Сохраняем задачу в очередь
      const task = await taskQueue.addTask({
        id: `video_${Date.now()}_${userId}`,
        userId,
        service: 'freepik',
        type: 'video',
        prompt,
        model,
        imageUrl,
        taskId: result.data.id,
        status: 'processing',
        progress: 0,
        createdAt: new Date()
      });

      // Отправляем сообщение о начале генерации
      await ctx.reply(
        `✅ <b>Видео создается!</b>\n\n📝 Промпт: "${prompt}"\n🎬 Модель: ${getVideoModelName(model)}\n\n⏱️ Примерное время: 2-5 минут\n\n💡 <i>Видео будет отправлено автоматически когда будет готово</i>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔄 Создать еще', callback_data: 'photo_to_video_menu' },
                { text: '📊 Статистика', callback_data: 'stats' }
              ],
              ...getNavigationButtons()
            ]
          }
        }
      );
      
      // Очищаем состояние
      UXHelpers.clearUserState(userId);
      
      // ВАЖНО: Результат придет через webhook!
      // WebhookController обработает ответ от Freepik и отправит видео пользователю
    } else {
      const errorMessage = result.error || 'Не удалось создать видео';
      await ctx.reply(`❌ <b>Ошибка создания видео</b>\n\n${errorMessage}`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Попробовать снова', callback_data: 'photo_to_video_menu' }],
              ...getNavigationButtons()
            ]
          }
        }
      );
    }

  } catch (error: any) {
    console.error('🎬 Video generation error:', error);
    await ctx.reply(`❌ <b>Ошибка создания видео</b>\n\n${error.message}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Попробовать снова', callback_data: 'photo_to_video_menu' }],
            ...getNavigationButtons()
          ]
        }
      }
    );
  }
}

async function handleGPTVision(ctx: any) {
  try {
    const userId = ctx.from?.id;
    
    // Получаем фото
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    
    const prompt = ctx.message.caption || "Проанализируй это изображение и опиши что на нем изображено";
    
    await ctx.reply("🔍 Анализирую изображение...");
    
    const chatgptService = new (await import('../services/ai/OpenAIService')).OpenAIService();
    const result = await chatgptService.analyzeImage(imageUrl, prompt);
    
    if (result.success && result.content) {
      await ctx.reply(`📸 <b>Анализ изображения GPT-4V:</b>\n\n${result.content}`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Еще один анализ', callback_data: 'start_vision_chat' }],
              ...getNavigationButtons()
            ]
          }
        }
      );
    } else {
      await ctx.reply(`❌ <b>Ошибка анализа</b>\n\n${result.error || 'Неизвестная ошибка'}`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Попробовать снова', callback_data: 'start_vision_chat' }],
              ...getNavigationButtons()
            ]
          }
        }
      );
    }

  } catch (error: any) {
    console.error('🔍 GPT Vision error:', error);
    await ctx.reply(`❌ <b>Ошибка анализа изображения</b>\n\n${error.message}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Попробовать снова', callback_data: 'start_vision_chat' }],
            ...getNavigationButtons()
          ]
        }
      }
    );
  }
}

// 📊 Создание визуального прогресс-бара
function getProgressBar(percent: number): string {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${percent}%`;
}

// 🔄 Универсальная функция мониторинга прогресса задач
async function monitorTaskProgress(
  chatId: number,
  messageId: number,
  taskId: string,
  taskType: 'image' | 'video',
  service: string,
  model: string,
  prompt: string,
  userId: number,
  checkStatusFn: () => Promise<any>,
  onComplete: (result: any) => Promise<void>
) {
  let progress = 0;
  let attempts = 0;
  const maxAttempts = taskType === 'video' ? 60 : 30; // 5 мин для видео, 2.5 мин для изображений
  
  const interval = setInterval(async () => {
    attempts++;
    
    // Симулируем прогресс (0% → 90%)
    if (progress < 90) {
      progress = Math.min(90, Math.floor((attempts / maxAttempts) * 90));
    }
    
    try {
      const status = await checkStatusFn();
      
      console.log(`🔄 Task progress check (${attempts}/${maxAttempts}):`, {
        taskId,
        taskType,
        service,
        model,
        status: status?.data?.status,
        hasResult: !!(status?.data?.videos?.length || status?.data?.images?.length)
      });
      
      // Проверяем готовность
      const isCompleted = status.success && status.data?.status === 'completed';
      const hasResult = taskType === 'video' 
        ? status.data?.videos?.length 
        : status.data?.images?.length;
      
      if (isCompleted && hasResult) {
        clearInterval(interval);
        await onComplete(status);
        return;
      }
      
      if (status.data?.status === 'failed') {
        clearInterval(interval);
        
        // Сохраняем данные для кнопки "Попробовать снова"
        UXHelpers.setUserState(userId, {
          currentAction: 'generation_failed',
          data: { 
            lastPrompt: prompt,
            lastService: service,
            lastModel: model,
            taskType: taskType
          }
        });

        await bot.api.editMessageText(
          chatId,
          messageId,
          `❌ <b>Ошибка генерации</b>\n\n📝 Промпт: "${prompt}"\n\n${status.error || 'Не удалось создать контент'}`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Попробовать снова', callback_data: `retry_generation_${service}_${model}_${taskType}` }],
                ...getNavigationButtons()
              ]
            }
          }
        ).catch(() => {});
        
        return;
      }
      
      // Обновляем прогресс каждые 15 секунд для видео, 10 секунд для изображений
      const updateInterval = taskType === 'video' ? 3 : 2;
      if (attempts % updateInterval === 0) {
        const emoji = taskType === 'video' ? '🎬' : '🎨';
        const typeText = taskType === 'video' ? 'видео' : 'изображение';
        const modelName = taskType === 'video' ? getVideoModelName(model) : model;
        
        await bot.api.editMessageText(
          chatId,
          messageId,
          `${emoji} <b>Создаю ${typeText}...</b>\n\n📝 Промпт: "${prompt}"\n🎨 Модель: ${modelName}\n\n${getProgressBar(progress)}\n\n⏱️ Осталось ~${Math.ceil((maxAttempts - attempts) * 5 / 60)} мин`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                ...getNavigationButtons()
              ]
            }
          }
        ).catch(() => {});
      }
      
    } catch (error) {
      console.error('Error checking task progress:', error);
    }
    
    // Таймаут
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      
      await bot.api.editMessageText(
        chatId,
        messageId,
        `⏱️ <b>Генерация занимает больше времени</b>\n\n📝 Промпт: "${prompt}"\n\n💡 Результат будет отправлен автоматически когда будет готов.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Мои задачи', callback_data: 'my_tasks' }],
              ...getNavigationButtons()
            ]
          }
        }
      ).catch(() => {});
    }
    
  }, 5000);
}

// 🔄 Мониторинг прогресса генерации видео
async function monitorVideoProgress(ctx: any, messageId: number, taskId: string, model: string, prompt: string, userId: number) {
  const freepikService = new (await import('../services/ai/FreepikService')).FreepikService();
  
  await monitorTaskProgress(
    ctx.chat.id,
    messageId,
    taskId,
    'video',
    'freepik',
    model,
    prompt,
    userId,
    () => freepikService.checkTaskStatus(taskId, 'video', model),
    async (status) => {
      const videoUrl = status.data.videos[0].url;
      
      // Обновляем прогресс-сообщение
      await bot.api.editMessageText(
        ctx.chat.id,
        messageId,
        `✅ <b>Видео готово!</b>\n\n${getProgressBar(100)}\n\n📤 Отправляю...`,
        { parse_mode: "HTML" }
      ).catch(() => {});
      
      // Отправляем НОВОЕ сообщение с видео
      await bot.api.sendVideo(ctx.chat.id, videoUrl, {
        caption: `🎬 <b>Ваше видео готово!</b>\n\n📝 "${prompt}"\n🎨 ${getVideoModelName(model)}`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: 'photo_to_video_menu' },
              { text: '📊 Статистика', callback_data: 'stats' }
            ],
            ...getNavigationButtons()
          ]
        }
      });
    }
  );
}


function getVideoModelName(modelId: string): string {
  const models: Record<string, string> = {
    'kling_v2_5_pro': 'Kling 2.5 Pro',
    'kling_v2_1_master': 'Kling 2.1 Master',
    'kling_v2_1_pro': 'Kling 2.1 Pro',
    'kling_v2_1_std': 'Kling 2.1 Standard',
    'kling_v2': 'Kling v2',
    'kling_pro_1_6': 'Kling Pro 1.6',
    'kling_std_1_6': 'Kling Std 1.6',
    'kling_elements_pro_1_6': 'Kling Elements Pro 1.6',
    'kling_elements_std_1_6': 'Kling Elements Std 1.6',
    'minimax_hailuo_768p': 'MiniMax Hailuo 768p',
    'minimax_hailuo_1080p': 'MiniMax Hailuo 1080p',
    'pixverse_v5': 'PixVerse V5',
    'pixverse_v5_transition': 'PixVerse V5 Transition',
    'seedance_pro_1080p': 'Seedance Pro 1080p',
    'wan_v2_2_720p': 'Wan v2.2 720p',
    // Поддержка старых ID с дефисами
    'kling-v2-1-master': 'Kling 2.1 Master',
    'kling-pro-v2-1': 'Kling 2.1 Pro',
    'kling-std-v2-1': 'Kling 2.1 Standard'
  };
  return models[modelId] || modelId;
}

export { bot };

// Экспортируем функцию запуска с алиасом для совместимости
export { startProductionBot as startBot };

// Автозапуск только если запускается напрямую (не через import)
if (require.main === module) {
  startProductionBot().catch(console.error);
}
