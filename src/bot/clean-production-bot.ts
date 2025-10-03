import { Bot, Context, InlineKeyboard } from "grammy";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prismaClient";
import { AIServiceManager } from "../services/ai/AIServiceManager";
import { ChatMessage } from "../services/ai/OpenAIService";
import { 
  FREEPIK_IMAGE_MODELS, 
  FREEPIK_VIDEO_MODELS, 
  getPopularImageModels, 
  getPopularVideoModels, 
  getImageModelById, 
  getVideoModelById 
} from "../services/ai/FreepikModels";
import { MainMenu } from "./menus/MainMenu";

const bot = new Bot(process.env.BOT_TOKEN!);
const aiManager = new AIServiceManager();

console.log("🤖 Starting AICEX Clean Production Bot...");

// Состояния пользователей
const userStates = new Map<number, any>();

const mainMenu = MainMenu.getMenu('main');

// 🎨 МЕНЮ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
const imageMenu = MainMenu.getImageMenu();

// 🎬 МЕНЮ ГЕНЕРАЦИИ ВИДЕО
const videoMenu = MainMenu.getVideoMenu();

// 💬 МЕНЮ ЧАТА С AI
const chatMenu = MainMenu.getChatMenu();

// 🎨 МЕНЮ МОДЕЛЕЙ FREEPIK ИЗОБРАЖЕНИЙ
function getFreepikImageModelsMenu() {
  const popularModels = getPopularImageModels();
  const keyboard = popularModels.map(model => [{
    text: `${model.isNew ? '🆕 ' : ''}${model?.name || 'Модель'}`,
    callback_data: `freepik_img_${model.id}`
  }]);
  
  keyboard.push([
    { text: '📋 Все модели', callback_data: 'freepik_all_images' }
  ]);
  
  keyboard.push([
    { text: '⬅️ Назад', callback_data: 'generate_image' }
  ]);
  
  return { inline_keyboard: keyboard };
}

// 🎬 МЕНЮ МОДЕЛЕЙ FREEPIK ВИДЕО (включая MiniMax, исключая только Kling)
function getFreepikVideoModelsMenu() {
  const freepikModels = FREEPIK_VIDEO_MODELS.filter(model => 
    !model.id.includes('kling')
  );
  
  const keyboard = freepikModels.map(model => [{
    text: `${model.isNew ? '🆕 ' : ''}${model?.name || 'Модель'} ${model.resolution ? `(${model.resolution})` : ''}`,
    callback_data: `freepik_vid_${model.id}`
  }]);
  
  keyboard.push([
    { text: '⬅️ Назад', callback_data: 'generate_video' }
  ]);
  
  return { inline_keyboard: keyboard };
}

// 🚀 МЕНЮ МОДЕЛЕЙ RUNWAY (пока пустое - интеграция в разработке)
function getRunwayVideoModelsMenu() {
  const keyboard = [
    [{ text: '🚧 В разработке', callback_data: 'runway_coming_soon' }],
    [{ text: '⬅️ Назад', callback_data: 'generate_video' }]
  ];
  
  return { inline_keyboard: keyboard };
}

// 🔥 МЕНЮ МОДЕЛЕЙ KLING (Kling модели из Freepik)
function getKlingVideoModelsMenu() {
  const klingModels = FREEPIK_VIDEO_MODELS.filter(model => 
    model.id.includes('kling')
  );
  
  const keyboard = klingModels.map(model => [{
    text: `${model.isNew ? '🆕 ' : ''}${model?.name || 'Модель'}`,
    callback_data: `kling_vid_${model.id}`
  }]);
  
  keyboard.push([
    { text: '⬅️ Назад', callback_data: 'generate_video' }
  ]);
  
  return { inline_keyboard: keyboard };
}

// 📋 ВСЕ МОДЕЛИ ИЗОБРАЖЕНИЙ
function getAllFreepikImageModelsMenu() {
  const keyboard = FREEPIK_IMAGE_MODELS.map(model => [{
    text: `${model.isNew ? '🆕 ' : ''}${model?.name || 'Модель'}`,
    callback_data: `freepik_img_${model.id}`
  }]);
  
  keyboard.push([
    { text: '⬅️ Назад', callback_data: 'image_freepik' }
  ]);
  
  return { inline_keyboard: keyboard };
}

// 📋 ВСЕ МОДЕЛИ ВИДЕО
function getAllFreepikVideoModelsMenu() {
  const keyboard = FREEPIK_VIDEO_MODELS.map(model => [{
    text: `${model.isNew ? '🆕 ' : ''}${model?.name || 'Модель'} ${model.resolution ? `(${model.resolution})` : ''}`,
    callback_data: `freepik_vid_${model.id}`
  }]);
  
  keyboard.push([
    { text: '⬅️ Назад', callback_data: 'video_freepik' }
  ]);
  
  return { inline_keyboard: keyboard };
}

// 🎯 ПОКАЗАТЬ ГЛАВНОЕ МЕНЮ
async function showMainMenu(ctx: Context) {
  const text = MainMenu.getText('main');
  try {
    await ctx.editMessageText(text, { reply_markup: MainMenu.getMenu('main') });
  } catch {
    await ctx.reply(text, { reply_markup: mainMenu });
  }
}

// 🚀 КОМАНДА /start
bot.command("start", async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    // Создаем или обновляем пользователя
    await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: ctx.from?.username || undefined,
        firstName: ctx.from?.first_name || undefined,
        lastName: ctx.from?.last_name || undefined
      },
      update: {
        username: ctx.from?.username || undefined,
        firstName: ctx.from?.first_name || undefined,
        lastName: ctx.from?.last_name || undefined
      }
    });

    try {
      logger.info("Getting welcome text...");
      const welcomeText = MainMenu.getText('start');
      logger.info("Welcome text received, length:", welcomeText?.length);
      
      logger.info("Getting menu...");
      const menu = MainMenu.getMenu('start');
      logger.info("Menu created successfully");
      
      logger.info("Sending reply...");
      await ctx.reply(welcomeText, { reply_markup: menu });
      logger.info("✅ /start completed successfully");
    } catch (innerError) {
      logger.error("Inner error occurred:", innerError);
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    logger.error("=== ERROR CAUGHT ===");
    logger.error("Error is null/undefined:", error === null || error === undefined);
    logger.error("Error value:", error);
    logger.error("Error type:", typeof error);
    
    if (error) {
      logger.error("Error constructor:", error?.constructor?.name);
      logger.error("Error message:", error?.message);
      logger.error("Error stack:", error?.stack);
      logger.error("Error toString:", error.toString());
      
      // Попробуем получить все свойства объекта
      try {
        logger.error("Error keys:", Object.keys(error));
        logger.error("Full error object:", JSON.stringify(error, null, 2));
      } catch (jsonError) {
        logger.error("Failed to stringify error:", jsonError);
      }
    }
    
    logger.error("=== END ERROR INFO ===");
    
    try {
      await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
    } catch (replyError) {
      logger.error("Failed to send error message:", replyError);
    }
  }
});

// 📊 КОМАНДА /stats
bot.command("stats", async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        _count: {
          select: {
            generationHistory: true
          }
        }
      }
    });

    if (!user) {
      await ctx.reply("❌ Пользователь не найден");
      return;
    }

    const statsText = `📊 Ваша статистика:

👤 ID: ${user.telegramId}
📝 Имя: ${user.firstName} ${user.lastName}
🔗 Username: @${user.username || 'не указан'}

💰 Баланс: ${user.tokens || 0} токенов
🎨 Генераций: ${user._count?.generationHistory || 0}

📅 Регистрация: ${user.createdAt.toLocaleDateString()}`;

    await ctx.reply(statsText);
  } catch (error) {
    logger.error("Error in /stats:", error);
    await ctx.reply("❌ Ошибка при получении статистики");
  }
});

// 🎯 ОБРАБОТКА CALLBACK ЗАПРОСОВ
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  
  if (!userId) return;

  try {
    switch (data) {
      // 🎨 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ
      case 'generate_image':
        await ctx.editMessageText(
          "🎨 Генерация изображений\n\nВыберите сервис:",
          { reply_markup: imageMenu }
        );
        break;

      case 'image_freepik':
        const imageModelsText = `🎨 Freepik AI - Генерация изображений

Популярные модели:
${getPopularImageModels().map(m => `• ${m.name} - ${m.description}`).join('\n')}

Выберите модель:`;
        
        await ctx.editMessageText(imageModelsText, { 
          reply_markup: getFreepikImageModelsMenu() 
        });
        break;

      case 'freepik_all_images':
        const allImageModelsText = `🎨 Все модели Freepik для изображений

Доступно ${FREEPIK_IMAGE_MODELS.length} моделей:`;
        
        await ctx.editMessageText(allImageModelsText, { 
          reply_markup: getAllFreepikImageModelsMenu() 
        });
        break;

      case 'image_dalle':
        userStates.set(userId, { 
          state: 'waiting_image_prompt', 
          service: 'dalle' 
        });
        
        await ctx.editMessageText(
          "🖼️ DALL-E 3\n\nВведите описание изображения:",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
        break;

      // 🎬 ГЕНЕРАЦИЯ ВИДЕО
      case 'generate_video':
        await ctx.editMessageText(
          "🎬 Генерация видео\n\nВыберите сервис:",
          { reply_markup: videoMenu }
        );
        break;

      case 'video_freepik':
        const freepikVideoText = `🎬 Freepik Video - Генерация видео

Доступные модели:
• PixVerse V5 - новая модель с переходами
• Seedance Pro - профессиональное качество
• MiniMax Hailuo - высокое качество видео

Выберите модель:`;
        
        await ctx.editMessageText(freepikVideoText, { 
          reply_markup: getFreepikVideoModelsMenu() 
        });
        break;

      case 'video_runway':
        const runwayVideoText = `🚀 Runway ML - Генерация видео

Интеграция с Runway ML находится в разработке.
Скоро будут доступны новые модели!

Пока используйте другие сервисы.`;
        
        await ctx.editMessageText(runwayVideoText, { 
          reply_markup: getRunwayVideoModelsMenu() 
        });
        break;

      case 'video_kling':
        const klingVideoText = `🔥 Kling AI - Генерация видео

Доступные модели:
• Kling v2.5 Pro - новейшая версия
• Kling Pro v2.1 - профессиональная
• Kling Master - мастер версия

Выберите модель:`;
        
        await ctx.editMessageText(klingVideoText, { 
          reply_markup: getKlingVideoModelsMenu() 
        });
        break;

      case 'freepik_all_videos':
        const allVideoModelsText = `🎬 Все модели Freepik для видео

Доступно ${FREEPIK_VIDEO_MODELS.length} моделей:`;
        
        await ctx.editMessageText(allVideoModelsText, { 
          reply_markup: getAllFreepikVideoModelsMenu() 
        });
        break;

      // 💬 ЧАТ С AI
      case 'chat_ai':
        await ctx.editMessageText(
          "💬 Чат с AI\n\nВыберите модель:",
          { reply_markup: chatMenu }
        );
        break;

      case 'chat_gpt4':
        userStates.set(userId, { 
          state: 'chatting', 
          model: 'gpt-4' 
        });
        
        await ctx.editMessageText(
          "🤖 ChatGPT-4\n\nНачните диалог. Отправьте сообщение:",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
        break;


      // 🛑 СТОП ЧАТ
      case 'stop_chat':
        userStates.delete(userId);
        await showMainMenu(ctx);
        await ctx.answerCallbackQuery("✅ Чат остановлен");
        break;

      // 🔙 НАЗАД
      case 'back_to_main':
        userStates.delete(userId);
        await showMainMenu(ctx);
        break;

      default:
        // 🔄 ПОВТОРИТЬ ЧАТ
        if (data?.startsWith('repeat_chat_')) {
          const model = data.replace('repeat_chat_', '');
          userStates.set(userId, { 
            state: 'chatting', 
            model: model 
          });
          
          await ctx.editMessageText(
            `🔄 Продолжаем чат с ${model}\n\nОтправьте новое сообщение:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
                ]
              }
            }
          );
        }
        // 🎨 ОБРАБОТКА ВЫБОРА МОДЕЛИ ИЗОБРАЖЕНИЙ
        if (data?.startsWith('freepik_img_')) {
          const modelId = data.replace('freepik_img_', '');
          const model = getImageModelById(modelId);
          
          if (model) {
            userStates.set(userId, { 
              state: 'waiting_image_prompt', 
              service: 'freepik', 
              model: modelId 
            });
            
            await ctx.editMessageText(
              `🎨 ${model?.name || 'Неизвестная модель'}\n${model?.description || 'Описание недоступно'}\n\n💰 Стоимость: 5 токенов\n\nВведите описание изображения:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
                  ]
                }
              }
            );
          } else {
            // Если модель не найдена, используем fallback
            userStates.set(userId, { 
              state: 'waiting_image_prompt', 
              service: 'freepik', 
              model: 'flux-dev' // fallback модель
            });
            
            await ctx.editMessageText(
              `🎨 Генерация изображения\n\n💰 Стоимость: 5 токенов\n\nВведите описание изображения:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
                  ]
                }
              }
            );
          }
        }
        
        // 🎬 ОБРАБОТКА ВЫБОРА МОДЕЛИ ВИДЕО - FREEPIK
        if (data?.startsWith('freepik_vid_')) {
          const modelId = data.replace('freepik_vid_', '');
          const model = getVideoModelById(modelId);
          
          if (model) {
            userStates.set(userId, { 
              state: 'waiting_video_prompt', 
              service: 'freepik', 
              model: modelId 
            });
            
            await ctx.editMessageText(
              `🎬 ${model?.name || 'Неизвестная модель'}\n${model?.description || 'Описание недоступно'}\n\n💰 Стоимость: 10 токенов\n\nВведите описание видео:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
                  ]
                }
              }
            );
          } else {
            // Если модель не найдена, используем fallback
            userStates.set(userId, { 
              state: 'waiting_video_prompt', 
              service: 'freepik', 
              model: 'kling-v2-5-pro' // fallback модель для видео
            });
            
            await ctx.editMessageText(
              `🎬 Генерация видео\n\n💰 Стоимость: 10 токенов\n\nВведите описание видео:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
                  ]
                }
              }
            );
          }
        }
        
        // 🚧 ОБРАБОТКА "В РАЗРАБОТКЕ"
        if (data === 'runway_coming_soon') {
          await ctx.answerCallbackQuery("🚧 Runway ML интеграция в разработке. Скоро будет доступна!");
          return;
        }
        
        // 🔥 ОБРАБОТКА ВЫБОРА МОДЕЛИ ВИДЕО - KLING
        if (data?.startsWith('kling_vid_')) {
          const modelId = data.replace('kling_vid_', '');
          const model = getVideoModelById(modelId);
          
          if (model) {
            userStates.set(userId, { 
              state: 'waiting_video_prompt', 
              service: 'kling', 
              model: modelId 
            });
            
            await ctx.editMessageText(
              `🔥 ${model?.name || 'Неизвестная модель'}\n${model?.description || 'Описание недоступно'}\n\nВведите описание видео:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🛑 Отмена', callback_data: 'back_to_main' }]
                  ]
                }
              }
            );
          }
        }
        break;
    }
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error("Error in callback query:", error);
    await ctx.answerCallbackQuery("❌ Произошла ошибка");
  }
});

// 💬 ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
bot.on("message:text", async (ctx) => {
  const userId = ctx.from?.id;
  const text = ctx.message?.text;
  
  if (!userId || !text) return;
  
  const userState = userStates.get(userId);
  
  if (!userState) {
    await showMainMenu(ctx);
    return;
  }

  try {
    // Получаем пользователя для контекста
    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });
    
    // 🎨 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ
    if (userState.state === 'waiting_image_prompt') {
      await ctx.reply("🎨 Генерирую изображение...");
      
      // Создаем правильный UserContext
      const userContext = {
        telegramId: userId,
        currentTokens: user?.tokens || 0
      };
            const result = await aiManager.generateImage(
              text, 
              userState.service || 'freepik',
              userContext,
              userState.model // Передаем модель из состояния пользователя
            );   
      if (result.success && result.data?.url) {
        const model = userState.model ? getImageModelById(userState.model) : null;
        const modelName = model?.name || userState.service?.toUpperCase() || 'AI';
        
        const caption = `✅ Изображение готово!
{{ ... }}
📝 Промпт: "${text}"
🎨 Модель: ${modelName}
💰 Использовано токенов: ${result.tokensUsed || 1}`;

        await ctx.replyWithPhoto(result.data.url, {
          caption,
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
        await ctx.reply(`❌ Ошибка генерации: ${result.error || 'Неизвестная ошибка'}`);
      }
      
      userStates.delete(userId);
    }
    
    // 🎬 ГЕНЕРАЦИЯ ВИДЕО
    else if (userState.state === 'waiting_video_prompt') {
      await ctx.reply("⏳ Генерирую видео... Это может занять несколько минут.");
      
      // Создаем правильный UserContext
      const userContext = {
        telegramId: userId,
        currentTokens: user?.tokens || 0
      };
      
      const result = await aiManager.generateVideo(
        text, 
        'freepik', 
        userContext
      );
      
      if (result.success && result.data?.url) {
        const model = userState.model ? getVideoModelById(userState.model) : null;
        const modelName = model?.name || 'Freepik Video';
        
        const caption = `✅ Видео готово!

📝 Промпт: "${text}"
🎬 Модель: ${modelName}
💰 Использовано токенов: ${result.tokensUsed || 5}`;

        await ctx.replyWithVideo(result.data.url, {
          caption,
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
        await ctx.reply(`❌ Ошибка генерации: ${result.error || 'Неизвестная ошибка'}`);
      }
      
      userStates.delete(userId);
    }
    
    // 💬 ЧАТ
    else if (userState.state === 'chatting') {
      const messages: ChatMessage[] = userState.messages || [];
      messages.push({ role: 'user', content: text });
      
      await ctx.reply("💭 Думаю...");
      
      // Временное решение - просто отвечаем эхом
      const replyText = `🤖 AI отвечает:

Вы сказали: "${text}"

💰 Использовано токенов: 1

(Чат временно работает в режиме эхо)`;
      
      await ctx.reply(replyText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Повторить запрос', callback_data: `repeat_chat_${userState.model}` },
              { text: '🏠 Главная', callback_data: 'back_to_main' }
            ],
            [
              { text: '🛑 Стоп чат', callback_data: 'stop_chat' }
            ]
          ]
        }
      });
    }
  } catch (error) {
    logger.error("Error processing message:", error);
    await ctx.reply("❌ Произошла ошибка при обработке запроса");
    userStates.delete(userId);
  }
});

// 🖼️ ОБРАБОТКА ИЗОБРАЖЕНИЙ
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userState = userStates.get(userId);
  
  if (userState?.state === 'chatting' && userState.model === 'gpt-4-vision') {
    const caption = ctx.message?.caption || "Что на этом изображении?";
    
    await ctx.reply("🔮 Анализирую изображение...");
    
    // Здесь должна быть логика обработки изображения
    await ctx.reply("Vision API временно недоступен. Используйте текстовый чат.");
  }
});

// 🚀 ЗАПУСК БОТА
export async function startCleanBot() {
  try {
    await bot.start();
    console.log("✅ Clean Production Bot started successfully!");
  } catch (error) {
    logger.error("Failed to start bot:", error);
    throw error;
  }
}

// Экспорт бота
export { bot };
