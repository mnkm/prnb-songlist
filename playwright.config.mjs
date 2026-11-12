// 画面のテスト(tests/e2e)の設定。楽曲データは GAS を呼ばず、テストの中で用意したデータを返す
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4173/',
        ...devices['Desktop Chrome']
    },
    webServer: {
        command: 'node tests/e2e/server.mjs',
        url: 'http://localhost:4173/',
        reuseExistingServer: !process.env.CI
    }
});
