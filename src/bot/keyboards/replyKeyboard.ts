import { Keyboard } from "grammy";

/**
 * 🏠 ГЛАВНОЕ МЕНЮ - Reply Keyboard
 * Кнопки всегда видны под полем ввода
 */
export const mainMenuKeyboard = new Keyboard()
  .text("💡 ChatGPT").text("🌄 Midjourney")
  .row()
  .text("🎨 Freepik").text("🎬 Runway")
  .row()
  .text("📹 Kling").text("💰 Баланс")
  .row()
  .text("📊 Профиль").text("❓ Помощь")
  .resized()
  .persistent();

/**
 * 🔙 КНОПКА НАЗАД В ГЛАВНОЕ МЕНЮ
 */
export const backToMainKeyboard = new Keyboard()
  .text("🔙 Главное меню")
  .resized()
  .persistent();

/**
 * 💡 ChatGPT меню
 */
export const chatGPTKeyboard = new Keyboard()
  .text("💬 Новый чат").text("📝 Продолжить")
  .row()
  .text("⚙️ Настройки GPT").text("🔙 Главное меню")
  .resized()
  .persistent();

/**
 * 🌄 Midjourney меню
 */
export const midjourneyKeyboard = new Keyboard()
  .text("🎨 Создать изображение").text("⚙️ Настройки MJ")
  .row()
  .text("📚 Примеры").text("🔙 Главное меню")
  .resized()
  .persistent();

/**
 * 🎨 Freepik меню
 */
export const freepikKeyboard = new Keyboard()
  .text("🖼️ Создать изображение").text("⚙️ Настройки Freepik")
  .row()
  .text("📚 Стили").text("🔙 Главное меню")
  .resized()
  .persistent();

/**
 * 🎬 Runway меню
 */
export const runwayKeyboard = new Keyboard()
  .text("🎥 Создать видео").text("⚙️ Настройки Runway")
  .row()
  .text("📚 Примеры").text("🔙 Главное меню")
  .resized()
  .persistent();

/**
 * 📹 Kling меню
 */
export const klingKeyboard = new Keyboard()
  .text("🎬 Создать видео").text("⚙️ Настройки Kling")
  .row()
  .text("📚 Примеры").text("🔙 Главное меню")
  .resized()
  .persistent();

/**
 * 💰 Баланс и покупка токенов
 */
export const balanceKeyboard = new Keyboard()
  .text("💳 Купить токены").text("📊 История")
  .row()
  .text("🎁 Подписка").text("🔙 Главное меню")
  .resized()
  .persistent();

/**
 * 📊 Профиль пользователя
 */
export const profileKeyboard = new Keyboard()
  .text("💰 Токены").text("🎁 Подписка")
  .row()
  .text("📈 Статистика").text("⚙️ Настройки")
  .row()
  .text("🔙 Главное меню")
  .resized()
  .persistent();

