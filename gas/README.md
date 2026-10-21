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

# 既存デプロイを新しいバージョンに更新（公開URLは変わらない）
npm run gas:deploy -- -i <デプロイID>

# 新しいデプロイを作成（公開URLが新しく発行される）
npm run gas:deploy
```

## 注意事項

- Webアプリとして公開されている `exec` URL（`js/script.js` の `loadTable()` 内で参照）は、デプロイ（`clasp deploy` もしくはスクリプトエディタからの「デプロイを管理」）を新規作成しない限り変わりません。
- `clasp push` だけでは公開中の `exec` URL には反映されません（反映されるのはスクリプトエディタ上のコードとテスト用の `dev` URL のみ）。公開中のWebアプリに反映するには、push 後に既存デプロイを新しいバージョンへ更新してください（`npm run gas:deploy -- -i <デプロイID>`、もしくは「デプロイを管理」→ 編集 → 新バージョン）。デプロイIDは `npm run gas:deployments` で確認できます。
- `appsscript.json` の `oauthScopes` を変更した場合は、スクリプトエディタで一度関数を実行して権限を承認し直す必要があります。
- `gas/.clasp.json` にはスクリプトIDが含まれますが秘匿情報ではないため、リポジトリにコミットして構いません（認証情報である `.clasprc.json` とは別物です）。
- スプレッドシート側のデータそのものはこのリポジトリでは管理していません。
