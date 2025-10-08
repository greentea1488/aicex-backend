# 🚀 Настройка Railway для Frontend

## 🔧 Переменные окружения

Добавьте следующие переменные в настройки Railway:

### 1. Откройте Railway Dashboard
- Перейдите к проекту фронтенда
- Откройте вкладку "Variables"

### 2. Добавьте переменные:

```env
VITE_APP_HOST_URL=https://aicexaibot-production.up.railway.app
VITE_TELEGRAM_BOT_URL=https://t.me/aicex_ai_bot/app
```

### 3. Пересоберите проект
После добавления переменных нажмите "Redeploy"

## 🔍 Проверка

После деплоя откройте Developer Tools в браузере и проверьте:

1. **Console logs должны показать:**
   ```
   🔧 Environment variables: {
     VITE_APP_HOST_URL: "https://aicexaibot-production.up.railway.app",
     BACKEND_URL_USED: "https://aicexaibot-production.up.railway.app",
     MODE: "production",
     PROD: true
   }
   ```

2. **HTTP запросы должны идти на:**
   ```
   https://aicexaibot-production.up.railway.app/api/auth/auth
   ```
   А НЕ на:
   ```
   https://aicexonefrontend-production.up.railway.app/undefined/api/auth/auth
   ```

## ❌ Текущая проблема

Сейчас запросы идут на `/undefined/api/auth/auth` потому что `VITE_APP_HOST_URL` не установлен в Railway.

## ✅ После исправления

Фронтенд будет корректно обращаться к бэкенду и получать реальные данные пользователя.
