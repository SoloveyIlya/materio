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

## Установка и запуск

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

#### Запуск WebSocket сервера:
```bash
php artisan websockets:serve
```

### 2. Frontend Setup

#### Установка пакетов:
```bash
cd frontend-nextjs
npm install
```

#### Конфигурация:
- В `.env.local` добавьте:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000
  NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:8000
  ```

#### Запуск приложения:
```bash
npm run dev
```

## Docker Deployment

### Backend (docker-compose.yml)
```yaml
websocket:
  image: php:8.1-cli
  working_dir: /app
  volumes:
    - ./backend-laravel:/app
  ports:
    - "6001:6001"
  command: php artisan websockets:serve
  depends_on:
    - app
```

### Frontend (docker-compose.yml)
```yaml
frontend:
  build:
    context: ./frontend-nextjs
  ports:
    - "3000:3000"
  environment:
    NEXT_PUBLIC_API_URL=http://backend:8000
    NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:6001
```

## Структура каналов Broadcasting

### Приватные каналы:
- `domain.{domainId}` - все события для домена
- `user.{userId}` - события для конкретного пользователя
- `admin.{adminId}` - события для администратора

### События:
- `message.sent` - событие отправки сообщения (содержит данные сообщения)
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

## Производство

### Nginx конфигурация:
```nginx
upstream websocket {
    server websocket:6001;
}

server {
    listen 80;
    
    location /socket.io {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### WebSocket не подключается
- Проверьте, что WebSocket сервер запущен: `php artisan websockets:serve`
- Проверьте порт 6001 открыт в брандмауэре
- Проверьте CORS/прокси конфигурацию

### Сообщения не доходят в реальном времени
- Проверьте, что токен авторизации передается правильно
- Убедитесь, что канал авторизирован в `routes/channels.php`
- Проверьте логи Laravel: `tail -f storage/logs/laravel.log`

### Высокое потребление памяти
- Убедитесь, что WebSocket соединения правильно закрываются
- Проверьте наличие утечек памяти в фронтенде
- Установите лимит соединений в конфиге WebSocket

## Миграция с Polling

Следующие файлы были обновлены:
- `src/app/(dashboard)/messages/page.jsx` - удален setInterval polling
- `src/views/apps/chat/index.jsx` - удален polling, добавлена WebSocket подписка
- `src/hooks/useGlobalMessageNotifications.js` - переписан на WebSocket

Старый polling код удален и заменен на WebSocket.

## Производительность

### Преимущества WebSocket:
- **Мгновенная доставка** - сообщения приходят сразу
- **Низкая задержка** - нет ожидания цикла polling (3+ секунды)
- **Меньше трафика** - нет лишних пустых запросов
- **Меньше нагрузки на сервер** - нет постоянных HTTP запросов

### Сравнение:
- **Polling (было)**: 1 запрос каждые 3 секунды = ~20 запросов в минуту на пользователя
- **WebSocket (сейчас)**: 1 соединение + события только при изменении данных

