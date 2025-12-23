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

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=admin_db
DB_USERNAME=admin
DB_PASSWORD=root

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

# База данных MySQL должна быть создана заранее
echo "💾 Убедитесь, что база данных MySQL создана..."

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

