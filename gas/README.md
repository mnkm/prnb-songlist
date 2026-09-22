# GAS（Google Apps Script）プロジェクト

楽曲データを Google スプレッドシートから取得し、JSON として返す Web アプリ（`index.html` / `js/script.js` から呼び出しているエンドポイント）のソースを、[clasp](https://github.com/google/clasp) を使ってこのディレクトリで管理します。

- スクリプトID: `1WbtgJ2MVyU_T_I0_yAHClMSnx0Nl9l49x0Q035p4ASWnDXSz4WBlDK2l`

## 初回セットアップ

リポジトリルートで以下を実行してください（すべて `gas/` 配下に対して動作するよう `package.json` の npm scripts を用意しています）。

```bash
# 1. 依存パッケージ（clasp）のインストール（リポジトリルートで一度だけ）
npm install

# 2. Googleアカウントでログイン（ブラウザが開くので認証してください）
npm run gas:login

# 3. 既存スクリプトを gas/ にクローン
npm run gas:clone
```

`gas:login` は `~/.clasprc.json` に認証情報を保存します（Gitには含まれません）。マシンごとに一度実行すればOKです。

## 日常の開発フロー

```bash
# スクリプトエディタ上の最新状態を取得
npm run gas:pull

# ローカルの変更をスクリプトエディタへ反映
npm run gas:push

# スクリプトエディタをブラウザで開く
npm run gas:open

# 現在のデプロイ一覧を確認
npm run gas:deployments

# 新しいデプロイを作成（Webアプリの公開URLを更新する場合）
npm run gas:deploy
```

## 注意事項

- Webアプリとして公開されている `exec` URL（`js/script.js` の `loadTable()` 内で参照）は、デプロイ（`clasp deploy` もしくはスクリプトエディタからの「デプロイを管理」）を新規作成しない限り変わりません。既存デプロイの中身を更新したいだけの場合は `clasp push` のみで反映されます。
- `gas/.clasp.json` にはスクリプトIDが含まれますが秘匿情報ではないため、リポジトリにコミットして構いません（認証情報である `.clasprc.json` とは別物です）。
- スプレッドシート側のデータそのものはこのリポジトリでは管理していません。
