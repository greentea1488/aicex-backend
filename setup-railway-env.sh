#!/bin/bash

# 🚀 AICEX AI Bot - Railway Environment Setup Script
# Этот скрипт поможет настроить переменные окружения для Railway

echo "🚀 AICEX AI Bot - Railway Environment Setup"
echo "==========================================="
echo ""

# Проверяем наличие Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не установлен"
    echo "📥 Установите Railway CLI:"
    echo "   npm install -g @railway/cli"
    echo "   или"
    echo "   curl -fsSL https://railway.app/install.sh | sh"
    echo ""
    echo "🌐 Или настройте переменные вручную в Railway Dashboard:"
    echo "   https://railway.app/dashboard"
    exit 1
fi

echo "✅ Railway CLI найден"
echo ""

# Проверяем авторизацию
if ! railway whoami &> /dev/null; then
    echo "🔐 Необходима авторизация в Railway"
    echo "Выполните: railway login"
    exit 1
fi

echo "✅ Авторизация в Railway подтверждена"
echo ""

# Генерируем секретные ключи
echo "🔐 Генерируем секретные ключи..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "✅ Секретные ключи сгенерированы"
echo ""

# Функция для безопасного ввода
read_secret() {
    local prompt="$1"
    local var_name="$2"
    echo -n "$prompt: "
    read -s value
    echo ""
    if [ -n "$value" ]; then
        eval "$var_name='$value'"
        return 0
    else
        echo "⚠️  Пропущено: $var_name"
        return 1
    fi
}

# Функция для обычного ввода
read_value() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    if [ -n "$default" ]; then
        echo -n "$prompt [$default]: "
    else
        echo -n "$prompt: "
    fi
    read value
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    if [ -n "$value" ]; then
        eval "$var_name='$value'"
        return 0
    else
        echo "⚠️  Пропущено: $var_name"
        return 1
    fi
}

echo "📝 Введите переменные окружения (Enter для пропуска):"
echo ""

# Обязательные переменные
echo "=== ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ==="
read_value "DATABASE_URL (MongoDB connection string)" DATABASE_URL
read_secret "BOT_TOKEN (от @BotFather)" BOT_TOKEN
echo ""

# AI API ключи
echo "=== AI API КЛЮЧИ ==="
read_secret "OPENAI_API_KEY" OPENAI_API_KEY
read_secret "FREEPIK_API_KEY" FREEPIK_API_KEY
read_secret "RUNWAY_API_KEY" RUNWAY_API_KEY
read_secret "KLING_API_KEY" KLING_API_KEY
read_secret "GEN_API_KEY (Midjourney)" GEN_API_KEY
echo ""

# Payment API
echo "=== PAYMENT API ==="
read_secret "LAVA_API_KEY" LAVA_API_KEY
read_secret "LAVA_SECRET_KEY" LAVA_SECRET_KEY
echo ""

# URLs
echo "=== URLS ==="
read_value "FRONTEND_URL" FRONTEND_URL "https://your-frontend.railway.app"
echo ""

# Устанавливаем переменные в Railway
echo "🚀 Устанавливаем переменные в Railway..."
echo ""

# Обязательные переменные
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set WEBHOOK_SECRET="$WEBHOOK_SECRET"
railway variables set PORT="8080"
railway variables set NODE_ENV="production"

if [ -n "$DATABASE_URL" ]; then
    railway variables set DATABASE_URL="$DATABASE_URL"
fi

if [ -n "$BOT_TOKEN" ]; then
    railway variables set BOT_TOKEN="$BOT_TOKEN"
fi

# AI API ключи
if [ -n "$OPENAI_API_KEY" ]; then
    railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"
fi

if [ -n "$FREEPIK_API_KEY" ]; then
    railway variables set FREEPIK_API_KEY="$FREEPIK_API_KEY"
    railway variables set FREEPIK_API_URL="https://api.freepik.com/v1"
fi

if [ -n "$RUNWAY_API_KEY" ]; then
    railway variables set RUNWAY_API_KEY="$RUNWAY_API_KEY"
    railway variables set RUNWAY_API_URL="https://api.dev.runwayml.com"
fi

if [ -n "$KLING_API_KEY" ]; then
    railway variables set KLING_API_KEY="$KLING_API_KEY"
    railway variables set KLING_API_URL="https://api.kling.ai/v1"
fi

if [ -n "$GEN_API_KEY" ]; then
    railway variables set GEN_API_KEY="$GEN_API_KEY"
fi

# Payment API
if [ -n "$LAVA_API_KEY" ]; then
    railway variables set LAVA_API_KEY="$LAVA_API_KEY"
    railway variables set LAVA_API_URL="https://api.lava.ru/business"
fi

if [ -n "$LAVA_SECRET_KEY" ]; then
    railway variables set LAVA_SECRET_KEY="$LAVA_SECRET_KEY"
fi

# URLs
if [ -n "$FRONTEND_URL" ]; then
    railway variables set FRONTEND_URL="$FRONTEND_URL"
fi

echo ""
echo "✅ Переменные окружения установлены в Railway!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте развертывание: railway logs"
echo "2. Откройте приложение: railway open"
echo "3. Проверьте healthcheck: curl https://your-app.railway.app/ok"
echo ""
echo "🔗 Полезные команды:"
echo "   railway variables    - Просмотр всех переменных"
echo "   railway logs         - Просмотр логов"
echo "   railway open         - Открыть приложение"
echo "   railway status       - Статус проекта"
echo ""
echo "🎉 Готово! Ваш AICEX AI Bot готов к работе на Railway!"
