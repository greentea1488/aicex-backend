import { OpenAI } from "openai";
import { BaseAIService, AIMessage, AIResponse } from "./BaseAIService";
import { prisma } from "../../../utils/prismaClient";

export class ChatGPTService extends BaseAIService {
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "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",
    });
  }

  getName(): string {
    return "ChatGPT";
  }

  validateConfig(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async chat(messages: AIMessage[], userId: string): Promise<AIResponse> {
    try {
      // Get user preferences from database
      const user = await prisma.user.findUnique({
        where: { telegramId: parseInt(userId) },
      });

      const completion = await this.client.chat.completions.create({
        model: user?.gptSettings?.model || "gpt-4.1-mini",
        messages: messages,
        temperature: 0.4,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content received from OpenAI");
      }

      return {
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error("ChatGPT Service Error:", error);
      
          // Fallback to demo response if API fails
          const lastMessage = messages[messages.length - 1];
          return {
            content: `🤖 *ChatGPT GPT-4.1-mini (Fallback Mode)*\n\nВозникла ошибка с API, но вот демо-ответ:\n\nВы написали: "${lastMessage.content}"\n\nПожалуйста, проверьте ваш OPENAI_API_KEY в .env файле.\n\n💡 ChatGPT GPT-4.1-mini - самая современная модель с лучшим пониманием и рассуждением!`,
            usage: {
              promptTokens: 50,
              completionTokens: 100,
              totalTokens: 150,
            },
          };
    }
  }

  // 🖼️ Генерация изображений DALL-E
  async generateImage(prompt: string, model: string = "dall-e-3", size: string = "1024x1024"): Promise<string> {
    try {
      const response = await this.client.images.generate({
        model: model,
        prompt: prompt,
        n: 1,
        size: size as any,
        quality: model === "dall-e-3" ? "standard" : undefined,
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL received from OpenAI");
      }

      return imageUrl;

    } catch (error: any) {
      console.error("DALL-E Image Generation Error:", error);
      
      if (error.code === 'content_policy_violation') {
        throw new Error("Ваш запрос нарушает политику контента OpenAI. Попробуйте изменить описание.");
      }
      
      throw new Error(`Ошибка генерации изображения: ${error.message || "Неизвестная ошибка"}`);
    }
  }

  // 👁️ Анализ изображений GPT-4V
  async analyzeImage(imageUrl: string, prompt: string): Promise<AIResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content received from OpenAI Vision");
      }

      return {
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };

    } catch (error: any) {
      console.error("GPT-4V Analysis Error:", error);
      throw new Error(`Ошибка анализа изображения: ${error.message || "Неизвестная ошибка"}`);
    }
  }

  // 🎤 Транскрипция аудио через Whisper
  async transcribeAudio(filePath: string, language: string = 'ru'): Promise<AIResponse> {
    try {
      const fs = await import('fs');
      const fileStream = fs.createReadStream(filePath);

      const transcription = await this.client.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: language,
        response_format: "text"
      });

      return {
        content: transcription as string,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };

    } catch (error: any) {
      console.error("Whisper Transcription Error:", error);
      throw new Error(`Ошибка транскрипции аудио: ${error.message || "Неизвестная ошибка"}`);
    }
  }

  // 📄 Анализ файла с контекстом
  async analyzeFile(fileContent: string, fileName: string, prompt: string, userId: string): Promise<AIResponse> {
    try {
      // Get user preferences from database
      const user = await prisma.user.findUnique({
        where: { telegramId: parseInt(userId) },
      });

      const messages: AIMessage[] = [
        {
          role: "system",
          content: "Ты - помощник, который анализирует файлы и отвечает на вопросы о них. Отвечай на русском языке."
        },
        {
          role: "user",
          content: `У меня есть файл "${fileName}" со следующим содержимым:\n\n${fileContent}\n\n${prompt}`
        }
      ];

      const completion = await this.client.chat.completions.create({
        model: user?.gptSettings?.model || "gpt-4o-mini",
        messages: messages,
        temperature: 0.4,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content received from OpenAI");
      }

      return {
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };

    } catch (error: any) {
      console.error("File Analysis Error:", error);
      throw new Error(`Ошибка анализа файла: ${error.message || "Неизвестная ошибка"}`);
    }
  }
}
