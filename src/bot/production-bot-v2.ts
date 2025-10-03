import { Bot, Context, InlineKeyboard } from "grammy";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prismaClient";
import { accessControlService } from "../services/AccessControlService";
import { subscriptionService } from "../services/SubscriptionService";
import { generationLogService } from "../services/GenerationLogService";
import { integratedGenerationService } from "../services/IntegratedGenerationService";

const bot = new Bot(process.env.BOT_TOKEN!);

console.log("🚀 Starting AICEX Production Bot v2 with Access Control...");

// Состояния пользователей
const userStates = new Map<number, any>();

/**
 * Создает пользователя если его нет в БД
 */
async function ensureUser(ctx: Context) {
  if (!ctx.from) return null;

  const telegramId = ctx.from.id;
  let user = await prisma.user.findUnique({
    where: { telegramId },
    include: { 
      subscription: { include: { plan: true } },
      balance: true
    }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        languageCode: ctx.from.language_code || 'ru',
        tokens: 100, // Стартовые токены
        balance: {
          create: {
            tokens: 100,
            freeTokens: 100,
            paidTokens: 0
          }
        }
      },
      include: { 
        subscription: { include: { plan: true } },
        balance: true
      }
    });

    logger.info('New user created:', { telegramId, username: ctx.from.username });
  }

  return user;
}

/**
 * Создает главное меню с проверкой доступа
 */
async function createMainMenu(telegramId: number) {
  const keyboard = new InlineKeyboard();

  // Получаем доступные сервисы для пользователя
  const { available, restricted } = await accessControlService.getUserAvailableServices(telegramId);

  // Кнопки генерации изображений
  if (available.includes('freepik_image') || available.includes('midjourney_basic')) {
    keyboard.text('🎨 Генерация изображений', 'generate_image').row();
  } else {
    keyboard.webApp('❌ Генерация изображений', 
      restricted['freepik_image']?.upgradeUrl || 
      `${process.env.FRONTEND_URL}/subscription`
    ).row();
  }

  // Кнопки генерации видео
  if (available.includes('freepik_video') || available.includes('runway_video')) {
    keyboard.text('🎬 Генерация видео', 'generate_video').row();
  } else {
    keyboard.webApp('❌ Генерация видео',
      restricted['freepik_video']?.upgradeUrl || 
      `${process.env.FRONTEND_URL}/subscription`
    ).row();
  }

  // ChatGPT всегда доступен в базовом режиме
  keyboard.text('💬 Чат с AI', 'chat_ai').row();

  // Кнопки управления
  keyboard.text('👤 Профиль', 'profile').text('💳 Подписка', 'subscription').row();
  keyboard.text('📊 Статистика', 'stats').text('ℹ️ Помощь', 'help').row();

  return keyboard;
}

/**
 * Создает меню генерации изображений с проверкой доступа
 */
async function createImageGenerationMenu(telegramId: number) {
  const keyboard = new InlineKeyboard();

  // Freepik изображения
  const freepikAccess = await accessControlService.checkAccess(telegramId, 'freepik_image');
  if (freepikAccess.hasAccess) {
    keyboard.text('🎨 Freepik AI', 'freepik_images').row();
  } else {
    keyboard.webApp('❌ Freepik AI', freepikAccess.upgradeUrl!).row();
  }

  // Midjourney базовый
  const midjourneyBasicAccess = await accessControlService.checkAccess(telegramId, 'midjourney_basic');
  if (midjourneyBasicAccess.hasAccess) {
    keyboard.text('🖼️ Midjourney Basic', 'midjourney_basic').row();
  } else {
    keyboard.webApp('❌ Midjourney Basic', midjourneyBasicAccess.upgradeUrl!).row();
  }

  // Midjourney Pro
  const midjourneyProAccess = await accessControlService.checkAccess(telegramId, 'midjourney_pro');
  if (midjourneyProAccess.hasAccess) {
    keyboard.text('🎯 Midjourney Pro', 'midjourney_pro').row();
  } else {
    keyboard.webApp('❌ Midjourney Pro', midjourneyProAccess.upgradeUrl!).row();
  }

  keyboard.text('⬅️ Назад', 'back_to_main').row();
  return keyboard;
}

/**
 * Создает меню генерации видео с проверкой доступа
 */
async function createVideoGenerationMenu(telegramId: number) {
  const keyboard = new InlineKeyboard();

  // Freepik видео
  const freepikVideoAccess = await accessControlService.checkAccess(telegramId, 'freepik_video');
  if (freepikVideoAccess.hasAccess) {
    keyboard.text('🎬 Freepik Video', 'freepik_videos').row();
  } else {
    keyboard.webApp('❌ Freepik Video', freepikVideoAccess.upgradeUrl!).row();
  }

  // Runway видео
  const runwayAccess = await accessControlService.checkAccess(telegramId, 'runway_video');
  if (runwayAccess.hasAccess) {
    keyboard.text('🎥 Runway AI', 'runway_videos').row();
  } else {
    keyboard.webApp('❌ Runway AI', runwayAccess.upgradeUrl!).row();
  }

  keyboard.text('⬅️ Назад', 'back_to_main').row();
  return keyboard;
}

// === КОМАНДЫ БОТА ===

bot.command("start", async (ctx) => {
  const user = await ensureUser(ctx);
  if (!user) return;

  const keyboard = await createMainMenu(user.telegramId);

  await ctx.reply(
    `🚀 *Добро пожаловать в AICEX AI Bot!*\n\n` +
    `🎨 Генерируйте изображения и видео с помощью ИИ\n` +
    `💬 Общайтесь с ChatGPT\n` +
    `🔥 Используйте самые современные AI модели\n\n` +
    `💰 Ваш баланс: *${user.tokens} токенов*\n` +
    `📊 Подписка: *${user.subscription?.plan?.displayName || 'Бесплатная'}*`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

bot.command("profile", async (ctx) => {
  const user = await ensureUser(ctx);
  if (!user) return;

  const stats = await generationLogService.getUserGenerationStats(user.telegramId);
  const subscription = user.subscription;

  let subscriptionInfo = "🆓 *Бесплатная*";
  if (subscription && subscription.status === 'ACTIVE') {
    const endDate = new Date(subscription.endDate).toLocaleDateString('ru-RU');
    subscriptionInfo = `✅ *${subscription.plan.displayName}*\nДо: ${endDate}`;
  }

  const keyboard = new InlineKeyboard()
    .webApp('💳 Управление подпиской', `${process.env.FRONTEND_URL}/subscription`)
    .row()
    .text('📊 Подробная статистика', 'detailed_stats')
    .row()
    .text('⬅️ Назад', 'back_to_main');

  await ctx.reply(
    `👤 *Ваш профиль*\n\n` +
    `💰 Баланс: *${user.tokens} токенов*\n` +
    `📊 Подписка: ${subscriptionInfo}\n\n` +
    `📈 *Статистика:*\n` +
    `• Всего генераций: ${stats.totalGenerations}\n` +
    `• Успешных: ${stats.completedGenerations}\n` +
    `• Потрачено токенов: ${stats.totalTokensUsed}\n`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

// === ОБРАБОТЧИКИ CALLBACK QUERY ===

bot.callbackQuery("back_to_main", async (ctx) => {
  const user = await ensureUser(ctx);
  if (!user) return;

  const keyboard = await createMainMenu(user.telegramId);

  await ctx.editMessageText(
    `🚀 *AICEX AI Bot - Главное меню*\n\n` +
    `💰 Баланс: *${user.tokens} токенов*\n` +
    `📊 Подписка: *${user.subscription?.plan?.displayName || 'Бесплатная'}*`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

bot.callbackQuery("generate_image", async (ctx) => {
  const user = await ensureUser(ctx);
  if (!user) return;

  const keyboard = await createImageGenerationMenu(user.telegramId);

  await ctx.editMessageText(
    `🎨 *Генерация изображений*\n\n` +
    `Выберите AI сервис для создания изображений:\n\n` +
    `💰 Ваш баланс: *${user.tokens} токенов*`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

bot.callbackQuery("generate_video", async (ctx) => {
  const user = await ensureUser(ctx);
  if (!user) return;

  const keyboard = await createVideoGenerationMenu(user.telegramId);

  await ctx.editMessageText(
    `🎬 *Генерация видео*\n\n` +
    `Выберите AI сервис для создания видео:\n\n` +
    `💰 Ваш баланс: *${user.tokens} токенов*`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

bot.callbackQuery("freepik_images", async (ctx) => {
  const user = await ensureUser(ctx);
  if (!user) return;

  // Проверяем доступ
  const access = await accessControlService.checkAccess(user.telegramId, 'freepik_image');
  if (!access.hasAccess) {
    await ctx.answerCallbackQuery({
      text: `❌ ${access.reason}`,
      show_alert: true
    });
    return;
  }

  userStates.set(user.telegramId, { 
    action: 'waiting_freepik_image_prompt',
    service: 'freepik',
    type: 'image'
  });

  const keyboard = new InlineKeyboard()
    .text('❌ Отмена', 'back_to_main');

  await ctx.editMessageText(
    `🎨 *Freepik AI - Генерация изображений*\n\n` +
    `💰 Стоимость: *5 токенов*\n` +
    `💳 Ваш баланс: *${user.tokens} токенов*\n\n` +
    `📝 Отправьте описание изображения, которое хотите создать:\n\n` +
    `*Пример:* "Красивый закат над горами в стиле акварели"`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

// Обработка текстовых сообщений
bot.on("message:text", async (ctx) => {
  const user = await ensureUser(ctx);
  if (!user) return;

  const state = userStates.get(user.telegramId);
  if (!state) return;

  const prompt = ctx.message.text;

  if (state.action === 'waiting_freepik_image_prompt') {
    // Проверяем доступ еще раз
    const access = await accessControlService.checkAccess(user.telegramId, 'freepik_image');
    if (!access.hasAccess) {
      await ctx.reply(`❌ ${access.reason}`);
      userStates.delete(user.telegramId);
      return;
    }

    await ctx.reply(
      `🎨 *Генерация начата!*\n\n` +
      `📝 Промпт: ${prompt}\n` +
      `⏳ Время ожидания: ~30-60 секунд\n` +
      `💰 Стоимость: 5 токенов\n\n` +
      `🔄 Обрабатываем ваш запрос...`,
      { parse_mode: "Markdown" }
    );

    userStates.delete(user.telegramId);

    try {
      // Используем интегрированный сервис генерации
      const result = await integratedGenerationService.generateContent({
        telegramId: user.telegramId,
        service: 'freepik',
        type: 'image',
        prompt,
        model: 'flux-dev'
      });

      if (result.success && result.resultUrl) {
        const keyboard = new InlineKeyboard()
          .text('🔄 Создать еще', 'freepik_images')
          .text('🏠 Главное меню', 'back_to_main');

        await ctx.replyWithPhoto(result.resultUrl, {
          caption: `✅ *Изображение готово!*\n\n📝 Промпт: ${prompt}\n💰 Потрачено: ${result.tokensUsed} токенов`,
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(`❌ ${result.error || 'Ошибка генерации'}`);
      }
    } catch (error: any) {
      logger.error('Generation error:', error);
      await ctx.reply('❌ Произошла ошибка при генерации изображения');
    }
  }
});
// Обработка ошибок
bot.catch((err) => {
  logger.error('Bot error:', err);
});

export async function startProductionBotV2() {
  try {
    await bot.start();
    logger.info("✅ AICEX Production Bot v2 started successfully!");
  } catch (error) {
    logger.error("❌ Failed to start bot:", error);
    throw error;
  }
}

export { bot };
