import { Context } from '../types';
import { FreepikMenuHandler } from '../handlers/FreepikMenuHandler';
import { logger } from '../../utils/logger';

/**
 * Роутер для обработки callback запросов Freepik меню
 */
export class FreepikMenuRouter {
  private handler: FreepikMenuHandler;

  constructor() {
    this.handler = new FreepikMenuHandler();
  }

  /**
   * Обработка callback запросов
   */
  async handleCallback(ctx: Context): Promise<boolean> {
    const data = ctx.callbackQuery?.data;
    if (!data) return false;

    try {
      // Главное меню
      if (data === 'freepik' || data === 'freepik_menu') {
        await this.handler.showMainMenu(ctx);
        return true;
      }

      // Меню изображений
      if (data === 'freepik_images') {
        await this.handler.showImageModelsMenu(ctx);
        return true;
      }

      // Меню видео
      if (data === 'freepik_videos') {
        await this.handler.showVideoModelsMenu(ctx);
        return true;
      }

      // Выбор модели изображения
      if (data.startsWith('freepik_img_model_')) {
        const modelKey = data.replace('freepik_img_model_', '');
        await this.handler.showImageModelSettings(ctx, modelKey);
        return true;
      }

      // Выбор модели видео
      if (data.startsWith('freepik_vid_model_')) {
        const modelKey = data.replace('freepik_vid_model_', '');
        await this.handler.showVideoModelSettings(ctx, modelKey);
        return true;
      }

      // Настройки разрешения изображения
      if (data.startsWith('freepik_img_res_')) {
        const modelKey = data.replace('freepik_img_res_', '');
        await this.handler.showResolutionMenu(ctx, modelKey);
        return true;
      }

      // Настройки стиля
      if (data.startsWith('freepik_img_style_')) {
        const modelKey = data.replace('freepik_img_style_', '');
        await this.handler.showStyleMenu(ctx, modelKey);
        return true;
      }

      // Настройки формата изображения
      if (data.startsWith('freepik_img_aspect_')) {
        const modelKey = data.replace('freepik_img_aspect_', '');
        await this.showAspectRatioMenu(ctx, modelKey);
        return true;
      }

      // Установка разрешения
      if (data.startsWith('freepik_set_res_')) {
        const parts = data.replace('freepik_set_res_', '').split('_');
        const modelKey = parts[0];
        const resolution = parts[1];
        await this.handler.handleSettingUpdate(ctx, 'resolution', resolution);
        return true;
      }

      // Установка стиля
      if (data.startsWith('freepik_set_style_')) {
        const parts = data.replace('freepik_set_style_', '').split('_');
        const modelKey = parts[0];
        const style = parts[1];
        await this.handler.handleSettingUpdate(ctx, 'style', style);
        return true;
      }

      // Установка формата
      if (data.startsWith('freepik_set_aspect_')) {
        const parts = data.replace('freepik_set_aspect_', '').split('_');
        const modelKey = parts.slice(0, -2).join('_');
        const aspect = parts.slice(-2).join('_');
        await this.handler.handleSettingUpdate(ctx, 'aspectRatio', aspect);
        return true;
      }

      // Настройки длительности видео
      if (data.startsWith('freepik_vid_duration_')) {
        const modelKey = data.replace('freepik_vid_duration_', '');
        await this.handler.showVideoDurationMenu(ctx, modelKey);
        return true;
      }

      // Настройки качества видео
      if (data.startsWith('freepik_vid_quality_')) {
        const modelKey = data.replace('freepik_vid_quality_', '');
        await this.showVideoQualityMenu(ctx, modelKey);
        return true;
      }

      // Настройки разрешения видео
      if (data.startsWith('freepik_vid_res_')) {
        const modelKey = data.replace('freepik_vid_res_', '');
        await this.showVideoResolutionMenu(ctx, modelKey);
        return true;
      }

      // Установка длительности
      if (data.startsWith('freepik_set_duration_')) {
        const parts = data.replace('freepik_set_duration_', '').split('_');
        const modelKey = parts.slice(0, -1).join('_');
        const duration = parts[parts.length - 1] + ' сек';
        await this.handler.handleSettingUpdate(ctx, 'duration', duration);
        return true;
      }

      // Начать генерацию изображения
      if (data.startsWith('freepik_img_generate_')) {
        await this.handler.startGeneration(ctx);
        return true;
      }

      // Загрузка изображения для видео
      if (data.startsWith('freepik_vid_upload_')) {
        await this.handler.startGeneration(ctx);
        return true;
      }

      // Баланс
      if (data === 'freepik_balance') {
        await this.showBalance(ctx);
        return true;
      }

      // История
      if (data === 'freepik_history') {
        await this.showHistory(ctx);
        return true;
      }

      return false;

    } catch (error) {
      logger.error('Error in FreepikMenuRouter:', error);
      await ctx.answerCallbackQuery('❌ Произошла ошибка');
      return false;
    }
  }

  /**
   * Меню выбора соотношения сторон
   */
  private async showAspectRatioMenu(ctx: Context, modelKey: string) {
    const keyboard = ctx.callbackQuery?.message?.reply_markup;
    
    const aspectOptions = [
      { id: 'square_1_1', label: '1:1 Квадрат' },
      { id: 'widescreen_16_9', label: '16:9 Широкий' },
      { id: 'portrait_2_3', label: '2:3 Портрет' },
      { id: 'traditional_3_4', label: '3:4 Традиционный' },
      { id: 'standard_3_2', label: '3:2 Стандарт' }
    ];

    const inlineKeyboard = aspectOptions.map(opt => [{
      text: opt.label,
      callback_data: `freepik_set_aspect_${modelKey}_${opt.id}`
    }]);
    
    inlineKeyboard.push([{
      text: '⬅️ Назад',
      callback_data: `freepik_img_model_${modelKey}`
    }]);

    await ctx.editMessageText(
      '📏 **Выберите соотношение сторон:**\n\n' +
      '• **1:1** - Квадрат (Instagram, аватары)\n' +
      '• **16:9** - Широкий экран (YouTube, презентации)\n' +
      '• **2:3** - Портрет (постеры, обложки)\n' +
      '• **3:4** - Традиционный (фото)\n' +
      '• **3:2** - Стандарт (печать)',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      }
    );
  }

  /**
   * Меню выбора качества видео
   */
  private async showVideoQualityMenu(ctx: Context, modelKey: string) {
    const qualityOptions = [
      { id: 'high', label: '🎯 Высокое' },
      { id: 'max', label: '💎 Максимальное' }
    ];

    const inlineKeyboard = qualityOptions.map(opt => [{
      text: opt.label,
      callback_data: `freepik_set_quality_${modelKey}_${opt.id}`
    }]);
    
    inlineKeyboard.push([{
      text: '⬅️ Назад',
      callback_data: `freepik_vid_model_${modelKey}`
    }]);

    await ctx.editMessageText(
      '🎯 **Выберите качество видео:**\n\n' +
      '• **Высокое** - Оптимальный баланс качества и скорости\n' +
      '• **Максимальное** - Лучшее качество, дольше обработка',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      }
    );
  }

  /**
   * Меню выбора разрешения видео
   */
  private async showVideoResolutionMenu(ctx: Context, modelKey: string) {
    const resOptions = [
      { id: '720p', label: '📺 720p HD' },
      { id: '1080p', label: '🖥️ 1080p Full HD' }
    ];

    const inlineKeyboard = resOptions.map(opt => [{
      text: opt.label,
      callback_data: `freepik_set_vidres_${modelKey}_${opt.id}`
    }]);
    
    inlineKeyboard.push([{
      text: '⬅️ Назад',
      callback_data: `freepik_vid_model_${modelKey}`
    }]);

    await ctx.editMessageText(
      '📺 **Выберите разрешение видео:**\n\n' +
      '• **720p HD** - Хорошее качество, быстрая обработка\n' +
      '• **1080p Full HD** - Отличное качество, дольше обработка',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      }
    );
  }

  /**
   * Показать баланс пользователя
   */
  private async showBalance(ctx: Context) {
    // Здесь должна быть логика получения баланса из базы
    const balance = 100; // Заглушка
    
    const inlineKeyboard = [
      [{ text: '💳 Пополнить', callback_data: 'freepik_topup' }],
      [{ text: '⬅️ Назад', callback_data: 'freepik_menu' }]
    ];

    await ctx.editMessageText(
      '💰 **Ваш баланс:**\n\n' +
      `🪙 Токены: **${balance}**\n\n` +
      '**Стоимость генерации:**\n' +
      '• Изображение: 5-10 токенов\n' +
      '• Видео: 15-25 токенов\n\n' +
      '💡 Токены расходуются только при успешной генерации',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      }
    );
  }

  /**
   * Показать историю генераций
   */
  private async showHistory(ctx: Context) {
    // Здесь должна быть логика получения истории из базы
    const inlineKeyboard = [
      [{ text: '🗑️ Очистить историю', callback_data: 'freepik_clear_history' }],
      [{ text: '⬅️ Назад', callback_data: 'freepik_menu' }]
    ];

    await ctx.editMessageText(
      '📜 **История генераций:**\n\n' +
      '1. 🖼️ Изображение - Mystic - "Закат" - 2 часа назад\n' +
      '2. 🎬 Видео - Kling 2.5 - 5 часов назад\n' +
      '3. 🖼️ Изображение - Flux Dev - "Город" - вчера\n\n' +
      '💡 История хранится 30 дней',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      }
    );
  }
}
