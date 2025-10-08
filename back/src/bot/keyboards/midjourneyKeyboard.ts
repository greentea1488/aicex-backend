import { InlineKeyboard } from 'grammy';

// 🎨 Главное меню Midjourney
export const midjourneyMainMenu = new InlineKeyboard()
  .text('🎨 Генерация изображения', 'midjourney_generate')
  .row()
  .text('⚙️ Настройки', 'midjourney_settings')
  .text('📊 История', 'midjourney_history')
  .row()
  .text('❓ Помощь', 'midjourney_help')
  .row()
  .text('🔙 Назад к AI', 'back_to_ai_selection');

// 🎨 Меню генерации изображения
export const midjourneyGenerateMenu = new InlineKeyboard()
  .text('🚀 Быстрая генерация', 'midjourney_quick_gen')
  .row()
  .text('⚙️ Настроить параметры', 'midjourney_configure')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_main');

// ⚙️ Меню настроек
export const midjourneySettingsMenu = new InlineKeyboard()
  .text('🤖 Модель', 'midjourney_select_model')
  .text('🎨 Стиль', 'midjourney_select_style')
  .row()
  .text('📐 Соотношение сторон', 'midjourney_select_ratio')
  .text('⭐ Качество', 'midjourney_select_quality')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_main');

// 🤖 Выбор модели
export const midjourneyModelsMenu = new InlineKeyboard()
  .text('🚀 Midjourney 7.0 (8₽)', 'midjourney_model_7.0')
  .row()
  .text('⚡ Midjourney 6.1 (7₽)', 'midjourney_model_6.1')
  .text('⚡ Midjourney 6.0 (7₽)', 'midjourney_model_6.0')
  .row()
  .text('🔥 Midjourney 5.2 (7₽)', 'midjourney_model_5.2')
  .text('🔥 Midjourney 5.1 (7₽)', 'midjourney_model_5.1')
  .row()
  .text('💎 Midjourney 5.0 (7₽)', 'midjourney_model_5.0')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_settings');

// 🎨 Выбор стиля
export const midjourneyStylesMenu = new InlineKeyboard()
  .text('📸 Фотореалистичный', 'midjourney_style_photorealistic')
  .row()
  .text('🎨 Художественный', 'midjourney_style_artistic')
  .text('🎌 Аниме', 'midjourney_style_anime')
  .row()
  .text('🎭 Мультяшный', 'midjourney_style_cartoon')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_settings');

// 📐 Выбор соотношения сторон
export const midjourneyAspectRatiosMenu = new InlineKeyboard()
  .text('⬜ Квадрат (1:1)', 'midjourney_ratio_1:1')
  .row()
  .text('📺 Широкоэкранный (16:9)', 'midjourney_ratio_16:9')
  .text('📱 Вертикальный (9:16)', 'midjourney_ratio_9:16')
  .row()
  .text('🖼️ Классический (4:3)', 'midjourney_ratio_4:3')
  .text('🖼️ Портретный (3:4)', 'midjourney_ratio_3:4')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_settings');

// ⭐ Выбор качества
export const midjourneyQualityMenu = new InlineKeyboard()
  .text('⚡ Быстро (7₽)', 'midjourney_quality_low')
  .row()
  .text('⚖️ Сбалансированно (8₽)', 'midjourney_quality_medium')
  .text('💎 Максимальное (10₽)', 'midjourney_quality_high')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_settings');

// 📊 Меню истории
export const midjourneyHistoryMenu = new InlineKeyboard()
  .text('📋 Последние 10', 'midjourney_history_10')
  .text('📋 Последние 25', 'midjourney_history_25')
  .row()
  .text('📋 Последние 50', 'midjourney_history_50')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_main');

// ❓ Меню помощи
export const midjourneyHelpMenu = new InlineKeyboard()
  .text('📖 Как использовать', 'midjourney_help_usage')
  .row()
  .text('💡 Примеры промптов', 'midjourney_help_examples')
  .row()
  .text('💰 Тарифы', 'midjourney_help_pricing')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_main');

// 🎨 Меню быстрой генерации
export const midjourneyQuickGenMenu = new InlineKeyboard()
  .text('🎨 Портрет', 'midjourney_quick_portrait')
  .text('🏞️ Пейзаж', 'midjourney_quick_landscape')
  .row()
  .text('🏢 Архитектура', 'midjourney_quick_architecture')
  .text('🎭 Арт', 'midjourney_quick_art')
  .row()
  .text('🔬 Научная фантастика', 'midjourney_quick_scifi')
  .text('🐉 Фэнтези', 'midjourney_quick_fantasy')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_generate');

// ⚙️ Меню конфигурации
export const midjourneyConfigureMenu = new InlineKeyboard()
  .text('🤖 Модель', 'midjourney_configure_model')
  .text('🎨 Стиль', 'midjourney_configure_style')
  .row()
  .text('📐 Соотношение', 'midjourney_configure_ratio')
  .text('⭐ Качество', 'midjourney_configure_quality')
  .row()
  .text('✅ Начать генерацию', 'midjourney_start_generation')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_generate');

// 🎨 Меню примеров промптов
export const midjourneyExamplesMenu = new InlineKeyboard()
  .text('👤 Портреты', 'midjourney_examples_portraits')
  .text('🏞️ Пейзажи', 'midjourney_examples_landscapes')
  .row()
  .text('🏢 Архитектура', 'midjourney_examples_architecture')
  .text('🎨 Арт', 'midjourney_examples_art')
  .row()
  .text('🔬 Sci-Fi', 'midjourney_examples_scifi')
  .text('🐉 Фэнтези', 'midjourney_examples_fantasy')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_help');

// 📊 Меню тарифов
export const midjourneyPricingMenu = new InlineKeyboard()
  .text('💎 Midjourney 7.0 - 8₽', 'midjourney_pricing_7')
  .row()
  .text('⚡ Midjourney 6.x - 7₽', 'midjourney_pricing_6')
  .text('🔥 Midjourney 5.x - 7₽', 'midjourney_pricing_5')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_help');

// 🎨 Меню примеров портретов
export const midjourneyPortraitExamplesMenu = new InlineKeyboard()
  .text('👨 Мужской портрет', 'midjourney_example_male_portrait')
  .text('👩 Женский портрет', 'midjourney_example_female_portrait')
  .row()
  .text('👶 Детский портрет', 'midjourney_example_child_portrait')
  .text('👴 Пожилой портрет', 'midjourney_example_elderly_portrait')
  .row()
  .text('🎭 Костюмированный', 'midjourney_example_costume_portrait')
  .text('🎨 Художественный', 'midjourney_example_artistic_portrait')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_examples');

// 🏞️ Меню примеров пейзажей
export const midjourneyLandscapeExamplesMenu = new InlineKeyboard()
  .text('🌅 Закат', 'midjourney_example_sunset')
  .text('🌄 Восход', 'midjourney_example_sunrise')
  .row()
  .text('🏔️ Горы', 'midjourney_example_mountains')
  .text('🌊 Океан', 'midjourney_example_ocean')
  .row()
  .text('🌲 Лес', 'midjourney_example_forest')
  .text('🏜️ Пустыня', 'midjourney_example_desert')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_examples');

// 🏢 Меню примеров архитектуры
export const midjourneyArchitectureExamplesMenu = new InlineKeyboard()
  .text('🏰 Замки', 'midjourney_example_castles')
  .text('🏢 Небоскребы', 'midjourney_example_skyscrapers')
  .row()
  .text('🏛️ Классическая', 'midjourney_example_classical')
  .text('🏗️ Современная', 'midjourney_example_modern')
  .row()
  .text('🏘️ Жилые дома', 'midjourney_example_residential')
  .text('🏭 Промышленная', 'midjourney_example_industrial')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_examples');

// 🎨 Меню примеров арта
export const midjourneyArtExamplesMenu = new InlineKeyboard()
  .text('🎨 Живопись', 'midjourney_example_painting')
  .text('✏️ Рисунок', 'midjourney_example_drawing')
  .row()
  .text('🎭 Скульптура', 'midjourney_example_sculpture')
  .text('🖼️ Коллаж', 'midjourney_example_collage')
  .row()
  .text('🎪 Абстрактное', 'midjourney_example_abstract')
  .text('🌈 Цветное', 'midjourney_example_colorful')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_examples');

// 🔬 Меню примеров Sci-Fi
export const midjourneyScifiExamplesMenu = new InlineKeyboard()
  .text('🚀 Космос', 'midjourney_example_space')
  .text('🤖 Роботы', 'midjourney_example_robots')
  .row()
  .text('🏭 Киберпанк', 'midjourney_example_cyberpunk')
  .text('🌆 Футуристический город', 'midjourney_example_futuristic_city')
  .row()
  .text('👽 Инопланетяне', 'midjourney_example_aliens')
  .text('⚡ Технологии', 'midjourney_example_technology')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_examples');

// 🐉 Меню примеров фэнтези
export const midjourneyFantasyExamplesMenu = new InlineKeyboard()
  .text('🐉 Драконы', 'midjourney_example_dragons')
  .text('🧙‍♂️ Маги', 'midjourney_example_wizards')
  .row()
  .text('🏰 Фэнтези замки', 'midjourney_example_fantasy_castles')
  .text('🧚‍♀️ Феи', 'midjourney_example_fairies')
  .row()
  .text('⚔️ Рыцари', 'midjourney_example_knights')
  .text('🌙 Мистика', 'midjourney_example_mystic')
  .row()
  .text('🔙 Назад', 'midjourney_back_to_examples');

// 🔙 Универсальные кнопки навигации
export const midjourneyBackToMain = new InlineKeyboard()
  .text('🔙 Главное меню', 'midjourney_back_to_main');

export const midjourneyBackToSettings = new InlineKeyboard()
  .text('🔙 Настройки', 'midjourney_back_to_settings');

export const midjourneyBackToGenerate = new InlineKeyboard()
  .text('🔙 Генерация', 'midjourney_back_to_generate');

export const midjourneyBackToHelp = new InlineKeyboard()
  .text('🔙 Помощь', 'midjourney_back_to_help');

export const midjourneyBackToExamples = new InlineKeyboard()
  .text('🔙 Примеры', 'midjourney_back_to_examples');
