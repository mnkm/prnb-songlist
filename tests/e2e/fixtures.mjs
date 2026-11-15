// 画面のテストで GAS の代わりに返す楽曲データ。曲名とアーティストはテスト用の架空のもの
export const SONGS = {
    nina: [
        { reading: 'あおいそら', title: '青い空', artist: 'アーティストA', category: 'J-POP', genre: 'バラード', type: '' },
        { reading: 'きいろいはな', title: '黄色い花', artist: 'アーティストB', category: 'アニソン', genre: 'ロック', type: '' },
        { reading: 'しろいくも', title: '白い雲', artist: 'アーティストA', category: 'J-POP', genre: 'ロック', type: '' },
        { reading: 'ほしのうた', title: 'Star Song', artist: 'アーティストC', category: 'ボカロ', genre: 'バラード', type: '' }
    ],
    ren: [
        { reading: 'あかいみ', title: '赤い実', artist: 'アーティストD', category: 'J-POP', genre: '', type: '' },
        { reading: 'みどりのは', title: '緑の葉', artist: 'アーティストE', category: 'アニソン', genre: '', type: '' }
    ],
    hinata: [
        { reading: 'あさのうた', title: '朝の歌', artist: 'アーティストF', category: 'J-POP', genre: '', type: '弾き語り' },
        { reading: 'よるのうた', title: '夜の歌', artist: 'アーティストG', category: 'J-POP', genre: '', type: '' },
        { reading: 'ひるのうた', title: '昼の歌', artist: 'アーティストH', category: 'アニソン', genre: '', type: '弾き語り' }
    ],
    yura: [],
    ruka: []
};

// 1 ページの表示件数の確認に使う、件数の多いデータ
export function manySongs(count) {
    return Array.from({ length: count }, (_, i) => {
        const n = String(i + 1).padStart(3, '0');
        return { reading: `きょく${n}`, title: `曲${n}`, artist: `アーティスト${n}`, category: 'J-POP', genre: '', type: '' };
    });
}

// 歌枠での記録(/api/song-history)の代わり。桃瀬になの曲(上の SONGS.nina)に合わせている
const vid = n => `video${String(n).padStart(6, '0')}`;
export const HISTORY_SONGS = {
    nina: [
        { reading: 'あおいそら', title: '青い空', artist: 'アーティストA', category: 'J-POP', genre: 'バラード', type: '', lastSung: '' },
        { reading: 'きいろいはな', title: '黄色い花', artist: 'アーティストB', category: 'アニソン', genre: 'ロック', type: '', lastSung: '2026/12/01' },
        { reading: 'しろいくも', title: '白い雲', artist: 'アーティストA', category: 'J-POP', genre: 'ロック', type: '', lastSung: '2026/10/01' },
        { reading: 'ほしのうた', title: 'Star Song', artist: 'アーティストC', category: 'ボカロ', genre: 'バラード', type: '', lastSung: '' }
    ]
};
export const HISTORY = {
    nina: {
        songs: [
            { title: '青い 空', artist: 'アーティストA', key: '青い空', count: 3, lastAt: '2026-11-10T12:00:00Z', performances: [
                { videoId: vid(3), time: 754, artist: 'アーティストA' },
                { videoId: vid(2), time: null, artist: null },
                { videoId: vid(1), time: 0, artist: null }
            ] },
            { title: 'Star Song (Acoustic)', artist: null, key: 'starsongacoustic', count: 1, lastAt: '2026-11-01T12:00:00Z', performances: [
                { videoId: vid(2), time: 60, artist: null }
            ] },
            { title: '黄色い花', artist: 'アーティストB', key: '黄色い花', count: 1, lastAt: '2026-01-01T12:00:00Z', performances: [
                { videoId: vid(1), time: 30, artist: 'アーティストB' }
            ] },
            { title: '<b>知らない曲</b>', artist: '=cmd', key: 'b知らない曲b', count: 1, lastAt: '2026-01-01T12:00:00Z', performances: [
                { videoId: vid(1), time: 90, artist: '=cmd' }
            ] }
        ],
        streams: {
            [vid(1)]: { title: '歌枠 その1', eventAt: '2026-01-01T12:00:00Z' },
            [vid(2)]: { title: '歌枠 その2', eventAt: '2026-11-01T12:00:00Z' },
            [vid(3)]: { title: '<i>歌枠 その3</i>', eventAt: '2026-11-10T15:30:00Z' }
        },
        updatedAt: '2026-11-15T03:00:00Z'
    }
};
