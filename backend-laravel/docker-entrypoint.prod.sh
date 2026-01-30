#!/bin/sh
set -e

DB_CONNECTION=${DB_CONNECTION:-mysql}

if [ "$DB_CONNECTION" = "mysql" ]; then
    echo "Waiting for MySQL database connection..."
    # Wait for MySQL to be ready (max 60 attempts = 2 minutes)
    max_attempts=60
    attempt=0
    
    # Статичные значения из docker-compose.prod.yml
    _db_host="mysql"
    _db_port="3306"
    _db_name="admin_db"
    _db_user="admin"
    _db_pass="root"
    _root_pass="root"

    # 1) Ждём доступности MySQL СЕРВЕРА (без выбора конкретной БД)
    until php -r "
    try { 
        \$pdo = new PDO('mysql:host=${_db_host};port=${_db_port}', '${_db_user}', '${_db_pass}', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); 
        echo 'OK'; 
        exit(0); 
    } catch (PDOException \$e) { 
        exit(1); 
    }" 2>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            echo "Failed to connect to database after $max_attempts attempts"
            exit 1
        fi
        echo "Waiting for database... ($attempt/$max_attempts)"
        sleep 2
    done

    # 2) Гарантируем, что БД существует
    echo "Ensuring database '${_db_name}' exists..."
    php -r "
    \$dbName = '${_db_name}';
    
    // Пробуем с обычным пользователем
    try {
        \$pdo = new PDO('mysql:host=${_db_host};port=${_db_port}', '${_db_user}', '${_db_pass}');
        \$pdo->exec('CREATE DATABASE IF NOT EXISTS ' . \$dbName . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        echo 'Database created/verified successfully';
        exit(0);
    } catch (PDOException \$e) {
        // Пробуем с root пользователем
        try {
            \$pdo = new PDO('mysql:host=${_db_host};port=${_db_port}', 'root', '${_root_pass}');
            \$pdo->exec('CREATE DATABASE IF NOT EXISTS ' . \$dbName . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            echo 'Database created/verified successfully (using root)';
            exit(0);
        } catch (PDOException \$e2) {
            echo 'Error: ' . \$e2->getMessage();
            exit(1);
        }
    }"

    echo "MySQL server is ready!"
fi

# Create .env file from environment variables if it doesn't exist
if [ ! -f /var/www/.env ]; then
    echo "Creating .env file from environment variables..."
    cat > /var/www/.env <<EOF
APP_NAME=Materio
APP_ENV=production
APP_KEY=base64:bW9aK2w4aE5tU0J1V3ZkN0NnZ0h4MmJtU2xqR0x2cUQ=
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=https://pickleflavor.info

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=admin_db
DB_USERNAME=admin
DB_PASSWORD=root

CACHE_DRIVER=redis
SESSION_DRIVER=cookie
QUEUE_CONNECTION=redis

REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

SANCTUM_STATEFUL_DOMAINS=pickleflavor.info,www.pickleflavor.info
SESSION_DOMAIN=.pickleflavor.info

BROADCAST_DRIVER=websocket
PUSHER_APP_ID=local
PUSHER_APP_KEY=local
PUSHER_APP_SECRET=local
PUSHER_HOST=pickleflavor.info
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1
WEBSOCKET_HOST=0.0.0.0
WEBSOCKET_PORT=6001
WEBSOCKET_SCHEME=http

MAIL_MAILER=smtp
MAIL_HOST=${MAIL_HOST}
MAIL_PORT=${MAIL_PORT:-587}
MAIL_USERNAME=${MAIL_USERNAME}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_ENCRYPTION=${MAIL_ENCRYPTION:-tls}
MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS}
MAIL_FROM_NAME=${MAIL_FROM_NAME:-Materio}
EOF
fi

# Generate key if not exists
if [ -z "$APP_KEY" ] || ! grep -q "APP_KEY=base64:" /var/www/.env 2>/dev/null; then
    echo "Generating application key..."
    php artisan key:generate --force || true
fi

# Run migrations
if [ "${AUTO_MIGRATE:-false}" = "true" ]; then
    echo "Running migrations..."
    php artisan migrate --force
fi

# Regenerate optimized autoload files and clear caches
echo "Regenerating autoload files..."
composer dump-autoload --optimize --classmap-authoritative --no-scripts 2>/dev/null || true

# Clear package discovery cache to remove dev dependencies
echo "Clearing package discovery cache..."
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php || true

# Optimize Laravel for production
if [ "${AUTO_OPTIMIZE:-false}" = "true" ]; then
    echo "Optimizing Laravel for production..."
    php artisan config:clear || true
    php artisan route:clear || true
    php artisan view:clear || true
    php artisan cache:clear || true
    php artisan config:cache || true
    php artisan route:cache || true
fi

# Try to cache views, but don't fail if resources/views doesn't exist
# (this is an API-only application)
if [ "${AUTO_OPTIMIZE:-false}" = "true" ]; then
    php artisan view:cache 2>/dev/null || true
fi

echo "Production setup complete!"

# Запускаем HTTP сервер на порту 8000 в фоне
echo "Starting Laravel HTTP server on 0.0.0.0:8000..."
php -S 0.0.0.0:8000 -t public &

# Даем серверу время запуститься
sleep 3

# Start websocket server in background
echo "Starting Laravel WebSockets server on 0.0.0.0:6001..."
php artisan websockets:serve --host=0.0.0.0 --port=6001 &

# Start queue worker in background to process ShouldBroadcast events
echo "Starting Laravel queue worker..."
php artisan queue:work --sleep=3 --tries=3 &

# Проверяем что HTTP сервер запущен
sleep 2
echo "Checking HTTP server status..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 | grep -q "200\|404\|403"; then
    echo "HTTP server is running on port 8000"
else
    echo "ERROR: HTTP server not responding on port 8000"
    exit 1
fi

echo "All servers started successfully!"
echo "HTTP server: http://0.0.0.0:8000"
echo "WebSocket server: ws://0.0.0.0:6001"

# Keep container running
echo "Container is running..."
tail -f /dev/null