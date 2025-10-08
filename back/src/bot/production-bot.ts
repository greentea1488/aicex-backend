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

const bot = new Bot(process.env.BOT_TOKEN!);
const aiManager = new AIServiceManager();
const stateManager = new StateManager();
const taskQueue = new TaskQueue(stateManager);
const midjourneyService = new MidjourneyAPIService();

console.log("🤖 Starting AICEX Production Bot with enhanced UX...");

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

// 📊 Состояния пользователей
const userStates = new Map<number, {
  state: string;
  service: string;
  data?: any;
}>();

// 🚀 УЛУЧШЕННАЯ КОМАНДА /start
bot.command("start", async (ctx) => {
  console.log("📨 /start from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Создаем пользователя в БД
    await prisma.user.upsert({
      where: { telegramId: userId },
      update: { 
        username: ctx.from?.username || "",
        firstName: ctx.from?.first_name || "",
        lastName: ctx.from?.last_name || ""
      },
      create: {
        telegramId: userId,
        username: ctx.from?.username || "",
        firstName: ctx.from?.first_name || "",
        lastName: ctx.from?.last_name || "",
        tokens: 50 // Стартовые токены
      }
    });

    // Получаем рекомендации для пользователя
    const recommendations = await UXHelpers.getUserRecommendations(userId);
    const stats = await UXHelpers.getUserStats(userId);

    let welcomeMessage = `🎉 <b>Добро пожаловать в AICEX AI!</b>\n\n`;
    
    if (stats && stats.totalGenerations > 0) {
      welcomeMessage += `👋 С возвращением! У вас ${stats.totalGenerations} генераций\n`;
      welcomeMessage += `💰 Токенов: ${stats.currentBalance}\n\n`;
    } else {
      welcomeMessage += `🎁 <b>Стартовый бонус:</b> 50 токенов\n`;
      welcomeMessage += `🚀 <b>27 AI моделей</b> в одном боте\n\n`;
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

    // 🎨 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ
    case 'generate_image':
      await ctx.editMessageText(
        "🎨 <b>Генерация изображений</b>\n\nВыберите нейросеть:",
        { reply_markup: imageMenu, parse_mode: "HTML" }
      );
      break;

    case 'image_freepik':
      await ctx.editMessageText(
        "🎨 <b>Freepik AI</b>\n\nВыберите модель для генерации:",
        { reply_markup: getFreepikImageModelsMenu(), parse_mode: "HTML" }
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
      await ctx.editMessageText(
        "🎬 <b>Генерация видео</b>\n\nВыберите нейросеть:",
        { reply_markup: videoMenu, parse_mode: "HTML" }
      );
      break;

    case 'video_freepik':
      await ctx.editMessageText(
        "🎬 <b>Freepik Video</b>\n\nВыберите модель для генерации:",
        { reply_markup: getFreepikVideoModelsMenu(), parse_mode: "HTML" }
      );
      break;

    case 'video_kling':
      await ctx.editMessageText(
        "⚡ <b>Kling AI Video</b>\n\nВыберите модель Kling для генерации видео:\n\n💡 Используется Freepik API",
        { reply_markup: getKlingModelsMenu(), parse_mode: "HTML" }
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
      userStates.set(userId, { state: 'waiting_video_prompt', service: 'runway' });
      await ctx.editMessageText(
        "🚀 <b>Runway ML</b>\n\n📝 Отправьте описание видео которое хотите создать:\n\n💡 Пример: \"Летящий дрон над городом на закате\"",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'generate_video' }]
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
        { reply_markup: chatMenu, parse_mode: "HTML" }
      );
      break;

    case 'chat_gpt4':
      userStates.set(userId, { state: 'chatting', service: 'gpt4' });
      await ctx.editMessageText(
        "🧠 <b>ChatGPT-4</b>\n\n💬 Теперь можете задавать любые вопросы!\n\n📝 Отправьте сообщение для начала диалога.\n\n🛑 Напишите \"стоп\" для завершения.",
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


    // 🔙 НАВИГАЦИЯ
    case 'back_to_main':
      userStates.delete(userId); // Очищаем состояние
      try {
        await ctx.editMessageText(
          "🎯 <b>Главное меню</b>\n\nВыберите действие:",
          { reply_markup: getMainMenu(userId), parse_mode: "HTML" }
        );
      } catch (error) {
        // Если не можем редактировать (например, сообщение с изображением), отправляем новое
        await ctx.reply(
          "🎯 <b>Главное меню</b>\n\nВыберите действие:",
          { reply_markup: getMainMenu(userId), parse_mode: "HTML" }
        );
      }
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
          // Используем UXHelpers для консистентности
          UXHelpers.setUserState(userId, { 
            currentAction: 'waiting_image_prompt', 
            data: { service: 'freepik', model: modelId, endpoint: model.endpoint } 
          });
          
          await ctx.editMessageText(
            `${model.isNew ? '🆕 ' : ''}<b>${model.name}</b>\n\n${model.description}\n\n📝 Отправьте описание изображения:\n\n💡 Пример: "красивый закат над океаном"`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '⬅️ К моделям', callback_data: 'image_freepik' }]
                ]
              },
              parse_mode: "HTML"
            }
          );
        }
      }
      // 🎬 ОБРАБОТКА ВЫБОРА МОДЕЛЕЙ ВИДЕО
      else if (data?.startsWith('freepik_vid_')) {
        const modelId = data.replace('freepik_vid_', '');
        const model = getVideoModelById(modelId);
        
        if (model) {
          userStates.set(userId, { 
            state: 'waiting_video_prompt', 
            service: 'freepik', 
            data: { model: modelId, endpoint: model.endpoint } 
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
        await handleImageGeneration(ctx, text, userState.data?.service || 'freepik', userState.data);
      break;
      
    case 'waiting_video_prompt':
        await handleVideoGeneration(ctx, text, userState.data?.service || 'freepik', userState.data);
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
          await ctx.reply(
            `💬 <b>AI Чат</b>\n\nПромпт: "${text}"\n\nВыберите модель:`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🧠 ChatGPT-4', callback_data: `quick_chat_gpt_${text}` }
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
    
    if (result.success && result.data?.url) {
      logger.info('Image generation completed:', {
        service,
        data,
        dataModel: data?.model,
        resultMetadata: result.data?.metadata
      });
      
      const modelText = data?.model ? ` (${data.model})` : '';
      await ctx.replyWithPhoto(result.data.url, {
        caption: `✅ <b>Изображение готово!</b>\n\n📝 Промпт: "${prompt}"\n🎨 Сервис: ${service === 'freepik' ? 'Freepik AI' + modelText : 'DALL-E'}\n💰 Потрачено токенов: ${result.tokensUsed}\n⏱️ Время: ${UXHelpers.formatTime(duration)}`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: 'quick_image' },
              { text: '📊 Статистика', callback_data: 'stats' }
            ],
            [{ text: '🏠 Главная', callback_data: 'back_to_main' }]
          ]
        }
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
    
    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    // Создаем сообщения для чата
    const messages: ChatMessage[] = [
      { role: 'user', content: message }
    ];
    
    const result = await aiManager.chatWithAI(messages, 'gpt4', userContext);
    
    if (result.success && result.data?.content) {
      await ctx.reply(
        `🧠 <b>ChatGPT-4:</b>\n\n${result.data.content}\n\n💰 Потрачено токенов: ${result.tokensUsed}\n\n💬 Продолжайте диалог или напишите "стоп" для завершения.`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(`❌ Ошибка ChatGPT: ${result.error}`);
    }
    
  } catch (error) {
    console.error("❌ ChatGPT error:", error);
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
    
    const message = `💬 <b>AI Чат</b>\n\n` +
      `Выберите модель или сразу отправьте сообщение для начала диалога:\n\n` +
      `💡 <b>Пример:</b> "Расскажи анекдот"`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🧠 ChatGPT-4', callback_data: 'chat_gpt4' }
        ],
        [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
      ]
    };
    
    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
    
    // Устанавливаем состояние ожидания сообщения
    UXHelpers.setUserState(userId, {
      currentAction: 'waiting_chat_message',
      data: { service: 'gpt4' }
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
          { text: '📋 Все модели', callback_data: 'midjourney_all_models' },
          { text: '🎨 Быстрый старт', callback_data: 'midjourney_quick' }
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
          { text: '⬅️ Назад к моделям', callback_data: 'midjourney_menu' },
          { text: '🎨 Быстрый старт', callback_data: 'midjourney_quick' }
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

  try {
    // Создаем задачу в очереди
    const task = stateManager.createTask(userId, 'image', 'midjourney', text, { model });

    // Показываем прогресс
    await UXHelpers.showProgress(ctx, {
      stage: 'Подготовка к генерации',
      progress: 10,
      estimatedTime: 90,
      message: 'Проверяю баланс токенов...'
    });

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

    await UXHelpers.showProgress(ctx, {
      stage: 'Генерация изображения',
      progress: 30,
      estimatedTime: 70,
      message: 'Отправляю запрос в Midjourney через Gen API...'
    });

    // Вызываем Midjourney API
    const result = await midjourneyService.generateImage({
      prompt: text,
      model,
      userId: parseInt(user.id),
      telegramId: userId
    });

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (result.success && result.taskId) {
      await UXHelpers.showProgress(ctx, {
        stage: 'Завершение',
        progress: 100,
        estimatedTime: 0,
        message: 'Задача создана успешно!'
      });

      // Небольшая задержка для показа финального прогресса
      await new Promise(resolve => setTimeout(resolve, 1000));

      const message = `✅ <b>Задача создана успешно!</b>\n\n` +
        `📝 Промпт: "${text}"\n` +
        `🖼️ Модель: Midjourney ${model}\n` +
        `💰 Потрачено токенов: ${cost}\n` +
        `⏱️ Время создания: ${UXHelpers.formatTime(duration)}\n\n` +
        `⏳ Генерация займет примерно 1-2 минуты.\n` +
        `🔄 Статус будет обновлен автоматически.`;

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

      // Отправляем уведомление об успехе
      await UXHelpers.sendSuccessNotification(ctx, {
        tokensUsed: cost,
        service: `Midjourney ${model}`,
        duration,
        repeatAction: 'midjourney_quick'
      });

    } else {
      throw new Error(result.error || 'Неизвестная ошибка');
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

// ⬅️ Назад в главное меню
async function handleBackToMain(ctx: any, userId: number) {
  try {
    // Очищаем состояние пользователя
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
    
    // Отвечаем на callback, чтобы убрать "часики"
    await ctx.answerCallbackQuery();
    
  } catch (error) {
    await UXHelpers.sendSmartErrorNotification(ctx, error);
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

export { bot };

// Экспортируем функцию запуска с алиасом для совместимости
export { startProductionBot as startBot };

// Автозапуск только если запускается напрямую (не через import)
if (require.main === module) {
  startProductionBot().catch(console.error);
}
