#!/bin/bash

# Скрипт для пуша всего проекта (включая фронтенд) в основной репозиторий AICEX_ai_bot

echo "🚀 Pushing project to AICEX_ai_bot repository..."

# Проверяем, есть ли изменения для коммита
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes. Please commit them first."
    git status -s
    exit 1
fi

# Пушим в основной репозиторий
echo "📦 Pushing to origin (AICEX_ai_bot)..."
git push origin main

echo "✅ Project pushed successfully to AICEX_ai_bot!"
