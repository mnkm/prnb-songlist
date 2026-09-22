# PROJECT NEBULA タレント別楽曲リスト

VTuberグループ「PROJECT NEBULA」所属タレントの持ち歌・カバー曲を、タレント別に検索・絞り込みできる静的Webサイトです。

公開URL: https://mnkm.github.io/prnb-songlist/

## 主な機能

- **タレント選択**: 桃瀬にな・碓氷ゆら・鈴莉れん・菜鳥ひなた・紫雨るかの5名を切り替えて楽曲一覧を表示
- **絞り込み検索**: カテゴリ・ジャンル・アーティスト・種類のプルダウン、およびキーワードによるフリーワード検索（非表示のジャンル・種類・読みがな列も検索対象）
- **行クリックでコピー**: 楽曲名のみ／「楽曲 / アーティスト」形式を選んでクリップボードにコピー
- **URLパラメータ対応**: `?talent=<id>` で表示タレントを指定してアクセス可能（例: `?talent=hinata`）。`&type=request` を付けると菜鳥ひなたの弾き語りリクエスト用に「種類」フィルタを自動適用
- **テーマ切り替え**: システムのライト/ダーク設定を初期値とし、サイドメニューから手動切り替え可能（選択はブラウザに保存）
- **レスポンシブ対応**: スマートフォン幅では列やフィルタパネルの表示を最適化

## 技術スタック

ビルドツールを使わない素のHTML/CSS/JavaScriptです。

- jQuery 3.7.1
- Bootstrap 3.4.1
- DataTables 1.13.8
- 上記はすべてCDN（jsDelivr）から読み込み、SRI（Subresource Integrity）を付与

## ディレクトリ構成

```
.
├── index.html      # ページ本体・フィルタUI
├── css/
│   └── style.css   # スタイル（ライト/ダークテーマ対応）
├── js/
│   └── script.js   # フィルタ・DataTables制御・データ取得ロジック
└── gas/            # データ供給用GAS（Google Apps Script）のソース（clasp管理）
```

## データソースについて

楽曲データは本リポジトリには含まれておらず、Google スプレッドシートで管理されたデータを Google Apps Script（GAS）のWebアプリ経由でJSON取得しています（`js/script.js` 内の `loadTable()` を参照）。データの追加・修正はスプレッドシート側で行われます。

このGASのソースコードは [`gas/`](./gas/) ディレクトリで [clasp](https://github.com/google/clasp) を使って管理しています。開発環境のセットアップ手順は [gas/README.md](./gas/README.md) を参照してください。

## ローカルでの動作確認

ビルド不要の静的サイトのため、任意の静的サーバーで配信するだけで動作します。

```bash
npx serve .
# もしくは
python -m http.server 8000
```

起動後、ブラウザで `index.html` にアクセスしてください（GASエンドポイントへのアクセスにインターネット接続が必要です）。

## デプロイ

`main` ブランチへの反映内容が GitHub Pages（`https://mnkm.github.io/prnb-songlist/`）でそのまま公開されます。

## セキュリティ

- 外部データ（スプレッドシート由来のテキスト）はDataTablesの `render: $.fn.dataTable.render.text()` によりHTMLエスケープした上で描画しています。フィルタのプルダウン選択肢もDOM APIで安全に生成しています
- CDNから読み込むライブラリにはSRI（`integrity`/`crossorigin`）を設定しています
- `Content-Security-Policy` を `index.html` に設定し、想定外のスクリプト・スタイル・通信先を制限しています

## クレジット

- Create: [@o2i_5](https://x.com/o2i_5)
- Data: [@Shigure_1764](https://x.com/Shigure_1764)