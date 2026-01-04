# Kumicho Portal

組長ポータルアプリケーション - 組内の情報管理、イベント、フォームなどを管理するWebアプリケーション

## 技術スタック

- **フロントエンド**: React 19 + Vite + TypeScript + Tailwind CSS
- **バックエンド**: Express + tRPC
- **データベース**: PostgreSQL (Drizzle ORM)
- **デプロイ**: Vercel (推奨)

## ローカル開発

### 前提条件

- Node.js 18以上
- pnpm
- PostgreSQL データベース (本番環境ではNeon推奨)

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

#### オプション A: Neon (PostgreSQL - 推奨・完全無料)

1. Vercelダッシュボード → 「Storage」→「Browse Storage」→「Create New」
2. 「Neon」を選択
3. データベース名を入力、リージョンは「Tokyo (ap-northeast-1)」を選択
4. 環境変数が自動的にVercelに設定されます

#### オプション B: Vercel Postgres

1. Vercelダッシュボードから「Storage」→「Create Database」
2. 「Postgres」を選択
3. Neonより容量が少ないが、Vercel統合が簡単

### 3. 環境変数の設定

Vercelプロジェクトの Settings → Environment Variables で以下を設定:

#### 必須の環境変数

```
VITE_APP_ID=kumicho-portal
JWT_SECRET=your-secure-random-secret-key
DATABASE_URL=postgres://user:password@host:port/database
NODE_ENV=production
```

**注意**: Neonを使用している場合、`DATABASE_URL` はVercelが自動設定するため手動設定不要です。

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

Neonを使用する場合、本番環境でのマイグレーションは以下の手順で実行:

1. Vercelの環境変数から`DATABASE_URL`を取得（Settingsページ）
2. ローカルで`.env`ファイルに一時的に設定
3. `pnpm db:push`を実行
4. 完了後、ローカルの`.env`を元に戻す

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
- Neonの場合、`?sslmode=require`パラメータが含まれているか確認
- ファイアウォール設定でVercelのIPアドレスが許可されているか確認（Neonは通常不要）

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
