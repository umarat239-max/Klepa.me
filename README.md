# Klepa.me

Анонимный чат: выбираешь свой возраст и пол, кого ищешь, и попадаешь на подходящего собеседника. Без регистрации. Только текст и эмодзи. Дизайн в стиле жидкого стекла.

Telegram: https://t.me/klepa_me_official

## Запуск локально
```
npm install
npm start
```
Открыть http://localhost:3000

## GitHub
```
git init
git add .
git commit -m "Klepa.me"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/klepa-me.git
git push -u origin main
```

## Хостинг (Render)
1. render.com → New → Web Service → выбрать репозиторий (или Blueprint, файл `render.yaml` уже есть).
2. Build: `npm install`, Start: `npm start`.
3. После деплоя сайт открывается по ссылке Render. Свой домен подключается в Settings → Custom Domains.

WebSocket работает на том же порту, ничего дополнительно настраивать не нужно. На любом хостинге с Node.js 18+ запуск тот же: `npm install && npm start`.

## Как устроено
- `server.js`: подбор собеседников по возрасту и полу (взаимный), защита от повторных сообщений (id), лимит частоты, реальный счётчик онлайна.
- `public/index.html`: весь интерфейс. История чатов хранится только на устройстве (localStorage).
