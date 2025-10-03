import { Bot } from "grammy";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prismaClient";

const bot = new Bot(process.env.BOT_TOKEN!);

console.log("🤖 Starting simple bot with token:", process.env.BOT_TOKEN?.substring(0, 10) + "...");

// Простое главное меню
const mainMenu = {
  inline_keyboard: [
    [
      { text: '🎨 Создать изображение', callback_data: 'create_image' },
      { text: '🎬 Создать видео', callback_data: 'create_video' }
    ],
    [
      { text: '💬 Чат с AI', callback_data: 'chat_ai' },
      { text: '📊 Профиль', callback_data: 'profile' }
    ],
    [
      { text: '💰 Купить токены', callback_data: 'buy_tokens' }
    ]
  ]
};

// Команда /start
bot.command("start", async (ctx) => {
  console.log("📨 Received /start command from user:", ctx.from?.id);
  
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      console.log("❌ No user ID found");
      return;
    }

    console.log("💾 Creating/updating user in database...");
    
    // Создаем или обновляем пользователя
    const user = await prisma.user.upsert({
      where: { telegramId: userId },
      update: { 
        username: ctx.from?.username || undefined,
        firstName: ctx.from?.first_name || undefined,
        lastName: ctx.from?.last_name || undefined
      },
      create: {
        telegramId: userId,
        username: ctx.from?.username || undefined,
        firstName: ctx.from?.first_name || undefined,
        lastName: ctx.from?.last_name || undefined,
        tokens: 10 // Стартовые токены
      }
    });

    console.log("✅ User created/updated:", user.id);

    const welcomeMessage = `🎉 Добро пожаловать в AICEX AI!

🤖 Я ваш AI помощник для создания:
• 🎨 Изображений (Midjourney, DALL-E)
• 🎬 Видео (Runway, Kling)
• 💬 Чат с лучшими AI моделями

🎁 Вам начислено ${user.tokens} токенов!

Выберите действие:`;

    await ctx.reply(welcomeMessage, {
      reply_markup: mainMenu
    });

    console.log("✅ Welcome message sent");

  } catch (error) {
    console.error("❌ Error in start command:", error);
    await ctx.reply("❌ Произошла ошибка при запуске бота. Попробуйте еще раз.");
  }
});

// Обработка callback кнопок
bot.on("callback_query", async (ctx) => {
  console.log("🔘 Received callback:", ctx.callbackQuery.data);
  
  await ctx.answerCallbackQuery();
  
  const data = ctx.callbackQuery.data;
  
  switch (data) {
    case 'create_image':
      await ctx.editMessageText(
        "🎨 Генерация изображений\n\nОтправьте описание изображения которое хотите создать:",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
      break;

    case 'create_video':
      await ctx.editMessageText(
        "🎬 Генерация видео\n\nОтправьте описание видео которое хотите создать:",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
      break;

    case 'chat_ai':
      await ctx.editMessageText(
        "💬 Чат с AI\n\nВыберите AI модель:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🧠 ChatGPT-4', callback_data: 'chat_gpt4' },
                { text: '🤖 Claude', callback_data: 'chat_claude' }
              ],
              [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
      break;

    case 'profile':
      try {
        const user = await prisma.user.findUnique({
          where: { telegramId: ctx.from?.id }
        });

        const profileText = `👤 Ваш профиль

💰 Токены: ${user?.tokens || 0}
📊 Подписка: Базовая
📅 Регистрация: ${user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}

🎨 Создано изображений: 0
🎬 Создано видео: 0
💬 Сообщений с AI: 0`;

        await ctx.editMessageText(profileText, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💰 Купить токены', callback_data: 'buy_tokens' }
              ],
              [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
            ]
          }
        });
      } catch (error) {
        console.error("Error getting profile:", error);
        await ctx.reply("❌ Ошибка получения профиля");
      }
      break;

    case 'buy_tokens':
      await ctx.editMessageText(
        `💰 Пакеты токенов

🥉 Стартер - 150₽
   • 200 токенов (~25 изображений)

🥈 Популярный - 500₽ 
   • 750 токенов (~95 изображений)
   • +50% бонус!

🥇 Профи - 1000₽
   • 1600 токенов (~200 изображений)
   • +60% бонус!

💎 Безлимит - 2000₽/мес
   • Неограниченные токены
   • Приоритетная очередь`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🥉 Стартер', callback_data: 'buy_starter' },
                { text: '🥈 Популярный', callback_data: 'buy_popular' }
              ],
              [
                { text: '🥇 Профи', callback_data: 'buy_pro' },
                { text: '💎 Безлимит', callback_data: 'buy_unlimited' }
              ],
              [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
      break;

    case 'back_to_main':
      await ctx.editMessageText(
        "🎯 Главное меню\n\nВыберите действие:",
        { reply_markup: mainMenu }
      );
      break;

    default:
      if (data?.startsWith('buy_')) {
        const packageName = data.replace('buy_', '');
        await ctx.reply(`💳 Переход к оплате пакета "${packageName}"...\n\n(Интеграция с платежной системой в разработке)`);
      } else {
        console.log("🤷‍♂️ Unknown callback:", data);
        await ctx.reply("🚧 Эта функция в разработке!");
      }
  }
});

// Обработка текстовых сообщений
bot.on("message:text", async (ctx) => {
  console.log("📝 Received text message:", ctx.message.text);
  
  if (ctx.message.text === "/start") {
    return; // Обрабатывается командой выше
  }
  
  // Простой ответ на любое сообщение
  await ctx.reply(
    "🤖 Я получил ваше сообщение!\n\n" +
    "Для начала работы используйте /start или выберите действие из меню.",
    { reply_markup: mainMenu }
  );
});

// Запуск бота
export async function startSimpleBot() {
  try {
    console.log("🚀 Starting simple bot...");
    
    // Проверяем токен
    const me = await bot.api.getMe();
    console.log("✅ Bot info:", me);
    
    await bot.start();
    console.log("✅ Simple bot started successfully!");
    
  } catch (error) {
    console.error("❌ Failed to start simple bot:", error);
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
