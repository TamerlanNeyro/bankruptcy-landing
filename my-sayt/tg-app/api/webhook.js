// api/webhook.js — Telegram Bot webhook
// Ответ через тело response (reply-via-response) — надёжнее исходящих запросов

const APP_URL = 'https://tg-app-six-wine.vercel.app';

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end',  () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const update  = await readBody(req);
  const message = update?.message;
  if (!message) return res.status(200).json({ ok: true });

  const { text, chat, from } = message;
  const name = from?.first_name ? `, ${from.first_name}` : '';

  if (text && (text === '/start' || text.startsWith('/start '))) {
    return res.status(200).json({
      method:     'sendMessage',
      chat_id:    chat.id,
      parse_mode: 'HTML',
      text:
        `Здравствуйте${name}! 👋\n\n` +
        `Меня зовут <b>Гучигов Тимерлан Хасанович</b> — адвокат по банкротству физических лиц.\n\n` +
        `Нажмите кнопку ниже 👇`,
      // Постоянная клавиатура — всегда видна внизу чата
      reply_markup: {
        keyboard: [
          [{ text: '🚀 Открыть приложение',         web_app: { url: APP_URL } }],
          [{ text: '📋 Записаться на консультацию', web_app: { url: APP_URL } }],
        ],
        resize_keyboard:  true,
        persistent:       true,
      },
    });
  }

  if (text === '/help') {
    return res.status(200).json({
      method:     'sendMessage',
      chat_id:    chat.id,
      parse_mode: 'HTML',
      text:
        `👨‍⚖️ <b>Гучигов Тимерлан Хасанович</b>\n` +
        `Адвокат по банкротству физических лиц\n\n` +
        `Консультация бесплатная и ни к чему не обязывает.\n` +
        `Нажмите кнопку ниже 👇`,
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Открыть приложение', web_app: { url: APP_URL } },
        ]],
      },
    });
  }

  return res.status(200).json({ ok: true });
};
