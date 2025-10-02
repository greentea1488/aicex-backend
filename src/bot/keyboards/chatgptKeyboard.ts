import { InlineKeyboard } from "grammy";

// 🤖 ГЛАВНОЕ МЕНЮ CHATGPT
export const chatgptMainMenu = new InlineKeyboard()
  .text("💬 Текстовый чат", "chatgpt_text_chat")
  .text("🖼️ Генерация изображений", "chatgpt_image_gen")
  .row()
  .text("📎 Анализ изображений", "chatgpt_image_analyze")
  .text("🎨 Обработка файлов", "chatgpt_file_processing")
  .row()
  .text("⚙️ Настройки модели", "chatgpt_model_settings")
  .text("🔙 Назад", "back_to_start");

// 🧠 ВЫБОР МОДЕЛЕЙ CHATGPT
export const chatgptModelsMenu = new InlineKeyboard()
  .text("🚀 GPT-4o (Новейшая)", "chatgpt_model_gpt-4o")
  .row()
  .text("⚡ GPT-4o Mini (Быстрая)", "chatgpt_model_gpt-4o-mini")
  .text("🎯 GPT-4 Turbo", "chatgpt_model_gpt-4-turbo")
  .row()
  .text("📚 GPT-4 (Классика)", "chatgpt_model_gpt-4")
  .text("💰 GPT-3.5 Turbo", "chatgpt_model_gpt-3.5-turbo")
  .row()
  .text("🔙 Назад к ChatGPT", "chatgpt_back_to_main");

// 🖼️ DALL-E МОДЕЛИ
export const chatgptImageModelsMenu = new InlineKeyboard()
  .text("🎨 DALL-E 3 (Лучшее качество)", "chatgpt_dalle_3")
  .row()
  .text("⚡ DALL-E 2 (Быстрая)", "chatgpt_dalle_2")
  .row()
  .text("🔙 Назад к ChatGPT", "chatgpt_back_to_main");

// 📐 НАСТРОЙКИ ИЗОБРАЖЕНИЙ
export const chatgptImageSettingsMenu = new InlineKeyboard()
  .text("🔳 1024x1024", "chatgpt_img_size_1024")
  .text("📱 1024x1792", "chatgpt_img_size_1024x1792")
  .row()
  .text("🖥️ 1792x1024", "chatgpt_img_size_1792x1024")
  .text("🎨 HD качество", "chatgpt_img_quality_hd")
  .row()
  .text("✅ Готово", "chatgpt_img_settings_done")
  .text("🔙 Назад", "chatgpt_image_gen");

// ⚙️ НАСТРОЙКИ CHATGPT
export const chatgptSettingsMenu = new InlineKeyboard()
  .text("🌡️ Температура", "chatgpt_settings_temperature")
  .text("📏 Макс. токены", "chatgpt_settings_max_tokens")
  .row()
  .text("💭 Системный промпт", "chatgpt_settings_system_prompt")
  .text("🔄 Сброс настроек", "chatgpt_settings_reset")
  .row()
  .text("🔙 Назад к ChatGPT", "chatgpt_back_to_main");

// 🔄 НАВИГАЦИЯ
export const backToChatGPTMain = new InlineKeyboard()
  .text("🔙 Назад к ChatGPT", "chatgpt_back_to_main");

export const backToChatGPTModels = new InlineKeyboard()
  .text("🔙 Назад к моделям", "chatgpt_model_settings");

// 📊 СТАТУС И ИНФОРМАЦИЯ
export const chatgptInfoMenu = new InlineKeyboard()
  .text("📊 Использование токенов", "chatgpt_info_tokens")
  .text("💰 Стоимость запросов", "chatgpt_info_cost")
  .row()
  .text("🔧 Статус API", "chatgpt_info_api_status")
  .text("📖 Справка", "chatgpt_info_help")
  .row()
  .text("🔙 Назад к ChatGPT", "chatgpt_back_to_main");
