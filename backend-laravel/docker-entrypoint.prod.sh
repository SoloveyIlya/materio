#!/bin/sh
set -e

DB_CONNECTION=${DB_CONNECTION:-mysql}

if [ "$DB_CONNECTION" = "mysql" ]; then
    echo "Waiting for MySQL database connection..."
    # Wait for MySQL to be ready (max 60 attempts = 2 minutes)
    max_attempts=60
    attempt=0

    until php -r "try { \$pdo = new PDO('mysql:host=mysql;port=3306;dbname=${MYSQL_DATABASE:-admin_db}', '${MYSQL_USER:-admin}', '${MYSQL_PASSWORD}'); echo 'OK'; exit(0); } catch (PDOException \$e) { exit(1); }" 2>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            echo "Failed to connect to database after $max_attempts attempts"
            exit 1
        fi
        echo "Waiting for database... ($attempt/$max_attempts)"
        sleep 2
    done
    echo "MySQL database is ready!"
fi

# Create .env file from environment variables if it doesn't exist
if [ ! -f /var/www/.env ]; then
    echo "Creating .env file from environment variables..."
    cat > /var/www/.env <<EOF
APP_NAME=${APP_NAME:-AdminBackend}
APP_ENV=production
APP_KEY=${APP_KEY}
APP_DEBUG=${APP_DEBUG:-false}
APP_TIMEZONE=UTC
APP_URL=${APP_URL}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=${MYSQL_DATABASE:-admin_db}
DB_USERNAME=${MYSQL_USER:-admin}
DB_PASSWORD=${MYSQL_PASSWORD}

CACHE_DRIVER=${CACHE_DRIVER:-file}
SESSION_DRIVER=${SESSION_DRIVER:-file}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}

REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PASSWORD=${REDIS_PASSWORD:-null}
REDIS_PORT=${REDIS_PORT:-6379}

SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS}
SESSION_DOMAIN=${SESSION_DOMAIN}

MAIL_MAILER=${MAIL_MAILER:-smtp}
MAIL_HOST=${MAIL_HOST}
MAIL_PORT=${MAIL_PORT:-587}
MAIL_USERNAME=${MAIL_USERNAME}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_ENCRYPTION=${MAIL_ENCRYPTION:-tls}
MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS}
MAIL_FROM_NAME=${MAIL_FROM_NAME:-${APP_NAME}}
EOF
fi

# Generate key if not exists
if [ -z "$APP_KEY" ] || ! grep -q "APP_KEY=base64:" /var/www/.env 2>/dev/null; then
    echo "Generating application key..."
    php artisan key:generate --force || true
fi

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Clear package discovery cache to remove dev dependencies
echo "Clearing package discovery cache..."
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php || true

# Optimize Laravel for production
echo "Optimizing Laravel for production..."
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Production setup complete!"

# Start WebSocket server in background if ENABLE_WEBSOCKET is true
if [ "${ENABLE_WEBSOCKET:-true}" = "true" ]; then
    echo "Starting WebSocket server..."
    php artisan websockets:serve --host=0.0.0.0 --port=6001 > /var/www/storage/logs/websockets.log 2>&1 &
    WEBSOCKET_PID=$!
    echo "WebSocket server started with PID: $WEBSOCKET_PID"
    
    # Give WebSocket server a moment to start
    sleep 2
    
    # Check if WebSocket process is still running
    if ! kill -0 $WEBSOCKET_PID 2>/dev/null; then
        echo "WARNING: WebSocket server failed to start. Check logs at /var/www/storage/logs/websockets.log"
        cat /var/www/storage/logs/websockets.log || true
    else
        echo "WebSocket server is running"
    fi
fi

echo "Starting PHP-FPM..."
exec "$@"
