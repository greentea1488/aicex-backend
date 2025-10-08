/**
 * Модели Freepik для генерации изображений и видео
 * Источник: https://docs.freepik.com/introduction
 */

export interface FreepikModel {
  id: string;
  name: string;
  description: string;
  type: 'image' | 'video';
  category: string;
  premium?: boolean;
}

// Модели для генерации изображений
export const FREEPIK_IMAGE_MODELS: FreepikModel[] = [
  {
    id: 'freepik',
    name: 'Freepik AI',
    description: 'Универсальная модель для создания качественных изображений',
    type: 'image',
    category: 'general'
  },
  {
    id: 'flux',
    name: 'Flux',
    description: 'Продвинутая модель для реалистичных изображений',
    type: 'image',
    category: 'realistic',
    premium: true
  },
  {
    id: 'mystic',
    name: 'Mystic',
    description: 'Модель для создания мистических и фантастических изображений',
    type: 'image',
    category: 'fantasy'
  },
  {
    id: 'flux-realism',
    name: 'Flux Realism',
    description: 'Специализированная модель для фотореалистичных изображений',
    type: 'image',
    category: 'realistic',
    premium: true
  }
];

// Модели для генерации видео
export const FREEPIK_VIDEO_MODELS: FreepikModel[] = [
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3',
    description: 'Передовая модель для создания высококачественного видео',
    type: 'video',
    category: 'general',
    premium: true
  },
  {
    id: 'kling',
    name: 'Kling AI',
    description: 'Быстрая модель для генерации коротких видео',
    type: 'video',
    category: 'quick'
  },
  {
    id: 'luma-dream-machine',
    name: 'Luma Dream Machine',
    description: 'Модель для создания кинематографического видео',
    type: 'video',
    category: 'cinematic',
    premium: true
  }
];

// Все модели вместе
export const ALL_FREEPIK_MODELS = [...FREEPIK_IMAGE_MODELS, ...FREEPIK_VIDEO_MODELS];

// Получить модели по типу
export const getModelsByType = (type: 'image' | 'video'): FreepikModel[] => {
  return ALL_FREEPIK_MODELS.filter(model => model.type === type);
};

// Получить модель по ID
export const getModelById = (id: string): FreepikModel | undefined => {
  return ALL_FREEPIK_MODELS.find(model => model.id === id);
};

// Стоимость токенов за генерацию
export const MODEL_TOKEN_COSTS = {
  // Изображения
  'freepik': 5,
  'flux': 10,
  'mystic': 7,
  'flux-realism': 12,
  
  // Видео
  'runway-gen3': 50,
  'kling': 30,
  'luma-dream-machine': 60
};

// Получить стоимость модели
export const getModelCost = (modelId: string): number => {
  return MODEL_TOKEN_COSTS[modelId as keyof typeof MODEL_TOKEN_COSTS] || 5;
};
