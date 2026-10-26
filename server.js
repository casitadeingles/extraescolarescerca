// Servidor mínimo para Hostinger (Node.js): sirve la web generada en /dist
const http = require('http');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!path.extname(p) && !p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(dist, path.normalize(p));
  if (!file.startsWith(dist)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<h1>Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=300' });
    res.end(data);
  });
}).listen(process.env.PORT || 3000);
