// 楽曲リストの画面の、今の動作を確かめるテスト
import { test, expect } from '@playwright/test';
import { SONGS, manySongs } from './fixtures.mjs';
import { mockGas, blockExternal, openPage, visibleTitles, selectTalent, expectTalent } from './helpers.mjs';

// テストが待っていないダイアログ(DataTables の警告など)。Playwright は黙って閉じるので、記録して失敗にする
let unexpectedDialogs = [];

test.beforeEach(async ({ page }) => {
    unexpectedDialogs = [];
    await blockExternal(page);
    // スクリプトのエラーが起きたらテストを失敗させる
    page.on('pageerror', error => {
        throw error;
    });
    page.on('dialog', dialog => {
        unexpectedDialogs.push(dialog.message());
    });
});

test.afterEach(() => {
    expect(unexpectedDialogs).toEqual([]);
});


test.describe('読み込みとタレントの切り替え', () => {
    test('最初は桃瀬になの曲を、読みの五十音順に表示する', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page);

        expect(calls).toEqual(['nina']);
        await expectTalent(page, 'nina');
        await expect(page.locator('#songCount')).toHaveText('4 曲');
        expect(await visibleTitles(page)).toEqual(['青い空', '黄色い花', '白い雲', 'Star Song']);
        await expect(page.locator('.dataTables_info')).toHaveText('4 件中 1〜4 件');
        await expect(page).toHaveURL(/\?talent=nina$/);
    });

    test('?talent= で選んだタレントを開く', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page, 'talent=ren');

        expect(calls).toEqual(['ren']);
        await expectTalent(page, 'ren');
        expect(await visibleTitles(page)).toEqual(['赤い実', '緑の葉']);
    });

    test('知らない talent は桃瀬になとして開き、URL を直す', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page, 'talent=unknown');

        expect(calls).toEqual(['nina']);
        await expectTalent(page, 'nina');
        await expect(page).toHaveURL(/\?talent=nina$/);
    });

    test('タレントを切り替えると、URL と曲を入れ替え、絞り込みは戻してキーワードは残す', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page);
        await page.locator('#categoryFilter').selectOption('J-POP');
        await page.locator('#textFilter').fill('い');

        await selectTalent(page, 'ren');

        expect(calls).toEqual(['nina', 'ren']);
        await expect(page).toHaveURL(/\?talent=ren$/);
        await expectTalent(page, 'ren');
        await expect(page.locator('#categoryFilter')).toHaveValue('');
        // キーワード「い」は残り、読みに「い」を含む赤い実だけが残る
        await expect(page.locator('#textFilter')).toHaveValue('い');
        expect(await visibleTitles(page)).toEqual(['赤い実']);
        // 絞り込みの選択肢は新しいタレントの曲から作り直す
        await expect(page.locator('#categoryFilter option')).toHaveText(['すべて', 'J-POP', 'アニソン']);
    });

    test('続けて切り替えたとき、遅れて届いた前のタレントの曲で上書きしない', async ({ page }) => {
        let releaseNina;
        const ninaHeld = new Promise(resolve => {
            releaseNina = resolve;
        });
        let first = true;
        await mockGas(page, async talent => {
            if (talent === 'nina' && first) {
                first = false;
                await ninaHeld;
            }
            return { rows: SONGS[talent] };
        });

        await page.goto('./');
        // 読み込み中の幕の上からは押せないので、ボタンの click イベントを直接起こす
        await page.locator('.talent-button[data-talent="ren"]').dispatchEvent('click');
        await expect(page.locator('#grid tbody tr')).toHaveCount(2);
        const ninaFinished = page.waitForEvent('requestfinished', request => request.url().includes('talent=nina'));
        releaseNina();
        await ninaFinished;
        // 届いた応答の処理(jQuery のコールバック)が終わるのを待つ
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));

        expect(await visibleTitles(page)).toEqual(['赤い実', '緑の葉']);
    });
});

test.describe('菜鳥ひなたのリクエスト用の URL', () => {
    test('?talent=hinata&type=request は「種類」を弾き語りにして開く', async ({ page }) => {
        await mockGas(page);
        await openPage(page, 'talent=hinata&type=request');

        await expect(page.locator('#typeFilter')).toHaveValue('弾き語り');
        expect(await visibleTitles(page)).toEqual(['朝の歌', '昼の歌']);
        // この URL は、そのまま共有できるよう書き換えない
        await expect(page).toHaveURL(/\?talent=hinata&type=request$/);
    });

    test('最初の読み込みに失敗して再読み込みしても、リクエスト用の条件を引き継ぐ', async ({ page }) => {
        let fail = true;
        await mockGas(page, talent => (fail ? 'abort' : { rows: SONGS[talent] }));
        await openPage(page, 'talent=hinata&type=request');
        await expect(page.locator('#loadError')).toBeVisible();

        fail = false;
        await page.locator('#retryButton').click();
        await expect(page.locator('#typeFilter')).toHaveValue('弾き語り');
        await expect(page).toHaveURL(/\?talent=hinata&type=request$/);
    });

    test('ほかのタレントでは type=request を使わず、URL から外す', async ({ page }) => {
        await mockGas(page);
        await openPage(page, 'talent=ren&type=request');

        await expect(page.locator('#typeFilter')).toHaveValue('');
        await expect(page).toHaveURL(/\?talent=ren$/);
    });
});

test.describe('絞り込みとキーワード', () => {
    test('選択肢は曲のデータから重複なしで作る', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await expect(page.locator('#categoryFilter option')).toHaveText(['すべて', 'J-POP', 'アニソン', 'ボカロ']);
        await expect(page.locator('#genreFilter option')).toHaveText(['すべて', 'バラード', 'ロック']);
        await expect(page.locator('#artistFilter option')).toHaveText(['すべて', 'アーティストA', 'アーティストB', 'アーティストC']);
        // 値が 1 つもない項目は隠す
        await expect(page.locator('#typeFilter')).toBeHidden();
        await expect(page.locator('#categoryFilter')).toBeVisible();
    });

    test('絞り込みは値が完全に一致する曲だけを残し、組み合わせられる', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#categoryFilter').selectOption('J-POP');
        expect(await visibleTitles(page)).toEqual(['青い空', '白い雲']);
        await expect(page.locator('#songCount')).toHaveText('2 / 4 曲');

        await page.locator('#genreFilter').selectOption('ロック');
        expect(await visibleTitles(page)).toEqual(['白い雲']);
        await expect(page.locator('.dataTables_info')).toHaveText('1 件中 1〜1 件 （全 4 件から絞り込み）');

        await page.locator('#categoryFilter').selectOption('');
        await page.locator('#genreFilter').selectOption('');
        expect(await visibleTitles(page)).toHaveLength(4);
    });

    test('キーワードは画面に出ていない読み・ジャンルも探す', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#textFilter').fill('ほしの');
        expect(await visibleTitles(page)).toEqual(['Star Song']);

        await page.locator('#textFilter').fill('バラード');
        expect(await visibleTitles(page)).toEqual(['青い空', 'Star Song']);
    });

    test('一致する曲がないときは、その旨を出す', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#textFilter').fill('存在しない曲');
        await expect(page.locator('#grid tbody td')).toHaveText('一致する楽曲はありません');
        await expect(page.locator('.dataTables_info')).toHaveText('0 件 （全 4 件から絞り込み）');
    });

    test('条件を設定すると印と消去ボタンを出し、「条件をクリア」ですべて戻す', async ({ page }) => {
        await mockGas(page);
        await openPage(page);
        await expect(page.locator('#filterBadge')).toBeHidden();
        await expect(page.locator('#clearFiltersButton')).toBeHidden();
        await expect(page.locator('#clearTextButton')).toBeHidden();

        await page.locator('#categoryFilter').selectOption('J-POP');
        await page.locator('#textFilter').fill('青');
        await expect(page.locator('#filterBadge')).toBeVisible();
        await expect(page.locator('#clearTextButton')).toBeVisible();

        await page.locator('#clearFiltersButton').click();
        await expect(page.locator('#categoryFilter')).toHaveValue('');
        await expect(page.locator('#textFilter')).toHaveValue('');
        await expect(page.locator('#filterBadge')).toBeHidden();
        await expect(page.locator('#clearFiltersButton')).toBeHidden();
        expect(await visibleTitles(page)).toHaveLength(4);
    });

    test('「×」でキーワードだけを消す', async ({ page }) => {
        await mockGas(page);
        await openPage(page);
        await page.locator('#categoryFilter').selectOption('J-POP');
        await page.locator('#textFilter').fill('青');

        await page.locator('#clearTextButton').click();
        await expect(page.locator('#textFilter')).toHaveValue('');
        await expect(page.locator('#categoryFilter')).toHaveValue('J-POP');
        expect(await visibleTitles(page)).toEqual(['青い空', '白い雲']);
    });

    test('リクエスト用の URL で開いて「条件をクリア」したら、URL を ?talent= だけにする', async ({ page }) => {
        await mockGas(page);
        await openPage(page, 'talent=hinata&type=request');

        await page.locator('#clearFiltersButton').click();
        await expect(page).toHaveURL(/\?talent=hinata$/);
        expect(await visibleTitles(page)).toHaveLength(3);
    });
});

test.describe('表の表示', () => {
    test('1 ページの表示件数を切り替えられる', async ({ page }) => {
        await mockGas(page, () => ({ rows: manySongs(30) }));
        await openPage(page);

        await expect(page.locator('#grid tbody tr')).toHaveCount(10);
        await expect(page.locator('.page-length-button[data-page-length="10"]')).toHaveAttribute('aria-pressed', 'true');

        await page.locator('.page-length-button[data-page-length="25"]').click();
        await expect(page.locator('#grid tbody tr')).toHaveCount(25);
        await expect(page.locator('.page-length-button[data-page-length="25"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.page-length-button[data-page-length="10"]')).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('.dataTables_info')).toHaveText('30 件中 1〜25 件');
    });

    test('列の見出しで並べ替え、ページを送れる', async ({ page }) => {
        await mockGas(page, () => ({ rows: manySongs(15) }));
        await openPage(page);

        expect((await visibleTitles(page))[0]).toBe('曲001');
        await page.locator('.dataTables_scrollHead th', { hasText: '楽曲' }).click();
        expect((await visibleTitles(page))[0]).toBe('曲015');

        await page.locator('.dataTables_paginate .paginate_button.next').click();
        await expect(page.locator('.dataTables_info')).toHaveText('15 件中 11〜15 件');
        expect(await visibleTitles(page)).toEqual(['曲005', '曲004', '曲003', '曲002', '曲001']);
    });

    test('スプレッドシートの文字は HTML として解釈せず、そのまま表示する', async ({ page }) => {
        await mockGas(page, () => ({
            rows: [{ reading: 'a', title: '<img src=x onerror="window.__xss=1">', artist: '<b>太字</b>', category: '<i>c</i>', genre: '', type: '' }]
        }));
        await openPage(page);

        await expect(page.locator('#grid tbody td').first()).toHaveText('<img src=x onerror="window.__xss=1">');
        await expect(page.locator('#grid tbody img, #grid tbody b')).toHaveCount(0);
        await expect(page.locator('#artistFilter option').nth(1)).toHaveText('<b>太字</b>');
        expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    });

    test('数値や空の値も文字として表示する', async ({ page }) => {
        await mockGas(page, () => ({
            rows: [{ reading: 'いちきゅうにご', title: 1925, artist: null, category: 'J-POP' }]
        }));
        await openPage(page);

        await expect(page.locator('#grid tbody td').first()).toHaveText('1925');
        await expect(page.locator('#grid tbody td').nth(1)).toHaveText('');
    });

    test('タレントの曲が 0 件のときは、その旨を出す', async ({ page }) => {
        await mockGas(page);
        await openPage(page, 'talent=yura');

        await expect(page.locator('#grid tbody td')).toHaveText('楽曲がありません');
    });
});

test.describe('読み込みの失敗', () => {
    for (const [name, handler] of [
        ['GAS がエラーを返したとき', () => ({ rows: [], error: 'internal_error' })],
        ['通信に失敗したとき', () => 'abort']
    ]) {
        test(`${name}は画面に知らせ、前のタレントの曲を消す。再読み込みできる`, async ({ page }) => {
            let fail = false;
            await mockGas(page, talent => (fail ? handler() : { rows: SONGS[talent] }));
            await openPage(page);
            expect(await visibleTitles(page)).toHaveLength(4);

            fail = true;
            await selectTalent(page, 'ren');

            await expect(page.locator('#loadError')).toBeVisible();
            await expect(page.locator('#loadError')).toContainText('データを読み込めませんでした');
            await expect(page.locator('#grid')).toBeHidden();
            await expect(page.locator('#loadingOverlay')).toBeHidden();

            // 曲数は「0 曲」と出さない
            await expect(page.locator('#songCount')).toHaveText('');

            fail = false;
            await page.locator('#retryButton').click();
            await expect(page.locator('#loadError')).toBeHidden();
            expect(await visibleTitles(page)).toEqual(['赤い実', '緑の葉']);
        });
    }
});

test.describe('曲のコピー', () => {
    test.beforeEach(async ({ context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    });

    test('行を押すと「曲名 / アーティスト」をコピーする', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#grid tbody tr', { hasText: '青い空' }).click();

        await expect(page.locator('#toast')).toHaveText('コピーしました: 青い空 / アーティストA');
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('青い空 / アーティストA');
    });

    test('コピーできないときは、失敗を知らせる', async ({ page }) => {
        await page.addInitScript(() => {
            navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
        });
        await mockGas(page);
        await openPage(page);

        await page.locator('#grid tbody tr', { hasText: '青い空' }).click();

        await expect(page.locator('#toast')).toHaveText('クリップボードへのコピーに失敗しました');
        await expect(page.locator('#toast')).toHaveClass(/is-error/);
    });

    test('「楽曲のみ」を選ぶと曲名だけをコピーし、次に開いたときも覚えている', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#menuButton').click();
        await page.locator('.copy-format-option', { hasText: '楽曲のみ' }).click();
        await expect(page.locator('input[name="copyFormat"][value="titleOnly"]')).toBeChecked();
        await page.locator('#closeMenuButton').click();
        await page.locator('#grid tbody tr', { hasText: '黄色い花' }).click();
        await expect(page.locator('#toast')).toHaveText('コピーしました: 黄色い花');
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('黄色い花');

        await openPage(page);
        await expect(page.locator('input[name="copyFormat"][value="titleOnly"]')).toBeChecked();
    });
});

test.describe('テーマ', () => {
    test('最初は端末の設定に合わせる', async ({ browser }) => {
        for (const scheme of ['light', 'dark']) {
            const context = await browser.newContext({ colorScheme: scheme });
            const page = await context.newPage();
            await blockExternal(page);
            await mockGas(page);
            await openPage(page);
            await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
            await expect(page.locator('#themeToggle')).toBeChecked({ checked: scheme === 'dark' });
            await context.close();
        }
    });

    test('切り替えたテーマを覚え、端末の設定より優先する', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mockGas(page);
        await openPage(page);

        await page.locator('#menuButton').click();
        await page.locator('.theme-toggle-track').click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        await openPage(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    test('タレントに合わせて強調色を変える', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mockGas(page);
        await openPage(page);
        const accent = () => page.evaluate(() => document.documentElement.style.getPropertyValue('--accent-color'));

        expect(await accent()).toBe('#fff0f3');
        await selectTalent(page, 'ren');
        await expect.poll(accent).toBe('#fff2da');

        // ダークに切り替えると、ダーク用の色にする
        await page.locator('#menuButton').click();
        await page.locator('.theme-toggle-track').click();
        await expect.poll(accent).toBe('#a17a25');
    });
});

test.describe('メニュー', () => {
    test('ボタンで開き、閉じるボタン・背景・Esc キーで閉じる', async ({ page }) => {
        await mockGas(page);
        await openPage(page);
        const menu = page.locator('#sideMenu');
        const button = page.locator('#menuButton');

        for (const close of [
            () => page.locator('#closeMenuButton').click(),
            () => page.locator('#menuBackdrop').click({ position: { x: 10, y: 10 } }),
            () => page.keyboard.press('Escape')
        ]) {
            await button.click();
            await expect(menu).toHaveClass(/is-open/);
            await expect(menu).toHaveAttribute('aria-hidden', 'false');
            await expect(button).toHaveAttribute('aria-expanded', 'true');

            await close();
            await expect(menu).not.toHaveClass(/is-open/);
            await expect(menu).toHaveAttribute('aria-hidden', 'true');
            await expect(button).toHaveAttribute('aria-expanded', 'false');
        }
    });
});

test.describe('キーボード', () => {
    test('行に Tab で移り、Enter でコピーする', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await mockGas(page);
        await openPage(page);

        await page.locator('#grid tbody tr').first().focus();
        await page.keyboard.press('Enter');

        await expect(page.locator('#toast')).toHaveText('コピーしました: 青い空 / アーティストA');
    });

    test('閉じたメニューには Tab で入らず、開くとメニューの中に、閉じると元のボタンに戻る', async ({ page }) => {
        await mockGas(page);
        await openPage(page);
        await expect(page.locator('#sideMenu')).toHaveJSProperty('inert', true);

        await page.locator('#menuButton').click();
        await expect(page.locator('#closeMenuButton')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.locator('#menuButton')).toBeFocused();
        await expect(page.locator('#sideMenu')).toHaveJSProperty('inert', true);
    });
});

test.describe('スマートフォンの幅', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('アーティストとカテゴリを曲名の下に出し、絞り込みの欄を閉じた状態で開く', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        // タレントのボタンは下の名前だけを 1 段に並べる(フルネームは読み上げ用に残す)
        await expect(page.locator('.talent-button[data-talent="nina"]')).toHaveText('桃瀬になにな');
        await expect(page.locator('.talent-button[data-talent="nina"] .talent-name-short')).toBeVisible();
        await expect(page.locator('.talent-button[data-talent="nina"] .talent-name-full')).toHaveCSS('position', 'absolute');
        const tops = await page.locator('.talent-button').evaluateAll(buttons => buttons.map(b => b.getBoundingClientRect().top));
        expect(new Set(tops).size).toBe(1);
        await expect(page.locator('#songCount')).toHaveText('4 曲');
        await expect(page.locator('.dataTables_scrollHead th')).toHaveText(['楽曲']);
        // アーティストとカテゴリは曲名の下に出す
        const firstRow = page.locator('#grid tbody tr').first();
        await expect(firstRow.locator('.song-sub-artist')).toHaveText('アーティストA');
        await expect(firstRow.locator('.song-sub-category')).toHaveText('J-POP');
        await expect(page.locator('#textFilter')).toBeVisible();
        await expect(page.locator('#filterArea')).toBeHidden();

        await page.locator('#filterToggle').click();
        await expect(page.locator('#categoryFilter')).toBeVisible();
    });
});
