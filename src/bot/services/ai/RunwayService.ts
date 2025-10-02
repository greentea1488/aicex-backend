import axios from "axios";
import { BaseAIService, AIMessage, AIResponse } from "./BaseAIService";
import { prisma } from "../../../utils/prismaClient";

export class RunwayService extends BaseAIService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    super();
    // Runway API endpoint (правильный URL для публичного API)
    this.apiUrl = process.env.RUNWAY_API_URL || "https://api.dev.runwayml.com";
    this.apiKey = process.env.RUNWAY_API_KEY || "";
  }

  getName(): string {
    return "Runway";
  }

  validateConfig(): boolean {
    return !!this.apiKey && !!this.apiUrl;
  }

  async chat(messages: AIMessage[], userId: string): Promise<AIResponse> {
    try {
      // Check if API key is configured
      if (!this.apiKey || this.apiKey === "") {
        return {
          content:
            "🎬 Runway - AI Creative Suite\n\n" +
            "❌ Сервис не настроен\n\n" +
            "🔧 Для работы необходимо:\n" +
            "• Получить API ключ Runway\n" +
            "• Настроить переменную RUNWAY_API_KEY\n" +
            "• Активировать подписку Runway\n\n" +
            "📞 Обратитесь к администратору для настройки",
        };
      }

      // Get the last user message as the prompt
      const userMessages = messages.filter(m => m.role === "user");
      const prompt = userMessages[userMessages.length - 1]?.content;

      if (!prompt) {
        throw new Error("No prompt provided");
      }

      // Determine if this is a generation request
      if (this.isVideoGenerationRequest(prompt)) {
        return await this.generateVideo(prompt, userId);
      } else {
        // Show main menu and capabilities
        return this.getMainMenu();
      }
    } catch (error) {
      console.error("Runway Service Error:", error);
      return {
        content:
          "❌ Ошибка Runway API\n\n" +
          "🔧 Сервис временно недоступен\n" +
          "🔄 Попробуйте позже или используйте другой AI\n" +
          "📞 Если проблема повторяется, обратитесь к администратору",
      };
    }
  }

  private isVideoGenerationRequest(prompt: string): boolean {
    const videoKeywords = ["create", "generate", "make", "video", "animate", "motion"];
    const lowerPrompt = prompt.toLowerCase();

    // If prompt is descriptive and longer than 10 characters, assume it's a video request
    if (prompt.length > 10 && !lowerPrompt.match(/^(what|how|why|when|where|who|is|are|can|could|should)/)) {
      return true;
    }

    return videoKeywords.some(keyword => lowerPrompt.includes(keyword));
  }


  private getMainMenu(): AIResponse {
    return {
      content:
        "🎬 Runway - AI Creative Suite\n\n" +
        "Выберите что хотите создать:\n\n" +
        "🎥 **Генерация видео**\n" +
        "• Text-to-Video (текст в видео)\n" +
        "• Image-to-Video (изображение в видео)\n" +
        "• Gen-3 Alpha (новейшая модель)\n" +
        "• Gen-2 (проверенная модель)\n\n" +
        "🖼️ **Работа с изображениями**\n" +
        "• Удаление фона\n" +
        "• Расширение изображений\n" +
        "• Изменение стиля\n\n" +
        "✏️ **Редактирование видео**\n" +
        "• Удаление объектов\n" +
        "• Замена фона\n" +
        "• Цветокоррекция\n\n" +
        "📝 **Примеры запросов для видео:**\n" +
        "• 'Кот играет с мячиком'\n" +
        "• 'Волны разбиваются о берег'\n" +
        "• 'Человек идет по лесу'\n" +
        "• 'Дым поднимается от костра'\n\n" +
        "💡 Просто опишите что хотите увидеть!",
    };
  }

  async generateVideo(prompt: string, userId: string, model: string = "gen3"): Promise<AIResponse> {
    try {
      // Check if API key is configured
      if (!this.apiKey || this.apiKey === "") {
        return {
          content:
            "🎬 Runway Video Generator\n\n" +
            "❌ Сервис не настроен\n\n" +
            "🔧 Для работы необходимо:\n" +
            "• Получить API ключ Runway\n" +
            "• Настроить переменную RUNWAY_API_KEY\n" +
            "• Активировать подписку Runway\n\n" +
            "📞 Обратитесь к администратору для настройки",
        };
      }

      console.log("Making Runway Video API request:", {
        url: `${this.apiUrl}/v1/text_to_video`,
        prompt: prompt.trim(),
        model: model
      });

      // Correct Runway API structure based on docs.dev.runwayml.com
      const requestData = {
        promptText: prompt.trim(),  // Correct field name
        duration: 5, // 5 seconds default
        ratio: "1280:720", // Correct aspect ratio format
        model: model === "gen3" ? "gen3a_turbo" : "gen3a_turbo", // Map to available models
        seed: Math.floor(Math.random() * 1000000),
      };

      console.log("Request data:", requestData);

      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/v1/text_to_video`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06' // Required header
        },
        data: requestData,
        timeout: 60000 // Увеличиваем timeout для видео генерации
      });

      console.log("Runway Video API response:", response.data);

      // Check if response has task data
      if (response.data?.task_id || response.data?.id) {
        const taskId = response.data.task_id || response.data.id;
        const taskData = response.data;
        
        console.log(`✅ Runway video task created successfully: ${taskId}`);
        
        // Save task to database for tracking (опционально)
        try {
          await prisma.runwayTask.create({
            data: {
              taskId: taskId,
              userId: userId,
              prompt: prompt,
              model: model,
              type: "text_to_video",
              status: taskData.status || "CREATED"
            }
          });
          console.log(`💾 Runway task ${taskId} saved to database for user ${userId}`);
        } catch (dbError) {
          console.error("Failed to save Runway task to database:", dbError);
          // Continue anyway
        }
        
        return {
          content:
            `🎬 Видео принято в обработку Runway!\n\n` +
            `📝 Промпт: ${prompt}\n` +
            `🎭 Модель: ${model.toUpperCase()}\n` +
            `📊 Task ID: ${taskId}\n` +
            `✅ Статус: ${taskData.status || "CREATED"}\n\n` +
            `🚀 Ваш запрос успешно отправлен!\n\n` +
            `⏰ Время генерации: обычно 60-300 секунд\n` +
            `🔔 Готовое видео будет доставлено автоматически!\n` +
            `🔄 Можете создать еще видео, пока ждете\n\n` +
            `🎯 Runway ${model.toUpperCase()} активирована!`
        };
      }

      // Check for direct video URL in response
      if (response.data?.video_url || response.data?.output?.url) {
        const videoUrl = response.data.video_url || response.data.output.url;
        
        return {
          content:
            `🎬 Видео создано с помощью Runway!\n\n` +
            `📝 Промпт: ${prompt}\n` +
            `🎭 Модель: ${model.toUpperCase()}\n\n` +
            `🎥 [Посмотреть видео](${videoUrl})\n\n` +
            `💡 Runway API работает корректно!`,
        };
      }

      // Fallback response
      return {
        content:
          `🎬 Запрос на генерацию видео отправлен Runway!\n\n` +
          `📝 Промпт: ${prompt}\n` +
          `🎭 Модель: ${model.toUpperCase()}\n\n` +
          `⏰ Обработка может занять несколько минут\n` +
          `🔔 Результат придет автоматически\n\n` +
          `🎯 Runway API активирован!`
      };

    } catch (error: any) {
      console.error("❌ Runway Video API error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });

      // Handle specific error cases
      if (error.response?.status === 401) {
        return {
          content: 
            "🔐 Ошибка авторизации Runway API\n\n" +
            "❌ API ключ недействителен или истек\n" +
            "🔧 Проверьте настройки API ключа\n" +
            "💳 Убедитесь что подписка Runway активна\n" +
            "📞 Обратитесь к администратору",
        };
      }

      if (error.response?.status === 429) {
        return {
          content: 
            "⏳ Достигнут лимит запросов Runway\n\n" +
            "🚦 Слишком много запросов к Runway API\n" +
            "⏰ Попробуйте через несколько минут\n" +
            "💡 Runway имеет строгие лимиты",
        };
      }

      if (error.response?.status === 402) {
        return {
          content: 
            "💳 Недостаточно кредитов Runway\n\n" +
            "❌ Генерация видео требует Runway credits\n" +
            "🔄 Пополните баланс или купите подписку\n" +
            "📞 Обратитесь к администратору",
        };
      }

      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Неизвестная ошибка";
      
      // Специальная обработка для недоступных моделей
      if (errorMsg.includes("not available") || errorMsg.includes("variant")) {
        return {
          content: 
            "🎬 Runway API подключен!\n\n" +
            "✅ API ключ валидный и работает\n" +
            "⚠️ Модели видео генерации недоступны\n\n" +
            "🔧 Возможные причины:\n" +
            "• Требуется активация подписки Runway\n" +
            "• Нужен доступ к Gen3/Gen4 моделям\n" +
            "• Аккаунт требует верификации\n\n" +
            "📞 Обратитесь к администратору для:\n" +
            "• Активации нужного плана Runway\n" +
            "• Получения доступа к моделям\n\n" +
            "💡 API готов к работе после настройки!",
        };
      }
      
      return {
        content: 
          "❌ Ошибка генерации видео Runway\n\n" +
          `🔧 ${errorMsg}\n` +
          "🔄 Попробуйте позже или используйте другой AI\n" +
          "📞 Если проблема повторяется, обратитесь к администратору",
      };
    }
  }

}
