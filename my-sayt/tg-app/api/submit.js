// api/submit.js — приём заявки с формы, запись в Supabase (таблица applications)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

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

  const body  = await readBody(req);
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
    user_id:      body.userId  || null,
    username:     body.username || null,
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

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Submit error:', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
};
