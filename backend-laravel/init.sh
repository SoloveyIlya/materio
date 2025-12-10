#!/bin/bash

echo "🚀 Инициализация проекта..."

# Проверка существования .env
if [ ! -f .env ]; then
    echo "📝 Создание .env файла..."
    cat > .env <<EOF
APP_NAME=AdminBackend
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_TIMEZONE=UTC
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

SESSION_DRIVER=database
CACHE_DRIVER=database
QUEUE_CONNECTION=database

SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
SESSION_DOMAIN=localhost
EOF
fi

# Генерация ключа приложения
echo "🔑 Генерация ключа приложения..."
php artisan key:generate

# Создание базы данных SQLite
echo "💾 Создание базы данных..."
touch database/database.sqlite
chmod 664 database/database.sqlite

# Запуск миграций
echo "📦 Запуск миграций..."
php artisan migrate --force

# Запуск сидеров
echo "🌱 Заполнение начальными данными..."
php artisan db:seed --force

echo "✅ Инициализация завершена!"
echo ""
echo "Теперь вы можете запустить сервер:"
echo "  php artisan serve"

