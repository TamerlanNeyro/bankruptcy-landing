# DEPLOYMENT.md — Деплой проекта

Telegram Mini App для адвоката (банкротство физических лиц).  
Хостинг: **Vercel** (бесплатный план). Бот: **@Spisanie_cred_bot**.

---

## Что нужно перед началом

- Аккаунт [Vercel](https://vercel.com) (бесплатный, войти через GitHub)
- Аккаунт GitHub (репозиторий уже есть: `TamerlanNeyro/bankruptcy-landing`)
- Аккаунт Telegram (для создания/управления ботом)
- Node.js 18+ (проверить: `node -v`)
- Vercel CLI: `npm install -g vercel`

---

## Структура деплоя

```
GitHub репозиторий
    ↓ автодеплой (или vercel --prod)
Vercel (два компонента):
  ├── Статика: index.html, app.js, app.css, data.js, lawyer.jpg
  └── Serverless function: api/webhook.js  →  /api/webhook

Telegram Bot (@Spisanie_cred_bot)
    ↓ webhook
https://tg-app-six-wine.vercel.app/api/webhook
```

---

## Шаг 1. Клонировать репозиторий

```bash
git clone https://github.com/TamerlanNeyro/bankruptcy-landing.git
cd bankruptcy-landing/my-sayt/tg-app
```

---

## Шаг 2. Получить BOT_TOKEN

Если бот уже создан — токен берётся из `.env` (у владельца) или у BotFather:

1. Открыть Telegram → найти `@BotFather`
2. Написать `/mybots` → выбрать `@Spisanie_cred_bot`
3. `API Token` → скопировать строку вида `8946202593:AAG...`

Если создаёте нового бота:
```
/newbot
Название: любое
Username: заканчивается на _bot
→ BotFather выдаст токен
```

---

## Шаг 3. Создать файл .env

В папке `tg-app/` создайте файл `.env`:

```
BOT_TOKEN=<ваш_токен_из_BotFather>
```

**Не коммитить в git** — файл уже в `.gitignore`.

---

## Шаг 4. Войти в Vercel CLI

```bash
vercel login
```

Откроется браузер → войти через GitHub → нажать «Continue».

---

## Шаг 5. Привязать проект Vercel

В папке `tg-app/`:

```bash
vercel link
```

Vercel спросит:
- `Set up "tg-app"?` → **Y**
- `Which scope?` → выбрать свой аккаунт
- `Link to existing project?` → **Y** (если уже был деплой) / **N** (первый раз)
- Если N → `What's your project name?` → `tg-app`

После привязки появится файл `.vercel/project.json`.

---

## Шаг 6. Добавить BOT_TOKEN в Vercel

```bash
vercel env add BOT_TOKEN production
```

Vercel спросит значение → вставить токен → Enter.

Проверить что добавилось:
```bash
vercel env ls
```

---

## Шаг 7. Обновить APP_URL в коде (только при первом деплое)

Файл `api/webhook.js`, строка 4:

```js
const APP_URL = 'https://tg-app-six-wine.vercel.app';
```

Замените на URL вашего Vercel-проекта. Если URL ещё не известен — сначала сделайте тестовый деплой, узнайте URL, затем обновите и задеплойте снова.

---

## Шаг 8. Задеплоить

```bash
vercel --prod --yes
```

После успешного деплоя в консоли появится:
```
✅  Production: https://tg-app-six-wine.vercel.app [3s]
```

Это и есть рабочий URL приложения.

---

## Шаг 9. Зарегистрировать webhook в Telegram

Telegram должен знать, куда слать сообщения от бота. Выполнить один раз:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tg-app-six-wine.vercel.app/api/webhook"}'
```

Замените `<BOT_TOKEN>` на реальный токен.

Ожидаемый ответ:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

Проверить что webhook установлен:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

В ответе должно быть: `"url": "https://tg-app-six-wine.vercel.app/api/webhook"`

---

## Шаг 10. Подключить Mini App в BotFather (один раз)

1. `@BotFather` → `/mybots` → `@Spisanie_cred_bot`
2. `Bot Settings` → `Menu Button` → `Configure menu button`
3. Ввести URL: `https://tg-app-six-wine.vercel.app`
4. Ввести название кнопки: `Открыть приложение`

Теперь в чате с ботом появится кнопка «Открыть приложение» рядом со скрепкой.

---

## Шаг 11. Проверить деплой

**Проверка сайта:**  
Открыть в браузере → `https://tg-app-six-wine.vercel.app`  
Должен загрузиться сплэш-экран, затем Welcome.

**Проверка бота:**  
Открыть Telegram → `@Spisanie_cred_bot` → написать `/start`  
Бот должен ответить приветствием и показать кнопки.

**Проверка webhook напрямую:**
```bash
curl -X POST "https://tg-app-six-wine.vercel.app/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{"message":{"text":"/start","chat":{"id":123},"from":{"first_name":"Тест"}}}'
```
Ожидается: JSON с `"method": "sendMessage"`.

---

## Обновление (повторный деплой)

После любых изменений в коде:

```bash
# Из папки tg-app/
vercel --prod --yes
```

Vercel деплоит за ~10 секунд. Webhook перерегистрировать не нужно — URL не меняется.

---

## Автодеплой через GitHub (опционально)

1. Открыть [vercel.com/dashboard](https://vercel.com/dashboard) → проект `tg-app`
2. `Settings` → `Git` → подключить репозиторий `TamerlanNeyro/bankruptcy-landing`
3. `Root Directory` → указать `my-sayt/tg-app`
4. Теперь каждый `git push` в ветку `master` = автодеплой

---

## Переменные окружения

| Переменная | Где взять | Где добавить |
|---|---|---|
| `BOT_TOKEN` | @BotFather → `/mybots` → API Token | Vercel Dashboard → Settings → Environment Variables → Production |

Файл `.env` используется только локально. В Vercel переменные добавляются через CLI (`vercel env add`) или через Dashboard.

---

## Что не нужно делать

- **npm install** — зависимостей нет, сборки нет
- **vercel.json** — Vercel автоматически определяет: `api/*.js` → serverless, остальное → статика
- **package.json** — не нужен для этого проекта

---

## Возможные проблемы

| Проблема | Причина | Решение |
|---|---|---|
| Бот не отвечает на `/start` | Webhook не установлен | Выполнить шаг 9 |
| Кнопки в боте не открывают приложение | `APP_URL` в `webhook.js` неверный | Обновить строку 4, задеплоить |
| Форма заявок не отправляется | `webhookUrl` пуст в `data.js` | Заполнить `contact.webhookUrl` |
| 404 на `/api/webhook` | Деплой не прошёл или путь неверный | Проверить `vercel logs` |
| Ошибка `BOT_TOKEN is not defined` | Переменная не добавлена в Vercel | Выполнить шаг 6 |
