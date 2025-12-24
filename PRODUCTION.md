# Инструкция по развертыванию в Production

## Быстрый старт

1. **Скопируйте файл с переменными окружения:**
   ```bash
   cp env.production.example .env.production
   ```

2. **Отредактируйте `.env.production`** и заполните все необходимые значения:
   - `APP_URL` - полный URL вашего приложения (например: `https://admin.example.com`)
   - `NEXT_PUBLIC_API_URL` - URL API (например: `https://api.example.com` или `https://admin.example.com/api`)
   - `MYSQL_PASSWORD` - надежный пароль для пользователя базы данных
   - `MYSQL_ROOT_PASSWORD` - надежный пароль для root пользователя MySQL
   - `SANCTUM_STATEFUL_DOMAINS` - домены через запятую (например: `example.com,www.example.com`)
   - `SESSION_DOMAIN` - домен для сессий (например: `.example.com`)
   - Настройки почты (если требуется отправка email)

3. **Установите проект:**
   ```bash
   make install-prod
   ```

4. **Проверьте статус:**
   ```bash
   make ps-prod
   ```

## Основные команды для Production

### Управление сервисами
- `make up-prod` - Запустить все сервисы
- `make down-prod` - Остановить все сервисы
- `make restart-prod` - Перезапустить все сервисы
- `make build-prod` - Пересобрать контейнеры

### Логи
- `make logs-prod` - Логи всех сервисов
- `make logs-backend-prod` - Логи backend
- `make logs-frontend-prod` - Логи frontend

### База данных
- `make migrate-prod` - Выполнить миграции

### Оптимизация
- `make optimize-prod` - Оптимизировать Laravel (кеширование конфигурации, маршрутов, представлений)

### Artisan команды
- `make artisan-prod CMD="команда"` - Выполнить любую artisan команду

## Обновление Production

```bash
# 1. Получить последние изменения (если используете Git)
git pull origin main

# 2. Пересобрать контейнеры
make build-prod

# 3. Перезапустить сервисы
make restart-prod

# 4. Выполнить миграции (если есть новые)
make migrate-prod

# 5. Оптимизировать (если изменилась конфигурация)
make optimize-prod
```

## Особенности Production конфигурации

### Backend (Laravel)
- Использует PHP 8.2 FPM с оптимизированным OPcache
- Автоматическое кеширование конфигурации, маршрутов и представлений
- Отключены dev зависимости
- `APP_DEBUG=false` для безопасности

### Frontend (Next.js)
- Production build с оптимизацией
- Минимальный размер образа
- Отключена телеметрия Next.js

### База данных
- Используется MySQL 5.7 (обязательно для production)
- Автоматические health checks
- Постоянное хранилище (volumes)

## Безопасность

1. **Никогда не коммитьте `.env.production` в Git**
2. **Используйте надежные пароли** для базы данных
3. **Настройте SSL/TLS** через reverse proxy (Nginx/Apache)
4. **Ограничьте доступ** к портам через файрвол
5. **Регулярно обновляйте** зависимости и систему

## Мониторинг

### Проверка статуса контейнеров
```bash
make ps-prod
```

### Просмотр логов
```bash
make logs-prod
```

### Проверка использования ресурсов
```bash
docker stats
```

## Устранение неполадок

### Проблемы с подключением к базе данных
1. Проверьте логи MySQL: `make logs-prod | grep mysql`
2. Убедитесь, что пароли в `.env.production` правильные
3. Проверьте, что MySQL контейнер запущен: `make ps-prod`

### Проблемы с миграциями
```bash
# Выполнить миграции вручную
make artisan-prod CMD="migrate --force"
```

### Очистка кешей Laravel
```bash
make artisan-prod CMD="cache:clear"
make artisan-prod CMD="config:clear"
make artisan-prod CMD="route:clear"
make artisan-prod CMD="view:clear"
# Затем пересоздать кеши
make optimize-prod
```

### Пересборка с нуля
```bash
# Остановить и удалить все
make down-prod
docker system prune -a -f

# Пересобрать
make build-prod
make install-prod
```

## Резервное копирование

### База данных
```bash
# Создать бэкап
docker-compose -f docker-compose.prod.yml --env-file .env.production exec mysql mysqldump -u admin -p admin_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T mysql mysql -u admin -p admin_db < backup.sql
```

## Подключение через Reverse Proxy (Nginx)

Пример конфигурации Nginx для production:

```nginx
# Backend
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name example.com www.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Не забудьте настроить SSL через Let's Encrypt!
