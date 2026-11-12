// テスト用に、リポジトリのファイルをそのまま配信する小さなサーバー(npx serve の代わり)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(ROOT, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    // リポジトリの外のファイルは返さない
    if (!file.startsWith(ROOT.replace(/[\\/]$/, '') + sep)) {
        res.writeHead(404);
        res.end('not found');
        return;
    }
    try {
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
        res.end(body);
    } catch (error) {
        res.writeHead(404);
        res.end('not found');
    }
}).listen(PORT, () => {
    console.log(`http://localhost:${PORT}/`);
});
