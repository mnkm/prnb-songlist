// GAS(gas/コード.js)のテスト。GAS のサービス(CacheService など)は、テストの中で用意した偽物に差し替える
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SOURCE = readFileSync(new URL('../../gas/コード.js', import.meta.url), 'utf8');

// メモリに値を持つだけの CacheService の代わり
function createCache(initial = {}) {
    const store = { ...initial };
    return {
        store,
        get: key => (key in store ? store[key] : null),
        getAll: keys => Object.fromEntries(keys.filter(k => k in store).map(k => [k, store[k]])),
        putAll: entries => Object.assign(store, entries)
    };
}

// 1 行目が見出しの表を返す、スプレッドシートの代わり
function createSpreadsheetApp(tables, opened) {
    return {
        openById: id => {
            opened.push(id);
            if (!(id in tables)) {
                throw new Error(`unknown spreadsheet: ${id}`);
            }
            const values = tables[id];
            return {
                getSheetByName: () => ({
                    getLastRow: () => values.length,
                    getLastColumn: () => values[0].length,
                    getRange: () => ({ getValues: () => values.map(row => [...row]) })
                })
            };
        }
    };
}

// gas/コード.js を読み込み、関数と、使われたサービスの記録を返す
function loadGas({ tables = {}, cache = createCache() } = {}) {
    const opened = [];
    const logs = [];
    const context = {
        CacheService: { getScriptCache: () => cache },
        SpreadsheetApp: createSpreadsheetApp(tables, opened),
        ContentService: {
            MimeType: { JSON: 'application/json' },
            createTextOutput: text => ({
                text,
                setMimeType(type) {
                    this.mimeType = type;
                    return this;
                }
            })
        },
        console: { error: msg => logs.push(msg), warn: msg => logs.push(msg) }
    };
    vm.createContext(context);
    vm.runInContext(SOURCE, context);
    // const の値はコンテキストのプロパティにならないので、式として読む
    const chunkChars = vm.runInContext('CACHE_CHUNK_CHARS', context);
    return { gas: context, cache, opened, logs, chunkChars };
}

// 桃瀬になのスプレッドシート(gas/コード.js の talentMap)
const NINA_SHEET = '10sodqHlGwp_ROuf5afdSPMvbDQmulFOw-K_hDK3WhiQ';

function parse(response) {
    assert.equal(response.mimeType, 'application/json');
    return JSON.parse(response.text);
}

test('見出しの名前で列を対応づけ、使わない列と曲名が空の行を除く', () => {
    const { gas } = loadGas({
        tables: {
            [NINA_SHEET]: [
                ['よみ', '楽曲', 'アーティスト', 'カテゴリ', 'ジャンル', '種類', '最終歌唱日'],
                ['あおいそら', '青い空', 'アーティストA', 'J-POP', 'バラード', '', '2026/01/01'],
                ['', '', 'アーティストB', 'J-POP', '', '', ''],
                ['いちきゅうにご', 1925, 'アーティストC', 'ボカロ', '', '弾き語り', '']
            ]
        }
    });

    const body = parse(gas.doGet({ parameter: { talent: 'nina' } }));

    assert.deepEqual(body, {
        rows: [
            { reading: 'あおいそら', title: '青い空', artist: 'アーティストA', category: 'J-POP', genre: 'バラード', type: '' },
            { reading: 'いちきゅうにご', title: 1925, artist: 'アーティストC', category: 'ボカロ', genre: '', type: '弾き語り' }
        ]
    });
});

test('talent がなければ桃瀬になのデータを返す', () => {
    const { gas, opened } = loadGas({ tables: { [NINA_SHEET]: [['楽曲'], ['青い空']] } });

    assert.deepEqual(parse(gas.doGet({ parameter: {} })), { rows: [{ title: '青い空' }] });
    assert.deepEqual(opened, [NINA_SHEET]);
});

test('知らない talent には空のデータを返し、キャッシュもスプレッドシートも読まない', () => {
    for (const talent of ['unknown', 'constructor', '__proto__', 'toString']) {
        const cache = createCache();
        let cacheRead = false;
        const { gas, opened } = loadGas({
            cache: { ...cache, get: key => { cacheRead = true; return cache.get(key); } }
        });

        assert.deepEqual(parse(gas.doGet({ parameter: { talent } })), { rows: [] }, talent);
        assert.deepEqual(opened, [], talent);
        assert.equal(cacheRead, false, talent);
    }
});

test('読んだデータをキャッシュに入れ、次からはキャッシュから返す', () => {
    const cache = createCache();
    const tables = { [NINA_SHEET]: [['楽曲'], ['青い空']] };

    const first = loadGas({ tables, cache });
    const firstBody = first.gas.doGet({ parameter: { talent: 'nina' } }).text;
    assert.equal(cache.store.songlist_nina_count, '1');
    assert.equal(cache.store.songlist_nina_0, firstBody);

    const second = loadGas({ tables, cache });
    assert.equal(second.gas.doGet({ parameter: { talent: 'nina' } }).text, firstBody);
    assert.deepEqual(second.opened, []);
});

test('キャッシュが一部でも欠けていれば、スプレッドシートを読み直す', () => {
    const cache = createCache({ songlist_nina_count: '2', songlist_nina_0: '{"rows":' });
    const { gas, opened } = loadGas({ tables: { [NINA_SHEET]: [['楽曲'], ['青い空']] }, cache });

    assert.deepEqual(parse(gas.doGet({ parameter: { talent: 'nina' } })), { rows: [{ title: '青い空' }] });
    assert.deepEqual(opened, [NINA_SHEET]);
});

test('キャッシュに保存できなくても、データは返す', () => {
    const cache = createCache();
    cache.putAll = () => {
        throw new Error('too large');
    };
    const { gas, logs } = loadGas({ tables: { [NINA_SHEET]: [['楽曲'], ['青い空']] }, cache });

    assert.deepEqual(parse(gas.doGet({ parameter: { talent: 'nina' } })), { rows: [{ title: '青い空' }] });
    assert.match(logs.join('\n'), /Cache save skipped/);
});

test('途中で失敗したら、詳しい内容を出さずに internal_error を返す', () => {
    const { gas, logs } = loadGas({ tables: {} });

    assert.deepEqual(parse(gas.doGet({ parameter: { talent: 'nina' } })), { rows: [], error: 'internal_error' });
    assert.match(logs.join('\n'), /doGet failed/);
});

test('大きなデータは分けてキャッシュし、つなぐと元に戻る', () => {
    const { gas, chunkChars } = loadGas();
    const cache = createCache();
    const value = 'あ'.repeat(chunkChars * 2 + 5);

    gas.putLargeCache(cache, 'k', value, 300);

    assert.equal(cache.store.k_count, '3');
    assert.equal(gas.getLargeCache(cache, 'k'), value);
});

test('絵文字(サロゲートペア)の途中では分けない', () => {
    const { gas, chunkChars } = loadGas();
    const value = 'a'.repeat(chunkChars - 1) + '🎤' + 'b';

    // GAS 側で作った配列は別の realm のものなので、こちらの配列に写してから比べる
    const chunks = [...gas.splitIntoChunks(value)];

    assert.deepEqual(chunks.map(c => c.length), [chunkChars - 1, 3]);
    assert.ok(chunks[1].startsWith('🎤'));
    assert.equal(chunks.join(''), value);
});

test('チャンクの数が壊れていれば、キャッシュはないものとして扱う', () => {
    const { gas } = loadGas();
    for (const count of ['0', '-1', '1.5', 'abc']) {
        assert.equal(gas.getLargeCache(createCache({ k_count: count, k_0: 'x' }), 'k'), null, count);
    }
});
