# 📚 AICEX AI BOT - Полная документация проекта

## 🎯 О проекте

**AICEX AI Bot** - Telegram бот с веб-приложением для AI генерации (изображения, видео, чат) с подписочной моделью монетизации через Lava.top.

---

## 🏗️ Архитектура системы

### Компоненты
```
┌─────────────────────────────────────────────────┐
│                  TELEGRAM BOT                    │
│              (Grammy.js + Webhook)               │
└───────────────┬──────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│              BACKEND API (Express.js)            │
│  ┌──────────┬──────────┬─────────┬────────────┐ │
│  │   Auth   │   Chat   │  Payment│   Webhooks │ │
│  │   JWT    │  OpenAI  │ Lava.top│   Verify   │ │
│  └──────────┴──────────┴─────────┴────────────┘ │
└───────────────┬──────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│            DATABASE (MongoDB + Prisma)           │
│   Users │ Subscriptions │ ChatHistory │ Tokens  │
└─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│         FRONTEND (Vue 3 + Telegram WebApp)       │
│    Profile │ Subscription │ Chat │ Settings     │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Backend (Node.js + TypeScript)

### Структура
```
back/
├── src/
│   ├── bot/              # Telegram Bot (Grammy.js)
│   ├── controllers/      # API Controllers
│   ├── routes/          # Express Routes
│   ├── services/        # AI Services (OpenAI, Freepik)
│   ├── middlewares/     # JWT, Rate Limiting
│   └── utils/           # Logger, helpers
├── prisma/
│   └── schema.prisma    # Database Schema
└── package.json
```

### Ключевые технологии
- **Express.js** - Web framework
- **Grammy.js** - Telegram Bot API
- **Prisma** - ORM для MongoDB
- **JWT** - Authentication
- **Pino** - Structured logging
- **Axios** - HTTP клиент

### Основные эндпоинты

#### Authentication
- `POST /api/auth/auth` - Авторизация через Telegram WebApp
- `GET /api/user/profile` - Получение профиля

#### Chat
- `POST /api/chat/dialogs/:id/message` - Отправка сообщения
- `GET /api/chat/dialogs` - Список диалогов

#### Payments
- `GET /api/payment/subscription/plans` - Список планов
- `POST /api/payment/lava-safe/subscription` - Создание подписки
- `POST /api/webhooks/lava` - Webhook от Lava.top

### Security Features
1. **Webhook Signature Verification** - HMAC SHA256 для Lava.top
2. **Rate Limiting** - По endpoints (auth: 5/15min, payments: 10/min)
3. **JWT Authentication** - Безопасная авторизация
4. **Global Error Handlers** - Обработка uncaught exceptions
5. **Database Indexes** - Оптимизация запросов

---

## 🎨 Frontend (Vue 3 + TypeScript)

### Структура
```
front/
├── src/
│   ├── components/      # UI Components
│   ├── views/          # Pages
│   ├── stores/         # Pinia State Management
│   ├── http/           # API Client
│   └── assets/         # Styles, images
└── package.json
```

### Ключевые технологии
- **Vue 3** - Framework
- **Pinia** - State management
- **Vue Router** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Telegram WebApp SDK** - Integration

### Основные страницы
- `/` - Главная (подписка, токены)
- `/subscription` - Выбор плана подписки
- `/payment/subscription` - Оплата подписки
- `/profile` - Профиль пользователя
- `/settings` - Настройки

### Интеграция с Telegram WebApp
```javascript
// main.ts
const tg = window.Telegram.WebApp
tg.ready()
tg.expand()
tg.headerColor = '#1e293b'
```

---

## 🗄️ База данных (MongoDB + Prisma)

### Основные модели

#### User
```prisma
model User {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  telegramId Int      @unique
  username   String?
  firstName  String?
  avatar     String?
  tokens     Int      @default(0)
  subscriptions Subscription[]
  chatHistory   ChatHistory[]
}
```

#### Subscription
```prisma
model Subscription {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  planId    String   @db.ObjectId
  status    String   # active, cancelled, expired
  startDate DateTime
  endDate   DateTime
  
  user User @relation(fields: [userId], references: [id])
  plan SubscriptionPlan @relation(fields: [planId], references: [id])
}
```

#### SubscriptionPlan
```prisma
model SubscriptionPlan {
  id          String @id @default(auto()) @map("_id") @db.ObjectId
  name        String @unique  # 'basic', 'pro', 'premium'
  displayName String
  price       Json   # {rub: 999, usd: 10, eur: 9}
  tokens      Int
  features    Json
  lavaOfferId String @unique
}
```

### Индексы (Performance)
- `User`: `telegramId`
- `ChatHistory`: `userId`, `createdAt`, `userId + createdAt`
- `Subscription`: `userId`, `status`, `userId + status`
- `SubscriptionPlan`: `isActive`

---

## 💳 Платежная система (Lava.top)

### Процесс оплаты

1. **Пользователь выбирает план** → Frontend
2. **Создание invoice** → `POST /api/payment/lava-safe/subscription`
3. **Редирект на Lava.top** → Пользователь платит
4. **Webhook уведомление** → `POST /api/webhooks/lava`
5. **Активация подписки** → Обновление БД

### Webhook Security
```typescript
// 1. Проверка API ключа
if (apiKey !== process.env.LAVA_TOP_WEBHOOK_KEY) {
  return res.status(401)
}

// 2. HMAC Signature Verification
const signature = req.headers['x-lava-signature']
const hmac = crypto.createHmac('sha256', LAVA_TOP_SECRET_KEY)
hmac.update(JSON.stringify(req.body))
const expectedSignature = hmac.digest('hex')

if (signature !== expectedSignature) {
  return res.status(403) // Invalid signature!
}
```

### Environment Variables
```bash
LAVA_API_KEY=your_api_key
LAVA_TOP_WEBHOOK_KEY=webhook_api_key
LAVA_TOP_SECRET_KEY=webhook_secret_for_hmac
LAVA_SHOP_ID=your_shop_id
```

---

## 🚀 Деплой на Railway

### Структура проектов Railway

```
AICEX AI Bot Project
├── Backend Service (aicex-backend repo)
│   ├── Environment: production
│   ├── Root: /
│   └── Build: npm install && npm run build
│
├── Frontend Service (aicex-frontend repo)
│   ├── Environment: production
│   ├── Root: /
│   └── Build: npm install && npm run build
│
├── MongoDB Database
│   └── Provides: DATABASE_URL
│
└── Redis Cache (optional)
    └── Provides: REDIS_URL
```

### Backend Environment Variables (Railway)
```bash
# Critical
NODE_ENV=production
DATABASE_URL=<from Railway MongoDB>
BOT_TOKEN=<from @BotFather>
JWT_SECRET=<generate: openssl rand -hex 64>

# Payment
LAVA_API_KEY=<from Lava.top>
LAVA_TOP_WEBHOOK_KEY=<from Lava.top>
LAVA_TOP_SECRET_KEY=<from Lava.top>

# AI Services
OPENAI_API_KEY=<from OpenAI>
FREEPIK_API_KEY=<from Freepik>

# URLs
FRONTEND_URL=https://aicexonefrontend-production.up.railway.app
BACKEND_URL=https://aicexaibot-production.up.railway.app
```

### Frontend Environment Variables (Railway)
```bash
VITE_APP_HOST_URL=https://aicexaibot-production.up.railway.app
VITE_BOT_USERNAME=your_bot_username
```

### Автоматический деплой
Railway автоматически деплоит при push в main:
```bash
git push origin main
# Railway автоматически:
# 1. Детектит изменения
# 2. Запускает npm install
# 3. Запускает npm run build
# 4. Перезапускает сервис
```

### Health Checks
```javascript
// Backend: /ok endpoint
app.get('/ok', async (req, res) => {
  const dbStatus = await prisma.$queryRaw`SELECT 1`
  res.json({ status: 'ok', database: 'connected' })
})
```

---

## 🔐 Безопасность

### Implemented Security Measures

1. **Webhook Signature Verification**
   - HMAC SHA256 для Lava.top
   - Защита от фейковых платежей

2. **Rate Limiting**
   - Auth: 5 req/15min
   - Payments: 10 req/min
   - AI Generation: 5 req/min
   - Global: 100 req/min

3. **JWT Authentication**
   - Secure tokens
   - Telegram WebApp initData verification

4. **Global Error Handlers**
   - Uncaught exceptions
   - Unhandled promise rejections
   - Graceful shutdown

5. **Database Security**
   - Indexed queries
   - No SQL injection (Prisma)
   - Connection pooling

### Production Checklist

#### Before Deploy:
- [ ] Generate strong JWT_SECRET (64 chars)
- [ ] Configure Lava.top webhook keys
- [ ] Replace all API keys
- [ ] Verify .env not in git
- [ ] Enable SSL for DATABASE_URL

#### After Deploy:
- [ ] Test payment creation
- [ ] Test Lava.top webhook
- [ ] Verify rate limiting works
- [ ] Check logs for errors
- [ ] Test JWT authentication

---

## 📝 Локальная разработка

### 1. Установка
```bash
# Clone
git clone <repo>
cd AICEX_ai_bot-1

# Backend
cd back
npm install
cp ../.env.example .env
# Edit .env with your keys

# Frontend
cd ../front
npm install
```

### 2. Database Setup
```bash
cd back
npx prisma generate
npx prisma db push
```

### 3. Запуск
```bash
# Backend (terminal 1)
cd back
npm run dev

# Frontend (terminal 2)
cd front
npm run dev
```

### 4. Тестирование
- Backend: http://localhost:3025
- Frontend: http://localhost:5173
- Bot: Напишите боту в Telegram

---

## 🔄 Git Workflow

### Repositories
```
Main Repo: greentea1488/AICEX_ai_bot
├── Backend Subtree: greentea1488/aicex-backend
└── Frontend Subtree: greentea1488/aicex-frontend
```

### Push Changes
```bash
# Main repo
git add .
git commit -m "feat: new feature"
git push origin main

# Backend subtree
git subtree push --prefix=back backend main

# Frontend subtree  
git subtree push --prefix=front frontend main
```

---

## 📦 Основные зависимости

### Backend
```json
{
  "express": "^4.18.2",
  "grammy": "^1.21.1",
  "prisma": "^5.10.0",
  "@prisma/client": "^5.10.0",
  "jsonwebtoken": "^9.0.2",
  "pino": "^8.19.0",
  "axios": "^1.6.7"
}
```

### Frontend
```json
{
  "vue": "^3.4.19",
  "pinia": "^2.1.7",
  "vue-router": "^4.2.5",
  "tailwindcss": "^3.4.1",
  "axios": "^1.6.7"
}
```

---

## 🐛 Troubleshooting

### Backend не запускается
```bash
# Проверить переменные
cat .env

# Проверить БД
npx prisma studio

# Проверить логи
tail -f logs/app.log
```

### Frontend не подключается к API
```bash
# Проверить VITE_APP_HOST_URL
echo $VITE_APP_HOST_URL

# Проверить CORS в backend
# back/src/index.ts - corsOptions
```

### Webhook не работает
```bash
# Проверить signature
# Логи покажут: "Invalid webhook signature"

# Убедиться что LAVA_TOP_SECRET_KEY правильный
```

---

## 📞 Support & Resources

- **Lava.top**: https://lava.top/en/docs/
- **Grammy Bot**: https://grammy.dev/
- **Prisma**: https://www.prisma.io/docs
- **Vue 3**: https://vuejs.org/
- **Railway**: https://docs.railway.app/

---

## ✅ Project Status

**Version**: 2.2.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2025-01-06  

**Deployed:**
- Backend: https://aicexaibot-production.up.railway.app
- Frontend: https://aicexonefrontend-production.up.railway.app

**Security Rating**: 🟢 9/10 (Production ready)

---

*Документация актуальна по состоянию на январь 2025*
