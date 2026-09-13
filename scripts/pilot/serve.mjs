import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.local/content-pilot');
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const file = pathname === '/' ? 'preview.html' : pathname.slice(1);
    if (req.method !== 'GET' || !/^(preview\.html|assets\/[a-f0-9]{64}\.png|katex\/katex\.min\.css|katex\/fonts\/[a-zA-Z0-9_.-]+\.(woff2?|ttf))$/.test(file)) { res.writeHead(404).end(); return; }
    const resolved = await fs.realpath(path.join(root, file));
    const relative = path.relative(await fs.realpath(root), resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(404).end(); return; }
    const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(await fs.readFile(resolved));
  } catch { res.writeHead(404).end(); }
});
server.listen(3101, '127.0.0.1', () => console.log('Pilot preview: http://127.0.0.1:3101'));
