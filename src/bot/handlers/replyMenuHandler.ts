import { Context } from "grammy";
import { logger } from "../../utils/logger";
import { prisma } from "../../utils/prismaClient";
import { UXHelpers } from "../utils/UXHelpers";
import * as replyKeyboards from "../keyboards/replyKeyboard";

/**
 * 🎯 ОБРАБОТЧИК REPLY KEYBOARD МЕНЮ
 * Обрабатывает текстовые сообщения от кнопок меню
 */
export class ReplyMenuHandler {
  
  /**
   * Главный обработчик текстовых команд от Reply Keyboard
   */
  static async handleMenuCommand(ctx: Context, text: string) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    logger.info(`📱 Menu command: "${text}" from user ${userId}`);

    // Получаем информацию о пользователе
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      select: { tokens: true, subscription: true }
    });

    const userTokens = user?.tokens || 0;

    // Обработка команд главного меню
    switch (text) {
      // ========== AI СЕРВИСЫ ==========
      case "💡 ChatGPT":
        await this.handleChatGPT(ctx, userId);
        return true;

      case "🌄 Midjourney":
        await this.handleMidjourney(ctx, userId);
        return true;

      case "🎨 Freepik":
        await this.handleFreepik(ctx, userId);
        return true;

      case "🎬 Runway":
        await this.handleRunway(ctx, userId);
        return true;

      case "📹 Kling":
        await this.handleKling(ctx, userId);
        return true;

      // ========== ПРОФИЛЬ И БАЛАНС ==========
      case "💰 Баланс":
        await this.handleBalance(ctx, userId, userTokens);
        return true;

      case "📊 Профиль":
        await this.handleProfile(ctx, userId, user);
        return true;

      case "❓ Помощь":
        await this.handleHelp(ctx);
        return true;

      // ========== ВОЗВРАТ В ГЛАВНОЕ МЕНЮ ==========
      case "🔙 Главное меню":
        await this.handleBackToMain(ctx, userId);
        return true;

      // ========== ПОДМЕНЮ ==========
      // ChatGPT подменю
      case "💬 Новый чат":
        await this.handleNewChat(ctx, userId);
        return true;

      case "📝 Продолжить":
        await this.handleContinueChat(ctx, userId);
        return true;

      case "⚙️ Настройки GPT":
        await this.handleGPTSettings(ctx, userId);
        return true;

      // Midjourney подменю
      case "🎨 Создать изображение":
        await this.handleCreateImage(ctx, userId, "midjourney");
        return true;

      case "⚙️ Настройки MJ":
        await this.handleMJSettings(ctx, userId);
        return true;

      // Freepik подменю
      case "🖼️ Создать изображение":
        await this.handleCreateImage(ctx, userId, "freepik");
        return true;

      case "⚙️ Настройки Freepik":
        await this.handleFreepikSettings(ctx, userId);
        return true;

      case "📚 Стили":
        await this.handleFreepikStyles(ctx, userId);
        return true;

      // Runway подменю
      case "🎥 Создать видео":
        await this.handleCreateVideo(ctx, userId, "runway");
        return true;

      case "⚙️ Настройки Runway":
        await this.handleRunwaySettings(ctx, userId);
        return true;

      // Kling подменю
      case "🎬 Создать видео":
        await this.handleCreateVideo(ctx, userId, "kling");
        return true;

      case "⚙️ Настройки Kling":
        await this.handleKlingSettings(ctx, userId);
        return true;

      // Баланс подменю
      case "💳 Купить токены":
        await this.handleBuyTokens(ctx, userId);
        return true;

      case "📊 История":
        await this.handleHistory(ctx, userId);
        return true;

      case "🎁 Подписка":
        await this.handleSubscription(ctx, userId);
        return true;

      // Профиль подменю
      case "💰 Токены":
        await this.handleTokensInfo(ctx, userId, userTokens);
        return true;

      case "📈 Статистика":
        await this.handleStatistics(ctx, userId);
        return true;

      case "⚙️ Настройки":
        await this.handleSettings(ctx, userId);
        return true;

      default:
        return false;
    }
  }

  // ========================================
  // ОБРАБОТЧИКИ ГЛАВНОГО МЕНЮ
  // ========================================

  static async handleChatGPT(ctx: Context, userId: number) {
    await ctx.reply(
      "💡 <b>ChatGPT</b>\n\n" +
      "🤖 Умный AI-ассистент для диалогов\n" +
      "🎯 Может помочь с:\n" +
      "• Ответами на вопросы\n" +
      "• Написанием текстов\n" +
      "• Анализом информации\n" +
      "• Переводом\n\n" +
      "Выберите действие:",
      {
        reply_markup: replyKeyboards.chatGPTKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleMidjourney(ctx: Context, userId: number) {
    await ctx.reply(
      "🌄 <b>Midjourney</b>\n\n" +
      "🎨 Создание художественных изображений\n" +
      "💎 Высокое качество\n" +
      "⚡ Стоимость: 8 токенов\n\n" +
      "Выберите действие:",
      {
        reply_markup: replyKeyboards.midjourneyKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleFreepik(ctx: Context, userId: number) {
    await ctx.reply(
      "🎨 <b>Freepik AI</b>\n\n" +
      "🖼️ 30+ моделей для генерации\n" +
      "⚡ Быстрая генерация\n" +
      "💰 От 2 токенов\n\n" +
      "Выберите действие:",
      {
        reply_markup: replyKeyboards.freepikKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleRunway(ctx: Context, userId: number) {
    await ctx.reply(
      "🎬 <b>Runway</b>\n\n" +
      "🎥 Создание видео из текста или изображений\n" +
      "⚡ Высокое качество\n" +
      "💰 Стоимость: 15 токенов\n\n" +
      "Выберите действие:",
      {
        reply_markup: replyKeyboards.runwayKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleKling(ctx: Context, userId: number) {
    await ctx.reply(
      "📹 <b>Kling AI</b>\n\n" +
      "🎬 Генерация видео\n" +
      "⚡ Быстрая обработка\n" +
      "💰 Стоимость: 12 токенов\n\n" +
      "Выберите действие:",
      {
        reply_markup: replyKeyboards.klingKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleBalance(ctx: Context, userId: number, tokens: number) {
    const stats = await UXHelpers.getUserStats(userId);
    
    await ctx.reply(
      "💰 <b>Ваш баланс</b>\n\n" +
      `💎 Токенов: ${tokens}\n` +
      `📊 Всего потрачено: ${stats?.totalSpent || 0}\n` +
      `🎨 Всего генераций: ${stats?.totalGenerations || 0}\n\n` +
      "Выберите действие:",
      {
        reply_markup: replyKeyboards.balanceKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleProfile(ctx: Context, userId: number, user: any) {
    const stats = await UXHelpers.getUserStats(userId);
    
    await ctx.reply(
      "👤 <b>Ваш профиль</b>\n\n" +
      `💰 Токены: ${user?.tokens || 0}\n` +
      `📊 Подписка: ${user?.subscription || "Базовая"}\n` +
      `🎨 Генераций: ${stats?.totalGenerations || 0}\n\n` +
      "Выберите действие:",
      {
        reply_markup: replyKeyboards.profileKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleHelp(ctx: Context) {
    await ctx.reply(
      "❓ <b>Помощь</b>\n\n" +
      "🤖 <b>AICEX One</b> - универсальный AI-бот\n\n" +
      "🎯 <b>Доступные сервисы:</b>\n" +
      "• 💡 ChatGPT - AI-диалоги\n" +
      "• 🌄 Midjourney - художественные изображения\n" +
      "• 🎨 Freepik - 30+ моделей для генерации\n" +
      "• 🎬 Runway - создание видео\n" +
      "• 📹 Kling - генерация видео\n\n" +
      "💰 <b>Как работают токены:</b>\n" +
      "Каждая генерация стоит токены\n" +
      "Вы можете купить токены или оформить подписку\n\n" +
      "📞 <b>Поддержка:</b> @aicex_support",
      {
        reply_markup: replyKeyboards.mainMenuKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleBackToMain(ctx: Context, userId: number) {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      select: { tokens: true }
    });

    await ctx.reply(
      "🏠 <b>Главное меню</b>\n\n" +
      `💰 Ваших токенов: ${user?.tokens || 0}\n\n` +
      "Выберите AI-сервис:",
      {
        reply_markup: replyKeyboards.mainMenuKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  // ========================================
  // ОБРАБОТЧИКИ ПОДМЕНЮ
  // ========================================

  static async handleNewChat(ctx: Context, userId: number) {
    UXHelpers.setUserState(userId, {
      currentAction: "waiting_for_chat_message",
      data: { service: "chatgpt", isNewChat: true }
    });

    await ctx.reply(
      "💬 <b>Новый чат с ChatGPT</b>\n\n" +
      "Напишите ваше сообщение:",
      {
        reply_markup: replyKeyboards.backToMainKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleContinueChat(ctx: Context, userId: number) {
    UXHelpers.setUserState(userId, {
      currentAction: "waiting_for_chat_message",
      data: { service: "chatgpt", isNewChat: false }
    });

    await ctx.reply(
      "📝 <b>Продолжаем диалог</b>\n\n" +
      "Напишите ваше сообщение:",
      {
        reply_markup: replyKeyboards.backToMainKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleGPTSettings(ctx: Context, userId: number) {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      select: { gptSettings: true }
    });

    const settings = user?.gptSettings as any;

    await ctx.reply(
      "⚙️ <b>Настройки ChatGPT</b>\n\n" +
      `🤖 Модель: ${settings?.model || "gpt-4"}\n` +
      `🎤 Аудио-ответ: ${settings?.audioResponse ? "Вкл" : "Выкл"}\n` +
      `🗣️ Голос: ${settings?.voice || "alloy"}\n\n` +
      "Для изменения настроек перейдите в веб-версию",
      {
        reply_markup: replyKeyboards.chatGPTKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleCreateImage(ctx: Context, userId: number, service: string) {
    UXHelpers.setUserState(userId, {
      currentAction: "waiting_image_prompt",
      data: { service }
    });

    await ctx.reply(
      `🎨 <b>Создание изображения (${service})</b>\n\n` +
      "📝 Опишите какое изображение вы хотите создать:\n\n" +
      "💡 <i>Совет: Чем подробнее описание, тем лучше результат</i>",
      {
        reply_markup: replyKeyboards.backToMainKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleMJSettings(ctx: Context, userId: number) {
    await ctx.reply(
      "⚙️ <b>Настройки Midjourney</b>\n\n" +
      "Для изменения настроек перейдите в веб-версию",
      {
        reply_markup: replyKeyboards.midjourneyKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleFreepikSettings(ctx: Context, userId: number) {
    await ctx.reply(
      "⚙️ <b>Настройки Freepik</b>\n\n" +
      "Для изменения настроек перейдите в веб-версию",
      {
        reply_markup: replyKeyboards.freepikKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleFreepikStyles(ctx: Context, userId: number) {
    await ctx.reply(
      "📚 <b>Популярные стили Freepik:</b>\n\n" +
      "• 🎨 Artistic - художественный стиль\n" +
      "• 📸 Photorealistic - фотореализм\n" +
      "• 🎭 Anime - аниме стиль\n" +
      "• 🏛️ Classic - классический\n" +
      "• 🌈 Colorful - яркие цвета\n\n" +
      "Просто укажите стиль в описании!",
      {
        reply_markup: replyKeyboards.freepikKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleCreateVideo(ctx: Context, userId: number, service: string) {
    UXHelpers.setUserState(userId, {
      currentAction: "waiting_video_prompt",
      data: { service }
    });

    await ctx.reply(
      `🎬 <b>Создание видео (${service})</b>\n\n` +
      "📝 Опишите какое видео вы хотите создать:\n\n" +
      "💡 <i>Совет: Опишите сцену, действие, стиль</i>",
      {
        reply_markup: replyKeyboards.backToMainKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleRunwaySettings(ctx: Context, userId: number) {
    await ctx.reply(
      "⚙️ <b>Настройки Runway</b>\n\n" +
      "Для изменения настроек перейдите в веб-версию",
      {
        reply_markup: replyKeyboards.runwayKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleKlingSettings(ctx: Context, userId: number) {
    await ctx.reply(
      "⚙️ <b>Настройки Kling</b>\n\n" +
      "Для изменения настроек перейдите в веб-версию",
      {
        reply_markup: replyKeyboards.klingKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleBuyTokens(ctx: Context, userId: number) {
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://aicexonefrontend-production.up.railway.app";
    
    await ctx.reply(
      "💳 <b>Покупка токенов</b>\n\n" +
      "📦 <b>Доступные пакеты:</b>\n\n" +
      "🥉 Стартер - 150₽ (200 токенов)\n" +
      "🥈 Популярный - 500₽ (750 токенов)\n" +
      "🥇 Профи - 1000₽ (1600 токенов)\n\n" +
      "🎁 <b>Подписки:</b>\n" +
      "💎 Base - 500₽/мес\n" +
      "⭐ Pro - 1500₽/мес\n" +
      "👑 Premium - 3000₽/мес\n\n" +
      `🌐 Перейдите в веб-версию для покупки:\n${FRONTEND_URL}/buy-tokens`,
      {
        reply_markup: replyKeyboards.balanceKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleHistory(ctx: Context, userId: number) {
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://aicexonefrontend-production.up.railway.app";
    
    await ctx.reply(
      "📊 <b>История операций</b>\n\n" +
      `🌐 Перейдите в веб-версию для просмотра истории:\n${FRONTEND_URL}/history`,
      {
        reply_markup: replyKeyboards.balanceKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleSubscription(ctx: Context, userId: number) {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      select: { subscription: true }
    });

    const FRONTEND_URL = process.env.FRONTEND_URL || "https://aicexonefrontend-production.up.railway.app";

    await ctx.reply(
      "🎁 <b>Подписка</b>\n\n" +
      `Текущая подписка: ${user?.subscription || "Отсутствует"}\n\n` +
      "📦 <b>Доступные подписки:</b>\n\n" +
      "💎 Base - 500₽/мес\n" +
      "• 1000 токенов/месяц\n" +
      "• Все базовые функции\n\n" +
      "⭐ Pro - 1500₽/мес\n" +
      "• 3500 токенов/месяц\n" +
      "• Приоритетная обработка\n\n" +
      "👑 Premium - 3000₽/мес\n" +
      "• Безлимитные токены\n" +
      "• Все премиум функции\n\n" +
      `🌐 Оформить подписку:\n${FRONTEND_URL}/subscription`,
      {
        reply_markup: replyKeyboards.balanceKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleTokensInfo(ctx: Context, userId: number, tokens: number) {
    await ctx.reply(
      "💰 <b>Информация о токенах</b>\n\n" +
      `💎 У вас: ${tokens} токенов\n\n` +
      "📊 <b>Стоимость генераций:</b>\n" +
      "• ChatGPT - 1-3 токена/сообщение\n" +
      "• Freepik - 2-5 токенов/изображение\n" +
      "• Midjourney - 8 токенов/изображение\n" +
      "• Runway - 15 токенов/видео\n" +
      "• Kling - 12 токенов/видео",
      {
        reply_markup: replyKeyboards.profileKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleStatistics(ctx: Context, userId: number) {
    const stats = await UXHelpers.getUserStats(userId);
    
    await ctx.reply(
      "📈 <b>Ваша статистика</b>\n\n" +
      `🎨 Всего генераций: ${stats?.totalGenerations || 0}\n` +
      `💰 Потрачено токенов: ${stats?.totalSpent || 0}\n` +
      `💬 Сообщений в чатах: ${stats?.chatMessages || 0}\n` +
      `📅 Дней с нами: ${stats?.daysActive || 0}`,
      {
        reply_markup: replyKeyboards.profileKeyboard,
        parse_mode: "HTML"
      }
    );
  }

  static async handleSettings(ctx: Context, userId: number) {
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://aicexonefrontend-production.up.railway.app";
    
    await ctx.reply(
      "⚙️ <b>Настройки</b>\n\n" +
      `🌐 Перейдите в веб-версию для изменения настроек:\n${FRONTEND_URL}/settings`,
      {
        reply_markup: replyKeyboards.profileKeyboard,
        parse_mode: "HTML"
      }
    );
  }
}

