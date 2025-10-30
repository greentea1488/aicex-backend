import { Keyboard } from "grammy";

/**
 * 🏠 ГЛАВНОЕ МЕНЮ - Reply Keyboard
 * Кнопки всегда видны под полем ввода
 * 
 * ⚠️ ВАЖНО: Кнопки должны ТОЧНО совпадать с callback_data в getSmartMainMenu()
 */

// Главное меню - всегда видно под полем ввода
export const mainReplyKeyboard = new Keyboard()
  .text("🎨 Генерация изображений").text("🎬 Генерация видео")
  .row()
  .text("💬 AI Чат").text("📊 Статистика")
  .row()
  .text("💰 Купить токены").text("❓ Помощь")
  .resized()
  .persistent();

// Кнопка "Назад в главное меню"
export const backToMainKeyboard = new Keyboard()
  .text("🏠 Главное меню")
  .resized()
  .persistent();


