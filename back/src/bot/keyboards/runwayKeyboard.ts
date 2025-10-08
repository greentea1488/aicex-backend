import { InlineKeyboard } from "grammy";

// 🎬 ГЛАВНОЕ МЕНЮ RUNWAY
export const runwayMainMenu = new InlineKeyboard()
  .text("🎥 Генерация видео", "runway_video_gen")
  .text("🖼️ Генерация изображений", "runway_image_gen")
  .row()
  .text("✏️ Редактирование", "runway_editing")
  .text("🎭 Спецэффекты", "runway_effects")
  .row()
  .text("ℹ️ Справка", "runway_help")
  .text("🔙 Назад", "back_to_ai_selection");

// 🎬 МОДЕЛИ ДЛЯ ГЕНЕРАЦИИ ВИДЕО (Обновлено с официальным SDK)
export const runwayVideoModelsMenu = new InlineKeyboard()
  .text("🚀 Gen3A Turbo (Рекомендуется)", "runway_video_gen3a_turbo")
  .row()
  .text("🎯 Gen3 Alpha (Качество)", "runway_video_gen3")
  .row()
  .text("🖼️ Image-to-Video", "runway_video_i2v")
  .text("📝 Text-to-Video", "runway_video_t2v")
  .row()
  .text("⚙️ Настройки", "runway_video_settings")
  .text("🔙 Назад", "runway_back_to_main");

// 🖼️ МОДЕЛИ ДЛЯ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ
export const runwayImageModelsMenu = new InlineKeyboard()
  .text("🎨 Gen4 Image (Качество)", "runway_image_gen4_image")
  .row()
  .text("⚡ Gen4 Image Turbo (Скорость)", "runway_image_gen4_image_turbo")
  .row()
  .text("🔙 Назад к функциям", "runway_back_to_main");

// ✏️ ИНСТРУМЕНТЫ РЕДАКТИРОВАНИЯ
export const runwayEditingMenu = new InlineKeyboard()
  .text("🔍 Upscale V1 (Улучшение)", "runway_edit_upscale")
  .text("🎬 Video-to-Video", "runway_edit_v2v")
  .row()
  .text("🖼️ Image-to-Video", "runway_edit_i2v")
  .text("🎭 Style Transfer", "runway_edit_style")
  .row()
  .text("🔙 Назад к функциям", "runway_back_to_main");

// 🎭 СПЕЦЭФФЕКТЫ И АНИМАЦИЯ
export const runwayEffectsMenu = new InlineKeyboard()
  .text("💫 Motion Brush", "runway_fx_motion")
  .text("🌟 Camera Control", "runway_fx_camera")
  .row()
  .text("🎪 Director Mode", "runway_fx_director")
  .text("🎯 Precision Mode", "runway_fx_precision")
  .row()
  .text("🔙 Назад к функциям", "runway_back_to_main");

// ⚙️ НАСТРОЙКИ И УПРАВЛЕНИЕ
export const runwaySettingsMenu = new InlineKeyboard()
  .text("🎛️ Параметры качества", "runway_settings_quality")
  .text("⏱️ Длительность видео", "runway_settings_duration")
  .row()
  .text("📐 Соотношение сторон", "runway_settings_ratio")
  .text("🎲 Случайность (Seed)", "runway_settings_seed")
  .row()
  .text("🔙 Назад к функциям", "runway_back_to_main");

// 🔄 КНОПКИ УПРАВЛЕНИЯ ПРОЦЕССОМ
export const runwayControlMenu = new InlineKeyboard()
  .text("▶️ Запустить генерацию", "runway_start_generation")
  .text("⏹️ Остановить", "runway_stop_generation")
  .row()
  .text("🔄 Повторить последний", "runway_repeat_last")
  .text("📊 Статус задач", "runway_check_status")
  .row()
  .text("🔙 Назад к моделям", "runway_back_to_models");

// ℹ️ СПРАВКА И ПОМОЩЬ
export const runwayHelpMenu = new InlineKeyboard()
  .text("📖 Как использовать", "runway_help_usage")
  .text("💡 Примеры промптов", "runway_help_examples")
  .row()
  .text("🎯 Лучшие практики", "runway_help_tips")
  .text("🔧 Настройки API", "runway_help_api")
  .row()
  .text("🔙 Назад к функциям", "runway_back_to_main");

// 🔄 УНИВЕРСАЛЬНЫЕ КНОПКИ
export const backToRunwayMain = new InlineKeyboard()
  .text("🔙 Назад к Runway", "runway_back_to_main");

export const backToRunwayModels = new InlineKeyboard()
  .text("🔙 Назад к моделям", "runway_back_to_models");

// 🎬 КОНФИГУРАЦИЯ ВИДЕО ГЕНЕРАЦИИ
export const runwayVideoConfigMenu = new InlineKeyboard()
  .text("⏱️ 3 сек", "runway_duration_3")
  .text("⏱️ 5 сек", "runway_duration_5")
  .text("⏱️ 10 сек", "runway_duration_10")
  .row()
  .text("📱 9:16", "runway_ratio_9_16")
  .text("🖥️ 16:9", "runway_ratio_16_9")
  .text("🟦 1:1", "runway_ratio_1_1")
  .row()
  .text("✅ Готово", "runway_config_done")
  .text("🔙 Назад", "runway_back_to_models");

// 🖼️ КОНФИГУРАЦИЯ ИЗОБРАЖЕНИЙ
export const runwayImageConfigMenu = new InlineKeyboard()
  .text("📱 720p", "runway_img_720p")
  .text("🖥️ 1080p", "runway_img_1080p")
  .text("🎬 4K", "runway_img_4k")
  .row()
  .text("📐 16:9", "runway_img_ratio_16_9")
  .text("📐 1:1", "runway_img_ratio_1_1")
  .text("📐 9:16", "runway_img_ratio_9_16")
  .row()
  .text("✅ Готово", "runway_img_config_done")
  .text("🔙 Назад", "runway_back_to_models");
