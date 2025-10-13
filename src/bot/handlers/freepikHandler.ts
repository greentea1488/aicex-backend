import { Context } from "grammy";
import { 
  freepikMainMenu, 
  freepikTextToImageMenu,
  freepikStyledImageMenu,
  freepikVideoModelsMenu,
  freepikVideoKlingNewMenu,
  freepikVideoKlingClassicMenu,
  freepikVideoPixVerseMenu,
  freepikVideoMinimaxMenu,
  freepikVideoSeedanceMenu,
  freepikVideoWanMenu,
  freepikEditMenu,
  freepikFiltersMenu,
  freepikQualityMenu,
  freepikAspectRatioMenu,
  freepikGenerationSettingsMenu,
  freepikPersonGenerationMenu,
  freepikSafetySettingsMenu,
  freepikVideoDurationMenu,
  freepikVideoParamsMenu,
  freepikTaskStatusMenu
} from "../keyboards/freepikKeyboard";
import { startMenu } from "../keyboards/startKeyboard";
import { FreepikLoraService } from "../services/ai/FreepikLoraService";
import { SessionManager } from "../services/SessionManager";
import { prisma } from "../../utils/prismaClient";
import { safeEditMessage } from "../utils/UXHelpers";

export class FreepikHandler {
  private sessionManager = new SessionManager();
  private freepikService = new FreepikLoraService();
  
  // Состояние пользователя для отслеживания выбранных параметров
  private userStates = new Map<string, any>();

  async showMainMenu(ctx: Context) {
    await safeEditMessage(ctx, 
      "🎨 Freepik + Lora AI Platform\n\nВыберите тип функциональности:",
      { reply_markup: freepikMainMenu }
    );
  }

  async showTextToImageMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (userId) {
      this.setUserState(userId, { action: 'text_to_image' });
    }

    await safeEditMessage(ctx, 
      "🖼️ Генерация изображений из текста\n\nВыберите модель:",
      { reply_markup: freepikTextToImageMenu }
    );
  }

  async showStyledImageMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (userId) {
      this.setUserState(userId, { action: 'styled_images' });
    }

    await safeEditMessage(ctx, 
      "🎭 Генерация изображений с стилями\n\nВыберите стиль:",
      { reply_markup: freepikStyledImageMenu }
    );
  }

  async showImageToVideoMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (userId) {
      this.setUserState(userId, { action: 'image_to_video' });
    }

    await safeEditMessage(ctx, 
      "🎬 Генерация видео из изображений\n\nВыберите категорию моделей:",
      { reply_markup: freepikVideoModelsMenu }
    );
  }

  async showEditMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (userId) {
      this.setUserState(userId, { action: 'editing' });
    }

    await safeEditMessage(ctx, 
      "✏️ Редактирование изображений\n\nВыберите тип редактирования:",
      { reply_markup: freepikEditMenu }
    );
  }

  async showFiltersMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (userId) {
      this.setUserState(userId, { action: 'filters' });
    }

    await safeEditMessage(ctx, 
      "🎨 AI Фильтры\n\nВыберите тип фильтра:",
      { reply_markup: freepikFiltersMenu }
    );
  }

  async selectImageModel(ctx: Context, model: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // Мапинг моделей
    const modelMap: { [key: string]: { name: string, api_model: string } } = {
      'mystic': { name: 'Mystic (Реализм)', api_model: 'realism' },
      'artistic': { name: 'Artistic (Художественный)', api_model: 'artistic' },
      'fantasy': { name: 'Fantasy (Фэнтези)', api_model: 'fantasy' },
      'photography': { name: 'Photography (Фото)', api_model: 'photography' },
      'portrait': { name: 'Portrait (Портрет)', api_model: 'portrait' },
      'landscape': { name: 'Landscape (Пейзаж)', api_model: 'landscape' },
      'architecture': { name: 'Architecture (Архитектура)', api_model: 'architecture' }
    };

    const selectedModel = modelMap[model];
    if (!selectedModel) return;

    // Сохраняем выбранную модель
    this.setUserState(userId, { 
      action: 'image_generation',
      model: selectedModel.api_model,
      model_name: selectedModel.name
    });

    await safeEditMessage(ctx, 
      `🎨 Выбрана модель: ${selectedModel.name}\n\n` +
      "Теперь отправьте текстовое описание изображения, которое хотите создать.\n\n" +
      "📝 Примеры промптов:\n" +
      "• 'Красивый закат над океаном'\n" +
      "• 'Портрет девушки в стиле ренессанс'\n" +
      "• 'Фантастический город будущего'\n" +
      "• 'Котенок играет в саду'\n\n" +
      "💡 Пишите детально для лучшего результата!",
      { reply_markup: new (await import("grammy")).InlineKeyboard().text("🔙 Выбрать другую модель", "freepik_image_gen") }
    );

    // Начинаем сессию для получения промпта
    this.sessionManager.createSession(userId, 'freepik_image');
  }

  async selectVideoModel(ctx: Context, modelKey: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // Полная карта всех 23 видео моделей Freepik API
    const modelMap: { [key: string]: { name: string, api_model: string, description: string } } = {
      // 🚀 Kling новые модели
      'kling-v2.5-pro': { 
        name: 'Kling v2.5 Pro', 
        api_model: 'kling-v2.5-pro', 
        description: 'Новейшая модель с лучшим качеством' 
      },
      'kling-v2.1-master': { 
        name: 'Kling v2.1 Master', 
        api_model: 'kling-v2.1-master', 
        description: 'Мастер-версия с продвинутыми возможностями' 
      },
      'kling-pro-v2.1': { 
        name: 'Kling Pro v2.1', 
        api_model: 'kling-pro-v2.1', 
        description: 'Профессиональная версия 2.1' 
      },
      'kling-std-v2.1': { 
        name: 'Kling Std v2.1', 
        api_model: 'kling-std-v2.1', 
        description: 'Стандартная версия 2.1' 
      },
      'kling-v2': { 
        name: 'Kling v2', 
        api_model: 'kling-v2', 
        description: 'Базовая версия 2.0' 
      },

      // ⭐ Kling классические модели
      'kling-pro-1.6': { 
        name: 'Kling Pro 1.6', 
        api_model: 'kling-pro-1.6', 
        description: 'Профессиональная версия 1.6' 
      },
      'kling-std-1.6': { 
        name: 'Kling Std 1.6', 
        api_model: 'kling-std-1.6', 
        description: 'Стандартная версия 1.6' 
      },
      'kling-elements-pro-1.6': { 
        name: 'Kling Elements Pro 1.6', 
        api_model: 'kling-elements-pro-1.6', 
        description: 'Элементы Pro 1.6' 
      },
      'kling-elements-std-1.6': { 
        name: 'Kling Elements Std 1.6', 
        api_model: 'kling-elements-std-1.6', 
        description: 'Элементы Std 1.6' 
      },

      // 🎯 PixVerse модели
      'pixverse-v5': { 
        name: 'PixVerse V5', 
        api_model: 'pixverse-v5', 
        description: 'Новейшая версия PixVerse' 
      },
      'pixverse-v5-transition': { 
        name: 'PixVerse V5 Transition', 
        api_model: 'pixverse-v5-transition', 
        description: 'Специализированная на переходах' 
      },

      // 🎪 Minimax Hailuo модели
      'minimax-hailuo-02-1080p': { 
        name: 'Minimax Hailuo 02 1080p', 
        api_model: 'minimax-hailuo-02-1080p', 
        description: 'Высокое качество 1080p' 
      },
      'minimax-hailuo-02-768p': { 
        name: 'Minimax Hailuo 02 768p', 
        api_model: 'minimax-hailuo-02-768p', 
        description: 'Среднее качество 768p' 
      },

      // 🎭 Seedance модели
      'seedance-pro-1080p': { 
        name: 'Seedance Pro 1080p', 
        api_model: 'seedance-pro-1080p', 
        description: 'Профессиональная версия 1080p' 
      },
      'seedance-pro-720p': { 
        name: 'Seedance Pro 720p', 
        api_model: 'seedance-pro-720p', 
        description: 'Профессиональная версия 720p' 
      },
      'seedance-pro-480p': { 
        name: 'Seedance Pro 480p', 
        api_model: 'seedance-pro-480p', 
        description: 'Профессиональная версия 480p' 
      },
      'seedance-lite-1080p': { 
        name: 'Seedance Lite 1080p', 
        api_model: 'seedance-lite-1080p', 
        description: 'Lite версия 1080p' 
      },
      'seedance-lite-720p': { 
        name: 'Seedance Lite 720p', 
        api_model: 'seedance-lite-720p', 
        description: 'Lite версия 720p' 
      },
      'seedance-lite-480p': { 
        name: 'Seedance Lite 480p', 
        api_model: 'seedance-lite-480p', 
        description: 'Lite версия 480p' 
      },

      // 🌟 Wan модели
      'wan-v2.2-720p': { 
        name: 'Wan v2.2 720p', 
        api_model: 'wan-v2.2-720p', 
        description: 'Wan версия 720p' 
      },
      'wan-v2.2-580p': { 
        name: 'Wan v2.2 580p', 
        api_model: 'wan-v2.2-580p', 
        description: 'Wan версия 580p' 
      },
      'wan-v2.2-480p': { 
        name: 'Wan v2.2 480p', 
        api_model: 'wan-v2.2-480p', 
        description: 'Wan версия 480p' 
      }
    };

    const selectedModel = modelMap[modelKey];
    if (!selectedModel) {
      await ctx.answerCallbackQuery("❌ Неизвестная модель");
      return;
    }

    this.setUserState(userId, { 
      action: 'video_generation',
      model: selectedModel.api_model,
      model_name: selectedModel.name
    });

    await safeEditMessage(ctx, 
      `🎬 Выбрана модель: ${selectedModel.name}\n\n` +
      `📝 ${selectedModel.description}\n\n` +
      "Теперь отправьте описание видео, которое хотите создать.\n\n" +
      "💡 Примеры промптов для видео:\n" +
      "• 'Волны разбиваются о скалы на закате'\n" +
      "• 'Человек медленно идет по лесной тропинке'\n" +
      "• 'Дым плавно поднимается от костра'\n" +
      "• 'Цветы качаются на ветру в поле'\n" +
      "• 'Кот играет с клубком шерсти'\n\n" +
      "⏱️ Видео будет длительностью ~5 секунд\n" +
      "🎯 Качество зависит от выбранной модели",
      { reply_markup: new (await import("grammy")).InlineKeyboard().text("🔙 Выбрать другую модель", "freepik_video_gen") }
    );

    this.sessionManager.createSession(userId, 'freepik_video');
  }

  async processUserPrompt(ctx: Context, prompt: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const userState = this.getUserState(userId);
    if (!userState || !userState.action) {
      await ctx.reply("❌ Ошибка: состояние пользователя не найдено. Начните заново с /start");
      return;
    }

    // Показываем индикатор печати
    await ctx.replyWithChatAction("typing");

    try {
      if (userState.action === 'image_generation') {
        await this.generateImage(ctx, prompt, userState);
      } else if (userState.action === 'video_generation') {
        await this.generateVideo(ctx, prompt, userState);
      } else {
        await ctx.reply("❌ Функция пока не реализована. Используйте генерацию изображений.");
      }
    } catch (error) {
      console.error("Error processing Freepik prompt:", error);
      await ctx.reply("❌ Произошла ошибка при обработке запроса. Попробуйте еще раз.");
    }

    // Очищаем состояние пользователя
    this.clearUserState(userId);
    this.sessionManager.endSession(userId);
  }

  private async generateImage(ctx: Context, prompt: string, userState: any) {
    // Показываем индикатор загрузки
    const processingMessage = await ctx.reply(
      `🎨 ${userState.model_name}\n\n` +
      `📝 Промпт: ${prompt}\n\n` +
      `⏳ Генерирую изображение...\n` +
      `🔄 Это может занять 30-90 секунд\n` +
      `⏰ Пожалуйста, подождите...`
    );

    try {
      const response = await this.freepikService.chat([
        { role: 'user', content: prompt }
      ], ctx.from?.id.toString() || '');

      // Проверяем, есть ли base64 изображение в ответе
      const base64Match = response.content.match(/data:image\/[^;]+;base64,([^"]+)/);
      
      if (base64Match) {
        // Есть base64 изображение - отправляем его
        const base64Data = base64Match[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Удаляем сообщение о загрузке
        await ctx.api.deleteMessage(ctx.chat?.id || 0, processingMessage.message_id);
        
        // Отправляем изображение
        await ctx.replyWithPhoto(
          new (await import("grammy/types")).InputFile(imageBuffer, "freepik_image.jpg"),
          {
            caption: 
              `🎨 ${userState.model_name}\n` +
              `📝 ${prompt}\n\n` +
              `✅ Изображение создано успешно!`,
            reply_markup: new (await import("grammy")).InlineKeyboard()
              .text("🔄 Создать еще", "freepik_image_gen")
              .row()
              .text("🏠 Главное меню", "start")
          }
        );
      } else {
        // Проверяем, есть ли Task ID в ответе (асинхронная генерация)
        const taskIdMatch = response.content.match(/Task ID: ([a-f0-9-]+)/);
        
        if (taskIdMatch) {
          // Задача принята к обработке - показываем успех
          await ctx.api.editMessageText(
            ctx.chat?.id || 0,
            processingMessage.message_id,
            `🎨 ${userState.model_name}\n\n` +
            `${response.content}\n\n` +
            `🎉 **Отлично!** Freepik API работает!\n` +
            `🎨 Ваше изображение генерируется прямо сейчас\n` +
            `⚡ Можете создавать еще изображения параллельно\n\n` +
            `🔥 **Создайте еще изображений:**`,
            { 
              reply_markup: new (await import("grammy")).InlineKeyboard()
                .text("🔄 Еще одно изображение", "freepik_image_gen")
                .row()
                .text("🎭 Другая модель", "freepik_image_gen") 
                .text("🎨 Другой стиль", "freepik_image_gen")
                .row()
                .text("🏠 Главное меню", "start")
            }
          );
        } else {
          // Обычный текстовый ответ
          await ctx.api.editMessageText(
            ctx.chat?.id || 0,
            processingMessage.message_id,
            `🎨 ${userState.model_name}\n\n${response.content}`,
            { 
              reply_markup: new (await import("grammy")).InlineKeyboard()
                .text("🔄 Создать еще", "freepik_image_gen")
                .row()
                .text("🏠 Главное меню", "start")
            }
          );
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      
      // Обновляем сообщение об ошибке
      await ctx.api.editMessageText(
        ctx.chat?.id || 0,
        processingMessage.message_id,
        `❌ Ошибка генерации изображения\n\n` +
        `📝 Промпт: ${prompt}\n` +
        `🔧 Попробуйте еще раз или измените промпт`,
        { 
          reply_markup: new (await import("grammy")).InlineKeyboard()
            .text("🔄 Попробовать снова", "freepik_image_gen")
            .row()
            .text("🏠 Главное меню", "start")
        }
      );
    }
  }

  private async generateVideo(ctx: Context, prompt: string, userState: any) {
    // Показываем индикатор загрузки для видео
    const processingMessage = await ctx.reply(
      `🎬 ${userState.model_name}\n\n` +
      `📝 Промпт: ${prompt}\n\n` +
      `⏳ Генерирую видео...\n` +
      `🔄 Это может занять 60-120 секунд\n` +
      `⏰ Пожалуйста, подождите...`
    );

    try {
      // Вызываем новый метод generateVideo из FreepikLoraService
      const response = await this.freepikService.generateVideo(
        prompt, 
        ctx.from?.id.toString() || '',
        userState.model || 'cinematic'
      );

      // Проверяем, есть ли видео в ответе
      const videoMatch = response.content.match(/\[Посмотреть видео\]\(([^)]+)\)/);
      
      if (videoMatch) {
        // Есть ссылка на видео - отправляем её
        const videoUrl = videoMatch[1];
        
        await ctx.api.deleteMessage(ctx.chat?.id || 0, processingMessage.message_id);
        
        await ctx.reply(
          `🎬 ${userState.model_name}\n` +
          `📝 ${prompt}\n\n` +
          `✅ Видео создано успешно!\n` +
          `🎥 [Открыть видео](${videoUrl})`,
          {
            parse_mode: "Markdown",
            reply_markup: new (await import("grammy")).InlineKeyboard()
              .text("🔄 Создать еще", "freepik_video_gen")
              .row()
              .text("🏠 Главное меню", "start")
          }
        );
      } else {
        // Проверяем Task ID для webhook ответа
        const taskIdMatch = response.content.match(/Task ID: ([a-f0-9-]+)/);
        
        if (taskIdMatch) {
          await ctx.api.editMessageText(
            ctx.chat?.id || 0,
            processingMessage.message_id,
            `🎬 ${userState.model_name}\n\n` +
            `${response.content}\n\n` +
            `🎉 **Отлично!** Freepik Video API работает!\n` +
            `🎬 Ваше видео генерируется прямо сейчас\n` +
            `⚡ Можете создавать еще видео параллельно\n\n` +
            `🔥 **Создайте еще видео:**`,
            { 
              reply_markup: new (await import("grammy")).InlineKeyboard()
                .text("🔄 Еще одно видео", "freepik_video_gen")
                .row()
                .text("🎭 Другая модель", "freepik_video_gen") 
                .text("🎨 Другой стиль", "freepik_video_gen")
                .row()
                .text("🏠 Главное меню", "start")
            }
          );
        } else {
          // Обычный ответ сервиса
          await ctx.api.editMessageText(
            ctx.chat?.id || 0,
            processingMessage.message_id,
            `🎬 ${userState.model_name}\n\n${response.content}`,
            { 
              reply_markup: new (await import("grammy")).InlineKeyboard()
                .text("🔄 Создать еще", "freepik_video_gen")
                .row()
                .text("🏠 Главное меню", "start")
            }
          );
        }
      }
    } catch (error) {
      console.error("Error generating video:", error);
      
      // Обновляем сообщение об ошибке
      await ctx.api.editMessageText(
        ctx.chat?.id || 0,
        processingMessage.message_id,
        `❌ Ошибка генерации видео\n\n` +
        `📝 Промпт: ${prompt}\n` +
        `🔧 Попробуйте еще раз или измените промпт`,
        { 
          reply_markup: new (await import("grammy")).InlineKeyboard()
            .text("🔄 Попробовать снова", "freepik_video_gen")
            .row()
            .text("🏠 Главное меню", "start")
        }
      );
    }
  }

  // Методы для работы с состоянием пользователя
  private setUserState(userId: string, state: any) {
    this.userStates.set(userId, { ...this.getUserState(userId), ...state });
  }

  private getUserState(userId: string) {
    return this.userStates.get(userId) || {};
  }

  private clearUserState(userId: string) {
    this.userStates.delete(userId);
  }

  // Проверка активной сессии Freepik
  hasActiveFreepikSession(userId: string): boolean {
    const session = this.sessionManager.getSession(userId);
    return session?.aiProvider?.startsWith('freepik_') || false;
  }

  // Завершение сессии Freepik
  endFreepikSession(userId: string) {
    this.sessionManager.endSession(userId);
    this.clearUserState(userId);
  }

  // 🔧 НОВЫЕ РАСШИРЕННЫЕ МЕТОДЫ МЕНЮ

  async showGenerationSettings(ctx: Context) {
    await safeEditMessage(ctx, 
      "🔧 Настройки генерации\n\nВыберите параметр для настройки:",
      { reply_markup: freepikGenerationSettingsMenu }
    );
  }

  async showAspectRatioSettings(ctx: Context) {
    await safeEditMessage(ctx, 
      "📐 Выбор соотношения сторон\n\nВыберите формат изображения:",
      { reply_markup: freepikAspectRatioMenu }
    );
  }

  async showPersonGenerationSettings(ctx: Context) {
    await safeEditMessage(ctx, 
      "👥 Настройки генерации персонажей\n\nВыберите политику:",
      { reply_markup: freepikPersonGenerationMenu }
    );
  }

  async showSafetySettings(ctx: Context) {
    await safeEditMessage(ctx, 
      "🔐 Уровень безопасности контента\n\nВыберите уровень фильтрации:",
      { reply_markup: freepikSafetySettingsMenu }
    );
  }

  async showVideoDurationSettings(ctx: Context) {
    await safeEditMessage(ctx, 
      "⏱️ Длительность видео\n\nВыберите продолжительность:",
      { reply_markup: freepikVideoDurationMenu }
    );
  }

  async showVideoParamsSettings(ctx: Context) {
    await safeEditMessage(ctx, 
      "🎬 Расширенные параметры видео\n\nВыберите параметр:",
      { reply_markup: freepikVideoParamsMenu }
    );
  }

  async showTaskStatus(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    try {
      // Получаем статистику задач пользователя
      const activeTasks = await prisma.freepikTask.count({
        where: { 
          userId: userId, 
          status: { in: ["CREATED", "PROCESSING"] }
        }
      });

      const completedTasks = await prisma.freepikTask.count({
        where: { 
          userId: userId, 
          status: "COMPLETED"
        }
      });

      const failedTasks = await prisma.freepikTask.count({
        where: { 
          userId: userId, 
          status: "FAILED"
        }
      });

      await safeEditMessage(ctx, 
        `📊 Статус ваших задач Freepik\n\n` +
        `🔄 Активные: ${activeTasks}\n` +
        `✅ Завершенные: ${completedTasks}\n` +
        `❌ Неудачные: ${failedTasks}\n\n` +
        `Выберите действие:`,
        { reply_markup: freepikTaskStatusMenu }
      );

    } catch (error) {
      console.error("Ошибка получения статуса задач:", error);
      await safeEditMessage(ctx, 
        "❌ Ошибка получения статуса задач",
        { reply_markup: freepikTaskStatusMenu }
      );
    }
  }

  // 🎯 МЕТОДЫ ВЫБОРА НАСТРОЕК

  async selectAspectRatio(ctx: Context, ratio: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const ratioMap: { [key: string]: string } = {
      'square_1_1': 'square_1_1',
      'social_story_9_16': 'social_story_9_16', 
      'widescreen_16_9': 'widescreen_16_9',
      'traditional_3_4': 'traditional_3_4',
      'classic_4_3': 'classic_4_3'
    };

    this.setUserState(userId, { aspect_ratio: ratioMap[ratio] });
    await ctx.answerCallbackQuery(`✅ Установлено: ${ratio.replace(/_/g, ':')}`);
  }

  async selectPersonGeneration(ctx: Context, setting: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    this.setUserState(userId, { person_generation: setting });
    await ctx.answerCallbackQuery(`✅ Установлено: ${setting}`);
  }

  async selectSafetySetting(ctx: Context, setting: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    this.setUserState(userId, { safety_settings: setting });
    await ctx.answerCallbackQuery(`✅ Установлено: ${setting}`);
  }

  async selectVideoDuration(ctx: Context, duration: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    this.setUserState(userId, { video_duration: duration });
    await ctx.answerCallbackQuery(`✅ Длительность: ${duration} сек`);
  }

  // 🎬 Методы для навигации по видео моделям

  async showKlingNewMenu(ctx: Context) {
    await safeEditMessage(ctx, 
      "🚀 Kling - Новые модели\n\nВыберите модель:",
      { reply_markup: freepikVideoKlingNewMenu }
    );
  }

  async showKlingClassicMenu(ctx: Context) {
    await safeEditMessage(ctx, 
      "⭐ Kling - Классические модели\n\nВыберите модель:",
      { reply_markup: freepikVideoKlingClassicMenu }
    );
  }

  async showPixVerseMenu(ctx: Context) {
    await safeEditMessage(ctx, 
      "🎯 PixVerse модели\n\nВыберите модель:",
      { reply_markup: freepikVideoPixVerseMenu }
    );
  }

  async showMinimaxMenu(ctx: Context) {
    await safeEditMessage(ctx, 
      "🎪 Minimax Hailuo модели\n\nВыберите качество:",
      { reply_markup: freepikVideoMinimaxMenu }
    );
  }

  async showSeedanceMenu(ctx: Context) {
    await safeEditMessage(ctx, 
      "🎭 Seedance модели\n\nВыберите версию и качество:",
      { reply_markup: freepikVideoSeedanceMenu }
    );
  }

  async showWanMenu(ctx: Context) {
    await safeEditMessage(ctx, 
      "🌟 Wan v2.2 модели\n\nВыберите качество:",
      { reply_markup: freepikVideoWanMenu }
    );
  }

  // Кнопка возврата
  getBackButton() {
    return new (require("grammy")).InlineKeyboard()
      .text("🔙 Назад к функциям", "freepik_back_to_functions");
  }
}
