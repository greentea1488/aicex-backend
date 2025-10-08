import { OpenAIService } from './ai/OpenAIService';
import { logger } from '../utils/logger';

export interface PromptEnhancementOptions {
  style?: 'photographic' | 'artistic' | 'realistic' | 'fantasy' | 'anime';
  quality?: 'high' | 'medium' | 'low';
  language?: 'ru' | 'en';
  addDetails?: boolean;
  improveComposition?: boolean;
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
      const systemPrompt = this.createSystemPrompt(style, quality, language, addDetails, improveComposition);
      
      // Создаем пользовательский промпт
      const userPrompt = `Улучши этот промпт для генерации изображения: "${originalPrompt}"`;

      logger.info('🔥 Prompt Enhancer - Starting enhancement:', {
        originalPrompt: originalPrompt.substring(0, 100),
        style,
        quality,
        language
      });

      // Вызываем GPT для улучшения промпта
      const response = await this.openai.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 'prompt-enhancer');

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
      logger.error('Prompt Enhancer error:', error);
      
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
    improveComposition: boolean
  ): string {
    const languageInstructions = language === 'ru' 
      ? 'Отвечай на русском языке, но улучшенный промпт должен быть на английском (так лучше работает с AI моделями).'
      : 'Respond in English and keep the enhanced prompt in English.';

    const styleInstructions = this.getStyleInstructions(style);
    const qualityInstructions = this.getQualityInstructions(quality);

    return `Ты - эксперт по созданию промптов для AI генерации изображений. Твоя задача - улучшить пользовательский промпт для получения лучшего результата.

${languageInstructions}

СТИЛЬ: ${styleInstructions}
КАЧЕСТВО: ${qualityInstructions}

ПРАВИЛА УЛУЧШЕНИЯ:
1. Сохрани основную идею пользователя
2. Добавь технические детали для лучшего качества
3. Улучши композицию и освещение
4. Добавь подходящие стилистические элементы
5. Используй профессиональные термины из фотографии/дизайна

ФОРМАТ ОТВЕТА (строго соблюдай):
ENHANCED_PROMPT: [улучшенный промпт на английском]
IMPROVEMENTS:
- [улучшение 1]
- [улучшение 2]
- [улучшение 3]

Пример:
ENHANCED_PROMPT: A majestic Siberian cat running through a snow-covered forest, professional wildlife photography, golden hour lighting, shallow depth of field, 85mm lens, high resolution, detailed fur texture, cinematic composition
IMPROVEMENTS:
- Добавил технические детали фотографии
- Улучшил освещение (golden hour)
- Добавил композиционные элементы
- Указал стиль (wildlife photography)`;
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
   * Парсит ответ GPT
   */
  private parseEnhancedPrompt(gptResponse: string, originalPrompt: string): EnhancedPrompt {
    try {
      // Ищем улучшенный промпт
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
