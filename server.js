/**
 * Раздаёт чат. WebSocket (localhost) + HTTP poll (туннель).
 */

process.on('uncaughtException', (err) => { console.error('Ошибка:', err.message); });
process.on('unhandledRejection', () => {});

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const PORT = 38472;

// Буфер сообщений (режим туннеля, short poll — туннель рвёт long-poll по 504)
const messages = [];
const onlineUsers = {};
const PRESENCE_TTL = 60000;

const server = http.createServer((req, res) => {
  req.on('error', () => {});
  res.on('error', () => {});

  try {
    if (req.method === 'POST' && req.url === '/msg') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        if (body) messages.push(body);
        res.writeHead(200);
        res.end('ok');
      });
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/poll')) {
      const last = Math.max(0, parseInt((req.url.split('last=')[1] || '0').split('&')[0], 10) || 0);
      const newMsgs = messages.slice(last);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ messages: newMsgs, next: messages.length }));
      return;
    }

    if (req.method === 'POST' && req.url === '/presence') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (j.name) {
            onlineUsers[j.name] = Date.now();
          }
        } catch (e) {}
        res.writeHead(200);
        res.end('ok');
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/presence') {
      const now = Date.now();
      for (const name in onlineUsers) {
        if (now - onlineUsers[name] > PRESENCE_TTL) delete onlineUsers[name];
      }
      const list = Object.keys(onlineUsers);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ users: list }));
      return;
    }

    const file = req.url === '/' ? '/chat2.html' : req.url.split('?')[0];
    const fp = path.join(__dirname, file);
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } catch (e) {
    res.writeHead(500);
    res.end();
  }
});

const wss = new WebSocketServer({ server });
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('message', (data) => {
    clients.forEach((c) => { if (c !== ws && c.readyState === 1) c.send(data); });
  });
  ws.on('close', () => clients.delete(ws));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\nПорт 38472 занят. Закрой другое окно с чатом и попробуй снова.\n');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => console.log('Чат: http://localhost:' + PORT));
