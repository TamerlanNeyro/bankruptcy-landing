// api/submit.js — приём заявки с формы, запись в Supabase (таблица applications)
//
// Кто отправил заявку, сервер узнаёт не из тела запроса (его легко подделать),
// а из initData — данных Telegram Mini App, подписанных HMAC на секрете бота.
// Подпись проверяется здесь же (verifyInitData). Без валидной подписи заявка
// не принимается.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const LAWYER_CHAT_ID = process.env.LAWYER_CHAT_ID;

const TIME_LABELS = { morning: 'утром', afternoon: 'днём', evening: 'вечером' };
const SOURCE_LABELS = { home: 'с главной', result: 'после квиза', service: 'с карточки услуги' };

async function notifyLawyer(row) {
  if (!LAWYER_CHAT_ID || !BOT_TOKEN) return;

  const text =
    `🆕 <b>Новая заявка</b>\n\n` +
    `Имя: ${row.name}\n` +
    `Телефон: <code>${row.phone}</code>\n` +
    `Связаться: ${TIME_LABELS[row.time] || row.time || 'не указано'}\n` +
    `Источник: ${SOURCE_LABELS[row.source] || row.source || 'неизвестно'}` +
    (row.username ? `\nTelegram: @${row.username}` : '');

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: LAWYER_CHAT_ID, parse_mode: 'HTML', text }),
    });
  } catch (e) {
    console.error('Lawyer notify failed:', e);
  }
}

const MAX_INIT_DATA_AGE_SEC = 24 * 60 * 60; // 24 часа

function verifyInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash.length !== hash.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash))) return null;

  const authDate = parseInt(params.get('auth_date') || '0', 10);
  if (!authDate || (Date.now() / 1000 - authDate) > MAX_INIT_DATA_AGE_SEC) return null;

  let user = null;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { user = null; }
  if (!user || !user.id) return null;

  return { user, authDate };
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end',  () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const body = await readBody(req);

  const verified = verifyInitData(body.initData, BOT_TOKEN);
  if (!verified) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const name  = (body.name  || '').trim();
  const phone = (body.phone || '').trim();

  if (!name || phone.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  const row = {
    name,
    phone,
    time:         body.time  || null,
    source:       body.source || null,
    quiz_answers: body.quizAnswers || null,
    user_id:      verified.user.id,
    username:     verified.user.username || null,
  };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:         SUPABASE_SECRET_KEY,
        Authorization:  `Bearer ${SUPABASE_SECRET_KEY}`,
        Prefer:         'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!r.ok) {
      console.error('Supabase insert failed:', r.status, await r.text());
      return res.status(502).json({ ok: false, error: 'db_error' });
    }

    // await — на Vercel serverless-функция завершается сразу после ответа,
    // fire-and-forget промис может не успеть выполниться до заморозки.
    await notifyLawyer(row);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Submit error:', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
};
