#!/bin/bash

echo "🚀 Starting AICEX AI Bot Backend..."

# Проверяем переменные окружения
echo "📋 Environment check:"
echo "PORT: ${PORT:-3025}"
echo "DATABASE_URL: ${DATABASE_URL:+SET}"
echo "BOT_TOKEN: ${BOT_TOKEN:+SET}"

# Запускаем приложение
exec npm start
