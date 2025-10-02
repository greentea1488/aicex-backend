import { InlineKeyboard } from "grammy";

// 🎨 РАСШИРЕННОЕ ГЛАВНОЕ МЕНЮ FREEPIK - ОБНОВЛЕНО С IMAGE-TO-VIDEO
export const freepikMainMenu = new InlineKeyboard()
  // Генерация контента (обновлено)
  .text("🖼️ Генерация изображений из текста", "freepik_text_to_image")
  .row()
  .text("🎬 Image-to-Video (Новое!)", "freepik_image_to_video")
  .row()
  .text("📝 Text-to-Video", "freepik_text_to_video")
  .row()
  .text("🎭 Генерация с reference images", "freepik_styled_images")
  .row()
  
  // Редактирование и обработка
  .text("✏️ Редактирование изображений", "freepik_edit_images")
  .row()
  .text("🔄 Преобразование изображений", "freepik_transform_images")
  .row()
  .text("🎨 Применение AI фильтров", "freepik_apply_filters")
  .row()
  
  // Продвинутые функции
  .text("📐 Изменение соотношений сторон", "freepik_aspect_ratios")
  .row()
  .text("🔧 Настройки генерации", "freepik_generation_settings")
  .row()
  .text("📊 Статус задач и история", "freepik_task_status")
  .row()
  
  // Навигация
  .text("🔙 Главное меню", "back_to_start");

// 🖼️ РАСШИРЕННОЕ МЕНЮ МОДЕЛЕЙ ДЛЯ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
export const freepikTextToImageMenu = new InlineKeyboard()
  // Основные модели из документации
  .text("🚀 Imagen3 - Новейшая модель Google", "freepik_model_imagen3")
  .row()
  .text("🎨 Mystic - Реалистичные изображения", "freepik_model_mystic")
  .row()
  
  // Стилизованные модели
  .text("🖌️ Artistic - Художественный стиль", "freepik_model_artistic")
  .row()
  .text("🌟 Fantasy - Фэнтези и магия", "freepik_model_fantasy")
  .row()
  .text("📷 Photography - Фотореалистичное", "freepik_model_photography")
  .row()
  
  // Специализированные модели
  .text("🎭 Portrait - Портреты людей", "freepik_model_portrait")
  .row()
  .text("🏞️ Landscape - Пейзажи природы", "freepik_model_landscape")
  .row()
  .text("🏢 Architecture - Архитектура", "freepik_model_architecture")
  .row()
  
  // Навигация
  .text("🔙 Назад к Freepik", "freepik_back_to_main");

// 🎭 МЕНЮ СТИЛИЗОВАННОЙ ГЕНЕРАЦИИ (для Imagen3)
export const freepikStyledImageMenu = new InlineKeyboard()
  // Художественные стили
  .text("🎨 Anime - Аниме стиль", "freepik_style_anime")
  .row()
  .text("🖼️ Oil Painting - Масляная живопись", "freepik_style_oil_painting")
  .row()
  .text("✏️ Pencil Drawing - Карандашный рисунок", "freepik_style_pencil")
  .row()
  .text("🌊 Watercolor - Акварель", "freepik_style_watercolor")
  .row()
  
  // Цветовые эффекты
  .text("🌸 Pastel Colors - Пастельные тона", "freepik_color_pastel")
  .row()
  .text("🔥 Warm Lighting - Теплое освещение", "freepik_lighting_warm")
  .row()
  .text("❄️ Cool Lighting - Холодное освещение", "freepik_lighting_cool")
  .row()
  
  // Композиция
  .text("👤 Portrait Framing - Портретная рамка", "freepik_framing_portrait")
  .row()
  .text("🌅 Landscape Framing - Пейзажная рамка", "freepik_framing_landscape")
  .row()
  
  // Навигация
  .text("🔙 Назад к Freepik", "freepik_back_to_main");

// 🎬 ПОЛНОЕ МЕНЮ ВСЕХ ВИДЕО МОДЕЛЕЙ FREEPIK (23 модели)

// Главное меню видео моделей - разделено по категориям
export const freepikVideoModelsMenu = new InlineKeyboard()
  .text("🚀 Kling (Новые)", "freepik_video_kling_new")
  .text("⭐ Kling (Классика)", "freepik_video_kling_classic")
  .row()
  .text("🎯 PixVerse", "freepik_video_pixverse")
  .text("🎪 Minimax Hailuo", "freepik_video_minimax")
  .row()
  .text("🎭 Seedance", "freepik_video_seedance")
  .text("🌟 Wan", "freepik_video_wan")
  .row()
  .text("🔙 Назад к функциям", "freepik_back_to_functions");

// Новые Kling модели (v2.5 Pro, v2.1 Master, Pro v2.1, Std v2.1, v2)
export const freepikVideoKlingNewMenu = new InlineKeyboard()
  .text("🚀 Kling v2.5 Pro (Новейшая!)", "freepik_video_kling-v2.5-pro")
  .row()
  .text("👑 Kling v2.1 Master", "freepik_video_kling-v2.1-master")
  .row()
  .text("⚡ Kling Pro v2.1", "freepik_video_kling-pro-v2.1")
  .text("📊 Kling Std v2.1", "freepik_video_kling-std-v2.1")
  .row()
  .text("🎬 Kling v2", "freepik_video_kling-v2")
  .row()
  .text("🔙 Назад к видео", "freepik_video_gen");

// Классические Kling модели (Pro 1.6, Std 1.6, Elements Pro/Std 1.6)
export const freepikVideoKlingClassicMenu = new InlineKeyboard()
  .text("⚡ Kling Pro 1.6", "freepik_video_kling-pro-1.6")
  .text("📊 Kling Std 1.6", "freepik_video_kling-std-1.6")
  .row()
  .text("🎨 Kling Elements Pro 1.6", "freepik_video_kling-elements-pro-1.6")
  .row()
  .text("🎭 Kling Elements Std 1.6", "freepik_video_kling-elements-std-1.6")
  .row()
  .text("🔙 Назад к видео", "freepik_video_gen");

// PixVerse модели
export const freepikVideoPixVerseMenu = new InlineKeyboard()
  .text("🚀 PixVerse V5 (Новая!)", "freepik_video_pixverse-v5")
  .row()
  .text("🔄 PixVerse V5 Transition", "freepik_video_pixverse-v5-transition")
  .row()
  .text("🔙 Назад к видео", "freepik_video_gen");

// Minimax Hailuo модели
export const freepikVideoMinimaxMenu = new InlineKeyboard()
  .text("🎬 Hailuo 02 1080p", "freepik_video_minimax-hailuo-02-1080p")
  .row()
  .text("📺 Hailuo 02 768p", "freepik_video_minimax-hailuo-02-768p")
  .row()
  .text("🔙 Назад к видео", "freepik_video_gen");

// Seedance модели
export const freepikVideoSeedanceMenu = new InlineKeyboard()
  .text("👑 Pro 1080p", "freepik_video_seedance-pro-1080p")
  .text("📺 Pro 720p", "freepik_video_seedance-pro-720p")
  .text("📱 Pro 480p", "freepik_video_seedance-pro-480p")
  .row()
  .text("⚡ Lite 1080p", "freepik_video_seedance-lite-1080p")
  .text("📺 Lite 720p", "freepik_video_seedance-lite-720p")
  .text("📱 Lite 480p", "freepik_video_seedance-lite-480p")
  .row()
  .text("🔙 Назад к видео", "freepik_video_gen");

// Wan модели
export const freepikVideoWanMenu = new InlineKeyboard()
  .text("📺 Wan v2.2 720p", "freepik_video_wan-v2.2-720p")
  .row()
  .text("📱 Wan v2.2 580p", "freepik_video_wan-v2.2-580p")
  .text("📱 Wan v2.2 480p", "freepik_video_wan-v2.2-480p")
  .row()
  .text("🔙 Назад к видео", "freepik_video_gen");

// Меню редактирования
export const freepikEditMenu = new InlineKeyboard()
  .text("🖌️ Удаление фона", "freepik_edit_remove_bg")
  .row()
  .text("🎨 Изменение стиля", "freepik_edit_style_change")
  .text("✨ Улучшение качества", "freepik_edit_enhance")
  .row()
  .text("🔄 Замена объектов", "freepik_edit_replace")
  .text("📏 Изменение размера", "freepik_edit_resize")
  .row()
  .text("🔙 Назад к функциям", "freepik_back_to_functions");

// Меню фильтров
export const freepikFiltersMenu = new InlineKeyboard()
  .text("🌈 Цветовые фильтры", "freepik_filter_color")
  .row()
  .text("🎭 Стилевые фильтры", "freepik_filter_style")
  .text("✨ Винтажные эффекты", "freepik_filter_vintage")
  .row()
  .text("🌟 HDR эффекты", "freepik_filter_hdr")
  .text("🎨 Художественные", "freepik_filter_artistic")
  .row()
  .text("🔙 Назад к функциям", "freepik_back_to_functions");

// Меню настроек качества для изображений
export const freepikQualityMenu = new InlineKeyboard()
  .text("📱 Mobile (1024x1024)", "freepik_quality_mobile")
  .row()
  .text("💻 Desktop (2048x2048)", "freepik_quality_desktop")
  .text("🖥️ HD (2560x2560)", "freepik_quality_hd")
  .row()
  .text("🎬 4K (4096x4096)", "freepik_quality_4k")
  .row()
  .text("🔙 Назад к модели", "freepik_back_to_model");

// 📐 РАСШИРЕННОЕ МЕНЮ СООТНОШЕНИЙ СТОРОН (из документации Imagen3)
export const freepikAspectRatioMenu = new InlineKeyboard()
  // Основные соотношения из API
  .text("🟩 Квадрат 1:1 (square_1_1)", "freepik_aspect_square_1_1")
  .row()
  .text("📱 Соцсети 9:16 (social_story_9_16)", "freepik_aspect_social_story_9_16")
  .row()
  .text("📺 Широкий экран 16:9 (widescreen_16_9)", "freepik_aspect_widescreen_16_9")
  .row()
  .text("📷 Традиционный 3:4 (traditional_3_4)", "freepik_aspect_traditional_3_4")
  .row()
  .text("🖥️ Классический 4:3 (classic_4_3)", "freepik_aspect_classic_4_3")
  .row()
  .text("🔙 Назад к настройкам", "freepik_generation_settings");

// 🔧 МЕНЮ НАСТРОЕК ГЕНЕРАЦИИ
export const freepikGenerationSettingsMenu = new InlineKeyboard()
  // Основные настройки
  .text("📐 Соотношение сторон", "freepik_settings_aspect_ratio")
  .row()
  .text("📊 Количество изображений (1-4)", "freepik_settings_num_images")
  .row()
  .text("🎭 Настройки персонажей", "freepik_settings_person_generation")
  .row()
  .text("🔐 Уровень безопасности", "freepik_settings_safety")
  .row()
  .text("🎨 Стили и эффекты", "freepik_settings_styling")
  .row()
  
  // Видео настройки
  .text("⏱️ Длительность видео", "freepik_settings_video_duration")
  .row()
  .text("🎬 Параметры видео", "freepik_settings_video_params")
  .row()
  
  // Навигация
  .text("🔙 Назад к Freepik", "freepik_back_to_main");

// 👥 НАСТРОЙКИ ГЕНЕРАЦИИ ПЕРСОНАЖЕЙ
export const freepikPersonGenerationMenu = new InlineKeyboard()
  .text("🚫 Не генерировать людей", "freepik_person_dont_allow")
  .row()
  .text("👨 Только взрослые", "freepik_person_allow_adult")
  .row()
  .text("👶 Все возрасты", "freepik_person_allow_all")
  .row()
  .text("🔙 Назад к настройкам", "freepik_generation_settings");

// 🔐 НАСТРОЙКИ БЕЗОПАСНОСТИ
export const freepikSafetySettingsMenu = new InlineKeyboard()
  .text("🔓 Без ограничений", "freepik_safety_block_none")
  .row()
  .text("⚠️ Блокировать высокий риск", "freepik_safety_block_only_high")
  .row()
  .text("🛡️ Блокировать средний и выше", "freepik_safety_block_medium_and_above")
  .row()
  .text("🔒 Блокировать низкий и выше", "freepik_safety_block_low_and_above")
  .row()
  .text("🔙 Назад к настройкам", "freepik_generation_settings");

// ⏱️ НАСТРОЙКИ ДЛИТЕЛЬНОСТИ ВИДЕО
export const freepikVideoDurationMenu = new InlineKeyboard()
  .text("⚡ 5 секунд (быстро)", "freepik_duration_5")
  .row()
  .text("⏱️ 10 секунд (стандарт)", "freepik_duration_10")
  .row()
  .text("🔙 Назад к настройкам", "freepik_generation_settings");

// 🎬 РАСШИРЕННЫЕ ПАРАМЕТРЫ ВИДЕО
export const freepikVideoParamsMenu = new InlineKeyboard()
  // Основные параметры
  .text("📹 Интенсивность движения", "freepik_video_motion_intensity")
  .row()
  .text("📱 Фиксированная камера", "freepik_video_camera_fixed")
  .row()
  .text("🎞️ FPS (кадры в секунду)", "freepik_video_fps")
  .row()
  .text("🎲 Seed для воспроизводимости", "freepik_video_seed")
  .row()
  .text("🎯 CFG Scale (точность промпта)", "freepik_video_cfg_scale")
  .row()
  
  // Навигация
  .text("🔙 Назад к настройкам", "freepik_generation_settings");

// 📊 МЕНЮ СТАТУСА ЗАДАЧ
export const freepikTaskStatusMenu = new InlineKeyboard()
  .text("🔄 Активные задачи", "freepik_status_active")
  .row()
  .text("✅ Завершенные задачи", "freepik_status_completed")
  .row()
  .text("❌ Неудачные задачи", "freepik_status_failed")
  .row()
  .text("📈 Статистика использования", "freepik_status_stats")
  .row()
  .text("🔙 Назад к Freepik", "freepik_back_to_main");
