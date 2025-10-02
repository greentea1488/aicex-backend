import { InlineKeyboard } from "grammy";
import { AIHandler } from "../handlers/aiHandler";

const aiHandler = new AIHandler();

export const startMenu = new InlineKeyboard()
  .text("💡 ChatGPT", "chatgpt")
  .row()
  .text("🌄 Midjourney", "midjourney")
  .text("📹 Kling", "kling")
  .row()
  .text("🎨 Freepik + Lora", "freepik")
  .text("🎬 Runway", "runway")
  .row()
  .text("❓ Помощь", "help")
  .text("📕 База знаний", "knowledge");

// 🔄 УНИВЕРСАЛЬНЫЕ КНОПКИ УПРАВЛЕНИЯ
export const universalControlKeyboard = new InlineKeyboard()
  .text("▶️ Запустить", "action_start")
  .text("⏹️ Остановить", "action_stop")
  .row()
  .text("🔄 Повторить", "action_repeat")
  .text("📊 Статус", "action_status")
  .row()
  .text("🔙 Главное меню", "back_to_start");

// 🎯 КНОПКИ НАВИГАЦИИ
export const backToMainMenu = new InlineKeyboard()
  .text("🔙 Главное меню", "back_to_start");

export const backToAISelection = new InlineKeyboard()
  .text("🔙 Выбор AI", "back_to_ai_selection");

// ℹ️ СПРАВКА И ПОМОЩЬ
export const helpKeyboard = new InlineKeyboard()
  .text("🤖 О боте", "help_about")
  .text("🎯 Как использовать", "help_usage")
  .row()
  .text("💡 Примеры", "help_examples")
  .text("🔧 Настройки", "help_settings")
  .row()
  .text("📞 Поддержка", "help_support")
  .text("🔙 Назад", "back_to_start");

// ⚙️ НАСТРОЙКИ
export const settingsKeyboard = new InlineKeyboard()
  .text("🌐 Язык", "settings_language")
  .text("🎨 Тема", "settings_theme")
  .row()
  .text("🔔 Уведомления", "settings_notifications")
  .text("💳 Биллинг", "settings_billing")
  .row()
  .text("🔄 Сброс", "settings_reset")
  .text("🔙 Назад", "back_to_start");

// Export the AI handler instance for use in the main bot file
export { aiHandler };
