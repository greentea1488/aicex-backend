import { InlineKeyboard } from 'grammy';
import { Context } from '../types';
import { logger } from '../../utils/logger';

/**
 * Улучшенный handler для Freepik с детальными настройками
 */

// Типы для опций моделей
interface ImageModelOptions {
  resolution?: string[];
  style?: string[];
  aspectRatio?: string[];
}

interface VideoModelOptions {
  duration?: string[];
  quality?: string[];
  resolution?: string[];
}

// Конфигурация моделей изображений
const IMAGE_MODELS: Record<string, {
  name: string;
  description: string;
  options: ImageModelOptions;
}> = {
  mystic: {
    name: '🎨 Mystic',
    description: 'Фотореалистичная генерация',
    options: {
      resolution: ['1k', '2k', '4k'],
      style: ['realism', 'artistic', 'fantasy', 'anime'],
      aspectRatio: ['square_1_1', 'widescreen_16_9', 'portrait_2_3']
    }
  },
  'flux-dev': {
    name: '⚡ Flux Dev',
    description: 'Быстрая генерация',
    options: {
      aspectRatio: ['square_1_1', 'widescreen_16_9', 'portrait_2_3']
    }
  },
  'seedream-v4': {
    name: '🌟 Seedream v4',
    description: 'Креативная генерация',
    options: {
      aspectRatio: ['square_1_1', 'widescreen_16_9', 'portrait_2_3']
    }
  }
};

// Конфигурация видео моделей
const VIDEO_MODELS: Record<string, {
  name: string;
  description: string;
  options: VideoModelOptions;
}> = {
  'kling-v2-5-pro': {
    name: '🎬 Kling 2.5 Pro',
    description: 'Премиум качество',
    options: {
      duration: ['5 сек', '10 сек'],
      quality: ['Высокое', 'Максимальное']
    }
  },
  'kling-v2-1-master': {
    name: '🎥 Kling 2.1 Master',
    description: 'Мастер версия',
    options: {
      duration: ['5 сек', '10 сек']
    }
  },
  'kling-v2': {
    name: '📹 Kling v2',
    description: 'Базовая версия',
    options: {
      duration: ['5 сек', '10 сек']
    }
  },
  'pixverse-v5': {
    name: '✨ PixVerse V5',
    description: 'Креативная анимация',
    options: {
      duration: ['5 сек', '8 сек'],
      resolution: ['720p', '1080p']
    }
  }
};

export class FreepikMenuHandler {
  /**
   * Главное меню Freepik
   */
  async showMainMenu(ctx: Context) {
    const keyboard = new InlineKeyboard()
      .text('🖼️ Генерация изображений', 'freepik_images')
      .text('🎬 Генерация видео', 'freepik_videos')
      .row()
      .text('📊 Мой баланс', 'freepik_balance')
      .text('📜 История', 'freepik_history')
      .row()
      .text('⬅️ Назад', 'main_menu');

    await ctx.editMessageText(
      '🎨 **Freepik AI Generator**\n\n' +
      'Создавайте изображения и видео с помощью AI!\n\n' +
      '• Изображения: Mystic, Flux, Seedream\n' +
      '• Видео: Kling, PixVerse (из изображений)\n\n' +
      'Выберите тип генерации:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Меню выбора модели изображений
   */
  async showImageModelsMenu(ctx: Context) {
    const keyboard = new InlineKeyboard();
    
    // Добавляем модели изображений
    Object.entries(IMAGE_MODELS).forEach(([key, model]) => {
      keyboard.text(model.name, `freepik_img_model_${key}`).row();
    });
    
    keyboard.text('⬅️ Назад', 'freepik_menu');

    await ctx.editMessageText(
      '🖼️ **Выберите модель для генерации изображений:**\n\n' +
      '• **Mystic** - Фотореалистичная генерация (1K-4K)\n' +
      '• **Flux Dev** - Быстрая генерация\n' +
      '• **Seedream v4** - Креативные изображения',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Меню настроек для выбранной модели изображений
   */
  async showImageModelSettings(ctx: Context, modelKey: string) {
    const model = IMAGE_MODELS[modelKey as keyof typeof IMAGE_MODELS];
    if (!model) return;

    const userState = ctx.session?.freepik || {};
    userState.selectedModel = modelKey;
    userState.modelType = 'image';
    
    // Инициализируем настройки по умолчанию
    if (!userState.settings) {
      userState.settings = {};
    }

    const keyboard = new InlineKeyboard();

    // Добавляем опции модели
    if (model.options.resolution) {
      const currentRes = userState.settings.resolution || '2k';
      keyboard.text(`📐 Разрешение: ${currentRes}`, `freepik_img_res_${modelKey}`).row();
    }

    if (model.options.style) {
      const currentStyle = userState.settings.style || 'realism';
      keyboard.text(`🎭 Стиль: ${currentStyle}`, `freepik_img_style_${modelKey}`).row();
    }

    if (model.options.aspectRatio) {
      const currentAspect = userState.settings.aspectRatio || 'square_1_1';
      const aspectLabels: Record<string, string> = {
        'square_1_1': '1:1 Квадрат',
        'widescreen_16_9': '16:9 Широкий',
        'portrait_2_3': '2:3 Портрет'
      };
      keyboard.text(`📏 Формат: ${aspectLabels[currentAspect]}`, `freepik_img_aspect_${modelKey}`).row();
    }

    keyboard
      .text('✅ Начать генерацию', `freepik_img_generate_${modelKey}`)
      .row()
      .text('⬅️ Назад', 'freepik_images');

    await ctx.editMessageText(
      `${model.name} **${model.description}**\n\n` +
      '⚙️ **Настройки генерации:**\n' +
      `${model.options.resolution ? '• Разрешение: ' + (userState.settings.resolution || '2k') + '\n' : ''}` +
      `${model.options.style ? '• Стиль: ' + (userState.settings.style || 'realism') + '\n' : ''}` +
      `${model.options.aspectRatio ? '• Формат: ' + (userState.settings.aspectRatio || 'square_1_1') + '\n' : ''}` +
      '\n💡 Нажмите на параметр для изменения\n' +
      '📝 После настройки отправьте описание изображения',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );

    // Сохраняем состояние
    ctx.session.freepik = userState;
  }

  /**
   * Меню выбора разрешения
   */
  async showResolutionMenu(ctx: Context, modelKey: string) {
    const model = IMAGE_MODELS[modelKey as keyof typeof IMAGE_MODELS];
    if (!model || !model.options.resolution) return;

    const keyboard = new InlineKeyboard();
    
    model.options.resolution.forEach(res => {
      keyboard.text(res.toUpperCase(), `freepik_set_res_${modelKey}_${res}`).row();
    });
    
    keyboard.text('⬅️ Назад', `freepik_img_model_${modelKey}`);

    await ctx.editMessageText(
      '📐 **Выберите разрешение:**\n\n' +
      '• **1K** - Быстрая генерация, базовое качество\n' +
      '• **2K** - Оптимальный баланс скорости и качества\n' +
      '• **4K** - Максимальное качество, дольше генерация',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Меню выбора стиля
   */
  async showStyleMenu(ctx: Context, modelKey: string) {
    const model = IMAGE_MODELS[modelKey as keyof typeof IMAGE_MODELS];
    if (!model || !model.options.style) return;

    const keyboard = new InlineKeyboard();
    
    const styleLabels: Record<string, string> = {
      'realism': '📷 Реализм',
      'artistic': '🎨 Художественный',
      'fantasy': '🧙 Фэнтези',
      'anime': '🎌 Аниме'
    };
    
    model.options.style.forEach(style => {
      keyboard.text(styleLabels[style] || style, `freepik_set_style_${modelKey}_${style}`).row();
    });
    
    keyboard.text('⬅️ Назад', `freepik_img_model_${modelKey}`);

    await ctx.editMessageText(
      '🎭 **Выберите стиль генерации:**\n\n' +
      '• **Реализм** - Фотореалистичные изображения\n' +
      '• **Художественный** - Картины и иллюстрации\n' +
      '• **Фэнтези** - Магические и сказочные сцены\n' +
      '• **Аниме** - Японский стиль анимации',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Меню выбора модели видео
   */
  async showVideoModelsMenu(ctx: Context) {
    const keyboard = new InlineKeyboard();
    
    // Добавляем рабочие модели видео
    Object.entries(VIDEO_MODELS).forEach(([key, model]) => {
      keyboard.text(model.name, `freepik_vid_model_${key}`).row();
    });
    
    keyboard.text('⬅️ Назад', 'freepik_menu');

    await ctx.editMessageText(
      '🎬 **Выберите модель для генерации видео:**\n\n' +
      '⚠️ **Важно:** Все модели работают с изображениями (image-to-video)\n\n' +
      '• **Kling 2.5 Pro** - Премиум качество, 5-10 сек\n' +
      '• **Kling 2.1 Master** - Профессиональная версия\n' +
      '• **Kling v2** - Базовая версия\n' +
      '• **PixVerse V5** - Креативная анимация, 5-8 сек\n\n' +
      '📌 Сначала загрузите изображение для анимации',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Меню настроек для выбранной модели видео
   */
  async showVideoModelSettings(ctx: Context, modelKey: string) {
    const model = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS];
    if (!model) return;

    const userState = ctx.session?.freepik || {};
    userState.selectedModel = modelKey;
    userState.modelType = 'video';
    
    if (!userState.settings) {
      userState.settings = {};
    }

    const keyboard = new InlineKeyboard();

    // Добавляем опции длительности
    if (model.options.duration) {
      const currentDuration = userState.settings.duration || model.options.duration[0];
      keyboard.text(`⏱️ Длительность: ${currentDuration}`, `freepik_vid_duration_${modelKey}`).row();
    }

    // Добавляем опции качества
    if (model.options.quality) {
      const currentQuality = userState.settings.quality || model.options.quality[0];
      keyboard.text(`🎯 Качество: ${currentQuality}`, `freepik_vid_quality_${modelKey}`).row();
    }

    // Добавляем опции разрешения (для PixVerse)
    if (model.options.resolution) {
      const currentRes = userState.settings.resolution || '1080p';
      keyboard.text(`📺 Разрешение: ${currentRes}`, `freepik_vid_res_${modelKey}`).row();
    }

    keyboard
      .text('📤 Загрузить изображение', `freepik_vid_upload_${modelKey}`)
      .row()
      .text('⬅️ Назад', 'freepik_videos');

    await ctx.editMessageText(
      `${model.name} **${model.description}**\n\n` +
      '⚙️ **Настройки генерации видео:**\n' +
      `${model.options.duration ? '• Длительность: ' + (userState.settings.duration || model.options.duration[0]) + '\n' : ''}` +
      `${model.options.quality ? '• Качество: ' + (userState.settings.quality || model.options.quality[0]) + '\n' : ''}` +
      `${model.options.resolution ? '• Разрешение: ' + (userState.settings.resolution || '1080p') + '\n' : ''}` +
      '\n📌 **Как использовать:**\n' +
      '1. Настройте параметры\n' +
      '2. Загрузите изображение\n' +
      '3. Опишите желаемое движение\n' +
      '4. Получите анимированное видео',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );

    // Сохраняем состояние
    ctx.session.freepik = userState;
  }

  /**
   * Меню выбора длительности видео
   */
  async showVideoDurationMenu(ctx: Context, modelKey: string) {
    const model = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS];
    if (!model || !model.options.duration) return;

    const keyboard = new InlineKeyboard();
    
    model.options.duration.forEach(duration => {
      keyboard.text(duration, `freepik_set_duration_${modelKey}_${duration.split(' ')[0]}`).row();
    });
    
    keyboard.text('⬅️ Назад', `freepik_vid_model_${modelKey}`);

    await ctx.editMessageText(
      '⏱️ **Выберите длительность видео:**\n\n' +
      '• **5 секунд** - Короткая анимация, быстрая генерация\n' +
      '• **8-10 секунд** - Развернутая анимация, больше движения\n\n' +
      '💡 Более длинные видео требуют больше времени на обработку',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Обработка установки параметра
   */
  async handleSettingUpdate(ctx: Context, setting: string, value: string) {
    const userState = ctx.session?.freepik || {};
    
    if (!userState.settings) {
      userState.settings = {};
    }
    
    userState.settings[setting] = value;
    ctx.session.freepik = userState;
    
    await ctx.answerCallbackQuery(`✅ ${setting}: ${value}`);
    
    // Возвращаемся к настройкам модели
    if (userState.modelType === 'image') {
      await this.showImageModelSettings(ctx, userState.selectedModel);
    } else {
      await this.showVideoModelSettings(ctx, userState.selectedModel);
    }
  }

  /**
   * Начало генерации
   */
  async startGeneration(ctx: Context) {
    const userState = ctx.session?.freepik;
    
    if (!userState || !userState.selectedModel) {
      await ctx.answerCallbackQuery('❌ Ошибка: модель не выбрана');
      return;
    }

    if (userState.modelType === 'image') {
      await ctx.editMessageText(
        '📝 **Отправьте описание изображения:**\n\n' +
        `Модель: ${IMAGE_MODELS[userState.selectedModel as keyof typeof IMAGE_MODELS].name}\n` +
        `Настройки: ${JSON.stringify(userState.settings, null, 2)}\n\n` +
        '💡 Примеры:\n' +
        '• "Красивый закат над горами"\n' +
        '• "Футуристический город ночью"\n' +
        '• "Портрет девушки в стиле аниме"',
        { parse_mode: 'Markdown' }
      );
      
      // Устанавливаем режим ожидания промпта
      userState.waitingForPrompt = true;
      ctx.session.freepik = userState;
      
    } else if (userState.modelType === 'video') {
      await ctx.editMessageText(
        '📤 **Загрузите изображение для анимации:**\n\n' +
        `Модель: ${VIDEO_MODELS[userState.selectedModel as keyof typeof VIDEO_MODELS].name}\n` +
        `Настройки: ${JSON.stringify(userState.settings, null, 2)}\n\n` +
        '💡 После загрузки изображения опишите желаемое движение:\n' +
        '• "Плавное движение камеры вправо"\n' +
        '• "Зум на объект в центре"\n' +
        '• "Кинематографичная панорама"',
        { parse_mode: 'Markdown' }
      );
      
      // Устанавливаем режим ожидания изображения
      userState.waitingForImage = true;
      ctx.session.freepik = userState;
    }
  }
}
