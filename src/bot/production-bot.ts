import { Bot } from "grammy";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prismaClient";
import { AIServiceManager } from "../services/ai/AIServiceManager";
import { ChatMessage } from "../services/ai/OpenAIService";
import { FREEPIK_IMAGE_MODELS, FREEPIK_VIDEO_MODELS, getPopularImageModels, getPopularVideoModels, getImageModelById, getVideoModelById } from "../services/ai/FreepikModels";

const bot = new Bot(process.env.BOT_TOKEN!);
const aiManager = new AIServiceManager();

console.log("🤖 Starting AICEX Production Bot with AI integrations...");

// 🎯 ГЛАВНОЕ МЕНЮ - только нейросети
const mainMenu = {
  inline_keyboard: [
    [
      { text: '🎨 Генерация фото', callback_data: 'generate_image' }
    ],
    [
      { text: '🎬 Генерация видео', callback_data: 'generate_video' }
    ],
    [
      { text: '💬 Чат с AI', callback_data: 'chat_ai' }
    ],
    [
      { text: '👤 Профиль', web_app: { url: process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app/' } }
    ]
  ]
};

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
      { text: '🎬 Freepik Video', callback_data: 'video_freepik' },
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
      { text: '🔮 ChatGPT-4 Vision', callback_data: 'chat_vision' }
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

// 🎬 МЕНЮ МОДЕЛЕЙ FREEPIK - ВИДЕО
function getFreepikVideoModelsMenu() {
  const popularModels = getPopularVideoModels();
  
  return {
    inline_keyboard: [
      [
        { text: '🔥 Популярные', callback_data: 'freepik_popular_videos' },
        { text: '📋 Все модели', callback_data: 'freepik_all_videos' }
      ],
      ...popularModels.slice(0, 4).map(model => ([
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

// 📋 ВСЕ МОДЕЛИ ВИДЕО
function getAllVideoModelsMenu(page: number = 0) {
  const modelsPerPage = 6;
  const startIndex = page * modelsPerPage;
  const models = FREEPIK_VIDEO_MODELS.slice(startIndex, startIndex + modelsPerPage);
  
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
  if (startIndex + modelsPerPage < FREEPIK_VIDEO_MODELS.length) {
    navButtons.push({ text: 'След. ➡️', callback_data: `freepik_vid_page_${page + 1}` });
  }
  
  if (navButtons.length > 0) {
    keyboard.push(navButtons);
  }
  
  keyboard.push([{ text: '⬅️ К популярным', callback_data: 'video_freepik' }]);
  
  return { inline_keyboard: keyboard };
}

// 📊 Состояния пользователей
const userStates = new Map<number, {
  state: string;
  service: string;
  data?: any;
}>();

// 🚀 КОМАНДА /start
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

    const welcomeMessage = `🎉 Добро пожаловать в AICEX AI!

<b>27 AI моделей в одном боте:</b>

<b>Генерация изображений:</b>
• Freepik AI (Seedream, Flux, Mystic, Imagen3)
• Midjourney (скоро)

<b>Генерация видео:</b>  
• Freepik Video (Kling v2, PixVerse, Minimax)
• Runway ML

<b>AI Чат:</b>
• ChatGPT-4 (текст)
• GPT-4 Vision (анализ изображений)

<b>Профиль</b> - управление токенами, подписка, история

Выберите действие:`;

    await ctx.reply(welcomeMessage, {
      reply_markup: mainMenu,
      parse_mode: "HTML"
    });

    console.log("✅ Welcome sent to user:", userId);

  } catch (error) {
    console.error("❌ Start error:", error);
    await ctx.reply("❌ Ошибка запуска. Попробуйте /start еще раз.");
  }
});

// 🔘 ОБРАБОТКА CALLBACK КНОПОК
bot.on("callback_query", async (ctx) => {
  console.log("🔘 Callback:", ctx.callbackQuery.data, "from:", ctx.from?.id);
  
  await ctx.answerCallbackQuery();
  
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  
  if (!userId) return;
  
  switch (data) {
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

    case 'chat_vision':
      userStates.set(userId, { state: 'vision_chat', service: 'gpt4_vision' });
      await ctx.editMessageText(
        "🔮 <b>GPT-4 Vision</b>\n\n📸 Отправьте изображение с описанием для анализа!\n\n💡 Или просто изображение - я его опишу.\n\n🛑 Напишите \"стоп\" для завершения.",
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
          { reply_markup: mainMenu, parse_mode: "HTML" }
        );
      } catch (error) {
        // Если не можем редактировать (например, сообщение с изображением), отправляем новое
        await ctx.reply(
          "🎯 <b>Главное меню</b>\n\nВыберите действие:",
          { reply_markup: mainMenu, parse_mode: "HTML" }
        );
      }
      break;

    default:
      // 🎨 ОБРАБОТКА ВЫБОРА МОДЕЛЕЙ ИЗОБРАЖЕНИЙ
      if (data?.startsWith('freepik_img_')) {
        const modelId = data.replace('freepik_img_', '');
        const model = getImageModelById(modelId);
        
        if (model) {
          userStates.set(userId, { 
            state: 'waiting_image_prompt', 
            service: 'freepik', 
            data: { model: modelId, endpoint: model.endpoint } 
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
      else {
        console.log("❓ Unknown callback:", data);
      }
  }
});

// 📝 ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
bot.on("message:text", async (ctx) => {
  const userId = ctx.from?.id;
  const text = ctx.message.text;
  
  if (!userId || !text) return;
  
  console.log("📝 Text message:", text, "from:", userId);
  
  const userState = userStates.get(userId);
  
  if (!userState) {
    // Пользователь не в активном состоянии
    await ctx.reply(
      "🤖 Для начала работы используйте /start или выберите действие из меню.",
      { reply_markup: mainMenu }
    );
    return;
  }

  // Команда "стоп" - выход из любого режима
  if (text.toLowerCase() === 'стоп' || text.toLowerCase() === 'stop') {
    userStates.delete(userId);
    await ctx.reply(
      "✅ Диалог завершен.\n\nВыберите новое действие:",
      { reply_markup: mainMenu }
    );
    return;
  }

  // Обработка по состояниям
  switch (userState.state) {
    case 'waiting_image_prompt':
      await handleImageGeneration(ctx, text, userState.service, userState.data);
      break;
      
    case 'waiting_video_prompt':
      await handleVideoGeneration(ctx, text, userState.service);
      break;
      
    case 'chatting':
      await handleChatGPT(ctx, text);
      break;
      
    default:
      console.log("❓ Unknown state:", userState.state);
  }
});

// 📸 ОБРАБОТКА ИЗОБРАЖЕНИЙ (для GPT-4 Vision)
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  console.log("📸 Photo from:", userId);
  
  const userState = userStates.get(userId);
  
  if (userState?.state === 'vision_chat') {
    await handleGPTVision(ctx);
  } else {
    await ctx.reply("📸 Для анализа изображений выберите 'GPT-4 Vision' в меню чата.");
  }
});

// 🎨 ФУНКЦИЯ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
async function handleImageGeneration(ctx: any, prompt: string, service: string, data?: any) {
  const userId = ctx.from?.id;
  
  try {
    await ctx.reply("🎨 Генерирую изображение...\n⏱️ Это займет 30-60 секунд");
    
    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    let result;
    
    if (service === 'freepik') {
      result = await aiManager.generateImage(
        prompt, 
        'freepik', 
        userContext, 
        data?.model || 'flux-dev',
        { aspect_ratio: 'square_1_1' }
      );
    } else if (service === 'dalle') {
      result = await aiManager.generateImage(prompt, 'dalle', userContext, undefined);
    } else {
      result = { success: false, error: 'Неизвестный сервис' };
    }
    
    if (result.success && result.data?.url) {
      const modelText = data?.model ? ` (${data.model})` : '';
      await ctx.replyWithPhoto(result.data.url, {
        caption: `✅ <b>Изображение готово!</b>\n\n📝 Промпт: "${prompt}"\n🎨 Сервис: ${service === 'freepik' ? 'Freepik AI' + modelText : 'DALL-E'}\n💰 Потрачено токенов: ${result.tokensUsed}`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: 'generate_image' },
              { text: '🏠 Главная', callback_data: 'back_to_main' }
            ]
          ]
        }
      });
    } else {
      await ctx.reply(`❌ Ошибка генерации: ${result.error}`);
    }
    
    // Очищаем состояние после генерации
    userStates.delete(userId);
    
  } catch (error) {
    console.error("❌ Image generation error:", error);
    await ctx.reply("❌ Ошибка генерации изображения. Попробуйте еще раз.");
    userStates.delete(userId);
  }
}

// 🎬 ФУНКЦИЯ ГЕНЕРАЦИИ ВИДЕО
async function handleVideoGeneration(ctx: any, prompt: string, service: string) {
  const userId = ctx.from?.id;
  
  try {
    await ctx.reply("🎬 Генерирую видео...\n⏱️ Это займет 2-5 минут");
    
    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    let result;
    
    if (service === 'freepik') {
      result = await aiManager.generateVideo(prompt, 'freepik', userContext);
    } else if (service === 'runway') {
      result = await aiManager.generateVideo(prompt, 'runway', userContext);
    } else {
      result = { success: false, error: 'Неизвестный сервис' };
    }
    
    if (result.success && result.data?.url) {
      await ctx.replyWithVideo(result.data.url, {
        caption: `✅ <b>Видео готово!</b>\n\n📝 Промпт: "${prompt}"\n🎬 Сервис: ${service === 'freepik' ? 'Freepik Video' : 'Runway ML'}\n💰 Потрачено токенов: ${result.tokensUsed}`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: 'generate_video' },
              { text: '🏠 Главная', callback_data: 'back_to_main' }
            ]
          ]
        }
      });
    } else {
      await ctx.reply(`❌ Ошибка генерации видео: ${result.error}`);
    }
    
    userStates.delete(userId);
    
  } catch (error) {
    console.error("❌ Video generation error:", error);
    await ctx.reply("❌ Ошибка генерации видео. Попробуйте еще раз.");
    userStates.delete(userId);
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

// 🔮 ФУНКЦИЯ GPT-4 VISION
async function handleGPTVision(ctx: any) {
  const userId = ctx.from?.id;
  
  try {
    await ctx.reply("🔮 Анализирую изображение...");
    
    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    // Получаем URL изображения
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    
    // Получаем описание от пользователя или используем стандартное
    const prompt = ctx.message.caption || "Опиши подробно что изображено на этой картинке";
    
    const result = await aiManager.analyzeImage(imageUrl, prompt, userContext);
    
    if (result.success && result.data?.content) {
      await ctx.reply(
        `🔮 <b>GPT-4 Vision:</b>\n\n${result.data.content}\n\n💰 Потрачено токенов: ${result.tokensUsed}\n\n📸 Отправьте еще изображение или напишите "стоп".`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(`❌ Ошибка анализа: ${result.error}`);
    }
    
  } catch (error) {
    console.error("❌ Vision error:", error);
    await ctx.reply("❌ Ошибка анализа изображения. Попробуйте еще раз.");
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

// Запускаем бота
startProductionBot().catch(console.error);
