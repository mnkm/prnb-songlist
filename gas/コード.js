// CacheService 1チャンクあたりの文字数
// CacheService の値の上限は 100KB(バイト数)。日本語は UTF-8 で 1 文字 3 バイトになるので、
// 文字数で 80K にすると上限を超えて保存に失敗する。3 バイトの文字だけでも 90KB に収まる 30,000 文字にする
const CACHE_CHUNK_CHARS = 30000;

/**
 * 文字列を、CACHE_CHUNK_CHARS 文字ずつに分ける。
 * 絵文字など 2 つで 1 文字を表す文字(サロゲートペア)の間では切らない
 * (片方だけのチャンクは保存のときに壊れ、つなげても元に戻らない)
 */
function splitIntoChunks(value) {
  const chunks = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + CACHE_CHUNK_CHARS, value.length);
    const code = value.charCodeAt(end - 1);
    if (end < value.length && code >= 0xd800 && code <= 0xdbff) {
      end--;
    }
    chunks.push(value.substring(start, end));
    start = end;
  }
  return chunks;
}

/**
 * 大きな文字列を分割してCacheServiceへ保存(putAll で 1 回にまとめる)
 */
function putLargeCache(cache, key, value, expirationInSeconds) {
  const chunks = splitIntoChunks(value);
  const entries = {};
  chunks.forEach((chunk, i) => {
    entries[`${key}_${i}`] = chunk;
  });

  // チャンク数も一緒に保存
  entries[`${key}_count`] = String(chunks.length);
  cache.putAll(entries, expirationInSeconds);
}


/**
 * 分割されたキャッシュを取得
 */
function getLargeCache(cache, key) {
  const countText = cache.get(`${key}_count`);

  // キャッシュが存在しない
  if (!countText) {
    return null;
  }

  const chunkCount = Number(countText);
  if (!Number.isInteger(chunkCount) || chunkCount <= 0) {
    return null;
  }

  // チャンクは getAll で 1 回にまとめて読む
  const chunkKeys = [];
  for (let i = 0; i < chunkCount; i++) {
    chunkKeys.push(`${key}_${i}`);
  }
  const found = cache.getAll(chunkKeys);

  // 一部でもキャッシュが存在しない場合は
  // キャッシュ全体を無効とする
  if (chunkKeys.some(k => found[k] == null)) {
    return null;
  }

  return chunkKeys.map(k => found[k]).join('');
}

/**
 * JSON の文字列をレスポンスにする
 */
function createJsonTextResponse(json) {
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * JSONレスポンスを作成
 */
function createJsonResponse(data) {
  return createJsonTextResponse(JSON.stringify(data));
}


/**
 * メイン処理
 */
function doGet(e) {
  try {
    return getSongList(e);
  } catch (error) {
    // 例外の詳細はログにのみ残し、
    // レスポンスには固定のエラーを返す
    console.error(
      'doGet failed: ' + error
    );

    return createJsonResponse({
      rows: [],
      error: 'internal_error'
    });
  }
}


/**
 * 楽曲リストをJSONレスポンスとして取得
 */
function getSongList(e) {

  // ========================================
  // 1. タレント別設定
  // ========================================

  const talentMap = {
    nina: {
      spreadsheetId: '10sodqHlGwp_ROuf5afdSPMvbDQmulFOw-K_hDK3WhiQ',
      sheetName: '楽曲'
    },
    yura: {
      spreadsheetId: '1GjdSUL9jzsJbPyZp3AjgB8NhrA774fVJ93FbwiPpzmU',
      sheetName: '楽曲'
    },
    ren: {
      spreadsheetId: '1hBqpD1i0Nnvt5UO2zeyl8PQz7A4tKZ4tRofeEh1TNtY',
      sheetName: '楽曲'
    },
    hinata: {
      spreadsheetId: '1WjWJv4W2ueg-jf5VdxLKYY85aX2wQSoQ9G6AEh0hS30',
      sheetName: '楽曲'
    },
    ruka: {
      spreadsheetId: '1mK3OPbXCY5uNHKkZw1jYmUjSoJOuWhbSntezwJhxVfo',
      sheetName: '楽曲'
    }
  };

  const talent = (e && e.parameter && e.parameter.talent) || 'nina';

  // 許可リストにないタレントは
  // キャッシュにもスプレッドシートにも触れずに返す
  // (constructor 等の継承プロパティを除外するため hasOwnProperty で判定)
  if (!Object.prototype.hasOwnProperty.call(talentMap, talent)) {
    return createJsonResponse({
      rows: []
    });
  }

  const config = talentMap[talent];
  const cache = CacheService.getScriptCache();
  const cacheKey = `songlist_${talent}`;
  const cacheExpiration = 300;

  // ========================================
  // 2. キャッシュから取得
  // ========================================
  const cached = getLargeCache(
    cache,
    cacheKey
  );

  if (cached) {
    return createJsonTextResponse(cached);
  }

  // ========================================
  // 3. スプレッドシート読み込み
  // ========================================
  const sheet = SpreadsheetApp
    .openById(config.spreadsheetId)
    .getSheetByName(config.sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const values = sheet
    .getRange(
      1,
      1,
      lastRow,
      lastCol
    )
    .getValues();

  // ========================================
  // 4. データ変換
  // ========================================
  // よみ	楽曲	アーティスト	ジャンル	種類	演奏	最終歌唱日
  const columnMap = {
    "よみ": "reading",
    "楽曲": "title",
    "アーティスト": "artist",
    "カテゴリ": "category",
    "ジャンル": "genre",
    "種類": "type"
  };

  const header = values.shift();
  const keys = header.map(
    h => columnMap[h]
  );

  const rows = values
    .map((row, index) => {
      const obj = {};
      keys.forEach((k, i) => {
        if (k) {
          obj[k] = row[i];
        }
      });

      return obj;
    })

    // 楽曲名が空の行を除外
    .filter(
      r => r.title !== "" &&
           r.title != null
    );

  // ========================================
  // 5. JSON化
  // ========================================
  const result = JSON.stringify({
    rows: rows
  });

  // ========================================
  // 6. キャッシュへ保存
  // ========================================
  try {
    putLargeCache(
      cache,
      cacheKey,
      result,
      cacheExpiration
    );
  } catch (error) {
    // キャッシュ保存に失敗しても
    // JSONレスポンスは正常に返す
    console.warn(
      'Cache save skipped: ' + error
    );
  }

  // ========================================
  // 7. JSONレスポンス
  // ========================================
  return createJsonTextResponse(result);
}