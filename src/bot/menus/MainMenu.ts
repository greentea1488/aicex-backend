import { InlineKeyboard } from "grammy";

/**
 * Централизованное управление главным меню бота
 * Используем Grammy InlineKeyboard для правильной работы веб-приложений
 */
export class MainMenu {
  /**
   * Получить главное меню с кнопками
   * @param variant - вариант меню (start или main)
   */
  static getMenu(variant: 'start' | 'main' = 'main'): InlineKeyboard {
    try {
      const keyboard = new InlineKeyboard();
      
      if (variant === 'start') {
        // Стартовое меню с описанием
        keyboard
          .text('🎨 Генерация фото', 'generate_image').row()
          .text('🎬 Генерация видео', 'generate_video').row()
          .text('💬 Чат с AI', 'chat_ai').row()
          .webApp('👤 Профиль', process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app/home');
      } else {
        // Главное меню (компактное)
        keyboard
          .text('🎨 Генерация фото', 'generate_image').row()
          .text('🎬 Генерация видео', 'generate_video').row()
          .text('💬 Чат с AI', 'chat_ai').row()
          .webApp('👤 Профиль', process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app/home');
      }
      
      return keyboard;
    } catch (error) {
      console.error('Error creating menu:', error);
      // Возвращаем простое меню без webApp в случае ошибки
      return new InlineKeyboard()
        .text('🎨 Генерация фото', 'generate_image').row()
        .text('🎬 Генерация видео', 'generate_video').row()
        .text('💬 Чат с AI', 'chat_ai');
    }
  }

  /**
   * Получить текст для главного меню
   * @param variant - вариант текста
   */
  static getText(variant: 'start' | 'main' = 'main'): string {
    if (variant === 'start') {
      return `👋 Добро пожаловать в AICEX AI Bot!

🤖 27 AI моделей в одном боте:

Генерация изображений:
• Freepik AI (10+ моделей)
• DALL-E 3

Генерация видео:
• Freepik Video (17+ моделей)

Чат с AI:
• ChatGPT-4
• Claude-3
• GPT-4 Vision

Выберите действие:`;
    } else {
      return `🎯 Главное меню

Выберите действие:

🎨 Генерация фото - создание изображений
🎬 Генерация видео - создание видео
💬 Чат с AI - общение с нейросетями
👤 Профиль - ваши настройки и баланс`;
    }
  }

  /**
   * Меню генерации изображений
   */
  static getImageMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text('🎨 Freepik AI', 'image_freepik')
      .text('🖼️ DALL-E', 'image_dalle').row()
      .text('⬅️ Назад', 'back_to_main');
  }

  /**
   * Меню генерации видео
   */
  static getVideoMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text('🎬 Freepik Video', 'video_freepik')
      .text('🔥 Kling AI', 'video_kling').row()
      .text('⬅️ Назад', 'back_to_main');
  }

  /**
   * Меню чата с AI
   */
  static getChatMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text('💬 ChatGPT-4', 'chat_gpt4')
      .text('🤖 Claude-3', 'chat_claude').row()
      .text('⬅️ Назад', 'back_to_main');
  }
}
