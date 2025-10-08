// Полный список моделей Freepik на основе документации

export interface FreepikImageModel {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  isNew?: boolean;
}

export interface FreepikVideoModel {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  isNew?: boolean;
  resolution?: string;
}

// 🎨 МОДЕЛИ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
export const FREEPIK_IMAGE_MODELS: FreepikImageModel[] = [
  {
    id: 'mystic',
    name: 'Mystic',
    description: 'Фотореалистичная генерация 1K-4K качества',
    endpoint: '/v1/ai/mystic'
  },
  {
    id: 'classic-fast',
    name: 'Classic Fast',
    description: 'Быстрая генерация классических изображений',
    endpoint: '/v1/ai/text-to-image/classic-fast'
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Быстрая генерация от Google',
    endpoint: '/v1/ai/gemini-2-5-flash-image-preview'
  },
  {
    id: 'google-imagen3',
    name: 'Google Imagen 3',
    description: 'Продвинутая модель от Google',
    endpoint: '/v1/ai/text-to-image/google-imagen-3'
  },
  {
    id: 'flux-dev',
    name: 'Flux dev',
    description: 'Разработческая версия Flux',
    endpoint: '/v1/ai/text-to-image/flux-dev'
  },
  {
    id: 'flux-pro',
    name: 'Flux pro v1.1',
    description: 'Профессиональная версия Flux',
    endpoint: '/v1/ai/text-to-image/flux-pro-v1-1',
    isNew: true
  },
  {
    id: 'hyperflux',
    name: 'Hyperflux',
    description: 'Сверхбыстрая генерация',
    endpoint: '/v1/ai/text-to-image/hyperflux'
  },
  {
    id: 'seedream',
    name: 'Seedream v3',
    description: 'Стабильная версия Seedream',
    endpoint: '/v1/ai/text-to-image/seedream'
  }
  // Убраны seedream-v4 и seedream-v4-edit - модели еще не вышли
];

// 🎬 МОДЕЛИ ГЕНЕРАЦИИ ВИДЕО
export const FREEPIK_VIDEO_MODELS: FreepikVideoModel[] = [
  {
    id: 'kling-v2-5-pro',
    name: 'Kling v2.5 Pro',
    description: 'Новейшая модель для видео',
    endpoint: '/v1/ai/image-to-video/kling-v2-5-pro',
    isNew: true
  },
  {
    id: 'minimax-hailuo-768p',
    name: 'Minimax Hailuo 02 768p',
    description: 'Качество 768p от Minimax',
    endpoint: '/v1/ai/text-image-to-video/minimax-hailuo-02-768p',
    resolution: '768p'
  },
  {
    id: 'minimax-hailuo-1080p',
    name: 'Minimax Hailuo 02 1080p',
    description: 'Качество 1080p от Minimax',
    endpoint: '/v1/ai/text-image-to-video/minimax-hailuo-02-1080p',
    resolution: '1080p'
  },
  {
    id: 'kling-v2-1-master',
    name: 'Kling v2.1 Master',
    description: 'Мастер версия Kling v2.1',
    endpoint: '/v1/ai/image-to-video/kling-v2-1-master'
  },
  {
    id: 'kling-pro-v2-1',
    name: 'Kling Pro v2.1',
    description: 'Профессиональная версия Kling',
    endpoint: '/v1/ai/image-to-video/kling-pro-v2-1'
  },
  {
    id: 'pixverse-v5',
    name: 'PixVerse V5',
    description: 'Новая модель PixVerse',
    endpoint: '/v1/ai/image-to-video/pixverse-v5',
    isNew: true
  },
  {
    id: 'pixverse-v5-transition',
    name: 'PixVerse V5 Transition',
    description: 'Переходы и анимации',
    endpoint: '/v1/ai/image-to-video/pixverse-v5-transition',
    isNew: true
  },
  {
    id: 'kling-std-v2-1',
    name: 'Kling Std v2.1',
    description: 'Стандартная версия Kling',
    endpoint: '/v1/ai/image-to-video/kling-std-v2-1'
  },
  {
    id: 'kling-v2',
    name: 'Kling v2',
    description: 'Базовая версия Kling v2',
    endpoint: '/v1/ai/image-to-video/kling-v2'
  },
  {
    id: 'kling-pro-1-6',
    name: 'Kling Pro 1.6',
    description: 'Профессиональная версия 1.6',
    endpoint: '/v1/ai/image-to-video/kling-pro-1-6'
  },
  {
    id: 'kling-std-1-6',
    name: 'Kling Std 1.6',
    description: 'Стандартная версия 1.6',
    endpoint: '/v1/ai/image-to-video/kling-std-1-6'
  },
  {
    id: 'kling-elements-pro-1-6',
    name: 'Kling Elements Pro 1.6',
    description: 'Элементы и эффекты Pro',
    endpoint: '/v1/ai/image-to-video/kling-elements-pro-1-6'
  },
  {
    id: 'kling-elements-std-1-6',
    name: 'Kling Elements Std 1.6',
    description: 'Элементы и эффекты Standard',
    endpoint: '/v1/ai/image-to-video/kling-elements-std-1-6'
  },
  {
    id: 'seedance-pro-1080p',
    name: 'Seedance Pro 1080p',
    description: 'Профессиональное качество 1080p',
    endpoint: '/v1/ai/text-to-video/seedance-pro-1080p',
    resolution: '1080p'
  },
  {
    id: 'seedance-pro-720p',
    name: 'Seedance Pro 720p',
    description: 'Профессиональное качество 720p',
    endpoint: '/v1/ai/text-to-video/seedance-pro-720p',
    resolution: '720p'
  },
  {
    id: 'seedance-pro-480p',
    name: 'Seedance Pro 480p',
    description: 'Профессиональное качество 480p',
    endpoint: '/v1/ai/text-to-video/seedance-pro-480p',
    resolution: '480p'
  },
  {
    id: 'seedance-lite-1080p',
    name: 'Seedance Lite 1080p',
    description: 'Облегченная версия 1080p',
    endpoint: '/v1/ai/text-to-video/seedance-lite-1080p',
    resolution: '1080p'
  }
];

// Функции для работы с моделями
export function getImageModelById(id: string): FreepikImageModel | undefined {
  return FREEPIK_IMAGE_MODELS.find(model => model.id === id);
}

export function getVideoModelById(id: string): FreepikVideoModel | undefined {
  return FREEPIK_VIDEO_MODELS.find(model => model.id === id);
}

export function getPopularImageModels(): FreepikImageModel[] {
  return [
    getImageModelById('seedream')!,      // Заменили seedream-v4 на seedream
    getImageModelById('flux-pro')!,
    getImageModelById('mystic')!,
    getImageModelById('hyperflux')!
  ];
}

export function getPopularVideoModels(): FreepikVideoModel[] {
  return [
    getVideoModelById('kling-v2-5-pro')!,
    getVideoModelById('pixverse-v5')!,
    getVideoModelById('minimax-hailuo-1080p')!,
    getVideoModelById('kling-pro-v2-1')!
  ];
}
