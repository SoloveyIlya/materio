.PHONY: help up down build restart logs clean

help: ## Показать справку
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Запустить все сервисы
	docker compose up -d --build

down: ## Остановить все сервисы
	docker compose down

build: ## Пересобрать контейнеры
	docker compose build --no-cache

restart: ## Перезапустить все сервисы
	docker compose restart

logs: ## Показать логи всех сервисов
	docker compose logs -f

logs-backend: ## Показать логи backend
	docker compose logs -f backend

logs-frontend: ## Показать логи frontend
	docker compose logs -f frontend

logs-mysql: ## Показать логи MySQL
	docker compose logs -f mysql

ps: ## Показать статус контейнеров
	docker compose ps

shell-backend: ## Открыть shell в backend контейнере
	docker compose exec backend sh

shell-frontend: ## Открыть shell в frontend контейнере
	docker compose exec frontend sh

migrate: ## Выполнить миграции
	docker compose exec backend php artisan migrate

migrate-fresh: ## Пересоздать базу данных и выполнить миграции
	docker compose exec backend php artisan migrate:fresh

seed: ## Выполнить сидеры
	docker compose exec backend php artisan db:seed

artisan: ## Выполнить artisan команду (использование: make artisan CMD="route:list")
	docker compose exec backend php artisan $(CMD)

tinker: ## Открыть Laravel Tinker
	docker compose exec backend php artisan tinker

clean: ## Остановить и удалить все контейнеры, volumes и сети
	docker compose down -v
	docker system prune -f

install: ## Первоначальная установка (создать .env, сгенерировать ключ)
	@echo "Установка проекта..."
	docker compose up -d --build
	@echo "Ожидание запуска сервисов..."
	sleep 10
	docker compose exec backend php artisan key:generate --force || true
	docker compose exec backend php artisan migrate --force
	@echo "Установка завершена!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"

# Production commands
up-prod: ## Запустить все сервисы в production режиме
	@if [ ! -f .env.production ]; then \
		echo "Ошибка: файл .env.production не найден!"; \
		echo "Скопируйте env.production.example в .env.production и заполните значениями"; \
		exit 1; \
	fi
	docker compose -f docker compose.prod.yml --env-file .env.production up -d --build

down-prod: ## Остановить все сервисы production
	docker compose -f docker compose.prod.yml --env-file .env.production down

build-prod: ## Пересобрать контейнеры для production
	@if [ ! -f .env.production ]; then \
		echo "Ошибка: файл .env.production не найден!"; \
		echo "Скопируйте env.production.example в .env.production и заполните значениями"; \
		exit 1; \
	fi
	docker compose -f docker compose.prod.yml --env-file .env.production build --no-cache

restart-prod: ## Перезапустить все сервисы production
	docker compose -f docker compose.prod.yml --env-file .env.production restart

logs-prod: ## Показать логи всех сервисов production
	docker compose -f docker compose.prod.yml --env-file .env.production logs -f

logs-backend-prod: ## Показать логи backend production
	docker compose -f docker compose.prod.yml --env-file .env.production logs -f backend

logs-frontend-prod: ## Показать логи frontend production
	docker compose -f docker compose.prod.yml --env-file .env.production logs -f frontend

ps-prod: ## Показать статус контейнеров production
	docker compose -f docker compose.prod.yml --env-file .env.production ps

shell-backend-prod: ## Открыть shell в backend контейнере production
	docker compose -f docker compose.prod.yml --env-file .env.production exec backend sh

shell-frontend-prod: ## Открыть shell в frontend контейнере production
	docker compose -f docker compose.prod.yml --env-file .env.production exec frontend sh

migrate-prod: ## Выполнить миграции в production
	docker compose -f docker compose.prod.yml --env-file .env.production exec backend php artisan migrate --force

artisan-prod: ## Выполнить artisan команду в production (использование: make artisan-prod CMD="route:list")
	docker compose -f docker compose.prod.yml --env-file .env.production exec backend php artisan $(CMD)

optimize-prod: ## Оптимизировать Laravel для production
	docker compose -f docker compose.prod.yml --env-file .env.production exec backend php artisan config:cache
	docker compose -f docker compose.prod.yml --env-file .env.production exec backend php artisan route:cache
	docker compose -f docker compose.prod.yml --env-file .env.production exec backend php artisan view:cache

install-prod: ## Первоначальная установка для production
	@if [ ! -f .env.production ]; then \
		echo "Ошибка: файл .env.production не найден!"; \
		echo "Скопируйте env.production.example в .env.production и заполните значениями"; \
		exit 1; \
	fi
	@echo "Установка проекта для production..."
	docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
	@echo "Ожидание запуска сервисов..."
	sleep 15
	docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan key:generate --force || true
	docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan migrate --force
	docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan config:cache
	docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan route:cache
	docker compose -f docker-compose.prod.yml --env-file .env.production exec backend php artisan view:cache
	@echo "Установка для production завершена!"

clean-prod: ## Остановить и удалить все контейнеры, volumes и сети production
	docker compose -f docker compose.prod.yml --env-file .env.production down -v

