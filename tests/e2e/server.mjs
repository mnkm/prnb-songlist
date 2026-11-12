// テスト用に、リポジトリのファイルをそのまま配信する小さなサーバー(npx serve の代わり)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PORT = Number(process.env.SONGLIST_TEST_PORT || 4173);
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
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (error) {
        res.writeHead(400);
        res.end('bad request');
        return;
    }
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
// 同じネットワークのほかの機器からは開けないよう、この PC の中だけで待ち受ける
}).listen(PORT, '127.0.0.1', () => {
    console.log(`http://127.0.0.1:${PORT}/`);
});
