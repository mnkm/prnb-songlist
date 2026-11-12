// 色を描く前にテーマを決める(白い画面が一瞬出ないよう、head で読み込む)。
// 決め方は script.js の initializeTheme() と同じ: 保存した選択があればそれ、なければ端末の設定
(function () {
    var theme = null;
    try {
        theme = localStorage.getItem('songlist-theme');
    } catch (error) {
        // 保存先を使えないときは端末の設定に合わせる
    }
    if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
})();
