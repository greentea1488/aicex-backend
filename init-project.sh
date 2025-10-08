#!/bin/bash

# AI Telegram Bot - Project Initialization Script
echo "🚀 Initializing AI Telegram Bot project..."

# Проверяем наличие необходимых инструментов
echo "🔍 Checking requirements..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git first."
    exit 1
fi

echo "✅ All requirements met!"

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   nano .env"
    echo ""
    echo "🔑 Required variables:"
    echo "   - BOT_TOKEN (from @BotFather)"
    echo "   - OPENAI_API_KEY (from OpenAI)"
    echo "   - JWT_SECRET (generate random string)"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

# Инициализируем Git если не инициализирован
if [ ! -d .git ]; then
    echo "🔧 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: AI Telegram Bot setup"
    echo "✅ Git repository initialized!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Create repository on GitHub"
    echo "   2. Add remote: git remote add origin <your-repo-url>"
    echo "   3. Push: git push -u origin main"
fi

# Устанавливаем зависимости
echo "📦 Installing dependencies..."

echo "Installing backend dependencies..."
cd back
npm install

echo "Installing frontend dependencies..."
cd ../front
npm install

cd ..

# Генерируем Prisma клиент
echo "🔧 Setting up database..."
cd back
npx prisma generate
cd ..

echo ""
echo "🎉 Project initialization complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. 🔑 Configure API keys in .env file:"
echo "   - Get Telegram bot token from @BotFather"
echo "   - Get OpenAI API key from https://platform.openai.com/api-keys"
echo "   - Generate JWT secret"
echo ""
echo "2. 🗄️  Set up database:"
echo "   - Install MongoDB locally or use Docker"
echo "   - Run: cd back && npx prisma db push"
echo ""
echo "3. 🚀 Start development:"
echo "   - Run: ./start-dev.sh"
echo "   - Or manually: cd back && npm run dev"
echo ""
echo "4. 🌐 Access the application:"
echo "   - Backend API: http://localhost:3025"
echo "   - Frontend: http://localhost:4173"
echo "   - Health check: http://localhost:3025/ok"
echo ""
echo "5. 📱 Test Telegram bot:"
echo "   - Find your bot in Telegram"
echo "   - Send /start command"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Main documentation"
echo "   - GITHUB_SETUP.md - GitHub setup guide"
echo ""
echo "🐳 Docker option:"
echo "   - Run: ./start-docker.sh"
echo ""
echo "Happy coding! 🎯"
