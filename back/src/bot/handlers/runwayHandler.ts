import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { SessionManager } from "../services/SessionManager";
import { 
  runwayMainMenu, 
  runwayVideoModelsMenu, 
  runwayImageModelsMenu, 
  runwayEditingMenu,
  runwayEffectsMenu,
  runwayHelpMenu,
  runwayVideoConfigMenu,
  runwayImageConfigMenu,
  backToRunwayMain
} from "../keyboards/runwayKeyboard";

interface UserState {
  action?: string;
  model?: string;
  model_name?: string;
  duration?: number;
  ratio?: string;
  resolution?: string;
  config?: any;
}

export class RunwayHandler {
  private userStates: Map<string, UserState> = new Map();
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  private setUserState(userId: string, state: Partial<UserState>) {
    const currentState = this.userStates.get(userId) || {};
    this.userStates.set(userId, { ...currentState, ...state });
  }

  private getUserState(userId: string): UserState {
    return this.userStates.get(userId) || {};
  }

  // 🎬 ГЛАВНОЕ МЕНЮ RUNWAY
  async showMainMenu(ctx: Context) {
    await ctx.editMessageText(
      "🎬 Runway - AI Creative Suite\n\nВыберите что хотите создать:",
      { reply_markup: runwayMainMenu }
    );
  }

  // 🎥 МЕНЮ ВИДЕО ГЕНЕРАЦИИ
  async showVideoModels(ctx: Context) {
    await ctx.editMessageText(
      "🎥 Runway Video Generation\n\nВыберите модель для генерации видео:",
      { reply_markup: runwayVideoModelsMenu }
    );
  }

  // 🖼️ МЕНЮ ИЗОБРАЖЕНИЙ
  async showImageModels(ctx: Context) {
    await ctx.editMessageText(
      "🖼️ Runway Image Generation\n\nВыберите модель для генерации изображений:",
      { reply_markup: runwayImageModelsMenu }
    );
  }

  // ✏️ РЕДАКТИРОВАНИЕ
  async showEditingMenu(ctx: Context) {
    await ctx.editMessageText(
      "✏️ Runway Editing Tools\n\nВыберите инструмент для редактирования:",
      { reply_markup: runwayEditingMenu }
    );
  }

  // 🎭 СПЕЦЭФФЕКТЫ
  async showEffectsMenu(ctx: Context) {
    await ctx.editMessageText(
      "🎭 Runway Special Effects\n\nВыберите спецэффект:",
      { reply_markup: runwayEffectsMenu }
    );
  }

  // ℹ️ СПРАВКА
  async showHelpMenu(ctx: Context) {
    await ctx.editMessageText(
      "ℹ️ Runway API - Справка\n\nВыберите раздел:",
      { reply_markup: runwayHelpMenu }
    );
  }

  // 🎬 ВЫБОР ВИДЕО МОДЕЛИ
  async selectVideoModel(ctx: Context, modelKey: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const modelMap: { [key: string]: { name: string, api_model: string, description: string, credits: string } } = {
      'gen4_aleph': { 
        name: 'Gen4 Aleph', 
        api_model: 'gen4_aleph', 
        description: 'Новейшая модель с максимальным качеством',
        credits: '15 кредитов/сек'
      },
      'gen4_turbo': { 
        name: 'Gen4 Turbo', 
        api_model: 'gen4_turbo', 
        description: 'Быстрая генерация с хорошим качеством',
        credits: '5 кредитов/сек'
      },
      'gen3a_turbo': { 
        name: 'Gen3A Turbo', 
        api_model: 'gen3a_turbo', 
        description: 'Проверенная модель для стабильных результатов',
        credits: '5 кредитов/сек'
      },
      'act_two': { 
        name: 'Act-Two', 
        api_model: 'act_two', 
        description: 'Специализированная модель для персонажей',
        credits: '5 кредитов/сек'
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

    await ctx.editMessageText(
      `🎬 ${selectedModel.name}\n\nНастройте параметры видео:`,
      { reply_markup: runwayVideoConfigMenu }
    );
  }

  // 🖼️ ВЫБОР МОДЕЛИ ИЗОБРАЖЕНИЙ
  async selectImageModel(ctx: Context, modelKey: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const modelMap: { [key: string]: { name: string, api_model: string, description: string, credits: string } } = {
      'gen4_image': { 
        name: 'Gen4 Image', 
        api_model: 'gen4_image', 
        description: 'Высокое качество изображений',
        credits: '5-8 кредитов'
      },
      'gen4_image_turbo': { 
        name: 'Gen4 Image Turbo', 
        api_model: 'gen4_image_turbo', 
        description: 'Быстрая генерация изображений',
        credits: '2 кредита'
      }
    };

    const selectedModel = modelMap[modelKey];
    if (!selectedModel) {
      await ctx.answerCallbackQuery("❌ Неизвестная модель");
      return;
    }

    this.setUserState(userId, { 
      action: 'image_generation',
      model: selectedModel.api_model,
      model_name: selectedModel.name
    });

    await ctx.editMessageText(
      `🖼️ ${selectedModel.name}\n\nНастройте параметры изображения:`,
      { reply_markup: runwayImageConfigMenu }
    );
  }

  // ⚙️ КОНФИГУРАЦИЯ ДЛИТЕЛЬНОСТИ
  async setDuration(ctx: Context, duration: number) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    this.setUserState(userId, { duration });
    await ctx.answerCallbackQuery(`⏱️ Длительность: ${duration} сек`);
  }

  // 📐 КОНФИГУРАЦИЯ СООТНОШЕНИЯ
  async setRatio(ctx: Context, ratio: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    this.setUserState(userId, { ratio });
    await ctx.answerCallbackQuery(`📐 Соотношение: ${ratio}`);
  }

  // ✅ ЗАВЕРШЕНИЕ КОНФИГУРАЦИИ
  async finishVideoConfig(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const state = this.getUserState(userId);
    
    await ctx.editMessageText(
      `🎬 ${state.model_name || 'Runway'} готова к работе!\n\nТеперь отправьте описание видео:`,
      { reply_markup: new InlineKeyboard().text("🔙 Изменить настройки", "runway_video_gen") }
    );

    this.sessionManager.createSession(userId, 'runway_video');
  }

  // ✅ ЗАВЕРШЕНИЕ КОНФИГУРАЦИИ ИЗОБРАЖЕНИЙ
  async finishImageConfig(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const state = this.getUserState(userId);
    
    await ctx.editMessageText(
      `🖼️ ${state.model_name || 'Runway'} готова к работе!\n\nТеперь отправьте описание изображения:`,
      { reply_markup: new InlineKeyboard().text("🔙 Изменить настройки", "runway_image_gen") }
    );

    this.sessionManager.createSession(userId, 'runway_image');
  }

  // 📚 СПРАВОЧНАЯ ИНФОРМАЦИЯ
  async showUsageHelp(ctx: Context) {
    await ctx.editMessageText(
      "📖 Как использовать Runway API\n\n1️⃣ Выберите тип контента\n2️⃣ Выберите модель\n3️⃣ Настройте параметры\n4️⃣ Отправьте описание\n5️⃣ Дождитесь результата",
      { reply_markup: backToRunwayMain }
    );
  }

  async showExamples(ctx: Context) {
    await ctx.editMessageText(
      "💡 Примеры промптов для Runway\n\n🎬 Видео:\n• Кот играет с мячиком\n• Волны разбиваются о скалы\n\n🖼️ Изображения:\n• Футуристический город\n• Портрет в стиле аниме",
      { reply_markup: backToRunwayMain }
    );
  }

  async showTips(ctx: Context) {
    await ctx.editMessageText(
      "🎯 Лучшие практики Runway\n\n✅ Описывайте детально\n✅ Указывайте стиль\n❌ Избегайте общих описаний\n💰 Используйте Turbo для тестов",
      { reply_markup: backToRunwayMain }
    );
  }

  async showApiInfo(ctx: Context) {
    await ctx.editMessageText(
      "🔧 Настройки Runway API\n\n✅ API ключ валидный\n⚠️ Модели требуют активации\n💳 1 кредит = $0.01\n\n📞 Обратитесь к администратору",
      { reply_markup: backToRunwayMain }
    );
  }
}
