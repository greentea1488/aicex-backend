#!/bin/bash

# 🎨 Freepik API Setup Script
# Скрипт для быстрой настройки Freepik API ключа

echo "🎨 Настройка Freepik API ключа"
echo "================================="
echo ""

# Проверяем наличие .env файла
if [ ! -f "back/.env" ]; then
    echo "❌ Файл back/.env не найден!"
    echo "💡 Создайте файл .env из примера:"
    echo "   cp env.example back/.env"
    exit 1
fi

echo "📋 Текущий статус Freepik API:"
echo "   Файл .env: ✅ найден"

# Проверяем текущий ключ
current_key=$(grep "FREEPIK_API_KEY=" back/.env | cut -d'=' -f2)
if [ "$current_key" = "your_freepik_api_key_here" ] || [ -z "$current_key" ]; then
    echo "   API ключ: ❌ не настроен (шаблонное значение)"
    echo ""
    echo "🔑 Для настройки Freepik API:"
    echo "1. Получите API ключ на https://www.freepik.com/api"
    echo "2. Активируйте подписку на Freepik"
    echo "3. Запустите этот скрипт снова с ключом:"
    echo "   ./setup-freepik.sh fpk_ваш_ключ_здесь"
    echo ""
    echo "📚 Подробная инструкция: FREEPIK_SETUP.md"
    exit 0
else
    echo "   API ключ: ✅ настроен"
fi

# Если передан аргумент - это новый ключ
if [ ! -z "$1" ]; then
    new_key="$1"
    echo ""
    echo "🔄 Обновляем API ключ..."
    
    # Создаем резервную копию
    cp back/.env back/.env.backup.$(date +%Y%m%d_%H%M%S)
    echo "   ✅ Создана резервная копия .env"
    
    # Обновляем ключ
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/FREEPIK_API_KEY=.*/FREEPIK_API_KEY=$new_key/" back/.env
    else
        # Linux
        sed -i "s/FREEPIK_API_KEY=.*/FREEPIK_API_KEY=$new_key/" back/.env
    fi
    
    echo "   ✅ API ключ обновлен"
    echo ""
    echo "🚀 Перезапустите бота для применения изменений:"
    echo "   cd back && npm run build && npm run dev"
    echo ""
    echo "🧪 Проверьте работу через Telegram бота:"
    echo "   1. Выберите 'Freepik + Lora'"
    echo "   2. Отправьте запрос: 'Создай красивый пейзаж'"
else
    echo ""
    echo "🎉 Freepik API уже настроен!"
    echo ""
    echo "🧪 Для проверки работы:"
    echo "   1. Запустите бота: cd back && npm run dev"
    echo "   2. В Telegram выберите 'Freepik + Lora'"
    echo "   3. Отправьте запрос на генерацию изображения"
fi

echo ""
echo "📚 Полезные ссылки:"
echo "   • API ключи: https://www.freepik.com/developers/dashboard/api-key"
echo "   • Документация: https://docs.freepik.com/introduction/"
echo "   • Подписки: https://www.freepik.com/pricing"
