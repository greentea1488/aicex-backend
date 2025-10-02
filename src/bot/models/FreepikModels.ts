import { InlineKeyboard } from "grammy";

// ВСЕ модели для генерации изображений из Freepik API
export const FREEPIK_IMAGE_MODELS = [
  {
    id: 'mystic',
    name: '🎨 Freepik Mystic',
    description: 'Высококачественная генерация 1K-4K',
    callback: 'freepik_image_mystic',
    endpoint: '/ai/mystic'
  },
  {
    id: 'flux_dev',
    name: '⚡ Flux Dev',
    description: 'Быстрая генерация изображений',
    callback: 'freepik_image_flux_dev',
    endpoint: '/ai/text-to-image/flux-dev'
  },
  {
    id: 'flux_pro',
    name: '💎 Flux Pro 1.1',
    description: 'Профессиональная генерация',
    callback: 'freepik_image_flux_pro',
    endpoint: '/ai/text-to-image/flux-pro-v1-1'
  },
  {
    id: 'seedream_v4',
    name: '🌟 Seedream v4',
    description: 'Креативная генерация',
    callback: 'freepik_image_seedream',
    endpoint: '/ai/text-to-image/seedream-v4'
  },
  {
    id: 'imagen3',
    name: '🤖 Google Imagen 3',
    description: 'Google AI модель',
    callback: 'freepik_image_imagen3',
    endpoint: '/ai/text-to-image/imagen3'
  },
  {
    id: 'gemini_flash',
    name: '🍌 Gemini 2.5 Flash (Nano Banana)',
    description: 'Google Gemini модель',
    callback: 'freepik_image_gemini',
    endpoint: '/ai/text-to-image/gemini-2-5-flash'
  },
  {
    id: 'hyperflux',
    name: '🚀 HyperFlux',
    description: 'Сверхбыстрая генерация',
    callback: 'freepik_image_hyperflux',
    endpoint: '/ai/text-to-image/hyperflux'
  }
];

// Модели Runway (используют Freepik API под капотом)
export const RUNWAY_MODELS = [
  {
    id: 'runway_gen3_turbo',
    name: '🎬 Runway Gen-3 Alpha Turbo',
    description: 'Быстрая генерация видео (5 сек)',
    callback: 'runway_gen3_turbo',
    freepikModel: 'kling_v2_1_std', // Используем Kling 2.1 Standard
    maxDuration: 5,
    resolution: '720p'
  },
  {
    id: 'runway_gen3_alpha',
    name: '🎭 Runway Gen-3 Alpha',
    description: 'Высокое качество видео (10 сек)',
    callback: 'runway_gen3_alpha', 
    freepikModel: 'kling_v2_1_pro', // Используем Kling 2.1 Pro
    maxDuration: 10,
    resolution: '1080p'
  }
];

// Модели Kling (используют Freepik API под капотом)
export const KLING_MODELS = [
  {
    id: 'kling_v1_6_pro',
    name: '🎯 Kling 1.6 Pro',
    description: 'Премиум качество (10 сек)',
    callback: 'kling_v1_6_pro',
    freepikModel: 'kling_v2_5_pro', // Используем Kling 2.5 Turbo Pro
    maxDuration: 10,
    resolution: '1080p'
  },
  {
    id: 'kling_v1_6_standard',
    name: '📹 Kling 1.6 Standard', 
    description: 'Стандартное качество (5 сек)',
    callback: 'kling_v1_6_standard',
    freepikModel: 'minimax_hailuo_1080p', // Используем MiniMax
    maxDuration: 6,
    resolution: '1080p'
  },
  {
    id: 'kling_v1_5',
    name: '⚡ Kling 1.5',
    description: 'Быстрая генерация (4 сек)',
    callback: 'kling_v1_5',
    freepikModel: 'pixverse_v5', // Используем PixVerse V5
    maxDuration: 4,
    resolution: '720p'
  }
];

/**
 * Создает клавиатуру для выбора модели генерации изображений (Freepik)
 */
export function createFreepikImageModelsKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  FREEPIK_IMAGE_MODELS.forEach((model, index) => {
    keyboard.text(`${model.name}`, model.callback);
    if (index % 2 === 1) {
      keyboard.row();
    }
  });
  
  keyboard.row().text("🔙 Назад", "photo_generation");
  
  return keyboard;
}

/**
 * Создает клавиатуру для выбора моделей Runway
 */
export function createRunwayModelsKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  RUNWAY_MODELS.forEach((model) => {
    keyboard.text(`${model.name}`, model.callback).row();
  });
  
  keyboard.text("🔙 Назад", "video_generation");
  
  return keyboard;
}

/**
 * Создает клавиатуру для выбора моделей Kling
 */
export function createKlingModelsKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  KLING_MODELS.forEach((model) => {
    keyboard.text(`${model.name}`, model.callback).row();
  });
  
  keyboard.text("🔙 Назад", "video_generation");
  
  return keyboard;
}

/**
 * Получает модель Freepik изображения по ID
 */
export function getFreepikImageModelById(id: string) {
  return FREEPIK_IMAGE_MODELS.find(model => model.id === id);
}

/**
 * Получает модель Runway по ID
 */
export function getRunwayModelById(id: string) {
  return RUNWAY_MODELS.find(model => model.id === id);
}

/**
 * Получает модель Kling по ID
 */
export function getKlingModelById(id: string) {
  return KLING_MODELS.find(model => model.id === id);
}

/**
 * Получает модель Freepik по callback data
 */
export function getFreepikImageModelByCallback(callback: string) {
  return FREEPIK_IMAGE_MODELS.find(model => model.callback === callback);
}

/**
 * Получает модель Runway по callback data
 */
export function getRunwayModelByCallback(callback: string) {
  return RUNWAY_MODELS.find(model => model.callback === callback);
}

/**
 * Получает модель Kling по callback data
 */
export function getKlingModelByCallback(callback: string) {
  return KLING_MODELS.find(model => model.callback === callback);
}

/**
 * Получает Freepik модель для Runway
 */
export function getFreepikModelForRunway(runwayModelId: string): string | null {
  const runwayModel = RUNWAY_MODELS.find(model => model.id === runwayModelId);
  return runwayModel?.freepikModel || null;
}

/**
 * Получает Freepik модель для Kling
 */
export function getFreepikModelForKling(klingModelId: string): string | null {
  const klingModel = KLING_MODELS.find(model => model.id === klingModelId);
  return klingModel?.freepikModel || null;
}
