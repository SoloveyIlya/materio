# Руководство по тестированию

## Обзор

Проект включает автоматизированные тесты для backend (Laravel/PHPUnit) и frontend (Jest + React Testing Library).

## Backend тесты (Laravel/PHPUnit)

### Структура тестов

Тесты расположены в директории `backend-laravel/tests/`:

```
tests/
├── Feature/          # Интеграционные тесты (API endpoints)
│   ├── AuthTest.php              # Тесты авторизации и аутентификации
│   ├── TaskTest.php              # Тесты для задач и шаблонов
│   ├── UserTest.php              # Тесты управления пользователями
│   ├── DocumentationTest.php     # Тесты документации
│   └── ActivityLogTest.php       # Тесты логов активности
├── Unit/            # Модульные тесты
│   └── ExampleTest.php
└── TestCase.php     # Базовый класс для тестов
```

### Фабрики для создания тестовых данных

Фабрики расположены в `backend-laravel/database/factories/`:

- `UserFactory.php` - создание пользователей
- `DomainFactory.php` - создание доменов
- `TaskCategoryFactory.php` - создание категорий задач
- `TaskTemplateFactory.php` - создание шаблонов задач
- `TaskFactory.php` - создание задач
- `DocumentationCategoryFactory.php` - создание категорий документации
- `DocumentationPageFactory.php` - создание страниц документации
- `ActivityLogFactory.php` - создание логов активности

### Запуск тестов

#### Запуск всех тестов

```bash
# В Docker контейнере
docker-compose exec backend php artisan test

# Или локально (если Laravel установлен)
cd backend-laravel
php artisan test
```

#### Запуск конкретного теста

```bash
# Запуск конкретного тест-класса
docker-compose exec backend php artisan test tests/Feature/AuthTest.php

# Запуск конкретного теста
docker-compose exec backend php artisan test --filter test_user_can_login
```

#### Запуск с покрытием кода

```bash
docker-compose exec backend php artisan test --coverage
```

#### Запуск только Feature тестов

```bash
docker-compose exec backend php artisan test --testsuite=Feature
```

#### Запуск только Unit тестов

```bash
docker-compose exec backend php artisan test --testsuite=Unit
```

### Описание тестов

#### 1. AuthTest.php

Тесты для проверки системы авторизации и аутентификации:

- ✅ `test_user_can_register` - пользователь может зарегистрироваться
- ✅ `test_user_can_login` - пользователь может войти в систему
- ✅ `test_user_cannot_login_with_invalid_credentials` - проверка неверных учетных данных
- ✅ `test_authenticated_user_can_get_user_info` - получение информации о пользователе
- ✅ `test_user_can_logout` - выход из системы

#### 2. TaskTest.php

Тесты для работы с задачами и шаблонами:

**Администратор:**
- ✅ `test_admin_can_create_task_template` - создание шаблона задачи
- ✅ `test_admin_can_list_task_templates` - список шаблонов

**Модератор:**
- ✅ `test_moderator_can_start_work_and_get_tasks` - начало работы и получение задач
- ✅ `test_moderator_can_list_tasks` - список задач модератора
- ✅ `test_moderator_can_start_task` - начало выполнения задачи
- ✅ `test_moderator_can_complete_task` - завершение задачи

#### 3. UserTest.php

Тесты для управления пользователями (доступны только админу):

- ✅ `test_admin_can_list_users` - список всех пользователей
- ✅ `test_admin_can_view_user_details` - просмотр деталей пользователя
- ✅ `test_admin_can_filter_users_by_role` - фильтрация пользователей по ролям
- ✅ `test_admin_can_send_test_task_to_moderator` - отправка тестовой задачи модератору

#### 4. DocumentationTest.php

Тесты для работы с документацией:

- ✅ `test_admin_can_create_documentation_category` - создание категории документации
- ✅ `test_admin_can_create_documentation_page` - создание страницы документации
- ✅ `test_admin_can_list_documentation_pages` - список страниц документации

#### 5. ActivityLogTest.php

Тесты для логов активности:

- ✅ `test_admin_can_view_activity_logs` - просмотр логов активности
- ✅ `test_admin_can_filter_activity_logs_by_user` - фильтрация логов по пользователю
- ✅ `test_activity_log_is_created_when_user_makes_request` - автоматическое создание логов

### Настройка окружения для тестов

Тесты используют отдельную базу данных для тестирования (настройки в `phpunit.xml`):

```xml
<env name="APP_ENV" value="testing"/>
<env name="DB_DATABASE" value="testing"/>
<env name="CACHE_DRIVER" value="array"/>
<env name="SESSION_DRIVER" value="array"/>
```

Для SQLite тестовой базы данных создайте файл `backend-laravel/database/testing.sqlite`:

```bash
touch backend-laravel/database/testing.sqlite
```

Или настройте `.env.testing` для использования другой базы данных.

### Примеры использования фабрик в тестах

```php
// Создание пользователя
$user = User::factory()->create(['domain_id' => $domain->id]);

// Создание задачи
$task = Task::factory()->create([
    'domain_id' => $domain->id,
    'assigned_to' => $user->id,
    'status' => 'pending',
]);

// Создание нескольких записей
Task::factory()->count(5)->create(['domain_id' => $domain->id]);
```

## Frontend тесты (Jest + React Testing Library)

### Настройка (планируется)

Frontend тесты будут настроены с использованием:
- Jest - фреймворк для тестирования
- React Testing Library - для тестирования React компонентов
- @testing-library/jest-dom - дополнительные матчеры для DOM

### Планируемые тесты

#### Компоненты Dashboard
- Рендеринг компонентов дашборда
- Отображение графиков и статистики
- Интерактивность виджетов

#### Компоненты Chat
- Отображение списка чатов
- Отправка сообщений
- Выбор активного чата

#### Компоненты форм
- Валидация форм
- Отправка данных
- Обработка ошибок

## CI/CD интеграция

### GitHub Actions (пример)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Backend Tests
        run: |
          cd backend-laravel
          composer install
          php artisan test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Frontend Tests
        run: |
          cd frontend-nextjs
          npm install
          npm test
```

## Рекомендации по написанию тестов

### Backend (Laravel)

1. **Используйте RefreshDatabase** для очистки базы данных между тестами
2. **Создавайте фабрики** для генерации тестовых данных
3. **Группируйте тесты** по функциональности в отдельные классы
4. **Используйте осмысленные имена** для тестовых методов
5. **Проверяйте структуру ответов** используя `assertJsonStructure()`
6. **Тестируйте граничные случаи** и обработку ошибок

### Frontend (React)

1. **Тестируйте поведение, а не реализацию**
2. **Используйте user events** вместо прямого манипулирования состоянием
3. **Изолируйте компоненты** от внешних зависимостей
4. **Используйте моки** для API вызовов
5. **Тестируйте доступность** (accessibility)

## Покрытие кода

### Проверка покрытия (Backend)

```bash
# Генерация отчета о покрытии
docker-compose exec backend php artisan test --coverage

# С HTML отчетом (требует установки Xdebug)
docker-compose exec backend php artisan test --coverage-html coverage
```

### Целевое покрытие

- **Backend API endpoints**: минимум 80%
- **Critical business logic**: минимум 90%
- **Frontend components**: минимум 70%

## Отладка тестов

### Backend

```bash
# Запуск с выводом детальной информации
docker-compose exec backend php artisan test --verbose

# Остановка на первой ошибке
docker-compose exec backend php artisan test --stop-on-failure
```

### Полезные команды

```bash
# Очистка кеша перед тестами
docker-compose exec backend php artisan config:clear
docker-compose exec backend php artisan cache:clear

# Запуск миграций для тестовой базы
docker-compose exec backend php artisan migrate --env=testing
```

## Часто встречающиеся проблемы

### Проблема: Тесты не могут подключиться к базе данных

**Решение:** Убедитесь, что тестовая база данных создана и настроена в `phpunit.xml`

### Проблема: Ошибки авторизации в тестах

**Решение:** Используйте `createToken()` для создания токенов авторизации в тестах:

```php
$token = $user->createToken('test-token')->plainTextToken;
$response = $this->withHeader('Authorization', 'Bearer ' . $token)
    ->getJson('/api/admin/users');
```

### Проблема: Тесты не изолированы

**Решение:** Убедитесь, что используется трейт `RefreshDatabase`:

```php
use RefreshDatabase;

protected function setUp(): void
{
    parent::setUp();
    // Начальная настройка
}
```

## Дополнительные ресурсы

- [Laravel Testing Documentation](https://laravel.com/docs/testing)
- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
