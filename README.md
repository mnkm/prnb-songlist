# PROJECT NEBULA タレント別楽曲リスト

VTuber グループ「PROJECT NEBULA」に所属するタレントの持ち歌とカバー曲を、タレントごとに検索・絞り込みできる Web サイトです。

公開 URL: https://mnkm.page/prnb-songlist/

## 主な機能

- 桃瀬にな・碓氷ゆら・鈴莉れん・菜鳥ひなた・紫雨るかの 5 名を切り替えて、曲の一覧を表示します。
- カテゴリ・ジャンル・アーティスト・種類で絞り込み、キーワードで検索できます。キーワードは、画面に出していないジャンル・種類・読みがなの列も検索します。
- 行をクリックすると、曲名だけか「曲名 / アーティスト」をクリップボードにコピーします。
- `?talent=<id>` で表示するタレントを指定できます(例: `?talent=hinata`)。`&type=request` を付けると、菜鳥ひなたの弾き語りのリクエスト用に「種類」の絞り込みを設定した状態で開きます。
- ライト・ダークのテーマを切り替えられます。最初は端末の設定に合わせ、選んだテーマはブラウザに保存します。

## データ

曲のデータはこのリポジトリには入っていません。Google スプレッドシートで管理し、Google Apps Script(GAS)の Web アプリから JSON で取得します(`js/script.js` の `loadTable()`)。データの追加と修正はスプレッドシートで行います。

GAS のソースは [`gas/`](./gas/) で [clasp](https://github.com/google/clasp) を使って管理しています。手順は [gas/README.md](./gas/README.md) にあります。

## 構成

HTML・CSS・JavaScript だけで作っており、ビルドツールは使いません。jQuery 3.7.1、Bootstrap 3.4.1、DataTables 1.13.8 を npm で管理し(版は `package.json` と `package-lock.json` で固定)、`npm install` で `vendor/` にコピーして同じオリジンから読み込みます。

```
.
├── index.html      # ページ本体と絞り込みの画面
├── css/style.css   # スタイル(ライト・ダークのテーマ)
├── js/script.js    # 絞り込み、DataTables の操作、データの取得
├── scripts/
│   └── copy-vendor.mjs  # ライブラリを node_modules から vendor/ へコピーする
├── vendor/         # npm からコピーしたライブラリ(リポジトリには含めない)
└── gas/            # データを返す GAS のソース(clasp で管理)
```

## ローカルでの動作確認

最初と、ライブラリを更新したときに `npm install` を実行します。そのあと、静的なファイルを配信するサーバーで開きます。データを GAS から読むので、インターネットへの接続が必要です。

```bash
npm install
npx serve .
```

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
