#!/bin/bash

# Скрипт для пуша только бэкенда в репозиторий aicex-backend

echo "🚀 Pushing backend to aicex-backend repository..."

# Проверяем, есть ли изменения для коммита
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes. Please commit them first."
    git status -s
    exit 1
fi

# Пушим subdirectory back/ в remote backend используя subtree
echo "📦 Splitting and pushing back/ directory..."
git subtree push --prefix=back backend main

echo "✅ Backend pushed successfully to aicex-backend!"
