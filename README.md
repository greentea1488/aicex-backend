# 🤖 AI Telegram Bot

Многофункциональный Telegram бот с интеграцией различных AI сервисов для генерации текста, изображений и видео.

## 🚀 Возможности

- **ChatGPT** - Текстовые диалоги с ИИ
- **Midjourney** - Генерация изображений
- **Kling AI** - Создание видео
- **Runway** - Видео и изображения
- **Freepik + Lora** - Изображения с кастомными стилями
- **Web App** - Веб-интерфейс для управления
- **Система токенов** - Монетизация
- **Реферальная программа** - Привлечение пользователей

## 🏗️ Архитектура

```
├── back/                 # Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── bot/         # Telegram Bot
│   │   ├── controllers/ # API контроллеры
│   │   ├── routes/      # API маршруты
│   │   ├── services/    # AI сервисы
│   │   └── utils/       # Утилиты
│   └── prisma/          # База данных
├── front/               # Frontend (Vue 3 + TypeScript)
│   ├── src/
│   │   ├── components/  # Vue компоненты
│   │   ├── views/       # Страницы
│   │   ├── stores/      # Pinia store
│   │   └── http/        # API клиент
└── docker/              # Docker конфигурация
```

## 🛠️ Технологии

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - Web framework
- **Prisma** - ORM для MongoDB
- **Grammy.js** - Telegram Bot API
- **JWT** - Аутентификация
- **Pino** - Логирование

### Frontend
- **Vue 3** + **TypeScript**
- **Pinia** - State management
- **Vue Router** - Роутинг
- **Tailwind CSS** - Стилизация
- **Vite** - Сборка

### AI Services
- **OpenAI API** - ChatGPT
- **Midjourney** - Генерация изображений
- **Kling AI** - Видео генерация
- **Runway** - Мультимедиа
- **Freepik** - Изображения + Lora

## 📋 Требования

- Node.js 18+
- MongoDB
- Docker (опционально)
- API ключи для AI сервисов

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd ai-telegram-bot
```

### 2. Установка зависимостей

```bash
# Backend
cd back
npm install

# Frontend
cd ../front
npm install
```

### 3. Настройка окружения

```bash
# Скопируйте пример конфигурации
cp env.example .env

# Отредактируйте .env файл с вашими настройками
nano .env
```

### 4. Настройка базы данных

```bash
cd back
npx prisma generate
npx prisma db push
```

### 5. Запуск в режиме разработки

```bash
# Backend
cd back
npm run dev

# Frontend (в новом терминале)
cd front
npm run dev
```

## 🌐 Развертывание на Railway

### Автоматическая настройка (рекомендуется):
```bash
# 1. Установите Railway CLI
npm install -g @railway/cli

# 2. Авторизуйтесь
railway login

# 3. Подключитесь к проекту
railway link

# 4. Запустите скрипт настройки
./setup-railway-env.sh
```

### Ручная настройка:
1. 📋 Откройте [RAILWAY_ENV_SETUP.md](./RAILWAY_ENV_SETUP.md) - полный список переменных
2. 🔐 Сгенерируйте секретные ключи: `node generate-jwt-secret.js`
3. 🗄️ Добавьте MongoDB: Railway Dashboard → Add-ons → MongoDB
4. ⚙️ Настройте переменные: Railway Dashboard → Variables
5. 🚀 Railway автоматически развернет приложение

### Минимальная конфигурация:
```bash
DATABASE_URL=mongodb://...     # MongoDB connection string
BOT_TOKEN=1234567890:ABC...    # От @BotFather
JWT_SECRET=your-jwt-secret     # Сгенерировать командой выше
```

📚 **Подробные инструкции**: [RAILWAY_ENV_SETUP.md](./RAILWAY_ENV_SETUP.md)

## 🔧 Конфигурация

### Переменные окружения

Основные переменные в `.env`:

```env
# Сервер
NODE_ENV=development
PORT=3025
FRONTEND_URL=https://your-domain.com

# База данных
DATABASE_URL="mongodb://localhost:27017/ai-telegram-bot"

# Telegram Bot
BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# JWT
JWT_SECRET=your_super_secret_jwt_key

# AI Services
OPENAI_API_KEY=your_openai_api_key
MIDJOURNEY_API_KEY=your_midjourney_api_key
KLING_API_KEY=your_kling_api_key
RUNWAY_API_KEY=your_runway_api_key
FREEPIK_API_KEY=your_freepik_api_key
```

### Получение API ключей

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Midjourney**: Используйте прокси API (TheNextLeg, Midjourney API)
3. **Kling AI**: https://kling.ai/
4. **Runway**: https://runwayml.com/
5. **Freepik**: https://www.freepik.com/

## 🐳 Docker

### Запуск с Docker Compose

```bash
docker-compose up -d
```

### Сборка образов

```bash
# Backend
cd back
docker build -t ai-backend .

# Frontend
cd front
docker build -t ai-frontend .
```

## 📱 Telegram Bot

### Создание бота

1. Напишите @BotFather в Telegram
2. Создайте нового бота командой `/newbot`
3. Получите токен и добавьте в `.env`

### Настройка Web App

1. В @BotFather выберите вашего бота
2. Выберите "Bot Settings" → "Menu Button"
3. Установите URL вашего веб-приложения

## 🔐 Безопасность

- Все API ключи хранятся в переменных окружения
- JWT токены для аутентификации
- Валидация входных данных
- Rate limiting для API
- CORS настройки

## 📊 Мониторинг

- Логирование с Pino
- PM2 для управления процессами
- Health check endpoints
- Error tracking (опционально)

## 🚀 Деплой

### Продакшен

```bash
# Сборка
npm run build

# Запуск с PM2
pm2 start ecosystem.config.js
```

### CI/CD

Проект настроен для автоматического деплоя через GitHub Actions.

## 🤝 Разработка

### Структура проекта

- `back/src/bot/` - Telegram Bot логика
- `back/src/controllers/` - API контроллеры
- `back/src/services/ai/` - AI сервисы
- `front/src/views/` - Vue страницы
- `front/src/components/` - Vue компоненты

### Добавление нового AI сервиса

1. Создайте класс в `back/src/services/ai/`
2. Наследуйтесь от `BaseAIService`
3. Реализуйте методы `getName()`, `chat()`, `validateConfig()`
4. Добавьте в `AIHandler`

## 📝 API Документация

### Аутентификация

```http
POST /api/auth/auth
Content-Type: application/json

{
  "initData": "telegram_init_data",
  "referralCode": "optional_referral_code"
}
```

### Чат

```http
POST /api/chat/dialogs/:dialogId/message
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "Hello, AI!",
  "model": "gpt-3.5-turbo"
}
```

## 🐛 Отладка

### Логи

```bash
# Просмотр логов
tail -f logs/$(date +%Y-%m-%d).log

# PM2 логи
pm2 logs ai-back
```

### Тестирование

```bash
# Backend тесты
cd back
npm test

# Frontend тесты
cd front

- OpenAI за ChatGPT API
- Telegram за Bot API
- Vue.js за отличный фреймворк
- Все open source библиотеки
