#!/bin/bash

# AICEX AI Bot - Railway Deployment Script
# Этот скрипт поможет быстро развернуть проект на Railway

echo "🚀 AICEX AI Bot - Railway Deployment"
echo "=================================="

# Проверяем, установлен ли Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не установлен"
    echo "📦 Установите Railway CLI:"
    echo "   npm install -g @railway/cli"
    echo "   или"
    echo "   curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

echo "✅ Railway CLI найден"

# Логин в Railway
echo "🔐 Авторизация в Railway..."
railway login

# Создание нового проекта
echo "📁 Создание нового проекта..."
railway init

# Добавление MongoDB
echo "🗄️  Добавление MongoDB..."
railway add --template mongodb

# Добавление Redis
echo "🔄 Добавление Redis..."
railway add --template redis

# Деплой backend
echo "🔧 Деплой Backend..."
railway up

echo "✅ Базовая настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Настройте переменные окружения в Railway Dashboard"
echo "2. Создайте отдельный сервис для Frontend"
echo "3. Настройте webhook для Telegram бота"
echo ""
echo "📖 Подробная инструкция: RAILWAY_DEPLOYMENT_GUIDE.md"
