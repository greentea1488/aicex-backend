# AICEX ONE Frontend

Vue.js приложение для AICEX AI Bot - Telegram WebApp.

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка переменных окружения
Создайте файл `.env.local` на основе `.env.example`:
```bash
cp .env.example .env.local
```

Отредактируйте `.env.local`:
```env
# Backend API URL
VITE_APP_HOST_URL=https://aicexaibot-production.up.railway.app

# Telegram WebApp URL (for development)
VITE_TELEGRAM_BOT_URL=https://t.me/aicex_ai_bot/app
```

### 3. Разработка
```bash
npm run dev
```

### 4. Сборка для продакшена
```bash
npm run build
```

## 🔧 Особенности разработки

### Telegram WebApp Integration
- Приложение автоматически определяет, запущено ли оно в Telegram WebApp
- Для разработки вне Telegram используются мок-данные
- Конфигурация в `src/config/development.ts`

### Аутентификация
- Автоматическая авторизация через Telegram WebApp initData
- JWT токены для API запросов
- Fallback на мок-данные для разработки

### Адаптивный дизайн
- Оптимизировано для мобильных устройств
- Поддержка Telegram темы
- Responsive layout с Tailwind CSS

## 📱 Тестирование в Telegram

1. Откройте бота: [@aicex_ai_bot](https://t.me/aicex_ai_bot)
2. Нажмите кнопку "👤 Профиль"
3. WebApp откроется в Telegram

## 🛠 Структура проекта

```
src/
├── components/     # Vue компоненты
├── views/         # Страницы приложения
├── stores/        # Pinia stores
├── http/          # API клиент и endpoints
├── config/        # Конфигурация
├── types/         # TypeScript типы
└── assets/        # Статические ресурсы
```

## 🔗 Полезные ссылки

- [Telegram WebApp API](https://core.telegram.org/bots/webapps)
- [Vue.js Documentation](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Pinia Store](https://pinia.vuejs.org/)
