# Настройка переменных окружения для Production

## 1. Создайте `.env.prod` в корне проекта

Создайте файл `.env.prod` в корне проекта со следующим содержимым:

```bash
# Domain (для Caddy и Next.js)
DOMAIN=example.com

# Database (MySQL)
MYSQL_DATABASE=admin_db
MYSQL_ROOT_PASSWORD=strong_root_password
MYSQL_USER=admin
MYSQL_PASSWORD=strong_admin_password
```

**Важно:** Замените `example.com` на ваш реальный домен и установите сильные пароли.

## 2. Создайте `backend-laravel/.env.production`

Создайте файл `.env.production` в директории `backend-laravel` со следующим содержимым:

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

**Важно:** 
- Замените `example.com` на ваш реальный домен
- Убедитесь, что `DB_PASSWORD` совпадает с `MYSQL_PASSWORD` из `.env.prod`
- `DB_HOST=mysql` - это имя сервиса в docker-compose, не меняйте его

## 3. Дополнительные переменные (опционально)

Если нужны дополнительные настройки, добавьте в `backend-laravel/.env.production`:

```bash
# Application Key (будет сгенерирован автоматически при первом запуске, если не указан)
APP_KEY=

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.your-domain.com
MAIL_PORT=587
MAIL_USERNAME=your_email@your-domain.com
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="AdminBackend"

# Sanctum (для API аутентификации)
SANCTUM_STATEFUL_DOMAINS=example.com,www.example.com
SESSION_DOMAIN=.example.com
```

## 4. Использование переменных

После создания файлов, загрузите переменные из `.env.prod` перед запуском:

```bash
export $(cat .env.prod | xargs)
docker-compose -f docker-compose.prod.yml up -d
```

Или используйте `--env-file`:

```bash
docker-compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

## Безопасность

⚠️ **ВАЖНО:** 
- Никогда не коммитьте `.env.prod` и `.env.production` в git
- Эти файлы должны быть в `.gitignore`
- Используйте сильные пароли для production
- Регулярно обновляйте пароли


