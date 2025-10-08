#!/bin/bash

# AI Telegram Bot - Docker Start Script
echo "🐳 Starting AI Telegram Bot with Docker..."

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please copy env.example to .env and configure it:"
    echo "   cp env.example .env"
    echo "   nano .env"
    exit 1
fi

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Stopping existing containers..."
docker-compose down

# Собираем и запускаем контейнеры
echo "🔨 Building and starting containers..."
docker-compose up --build -d

# Ждем запуска сервисов
echo "⏳ Waiting for services to start..."
sleep 10

# Проверяем статус контейнеров
echo "📊 Container status:"
docker-compose ps

# Проверяем логи
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Application started successfully!"
echo ""
echo "🌐 URLs:"
echo "   Frontend:     http://localhost"
echo "   Backend API:  http://localhost/api"
echo "   Health check: http://localhost/ok"
echo ""
echo "📱 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Rebuild:      docker-compose up --build -d"
echo ""
echo "🔧 Database:"
echo "   MongoDB:      localhost:27017"
echo "   Redis:        localhost:6379"
