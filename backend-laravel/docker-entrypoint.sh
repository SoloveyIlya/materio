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
EOF
fi

# Generate key if not exists or is empty
if [ ! -f /var/www/.env ] || ! grep -q "APP_KEY=base64:" /var/www/.env 2>/dev/null || [ -z "$(grep 'APP_KEY=base64:' /var/www/.env 2>/dev/null | grep -v '^#' | cut -d'=' -f2 | tr -d ' ')" ]; then
    echo "Generating application key..."
    php artisan key:generate --force || echo "Warning: Could not generate APP_KEY"
fi

# Also check if APP_KEY is set in environment and update .env
if [ -n "$APP_KEY" ] && [ -f /var/www/.env ]; then
    echo "Updating APP_KEY from environment variable..."
    sed -i "s|APP_KEY=.*|APP_KEY=${APP_KEY}|" /var/www/.env || echo "Warning: Could not update APP_KEY in .env"
fi

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
echo "  - API Server: php artisan serve --host=0.0.0.0 --port=8000"

echo ""
echo "To run migrations manually: php artisan migrate"

# Create storage symlink if it doesn't exist
if [ ! -L /var/www/public/storage ] && [ ! -d /var/www/public/storage ]; then
    echo "Creating storage symlink..."
    php artisan storage:link || echo "Warning: Could not create storage symlink"
fi

echo "Setup complete! Starting server..."

exec "$@"
