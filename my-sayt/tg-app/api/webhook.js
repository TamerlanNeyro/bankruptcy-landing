// api/webhook.js — Telegram Bot webhook

const https = require('https');

const APP_URL = 'https://tg-app-six-wine.vercel.app';

function tgRequest(token, method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path:     `/bot${token}/${method}`,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end',  () => resolve(raw));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Читаем тело запроса вручную — гарантированно работает на всех версиях Vercel
function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body); // уже распарсен Vercel
    }
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end',  () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const token = process.env.BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'no token' });

  const update  = await readBody(req);
  const message = update?.message;
  if (!message) return res.status(200).json({ ok: true });

  const { text, chat, from } = message;
  const name = from?.first_name ? `, ${from.first_name}` : '';

  if (text && (text === '/start' || text.startsWith('/start '))) {
    await tgRequest(token, 'sendMessage', {
      chat_id:    chat.id,
      parse_mode: 'HTML',
      text:
        `Здравствуйте${name}! 👋\n\n` +
        `Меня зовут <b>Гучигов Тимерлан Хасанович</b> — адвокат по банкротству физических лиц.\n\n` +
        `Здесь вы можете:\n` +
        `📋 Пройти диагностику — 5 вопросов, честный результат\n` +
        `⚖️ Узнать об услугах и стоимости\n` +
        `💬 Записаться на бесплатную консультацию\n\n` +
        `Нажмите кнопку ниже 👇`,
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Открыть приложение', web_app: { url: APP_URL } },
        ]],
      },
    });

  } else if (text === '/help') {
    await tgRequest(token, 'sendMessage', {
      chat_id:    chat.id,
      parse_mode: 'HTML',
      text:
        `👨‍⚖️ <b>Гучигов Тимерлан Хасанович</b>\n` +
        `Адвокат по банкротству физических лиц\n\n` +
        `Консультация бесплатная и ни к чему не обязывает.\n` +
        `Нажмите кнопку ниже 👇`,
      reply_markup: {
        inline_keyboard: [[
          { text: '📋 Записаться на консультацию', web_app: { url: APP_URL } },
        ]],
      },
    });
  }

  return res.status(200).json({ ok: true });
};
