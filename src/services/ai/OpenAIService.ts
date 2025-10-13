import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import * as fs from 'fs';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VisionMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

export interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Чат с GPT-4o (новейшая версия)
   */
  async chat(messages: ChatMessage[], model: string = 'gpt-4o'): Promise<ChatResponse> {
    try {
      logger.info('OpenAI chat request:', { 
        model: model,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
      });

      const response = await this.client.chat.completions.create({
        model: model,
        messages: messages as any,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        return {
          success: false,
          error: 'No response from OpenAI'
        };
      }

      logger.info('OpenAI chat response received:', {
        model,
        usage: response.usage,
        responseLength: content.length
      });

      return {
        success: true,
        content: content,
        usage: response.usage || undefined
      };

    } catch (error: any) {
      logger.error('OpenAI chat error:', error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Анализ изображения с GPT-4 Vision
   */
  async analyzeImage(imageUrl: string, prompt: string = 'Опиши это изображение'): Promise<ChatResponse> {
    try {
      logger.info('OpenAI vision request:', { prompt: prompt.substring(0, 100) });

      const messages: VisionMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ];

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: messages as any,
        max_tokens: 1000,
        temperature: 0.7
      });

      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        return {
          success: false,
          error: 'No response from GPT-4 Vision'
        };
      }

      logger.info('OpenAI vision response received:', {
        usage: completion.usage,
        responseLength: content.length
      });

      return {
        success: true,
        content: content,
        usage: completion.usage || undefined
      };

    } catch (error: any) {
      logger.error('OpenAI vision error:', error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Генерация изображения с DALL-E
   */
  async generateImage(prompt: string, size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'): Promise<ChatResponse> {
    try {
      logger.info('DALL-E image generation:', { prompt: prompt.substring(0, 100), size });

      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: size,
        quality: 'standard',
        response_format: 'url'
      });

      const imageUrl = response.data?.[0]?.url;
      
      if (!imageUrl) {
        return {
          success: false,
          error: 'No image generated'
        };
      }

      logger.info('DALL-E image generated successfully');

      return {
        success: true,
        content: imageUrl
      };

    } catch (error: any) {
      logger.error('DALL-E generation error:', error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Создание эмбеддингов для текста
   */
  async createEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      return response.data[0]?.embedding || null;

    } catch (error: any) {
      logger.error('OpenAI embedding error:', error.message);
      return null;
    }
  }

  /**
   * Модерация контента
   */
  async moderateContent(text: string): Promise<{ flagged: boolean; categories?: any }> {
    try {
      const response = await this.client.moderations.create({
        input: text
      });

      const result = response.results[0];
      
      return {
        flagged: result?.flagged || false,
        categories: result?.categories
      };

    } catch (error: any) {
      logger.error('OpenAI moderation error:', error.message);
      return { flagged: false };
    }
  }

  /**
   * Улучшение промпта для генерации изображений
   */
  async enhancePrompt(originalPrompt: string): Promise<string> {
    try {
      const enhanceMessages: ChatMessage[] = [
        {
          role: 'system',
          content: `📌 Цель

Ты — профессиональный Prompt Enhancer, твоя задача — улучшать пользовательские промпты, написанные на русском языке, и адаптировать их под выбранную модель генерации.

🧭 Логика работы
1. Получив входной промпт, ты:
• Анализируешь суть и цель промпта.
• Определяешь его слабые стороны: неясность, отсутствие контекста, лишние слова, неточность в описании результата.
• Улучшаешь структуру, добавляешь четкие детали (стиль, свет, атмосфера, композицию, POV и т.д.).
• Переводишь улучшенный промпт на английский язык.
• Адаптируешь финальный текст под специфику генерации изображений.

2. Всегда следуй best-practice паттернам для генерации изображений:
• Упор на визуальные детали, стиль, свет, POV, камеру, уровень детализации, короткие прилагательные.
• Убирай лишние вводные фразы, держи структуру описания лаконичной и образной.
• Добавляй информацию о движении камеры, плане (close up / medium / wide), атмосфере.
• Разбивай сцены через запятые для лучшего понимания.

3. Выход строго в одном блоке:

✨ Improved prompt (EN):
[финальный улучшенный промпт на английском]

📝 Правила
• Никогда не добавляй от себя креатив, не изменяя смысл исходного промпта.
• Улучшай ясность, конкретику, структуру и адаптацию под модель.
• Если промпт уже достаточно хорош — слегка его шлифуй, не перегружай.
• Не используй длинные вводные фразы и сложные конструкции.
• Перевод на английский всегда должен звучать естественно для нативного prompt-инжиниринга.
• КРИТИЧНО: Сохраняй точный смысл исходного промпта!`
        },
        {
          role: 'user',
          content: `Улучши этот промпт: "${originalPrompt}"`
        }
      ];

      const response = await this.chat(enhanceMessages, 'gpt-4o');
      
      if (response.success && response.content) {
        // Извлекаем улучшенный промпт из блока
        const improvedMatch = response.content.match(/✨ Improved prompt \(EN\):\s*([^\n]+)/);
        if (improvedMatch && improvedMatch[1]) {
          return improvedMatch[1].trim();
        }
        
        // Fallback - если блок не найден, берем весь ответ
        return response.content.trim();
      }
      
      return originalPrompt;

    } catch (error) {
      logger.error('Prompt enhancement error:', error);
      return originalPrompt;
    }
  }

  /**
   * Перевод текста на английский для лучшей работы с AI
   */
  async translateToEnglish(text: string): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'Переведи текст на английский язык. Если текст уже на английском, верни его без изменений. Отвечай только переводом.'
        },
        {
          role: 'user',
          content: text
        }
      ];

      const response = await this.chat(messages, 'gpt-4o');
      
      if (response.success && response.content) {
        return response.content.trim();
      }
      
      return text;

    } catch (error) {
      logger.error('Translation error:', error);
      return text;
    }
  }

  /**
   * Парсинг ошибок OpenAI
   */
  private parseError(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    
    if (error.message) {
      return error.message;
    }
    
    if (error.status === 401) {
      return 'Invalid OpenAI API key';
    }
    
    if (error.status === 429) {
      return 'OpenAI rate limit exceeded. Please try again later.';
    }
    
    if (error.status === 400) {
      return 'Invalid request to OpenAI';
    }
    
    if (error.status === 500) {
      return 'OpenAI server error. Please try again.';
    }
    
    return 'Unknown OpenAI error occurred';
  }

  /**
   * Проверка валидности API ключа
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Hello' }
      ], 'gpt-4o');
      
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Получение доступных моделей
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      logger.error('Error getting OpenAI models:', error);
      return ['gpt-3.5-turbo', 'gpt-4'];
    }
  }

  /**
   * Транскрипция аудио с помощью Whisper API
   */
  async transcribeAudio(filePath: string, language?: string): Promise<ChatResponse> {
    try {
      logger.info('Whisper transcription request:', { filePath, language });

      // Проверяем существование файла
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'Файл не найден'
        };
      }

      // Создаем поток для чтения файла
      const fileStream = fs.createReadStream(filePath);

      const transcription = await this.client.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: language || 'ru',
        response_format: 'text'
      });

      logger.info('Whisper transcription completed:', {
        textLength: transcription?.length || 0
      });

      return {
        success: true,
        content: transcription as string
      };

    } catch (error: any) {
      logger.error('Whisper transcription error:', error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Перевод аудио в текст с последующим анализом через ChatGPT
   */
  async transcribeAndAnalyze(
    filePath: string, 
    prompt: string = 'Проанализируй этот текст и дай краткое резюме',
    language?: string
  ): Promise<ChatResponse> {
    try {
      // Сначала транскрибируем аудио
      const transcriptionResult = await this.transcribeAudio(filePath, language);
      
      if (!transcriptionResult.success || !transcriptionResult.content) {
        return transcriptionResult;
      }

      logger.info('Analyzing transcribed text with ChatGPT');

      // Теперь анализируем текст с помощью ChatGPT
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'Ты - помощник, который анализирует транскрипции аудио. Отвечай на русском языке.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nТранскрипция:\n${transcriptionResult.content}`
        }
      ];

      const analysisResult = await this.chat(messages, 'gpt-4o');

      if (analysisResult.success) {
        // Возвращаем комбинированный результат
        return {
          success: true,
          content: `📝 **Транскрипция:**\n${transcriptionResult.content}\n\n🤖 **Анализ:**\n${analysisResult.content}`,
          usage: analysisResult.usage
        };
      }

      return analysisResult;

    } catch (error: any) {
      logger.error('Transcribe and analyze error:', error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Чат с контекстом файла
   */
  async chatWithFile(
    fileContent: string, 
    userPrompt: string, 
    fileName?: string,
    model: string = 'gpt-4o'
  ): Promise<ChatResponse> {
    try {
      logger.info('Chat with file:', { fileName, promptLength: userPrompt.length });

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'Ты - помощник, который анализирует файлы и отвечает на вопросы о них. Отвечай на русском языке.'
        },
        {
          role: 'user',
          content: `У меня есть файл${fileName ? ` "${fileName}"` : ''} со следующим содержимым:\n\n${fileContent}\n\n${userPrompt}`
        }
      ];

      return await this.chat(messages, model);

    } catch (error: any) {
      logger.error('Chat with file error:', error.message);
      
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }
}
