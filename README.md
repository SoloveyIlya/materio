
Админ-панель с backend на Laravel и frontend на Next.js.

## Требования

- Docker и Docker Compose
- Make (опционально, для удобства)

## Быстрый старт

### Первый запуск (установка)

```bash
make install
```

Эта команда:
- Соберет и запустит все Docker контейнеры
- Настроит Laravel (создаст .env, сгенерирует ключ приложения)
- Выполнит миграции базы данных

После завершения установки:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

### Обычный запуск

Если проект уже установлен:

```bash
make up
```

### Остановка

```bash
make down
```

## Доступные команды

Просмотреть все доступные команды:

```bash
make help
```

### Основные команды

- `make up` - Запустить все сервисы
- `make down` - Остановить все сервисы
- `make build` - Пересобрать контейнеры
- `make restart` - Перезапустить все сервисы
- `make logs` - Показать логи всех сервисов
- `make ps` - Показать статус контейнеров

### Команды для работы с базой данных

- `make migrate` - Выполнить миграции
- `make migrate-fresh` - Пересоздать базу данных и выполнить миграции
- `make seed` - Выполнить сидеры

### Команды для разработки

- `make shell-backend` - Открыть shell в backend контейнере
- `make shell-frontend` - Открыть shell в frontend контейнере
- `make artisan CMD="route:list"` - Выполнить artisan команду
- `make tinker` - Открыть Laravel Tinker

### Логи

- `make logs-backend` - Логи backend
- `make logs-frontend` - Логи frontend
- `make logs-mysql` - Логи MySQL

## Структура проекта

```
admin/
├── backend-laravel/     # Laravel API
├── frontend-nextjs/     # Next.js Frontend
├── docker-compose.yml   # Docker Compose конфигурация
└── Makefile            # Команды для управления проектом
```

## Сервисы

- **MySQL** (порт 3306) - База данных (опционально, по умолчанию используется SQLite)
- **Backend** (порт 8000) - Laravel API
- **Frontend** (порт 3000) - Next.js приложение

## Примечания

- По умолчанию используется SQLite база данных
- MySQL сервис настроен, но не используется по умолчанию
- Все зависимости устанавливаются автоматически при сборке контейнеров

## Развертывание в Production

### Подготовка

1. Скопируйте файл с примером переменных окружения:
   ```bash
   cp env.production.example .env.production
   ```

2. Отредактируйте `.env.production` и заполните все необходимые значения:
   - `APP_URL` - URL вашего приложения
   - `NEXT_PUBLIC_API_URL` - URL API
   - `MYSQL_PASSWORD` и `MYSQL_ROOT_PASSWORD` - надежные пароли для базы данных
   - `SANCTUM_STATEFUL_DOMAINS` - домены для Sanctum
   - `SESSION_DOMAIN` - домен для сессий
   - Настройки почты (если требуется)

### Установка для Production

```bash
make install-prod
```

Эта команда:
- Соберет оптимизированные Docker образы для production
- Запустит все сервисы с production настройками
- Выполнит миграции базы данных
- Оптимизирует Laravel (кеширование конфигурации, маршрутов, представлений)

### Управление Production

- `make up-prod` - Запустить все сервисы production
- `make down-prod` - Остановить все сервисы production
- `make build-prod` - Пересобрать контейнеры для production
- `make restart-prod` - Перезапустить все сервисы production
- `make logs-prod` - Показать логи всех сервисов production
- `make migrate-prod` - Выполнить миграции в production
- `make optimize-prod` - Оптимизировать Laravel для production
- `make artisan-prod CMD="команда"` - Выполнить artisan команду в production

### Особенности Production конфигурации

- **Backend**: Использует PHP-FPM с оптимизированным OPcache
- **Frontend**: Собирается в standalone режиме для минимального размера образа
- **База данных**: Используется MySQL (обязательно для production)
- **Оптимизация**: Автоматическое кеширование конфигурации, маршрутов и представлений
- **Безопасность**: `APP_DEBUG=false`, отключены dev зависимости

### Обновление Production

```bash
# Получить последние изменения (если используете Git)
git pull origin main

# Пересобрать и перезапустить
make build-prod
make restart-prod

# Выполнить миграции (если есть новые)
make migrate-prod

# Оптимизировать (если изменилась конфигурация)
make optimize-prod
```
