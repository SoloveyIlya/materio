#!/bin/sh
set -e

DB_CONNECTION=${DB_CONNECTION:-mysql}

if [ "$DB_CONNECTION" = "mysql" ]; then
    echo "Waiting for MySQL database connection..."
    # Wait for MySQL to be ready (max 60 attempts = 2 minutes)
    max_attempts=60
    attempt=0
    
    # Используем DB_* переменные если они установлены, иначе MYSQL_* переменные, иначе defaults
    _db_host=${DB_HOST:-${MYSQL_HOST:-mysql}}
    _db_port=${DB_PORT:-${MYSQL_PORT:-3306}}
    _db_name=${DB_DATABASE:-${MYSQL_DATABASE:-admin_db}}
    _db_user=${DB_USERNAME:-${MYSQL_USER:-admin}}
    _db_pass=${DB_PASSWORD:-${MYSQL_PASSWORD}}

    # 1) Ждём доступности MySQL СЕРВЕРА (без выбора конкретной БД)
    until php -r "try { new PDO('mysql:host=${_db_host};port=${_db_port}', '${_db_user}', '${_db_pass}', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); echo 'OK'; exit(0); } catch (PDOException \$e) { exit(1); }" 2>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            echo "Failed to connect to database after $max_attempts attempts"
            exit 1
        fi
        echo "Waiting for database... ($attempt/$max_attempts)"
        sleep 2
    done

    # 2) Гарантируем, что БД существует (для случая, когда volume уже был и MYSQL_DATABASE не отработал)
    echo "Ensuring database '${_db_name}' exists..."
    php -r "\
try {\
  \$pdo = new PDO('mysql:host=${_db_host};port=${_db_port}', '${_db_user}', '${_db_pass}', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);\
  \$pdo->exec('CREATE DATABASE IF NOT EXISTS `${_db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');\
  echo 'OK';\
  exit(0);\
} catch (PDOException \$e) {\
  exit(1);\
}" 2>/dev/null || php -r "\
try {\
  \$rootPass = getenv('MYSQL_ROOT_PASSWORD') ?: '';\
  \$pdo = new PDO('mysql:host=${_db_host};port=${_db_port}', 'root', \$rootPass, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);\
  \$pdo->exec('CREATE DATABASE IF NOT EXISTS `${_db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');\
  echo 'OK';\
  exit(0);\
} catch (PDOException \$e) {\
  fwrite(STDERR, \$e->getMessage());\
  exit(1);\
}"

    echo "MySQL server is ready!"
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
DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-${MYSQL_DATABASE:-admin_db}}
DB_USERNAME=${DB_USERNAME:-${MYSQL_USER:-admin}}
DB_PASSWORD=${DB_PASSWORD:-${MYSQL_PASSWORD}}

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

# Start websocket server in background (nginx will proxy ws connections to this port)
echo "Starting Laravel WebSockets server on ${WEBSOCKET_HOST:-0.0.0.0}:${WEBSOCKET_PORT:-6001}..."
php artisan websockets:serve --host="${WEBSOCKET_HOST:-0.0.0.0}" --port="${WEBSOCKET_PORT:-6001}" &

echo "Starting main process..."
exec "$@"
