// Используем Grammy вместо node-telegram-bot-api
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prismaClient';

// Временные типы для совместимости
type TelegramBot = any;
namespace TelegramBot {
  export interface Message {
    chat: { id: number };
    from?: { id: number };
    message_id: number;
  }
  export interface CallbackQuery {
    id: string;
    message?: Message;
    from: { id: number };
    data?: string;
  }
  export interface SendMessageOptions {
    reply_markup?: any;
    parse_mode?: string;
  }
  export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
  }
  export interface InlineKeyboardButton {
    text: string;
    callback_data?: string;
    url?: string;
    web_app?: { url: string };
  }
}

/**
 * Обработчик главного меню - вдохновлен SYNTX AI
 */
export class MenuHandler {
  
  /**
   * Главное меню (улучшенная версия на основе SYNTX AI)
   */
  static getMainMenu(userTokens: number = 0): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        // Основные категории создания (как у SYNTX)
        [
          { text: '🎨 СОЗДАТЬ', callback_data: 'menu_create' },
          { text: '💬 ЧАТЫ', callback_data: 'menu_chats' }
        ],
        [
          { text: '⚡ БЫСТРО', callback_data: 'menu_quick' },
          { text: '🔥 ПОПУЛЯРНОЕ', callback_data: 'menu_popular' }
        ],
        // Пользовательские функции
        [
          { text: `💰 Токены: ${userTokens}`, callback_data: 'buy_tokens' },
          { text: '📊 Профиль', callback_data: 'profile' }
        ],
        // Web App интеграция
        [
          { 
            text: '🌐 Веб-версия', 
            web_app: { url: process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app/home' }
          }
        ]
      ]
    };
  }

  /**
   * Меню "СОЗДАТЬ" - категории по типу контента
   */
  static getCreateMenu(): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '🖼️ Изображение', callback_data: 'create_image' },
          { text: '🎬 Видео', callback_data: 'create_video' }
        ],
        [
          { text: '📝 Текст', callback_data: 'create_text' },
          { text: '🎵 Музыка', callback_data: 'create_music' }
        ],
        [
          { text: '🎙️ Озвучка', callback_data: 'create_voice' },
          { text: '🔄 Обработка', callback_data: 'create_process' }
        ],
        [
          { text: '⬅️ Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };
  }

  /**
   * Меню "ЧАТЫ" - разные типы AI помощников
   */
  static getChatsMenu(): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '🧠 Умный помощник', callback_data: 'chat_assistant' },
          { text: '📚 Эксперт', callback_data: 'chat_expert' }
        ],
        [
          { text: '🎭 Ролевые игры', callback_data: 'chat_roleplay' },
          { text: '💼 Бизнес', callback_data: 'chat_business' }
        ],
        [
          { text: '🎓 Обучение', callback_data: 'chat_learning' },
          { text: '🔍 Анализ', callback_data: 'chat_analysis' }
        ],
        [
          { text: '⬅️ Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };
  }

  /**
   * Меню "БЫСТРО" - популярные быстрые действия
   */
  static getQuickMenu(): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '⚡ Быстрое фото', callback_data: 'quick_photo' },
          { text: '🎬 Короткое видео', callback_data: 'quick_video' }
        ],
        [
          { text: '✍️ Переписать текст', callback_data: 'quick_rewrite' },
          { text: '🌍 Перевести', callback_data: 'quick_translate' }
        ],
        [
          { text: '💡 Идея для поста', callback_data: 'quick_post_idea' },
          { text: '📝 Резюме текста', callback_data: 'quick_summary' }
        ],
        [
          { text: '⬅️ Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };
  }

  /**
   * Меню создания изображений с умным выбором AI
   */
  static getImageMenu(): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        // Рекомендуемые (как у SYNTX - показываем лучшие варианты)
        [
          { text: '⭐ Рекомендуем', callback_data: 'img_recommended' }
        ],
        // По стилю
        [
          { text: '📸 Фотореализм', callback_data: 'img_photo' },
          { text: '🎨 Арт', callback_data: 'img_art' }
        ],
        [
          { text: '🎪 Аниме', callback_data: 'img_anime' },
          { text: '🏛️ Классика', callback_data: 'img_classic' }
        ],
        // По AI сервису
        [
          { text: '🎨 Midjourney (8₽)', callback_data: 'img_midjourney' },
          { text: '🖼️ DALL-E (6₽)', callback_data: 'img_dalle' }
        ],
        [
          { text: '⬅️ Назад', callback_data: 'menu_create' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };
  }

  /**
   * Обработчик callback запросов
   */
  static async handleCallback(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery) {
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (!chatId || !messageId || !data) return;

    try {
      // Получаем информацию о пользователе
      const user = await prisma.user.findUnique({
        where: { telegramId: userId }
      });

      const userTokens = user?.tokens || 0;

      switch (data) {
        case 'main_menu':
          await bot.editMessageText('🎯 Главное меню\n\nВыберите действие:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: MenuHandler.getMainMenu(userTokens)
          });
          break;

        case 'menu_create':
          await bot.editMessageText('🎨 Что хотите создать?\n\nВыберите тип контента:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: MenuHandler.getCreateMenu()
          });
          break;

        case 'menu_chats':
          await bot.editMessageText('💬 AI Помощники\n\nВыберите тип чата:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: MenuHandler.getChatsMenu()
          });
          break;

        case 'menu_quick':
          await bot.editMessageText('⚡ Быстрые действия\n\nВыберите что нужно сделать:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: MenuHandler.getQuickMenu()
          });
          break;

        case 'create_image':
          await bot.editMessageText('🖼️ Генерация изображений\n\nВыберите стиль или AI:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: MenuHandler.getImageMenu()
          });
          break;

        case 'img_recommended':
          // TODO: Implement smart AI recommendation
          await bot.sendMessage(chatId, '🤖 Умная рекомендация AI в разработке');
          break;

        case 'profile':
          await MenuHandler.showProfile(bot, chatId, messageId, user);
          break;

        case 'buy_tokens':
          await MenuHandler.showTokenPackages(bot, chatId, messageId);
          break;

        case 'img_recommended':
          // TODO: Implement handleRecommendedImage
          await bot.sendMessage(chatId, '🎨 Функция в разработке');
          break;

        default:
          // Обработка других callback'ов
          // return MenuHandler.handleRecommendedImage(bot, callbackQuery, data.split('_')[1]); // TODO: Implement
      }

      // Отвечаем на callback чтобы убрать "часики"
      await bot.answerCallbackQuery(callbackQuery.id);

    } catch (error) {
      logger.error('Menu callback error:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Произошла ошибка. Попробуйте еще раз.',
        show_alert: true
      });
    }
  }

  /**
   * Умная рекомендация AI на основе истории пользователя
    try {
      // Анализируем историю пользователя
      const recentTasks = await prisma.freepikTask.findMany({
        where: {
          userId: user.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      let recommendedAI = 'midjourney'; // по умолчанию
      let recommendedText = 'Midjourney - отлично подходит для художественных изображений';

      // Простая логика рекомендаций
      if (recentTasks.length > 0) {
        const lastStyle = recentTasks[0].style || 'N/A';
        if (lastStyle.includes('photo')) {
          recommendedAI = 'dalle';
          recommendedText = 'DALL-E - идеально для фотореалистичных изображений';
        }
      }
        inline_keyboard: [
          [
            { text: `⭐ ${recommendedText}`, callback_data: `img_${recommendedAI}` }
          ],
          [
            { text: '🎨 Другие варианты', callback_data: 'create_image' }
          ],
          [
            { text: '⬅️ Назад', callback_data: 'menu_create' }
          ]
        ]
      };

      await bot.editMessageText(
        `🤖 Рекомендация для вас:\n\n${recommendedText}\n\nИли выберите другой вариант:`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: keyboard
        }
      );

    } catch (error) {
      logger.error('Recommendation error:', error);
    }
  }

  /**
   * Показать профиль пользователя
   */
  static async showProfile(bot: TelegramBot, chatId: number, messageId: number, user: any) {
    const profileText = `
👤 Ваш профиль

💰 Токены: ${user?.tokens || 0}
📊 Подписка: ${user?.subscription || 'Базовая'}
📅 Регистрация: ${user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}

📈 Статистика:
• Создано изображений: ${await MenuHandler.getUserImageCount(user?.id)}
• Создано видео: ${await MenuHandler.getUserVideoCount(user?.id)}
• Сообщений с AI: ${await MenuHandler.getUserChatCount(user?.id)}
    `;

    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '💰 Купить токены', callback_data: 'buy_tokens' },
          { text: '⚙️ Настройки', callback_data: 'settings' }
        ],
        [
          { text: '📊 Мои работы', callback_data: 'my_works' },
          { text: '🎯 Подписка', callback_data: 'subscription' }
        ],
        [
          { text: '⬅️ Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await bot.editMessageText(profileText, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
  }

  /**
   * Показать пакеты токенов
   */
  static async showTokenPackages(bot: TelegramBot, chatId: number, messageId: number) {
    const packagesText = `
💰 Пакеты токенов

🥉 Стартер - 150₽
   • 200 токенов
   • ~25 изображений

🥈 Популярный - 500₽ 
   • 750 токенов (+50% бонус!)
   • ~95 изображений

🥇 Профи - 1000₽
   • 1600 токенов (+60% бонус!)
   • ~200 изображений

💎 Безлимит - 2000₽/мес
   • Неограниченные токены
   • Приоритетная очередь
   • Все премиум функции
    `;

    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '🥉 Стартер (150₽)', callback_data: 'buy_starter' },
          { text: '🥈 Популярный (500₽)', callback_data: 'buy_popular' }
        ],
        [
          { text: '🥇 Профи (1000₽)', callback_data: 'buy_pro' },
          { text: '💎 Безлимит (2000₽)', callback_data: 'buy_unlimited' }
        ],
        [
          { text: '⬅️ Назад', callback_data: 'main_menu' }
        ]
      ]
    };

    await bot.editMessageText(packagesText, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
  }

  /**
   * Обработка специфических callback'ов
   */
  static async handleSpecificCallback(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery, data: string) {
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;

    if (!chatId) return;

    // Обработка покупки токенов
    if (data.startsWith('buy_')) {
      const packageType = data.replace('buy_', '');
      // TODO: Интеграция с PaymentService
      await bot.sendMessage(chatId, `💳 Переход к оплате пакета "${packageType}"...\n\n(Интеграция с Lava.top в разработке)`);
      return;
    }

    // Обработка выбора AI для изображений
    if (data.startsWith('img_')) {
      const aiType = data.replace('img_', '');
      await bot.sendMessage(chatId, `🎨 Вы выбрали: ${aiType}\n\nОтправьте описание изображения которое хотите создать:`);
      // TODO: Установить состояние пользователя для ввода промпта
      return;
    }

    // Другие callback'ы...
    logger.info('Unhandled callback:', data);
  }

  // Вспомогательные методы для статистики
  static async getUserImageCount(userId: string): Promise<number> {
    if (!userId) return 0;
    return await prisma.freepikTask.count({
      where: { userId, status: 'COMPLETED' }
    });
  }

  static async getUserVideoCount(userId: string): Promise<number> {
    if (!userId) return 0;
    return await prisma.runwayTask.count({
      where: { userId }
    });
  }

  static async getUserChatCount(userId: string): Promise<number> {
    if (!userId) return 0;
    // TODO: Добавить подсчет сообщений в чате
    return 0;
  }
}
