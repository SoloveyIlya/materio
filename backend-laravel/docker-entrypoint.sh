#!/bin/sh
set -e

DB_CONNECTION=${DB_CONNECTION:-sqlite}

if [ "$DB_CONNECTION" = "mysql" ]; then
    echo "Waiting for MySQL database connection..."
    # Wait for MySQL to be ready (max 60 attempts = 2 minutes)
    max_attempts=60
    attempt=0

    until php -r "try { \$pdo = new PDO('mysql:host=mysql;port=3306;dbname=admin_db', 'admin', 'root'); echo 'OK'; exit(0); } catch (PDOException \$e) { exit(1); }" 2>/dev/null; do
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

DB_CONNECTION=${DB_CONNECTION:-sqlite}
DB_DATABASE=${DB_DATABASE:-/var/www/database/database.sqlite}

CACHE_DRIVER=${CACHE_DRIVER:-database}
SESSION_DRIVER=${SESSION_DRIVER:-database}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}

SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS:-localhost:3000,127.0.0.1:3000}
SESSION_DOMAIN=${SESSION_DOMAIN:-localhost}
EOF
fi

# Generate key if not exists
if ! grep -q "APP_KEY=base64:" /var/www/.env 2>/dev/null || [ -z "$(grep 'APP_KEY=base64:' /var/www/.env 2>/dev/null)" ]; then
    echo "Generating application key..."
    php artisan key:generate --force || true
fi

# Ensure database exists before migrations (for SQLite)
if [ "$DB_CONNECTION" = "sqlite" ]; then
    DB_PATH="/var/www/database/database.sqlite"
    mkdir -p /var/www/database
    touch "$DB_PATH"
    chmod 664 "$DB_PATH"
    echo "SQLite database verified at: $DB_PATH"
fi

# Run migrations
echo "Running migrations..."
php artisan migrate --force 2>&1 || {
    echo "Migration failed, recreating database..."
    rm -f /var/www/database/database.sqlite
    touch /var/www/database/database.sqlite
    chmod 664 /var/www/database/database.sqlite
    php artisan migrate --force
    php artisan db:seed --force
}

echo "Setup complete! Starting server..."

exec "$@"
