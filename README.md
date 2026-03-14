# Messenger Backend

Backend API и realtime сервер для веб-мессенджера. Построен на NestJS, PostgreSQL, Prisma и Socket.io.

## Возможности

- Регистрация и авторизация (JWT)
- Личные чаты между пользователями
- Текстовые сообщения, изображения, видео, стикеры
- Realtime доставка сообщений через WebSocket
- Онлайн-статусы пользователей
- Индикатор набора текста
- Список чатов с последним сообщением и счётчиком непрочитанных
- Поиск пользователей по email
- Поддержка медиафайлов через Cloudinary

## Требования

- Node.js 18+
- PostgreSQL 14+

## Установка

```bash
npm install
```

## Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните значения:

```bash
cp .env.example .env
```

Обязательные переменные:

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `JWT_SECRET` | Секретный ключ для JWT токенов |
| `PORT` | Порт сервера (по умолчанию 3000) |
| `CORS_ORIGIN` | Разрешённый origin для CORS |

## Миграция базы данных

```bash
npx prisma migrate dev --name init
```

Для продакшена:

```bash
npx prisma migrate deploy
```

## Запуск

```bash
# Разработка
npm run start:dev

# Продакшен
npm run build
npm run start:prod
```

## REST API

Все endpoints кроме auth защищены JWT. Передавайте токен в заголовке: `Authorization: Bearer <token>`.

Базовый префикс: `/api`

### Auth

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/register` | Регистрация `{ email, password }` |
| POST | `/api/auth/login` | Вход `{ email, password }` |

### Users

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/users` | Список пользователей |
| GET | `/api/users/search?q=query` | Поиск по email |

### Chats

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/chats` | Создать чат `{ participantId }` |
| GET | `/api/chats` | Список чатов с последним сообщением |
| GET | `/api/chats/:id` | Информация о чате |

### Messages

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/messages` | Отправить сообщение `{ chatId, type, text?, mediaUrl? }` |
| GET | `/api/messages/:chatId` | История сообщений (`?cursor=id&limit=50`) |
| PATCH | `/api/messages/:chatId/read` | Отметить сообщения как прочитанные |

Типы сообщений: `TEXT`, `IMAGE`, `VIDEO`, `STICKER`

## WebSocket события

Подключение: `io(SERVER_URL, { auth: { token: 'jwt-token' } })`

### Клиент → Сервер

| Событие | Данные | Описание |
|---|---|---|
| `chat:join` | `{ chatId }` | Присоединиться к комнате чата |
| `chat:leave` | `{ chatId }` | Покинуть комнату чата |
| `message:send` | `{ chatId, type, text?, mediaUrl? }` | Отправить сообщение |
| `message:typing` | `{ chatId }` | Пользователь печатает |
| `message:stopTyping` | `{ chatId }` | Пользователь перестал печатать |

### Сервер → Клиент

| Событие | Данные | Описание |
|---|---|---|
| `message:new` | Message object | Новое сообщение в комнате |
| `chat:updated` | `{ chatId, lastMessage }` | Обновление чата (для списка) |
| `message:typing` | `{ chatId, userId, email }` | Собеседник печатает |
| `message:stopTyping` | `{ chatId, userId }` | Собеседник перестал печатать |
| `user:online` | `{ userId }` | Пользователь вошёл в сеть |
| `user:offline` | `{ userId }` | Пользователь вышел из сети |
| `users:online` | `string[]` | Список онлайн пользователей (при подключении) |
| `chat:joined` | `{ chatId }` | Подтверждение входа в комнату |

## Деплой на Railway

1. Создайте проект на Railway
2. Добавьте PostgreSQL сервис
3. Задайте переменные окружения (`DATABASE_URL`, `JWT_SECRET`, `PORT`)
4. Railway автоматически определит `npm run build` и `npm run start:prod`
