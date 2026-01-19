#!/bin/bash
set -e

echo "Waiting for MySQL to be healthy..."
sleep 10

echo "Running database migrations..."
php artisan migrate --force

echo "Seeding database..."
php artisan db:seed --force

echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Database initialization completed!"
