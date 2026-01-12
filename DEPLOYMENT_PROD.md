# Production Deployment Guide

## Структура проекта

Проект организован как монорепозиторий со следующей структурой:

```
/var/www/admin (или ваш путь к проекту)
  /backend-laravel
    Dockerfile.prod
    .env.production
    composer.json
    /public
    /storage
    /bootstrap/cache
    ...
  /frontend-nextjs
    Dockerfile.prod
    next.config.js
    package.json
    ...
  /deploy
    /caddy
      Caddyfile
    /nginx
      default.conf
  docker-compose.prod.yml
  .env.prod
```

## Архитектура

- **Caddy** - обратный прокси, открывает порты 80/443 наружу
  - `/api/*` проксируется в Nginx (Laravel)
  - Всё остальное проксируется в Next.js (SSR/standalone)
- **Nginx** - веб-сервер для Laravel, раздаёт `public` и проксирует PHP в PHP-FPM
- **PHP-FPM** - обработчик PHP для Laravel
- **Queue Worker** - обработчик очередей Laravel
- **Scheduler** - планировщик задач Laravel (cron)
- **Next.js** - фронтенд в standalone режиме
- **MySQL** - база данных
- **Redis** - кэш и очереди

## Настройка

### 1. Подготовка переменных окружения

См. подробную инструкцию в файле `ENV_SETUP.md`.

**Кратко:**

1. Создайте `.env.prod` в корне проекта:
```bash
DOMAIN=example.com
MYSQL_DATABASE=admin_db
MYSQL_ROOT_PASSWORD=strong_root_password
MYSQL_USER=admin
MYSQL_PASSWORD=strong_admin_password
```

2. Создайте `backend-laravel/.env.production`:
```bash
APP_ENV=production
APP_DEBUG=false
APP_URL=https://example.com

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=admin_db
DB_USERNAME=admin
DB_PASSWORD=strong_admin_password

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=redis
```

**Важно:** Замените `example.com` на ваш реальный домен и установите сильные пароли.

### 3. Настройка Caddyfile

Caddyfile уже настроен для автоматического TLS. Он использует переменную `{$DOMAIN}` из окружения.

**Важно:** Убедитесь, что переменная `DOMAIN` установлена в `.env.prod` и передана в контейнер Caddy через docker-compose.

Caddy автоматически:
- Получит SSL сертификат через Let's Encrypt
- Настроит HTTPS
- Проксирует `/api/*` в Laravel (nginx)
- Проксирует всё остальное в Next.js

### 4. Загрузка переменных окружения

Docker Compose автоматически читает `.env` файл. Для использования `.env.prod`:

```bash
# Вариант 1: Загрузить переменные в окружение
export $(cat .env.prod | xargs)
docker-compose -f docker-compose.prod.yml up -d

# Вариант 2: Использовать --env-file
docker-compose --env-file .env.prod -f docker-compose.prod.yml up -d

# Вариант 3: Переименовать (не рекомендуется)
cp .env.prod .env
docker-compose -f docker-compose.prod.yml up -d
```

## Запуск

### Сборка и запуск

```bash
# Загрузить переменные из .env.prod
export $(cat .env.prod | xargs)

# Собрать и запустить
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Проверка статуса

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Логи

```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.prod.yml logs -f caddy
docker-compose -f docker-compose.prod.yml logs -f php
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Обновление

### Обновление кода

```bash
# Остановить контейнеры
docker-compose -f docker-compose.prod.yml down

# Обновить код (git pull и т.д.)

# Пересобрать и запустить
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Миграции базы данных

Миграции выполняются автоматически при старте контейнера `php` через `docker-entrypoint.prod.sh`.

Для ручного запуска:

```bash
docker-compose -f docker-compose.prod.yml exec php php artisan migrate
```

## Мониторинг

### Проверка здоровья сервисов

```bash
# Caddy
curl http://localhost

# API
curl http://localhost/api

# Frontend
curl http://localhost
```

### Проверка очередей

```bash
docker-compose -f docker-compose.prod.yml logs queue
```

### Проверка планировщика

```bash
docker-compose -f docker-compose.prod.yml logs scheduler
```

## Troubleshooting

### Проблемы с правами доступа

```bash
# Исправить права для storage и cache
docker-compose -f docker-compose.prod.yml exec php chown -R www-data:www-data /var/www/storage
docker-compose -f docker-compose.prod.yml exec php chown -R www-data:www-data /var/www/bootstrap/cache
docker-compose -f docker-compose.prod.yml exec php chmod -R 775 /var/www/storage
docker-compose -f docker-compose.prod.yml exec php chmod -R 775 /var/www/bootstrap/cache
```

### Очистка кэша Laravel

```bash
docker-compose -f docker-compose.prod.yml exec php php artisan cache:clear
docker-compose -f docker-compose.prod.yml exec php php artisan config:clear
docker-compose -f docker-compose.prod.yml exec php php artisan route:clear
docker-compose -f docker-compose.prod.yml exec php php artisan view:clear
```

### Перезапуск сервисов

```bash
# Перезапуск конкретного сервиса
docker-compose -f docker-compose.prod.yml restart php

# Перезапуск всех сервисов
docker-compose -f docker-compose.prod.yml restart
```

## Безопасность

1. **Никогда не коммитьте `.env.prod` и `.env.production`** - они должны быть в `.gitignore`
2. **Используйте сильные пароли** для MySQL и других сервисов
3. **Настройте HTTPS** в Caddyfile для продакшена
4. **Ограничьте доступ** к портам MySQL и Redis только внутри Docker сети
5. **Регулярно обновляйте** зависимости и базовые образы

## Производительность

- PHP-FPM настроен на динамическое управление процессами
- Opcache включен для PHP
- Next.js использует standalone режим для минимального размера образа
- Redis используется для кэширования и очередей
- Статические файлы кэшируются через Nginx

