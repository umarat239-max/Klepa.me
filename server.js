const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('/healthz', (_, res) => res.send('ok'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 4096 });

const AGES = ['a1', 'a2', 'a3', 'a4', 'a5'];
const GENS = ['m', 'f'];
const queue = new Set();

const send = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
const ok = (a, b) => a.u.p.wa.includes(b.u.p.age) && a.u.p.wg.includes(b.u.p.gender);

function clean(m) {
  const wa = Array.isArray(m.wa) ? [...new Set(m.wa.filter(x => AGES.includes(x)))] : [];
  const wg = Array.isArray(m.wg) ? [...new Set(m.wg.filter(x => GENS.includes(x)))] : [];
  if (!AGES.includes(m.age) || !GENS.includes(m.gender) || !wa.length || !wg.length) return null;
  return { age: m.age, gender: m.gender, wa, wg };
}

let timer = 0;
function broadcast() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = 0;
    let chatting = 0;
    for (const c of wss.clients) if (c.u && c.u.peer) chatting++;
    const s = JSON.stringify({ t: 'stats', online: wss.clients.size, chatting });
    for (const c of wss.clients) if (c.readyState === 1) c.send(s);
  }, 400);
}

function leave(ws) {
  queue.delete(ws);
  const p = ws.u.peer;
  if (p) { ws.u.peer = null; p.u.peer = null; send(p, { t: 'ended' }); }
}

function find(ws) {
  queue.delete(ws);
  for (const o of queue) {
    if (ok(ws, o) && ok(o, ws)) {
      queue.delete(o);
      ws.u.peer = o; o.u.peer = ws;
      send(ws, { t: 'matched', peer: { age: o.u.p.age, gender: o.u.p.gender } });
      send(o, { t: 'matched', peer: { age: ws.u.p.age, gender: ws.u.p.gender } });
      return;
    }
  }
  queue.add(ws);
  send(ws, { t: 'searching' });
}

wss.on('connection', ws => {
  ws.u = { p: null, peer: null, seen: new Set(), hits: [] };
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  broadcast();

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const u = ws.u;
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'search': {
        const p = clean(m); if (!p) return;
        leave(ws); u.p = p; find(ws); broadcast(); break;
      }
      case 'cancel': queue.delete(ws); break;
      case 'end': leave(ws); send(ws, { t: 'ended', self: true }); broadcast(); break;
      case 'typing': if (u.peer) send(u.peer, { t: 'typing' }); break;
      case 'msg': {
        if (!u.peer || typeof m.text !== 'string' || typeof m.id !== 'string' || m.id.length > 40) return;
        if (u.seen.has(m.id)) { send(ws, { t: 'ack', id: m.id }); return; }
        const now = Date.now();
        u.hits = u.hits.filter(h => now - h < 10000);
        if (u.hits.length >= 20) return;
        const text = m.text.trim().slice(0, 1000);
        if (!text) return;
        u.hits.push(now);
        u.seen.add(m.id);
        if (u.seen.size > 200) u.seen.delete(u.seen.values().next().value);
        send(u.peer, { t: 'msg', id: m.id, text, ts: now });
        send(ws, { t: 'ack', id: m.id });
        break;
      }
    }
  });

  ws.on('close', () => { leave(ws); broadcast(); });
  ws.on('error', () => {});
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Klepa.me on :' + PORT));
