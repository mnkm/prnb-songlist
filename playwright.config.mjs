// 画面のテスト(tests/e2e)の設定。楽曲データは GAS を呼ばず、テストの中で用意したデータを返す
import { defineConfig, devices } from '@playwright/test';

// ほかの開発用サーバー(Vite の 4173 など)とぶつからない番号にする
const PORT = 4791;
const URL = `http://127.0.0.1:${PORT}/`;

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: URL,
        ...devices['Desktop Chrome']
    },
    webServer: {
        command: 'node tests/e2e/server.mjs',
        url: URL,
        env: { SONGLIST_TEST_PORT: String(PORT) },
        reuseExistingServer: false
    }
});
