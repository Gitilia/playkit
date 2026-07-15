#!/usr/bin/env node
/**
 * Tiny fake app for playkit CI self-tests.
 * Endpoints: GET /, GET /form, GET /api/health, GET /api/items, GET /api/boom (500)
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PLAYKIT_SELFTEST_PORT || 4173);
const HOST = process.env.PLAYKIT_SELFTEST_HOST || '127.0.0.1';

const HOME = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Playkit selftest</title></head>
<body>
  <h1>Playkit selftest home</h1>
  <p><a href="/form">Open form</a></p>
  <button id="load-items" type="button">Load items</button>
  <ul id="items"></ul>
  <script>
    document.getElementById('load-items').addEventListener('click', async () => {
      const res = await fetch('/api/items');
      const data = await res.json();
      const ul = document.getElementById('items');
      ul.innerHTML = '';
      for (const item of data.items) {
        const li = document.createElement('li');
        li.textContent = item.name;
        ul.appendChild(li);
      }
    });
  </script>
</body>
</html>`;

const FORM = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Form — Playkit selftest</title></head>
<body>
  <h1>Demo form</h1>
  <label>Name <input id="name" name="name" /></label>
  <button id="submit" type="button">Submit</button>
  <p id="greeting" hidden></p>
  <script>
    document.getElementById('submit').addEventListener('click', () => {
      const name = document.getElementById('name').value;
      const g = document.getElementById('greeting');
      g.hidden = false;
      g.textContent = 'Hello, ' + name;
    });
  </script>
</body>
</html>`;

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function html(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && u.pathname === '/') return html(res, 200, HOME);
  if (req.method === 'GET' && u.pathname === '/form') return html(res, 200, FORM);
  if (req.method === 'GET' && u.pathname === '/api/health') {
    return json(res, 200, { status: 'ok', service: 'playkit-selftest' });
  }
  if (req.method === 'GET' && u.pathname === '/api/items') {
    return json(res, 200, { items: [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }] });
  }
  if (req.method === 'GET' && u.pathname === '/api/boom') {
    return json(res, 500, { error: 'intentional' });
  }
  json(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`playkit selftest listening on http://${HOST}:${PORT}`);
});
