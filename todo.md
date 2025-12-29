# 組長業務 引き継ぎポータル - TODO（4次実装：Minato Editorial Luxury + Private Vault）

## ✓ 完了項目

### フェーズ 1: Minato Editorial Luxury デザイン設計と Private Vault 要件確認
- [x] デザイン方針確認（港区ミニマル・ラグジュアリー）
- [x] Private Vault 要件確認
- [x] ローテ自動計算ロジック（案A）確認
- [x] Member トップを「雑誌の目次」型に設計
- [x] ヒーロー背景：グラデ + ノイズで実装
- [x] コンテナ最大幅、余白設定確認
- [x] タイポ設定：Inter + Noto Sans JP
- [x] 色設定：オフホワイト背景、濃いグレー文字、低彩度青緑アクセント

### フェーズ 2: DB スキーマ拡張
- [x] audit_logs テーブル作成
- [x] vault_entries テーブル作成
- [x] data_classification テーブル作成
- [x] DB マイグレーション実行
- [x] 既存テーブル拡張（posts, inventory, templates, rules, faq に classification 追加）

### フェーズ 3: Member トップ刷新
- [x] 左上：小さめのラベル（YEAR / AREA）実装
- [x] 中央：大きい H1（「組長引き継ぎ」）実装
- [x] 下：Index List（01..06）実装
  - [x] 01: 年間カレンダー
  - [x] 02: 河川清掃
  - [x] 03: 倉庫・備品
  - [x] 04: テンプレ置き場
  - [x] 05: ルール・決定事項
  - [x] 06: 年度ログ
- [x] 右下：小さな更新ログ（Last updated）実装
- [x] 4枚カード削除、Index List に統合
- [x] ヒーロー背景（グラデ + ノイズ）+ オーバーレイ実装
- [x] 余白重視、線と影は最小限
- [x] タイポ階層明確化
- [x] モバイルレスポンシブ確認

### フェーズ 4: Private Vault 実装
- [x] Vault 閲覧画面（Admin限定）実装
- [x] マスキング表示（デフォルト）実装
- [x] チェックボックスで一時表示実装
- [x] コピー機能実装
- [x] 個人情報の取扱注意警告表示
- [x] Admin 監査ログ画面実装
- [x] 監査ログ一覧表示（誰が、いつ、何を）
- [x] フィルタ機能（アクション別）実装
- [x] 統計表示実装
- [x] エクスポート機能（プレースホルダ）実装
- [x] ルーティング追加（/vault, /audit-logs）
- [x] Admin限定チェック実装

## 実装内容サマリー

**DB テーブル数：** 21 個
- users, households, leader_schedule, leader_rotation_logic, exemption_requests, rule_versions, pending_queue, handover_bag_items, member_top_summary, audit_logs, vault_entries, data_classification, posts, events, river_cleaning_runs, inventory, templates, rules, faq, changelog, secret_notes

**ページ数：** 14 個
- Public トップ、Member トップ、年間カレンダー、河川清掃、備品台帳、テンプレ、ルール、年度ログ、FAQ、Admin ダッシュボード、Private Vault、監査ログ、返信待ちキュー、引き継ぎ袋

**デザイン：** Minato Editorial Luxury
- ホワイト背景、落ち着いた青緑アクセント
- 余白重視、線と影は最小限
- 「雑誌の目次」型レイアウト
- モーション控えめ（0.2〜0.4秒のフェード/スライド）

**セキュリティ：**
- Admin限定の Private Vault
- マスキング表示 + チェックボックスで一時表示
- 監査ログ記録（誰が、いつ、何を）
- 個人情報ガード（Public/Member に個人情報なし）

## 合格条件チェック
- [x] Member トップが「雑誌の目次」型で「都心レジデンスの案内サイト感」がある
- [x] Index List（01..06）から各ページに3タップ以内で到達可能
- [x] Vault は Admin限定、マスキング表示がデフォルト
- [x] 監査ログが記録・表示される
- [x] Public/Member に個人情報が出ない
- [x] Minato Editorial Luxury デザイン適用完了

## 次のステップ候補

1. **初期データ（Seed）投入**：住戸、ローテ、ルール、FAQ などのサンプルデータを投入
2. **検索機能の実装**：全文検索（河川、備品、会費など）
3. **画像アップロード機能**：備品・河川清掃・ログの写真を S3 に保存
4. **パンくず（Breadcrumb）ナビゲーション**：各ページ上部に追加
5. **Admin 管理画面の詳細実装**：投稿管理、ユーザー管理、ローテ自動計算ロジック編集


## 14次実装：マンション画像の背景配置

### グリーンピア焼津画像の検索・ダウンロード
- [x] グリーンピア焼津のマンション画像を検索
- [x] 高品質な画像をダウンロード
- [x] 画像を public フォルダに配置

### Member トップの背景配置
- [x] ヘッダー背景にマンション画像を配置
- [x] グラデーション・オーバーレイの調整
- [x] テキスト可読性の確保

### 各ページのヘッダー背景配置
- [x] 年間カレンダーページ
- [x] 河川清揃ページ
- [x] 備品台帳ページ
- [x] テンプレページ
- [x] ルールページ
- [x] FAQページ
- [x] 年度ログページ
- [x] 管理画面
- [x] Private Vaultページ
- [x] 監査ログページ

### デザイン確認
- [x] レスポンシブ確認
- [x] 画像の最適化
- [x] チェックポイント作成
