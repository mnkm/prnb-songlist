# PROJECT NEBULA タレント別楽曲リスト

VTuber グループ「PROJECT NEBULA」に所属するタレントの持ち歌とカバー曲を、タレントごとに検索・絞り込みできる Web サイトです。

公開 URL: https://mnkm.page/prnb-songlist/

## 主な機能

- 桃瀬にな・碓氷ゆら・鈴莉れん・菜鳥ひなた・紫雨るかの 5 名をボタンで切り替えて、曲の一覧を表示します。
- 曲名は読みがなの五十音順に並べます。
- カテゴリ・ジャンル・アーティスト・種類で絞り込み、キーワードで検索できます。キーワードは、画面に出していないジャンル・種類・読みがなの列も検索します。値が 1 つもない絞り込みは表示しません。タレントを切り替えても、キーワードは残します。
- 行をクリックするか、行を選んで Enter キーを押すと、曲名だけか「曲名 / アーティスト」をクリップボードにコピーします。
- スマートフォンの幅では、表に見える曲を増やすため、操作欄を詰めます。タレントのボタンは下の名前だけにして 1 段に並べ、検索欄と「絞り込み」、曲数・並び順・表示件数(選択欄)をそれぞれ 1 行にまとめます。アーティストとカテゴリは曲名の下に出します。
- `?talent=<id>` で表示するタレントを指定できます(例: `?talent=hinata`)。`&type=request` を付けると、菜鳥ひなたの弾き語りのリクエスト用に「種類」の絞り込みを設定した状態で開きます。
- 曲ごとに「歌った回数」(YouTube の歌枠のセトリに載った回数)と「最後に歌った日」の列を出します。スマートフォンでは、曲名の下の行(アーティストの右)に「歌唱 N 回・最終 日付」と出します。回数のボタンを押すと、歌った配信の一覧を開き、その曲の位置から再生できます。並び順の欄で、回数や最後に歌った日の順に並べられます。詳しくは「歌枠での記録」の節にあります。
- ライト・ダークのテーマを切り替えられます。最初は端末の設定に合わせ、選んだテーマはブラウザに保存します。

## データ

曲のデータはこのリポジトリには入っていません。Google スプレッドシートで管理し、Google Apps Script(GAS)の Web アプリから JSON で取得します(`js/script.js` の `loadTable()`)。データの追加と修正はスプレッドシートで行います。

GAS のソースは [`gas/`](./gas/) で [clasp](https://github.com/google/clasp) を使って管理しています。手順は [gas/README.md](./gas/README.md) にあります。

## 歌枠での記録

[配信カレンダー](https://mnkm.page/prnb-stream-calendar/)(prnb-stream-calendar)が歌枠のコメント欄から集めたセトリを、同じオリジンの API(`/prnb-stream-calendar/api/song-history?talent=<id>`)から読みます。API の形と数える範囲は、prnb-stream-calendar の `docs/details.md` の「歌唱履歴」の節にあります。

- **数えるもの**: YouTube の歌枠のうち、コメント欄にセトリがあった配信。メンバー限定・Twitch・3D ライブ・歌ってみたは入りません。コラボ配信では、相手が歌った曲も入ります。列の名前は「歌った回数」ですが、この点に注意が要ります。
- **曲の突き合わせ**(`js/song-history.js`): 曲名を、配信カレンダーと同じ規則(NFKC → 小文字 → 空白・句読点・記号を除く)に、ひらがなをカタカナにそろえることを足してそろえ、一致させます。一致しなければ、括弧の中と「feat. …」を外して、もう一度比べます(「Piano Ver.」なども元の曲に数えます)。楽曲データに同じ曲名の曲が複数あるときは、その回のセトリのアーティストで選び、決まらない回は数えません。規則でつながらない書き方の違い(誤字、伏せ字、カタカナと英語など)は、`js/song-aliases.js` の対応表(セトリでの書き方 → シートの曲名)でつなぎます。同じ曲をシートで別の行にしている場合(英語版と日本語版など)は、同じファイルの `SONG_SAME` に曲名の組を書くと、どの行にもまとめた回数を出します。
- **最後に歌った日**: 楽曲データの「最終歌唱日」の列と比べ、新しいほうを出します。楽曲データの日付には「シート」と添えます。
- **読めないとき**: API が失敗しても(8 秒で打ち切ります)、一覧はそのまま出し、記録の列だけを空にします。`npx serve .` で開いたときは API が無いので、いつもこの表示になります。
- **テスト環境**: Cloudflare Pages のプレビュー(`*.pages.dev`)には配信カレンダーが無いので、`functions/prnb-stream-calendar/api/song-history.js`(Pages の Functions)が同じパスで本番の API の応答を中継します。本番の mnkm.page では、このパスは前段の Worker が配信カレンダーへ送るので使いません。

## 構成

HTML・CSS・JavaScript だけで作っており、ビルドツールは使いません。jQuery 3.7.1、Bootstrap 3.4.1、DataTables 1.13.8 を npm で管理し(版は `package.json` と `package-lock.json` で固定)、`npm install` で `vendor/` にコピーして同じオリジンから読み込みます。

```
.
├── index.html      # ページ本体と絞り込みの画面
├── css/style.css   # スタイル(ライト・ダークのテーマ)
├── js/script.js    # 絞り込み、DataTables の操作、データの取得
├── js/song-history.js  # 歌枠での記録の突き合わせ(画面とテストで共有)
├── js/song-aliases.js  # セトリの書き方とシートの曲名の対応表(手で直す)
├── scripts/
│   └── copy-vendor.mjs  # ライブラリを node_modules から vendor/ へコピーする
├── vendor/         # npm からコピーしたライブラリ(リポジトリには含めない)
├── gas/            # データを返す GAS のソース(clasp で管理)
├── functions/      # テスト環境で配信カレンダーの API を中継する(Cloudflare Pages の Functions)
├── tests/
│   ├── unit/       # 歌枠での記録の突き合わせのテスト(Node.js のテストランナー)
│   ├── e2e/        # 画面のテスト(Playwright)
│   └── gas/        # GAS のテスト(Node.js のテストランナー)
└── playwright.config.mjs  # 画面のテストの設定
```

## ローカルでの動作確認

最初と、ライブラリを更新したときに `npm install` を実行します。そのあと、静的なファイルを配信するサーバーで開きます。データを GAS から読むので、インターネットへの接続が必要です。

```bash
npm install
npx serve .
```

## テスト

`npm test` で、今の動作が変わっていないかを確かめます。HTML・CSS・JavaScript や GAS を変えたら、push する前に実行します。Node.js 22 以降が必要です。

```bash
npx playwright install chromium   # 最初と、@playwright/test を更新したときに実行する。テストで使うブラウザを入れる
npm test
```

- 画面のテスト(`tests/e2e/`): テスト用のサーバーでページを開き、タレントの切り替え、絞り込み、キーワード検索、行のコピー、テーマ、メニューなどの動作を確かめます。楽曲データと歌枠での記録は GAS や API から読まず、`tests/e2e/fixtures.mjs` の架空のデータを返すので、インターネットに接続しなくても動きます。
- 突き合わせのテスト(`tests/unit/`): `js/song-history.js` の曲名のそろえ方、突き合わせ、日付を確かめます。
- GAS のテスト(`tests/gas/`): `gas/コード.js` を、スプレッドシートやキャッシュの代わりのデータで動かし、返す JSON とキャッシュの扱いを確かめます。

動作を意図して変えたときは、合わせてテストも直します。

## デプロイ

`main` ブランチに取り込むと、Cloudflare Pages がビルドして https://mnkm.page/prnb-songlist/ に公開します。ビルドでは `npm install` が `vendor/` を作ります。旧 URL(`https://mnkm.github.io/prnb-songlist/`)へのアクセスは `mnkm.page` へ転送されます。

GAS(`gas/`)の変更は、このデプロイでは公開されません。`npm run gas:push` のあと、既存のデプロイを新しいバージョンに更新します([gas/README.md](./gas/README.md))。

## セキュリティ

- スプレッドシートから読んだ文字は、DataTables の `render: $.fn.dataTable.render.text()` で HTML をエスケープして表示します。絞り込みの選択肢も DOM API で作ります。
- ライブラリは CDN から読み込まず、npm で管理して同じオリジンから配信します。脆弱性は GitHub の Dependabot で検知します。
- `index.html` の Content-Security-Policy で、読み込めるスクリプト・スタイルと通信先を制限しています。

## クレジット

- Create: [@o2i_5](https://x.com/o2i_5)
- Data: [@Shigure_1764](https://x.com/Shigure_1764)
