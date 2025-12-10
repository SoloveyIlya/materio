# Admin Backend - Laravel API

Backend API для админ-панели на Laravel 10.

## Требования

- PHP >= 8.1
- Composer
- MySQL/PostgreSQL/SQLite
- Node.js и NPM (для фронтенда)

## Установка

1. Установите зависимости:
```bash
composer install
```

2. Скопируйте файл окружения:
```bash
cp .env.example .env
```

3. Сгенерируйте ключ приложения:
```bash
php artisan key:generate
```

4. Настройте базу данных в `.env` файле

5. Запустите миграции:
```bash
php artisan migrate
```

6. Запустите сервер разработки:
```bash
php artisan serve
```

API будет доступен по адресу: `http://localhost:8000`

## API Endpoints

### Аутентификация

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход (требует аутентификации)
- `GET /api/auth/user` - Получить текущего пользователя (требует аутентификации)

## Структура проекта

```
backend-laravel/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   └── Providers/
├── config/
├── database/
│   ├── migrations/
│   ├── factories/
│   └── seeders/
├── routes/
└── public/
```

