// api/webhook.js — Telegram Bot webhook (Vercel Serverless Function)
// Отвечает на /start и /help командой с кнопкой открытия Mini App

const BOT_TOKEN = process.env.BOT_TOKEN;
const API       = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL   = 'https://tg-app-six-wine.vercel.app';

async function send(chatId, text, replyMarkup) {
  await fetch(`${API}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:      chatId,
      text,
      parse_mode:   'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

const openAppButton = {
  inline_keyboard: [[
    { text: '🚀 Открыть приложение', web_app: { url: APP_URL } },
  ]],
};

const consultButton = {
  inline_keyboard: [[
    { text: '📋 Записаться на консультацию', web_app: { url: APP_URL } },
  ]],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const update = req.body || {};
  const message = update.message;
  if (!message) return res.status(200).json({ ok: true });

  const { text, chat, from } = message;
  const name = from?.first_name ? `, ${from.first_name}` : '';

  if (text === '/start' || text?.startsWith('/start ')) {
    await send(chat.id,
      `Здравствуйте${name}! 👋\n\n` +
      `Меня зовут <b>Гучигов Тимерлан Хасанович</b> — адвокат по банкротству физических лиц.\n\n` +
      `Помогу законно списать долги. Вот что вы можете сделать прямо сейчас:\n\n` +
      `📋 Пройти диагностику — 5 вопросов, честный результат\n` +
      `⚖️ Узнать об услугах и стоимости\n` +
      `💬 Записаться на бесплатную консультацию\n\n` +
      `Нажмите кнопку ниже 👇`,
      openAppButton,
    );
  } else if (text === '/help') {
    await send(chat.id,
      `👨‍⚖️ <b>Гучигов Тимерлан Хасанович</b>\n` +
      `Адвокат по банкротству физических лиц\n\n` +
      `Консультация бесплатная и ни к чему не обязывает.\n` +
      `Нажмите кнопку ниже — запишитесь за 2 минуты 👇`,
      consultButton,
    );
  }

  return res.status(200).json({ ok: true });
}
