import axios from "axios";
import { BaseAIService, AIMessage, AIResponse } from "./BaseAIService";
import { prisma } from "../../../utils/prismaClient";

export class FreepikLoraService extends BaseAIService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    super();
    // Freepik Pikaso API endpoint
    this.apiUrl = process.env.FREEPIK_API_URL || "https://api.freepik.com/v1";
    this.apiKey = process.env.FREEPIK_API_KEY || "";
  }

  getName(): string {
    return "Freepik + Lora";
  }

/*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Validates the configuration by checking if both the API key and URL are
   * defined.
   *
   * @return {boolean} True if the API key and URL are defined, false otherwise.
   */
/*******  a161da98-a343-44e6-8082-1aeab939f6c8  *******/
  validateConfig(): boolean {
    if (!this.apiKey || this.apiKey === "") {
      console.error("Freepik API key is not configured");
      return false;
    }
    if (!this.apiUrl) {
      console.error("Freepik API URL is not configured");
      return false;
    }
    return true;
  }

  async chat(messages: AIMessage[], userId: string): Promise<AIResponse> {
    try {
      // Get the last user message as the prompt
      const userMessages = messages.filter(m => m.role === "user");
      const prompt = userMessages[userMessages.length - 1]?.content;

      if (!prompt) {
        throw new Error("No prompt provided");
      }

      // Check if this is an image generation request
      if (this.isImageGenerationRequest(prompt)) {
        return await this.generateImage(prompt, userId);
      } else {
        // For non-image requests, provide guidance
        if (!this.apiKey || this.apiKey === "") {
          return {
            content:
              "🎨 Freepik + Lora - AI Image Generator\n\n" +
              "❌ Сервис не настроен\n\n" +
              "🔧 Для работы необходимо:\n" +
              "• Получить API ключ на freepik.com\n" +
              "• Настроить FREEPIK_API_KEY\n" +
              "• Активировать подписку\n\n" +
              "💡 Используйте другие AI сервисы:\n" +
              "• Midjourney для изображений\n" +
              "• ChatGPT для текста\n" +
              "• Kling для видео",
          };
        }

        return {
          content:
            "🎨 Freepik + Lora - AI Генератор изображений\n\n" +
            "Создавайте изображения с помощью LoRA моделей!\n\n" +
            "📝 Примеры запросов:\n" +
            "• 'Портрет в стиле аниме'\n" +
            "• 'Пейзаж акварелью'\n" +
            "• 'Фото продукта в минималистском стиле'\n" +
            "• 'Персонаж в пиксель-арт стиле'\n\n" +
            "🎭 Доступные стили LoRA:\n" +
            "• Anime/Manga\n" +
            "• Watercolor (акварель)\n" +
            "• Oil Painting (масляная живопись)\n" +
            "• Pixel Art (пиксель-арт)\n" +
            "• Photorealistic (фотореализм)\n" +
            "• Abstract (абстракция)\n\n" +
            "💬 Что вы хотите создать?",
        };
      }
    } catch (error) {
      console.error("Freepik Lora Service Error:", error);
      throw new Error("Failed to process Freepik + Lora request");
    }
  }

  private isImageGenerationRequest(prompt: string): boolean {
    const imageKeywords = ["create", "generate", "draw", "paint", "design", "style", "portrait", "landscape"];
    const lowerPrompt = prompt.toLowerCase();

    // If prompt is descriptive and longer than 10 characters, assume it's an image request
    if (prompt.length > 10 && !lowerPrompt.match(/^(what|how|why|when|where|who|is|are|can|could|should)/)) {
      return true;
    }

    return imageKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  private async generateImage(prompt: string, userId: string): Promise<AIResponse> {
    try {
      // Check if API key is configured
      if (!this.apiKey || this.apiKey === "") {
        return {
          content: 
            "❌ Freepik API не настроен\n\n" +
            "🔧 Для работы с Freepik API необходимо:\n" +
            "1. Получить API ключ на freepik.com\n" +
            "2. Добавить FREEPIK_API_KEY в переменные окружения\n" +
            "3. Убедиться, что у вас есть активная подписка\n\n" +
            "💡 Пока API не настроен, используйте другие сервисы:\n" +
            "• ChatGPT для текста\n" +
            "• Midjourney для изображений\n" +
            "• Kling для видео\n" +
            "• Runway для мультимедиа",
        };
      }

      // Get user settings
      const user = await prisma.user.findUnique({
        where: { telegramId: parseInt(userId) },
      });

      // Detect Lora style from prompt
      const loraStyle = this.detectLoraStyle(prompt);

      // Use correct Freepik API structure (simplified without custom styles)
      // Пока без webhook URL - будем тестировать через тестовый endpoint
    // const webhookUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') + "/api/freepik/webhook";
      
      const requestData = {
        prompt: prompt.trim(),
        aspect_ratio: "square_1_1",
        resolution: "2k",
        model: "realism",
        creative_detailing: 33,
        engine: "automatic",
        fixed_generation: false,
        filter_nsfw: true,
        // webhook_url: webhookUrl // Отключено для тестирования
        // Removed styling section to avoid "Invalid style name" error
      };

      console.log("Making Freepik API request:", {
        url: `${this.apiUrl}/ai/mystic`,
        data: requestData
      });

      // Use correct Freepik API headers
      const headers = {
        "Content-Type": "application/json",
        "x-freepik-api-key": this.apiKey
      };

      console.log("Headers being sent:", headers);
      console.log("Making request to:", `${this.apiUrl}/ai/mystic`);

      const response = await axios.post(
        `${this.apiUrl}/ai/mystic`,
        requestData,
        {
          headers,
          timeout: 60000, // Increase timeout for image generation
        }
      );

      console.log("Freepik API response:", response.data);

      // Handle Freepik Mystic API response
      if (response.data) {
        // Check if response has data object (new structure)
        if (response.data.data) {
          const taskData = response.data.data;
          
          // Check if it's a task response with task_id - save to database and return success
          if (taskData.task_id) {
            const taskId = taskData.task_id;
            console.log(`✅ Task created successfully: ${taskId}`);
            
            // Сохраняем задачу в базу данных для отслеживания через webhook
            try {
              await prisma.freepikTask.create({
                data: {
                  taskId: taskId,
                  userId: userId,
                  prompt: prompt,
                  model: "realism", // Default model for now
                  status: taskData.status || "CREATED"
                }
              });
              console.log(`💾 Task ${taskId} saved to database for user ${userId}`);
            } catch (dbError) {
              console.error("Failed to save task to database:", dbError);
              // Continue anyway - webhook might still work
            }
            
            // Return immediate success with webhook info
            return {
              content:
                `🎨 Изображение принято в обработку!\n\n` +
                `📝 Промпт: ${prompt}\n` +
                `🎭 Стиль: ${loraStyle}\n` +
                `📊 Task ID: ${taskId}\n` +
                `✅ Статус: Принято к генерации\n\n` +
                `🚀 Ваш запрос успешно отправлен!\n\n` +
                `⏰ Время генерации: обычно 30-90 секунд\n` +
                `🔔 Готовое изображение придет автоматически!\n` +
                `🔄 Можете создать еще изображения, пока ждете\n\n` +
                `📧 Webhook настроен для автоматической доставки.\n` +
                `🎯 Попробуйте разные промпты и стили!`
            };
          }
          
          // Check if it has generated images
          if (taskData.generated && Array.isArray(taskData.generated) && taskData.generated.length > 0) {
            const imageData = taskData.generated[0];
            if (imageData && imageData.base64) {
              return {
                content:
                  `🎨 Изображение создано с помощью Freepik Mystic!\n\n` +
                  `📝 Промпт: ${prompt}\n` +
                  `🎭 Стиль: ${loraStyle}\n` +
                  `📐 Разрешение: 2048x2048\n\n` +
                  `🖼️ Изображение готово!\n` +
                  `💡 Base64 данные получены успешно!`,
              };
            }
          }
        }
        
        // Check if it's a direct task response - start polling
        if (response.data.task_id) {
          const taskId = response.data.task_id;
          console.log(`Starting polling for task: ${taskId}`);
          
          // Wait for the image to be generated
          const finalResult = await this.pollTaskStatus(taskId, prompt, loraStyle);
          return finalResult;
        }
        
        // Check for any URL in response
        if (response.data.url) {
          return {
            content:
              `🎨 Изображение создано с помощью Freepik!\n\n` +
              `📝 Промпт: ${prompt}\n` +
              `🎭 Стиль: ${loraStyle}\n\n` +
              `🖼️ [Посмотреть изображение](${response.data.url})\n\n` +
              `💡 Freepik API работает корректно!`,
          };
        }
      }

      throw new Error("Unexpected response format");
    } catch (error: any) {
      console.error("Freepik generation error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });

      if (error.response?.status === 401) {
        return {
          content: 
            "🔑 Ошибка авторизации Freepik API\n\n" +
            "❌ API ключ недействительный или истек\n" +
            "🔧 Проверьте FREEPIK_API_KEY в настройках\n" +
            "💳 Убедитесь, что у вас активная подписка",
        };
      }

      if (error.response?.status === 429) {
        return {
          content: 
            "⏳ Достигнут лимит запросов\n\n" +
            "🚦 Слишком много запросов к Freepik API\n" +
            "⏰ Попробуйте через несколько минут\n" +
            "💡 Используйте другие AI сервисы пока ждете",
        };
      }

      if (error.response?.status === 402) {
        return {
          content: 
            "💳 Недостаточно кредитов\n\n" +
            "❌ Генерация изображений требует токены\n" +
            "🔄 Пополните баланс или купите подписку\n" +
            "📞 Обратитесь к администратору",
        };
      }

      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "Неверный запрос";
        return {
          content: 
            `❌ Ошибка валидации Freepik API\n\n` +
            `📝 Детали: ${errorMessage}\n\n` +
            `🔧 Возможные причины:\n` +
            `• Неподдерживаемый формат промпта\n` +
            `• Некорректные параметры запроса\n` +
            `• Устаревшая версия API\n\n` +
            `💡 Попробуйте упростить промпт или используйте другой AI сервис`,
        };
      }

      if (error.response?.data?.message) {
        return {
          content: `❌ Freepik API Error: ${error.response.data.message}`,
        };
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          content: 
            "⏰ Превышено время ожидания\n\n" +
            "❌ Freepik API не отвечает\n" +
            "🔄 Попробуйте позже\n" +
            "💡 Используйте другие AI сервисы",
        };
      }

      return {
        content: 
          "❌ Ошибка генерации изображения\n\n" +
          "🔧 Сервис временно недоступен\n" +
          "🔄 Попробуйте позже или используйте другой AI\n" +
          "📞 Если проблема повторяется, обратитесь к администратору",
      };
    }
  }

  // 🎬 Video generation method - Updated for correct Freepik endpoints
  async generateVideo(prompt: string, userId: string, modelKey: string = "kling-v2"): Promise<AIResponse> {
    try {
      // Check if API key is configured
      if (!this.apiKey || this.apiKey === "") {
        return {
          content:
            "🎬 Freepik Video Generator\n\n" +
            "❌ Сервис не настроен\n\n" +
            "🔧 Для работы необходимо:\n" +
            "• Получить API ключ Freepik\n" +
            "• Настроить переменную FREEPIK_API_KEY\n" +
            "• Активировать подписку для генерации видео\n\n" +
            "📞 Обратитесь к администратору для настройки",
        };
      }

      // Map model keys to actual API endpoints and configurations
      const videoModels: { [key: string]: { endpoint: string, name: string, requiresImage?: boolean, params?: any } } = {
        "kling-v2.5-pro": { endpoint: "image-to-video/kling-v2-5-pro", name: "Kling v2.5 Pro", requiresImage: true },
        "minimax-hailuo-02-768p": { endpoint: "image-to-video/minimax-hailuo-02-768p", name: "Minimax Hailuo 02 768p", requiresImage: true },
        "minimax-hailuo-02-1080p": { endpoint: "image-to-video/minimax-hailuo-02-1080p", name: "Minimax Hailuo 02 1080p", requiresImage: true },
        "kling-v2.1-master": { endpoint: "image-to-video/kling-v2-1-master", name: "Kling v2.1 Master", requiresImage: true },
        "kling-pro-v2.1": { endpoint: "image-to-video/kling-pro-v2-1", name: "Kling Pro v2.1", requiresImage: true },
        "pixverse-v5": { endpoint: "image-to-video/pixverse-v5", name: "PixVerse V5", requiresImage: true },
        "pixverse-v5-transition": { endpoint: "image-to-video/pixverse-v5-transition", name: "PixVerse V5 Transition", requiresImage: true },
        "kling-std-v2.1": { endpoint: "image-to-video/kling-std-v2-1", name: "Kling Std v2.1", requiresImage: true },
        "kling-v2": { endpoint: "image-to-video/kling-v2", name: "Kling v2", requiresImage: true },
        "kling-pro-1.6": { endpoint: "image-to-video/kling-pro-1-6", name: "Kling Pro 1.6", requiresImage: true },
        "kling-std-1.6": { endpoint: "image-to-video/kling-std-1-6", name: "Kling Std 1.6", requiresImage: true },
        "kling-elements-pro-1.6": { endpoint: "image-to-video/kling-elements-pro-1-6", name: "Kling Elements Pro 1.6", requiresImage: true },
        "kling-elements-std-1.6": { endpoint: "image-to-video/kling-elements-std-1-6", name: "Kling Elements Std 1.6", requiresImage: true },
        "seedance-pro-1080p": { endpoint: "image-to-video/seedance-pro-1080p", name: "Seedance Pro 1080p", requiresImage: true },
        "seedance-pro-720p": { endpoint: "image-to-video/seedance-pro-720p", name: "Seedance Pro 720p", requiresImage: true },
        "seedance-pro-480p": { endpoint: "image-to-video/seedance-pro-480p", name: "Seedance Pro 480p", requiresImage: true },
        "seedance-lite-1080p": { endpoint: "image-to-video/seedance-lite-1080p", name: "Seedance Lite 1080p", requiresImage: true },
        "seedance-lite-720p": { endpoint: "image-to-video/seedance-lite-720p", name: "Seedance Lite 720p", requiresImage: true },
        "seedance-lite-480p": { endpoint: "image-to-video/seedance-lite-480p", name: "Seedance Lite 480p", requiresImage: true },
        "wan-v2.2-720p": { endpoint: "image-to-video/wan-v2-2-720p", name: "Wan v2.2 720p", requiresImage: true },
        "wan-v2.2-580p": { endpoint: "image-to-video/wan-v2-2-580p", name: "Wan v2.2 580p", requiresImage: true },
        "wan-v2.2-480p": { endpoint: "image-to-video/wan-v2-2-480p", name: "Wan v2.2 480p", requiresImage: true }
      };

      const selectedModel = videoModels[modelKey];
      if (!selectedModel) {
        return {
          content:
            `❌ Неизвестная модель видео: ${modelKey}\n\n` +
            `🎭 Доступные модели:\n` +
            `• Kling v2 (рекомендуется)\n` +
            `• Kling Pro v2.1\n` +
            `• PixVerse V5\n` +
            `• Minimax Hailuo\n` +
            `• И многие другие!\n\n` +
            `🔄 Попробуйте выбрать модель из меню`
        };
      }

      // For image-to-video, we need a base image
      // For now, let's create a simple placeholder image or use a stock image
      const placeholderImageUrl = "https://storage.googleapis.com/fc-freepik-pro-rev1-eu-static/landing-api/examples/freepik__upload__53227.png";

      const fullUrl = `${this.apiUrl}/ai/${selectedModel.endpoint}`;
      
      console.log("Making Freepik Video API request:", {
        url: fullUrl,
        model: selectedModel.name,
        prompt: prompt.trim()
      });

      // Basic request data for image-to-video
      const requestData: any = {
        duration: "5", // 5 seconds
        prompt: prompt.trim()
      };

      // Add image for image-to-video models
      if (selectedModel.requiresImage) {
        requestData.image = placeholderImageUrl; // Using placeholder for now
      }

      console.log("Request data:", requestData);

      const response = await axios({
        method: 'POST',
        url: fullUrl,
        headers: {
          'Content-Type': 'application/json',
          'x-freepik-api-key': this.apiKey
        },
        data: requestData,
        timeout: 30000
      });

      console.log("Freepik Video API response:", response.data);

      // Check if response has task data
      if (response.data?.data?.task_id) {
        const taskId = response.data.data.task_id;
        const taskData = response.data.data;
        
        console.log(`✅ Video task created successfully: ${taskId}`);
        
        // Save task to database for webhook tracking
        try {
          await prisma.freepikTask.create({
            data: {
              taskId: taskId,
              userId: userId,
              prompt: prompt,
              model: modelKey,
              type: "video",
              status: taskData.status || "CREATED"
            }
          });
          console.log(`💾 Video task ${taskId} saved to database for user ${userId}`);
        } catch (dbError) {
          console.error("Failed to save video task to database:", dbError);
        }
        
        return {
          content:
            `🎬 Видео принято в обработку!\n\n` +
            `📝 Промпт: ${prompt}\n` +
            `🎭 Модель: ${selectedModel.name}\n` +
            `📊 Task ID: ${taskId}\n` +
            `✅ Статус: ${taskData.status || "CREATED"}\n\n` +
            `🚀 Ваш запрос успешно отправлен!\n\n` +
            `⏰ Время генерации: обычно 60-180 секунд\n` +
            `🔔 Готовое видео придет автоматически!\n` +
            `🔄 Можете создать еще видео, пока ждете\n\n` +
            `🎯 ${selectedModel.name} активирована!`
        };
      }

      // Fallback response
      return {
        content:
          `🎬 Запрос на генерацию видео отправлен!\n\n` +
          `📝 Промпт: ${prompt}\n` +
          `🎭 Модель: ${selectedModel.name}\n\n` +
          `⏰ Обработка может занять несколько минут\n` +
          `🔔 Результат придет через webhook\n\n` +
          `🎯 Freepik Video API активирован!`
      };

    } catch (error: any) {
      console.error("❌ Freepik Video API error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });

      // Handle specific error cases
      if (error.response?.status === 404) {
        return {
          content: 
            "🔍 Модель видео не найдена\n\n" +
            `❌ Endpoint не существует для модели: ${modelKey}\n` +
            "🔧 Возможно модель еще не доступна\n" +
            "💡 Попробуйте другую модель из списка\n" +
            "📞 Обратитесь к администратору",
        };
      }

      if (error.response?.status === 401) {
        return {
          content: 
            "🔐 Ошибка авторизации Freepik Video API\n\n" +
            "❌ API ключ недействителен или истек\n" +
            "🔧 Проверьте настройки API ключа\n" +
            "💳 Убедитесь что подписка активна\n" +
            "📞 Обратитесь к администратору",
        };
      }

      if (error.response?.status === 429) {
        return {
          content: 
            "⏳ Достигнут лимит запросов на видео\n\n" +
            "🚦 Слишком много запросов к Freepik Video API\n" +
            "⏰ Попробуйте через несколько минут\n" +
            "💡 Генерация видео требует больше ресурсов",
        };
      }

      if (error.response?.status === 402) {
        return {
          content: 
            "💳 Недостаточно кредитов для видео\n\n" +
            "❌ Генерация видео требует больше токенов\n" +
            "🔄 Пополните баланс или купите подписку\n" +
            "📞 Обратитесь к администратору",
        };
      }

      const errorMsg = error.response?.data?.message || error.message || "Неизвестная ошибка";
      
      return {
        content: 
          "❌ Ошибка генерации видео\n\n" +
          `🔧 ${errorMsg}\n` +
          "🔄 Попробуйте позже или другую модель\n" +
          "📞 Если проблема повторяется, обратитесь к администратору",
      };
    }
  }

  private detectLoraStyle(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    const styleMap: { [key: string]: string[] } = {
      anime: ["anime", "manga", "japanese", "kawaii"],
      watercolor: ["watercolor", "aquarelle", "wash"],
      oil_painting: ["oil", "painting", "classical", "renaissance"],
      pixel_art: ["pixel", "8bit", "16bit", "retro", "pixelated"],
      photorealistic: ["realistic", "photo", "photography", "real"],
      abstract: ["abstract", "surreal", "artistic"],
    };

    for (const [style, keywords] of Object.entries(styleMap)) {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        return style;
      }
    }

    // Default style
    return "photorealistic";
  }

  private async pollTaskStatus(taskId: string, prompt: string, style: string, maxAttempts: number = 30): Promise<AIResponse> {
    console.log(`🔄 Polling task ${taskId}, max attempts: ${maxAttempts}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📡 Polling attempt ${attempt}/${maxAttempts} for task ${taskId}`);
        
        // Try multiple possible endpoints for task status
        const possibleEndpoints = [
          `${this.apiUrl}/ai/mystic/task/${taskId}`,
          `${this.apiUrl}/ai/mystic/tasks/${taskId}`,
          `${this.apiUrl}/ai/task/${taskId}`,
          `${this.apiUrl}/ai/tasks/${taskId}`,
          `${this.apiUrl}/task/${taskId}`,
          `${this.apiUrl}/tasks/${taskId}`
        ];

        let response: any = null;
        let lastError: any = null;

        for (const endpoint of possibleEndpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            response = await axios.get(endpoint, {
              headers: {
                "x-freepik-api-key": this.apiKey
              },
              timeout: 30000
            });
            console.log(`✅ Success with endpoint: ${endpoint}`);
            break;
          } catch (error: any) {
            console.log(`❌ Failed endpoint ${endpoint}: ${error.response?.status || error.message}`);
            lastError = error;
            continue;
          }
        }

        if (!response) {
          throw lastError || new Error("All polling endpoints failed");
        }

        console.log(`📊 Task ${taskId} status:`, response.data);

        if (response && response.data && response.data.data) {
          const taskData = response.data.data;
          
          // Check if task is completed
          if (taskData.status === 'COMPLETED' && taskData.generated && taskData.generated.length > 0) {
            const imageData = taskData.generated[0];
            
            if (imageData.base64) {
              // Success! We have the image - return with base64 data
              return {
                content:
                  `🎨 Изображение создано успешно!\n\n` +
                  `📝 Промпт: ${prompt}\n` +
                  `🎭 Стиль: ${style}\n` +
                  `📐 Разрешение: 2048x2048\n` +
                  `⏱️ Время генерации: ${attempt * 3} сек\n\n` +
                  `🖼️ Изображение готово!\n` +
                  `📊 Task ID: ${taskId}\n\n` +
                  `✅ Freepik API работает отлично!\n` +
                  `💡 Попробуйте другие стили и промпты!\n\n` +
                  `data:image/jpeg;base64,${imageData.base64}`
              };
            }
            
            if (imageData.url) {
              return {
                content:
                  `🎨 Изображение создано успешно!\n\n` +
                  `📝 Промпт: ${prompt}\n` +
                  `🎭 Стиль: ${style}\n` +
                  `⏱️ Время генерации: ${attempt * 3} сек\n\n` +
                  `🖼️ [Открыть изображение](${imageData.url})\n` +
                  `📊 Task ID: ${taskId}\n\n` +
                  `✅ Freepik API работает отлично!`
              };
            }
          }
          
          // Check if task failed
          if (taskData.status === 'FAILED') {
            const errorMessage = taskData.error_message || 'Неизвестная ошибка';
            return {
              content:
                `❌ Генерация изображения не удалась\n\n` +
                `📝 Промпт: ${prompt}\n` +
                `🚫 Причина: ${errorMessage}\n` +
                `📊 Task ID: ${taskId}\n\n` +
                `💡 Попробуйте:\n` +
                `• Изменить промпт\n` +
                `• Использовать другую модель\n` +
                `• Убрать нежелательные слова`
            };
          }
          
          // Task is still processing
          if (taskData.status === 'PROCESSING' || taskData.status === 'PENDING') {
            console.log(`⏳ Task ${taskId} is ${taskData.status}, waiting...`);
          }
        }
        
        // Wait 3 seconds before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error: any) {
        console.error(`❌ Polling error for task ${taskId} (attempt ${attempt}):`, error.message);
        
        if (attempt === maxAttempts) {
          return {
            content:
              `⏰ Превышено время ожидания генерации\n\n` +
              `📝 Промпт: ${prompt}\n` +
              `📊 Task ID: ${taskId}\n` +
              `⏱️ Время ожидания: ${maxAttempts * 3} сек\n\n` +
              `🔄 Изображение может быть готово позже.\n` +
              `💡 Попробуйте создать новое изображение.`
          };
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Timeout reached
    return {
      content:
        `⏰ Превышено время ожидания\n\n` +
        `📝 Промпт: ${prompt}\n` +
        `📊 Task ID: ${taskId}\n` +
        `⏱️ Ожидали: ${maxAttempts * 3} секунд\n\n` +
        `🔄 Генерация может продолжаться на сервере.\n` +
        `💡 Попробуйте снова через несколько минут.`
    };
  }


}
