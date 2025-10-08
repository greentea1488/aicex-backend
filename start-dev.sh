#!/bin/bash

# AI Telegram Bot - Development Start Script

echo "Starting AICEX AI Bot in development mode..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install Docker and try again."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose not found. Please install Docker Compose and try again."
    exit 1
fi

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Don't forget to configure variables in .env file!"
fi

# Создаем сеть если её нет
docker network create ai-network 2>/dev/null || true

# Останавливаем существующие контейнеры
echo "Stopping existing containers..."
docker-compose down

# Собираем и запускаем контейнеры
echo "Building and starting containers..."
docker-compose up --build -d

# Ждем запуска сервисов
echo "Waiting for services to start..."
sleep 30

# Генерируем Prisma клиент
echo "Generating Prisma client..."
docker-compose exec backend npx prisma generate

# Применяем миграции
echo "Applying database migrations..."
docker-compose exec backend npx prisma db push

# Проверяем статус
echo "Checking service status..."
docker-compose ps

echo ""
echo "Project started!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:3025"
echo "Nginx Proxy: http://localhost"
echo "MongoDB: localhost:27017"
echo "Redis: localhost:6379"
echo ""
echo "Telegram Bot is active and ready to work!"
echo ""
echo "Useful commands:"
echo "   Logs of all services: docker-compose logs -f"
echo "   Logs of bot: docker-compose logs -f backend"
echo "   Logs of frontend: docker-compose logs -f frontend"
echo "   Restart bot: docker-compose restart backend"
echo "   Stop project: docker-compose down"
echo ""
echo "For development:"
echo "   Enter backend container: docker-compose exec backend sh"
echo "   Enter frontend container: docker-compose exec frontend sh"
echo "   Frontend: cd front && npm run dev"
echo ""
echo "URLs:"
echo "   Backend API:  http://localhost:3025"
echo "   Frontend:     http://localhost:4173"
echo ""
echo "📱 Don't forget to:"
echo "   1. Create a Telegram bot with @BotFather"
echo "   2. Add your bot token to .env"
echo "   3. Configure your AI service API keys"
