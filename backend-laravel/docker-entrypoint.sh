#!/bin/bash

# Ожидание Redis
echo "⏳ Ожидание запуска Redis..."
for i in {1..30}; do
    if timeout 2 bash -c "cat < /dev/null > /dev/tcp/redis/6379" 2>/dev/null; then
        echo "✅ Redis готов!"
        break
    fi
    echo "⏱️  Попытка $i/30 - Redis еще не готов..."
    sleep 2
    if [ $i -eq 30 ]; then
        echo "❌ Redis не запустился за 60 секунд"
        exit 1
    fi
done

# Ожидание MySQL
echo "⏳ Ожидание запуска MySQL..."
for i in {1..30}; do
    if timeout 2 bash -c "cat < /dev/null > /dev/tcp/mysql/3306" 2>/dev/null; then
        echo "✅ MySQL готов!"
        break
    fi
    echo "⏱️  Попытка $i/30 - MySQL еще не готов..."
    sleep 2
    if [ $i -eq 30 ]; then
        echo "❌ MySQL не запустился за 60 секунд"
        exit 1
    fi
done

# Запуск миграций (опционально)
# php artisan migrate --force

# Очистка кэша
php artisan config:clear
php artisan cache:clear

# Запуск сервера

DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE_VAL}
DB_USERNAME=${DB_USERNAME_VAL}
DB_PASSWORD=${DB_PASSWORD_VAL}

CACHE_DRIVER=${CACHE_DRIVER:-database}
SESSION_DRIVER=${SESSION_DRIVER:-database}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}

SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS:-localhost:3000,127.0.0.1:3000}
SESSION_DOMAIN=${SESSION_DOMAIN:-localhost}




# Ensure database exists before migrations (for SQLite)
if [ "$DB_CONNECTION" = "sqlite" ]; then
    DB_PATH="/var/www/database/database.sqlite"
    mkdir -p /var/www/database
    touch "$DB_PATH"
    chmod 664 "$DB_PATH"
    echo "SQLite database verified at: $DB_PATH"
fi

# Run migrations if AUTO_MIGRATE is true
if [ "${AUTO_MIGRATE:-false}" = "true" ]; then
    echo "Running migrations..."
    php artisan migrate --force
    echo "Migrations completed!"
fi

echo "Application started. Available commands:"


echo ""
echo "To run migrations manually: php artisan migrate"

# Create storage symlink if it doesn't exist
if [ ! -L /var/www/public/storage ] && [ ! -d /var/www/public/storage ]; then
    echo "Creating storage symlink..."
    php artisan storage:link || echo "Warning: Could not create storage symlink"
fi

echo "Setup complete! Starting server..."

exec "$@"
