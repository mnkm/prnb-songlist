import { SONGS } from './fixtures.mjs';

const GAS_PATTERN = 'https://script.google.com/**';

/**
 * GAS への問い合わせを止め、talent ごとに用意したデータを返す。
 * handler を渡すと、その結果({ rows } や { error }、または 'abort')を返す
 * 呼ばれた talent の一覧を返す
 */
export async function mockGas(page, handler) {
    const calls = [];
    await page.route(GAS_PATTERN, async route => {
        const talent = new URL(route.request().url()).searchParams.get('talent');
        calls.push(talent);
        const result = handler ? await handler(talent) : { rows: SONGS[talent] || [] };
        if (result === 'abort') {
            await route.abort();
            return;
        }
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
    });
    return calls;
}

/** 外部のフォントは読まない(テストをネットワークに左右させない) */
export async function blockExternal(page) {
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
}

/** ページを開き、表が描かれるまで待つ */
export async function openPage(page, query = '') {
    await page.goto(query ? `./?${query}` : './');
    await page.locator('#loadingOverlay').waitFor({ state: 'hidden' });
}

/** 表に出ている曲名の一覧 */
export async function visibleTitles(page) {
    return page.locator('#grid tbody tr td:first-child').allTextContents();
}
