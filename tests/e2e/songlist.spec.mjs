// 楽曲リストの画面の、今の動作を確かめるテスト
import { test, expect } from '@playwright/test';
import { SONGS, manySongs } from './fixtures.mjs';
import { mockGas, blockExternal, openPage, visibleTitles } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
    await blockExternal(page);
    // スクリプトのエラーが起きたらテストを失敗させる
    page.on('pageerror', error => {
        throw error;
    });
});

test.describe('読み込みとタレントの切り替え', () => {
    test('最初は桃瀬になの曲を、曲名の順に表示する', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page);

        expect(calls).toEqual(['nina']);
        await expect(page.locator('#talentFilter')).toHaveValue('nina');
        expect(await visibleTitles(page)).toEqual(['Star Song', '白い雲', '青い空', '黄色い花']);
        await expect(page.locator('.dataTables_info')).toHaveText('4 件中 1〜4 件');
        await expect(page).toHaveURL(/\?talent=nina$/);
    });

    test('?talent= で選んだタレントを開く', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page, 'talent=ren');

        expect(calls).toEqual(['ren']);
        await expect(page.locator('#talentFilter')).toHaveValue('ren');
        expect(await visibleTitles(page)).toEqual(['緑の葉', '赤い実']);
    });

    test('知らない talent は桃瀬になとして開き、URL を直す', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page, 'talent=unknown');

        expect(calls).toEqual(['nina']);
        await expect(page.locator('#talentFilter')).toHaveValue('nina');
        await expect(page).toHaveURL(/\?talent=nina$/);
    });

    test('タレントを切り替えると、URL と曲を入れ替え、絞り込みを戻す', async ({ page }) => {
        const calls = await mockGas(page);
        await openPage(page);
        await page.locator('#categoryFilter').selectOption('J-POP');
        await page.locator('#textFilter').fill('青');

        await page.locator('#talentFilter').selectOption('ren');
        await expect(page.locator('#grid tbody tr')).toHaveCount(2);

        expect(calls).toEqual(['nina', 'ren']);
        await expect(page).toHaveURL(/\?talent=ren$/);
        expect(await visibleTitles(page)).toEqual(['緑の葉', '赤い実']);
        await expect(page.locator('#categoryFilter')).toHaveValue('');
        await expect(page.locator('#textFilter')).toHaveValue('');
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
        await page.locator('#talentFilter').selectOption('ren');
        await expect(page.locator('#grid tbody tr')).toHaveCount(2);
        releaseNina();
        await page.waitForTimeout(300);

        expect(await visibleTitles(page)).toEqual(['緑の葉', '赤い実']);
    });
});

test.describe('菜鳥ひなたのリクエスト用の URL', () => {
    test('?talent=hinata&type=request は「種類」を弾き語りにして開く', async ({ page }) => {
        await mockGas(page);
        await openPage(page, 'talent=hinata&type=request');

        await expect(page.locator('#typeFilter')).toHaveValue('弾き語り');
        expect(await visibleTitles(page)).toEqual(['昼の歌', '朝の歌']);
        // この URL は、そのまま共有できるよう書き換えない
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
        // 値のない項目は選択肢に入れない
        await expect(page.locator('#typeFilter option')).toHaveText(['すべて']);
    });

    test('絞り込みは値が完全に一致する曲だけを残し、組み合わせられる', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#categoryFilter').selectOption('J-POP');
        expect(await visibleTitles(page)).toEqual(['白い雲', '青い空']);

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
        expect(await visibleTitles(page)).toEqual(['Star Song', '青い空']);
    });

    test('一致する曲がないときは、その旨を出す', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#textFilter').fill('存在しない曲');
        await expect(page.locator('#grid tbody td')).toHaveText('一致する楽曲はありません');
        await expect(page.locator('.dataTables_info')).toHaveText('0 件 （全 4 件から絞り込み）');
    });

    test('パネルを閉じると、見出しに設定中の内容を出す', async ({ page }) => {
        await mockGas(page);
        await openPage(page);
        await page.locator('#categoryFilter').selectOption('J-POP');
        await page.locator('#textFilter').fill('青');

        await page.locator('[data-target="#talentFilterPanel"]').click();
        await page.locator('[data-target="#detailFilterPanel"]').click();
        await page.locator('[data-target="#textFilterPanel"]').click();

        await expect(page.locator('#talentPanelTitle')).toHaveText('タレント：桃瀬にな');
        await expect(page.locator('#detailPanelTitle')).toHaveText('フィルタ：設定中');
        await expect(page.locator('#textPanelTitle')).toHaveText('キーワード：設定中');
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
        test(`${name}は知らせて、表を空にする`, async ({ page }) => {
            let fail = false;
            await mockGas(page, talent => (fail ? handler() : { rows: SONGS[talent] }));
            await openPage(page);
            expect(await visibleTitles(page)).toHaveLength(4);

            const dialog = page.waitForEvent('dialog');
            fail = true;
            await page.locator('#talentFilter').selectOption('ren');
            const alert = await dialog;
            expect(alert.message()).toBe('データの取得に失敗しました');
            await alert.accept();

            await expect(page.locator('#loadingOverlay')).toBeHidden();
            await expect(page.locator('#grid tbody td')).toHaveText('楽曲がありません');
            await expect(page.locator('#categoryFilter option')).toHaveText(['すべて']);
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

        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('青い空 / アーティストA');
        await expect(page.locator('#toast')).toHaveText('コピーしました: 青い空 / アーティストA');
    });

    test('「楽曲のみ」を選ぶと曲名だけをコピーし、次に開いたときも覚えている', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await page.locator('#menuButton').click();
        await page.locator('.copy-format-option', { hasText: '楽曲のみ' }).click();
        await expect(page.locator('input[name="copyFormat"][value="titleOnly"]')).toBeChecked();
        await page.locator('#closeMenuButton').click();
        await page.locator('#grid tbody tr', { hasText: '黄色い花' }).click();
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
        await page.locator('#talentFilter').selectOption('ren');
        await expect.poll(accent).toBe('#fff2da');
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

test.describe('スマートフォンの幅', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('カテゴリの列を隠し、絞り込みとキーワードの欄を閉じて開く', async ({ page }) => {
        await mockGas(page);
        await openPage(page);

        await expect(page.locator('.dataTables_scrollHead th')).toHaveText(['楽曲', 'アーティスト']);
        await expect(page.locator('#talentFilterPanel')).toBeVisible();
        await expect(page.locator('#detailFilterPanel')).toBeHidden();
        await expect(page.locator('#textFilterPanel')).toBeHidden();
    });
});
