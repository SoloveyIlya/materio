# WebSocket Setup Guide

## Обзор
Приложение было обновлено с polling на реальный WebSocket для мгновенного получения сообщений в реальном времени.

## Компоненты WebSocket

### Backend (Laravel)
1. **beyondcode/laravel-websockets** - WebSocket сервер для Laravel
2. **Events** - События для трансляции сообщений:
   - `App\Events\MessageSent` - отправка нового сообщения
   - `App\Events\UserStatusChanged` - изменение статуса пользователя
3. **Broadcasting config** - конфигурация канальной трансляции

### Frontend (Next.js)
1. **socket.io-client** - клиент для подключения к WebSocket серверу
2. **lib/websocket.js** - утилиты для работы с WebSocket
3. **Обновленные хуки** - useGlobalMessageNotifications, страницы чатов

## Быстрый старт с Docker (Рекомендуется)

### Development:
```bash
# Запустить весь стек
docker-compose up --build

# WebSocket будет запущен автоматически на порте 6001
# API запущен на порте 8000
# Frontend запущен на порте 3000
```

### Production:
```bash
# Запустить production стек
docker-compose -f docker-compose.prod.yml up --build

# WebSocket запустится после миграций автоматически
# Настройка nginx для проксирования WebSocket уже включена
```

## Установка и запуск вручную

### 1. Backend Setup

#### Установка пакетов:
```bash
cd backend-laravel
composer install
composer require beyondcode/laravel-websockets
```

#### Конфигурация:
- Скопируйте переменные окружения:
  ```bash
  cp .env.example .env
  ```
- Обновите `.env`:
  ```
  BROADCAST_DRIVER=websocket
  WEBSOCKET_HOST=0.0.0.0
  WEBSOCKET_PORT=6001
  WEBSOCKET_SCHEME=http
  ```

#### Публикование конфигурации:
```bash
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider"
```

#### Запуск миграций:
```bash
php artisan migrate
```

#### Запуск WebSocket сервера:
```bash
php artisan websockets:serve --host=0.0.0.0 --port=6001
```

#### В отдельном терминале - Запуск API:
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. Frontend Setup

#### Установка пакетов:
```bash
cd frontend-nextjs
npm install
```

#### Конфигурация:
- Создайте `.env.local`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000
  NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:8000
  ```

#### Запуск приложения:
```bash
npm run dev
```

## Docker конфигурация

### Development Docker (Dockerfile)

WebSocket и API запускаются одновременно:
- Открыты оба порта (8000 для API, 6001 для WebSocket)
- Обе услуги запускаются в одном контейнере

### Production Docker (Dockerfile.prod)

WebSocket запускается после миграций в `docker-entrypoint.prod.sh`:
- Выполняются миграции
- Затем запускается WebSocket сервер в background
- Затем запускается PHP-FPM

### Docker Compose конфигурация

#### Development (docker-compose.yml)
```yaml
backend:
  ports:
    - "${BACKEND_PORT:-8000}:8000"
    - "${WEBSOCKET_PORT:-6001}:6001"
  environment:
    - BROADCAST_DRIVER=websocket
    - WEBSOCKET_HOST=0.0.0.0
    - WEBSOCKET_PORT=6001
```

#### Production (docker-compose.prod.yml)
```yaml
backend:
  environment:
    - BROADCAST_DRIVER=websocket
    - WEBSOCKET_HOST=0.0.0.0
    - WEBSOCKET_PORT=6001
    - ENABLE_WEBSOCKET=true
```

## Nginx конфигурация для WebSocket

Для production окружения используется nginx с проксированием WebSocket:

```nginx
# WebSocket проксирование в deploy/nginx/default.conf
location /socket.io {
    proxy_pass http://backend:6001;
    proxy_http_version 1.1;
    
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket timeouts (24 часа)
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}
```

## Переменные окружения

### Backend
```
BROADCAST_DRIVER=websocket          # Тип broadcasting драйвера
WEBSOCKET_HOST=0.0.0.0              # Хост для WebSocket сервера
WEBSOCKET_PORT=6001                 # Порт для WebSocket сервера
WEBSOCKET_SCHEME=http               # http или https
ENABLE_WEBSOCKET=true               # Включить WebSocket (для prod)
```

### Frontend
```
NEXT_PUBLIC_API_URL=http://localhost:8000      # URL API сервера
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:8000  # URL WebSocket
```

## Структура каналов Broadcasting

### Приватные каналы:
- `domain.{domainId}` - все события для домена
- `user.{userId}` - события для конкретного пользователя
- `admin.{adminId}` - события для администратора

### События:
- `message.sent` - событие отправки сообщения
- `user.status.changed` - изменение статуса пользователя (online/offline)

## Тестирование

### Проверка WebSocket соединения:
1. Откройте DevTools браузера (F12)
2. Перейдите на вкладку Network
3. Фильтруйте по WS (WebSocket)
4. Вы должны увидеть соединение к localhost:6001

### Тестирование отправки сообщений:
1. Откройте приложение на двух вкладках
2. Отправьте сообщение на одной вкладке
3. На другой вкладке должно появиться сообщение мгновенно (без задержки)

### Docker проверка:
```bash
# Проверить логи WebSocket
docker-compose logs backend

# Проверить что контейнеры запущены
docker-compose ps

# Проверить конкретный порт
curl http://localhost:6001/
```

## Troubleshooting

### WebSocket не подключается
- Проверьте, что WebSocket сервер запущен:
  ```bash
  docker-compose ps
  # backend должен быть в статусе "Up"
  ```
- Проверьте порт 6001 открыт:
  ```bash
  docker-compose logs backend
  ```

### Сообщения не доходят в реальном времени
- Проверьте, что токен авторизации передается правильно
- Убедитесь, что канал авторизирован в `routes/channels.php`
- Проверьте логи Laravel:
  ```bash
  docker-compose logs backend
  ```

### Высокое потребление памяти
- Убедитесь, что WebSocket соединения правильно закрываются
- Проверьте наличие утечек памяти в фронтенде

## Обновленные файлы

### Backend:
- `backend-laravel/Dockerfile` - добавлены оба порта и команда для запуска WebSocket
- `backend-laravel/Dockerfile.prod` - добавлен порт 6001
- `backend-laravel/docker-entrypoint.sh` - поддержка AUTO_MIGRATE флага
- `backend-laravel/docker-entrypoint.prod.sh` - запуск WebSocket после миграций
- `backend-laravel/app/Events/MessageSent.php` - событие отправки сообщения
- `backend-laravel/app/Events/UserStatusChanged.php` - событие изменения статуса
- `backend-laravel/app/Http/Controllers/MessageController.php` - трансляция события
- `backend-laravel/routes/channels.php` - авторизация каналов
- `backend-laravel/routes/web.php` - маршруты broadcasting

### Frontend:
- `frontend-nextjs/src/lib/websocket.js` - утилиты для WebSocket
- `frontend-nextjs/src/app/(dashboard)/messages/page.jsx` - удален polling
- `frontend-nextjs/src/views/apps/chat/index.jsx` - удален polling
- `frontend-nextjs/src/hooks/useGlobalMessageNotifications.js` - переписана на WebSocket
- `frontend-nextjs/.env.example` - добавлены WebSocket переменные

### Docker:
- `docker-compose.yml` - WebSocket переменные окружения и порты
- `docker-compose.prod.yml` - конфигурация для production
- `deploy/nginx/default.conf` - проксирование WebSocket

## Quick Start Commands

### Development
```bash
# Запустить всё
docker-compose up --build

# Выполнить миграции (если AUTO_MIGRATE не включена)
docker-compose exec backend php artisan migrate
```

### Production
```bash
# Запустить production стек
docker-compose -f docker-compose.prod.yml up --build -d

# Миграции запускаются автоматически в entrypoint
```

### Остановка
```bash
# Остановить контейнеры
docker-compose down

# Остановить и удалить данные
docker-compose down -v
```

## Производительность

### Преимущества WebSocket:
- **Мгновенная доставка** - сообщения приходят сразу
- **Низкая задержка** - нет ожидания цикла polling (3+ секунды)
- **Меньше трафика** - нет лишних пустых запросов
- **Меньше нагрузки на сервер** - нет постоянных HTTP запросов

### Сравнение:
- **Polling (было)**: 1 запрос каждые 3 секунды = ~20 запросов в минуту на пользователя
- **WebSocket (сейчас)**: 1 соединение + события только при изменении данных
