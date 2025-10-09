import { OpenAIService } from './ai/OpenAIService';
import { logger } from '../utils/logger';

export interface PromptEnhancementOptions {
  style?: 'photographic' | 'artistic' | 'realistic' | 'fantasy' | 'anime';
  quality?: 'high' | 'medium' | 'low';
  language?: 'ru' | 'en';
  addDetails?: boolean;
  improveComposition?: boolean;
  model?: string; // Добавляем модель для адаптации
}

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  improvements: string[];
  style: string;
  quality: string;
}

export class PromptEnhancerService {
  private openai: OpenAIService;

  constructor() {
    this.openai = new OpenAIService();
  }

  /**
   * Улучшает промпт для генерации изображений
   */
  async enhancePrompt(
    originalPrompt: string, 
    options: PromptEnhancementOptions = {}
  ): Promise<EnhancedPrompt> {
    try {
      const {
        style = 'photographic',
        quality = 'high',
        language = 'ru',
        addDetails = true,
        improveComposition = true
      } = options;

      console.log('==================== PROMPT ENHANCER START ====================');
      console.log('Original Prompt:', originalPrompt);
      console.log('Options:', JSON.stringify(options, null, 2));
      console.log('===============================================================');

      // Создаем системный промпт для улучшения
      const systemPrompt = this.createSystemPrompt(style, quality, language, addDetails, improveComposition, options.model);
      
      // Создаем пользовательский промпт
      const userPrompt = `Улучши этот промпт для генерации изображения: "${originalPrompt}"`;

      logger.info('🔥 Prompt Enhancer - Starting enhancement:', {
        originalPrompt: originalPrompt.substring(0, 100),
        style,
        quality,
        language
      });

      // Вызываем GPT для улучшения промпта
      console.log('==================== CALLING GPT FOR ENHANCEMENT ====================');
      console.log('System prompt length:', systemPrompt.length);
      console.log('User prompt:', userPrompt);
      console.log('===============================================================');
      
      const response = await this.openai.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 'gpt-4o');
      
      console.log('==================== GPT RESPONSE ====================');
      console.log('Response success:', response.success);
      console.log('Response content:', response.content);
      console.log('Response error:', response.error);
      console.log('===============================================================');

      if (!response.success || !response.content) {
        throw new Error('Failed to enhance prompt');
      }

      // Парсим ответ GPT
      const enhancedPrompt = this.parseEnhancedPrompt(response.content, originalPrompt);
      
      console.log('==================== PROMPT ENHANCER RESULT ====================');
      console.log('Original:', enhancedPrompt.original);
      console.log('Enhanced:', enhancedPrompt.enhanced);
      console.log('Improvements:', enhancedPrompt.improvements);
      console.log('===============================================================');

      logger.info('🔥 Prompt Enhancer - Success:', {
        originalLength: originalPrompt.length,
        enhancedLength: enhancedPrompt.enhanced.length,
        improvementsCount: enhancedPrompt.improvements.length
      });

      return enhancedPrompt;

    } catch (error: any) {
      logger.error('🔥 Prompt Enhancer ERROR:', error);
      console.log('==================== PROMPT ENHANCER ERROR ====================');
      console.log('Error:', error);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('Using fallback prompt');
      console.log('===============================================================');
      
      // Возвращаем оригинальный промпт с базовыми улучшениями
      return this.createFallbackPrompt(originalPrompt, options);
    }
  }

  /**
   * Создает системный промпт для GPT
   */
  private createSystemPrompt(
    style: string, 
    quality: string, 
    language: string, 
    addDetails: boolean, 
    improveComposition: boolean,
    model?: string
  ): string {
    const languageInstructions = language === 'ru' 
      ? 'Отвечай на русском языке, но улучшенный промпт должен быть на английском (так лучше работает с AI моделями).'
      : 'Respond in English and keep the enhanced prompt in English.';

    const styleInstructions = this.getStyleInstructions(style);
    const qualityInstructions = this.getQualityInstructions(quality);
    const modelInstructions = this.getModelInstructions(model);

    return `📌 Цель

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
• КРИТИЧНО: Сохраняй точный смысл исходного промпта!

СТИЛЬ: ${styleInstructions}
КАЧЕСТВО: ${qualityInstructions}
${modelInstructions}

ФОРМАТ ОТВЕТА (строго соблюдай):
✨ Improved prompt (EN):
[улучшенный промпт на английском]

Пример:
✨ Improved prompt (EN):
A majestic horse galloping through a misty field at dusk, cinematic wide shot, golden hour lighting, dramatic clouds, photorealistic, high detail, professional wildlife photography`;
  }

  /**
   * Инструкции по стилю
   */
  private getStyleInstructions(style: string): string {
    const styles = {
      photographic: 'Фотографический стиль - реалистичные изображения, профессиональная фотография',
      artistic: 'Художественный стиль - креативные и выразительные изображения',
      realistic: 'Реалистичный стиль - максимально правдоподобные изображения',
      fantasy: 'Фантазийный стиль - волшебные и мистические элементы',
      anime: 'Аниме стиль - японская анимация, яркие цвета'
    };
    return styles[style as keyof typeof styles] || styles.photographic;
  }

  /**
   * Инструкции по качеству
   */
  private getQualityInstructions(quality: string): string {
    const qualities = {
      high: 'Высокое качество - детализированные, профессиональные изображения',
      medium: 'Среднее качество - хорошие, но не перегруженные деталями изображения',
      low: 'Простое качество - базовые, понятные изображения'
    };
    return qualities[quality as keyof typeof qualities] || qualities.high;
  }

  /**
   * Инструкции по модели
   */
  private getModelInstructions(model?: string): string {
    if (!model) return '';

    const modelInstructions = {
      // Freepik модели
      'seedream': 'SEEDREAM: Фокус на реалистичных изображениях, естественное освещение, детальные текстуры. Используй короткие, четкие описания.',
      'flux': 'FLUX: Универсальная модель, хорошо работает с художественными и реалистичными стилями. Добавляй стилистические детали.',
      'mystic': 'MYSTIC: Ультра-реалистичные изображения высокого разрешения. Акцент на фотореализме, профессиональной фотографии.',
      'imagen3': 'IMAGEN3: Google модель, хорошо работает с детальными описаниями. Добавляй технические детали фотографии.',
      
      // Midjourney модели
      'midjourney': 'MIDJOURNEY: Художественный стиль, креативные композиции. Используй художественные термины, стили (--style, --ar).',
      'midjourney_7.0': 'MIDJOURNEY v7.0: Новейшая версия, отличная детализация. Добавляй --v 7.0, стилистические параметры.',
      'midjourney_6.1': 'MIDJOURNEY v6.1: Хорошее качество, художественный стиль. Используй --v 6.1.',
      
      // Kling видео модели
      'kling_v2_5_pro': 'KLING v2.5 Pro: Кинематографические видео, плавное движение камеры. Описывай движение, ракурсы, атмосферу.',
      'kling_v2_1_pro': 'KLING v2.1 Pro: Профессиональное видео, детализированная анимация. Акцент на движении и композиции.',
      'minimax_hailuo_768p': 'MiniMax Hailuo 768p: Качественное видео из изображений. Описывай движение объекта, атмосферу сцены.',
      'minimax_hailuo_1080p': 'MiniMax Hailuo 1080p: Высококачественное видео. Детальные описания движения и визуальных эффектов.',
      'pixverse_v5': 'PixVerse V5: Универсальная генерация видео. Хорошо работает с разными стилями и направлениями движения.',
      
      // Runway модели
      'runway': 'RUNWAY: Кинематографическое видео, профессиональная обработка. Описывай камеру, движение, атмосферу.',
      
      // DALL-E
      'dalle': 'DALL-E: OpenAI модель, фотореалистичные изображения. Четкие, конкретные описания, избегай абстракций.',
      
      // Общие паттерны
      'default': 'Универсальная адаптация - добавляй технические детали, освещение, композицию, стиль.'
    };

    // Ищем точное совпадение или частичное
    for (const [key, instruction] of Object.entries(modelInstructions)) {
      if (model.toLowerCase().includes(key.toLowerCase()) || key === 'default') {
        return `МОДЕЛЬ: ${instruction}`;
      }
    }

    return `МОДЕЛЬ: ${model} - адаптируй промпт под специфику этой модели генерации.`;
  }

  /**
   * Парсит ответ GPT
   */
  private parseEnhancedPrompt(gptResponse: string, originalPrompt: string): EnhancedPrompt {
    try {
      // Ищем улучшенный промпт в новом формате
      const improvedMatch = gptResponse.match(/✨ Improved prompt \(EN\):\s*([^\n]+)/);
      if (improvedMatch && improvedMatch[1]) {
        return {
          original: originalPrompt,
          enhanced: improvedMatch[1].trim(),
          improvements: ['Переведено на английский язык', 'Добавлены технические детали', 'Улучшена композиция'],
          style: 'photographic',
          quality: 'high'
        };
      }

      // Fallback - ищем улучшенный промпт в старом формате
      const enhancedMatch = gptResponse.match(/ENHANCED_PROMPT:\s*(.+?)(?=\nIMPROVEMENTS:|$)/s);
      const enhanced = enhancedMatch ? enhancedMatch[1].trim() : originalPrompt;

      // Ищем улучшения
      const improvementsMatch = gptResponse.match(/IMPROVEMENTS:\s*([\s\S]*?)(?=\n\n|$)/);
      const improvements = improvementsMatch 
        ? improvementsMatch[1]
            .split('\n')
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .filter(line => line.length > 0)
        : ['Добавлены технические детали', 'Улучшена композиция'];

      return {
        original: originalPrompt,
        enhanced,
        improvements,
        style: 'photographic',
        quality: 'high'
      };
    } catch (error) {
      logger.error('Failed to parse enhanced prompt:', error);
      return this.createFallbackPrompt(originalPrompt);
    }
  }

  /**
   * Создает fallback промпт если GPT не сработал
   */
  private createFallbackPrompt(originalPrompt: string, options: PromptEnhancementOptions = {}): EnhancedPrompt {
    const { style = 'photographic', quality = 'high' } = options;
    
    // Базовые улучшения
    let enhanced = originalPrompt;
    
    // Добавляем качественные термины
    if (quality === 'high') {
      enhanced += ', high quality, detailed, professional';
    }
    
    // Добавляем стилевые термины
    switch (style) {
      case 'photographic':
        enhanced += ', professional photography, realistic lighting';
        break;
      case 'artistic':
        enhanced += ', artistic style, creative composition';
        break;
      case 'realistic':
        enhanced += ', photorealistic, detailed textures';
        break;
      case 'fantasy':
        enhanced += ', fantasy art, magical atmosphere';
        break;
      case 'anime':
        enhanced += ', anime style, vibrant colors';
        break;
    }

    return {
      original: originalPrompt,
      enhanced,
      improvements: ['Добавлены базовые улучшения качества', 'Добавлены стилевые элементы'],
      style,
      quality
    };
  }

  /**
   * Быстрое улучшение промпта (без GPT)
   */
  async quickEnhance(prompt: string): Promise<string> {
    // Базовые улучшения без вызова GPT
    let enhanced = prompt;
    
    // Добавляем качественные термины если их нет
    if (!enhanced.toLowerCase().includes('high quality') && !enhanced.toLowerCase().includes('detailed')) {
      enhanced += ', high quality, detailed';
    }
    
    // Добавляем освещение если его нет
    if (!enhanced.toLowerCase().includes('lighting') && !enhanced.toLowerCase().includes('light')) {
      enhanced += ', professional lighting';
    }
    
    // Добавляем композицию если ее нет
    if (!enhanced.toLowerCase().includes('composition') && !enhanced.toLowerCase().includes('angle')) {
      enhanced += ', good composition';
    }

    return enhanced;
  }
}
