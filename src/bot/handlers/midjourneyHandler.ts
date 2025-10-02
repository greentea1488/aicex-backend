import { Context } from 'grammy';
import { MidjourneyService, MidjourneyGenerationRequest } from '../services/ai/MidjourneyService';
import { SessionManager } from '../services/SessionManager';
import { prisma } from '../../utils/prismaClient';
import {
  midjourneyMainMenu,
  midjourneyGenerateMenu,
  midjourneySettingsMenu,
  midjourneyModelsMenu,
  midjourneyStylesMenu,
  midjourneyAspectRatiosMenu,
  midjourneyQualityMenu,
  midjourneyHistoryMenu,
  midjourneyHelpMenu,
  midjourneyQuickGenMenu,
  midjourneyConfigureMenu,
  midjourneyExamplesMenu,
  midjourneyPricingMenu,
  midjourneyPortraitExamplesMenu,
  midjourneyLandscapeExamplesMenu,
  midjourneyArchitectureExamplesMenu,
  midjourneyArtExamplesMenu,
  midjourneyScifiExamplesMenu,
  midjourneyFantasyExamplesMenu
} from '../keyboards/midjourneyKeyboard';

export class MidjourneyHandler {
  private midjourneyService: MidjourneyService;
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.midjourneyService = new MidjourneyService();
  }

  /**
   * Показывает главное меню Midjourney
   */
  async showMainMenu(ctx: Context) {
    await ctx.editMessageText(
      '🎨 **Midjourney AI - Генерация изображений**\n\n' +
      'Создавайте потрясающие изображения с помощью самой мощной нейросети для генерации картинок!\n\n' +
      '✨ **Возможности:**\n' +
      '• Генерация по текстовому описанию\n' +
      '• 6 версий модели (5.0-7.0)\n' +
      '• 4 стиля и 5 соотношений сторон\n' +
      '• Настройка качества и параметров\n' +
      '• История генераций\n\n' +
      '🚀 **Выберите действие:**',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyMainMenu
      }
    );
  }

  /**
   * Показывает меню генерации
   */
  async showGenerateMenu(ctx: Context) {
    await ctx.editMessageText(
      '🎨 **Генерация изображения**\n\n' +
      'Выберите способ генерации:\n\n' +
      '🚀 **Быстрая генерация** - готовые шаблоны\n' +
      '⚙️ **Настроить параметры** - полный контроль',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyGenerateMenu
      }
    );
  }

  /**
   * Показывает меню настроек
   */
  async showSettingsMenu(ctx: Context) {
    await ctx.editMessageText(
      '⚙️ **Настройки Midjourney**\n\n' +
      'Настройте параметры генерации:\n\n' +
      '🤖 **Модель** - версия Midjourney\n' +
      '🎨 **Стиль** - художественный стиль\n' +
      '📐 **Соотношение** - размер изображения\n' +
      '⭐ **Качество** - уровень детализации',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneySettingsMenu
      }
    );
  }

  /**
   * Показывает меню выбора модели
   */
  async showModelsMenu(ctx: Context) {
    const models = this.midjourneyService.getAvailableModels();
    
    let text = '🤖 **Выбор модели Midjourney**\n\n';
    models.forEach(model => {
      text += `**${model.name}** - ${model.cost}₽\n`;
    });
    
    text += '\n💡 **Рекомендации:**\n';
    text += '• **7.0** - новейшая, лучшее качество\n';
    text += '• **6.1** - стабильная, хорошее качество\n';
    text += '• **5.x** - классические версии';

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: midjourneyModelsMenu
    });
  }

  /**
   * Показывает меню выбора стиля
   */
  async showStylesMenu(ctx: Context) {
    const styles = this.midjourneyService.getAvailableStyles();
    
    let text = '🎨 **Выбор стиля**\n\n';
    styles.forEach(style => {
      text += `**${style.name}** - ${style.description}\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: midjourneyStylesMenu
    });
  }

  /**
   * Показывает меню соотношений сторон
   */
  async showAspectRatiosMenu(ctx: Context) {
    const ratios = this.midjourneyService.getAvailableAspectRatios();
    
    let text = '📐 **Соотношение сторон**\n\n';
    ratios.forEach(ratio => {
      text += `**${ratio.name}** - ${ratio.description}\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: midjourneyAspectRatiosMenu
    });
  }

  /**
   * Показывает меню качества
   */
  async showQualityMenu(ctx: Context) {
    const qualities = this.midjourneyService.getAvailableQuality();
    
    let text = '⭐ **Уровень качества**\n\n';
    qualities.forEach(quality => {
      text += `**${quality.name}** - ${quality.description}\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: midjourneyQualityMenu
    });
  }

  /**
   * Показывает меню истории
   */
  async showHistoryMenu(ctx: Context) {
    await ctx.editMessageText(
      '📊 **История генераций**\n\n' +
      'Просмотрите ваши предыдущие генерации:\n\n' +
      '📋 **Последние 10** - недавние работы\n' +
      '📋 **Последние 25** - больше истории\n' +
      '📋 **Последние 50** - полная история',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyHistoryMenu
      }
    );
  }

  /**
   * Показывает меню помощи
   */
  async showHelpMenu(ctx: Context) {
    await ctx.editMessageText(
      '❓ **Помощь по Midjourney**\n\n' +
      '📖 **Как использовать** - инструкции\n' +
      '💡 **Примеры промптов** - готовые шаблоны\n' +
      '💰 **Тарифы** - стоимость генерации',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyHelpMenu
      }
    );
  }

  /**
   * Показывает меню быстрой генерации
   */
  async showQuickGenMenu(ctx: Context) {
    await ctx.editMessageText(
      '🚀 **Быстрая генерация**\n\n' +
      'Выберите категорию для быстрого старта:\n\n' +
      '👤 **Портрет** - люди и лица\n' +
      '🏞️ **Пейзаж** - природа и места\n' +
      '🏢 **Архитектура** - здания и сооружения\n' +
      '🎭 **Арт** - художественные работы\n' +
      '🔬 **Sci-Fi** - научная фантастика\n' +
      '🐉 **Фэнтези** - магические миры',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyQuickGenMenu
      }
    );
  }

  /**
   * Показывает меню конфигурации
   */
  async showConfigureMenu(ctx: Context) {
    await ctx.editMessageText(
      '⚙️ **Конфигурация генерации**\n\n' +
      'Настройте все параметры:\n\n' +
      '🤖 **Модель** - версия Midjourney\n' +
      '🎨 **Стиль** - художественный стиль\n' +
      '📐 **Соотношение** - размер изображения\n' +
      '⭐ **Качество** - уровень детализации\n\n' +
      '✅ **Начать генерацию** - запустить с настройками',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyConfigureMenu
      }
    );
  }

  /**
   * Показывает меню примеров
   */
  async showExamplesMenu(ctx: Context) {
    await ctx.editMessageText(
      '💡 **Примеры промптов**\n\n' +
      'Готовые шаблоны для вдохновения:\n\n' +
      '👤 **Портреты** - люди и лица\n' +
      '🏞️ **Пейзажи** - природа и места\n' +
      '🏢 **Архитектура** - здания и сооружения\n' +
      '🎨 **Арт** - художественные работы\n' +
      '🔬 **Sci-Fi** - научная фантастика\n' +
      '🐉 **Фэнтези** - магические миры',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyExamplesMenu
      }
    );
  }

  /**
   * Показывает меню тарифов
   */
  async showPricingMenu(ctx: Context) {
    await ctx.editMessageText(
      '💰 **Тарифы Midjourney**\n\n' +
      '💎 **Midjourney 7.0** - 8₽ за генерацию\n' +
      '• Новейшая версия\n' +
      '• Лучшее качество\n' +
      '• Все новые функции\n\n' +
      '⚡ **Midjourney 6.x** - 7₽ за генерацию\n' +
      '• Стабильная версия\n' +
      '• Хорошее качество\n' +
      '• Проверенная надежность\n\n' +
      '🔥 **Midjourney 5.x** - 7₽ за генерацию\n' +
      '• Классические версии\n' +
      '• Хорошее качество\n' +
      '• Доступная цена',
      {
        parse_mode: 'Markdown',
        reply_markup: midjourneyPricingMenu
      }
    );
  }

  /**
   * Обрабатывает выбор модели
   */
  async selectModel(ctx: Context, model: string) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      // Сохраняем выбранную модель в настройки пользователя
      await prisma.user.upsert({
        where: { telegramId },
        update: {
          midjourneySettings: {
            model: model,
            style: 'photorealistic',
            aspect_ratio: '1:1',
            quality: 'high'
          }
        },
        create: {
          telegramId,
          username: 'unknown',
          midjourneySettings: {
            model: model,
            style: 'photorealistic',
            aspect_ratio: '1:1',
            quality: 'high'
          }
        }
      });

      await ctx.answerCallbackQuery(`✅ Модель ${model} выбрана`);
      await this.showSettingsMenu(ctx);
    } catch (error) {
      console.error('Error selecting model:', error);
      await ctx.answerCallbackQuery('❌ Ошибка при выборе модели');
    }
  }

  /**
   * Обрабатывает выбор стиля
   */
  async selectStyle(ctx: Context, style: string) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      await prisma.user.update({
        where: { telegramId },
        data: {
          midjourneySettings: {
            style: style
          }
        }
      });

      await ctx.answerCallbackQuery(`✅ Стиль ${style} выбран`);
      await this.showSettingsMenu(ctx);
    } catch (error) {
      console.error('Error selecting style:', error);
      await ctx.answerCallbackQuery('❌ Ошибка при выборе стиля');
    }
  }

  /**
   * Обрабатывает выбор соотношения сторон
   */
  async selectAspectRatio(ctx: Context, ratio: string) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      await prisma.user.update({
        where: { telegramId },
        data: {
          midjourneySettings: {
            aspect_ratio: ratio
          }
        }
      });

      await ctx.answerCallbackQuery(`✅ Соотношение ${ratio} выбрано`);
      await this.showSettingsMenu(ctx);
    } catch (error) {
      console.error('Error selecting aspect ratio:', error);
      await ctx.answerCallbackQuery('❌ Ошибка при выборе соотношения');
    }
  }

  /**
   * Обрабатывает выбор качества
   */
  async selectQuality(ctx: Context, quality: string) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      await prisma.user.update({
        where: { telegramId },
        data: {
          midjourneySettings: {
            quality: quality
          }
        }
      });

      await ctx.answerCallbackQuery(`✅ Качество ${quality} выбрано`);
      await this.showSettingsMenu(ctx);
    } catch (error) {
      console.error('Error selecting quality:', error);
      await ctx.answerCallbackQuery('❌ Ошибка при выборе качества');
    }
  }

  /**
   * Начинает сессию генерации изображения
   */
  async startGenerationSession(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      // Создаем сессию для генерации
      await this.sessionManager.createSession(telegramId.toString(), 'midjourney_generate');
      
      await ctx.editMessageText(
        '🎨 **Генерация изображения Midjourney**\n\n' +
        '📝 **Введите описание изображения:**\n\n' +
        '💡 **Примеры:**\n' +
        '• "Красивый закат над океаном"\n' +
        '• "Портрет молодой женщины в стиле ренессанс"\n' +
        '• "Футуристический город с неоновыми огнями"\n\n' +
        '✍️ **Напишите что хотите создать:**',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error starting generation session:', error);
      await ctx.answerCallbackQuery('❌ Ошибка при запуске генерации');
    }
  }

  /**
   * Начинает генерацию изображения
   */
  async startGeneration(ctx: Context, prompt?: string) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      // Получаем настройки пользователя
      const user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user?.midjourneySettings) {
        await ctx.answerCallbackQuery('❌ Сначала настройте параметры');
        return;
      }

      const settings = user.midjourneySettings as any;

      // Валидируем промпт
      if (!prompt) {
        await ctx.answerCallbackQuery('❌ Введите описание изображения');
        return;
      }

      const validation = this.midjourneyService.validatePrompt(prompt);
      if (!validation.valid) {
        await ctx.answerCallbackQuery(`❌ ${validation.error}`);
        return;
      }

      // Форматируем промпт
      const formattedPrompt = this.midjourneyService.formatPrompt(prompt, settings.style);

      // Создаем запрос
      const request: MidjourneyGenerationRequest = {
        prompt: formattedPrompt,
        version: settings.model as any,
        aspect_ratio: settings.aspect_ratio as any,
        quality: settings.quality as any,
        style: settings.style as any
      };

      // Отправляем запрос
      await ctx.editMessageText('🎨 **Генерация изображения...**\n\n⏳ Обрабатываем ваш запрос...');

      const result = await this.midjourneyService.generateImage(request);

      if (result.success && result.image_url) {
        // Сохраняем задачу в базу данных
        await prisma.midjourneyTask.create({
          data: {
            telegramId,
            userId: user.id,
            prompt: formattedPrompt,
            model: settings.model,
            style: settings.style,
            aspect_ratio: settings.aspect_ratio,
            quality: settings.quality,
            taskId: result.task_id || '',
            imageUrl: result.image_url,
            status: result.status,
            cost: result.cost || 0
          }
        });

        // Отправляем изображение
        await ctx.replyWithPhoto(result.image_url, {
          caption: `🎨 **Midjourney ${settings.model}**\n\n` +
                   `📝 **Промпт:** ${formattedPrompt}\n` +
                   `🎨 **Стиль:** ${settings.style}\n` +
                   `📐 **Соотношение:** ${settings.aspect_ratio}\n` +
                   `⭐ **Качество:** ${settings.quality}\n` +
                   `💰 **Стоимость:** ${result.cost}₽`,
          parse_mode: 'Markdown'
        });

        await ctx.answerCallbackQuery('✅ Изображение сгенерировано!');
      } else {
        await ctx.editMessageText(
          `❌ **Ошибка генерации**\n\n${result.error || 'Неизвестная ошибка'}`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('Error generating image:', error);
      await ctx.answerCallbackQuery('❌ Ошибка при генерации изображения');
    }
  }

  /**
   * Показывает историю генераций
   */
  async showHistory(ctx: Context, limit: number = 10) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      const tasks = await prisma.midjourneyTask.findMany({
        where: { telegramId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      if (tasks.length === 0) {
        await ctx.editMessageText(
          '📊 **История генераций**\n\n' +
          'У вас пока нет генераций.\n' +
          'Создайте первое изображение!',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      let text = `📊 **История генераций (${tasks.length})**\n\n`;
      
      tasks.forEach((task, index) => {
        text += `${index + 1}. **${task.model}** - ${task.status}\n`;
        text += `   📝 ${task.prompt.substring(0, 50)}...\n`;
        text += `   💰 ${task.cost}₽ - ${task.createdAt.toLocaleDateString()}\n\n`;
      });

      await ctx.editMessageText(text, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error showing history:', error);
      await ctx.answerCallbackQuery('❌ Ошибка при загрузке истории');
    }
  }

  /**
   * Показывает примеры промптов
   */
  async showPromptExamples(ctx: Context, category: string) {
    const examples: { [key: string]: string[] } = {
      'portraits': [
        'Портрет молодой женщины с длинными волосами, профессиональная фотография',
        'Мужской портрет в деловом костюме, студийное освещение',
        'Детский портрет с улыбкой, естественное освещение',
        'Пожилой мужчина с бородой, художественная фотография'
      ],
      'landscapes': [
        'Закат над океаном, золотые облака, романтическое настроение',
        'Горный пейзаж с заснеженными вершинами, ясное небо',
        'Лесная тропа в тумане, мистическая атмосфера',
        'Городской пейзаж ночью, неоновые огни, дождь'
      ],
      'architecture': [
        'Современный небоскреб из стекла и стали, футуристический дизайн',
        'Готический собор с витражными окнами, архитектурная фотография',
        'Минималистичный дом в стиле хай-тек, белые стены',
        'Замок на скале, средневековая архитектура, драматическое освещение'
      ],
      'art': [
        'Абстрактная картина с яркими цветами, экспрессионизм',
        'Скульптура из мрамора, классическое искусство',
        'Цифровая живопись в стиле фэнтези, магические элементы',
        'Коллаж из различных материалов, современное искусство'
      ],
      'scifi': [
        'Космический корабль в далекой галактике, звездное небо',
        'Робот-андроид в футуристическом городе, неоновые огни',
        'Киберпанк-персонаж с имплантами, темная атмосфера',
        'Инопланетный пейзаж с двумя солнцами, фантастическая флора'
      ],
      'fantasy': [
        'Дракон в пещере с сокровищами, магическое освещение',
        'Волшебник в башне с книгами, свечи и кристаллы',
        'Эльфийский лес с светящимися грибами, мистическая атмосфера',
        'Рыцарь в доспехах на поле битвы, эпическая сцена'
      ]
    };

    const categoryExamples = examples[category] || [];
    
    if (categoryExamples.length === 0) {
      await ctx.answerCallbackQuery('❌ Примеры не найдены');
      return;
    }

    let text = `💡 **Примеры промптов - ${category}**\n\n`;
    categoryExamples.forEach((example, index) => {
      text += `${index + 1}. ${example}\n\n`;
    });

    text += '💡 **Советы:**\n';
    text += '• Используйте детальные описания\n';
    text += '• Добавляйте стилистические указания\n';
    text += '• Указывайте освещение и настроение\n';
    text += '• Экспериментируйте с разными подходами';

    await ctx.editMessageText(text, { parse_mode: 'Markdown' });
  }
}
