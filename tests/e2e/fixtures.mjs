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
