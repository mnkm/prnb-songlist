// index.html が読み込むライブラリを、node_modules から vendor/ へコピーする。
// vendor/ はコミットしない。手元では npm install のあとに、公開時は Cloudflare Pages のビルドで実行される。
import { cpSync, rmSync } from 'node:fs';

// [コピー元（node_modules からの相対パス）, コピー先（vendor からの相対パス）]
// Bootstrap の CSS は ../fonts/ を相対パスで参照するので、ディレクトリの並びを保ってコピーする。
const TARGETS = [
  ['jquery/dist/jquery.min.js', 'jquery/jquery.min.js'],
  ['bootstrap/dist/css/bootstrap.min.css', 'bootstrap/css/bootstrap.min.css'],
  ['bootstrap/dist/js/bootstrap.min.js', 'bootstrap/js/bootstrap.min.js'],
  ['bootstrap/dist/fonts', 'bootstrap/fonts'],
  ['datatables.net/js/jquery.dataTables.min.js', 'datatables.net/js/jquery.dataTables.min.js'],
  ['datatables.net-dt/css/jquery.dataTables.min.css', 'datatables.net-dt/css/jquery.dataTables.min.css'],
];

const root = new URL('../', import.meta.url);

rmSync(new URL('vendor/', root), { recursive: true, force: true });
for (const [from, to] of TARGETS) {
  cpSync(new URL(`node_modules/${from}`, root), new URL(`vendor/${to}`, root), { recursive: true });
}
console.log(`vendor/ に ${TARGETS.length} 件をコピーしました。`);
