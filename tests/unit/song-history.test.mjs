// 歌枠での記録の突き合わせ(js/song-history.js)のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const H = require('../../js/song-history.js');

const VID = n => `video${String(n).padStart(6, '0')}`; // 11 文字の動画の ID

function response(songs, streams = {}) {
    return { songs, streams, updatedAt: '2026-11-15T03:00:00Z' };
}

test('曲名のキーは配信カレンダーの songKey の規則に、ひらがなをカタカナにそろえることを足したもの(docs/details.md の例)', () => {
    assert.equal(H.songKey('ＬＥＭＯＮ！'), 'lemon');
    assert.equal(H.songKey('夜に 駆ける'), '夜ニ駆ケル');
    assert.equal(H.songKey('Lemon (Acoustic ver.)'), 'lemonacousticver');
    // 記号だけの曲名は、記号を残す
    assert.equal(H.songKey('!!!'), '!!!');
    // 見えない文字(U+200E)は除く
    assert.equal(H.songKey('‎ブラック★ロックシューター'), H.songKey('ブラック★ロックシューター'));
});

test('規則 2 は括弧の中と feat. 以降を外し、何も残らなければ空にする', () => {
    assert.equal(H.looseKey('勇者 (Yuusha)'), '勇者');
    assert.equal(H.looseKey('おじゃま虫 feat. 初音ミク'), 'オジャマ虫');
    assert.equal(H.looseKey('「君と僕の歌」'), '');
    // 曲名の途中のハイフンは外さない
    assert.equal(H.looseKey('CHA-LA HEAD-CHA-LA'), 'chalaheadchala');
    // 末尾の「～…～」「〜…〜」「-…-」は外す
    assert.equal(H.looseKey('貴方解剖純愛歌 ～シね～'), '貴方解剖純愛歌');
    assert.equal(H.looseKey('貴方解剖純愛歌 〜死ね〜'), '貴方解剖純愛歌');
    assert.equal(H.looseKey('Let It Go～ありのままで～'), 'letitgo');
    assert.equal(H.looseKey('二息歩行-Piano Ver.-'), '二息歩行');
});

test('規則 1、無ければ規則 2 で突き合わせ、残りはシートに無い曲にする', () => {
    const rows = [{ title: '青い空', artist: 'A' }, { title: '勇者', artist: 'B' }];
    const result = H.matchHistory(rows, response([
        { title: '青い 空', performances: [{ videoId: VID(1), time: 10 }] },
        { title: '勇者 (Yuusha)', performances: [{ videoId: VID(2), time: null }] },
        { title: '知らない曲', artist: 'Z', performances: [{ videoId: VID(3), time: 5 }, { videoId: VID(4), time: 6 }] }
    ], {
        [VID(1)]: { title: '歌枠1', eventAt: '2026-11-01T12:00:00Z' },
        [VID(2)]: { title: '歌枠2', eventAt: '2026-10-01T12:00:00Z' },
        [VID(3)]: { title: '歌枠3', eventAt: '2026-09-01T12:00:00Z' },
        [VID(4)]: { title: '歌枠4', eventAt: '2026-09-02T12:00:00Z' }
    }));
    assert.equal(result.records[0].count, 1);
    assert.equal(result.records[0].performances[0].streamTitle, '歌枠1');
    assert.equal(result.records[1].count, 1);
    assert.equal(result.unmatched.length, 1);
    assert.equal(result.unmatched[0].count, 2);
    assert.equal(H.formatDate(result.since), '2026/09/01');
});

test('書き方違いで 1 行に当たる曲は合算し、同じ配信で 2 回歌った回も数える', () => {
    const rows = [{ title: 'Song', artist: 'A' }];
    const streams = {
        [VID(1)]: { title: 'x', eventAt: '2026-01-01T12:00:00Z' },
        [VID(2)]: { title: 'y', eventAt: '2026-02-01T12:00:00Z' }
    };
    const result = H.matchHistory(rows, response([
        { title: 'Song', performances: [{ videoId: VID(1), time: 1 }, { videoId: VID(1), time: 300 }] },
        { title: 'Song (short ver.)', performances: [{ videoId: VID(2), time: 2 }] }
    ], streams));
    const record = result.records[0];
    assert.equal(record.count, 3);
    assert.equal(H.formatDate(record.lastAt), '2026/02/01');
    assert.equal(record.performances[0].videoId, VID(2));
    assert.deepEqual(record.setlistTitles, ['Song', 'Song (short ver.)']);
});

test('同名の曲がシートに複数あるときは、回のアーティストで選び、決まらない回は数えない', () => {
    const rows = [{ title: 'スパークル', artist: '幾田りら' }, { title: 'スパークル', artist: 'RADWIMPS' }];
    const result = H.matchHistory(rows, response([{
        title: 'スパークル',
        artist: '幾田りら',
        performances: [
            { videoId: VID(1), time: 1, artist: '幾田りら' },
            { videoId: VID(2), time: 1, artist: 'RADWIMPS(野田洋次郎)' },
            { videoId: VID(3), time: 1, artist: null },
            // カレンダー側の修正の前の応答には artist が無い
            { videoId: VID(4), time: 1 }
        ]
    }]));
    assert.equal(result.records[0].count, 1);
    assert.equal(result.records[1].count, 1);
    assert.equal(result.records[0].ambiguous, 2);
    assert.equal(result.records[1].ambiguous, 2);
});

test('アーティストは括弧の中を除き、片方がもう片方を含めば同じとする', () => {
    assert.equal(H.sameArtist('天乃リリサ(CV:前田佳織里)・橘美花莉(CV:鬼頭明里)', '天乃リリサ・橘 美花莉'), true);
    assert.equal(H.sameArtist('HoneyWorks feat. 成海聖奈', 'HoneyWorks'), true);
    assert.equal(H.sameArtist('美波', 'Mrs. GREEN APPLE'), false);
    assert.equal(H.sameArtist('A', null), false);
});

test('アーティストで決まらない回は、曲名の書き方まで同じ行が 1 つだけならそれにする', () => {
    const rows = [{ title: 'Watch Me', artist: 'X' }, { title: 'Watch me!', artist: 'Y' }];
    const result = H.matchHistory(rows, response([
        { title: 'Watch me!', performances: [{ videoId: VID(1), time: 1 }] },
        { title: 'WATCH ME', performances: [{ videoId: VID(2), time: 1 }] },
        { title: 'Watch-Me', performances: [{ videoId: VID(3), time: 1 }] }
    ]));
    // 大文字と小文字の違いは同じ書き方とみなす
    assert.equal(result.records[0].count, 1);
    assert.equal(result.records[1].count, 1);
    // 書き方が両方と違う回(Watch-Me)は数えない
    assert.equal(result.records[0].ambiguous, 1);
    assert.equal(result.records[1].ambiguous, 1);
});

test('キーではひらがなとカタカナを区別せず、規則 2 では曲順の印と閉じていない括弧を外す', () => {
    assert.equal(H.songKey('ハレ晴れユカイ'), H.songKey('ハレ晴レユカイ'));
    assert.equal(H.songKey('おジャ魔女カーニバル‼︎'), H.songKey('おジャ魔女カーニバル!!'));
    assert.equal(H.looseKey('①Summer麺'), H.looseKey('Summer麺'));
    assert.equal(H.looseKey('No.3  カタオモイ'), H.looseKey('カタオモイ'));
    assert.equal(H.looseKey('EN2 ファンサ'), H.looseKey('ファンサ'));
    assert.equal(H.looseKey('1曲目「しゅきぴ'), H.looseKey('しゅきぴ'));
    assert.equal(H.looseKey('残酷な天使のテーゼ(アカペラ'), H.looseKey('残酷な天使のテーゼ'));
    // 数字で始まる曲名は、規則 1 では外さない
    assert.equal(H.songKey('20-CRY-'), '20cry');
});

test('規則でつながらない曲は、対応表(js/song-aliases.js)のシートの曲名で引く', () => {
    const rows = [{ title: '君をのせて', artist: '井上あずみ' }, { title: 'レット・イット・ゴー～ありのままで～ [Heartful ver.]', artist: 'May J.' }];
    const result = H.matchHistory(rows, response([
        { title: '君にのせて', performances: [{ videoId: VID(1), time: 1 }] },
        { title: 'Let It Go~ありのままで~', performances: [{ videoId: VID(2), time: 1 }] }
    ]));
    assert.equal(result.records[0].count, 1);
    assert.equal(result.records[1].count, 1);
    assert.equal(result.unmatched.length, 0);
});

test('同じ曲の組(SONG_SAME)の行が両方あれば、どちらにもまとめた回数を出す', () => {
    const rows = [
        { title: 'A Whole New World', artist: 'Peabo Bryson & Regina Belle' },
        { title: 'ホール・ニュー・ワールド', artist: '石井一孝・麻生かほ里' }
    ];
    const result = H.matchHistory(rows, response([
        { title: 'A Whole New World', performances: [{ videoId: VID(1), time: 1 }, { videoId: VID(2), time: 1 }] },
        { title: 'ホール・ニュー・ワールド', performances: [{ videoId: VID(3), time: 1 }] }
    ]));
    assert.equal(result.records[0].count, 3);
    assert.equal(result.records[1].count, 3);
    assert.deepEqual(result.records[0].setlistTitles, result.records[1].setlistTitles);
    // 片方の行だけのシートでは、対応表でその行に入る
    const single = H.matchHistory([rows[1]], response([
        { title: 'A Whole New World', performances: [{ videoId: VID(1), time: 1 }] }
    ]));
    assert.equal(single.records[0].count, 1);
    assert.equal(single.unmatched.length, 0);
});

test('形の違う値は使わない', () => {
    const rows = [{ title: 'Song', artist: 'A' }];
    const result = H.matchHistory(rows, response([
        { title: 'Song', performances: [{ videoId: '"><script>', time: 1 }, { videoId: VID(1), time: -3 }, { videoId: VID(2), time: 1.5 }] },
        null,
        { title: 1, performances: [] }
    ]));
    assert.equal(result.records[0].count, 2);
    assert.deepEqual(result.records[0].performances.map(p => p.time), [null, null]);
    assert.deepEqual(H.matchHistory(rows, { songs: 'x' }).records, [null]);
    assert.deepEqual(H.matchHistory(rows, null).records, [null]);
});

test('YouTube の URL は time が正の整数のときだけ位置を付け、ID の形を確かめる', () => {
    assert.equal(H.youtubeUrl(VID(1), 125), `https://www.youtube.com/watch?v=${VID(1)}&t=125s`);
    assert.equal(H.youtubeUrl(VID(1), 0), `https://www.youtube.com/watch?v=${VID(1)}`);
    assert.equal(H.youtubeUrl(VID(1), null), `https://www.youtube.com/watch?v=${VID(1)}`);
    assert.equal(H.youtubeUrl('bad', 1), null);
});

test('日付は日本時間で出す', () => {
    assert.equal(H.formatDate(Date.parse('2026-11-11T15:30:00Z')), '2026/11/12');
    assert.equal(H.formatDateTime(Date.parse('2026-11-11T15:30:00Z')), '2026/11/12 00:30');
});

test('シートの最終歌唱日と歌枠での記録の、新しいほうを使う(同じ日なら記録)', () => {
    const record = { count: 2, lastAt: Date.parse('2026-11-11T12:00:00Z') };
    assert.deepEqual(H.latestSung('2026/11/20', record), { at: H.parseSheetDate('2026/11/20'), source: 'sheet' });
    assert.equal(H.latestSung('2026/11/11', record).source, 'history');
    assert.equal(H.latestSung('2026/1/2', null).source, 'sheet');
    assert.equal(H.latestSung('', record).source, 'history');
    assert.equal(H.latestSung('', null), null);
    assert.equal(H.latestSung('未定', { count: 0, lastAt: null }), null);
    assert.equal(H.parseSheetDate('2026/02/30'), null);
    assert.equal(H.formatDate(H.parseSheetDate('2026-1-31')), '2026/01/31');
});
