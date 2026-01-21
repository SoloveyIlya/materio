#!/bin/sh
# Don't exit on error - we handle errors explicitly
# set -e

DB_CONNECTION=${DB_CONNECTION:-mysql}

if [ "$DB_CONNECTION" = "mysql" ]; then
    DB_HOST=${DB_HOST:-mysql}
    DB_PORT=${DB_PORT:-3306}
    DB_DATABASE=${DB_DATABASE:-${MYSQL_DATABASE:-admin_db}}
    DB_USERNAME=${DB_USERNAME:-${MYSQL_USER:-admin}}
    DB_PASSWORD=${DB_PASSWORD:-${MYSQL_PASSWORD:-root}}
    echo "Waiting for MySQL database connection..."
    # Wait for MySQL to be ready (max 60 attempts = 2 minutes)
    max_attempts=60
    attempt=0

    until php -r "try { \$pdo = new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}'); echo 'OK'; exit(0); } catch (PDOException \$e) { exit(1); }" 2>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            echo "Failed to connect to database after $max_attempts attempts"
            exit 1
        fi
        echo "Waiting for database... ($attempt/$max_attempts)"
        sleep 2
    done
    echo "MySQL database is ready!"
else
    echo "Using SQLite database..."
    # Create database.sqlite file if using SQLite
    mkdir -p /var/www/database
    touch /var/www/database/database.sqlite
    chmod 664 /var/www/database/database.sqlite
    echo "SQLite database file created/verified"
fi

# Set DB variables based on connection type
if [ "$DB_CONNECTION" = "mysql" ]; then
    DB_DATABASE_VAL=${DB_DATABASE:-${MYSQL_DATABASE:-admin_db}}
    DB_USERNAME_VAL=${DB_USERNAME:-${MYSQL_USER:-admin}}
    DB_PASSWORD_VAL=${DB_PASSWORD:-${MYSQL_PASSWORD:-root}}
else
    DB_DATABASE_VAL=${DB_DATABASE:-/var/www/database/database.sqlite}
    DB_USERNAME_VAL=""
    DB_PASSWORD_VAL=""
fi

# Create .env file from environment variables if it doesn't exist
if [ ! -f /var/www/.env ]; then
    echo "Creating .env file from environment variables..."
    cat > /var/www/.env <<EOF
APP_NAME=${APP_NAME:-AdminBackend}
APP_ENV=${APP_ENV:-local}
APP_KEY=
APP_DEBUG=${APP_DEBUG:-true}
APP_TIMEZONE=UTC
APP_URL=${APP_URL:-http://localhost:8000}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${DB_HOST:-mysql}
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
echo "  - WebSocket: php artisan websockets:serve"
echo ""
echo "To run migrations manually: php artisan migrate"

# Create storage symlink if it doesn't exist
if [ ! -L /var/www/public/storage ] && [ ! -d /var/www/public/storage ]; then
    echo "Creating storage symlink..."
    php artisan storage:link || echo "Warning: Could not create storage symlink"
fi

echo "Setup complete! Starting server..."

exec "$@"
