import { Context } from "grammy";
import { prisma } from "../../utils/prismaClient";
import { logger } from "../../utils/logger";

// 🎯 Улучшенные UX утилиты для бота

export interface UserState {
  currentPath: string[];
  currentAction: string | null;
  data?: any;
  timestamp: number;
  retryCount?: number;
}

export interface ProgressData {
  stage: string;
  progress: number;
  estimatedTime: number;
  message?: string;
}

export interface SmartError {
  type: string;
  message: string;
  suggestion: string;
  retryable: boolean;
  fallbackAction?: string;
}

export class UXHelpers {
  private static userStates = new Map<number, UserState>();
  private static readonly STATE_TIMEOUT = 10 * 60 * 1000; // 10 минут
  private static readonly PROGRESS_UPDATE_INTERVAL = 2000; // 2 секунды

  /**
   * 🧭 Навигация с хлебными крошками
   */
  static getBreadcrumb(currentPath: string[]): string {
    if (currentPath.length === 0) return "🏠 Главное меню";
    
    const icons = {
      'main': '🏠',
      'image': '🎨',
      'video': '🎬',
      'chat': '💬',
      'profile': '👤',
      'settings': '⚙️',
      'freepik': '🎨',
      'midjourney': '🖼️',
      'runway': '🚀',
      'kling': '⚡',
      'chatgpt': '🧠'
    };

    const breadcrumb = currentPath.map(segment => 
      icons[segment as keyof typeof icons] || segment
    ).join(' → ');

    return `📍 ${breadcrumb}`;
  }

  /**
   * 📊 Прогресс-индикатор
   */
  static generateProgressBar(progress: number): string {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * ⏱️ Форматирование времени
   */
  static formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}с`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}м ${remainingSeconds}с`;
  }

  /**
   * 🎯 Умное главное меню
   */
  static getSmartMainMenu(userId?: number) {
    return {
      inline_keyboard: [
        [
          { text: '🎨 Быстрое изображение', callback_data: 'quick_image' },
          { text: '💬 AI Чат', callback_data: 'quick_chat' }
        ],
        [
          { text: '🖼️ Midjourney', callback_data: 'midjourney_menu' },
          { text: '🎬 Видео', callback_data: 'generate_video' }
        ],
        [
          { text: '📊 Статистика', callback_data: 'stats' }
        ],
        [
          { text: '👤 Профиль', web_app: { url: process.env.FRONTEND_URL || 'http://localhost:3000' } }
        ]
      ]
    };
  }

  /**
   * 🚀 Быстрые действия
   */
  static getQuickActionsMenu(userId: number) {
    return {
      inline_keyboard: [
        [
          { text: '🔄 Повторить последнее', callback_data: 'repeat_last' },
          { text: '⭐ Избранные модели', callback_data: 'favorites' }
        ],
        [
          { text: '📝 Шаблоны промптов', callback_data: 'prompt_templates' },
          { text: '📊 Статистика', callback_data: 'stats' }
        ],
        [
          { text: '⬅️ Главное меню', callback_data: 'back_to_main' }
        ]
      ]
    };
  }

  /**
   * 🔙 Навигационная кнопка назад
   */
  static getBackButton(callbackData: string) {
    return {
      inline_keyboard: [
        [{ text: '⬅️ Назад', callback_data: callbackData }]
      ]
    };
  }

  /**
   * 🛑 Кнопка остановки процесса
   */
  static getStopButton() {
    return {
      inline_keyboard: [
        [{ text: '🛑 Остановить', callback_data: 'stop_action' }]
      ]
    };
  }

  /**
   * 📊 Управление состояниями пользователя
   */
  static setUserState(userId: number, state: Partial<UserState>) {
    const currentState = this.userStates.get(userId) || {
      currentPath: ['main'],
      currentAction: null,
      timestamp: Date.now()
    };

    this.userStates.set(userId, {
      ...currentState,
      ...state,
      timestamp: Date.now()
    });
  }

  static getUserState(userId: number): UserState | undefined {
    const state = this.userStates.get(userId);
    if (state && Date.now() - state.timestamp < this.STATE_TIMEOUT) {
      return state;
    }
    this.clearUserState(userId);
    return undefined;
  }

  static clearUserState(userId: number) {
    this.userStates.delete(userId);
  }

  static updateUserPath(userId: number, newSegment: string) {
    const state = this.getUserState(userId);
    if (state) {
      const newPath = [...state.currentPath, newSegment];
      this.setUserState(userId, { currentPath: newPath });
    }
  }

  /**
   * 📈 Показать прогресс генерации
   */
  static async showProgress(ctx: Context, progressData: ProgressData) {
    const progressBar = this.generateProgressBar(progressData.progress);
    const timeLeft = this.formatTime(progressData.estimatedTime);
    
    const message = `🔄 <b>${progressData.stage}</b>\n\n` +
      `${progressBar} ${progressData.progress}%\n\n` +
      `⏱️ Осталось: ${timeLeft}\n\n` +
      `${progressData.message || 'Пожалуйста, подождите...'}`;

    try {
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: this.getStopButton()
      });
    } catch (error) {
      // Если не можем редактировать, отправляем новое сообщение
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: this.getStopButton()
      });
    }
  }

  /**
   * ❌ Умная обработка ошибок
   */
  static getSmartError(error: any): SmartError {
    const errorMap: { [key: string]: SmartError } = {
      'insufficient_tokens': {
        type: 'insufficient_tokens',
        message: 'Недостаточно токенов для операции',
        suggestion: 'Пополните баланс токенов или выберите более дешевую модель',
        retryable: false,
        fallbackAction: 'show_token_purchase'
      },
      'model_unavailable': {
        type: 'model_unavailable',
        message: 'Модель временно недоступна',
        suggestion: 'Попробуйте другую модель или повторите позже',
        retryable: true,
        fallbackAction: 'suggest_alternatives'
      },
      'rate_limit': {
        type: 'rate_limit',
        message: 'Превышен лимит запросов',
        suggestion: 'Подождите немного и попробуйте снова',
        retryable: true,
        fallbackAction: 'schedule_retry'
      },
      'network_error': {
        type: 'network_error',
        message: 'Ошибка сети',
        suggestion: 'Проверьте интернет-соединение и попробуйте снова',
        retryable: true
      },
      'invalid_prompt': {
        type: 'invalid_prompt',
        message: 'Некорректный промпт',
        suggestion: 'Попробуйте более описательный промпт на английском языке',
        retryable: false
      },
      'database_error': {
        type: 'database_error',
        message: 'Временная техническая проблема',
        suggestion: 'Попробуйте еще раз через минуту',
        retryable: true
      },
      'api_error': {
        type: 'api_error',
        message: 'Сервис временно недоступен',
        suggestion: 'Попробуйте позже или используйте другой AI сервис',
        retryable: true,
        fallbackAction: 'suggest_alternatives'
      }
    };

    // Извлекаем понятное сообщение об ошибке
    let errorMessage = '';
    
    if (typeof error === 'string') {
      errorMessage = error.toLowerCase();
    } else if (error?.message) {
      errorMessage = error.message.toLowerCase();
    } else if (error?.error) {
      errorMessage = error.error.toLowerCase();
    } else {
      errorMessage = String(error).toLowerCase();
    }

    // Специальная обработка для известных ошибок
    if (errorMessage.includes('token') || errorMessage.includes('баланс') || errorMessage.includes('недостаточно')) {
      return errorMap['insufficient_tokens'];
    } else if (errorMessage.includes('model') || errorMessage.includes('модель') || errorMessage.includes('недоступен')) {
      return errorMap['model_unavailable'];
    } else if (errorMessage.includes('rate') || errorMessage.includes('лимит') || errorMessage.includes('превышен')) {
      return errorMap['rate_limit'];
    } else if (errorMessage.includes('network') || errorMessage.includes('сеть') || errorMessage.includes('timeout')) {
      return errorMap['network_error'];
    } else if (errorMessage.includes('prompt') || errorMessage.includes('промпт') || errorMessage.includes('некорректный')) {
      return errorMap['invalid_prompt'];
    } else if (errorMessage.includes('prisma') || errorMessage.includes('database') || errorMessage.includes('connection')) {
      return errorMap['database_error'];
    } else if (errorMessage.includes('api') || errorMessage.includes('endpoint') || errorMessage.includes('service')) {
      return errorMap['api_error'];
    }

    // Дефолтная ошибка - скрываем технические детали
    return {
      type: 'unknown',
      message: 'Произошла техническая ошибка',
      suggestion: 'Попробуйте еще раз или используйте другой AI сервис',
      retryable: true,
      fallbackAction: 'suggest_alternatives'
    };
  }

  /**
   * 📢 Отправить умное уведомление об ошибке
   */
  static async sendSmartErrorNotification(ctx: Context, error: any, context?: any) {
    const smartError = this.getSmartError(error);
    
    const message = `❌ <b>Ошибка:</b> ${smartError.message}\n\n` +
      `💡 <b>Решение:</b> ${smartError.suggestion}`;

    const keyboard = {
      inline_keyboard: [
        ...(smartError.retryable ? [[{ text: '🔄 Попробовать снова', callback_data: 'retry_last_action' }]] : []),
        [{ text: '⬅️ Главное меню', callback_data: 'back_to_main' }]
      ]
    };

    try {
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    } catch (editError) {
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    }
  }

  /**
   * ✅ Отправить уведомление об успехе
   */
  static async sendSuccessNotification(ctx: Context, data: any) {
    const message = `✅ <b>Готово!</b>\n\n` +
      `💰 Потрачено токенов: ${data.tokensUsed}\n` +
      `🎯 Сервис: ${data.service}\n` +
      `⏱️ Время: ${this.formatTime(data.duration || 0)}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Еще одно', callback_data: data.repeatAction || 'repeat_last' },
          { text: '📊 Статистика', callback_data: 'stats' }
        ],
        [{ text: '⬅️ Главное меню', callback_data: 'back_to_main' }]
      ]
    };

    try {
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    } catch (editError) {
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    }
  }

  /**
   * 🔄 Показать информацию о повторной попытке
   */
  static async showRetryNotification(ctx: Context, retryIn: number) {
    const message = `⚠️ <b>Повторная попытка</b>\n\n` +
      `Автоматический повтор через ${retryIn} секунд...\n\n` +
      `💡 Вы можете отменить повтор`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🛑 Отменить повтор', callback_data: 'cancel_retry' }],
        [{ text: '⬅️ Главное меню', callback_data: 'back_to_main' }]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
  }

  /**
   * 🧹 Очистка устаревших состояний
   */
  static cleanupStaleStates() {
    const now = Date.now();
    for (const [userId, state] of this.userStates.entries()) {
      if (now - state.timestamp > this.STATE_TIMEOUT) {
        this.userStates.delete(userId);
      }
    }
  }

  /**
   * 📊 Получить статистику пользователя
   */
  static async getUserStats(userId: number) {
    try {
      // Получаем пользователя
      const user = await prisma.user.findUnique({
        where: { telegramId: userId }
      });

      if (!user) {
        logger.warn('User not found for stats:', { telegramId: userId });
        return null;
      }

      logger.info('Getting stats for user:', { 
        telegramId: userId, 
        userId: user.id,
        currentTokens: user.tokens
      });

      // Считаем ВСЕ генерации
      const totalGenerations = await prisma.generationHistory.count({
        where: { userId: user.id }
      });

      logger.info('Total generations found:', { totalGenerations });

      // Считаем ВСЕ потраченные токены
      const tokenHistory = await prisma.tokenHistory.findMany({
        where: { 
          userId: user.id,
          amount: { lt: 0 }
        },
        select: { amount: true }
      });
      
      logger.info('Token history found:', { 
        records: tokenHistory.length,
        tokens: tokenHistory.map(t => t.amount)
      });

      const tokensSpent = tokenHistory.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Получаем последнюю генерацию и любимый сервис
      const recentGenerations = await prisma.generationHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      logger.info('Recent generations:', { 
        count: recentGenerations.length,
        services: recentGenerations.map(g => g.service)
      });

      const stats = {
        totalGenerations,
        tokensSpent,
        currentBalance: user.tokens,
        lastGeneration: recentGenerations[0]?.createdAt,
        favoriteService: this.getFavoriteService(recentGenerations)
      };

      logger.info('Final stats:', stats);

      return stats;
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * 🏆 Определить любимый сервис пользователя
   */
  private static getFavoriteService(history: any[]): string {
    const serviceCounts = history.reduce((acc, item) => {
      acc[item.service] = (acc[item.service] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.keys(serviceCounts).reduce((a, b) => 
      serviceCounts[a] > serviceCounts[b] ? a : b, 'unknown'
    );
  }

  /**
   * 🎯 Получить рекомендации для пользователя
   */
  static async getUserRecommendations(userId: number) {
    const stats = await this.getUserStats(userId);
    if (!stats) return [];

    const recommendations = [];

    if (stats.totalGenerations === 0) {
      recommendations.push({
        type: 'first_time',
        message: 'Попробуйте начать с быстрой генерации изображения',
        action: 'quick_image'
      });
    } else if (stats.tokensSpent > 100) {
      recommendations.push({
        type: 'power_user',
        message: 'Рассмотрите подписку для экономии токенов',
        action: 'show_subscription'
      });
    }

    return recommendations;
  }
}
