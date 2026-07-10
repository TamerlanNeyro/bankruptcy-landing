// server.js — точка входа для VPS (Vercel этот файл не использует).
// Zero-dependency HTTP-сервер: раздаёт статику Mini App и переиспользует
// api/webhook.js (тот же файл, что и в serverless-деплое на Vercel).

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = process.env[m[1].trim()] || m[2].trim();
  }
}

const webhookHandler = require('./api/webhook.js');

const PORT = process.env.PORT || 3000;

const PUBLIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/app.js': 'app.js',
  '/app.css': 'app.css',
  '/data.js': 'data.js',
  '/lawyer.jpg': 'lawyer.jpg',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function wrapRes(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/webhook') {
    wrapRes(res);
    try {
      await webhookHandler(req, res);
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false });
    }
    return;
  }

  const relFile = PUBLIC_FILES[urlPath];
  if (!relFile) {
    res.statusCode = 404;
    return res.end('Not found');
  }

  fs.readFile(path.join(ROOT, relFile), (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', MIME[path.extname(relFile)] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`tg-app server listening on 127.0.0.1:${PORT}`);
});
