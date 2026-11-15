// 歌枠での記録(配信カレンダーの /api/song-history)を、楽曲リストの曲に突き合わせる。
// 画面(js/script.js)とテスト(tests/unit/)の両方から使うため、DOM や jQuery を使わずに書く。
// 曲名のそろえ方は、配信カレンダーの src/shared/search.ts の songKey の規則に、ひらがなとカタカナをそろえることを足したもの。
(function (root) {
    'use strict';

    // YouTube の動画の ID の形。これ以外は URL に入れない
    const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
    // 見えない書式の文字(U+200E など)。セトリのコメントに混ざることがある
    const FORMAT_CHARS = /\p{Cf}/gu;
    // 空白・句読点・記号(Unicode の P と S の分類)
    const SPACE_PUNCT_SYMBOL = /[\s\p{P}\p{S}]/gu;
    // 外す括弧の組。中身ごと外す
    const BRACKETS = /\([^()]*\)|（[^（）]*）|\[[^\[\]]*\]|［[^［］]*］|【[^【】]*】|「[^「」]*」|『[^『』]*』/g;
    // 「feat.」「ft.」から後ろ
    const FEAT = /\s*(?:\bfeat\b|\bft\b)\.?.*$/i;
    // 曲名の末尾の「～…～」「〜…〜」「-…-」で囲んだサブタイトル(途中のものは曲名の一部のことがあるので外さない)
    const TRAILING_SUBTITLE = /\s*(?:[~〜][^~〜]+[~〜]|-[^-]+-)\s*$/;
    // 異体字セレクタ(‼︎ の U+FE0E など)
    const VARIATION_SELECTORS = /[\uFE00-\uFE0F]/g;
    // セトリの行の頭に付く曲順の印(「No.1」「①」「EN」「EN2」「1曲目「」)。規則 2 で外す
    const LEADING_MARK = /^(?:no\.?\s*\d+\s+|en\d?\s+|\d+曲目「)/;
    const CIRCLED_NUMBER = /^\s*[\u2460-\u2473]\s*/;
    // 閉じていない括弧から後ろ(「残酷な天使のテーゼ(アカペラ」など)。規則 2 で外す
    const UNCLOSED_BRACKET = /\s*[(（][^)）]*$/;
    const JST_OFFSET = 9 * 60 * 60 * 1000;

    function normalize(text) {
        return String(text == null ? '' : text).normalize('NFKC')
            .replace(FORMAT_CHARS, '').replace(VARIATION_SELECTORS, '').toLowerCase().trim();
    }

    // キーでは、ひらがなをカタカナにそろえる(「ハレ晴れユカイ」と「ハレ晴レユカイ」、「丸ノ内」と「丸の内」など)
    function foldKana(text) {
        return text.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
    }

    // 規則 1: 突き合わせ用のキー。記号だけの曲名は、記号を残したものをキーにする
    function songKey(title) {
        const normalized = foldKana(normalize(title));
        return normalized.replace(SPACE_PUNCT_SYMBOL, '') || normalized;
    }

    // 規則 2: 括弧の中と「feat. …」を外したキー。何も残らないときは空(この規則を使わない)
    function looseKey(title) {
        // 丸数字(①)は NFKC で数字になるので、そろえる前に外す
        const normalized = foldKana(normalize(String(title == null ? '' : title).replace(CIRCLED_NUMBER, '')));
        let stripped = normalized.replace(LEADING_MARK, '');
        // 入れ子の括弧も外れるよう、変わらなくなるまで繰り返す
        for (let i = 0; i < 5; i++) {
            const next = stripped.replace(BRACKETS, ' ');
            if (next === stripped) {
                break;
            }
            stripped = next;
        }
        stripped = stripped.replace(FEAT, '').replace(UNCLOSED_BRACKET, '').replace(TRAILING_SUBTITLE, '');
        return stripped.replace(SPACE_PUNCT_SYMBOL, '');
    }

    // アーティストのキー。「(CV:…)」などの括弧の中は、書く人によって有無が違うので外す
    function artistKey(artist) {
        return normalize(artist).replace(BRACKETS, '').replace(SPACE_PUNCT_SYMBOL, '');
    }

    // アーティストが同じとみなせるか。書き方が揺れる(「(CV:…)」の有無など)ので、片方がもう片方を含めば同じとする
    function sameArtist(a, b) {
        const ka = artistKey(a);
        const kb = artistKey(b);
        if (ka.length < 2 || kb.length < 2) {
            return false;
        }
        return ka.includes(kb) || kb.includes(ka);
    }

    function toTime(value) {
        return Number.isInteger(value) && value >= 0 ? value : null;
    }

    function toMillis(value) {
        const ms = typeof value === 'string' ? Date.parse(value) : NaN;
        return Number.isFinite(ms) ? ms : null;
    }

    function toText(value) {
        return typeof value === 'string' ? value : null;
    }

    // 日本時間の日付(2026/11/12)
    function formatDate(ms) {
        if (ms == null) {
            return '';
        }
        const d = new Date(ms + JST_OFFSET);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
    }

    // 日本時間の日時(2026/11/12 21:02)
    function formatDateTime(ms) {
        if (ms == null) {
            return '';
        }
        const d = new Date(ms + JST_OFFSET);
        const pad = n => String(n).padStart(2, '0');
        return `${formatDate(ms)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    }

    // シートの「最終歌唱日」(2026/01/31、2026-1-31 など)を、日本時間のその日の 0 時(ミリ秒)にする。読めなければ null
    function parseSheetDate(text) {
        const m = /^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/.exec(normalize(text));
        if (!m) {
            return null;
        }
        const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - JST_OFFSET;
        return formatDate(ms) === `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}` ? ms : null;
    }

    /**
     * 最後に歌った日。シートの「最終歌唱日」と、歌枠での記録の新しいほうを返す({ at, source: 'sheet' | 'history' })。
     * 同じ日なら、配信へのリンクがある歌枠での記録を使う。どちらも無ければ null
     */
    function latestSung(sheetText, record) {
        const sheetAt = parseSheetDate(sheetText);
        const historyAt = record && record.count ? record.lastAt : null;
        if (historyAt == null && sheetAt == null) {
            return null;
        }
        if (historyAt == null || (sheetAt != null && formatDate(sheetAt) > formatDate(historyAt))) {
            return { at: sheetAt, source: 'sheet' };
        }
        return { at: historyAt, source: 'history' };
    }

    function youtubeUrl(videoId, time) {
        if (!VIDEO_ID.test(videoId)) {
            return null;
        }
        const t = toTime(time);
        return `https://www.youtube.com/watch?v=${videoId}${t != null && t > 0 ? `&t=${t}s` : ''}`;
    }

    function emptyRecord() {
        return { count: 0, lastAt: null, performances: [], ambiguous: 0, setlistTitles: [] };
    }

    function addPerformance(record, performance, setlistTitle) {
        record.performances.push(performance);
        record.count += 1;
        if (performance.at != null && (record.lastAt == null || performance.at > record.lastAt)) {
            record.lastAt = performance.at;
        }
        if (!record.setlistTitles.includes(setlistTitle)) {
            record.setlistTitles.push(setlistTitle);
        }
    }

    /**
     * シートの曲(rows)と API の応答(response)を突き合わせる。
     * 戻り値:
     *  - records: rows と同じ並びの配列。記録の無い曲は null。記録は
     *    { count, lastAt(ミリ秒), performances[{ videoId, time, at, streamTitle, artist }](新しい順),
     *      ambiguous(同名の曲と区別できず、数に入れなかった回), setlistTitles(セトリでの曲名) }
     *  - unmatched: シートに無い曲 [{ title, artist, count, lastAt, performances }](回数の多い順)
     *  - since: 記録のいちばん古い配信の日時(ミリ秒)、updatedAt: 集計の日時(ミリ秒)
     */
    // 対応表(js/song-aliases.js)。キーはセトリの書き方の songKey
    // 同じ曲として回数をまとめる曲名の組(js/song-aliases.js の SONG_SAME)。songKey の組にしておく
    const ALIAS_DATA = typeof module === 'object' && module.exports
        ? require('./song-aliases.js')
        : { aliases: root.SONG_ALIASES || [], same: root.SONG_SAME || [] };
    const aliasMap = new Map((ALIAS_DATA.aliases || []).map(pair => [songKey(pair[0]), pair[1]]));
    const sameGroups = (ALIAS_DATA.same || []).map(group => group.map(songKey));

    // 同じ曲の組の行どうしで、記録をまとめて同じものを出す
    function shareSameSongs(rows, records) {
        sameGroups.forEach(group => {
            const indexes = [];
            rows.forEach((row, index) => {
                if (group.includes(songKey(row.title))) {
                    indexes.push(index);
                }
            });
            if (indexes.length < 2 || indexes.every(index => !records[index])) {
                return;
            }
            const merged = emptyRecord();
            indexes.forEach(index => {
                const record = records[index];
                if (!record) {
                    return;
                }
                record.performances.forEach(p => merged.performances.push(p));
                merged.count += record.count;
                merged.ambiguous += record.ambiguous;
                if (record.lastAt != null && (merged.lastAt == null || record.lastAt > merged.lastAt)) {
                    merged.lastAt = record.lastAt;
                }
                record.setlistTitles.forEach(title => {
                    if (!merged.setlistTitles.includes(title)) {
                        merged.setlistTitles.push(title);
                    }
                });
            });
            indexes.forEach(index => {
                records[index] = Object.assign({}, merged, {
                    performances: merged.performances.slice(),
                    setlistTitles: merged.setlistTitles.slice()
                });
            });
        });
    }

    function matchHistory(rows, response) {
        const records = rows.map(() => null);
        const result = { records: records, unmatched: [], since: null, updatedAt: null };
        if (!response || !Array.isArray(response.songs)) {
            return result;
        }
        const streams = response.streams && typeof response.streams === 'object' ? response.streams : {};
        result.updatedAt = toMillis(response.updatedAt);

        // シートの曲を、規則 1 と規則 2 のキーで引けるようにする
        const byKey = new Map();
        const byLooseKey = new Map();
        rows.forEach((row, index) => {
            const push = (map, key) => {
                if (!key) {
                    return;
                }
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key).push(index);
            };
            push(byKey, songKey(row.title));
            push(byLooseKey, looseKey(row.title));
        });

        response.songs.forEach(song => {
            if (!song || typeof song.title !== 'string' || !Array.isArray(song.performances)) {
                return;
            }
            const performances = song.performances
                .filter(p => p && typeof p.videoId === 'string' && VIDEO_ID.test(p.videoId))
                .map(p => {
                    const stream = streams[p.videoId] || {};
                    return {
                        videoId: p.videoId,
                        time: toTime(p.time),
                        at: toMillis(stream.eventAt),
                        streamTitle: toText(stream.title) || '',
                        // カレンダー側の修正の前の応答(キャッシュ)には artist が無い。無ければ null と同じに扱う
                        artist: toText(p.artist)
                    };
                });
            if (performances.length === 0) {
                return;
            }
            performances.forEach(p => {
                if (p.at != null && (result.since == null || p.at < result.since)) {
                    result.since = p.at;
                }
            });

            const lookup = function (title) {
                let found = byKey.get(songKey(title));
                if (!found) {
                    const loose = looseKey(title);
                    found = loose ? byLooseKey.get(loose) : undefined;
                }
                return found;
            };
            let candidates = lookup(song.title);
            if (!candidates) {
                // 規則でつながらなければ、対応表(js/song-aliases.js)のシートの曲名で引く
                const alias = aliasMap.get(songKey(song.title));
                candidates = alias ? lookup(alias) : undefined;
            }

            if (!candidates) {
                const record = emptyRecord();
                performances.forEach(p => addPerformance(record, p, song.title));
                result.unmatched.push({
                    title: song.title,
                    artist: toText(song.artist),
                    count: record.count,
                    lastAt: record.lastAt,
                    performances: record.performances
                });
                return;
            }

            performances.forEach(p => {
                let target = candidates.length === 1 ? candidates[0] : null;
                if (target == null) {
                    // 同名の曲がシートに複数あるときは、その回のアーティストで選ぶ。
                    // 決まらなければ、曲名の書き方まで同じ行が 1 つだけならそれにし(「Watch Me」と「Watch me!」など)、
                    // それでも決まらなければ数に入れない
                    const hits = candidates.filter(index => sameArtist(rows[index].artist, p.artist));
                    const exact = candidates.filter(index => normalize(rows[index].title) === normalize(song.title));
                    if (hits.length === 1) {
                        target = hits[0];
                    } else if (hits.length === 0 && exact.length === 1) {
                        target = exact[0];
                    }
                }
                if (target == null) {
                    candidates.forEach(index => {
                        records[index] = records[index] || emptyRecord();
                        records[index].ambiguous += 1;
                    });
                    return;
                }
                records[target] = records[target] || emptyRecord();
                addPerformance(records[target], p, song.title);
            });
        });

        shareSameSongs(rows, records);

        const newestFirst = (a, b) => (b.at || 0) - (a.at || 0);
        records.forEach(record => {
            if (record) {
                record.performances.sort(newestFirst);
            }
        });
        result.unmatched.forEach(song => song.performances.sort(newestFirst));
        result.unmatched.sort((a, b) => b.count - a.count || (b.lastAt || 0) - (a.lastAt || 0));
        return result;
    }

    const api = { songKey, looseKey, sameArtist, matchHistory, formatDate, formatDateTime, youtubeUrl, parseSheetDate, latestSung };
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.SongHistory = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
