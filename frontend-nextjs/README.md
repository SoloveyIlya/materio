# Admin Frontend - Next.js

Frontend приложение для админ-панели на Next.js 14 с TypeScript и Tailwind CSS.

## Требования

- Node.js >= 18
- npm или yarn

## Установка

1. Установите зависимости:
```bash
npm install
# или
yarn install
```

2. Создайте файл `.env.local` (опционально):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Запустите сервер разработки:
```bash
npm run dev
# или
yarn dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

## Структура проекта

```
frontend-nextjs/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/
│   └── globals.css
├── components/
│   ├── LoginForm.tsx
│   └── Dashboard.tsx
├── store/
│   └── authStore.ts
└── public/
```

## Функциональность

- Аутентификация (логин/регистрация)
- Управление состоянием через Zustand
- Защищенные маршруты
- Интеграция с Laravel API

