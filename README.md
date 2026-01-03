# Kumicho Portal

組長ポータルアプリケーション - 組内の情報管理、イベント、フォームなどを管理するWebアプリケーション

## 技術スタック

- **フロントエンド**: React 19 + Vite + TypeScript + Tailwind CSS
- **バックエンド**: Express + tRPC
- **データベース**: MySQL (Drizzle ORM)
- **デプロイ**: Vercel (推奨)

## ローカル開発

### 前提条件

- Node.js 18以上
- pnpm
- MySQL データベース

### セットアップ

1. 依存関係をインストール:
```bash
pnpm install
```

2. 環境変数を設定:
```bash
cp .env.example .env
```

`.env` ファイルを編集して、必要な環境変数を設定してください。

3. データベースのマイグレーション:
```bash
pnpm db:push
```

4. 開発サーバーを起動:
```bash
pnpm dev
```

サーバーは http://localhost:3000 で起動します。

## Vercelへのデプロイ

### 1. Vercelプロジェクトの作成

1. [Vercel](https://vercel.com)にログイン
2. 「New Project」をクリック
3. GitHubリポジトリを選択してインポート

### 2. データベースの準備

#### オプション A: PlanetScale (MySQL - 推奨)

1. [PlanetScale](https://planetscale.com)でアカウント作成
2. 新しいデータベースを作成
3. 接続文字列を取得 (例: `mysql://user:password@host.connect.psdb.cloud/database?sslaccept=strict`)

#### オプション B: Vercel Postgres

1. Vercelダッシュボードから「Storage」→「Create Database」
2. 「Postgres」を選択
3. 注意: MySQLからPostgreSQLへの移行が必要

### 3. 環境変数の設定

Vercelプロジェクトの Settings → Environment Variables で以下を設定:

#### 必須の環境変数

```
VITE_APP_ID=your-app-id
JWT_SECRET=your-secure-random-secret-key
DATABASE_URL=mysql://user:password@host:port/database
NODE_ENV=production
```

#### オプションの環境変数（機能に応じて）

```
OAUTH_SERVER_URL=https://your-oauth-server.com
OWNER_OPEN_ID=owner-open-id
BUILT_IN_FORGE_API_URL=https://api.example.com
BUILT_IN_FORGE_API_KEY=your-api-key-here
```

**重要**:
- `JWT_SECRET`は安全なランダム文字列を生成してください（例: `openssl rand -base64 32`）
- 環境変数は「Production」「Preview」「Development」すべてに設定することを推奨

### 4. ビルド設定

Vercelは`vercel.json`の設定を自動的に読み込みますが、以下を確認してください:

- **Framework Preset**: Other
- **Build Command**: `pnpm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `pnpm install`

### 5. デプロイ

設定が完了したら、「Deploy」をクリック。

その後、mainブランチへのpushで自動デプロイされます。

## データベースマイグレーション（本番環境）

PlanetScaleを使用する場合、本番環境でのマイグレーションは以下の手順で実行:

1. ローカルで`DATABASE_URL`を本番環境の接続文字列に一時変更
2. `pnpm db:push`を実行
3. または、PlanetScaleのブランチ機能を使用してスキーマ変更を管理

## プロジェクト構成

```
├── api/              # Vercel Serverless Functions
├── client/           # Reactフロントエンド
├── server/           # Expressバックエンド・tRPCルーター
├── drizzle/          # データベーススキーマ
├── shared/           # 共通の型定義
└── vercel.json       # Vercel設定
```

## よくある問題

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- PlanetScaleの場合、`?sslaccept=strict`パラメータが必要
- ファイアウォール設定でVercelのIPアドレスが許可されているか確認

### ビルドエラー

- 環境変数が全て設定されているか確認
- `pnpm install`が正常に完了しているか確認
- TypeScriptのエラーがないか `pnpm check` で確認

### OAuth認証が動作しない

- `OAUTH_SERVER_URL`が正しく設定されているか確認
- OAuth不要の場合は、関連するコードを削除または無効化

## スクリプト

- `pnpm dev` - 開発サーバーを起動
- `pnpm build` - 本番用ビルド
- `pnpm start` - 本番サーバーを起動（ローカル確認用）
- `pnpm check` - TypeScript型チェック
- `pnpm db:push` - データベースマイグレーション

## ライセンス

MIT
