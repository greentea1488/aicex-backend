import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { SessionManager } from "../services/SessionManager";
import { BaseAIHandler } from "./BaseAIHandler";
import { SecurityService } from "../../services/SecurityService";
import { 
  chatgptMainMenu, 
  chatgptModelsMenu, 
  chatgptImageModelsMenu,
  chatgptImageSettingsMenu,
  chatgptSettingsMenu,
  backToChatGPTMain
} from "../keyboards/chatgptKeyboard";
import { prisma } from "../../utils/prismaClient";
import { OpenAI } from "openai";

interface UserState {
  action?: string;
  model?: string;
  model_name?: string;
  image_size?: string;
  image_quality?: string;
  temperature?: number;
  max_tokens?: number;
  config?: any;
}

interface ChatGPTSettings {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  image_model?: string;
  image_size?: string;
  image_quality?: string;
}

export class ChatGPTHandler extends BaseAIHandler {
  private userStates: Map<string, UserState> = new Map();
  private securityService: SecurityService;
  private openai: OpenAI;

  constructor(sessionManager: SessionManager) {
    super(sessionManager);
    this.securityService = new SecurityService();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
  }

  private setUserState(userId: string, state: Partial<UserState>) {
    const currentState = this.userStates.get(userId) || {};
    this.userStates.set(userId, { ...currentState, ...state });
  }

  private getUserState(userId: string): UserState {
    return this.userStates.get(userId) || {};
  }

  // 🤖 ГЛАВНОЕ МЕНЮ CHATGPT
  async showMainMenu(ctx: Context) {
    await this.safeEditMessage(ctx,
      "🤖 ChatGPT - AI Assistant\n\nВыберите функцию:",
      { reply_markup: chatgptMainMenu }
    );
  }

  async handleCallback(ctx: Context, action: string): Promise<void> {
    try {
      // Обработка различных callback actions
      switch (action) {
        case 'text_chat':
          await this.startTextChat(ctx);
          break;
        case 'image_gen':
          await this.showImageGenMenu(ctx);
          break;
        case 'image_analyze':
          await ctx.reply("🚧 Анализ изображений в разработке");
          break;
        case 'model_settings':
          await ctx.reply("🚧 Настройки модели в разработке");
          break;
        default:
          this.logger.warn(`Unknown ChatGPT callback action: ${action}`);
      }
    } catch (error) {
      await this.handleError(ctx, error as Error, `ChatGPT callback ${action}`);
    }
  }

  // 🧠 ВЫБОР МОДЕЛЕЙ
  async showModelsMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // Получаем текущие настройки пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId: parseInt(userId) },
    });

    const currentModel = (user?.gptSettings as any)?.model || "gpt-4o-mini";

    await ctx.editMessageText(
      `🧠 Выбор модели ChatGPT\n\nТекущая модель: ${this.getModelDisplayName(currentModel)}\n\nВыберите новую модель:`,
      { reply_markup: chatgptModelsMenu }
    );
  }

  // 🎨 МЕНЮ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
  async showImageGenMenu(ctx: Context) {
    await ctx.editMessageText(
      "🖼️ Генерация изображений DALL-E\n\nВыберите модель:",
      { reply_markup: chatgptImageModelsMenu }
    );
  }

  // 📎 АНАЛИЗ ИЗОБРАЖЕНИЙ
  async showImageAnalyzeMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    this.setUserState(userId, { action: 'image_analyze' });

    await ctx.editMessageText(
      "📎 Анализ изображений GPT-4V\n\nТеперь отправьте изображение с описанием что нужно проанализировать:",
      { reply_markup: backToChatGPTMain }
    );

    this.sessionManager.createSession(userId, 'chatgpt_vision');
  }

  // ⚙️ НАСТРОЙКИ CHATGPT
  async showSettingsMenu(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const user = await prisma.user.findUnique({
      where: { telegramId: parseInt(userId) },
    });

    const settings = user?.gptSettings || {};

    await ctx.editMessageText(
      `⚙️ Настройки ChatGPT\n\n` +
      `🧠 Модель: ${this.getModelDisplayName((settings as any).model || "gpt-4o-mini")}\n` +
      `🌡️ Температура: ${(settings as any).temperature || 0.4}\n` +
      `📏 Макс. токены: ${(settings as any).max_tokens || 2000}\n\n` +
      `Выберите параметр для изменения:`,
      { reply_markup: chatgptSettingsMenu }
    );
  }

  // 🎯 ВЫБОР КОНКРЕТНОЙ МОДЕЛИ
  async selectModel(ctx: Context, modelKey: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const modelMap: { [key: string]: { name: string, api_model: string, description: string } } = {
      'gpt-4o': { 
        name: 'GPT-4o', 
        api_model: 'gpt-4o', 
        description: 'Новейшая мультимодальная модель' 
      },
      'gpt-4o-mini': { 
        name: 'GPT-4o Mini', 
        api_model: 'gpt-4o-mini', 
        description: 'Быстрая и экономичная модель' 
      },
      'gpt-4-turbo': { 
        name: 'GPT-4 Turbo', 
        api_model: 'gpt-4-turbo', 
        description: 'Улучшенная версия GPT-4' 
      },
      'gpt-4': { 
        name: 'GPT-4', 
        api_model: 'gpt-4', 
        description: 'Классическая мощная модель' 
      },
      'gpt-3.5-turbo': { 
        name: 'GPT-3.5 Turbo', 
        api_model: 'gpt-3.5-turbo', 
        description: 'Экономичная быстрая модель' 
      }
    };

    const selectedModel = modelMap[modelKey];
    if (!selectedModel) {
      await ctx.answerCallbackQuery("❌ Неизвестная модель");
      return;
    }

    // Сохраняем выбор модели в базу данных
    try {
      const existingUser = await prisma.user.findUnique({
        where: { telegramId: parseInt(userId) },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { telegramId: parseInt(userId) },
          data: {
            gptSettings: {
              model: selectedModel.api_model,
              temperature: 0.4,
              max_tokens: 2000,
              systemPrompt: "You are a helpful assistant. Respond in Russian unless asked otherwise."
            }
          }
        });
      } else {
        await prisma.user.create({
          data: {
            telegramId: parseInt(userId),
            username: ctx.from?.username || "unknown",
            gptSettings: {
              model: selectedModel.api_model,
              temperature: 0.4,
              max_tokens: 2000,
              systemPrompt: "You are a helpful assistant. Respond in Russian unless asked otherwise."
            }
          }
        });
      }

      await ctx.answerCallbackQuery(`✅ Модель изменена на ${selectedModel.name}`);
      
      await ctx.editMessageText(
        `✅ Модель успешно изменена!\n\n` +
        `🧠 Выбрана: ${selectedModel.name}\n` +
        `📝 ${selectedModel.description}\n\n` +
        `Теперь все ответы ChatGPT будут использовать эту модель.`,
        { reply_markup: backToChatGPTMain }
      );

    } catch (error) {
      console.error("Ошибка сохранения модели:", error);
      await ctx.answerCallbackQuery("❌ Ошибка сохранения настроек");
    }
  }

  // 🎨 ВЫБОР МОДЕЛИ ДЛЯ ИЗОБРАЖЕНИЙ
  async selectImageModel(ctx: Context, modelKey: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const modelMap: { [key: string]: { name: string, api_model: string, description: string } } = {
      'dall-e-3': { 
        name: 'DALL-E 3', 
        api_model: 'dall-e-3', 
        description: 'Лучшее качество изображений' 
      },
      'dall-e-2': { 
        name: 'DALL-E 2', 
        api_model: 'dall-e-2', 
        description: 'Быстрая генерация изображений' 
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
      `🎨 ${selectedModel.name} готова!\n\nТеперь отправьте описание изображения которое хотите создать:`,
      { reply_markup: backToChatGPTMain }
    );

    this.sessionManager.createSession(userId, 'chatgpt_image');
  }

  // 💬 ТЕКСТОВЫЙ ЧАТ
  async startTextChat(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const user = await prisma.user.findUnique({
      where: { telegramId: parseInt(userId) },
    });

    const modelName = this.getModelDisplayName(user?.gptSettings?.model || "gpt-4o-mini");

    await ctx.editMessageText(
      `💬 ChatGPT Текстовый чат\n\nМодель: ${modelName}\n\nТеперь отправьте любое сообщение для начала диалога:`,
      { reply_markup: backToChatGPTMain }
    );

    this.sessionManager.createSession(userId, 'chatgpt');
  }

  // 🖼️ ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ
  async generateImage(prompt: string, userId: string): Promise<string> {
    try {
      if (!this.openai.apiKey) {
        return "❌ OpenAI API ключ не настроен. Обратитесь к администратору.";
      }

      const state = this.getUserState(userId);
      const model = state.model || "dall-e-3";
      const size = state.image_size || "1024x1024";
      const quality = state.image_quality || "standard";

      console.log(`Генерируем изображение: ${prompt} с моделью ${model}`);

      const response = await this.openai.images.generate({
        model: model,
        prompt: prompt,
        n: 1,
        size: size as any,
        quality: quality as any,
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        return "❌ Не удалось сгенерировать изображение. Попробуйте еще раз.";
      }

      return imageUrl;

    } catch (error: any) {
      console.error("Ошибка генерации изображения:", error);
      
      if (error.code === 'content_policy_violation') {
        return "❌ Ваш запрос нарушает политику контента OpenAI. Попробуйте изменить описание.";
      }
      
      return `❌ Ошибка генерации изображения: ${error.message || "Неизвестная ошибка"}`;
    }
  }

  // 🔧 ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  private getModelDisplayName(modelKey: string): string {
    const modelNames: { [key: string]: string } = {
      'gpt-4o': 'GPT-4o (Новейшая)',
      'gpt-4o-mini': 'GPT-4o Mini (Быстрая)',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4 (Классика)',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo (Экономная)',
      'dall-e-3': 'DALL-E 3',
      'dall-e-2': 'DALL-E 2'
    };
    return modelNames[modelKey] || modelKey;
  }

  // 📊 ПОКАЗАТЬ ИНФОРМАЦИЮ О МОДЕЛИ
  async showModelInfo(ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const user = await prisma.user.findUnique({
      where: { telegramId: parseInt(userId) },
    });

    const settings = user?.gptSettings || {};
    const model = (settings as any).model || "gpt-4o-mini";

    await ctx.editMessageText(
      `📊 Информация о модели\n\n` +
      `🧠 Текущая модель: ${this.getModelDisplayName(model)}\n` +
      `🌡️ Температура: ${(settings as any).temperature || 0.4}\n` +
      `📏 Макс. токены: ${(settings as any).max_tokens || 2000}\n\n` +
      `💡 Температура влияет на креативность ответов (0.0-1.0)\n` +
      `📏 Макс. токены ограничивают длину ответа`,
      { reply_markup: backToChatGPTMain }
    );
  }
}
