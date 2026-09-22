// CacheService 1チャンクあたりのサイズ
// 上限ギリギリを避けるため80KB程度にする
const CACHE_CHUNK_SIZE = 80 * 1024;

/**
 * 大きな文字列を分割してCacheServiceへ保存
 */
function putLargeCache(cache, key, value, expirationInSeconds) {

  const chunkCount = Math.ceil(
    value.length / CACHE_CHUNK_SIZE
  );

  for (let i = 0; i < chunkCount; i++) {
    const chunk = value.substring(
      i * CACHE_CHUNK_SIZE,
      (i + 1) * CACHE_CHUNK_SIZE
    );

    cache.put(
      `${key}_${i}`,
      chunk,
      expirationInSeconds
    );
  }

  // チャンク数を保存
  cache.put(
    `${key}_count`,
    String(chunkCount),
    expirationInSeconds
  );
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

  const chunks = [];
  for (let i = 0; i < chunkCount; i++) {
    const chunk = cache.get(
      `${key}_${i}`
    );

    // 一部でもキャッシュが存在しない場合は
    // キャッシュ全体を無効とする
    if (chunk === null) {
      return null;
    }

    chunks.push(chunk);
  }

  return chunks.join('');
}

/**
 * JSONレスポンスを作成
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * メイン処理
 */
function doGet(e) {
  const talent = e.parameter.talent || 'nina';
  const cache = CacheService.getScriptCache();
  const cacheKey = `songlist_${talent}`;
  const cacheExpiration = 300;

  // ========================================
  // 1. キャッシュから取得
  // ========================================
  const cached = getLargeCache(
    cache,
    cacheKey
  );

  if (cached) {
    return ContentService
      .createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ========================================
  // 2. タレント別設定
  // ========================================

  const talentMap = {
    nina: {
      spreadsheetId: '10sodqHlGwp_ROuf5afdSPMvbDQmulFOw-K_hDK3WhiQ',
      sheetName: '楽曲'
    },
    ren: {
      spreadsheetId: '1hBqpD1i0Nnvt5UO2zeyl8PQz7A4tKZ4tRofeEh1TNtY',
      sheetName: '楽曲'
    },
    hinata: {
      spreadsheetId: '1WjWJv4W2ueg-jf5VdxLKYY85aX2wQSoQ9G6AEh0hS30',
      sheetName: '楽曲'
    }
  };

  const config = talentMap[talent];
  if (!config) {
    return createJsonResponse({
      rows: []
    });
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
    "種類": "type",
    "最終歌唱日": "latest"
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
  return ContentService
    .createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}