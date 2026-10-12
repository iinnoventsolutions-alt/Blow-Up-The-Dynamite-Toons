const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.issb': 'application/json' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
    const data = await fs.readFile(file); response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data);
  } catch { response.writeHead(404); response.end('File not found'); }
});
server.on('error', (error) => { console.error(`Preview could not start: ${error.message}. Close the previous preview and try again.`); process.exitCode = 1; });
server.listen(4317, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}`;
  console.log(`Innovent Professional Storyboard preview: ${url}\nLeave this terminal open. Press Ctrl+C to stop.`);
  if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore' });
});
