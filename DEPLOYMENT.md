# Инструкция по развертыванию проекта на продакшене (без Docker)

## Системные требования

### Минимальные требования:
- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **PHP**: 8.1 или выше
- **Node.js**: 18.x или выше
- **Composer**: последняя версия
- **Веб-сервер**: Nginx 1.18+ или Apache 2.4+
- **База данных**: MySQL 8.0+ / PostgreSQL 13+ / SQLite 3.8+

### Рекомендуемые требования:
- **RAM**: минимум 2GB (рекомендуется 4GB+)
- **CPU**: 2+ ядра
- **Диск**: 20GB+ свободного места

---

## 1. Подготовка сервера

### 1.1 Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.2 Установка базовых инструментов

```bash
# Ubuntu/Debian
sudo apt install -y git curl wget unzip software-properties-common

# CentOS/RHEL
sudo yum install -y git curl wget unzip
```

---

## 2. Установка PHP 8.1+

### 2.1 Ubuntu/Debian

```bash
# Добавление репозитория PHP
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Установка PHP и необходимых расширений
sudo apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-common \
    php8.2-mysql php8.2-zip php8.2-gd php8.2-mbstring php8.2-curl \
    php8.2-xml php8.2-bcmath php8.2-sqlite3 php8.2-pdo php8.2-pdo-mysql \
    php8.2-pdo-sqlite php8.2-tokenizer php8.2-json php8.2-fileinfo
```

### 2.2 CentOS/RHEL

```bash
# Установка репозитория Remi
sudo yum install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm

# Включение PHP 8.2
sudo dnf module reset php -y
sudo dnf module enable php:remi-8.2 -y

# Установка PHP и расширений
sudo yum install -y php php-cli php-fpm php-common php-mysqlnd \
    php-zip php-gd php-mbstring php-curl php-xml php-bcmath \
    php-sqlite3 php-json php-fileinfo php-tokenizer
```

### 2.3 Проверка установки PHP

```bash
php -v
# Должно показать версию 8.1 или выше
```

---

## 3. Установка Composer

```bash
# Скачивание установщика Composer
cd /tmp
curl -sS https://getcomposer.org/installer | php

# Перемещение в системную директорию
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Проверка установки
composer --version
```

---

## 4. Установка Node.js 18+

### 4.1 Использование NodeSource (рекомендуется)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 4.2 Альтернативный способ (используя nvm)

```bash
# Установка nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Установка Node.js 18
nvm install 18
nvm use 18
nvm alias default 18
```

### 4.3 Проверка установки

```bash
node -v
npm -v
```

---

## 5. Установка и настройка базы данных

### 5.1 Вариант A: MySQL (рекомендуется для продакшена)

```bash
# Ubuntu/Debian
sudo apt install -y mysql-server
sudo mysql_secure_installation

# CentOS/RHEL
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
sudo mysql_secure_installation
```

Создание базы данных и пользователя:

```bash
sudo mysql -u root -p
```

В MySQL консоли:

```sql
CREATE DATABASE admin_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'admin_user'@'localhost' IDENTIFIED BY 'ваш_надежный_пароль';
GRANT ALL PRIVILEGES ON admin_db.* TO 'admin_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5.2 Вариант B: PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install -y postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Создание базы данных:

```bash
sudo -u postgres psql
```

В PostgreSQL консоли:

```sql
CREATE DATABASE admin_db;
CREATE USER admin_user WITH PASSWORD 'ваш_надежный_пароль';
ALTER ROLE admin_user SET client_encoding TO 'utf8';
ALTER ROLE admin_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE admin_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE admin_db TO admin_user;
\q
```

### 5.3 Вариант C: SQLite (только для небольших проектов)

```bash
# Ubuntu/Debian
sudo apt install -y sqlite3

# CentOS/RHEL
sudo yum install -y sqlite
```

---

## 6. Установка веб-сервера

### 6.1 Установка Nginx (рекомендуется)

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# Запуск и автозагрузка
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6.2 Альтернатива: Apache

```bash
# Ubuntu/Debian
sudo apt install -y apache2 libapache2-mod-php8.2

# CentOS/RHEL
sudo yum install -y httpd
sudo systemctl start httpd
sudo systemctl enable httpd
```

---

## 7. Развертывание Backend (Laravel)

### 7.1 Клонирование/загрузка проекта

```bash
# Создание директории для проекта
sudo mkdir -p /var/www/admin
sudo chown -R $USER:$USER /var/www/admin

# Переход в директорию
cd /var/www/admin

# Если используете Git
git clone <ваш-репозиторий> .

# Или загрузите файлы проекта через SCP/SFTP в /var/www/admin/backend-laravel
```

### 7.2 Установка зависимостей Laravel

```bash
cd /var/www/admin/backend-laravel

# Установка зависимостей
composer install --optimize-autoloader --no-dev

# Если нет файла .env, создайте его
cp .env.example .env
# Или создайте вручную (см. раздел 7.3)
```

### 7.3 Настройка файла .env

Отредактируйте файл `/var/www/admin/backend-laravel/.env`:

```bash
nano /var/www/admin/backend-laravel/.env
```

Минимальная конфигурация для продакшена:

```env
APP_NAME="Admin Backend"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=https://your-domain.com

# База данных (выберите один вариант)

# Для MySQL:
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=admin_db
DB_USERNAME=admin_user
DB_PASSWORD=ваш_надежный_пароль

# Для PostgreSQL:
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=admin_db
# DB_USERNAME=admin_user
# DB_PASSWORD=ваш_надежный_пароль

# Для SQLite:
# DB_CONNECTION=sqlite
# DB_DATABASE=/var/www/admin/backend-laravel/database/database.sqlite

# Кеш и сессии
CACHE_DRIVER=file
SESSION_DRIVER=file
QUEUE_CONNECTION=database

# Sanctum (для API аутентификации)
SANCTUM_STATEFUL_DOMAINS=your-domain.com,www.your-domain.com
SESSION_DOMAIN=.your-domain.com

# Почта (настройте при необходимости)
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@your-domain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### 7.4 Генерация ключа приложения

```bash
cd /var/www/admin/backend-laravel
php artisan key:generate
```

### 7.5 Настройка прав доступа

```bash
cd /var/www/admin/backend-laravel

# Установка владельца (замените www-data на пользователя веб-сервера)
sudo chown -R www-data:www-data /var/www/admin/backend-laravel

# Установка прав на директории
sudo find /var/www/admin/backend-laravel -type d -exec chmod 755 {} \;

# Установка прав на файлы
sudo find /var/www/admin/backend-laravel -type f -exec chmod 644 {} \;

# Специальные права для storage и bootstrap/cache
sudo chmod -R 775 /var/www/admin/backend-laravel/storage
sudo chmod -R 775 /var/www/admin/backend-laravel/bootstrap/cache

# Если используете SQLite
sudo touch /var/www/admin/backend-laravel/database/database.sqlite
sudo chmod 664 /var/www/admin/backend-laravel/database/database.sqlite
sudo chown www-data:www-data /var/www/admin/backend-laravel/database/database.sqlite
```

### 7.6 Запуск миграций

```bash
cd /var/www/admin/backend-laravel
php artisan migrate --force

# Опционально: заполнение начальными данными
php artisan db:seed --force
```

### 7.7 Оптимизация Laravel для продакшена

```bash
cd /var/www/admin/backend-laravel

# Кеширование конфигурации
php artisan config:cache

# Кеширование маршрутов
php artisan route:cache

# Кеширование представлений
php artisan view:cache

# Оптимизация автозагрузчика
composer install --optimize-autoloader --no-dev
```

---

## 8. Развертывание Frontend (Next.js)

### 8.1 Установка зависимостей

```bash
cd /var/www/admin/frontend-nextjs

# Установка зависимостей
npm ci --production=false

# Или если нет package-lock.json
npm install
```

### 8.2 Настройка переменных окружения

Создайте файл `.env.production` или `.env.local`:

```bash
nano /var/www/admin/frontend-nextjs/.env.production
```

Содержимое:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
# или
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

### 8.3 Сборка проекта

```bash
cd /var/www/admin/frontend-nextjs

# Сборка для продакшена
npm run build
```

### 8.4 Настройка прав доступа

```bash
sudo chown -R www-data:www-data /var/www/admin/frontend-nextjs
sudo chmod -R 755 /var/www/admin/frontend-nextjs
```

---

## 9. Настройка Nginx

### 9.1 Конфигурация для Backend (Laravel)

Создайте файл конфигурации:

```bash
sudo nano /etc/nginx/sites-available/admin-backend
```

Содержимое:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;  # или your-domain.com
    root /var/www/admin/backend-laravel/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Активация конфигурации:

```bash
sudo ln -s /etc/nginx/sites-available/admin-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9.2 Конфигурация для Frontend (Next.js)

Создайте файл конфигурации:

```bash
sudo nano /etc/nginx/sites-available/admin-frontend
```

Содержимое:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/admin/frontend-nextjs;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активация:

```bash
sudo ln -s /etc/nginx/sites-available/admin-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. Настройка процесса для Next.js (PM2)

### 10.1 Установка PM2

```bash
sudo npm install -g pm2
```

### 10.2 Создание конфигурации PM2

Создайте файл `ecosystem.config.js` в корне проекта:

```bash
nano /var/www/admin/ecosystem.config.js
```

Содержимое:

```javascript
module.exports = {
  apps: [{
    name: 'admin-frontend',
    cwd: '/var/www/admin/frontend-nextjs',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 10.3 Запуск приложения через PM2

```bash
cd /var/www/admin
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Последняя команда покажет команду для автозапуска при загрузке системы - выполните её.

---

## 11. Настройка SSL (Let's Encrypt)

### 11.1 Установка Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

### 11.2 Получение сертификата

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com
```

Certbot автоматически обновит конфигурацию Nginx и настроит автоматическое обновление сертификата.

---

## 12. Настройка файрвола

### 12.1 UFW (Ubuntu/Debian)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 12.2 firewalld (CentOS/RHEL)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

---

## 13. Настройка cron для Laravel

Laravel требует выполнения задач по расписанию. Добавьте в crontab:

```bash
sudo crontab -e -u www-data
```

Добавьте строку:

```
* * * * * cd /var/www/admin/backend-laravel && php artisan schedule:run >> /dev/null 2>&1
```

---

## 14. Мониторинг и логи

### 14.1 Логи Laravel

```bash
tail -f /var/www/admin/backend-laravel/storage/logs/laravel.log
```

### 14.2 Логи Nginx

```bash
# Доступ
sudo tail -f /var/log/nginx/access.log

# Ошибки
sudo tail -f /var/log/nginx/error.log
```

### 14.3 Логи PM2

```bash
pm2 logs admin-frontend
```

---

## 15. Обновление приложения

### 15.1 Обновление Backend

```bash
cd /var/www/admin/backend-laravel

# Получение обновлений (если используете Git)
git pull origin main

# Обновление зависимостей
composer install --optimize-autoloader --no-dev

# Запуск миграций
php artisan migrate --force

# Очистка и пересоздание кешей
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 15.2 Обновление Frontend

```bash
cd /var/www/admin/frontend-nextjs

# Получение обновлений
git pull origin main

# Обновление зависимостей
npm ci

# Пересборка
npm run build

# Перезапуск PM2
pm2 restart admin-frontend
```

---

## 16. Резервное копирование

### 16.1 Резервное копирование базы данных

Создайте скрипт `/usr/local/bin/backup-admin-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/admin"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Для MySQL
mysqldump -u admin_user -p'ваш_пароль' admin_db > $BACKUP_DIR/db_$DATE.sql

# Для PostgreSQL
# pg_dump -U admin_user admin_db > $BACKUP_DIR/db_$DATE.sql

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

Сделайте скрипт исполняемым и добавьте в cron:

```bash
sudo chmod +x /usr/local/bin/backup-admin-db.sh
sudo crontab -e
# Добавьте: 0 2 * * * /usr/local/bin/backup-admin-db.sh
```

---

## 17. Проверка работоспособности

### 17.1 Проверка Backend

```bash
curl https://api.your-domain.com/api/health
# или
curl https://your-domain.com/api/health
```

### 17.2 Проверка Frontend

Откройте в браузере: `https://your-domain.com`

### 17.3 Проверка процессов

```bash
# PHP-FPM
sudo systemctl status php8.2-fpm

# Nginx
sudo systemctl status nginx

# PM2
pm2 status

# MySQL/PostgreSQL
sudo systemctl status mysql
# или
sudo systemctl status postgresql
```

---

## 18. Устранение неполадок

### 18.1 Проблемы с правами доступа

```bash
sudo chown -R www-data:www-data /var/www/admin
sudo find /var/www/admin -type d -exec chmod 755 {} \;
sudo find /var/www/admin -type f -exec chmod 644 {} \;
sudo chmod -R 775 /var/www/admin/backend-laravel/storage
sudo chmod -R 775 /var/www/admin/backend-laravel/bootstrap/cache
```

### 18.2 Проблемы с базой данных

Проверьте подключение:

```bash
# MySQL
mysql -u admin_user -p admin_db

# PostgreSQL
psql -U admin_user -d admin_db
```

### 18.3 Очистка кешей Laravel

```bash
cd /var/www/admin/backend-laravel
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### 18.4 Проблемы с Next.js

```bash
# Перезапуск PM2
pm2 restart admin-frontend

# Просмотр логов
pm2 logs admin-frontend --lines 100
```

---

## 19. Безопасность

### 19.1 Рекомендации по безопасности

1. **Отключите APP_DEBUG в продакшене**: `APP_DEBUG=false`
2. **Используйте сильные пароли** для базы данных
3. **Настройте файрвол** (см. раздел 12)
4. **Используйте SSL** (см. раздел 11)
5. **Регулярно обновляйте систему** и зависимости
6. **Ограничьте доступ к .env файлам**:
   ```bash
   sudo chmod 600 /var/www/admin/backend-laravel/.env
   ```
7. **Настройте fail2ban** для защиты от брутфорса:
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

---

## 20. Оптимизация производительности

### 20.1 PHP-FPM оптимизация

Отредактируйте `/etc/php/8.2/fpm/pool.d/www.conf`:

```ini
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500
```

Перезапустите PHP-FPM:

```bash
sudo systemctl restart php8.2-fpm
```

### 20.2 Оптимизация MySQL

Настройте `/etc/mysql/mysql.conf.d/mysqld.cnf` (для небольших серверов):

```ini
innodb_buffer_pool_size = 256M
max_connections = 100
query_cache_size = 16M
```

---

## Контакты и поддержка

При возникновении проблем проверьте:
1. Логи приложений
2. Логи веб-сервера
3. Статус всех сервисов
4. Права доступа к файлам
5. Конфигурацию базы данных

---

**Примечание**: Эта инструкция предполагает базовые знания Linux и администрирования серверов. Для критически важных проектов рекомендуется обратиться к системному администратору или DevOps-инженеру.

