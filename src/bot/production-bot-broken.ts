import { Bot } from "grammy";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prismaClient";
import { AIServiceManager } from "../services/ai/AIServiceManager";
import { ChatMessage } from "../services/ai/OpenAIService";

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
      { text: '🌐 Веб-версия', web_app: { url: process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app/home' } }
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

🤖 **Доступные нейросети:**

🎨 **Генерация изображений:**
• Freepik AI - быстро и качественно
• Midjourney - художественные изображения

🎬 **Генерация видео:**  
• Freepik Video - короткие ролики
• Runway ML - профессиональное видео

💬 **AI Чат:**
• ChatGPT-4 - умный помощник
• GPT-4 Vision - анализ изображений

🌐 **Веб-версия** - полный функционал, профиль, токены

Выберите действие:`;

    await ctx.reply(welcomeMessage, {
      reply_markup: mainMenu
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
        "🎨 **Генерация изображений**\n\nВыберите нейросеть:",
        { reply_markup: imageMenu }
      );
      break;

    case 'image_freepik':
      await ctx.editMessageText(
        "🎨 **Freepik AI**\n\nВыберите модель для генерации:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🌟 Seedream v4', callback_data: 'freepik_seedream' },
                { text: '⚡ Flux', callback_data: 'freepik_flux' }
              ],
              [
                { text: '🔮 Mystic', callback_data: 'freepik_mystic' }
              ],
              [
                { text: '⬅️ Назад', callback_data: 'generate_image' }
              ]
            ]
          }
        }
      );
      break;

    case 'image_midjourney':
      await ctx.editMessageText(
        "🖼️ **Midjourney**\n\n🚧 Скоро будет доступен!\n\nПока используйте Freepik AI.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'generate_image' }]
            ]
          }
        }
      );
      break;

    // 🎬 ГЕНЕРАЦИЯ ВИДЕО
    case 'generate_video':
      await ctx.editMessageText(
        "🎬 **Генерация видео**\n\nВыберите нейросеть:",
        { reply_markup: videoMenu }
      );
      break;

    case 'video_freepik':
      userStates.set(userId, { state: 'waiting_video_prompt', service: 'freepik' });
      await ctx.editMessageText(
        "🎬 **Freepik Video**\n\n📝 Отправьте описание видео которое хотите создать:\n\n💡 Пример: \"Кот играет с мячиком в саду\"",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'generate_video' }]
            ]
          }
        }
      );
      break;

    case 'video_runway':
      userStates.set(userId, { state: 'waiting_video_prompt', service: 'runway' });
      await ctx.editMessageText(
        "🚀 **Runway ML**\n\n📝 Отправьте описание видео которое хотите создать:\n\n💡 Пример: \"Летящий дрон над городом на закате\"",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'generate_video' }]
            ]
          }
        }
      );
      break;

    // 💬 AI ЧАТ
    case 'chat_ai':
      await ctx.editMessageText(
        "💬 **AI Чат**\n\nВыберите модель:",
        { reply_markup: chatMenu }
      );
      break;

    case 'chat_gpt4':
      userStates.set(userId, { state: 'chatting', service: 'gpt4' });
      await ctx.editMessageText(
        "🧠 **ChatGPT-4**\n\n💬 Теперь можете задавать любые вопросы!\n\n📝 Отправьте сообщение для начала диалога.\n\n🛑 Напишите \"стоп\" для завершения.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'chat_ai' }]
            ]
          }
        }
      );
      break;

    case 'chat_vision':
      userStates.set(userId, { state: 'vision_chat', service: 'gpt4_vision' });
      await ctx.editMessageText(
        "🔮 **GPT-4 Vision**\n\n📸 Отправьте изображение с описанием для анализа!\n\n💡 Или просто изображение - я его опишу.\n\n🛑 Напишите \"стоп\" для завершения.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'chat_ai' }]
            ]
          }
        }
      );
      break;

    // 🔙 НАВИГАЦИЯ
    case 'back_to_main':
      userStates.delete(userId); // Очищаем состояние
      await ctx.editMessageText(
        "🎯 **Главное меню**\n\nВыберите действие:",
        { reply_markup: mainMenu }
      );
      break;

    default:
      console.log("❓ Unknown callback:", data);
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
      await handleImageGeneration(ctx, text, userState.service);
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
async function handleImageGeneration(ctx: any, prompt: string, service: string) {
  const userId = ctx.from?.id;
  
  try {
    await ctx.reply("🎨 Генерирую изображение...\n⏱️ Это займет 30-60 секунд");
    
    // Получаем баланс пользователя
    const userBalance = await aiManager.getUserBalance(userId);
    const userContext = { telegramId: userId, currentTokens: userBalance };
    
    let result;
    
    if (service === 'freepik') {
      result = await aiManager.generateImage(prompt, 'freepik', userContext, 'flux-dev');
    } else if (service === 'dalle') {
      result = await aiManager.generateImage(prompt, 'dalle', userContext, undefined);
    } else {
      result = { success: false, error: 'Неизвестный сервис' };
    }
    
    if (result.success && result.data?.url) {
      await ctx.replyWithPhoto(result.data.url, {
        caption: `✅ **Изображение готово!**\n\n📝 Промпт: "${prompt}"\n🎨 Сервис: ${service === 'freepik' ? 'Freepik AI' : 'DALL-E'}\n💰 Потрачено токенов: ${result.tokensUsed}`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: `image_${service}` },
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
        caption: `✅ **Видео готово!**\n\n📝 Промпт: "${prompt}"\n🎬 Сервис: ${service === 'freepik' ? 'Freepik Video' : 'Runway ML'}\n💰 Потрачено токенов: ${result.tokensUsed}`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Еще одно', callback_data: `video_${service}` },
              { text: '🏠 Главная', callback_data: 'back_to_main' }
            ],
            // 🎨 ОБРАБОТКА ВЫБОРА МОДЕЛЕЙ FREEPIK
            [
              { text: '⚡ Flux', callback_data: 'freepik_flux' },
              { text: '🔮 Mystic', callback_data: 'freepik_mystic' },
              { text: '🌟 Seedream v4', callback_data: 'freepik_seedream' }
            ]
    case 'freepik_seedream':
      userStates.set(userId, { state: 'waiting_image_prompt', service: 'freepik', data: { model: 'seedream-v4' } });
      await ctx.editMessageText(
        "🌟 **Seedream v4** - Новейшая модель Freepik\n\n📝 Отправьте описание изображения:\n\n💡 Пример: \"Красивый закат над океаном в стиле аниме\"",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ К моделям', callback_data: 'image_freepik' }]
            ]
          }
        }
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
        `🧠 **ChatGPT-4:**\n\n${result.data.content}\n\n💰 Потрачено токенов: ${result.tokensUsed}\n\n💬 Продолжайте диалог или напишите "стоп" для завершения.`
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
        `🔮 **GPT-4 Vision:**\n\n${result.data.content}\n\n💰 Потрачено токенов: ${result.tokensUsed}\n\n📸 Отправьте еще изображение или напишите "стоп".`
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
