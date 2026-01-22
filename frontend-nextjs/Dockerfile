FROM node:20-alpine
WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --ignore-scripts

# Копируем исходный код
COPY . .

# Собираем иконки
RUN npm run build:icons

# Устанавливаем переменные окружения для development
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true

EXPOSE 3000

# Запускаем dev сервер
CMD ["npm", "run", "dev"]
