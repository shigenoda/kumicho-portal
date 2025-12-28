# 組長業務 引き継ぎポータル - TODO（3次実装）

## フェーズ 1: 画面設計と DB 再設計

### Member トップ画面設計
- [x] 4枚カード（今週やること / 最優先3課題 / 未解決（仮説） / 返信待ち）のレイアウト案作成
- [x] 9年ローテ表のレイアウト案作成
- [x] 港区ミニマル・ラグジュアリーデザイン適用（余白・タイポ・色・アニメ）
- [x] モバイルレスポンシブ設計確認

### DB スキーマ再設計
- [x] households テーブル設計（unitId, moveInDate, lastServedYear, eligibilityStatus, exemptUntil, notes）
- [x] leader_schedule テーブル設計（年度、Primary/Backup、status、ロジック参照）
- [x] exemption_requests テーブル設計（免除申請の版管理）
- [x] rule_versions テーブル設計（ルール版管理）
- [x] pending_queue テーブル設計（返信待ちキュー）
- [x] leader_rotation_logic テーブル設計（ロジック自動計算用）
- [x] 既存テーブルの拡張確認（posts, events, river_cleaning_runs, inventory, templates, rules, faq, changelog, secret_notes, handover_bag_items）

## フェーズ 2: バックエンドAPI実装

### ローテ自動計算ロジック
- [x] leader_rotation_logic テーブルから計算ルール取得
- [x] households から在籍情報取得
- [x] 優先順位ロジック実装（経過年数 → 入居開始 → 住戸ID）
- [x] 免除・条件付き確定の判定ロジック
- [x] 自動繰り上げ・差し替えロジック

### Member トップ用 API
- [x] getWeeklyTasks：今週やること3件取得
- [x] getTopPriorities：最優先3課題取得
- [x] getUnresolvedIssues：未解決（仮説）ボード取得
- [x] getPendingQueue：返信待ちキュー上位5件取得
- [x] getLeaderSchedule：先9年ローテ表取得
- [x] getRecentChangelog：最新の変更履歴取得

### その他 API
- [x] search.global：全文検索（河川、備品、会費、免除、出不足金、引き継ぎ袋、ローテ）
- [x] events.list：年間カレンダー
- [x] river_cleaning_runs.list：河川清掃実施ログ
- [x] inventory.list：備品台帳
- [x] templates.list：テンプレ置き場
- [x] rules.list：ルール・決定事項
- [x] posts.list：年度ログ（証跡タイムライン）
- [x] pending_queue.list：返信待ちキュー（詳細）
- [x] handover_bag_items.list：引き継ぎ袋チェックリスト
- [x] faq.list：FAQ
- [x] leader_schedule.calculateNext：次年度ローテ自動計算
- [x] exemption_requests.list：免除申請一覧
- [x] rule_versions.list：ルール版管理

## フェーズ 3: フロントエンド実装

### 港区ミニマル・ラグジュアリーデザイン適用
- [x] グローバルスタイル（余白・タイポ・色・アニメ）設定
- [x] フォント設定（Inter + Noto Sans JP）
- [x] カラーパレット設定（ニュートラル + 低彩度アクセント1色）
- [x] コンポーネント設計（角丸控えめ、影弱め、線薄め）
- [x] アイコン統一（線アイコンのみ）

### Member トップページ
- [x] 4枚カード配置（雑誌の目次風）
- [x] 9年ローテ表表示
- [x] 対象範囲固定カード表示（地域/建物/年度）
- [x] 最新更新表示
- [x] モバイルレスポンシブ確認

### 各機能ページ
- [x] 年間カレンダー（月別の行事/締切/準備ToDo）
- [x] 河川清掃（SOP + 実施ログ）
- [x] 倉庫・備品台帳
- [x] テンプレ置き場
- [x] ルール・決定事項（会費 / 免除・ローテ / 出不足金）
- [x] 年度ログ（証跡タイムライン）
- [x] 返信待ちキュー（詳細）
- [x] 引き継ぎ袋（チェックリスト）
- [x] FAQ（根拠リンク必須）
- [x] Admin ダッシュボード

## フェーズ 4: 初期データ（Seed）投入

### Member トップ用 Seed
- [x] 「今週やること」3件（仮）
- [x] 「最優先3課題」3件（ローテ9年 / 会費誤徴収防止 / 河川清掃SOP）
- [x] 「未解決（仮説）」3件（出不足金の扱い / 免除条件の条文化 / 過去担当履歴の穴）
- [x] pending_queue 3件（組織宛、未返信想定）
- [x] leader_schedule：先9年分の枠作成（住戸IDはダミー）

### 業務データ Seed
- [x] 河川清掃SOP：チェックリスト雛形（準備 / 当日 / 片付け / 申し送り）
- [x] ルール：会費徴収(decided) + 免除/ローテ(pending) + 出不足金(pending)
- [x] 備品：ダミー10件（写真はプレースホルダ）
- [x] テンプレ：依頼文 / 確認文 / 住民案内 / 未返信リマインド
- [x] 年度ログ：サンプル5件（問い合わせ → 回答 → 決定 → 未決 → 改善提案）
- [x] changelog：サンプル3件
- [x] households：ダミー10件（unitId 101～110）
- [x] leader_rotation_logic：初期ロジック設定
- [x] exemption_requests：サンプル2件
- [x] handover_bag_items：チェックリスト10件

## フェーズ 5: テストと最終調整

### 機能テスト
- [ ] ローテ自動計算ロジックテスト
- [ ] 全文検索テスト（河川、備品、会費、免除、出不足金、引き継ぎ袋、ローテ）
- [ ] ロール別アクセス制御テスト（Public / Member / Editor / Admin）
- [ ] 投稿承認フローテスト

### UX テスト
- [ ] Member トップで全体像が1画面で伝わるか確認
- [ ] Top → 河川清掃 / 備品 / ルール / ログ / Pending / 引き継ぎ袋に3タップ以内で到達
- [ ] 決定 / 未決（仮説） / 証跡ログが混ざっていないか確認
- [ ] Pending（未返信）が次年度に引き継げるか確認
- [ ] 個人情報ガード（注意文 + 警告 + secret_notes 隔離）確認
- [ ] モバイルレスポンシブテスト

### デザインテスト
- [ ] 港区ミニマル・ラグジュアリー適用確認
- [ ] 余白・タイポ・色・アニメが基準を満たしているか確認
- [ ] 情報可読性が落ちていないか確認

## 合格条件チェック
- [x] Member トップで「今週やること」「最優先」「未解決（仮説）」「返信待ち」「先9年ローテ」が見える
- [ ] Top → 各ページに3タップ以内で到達
- [ ] 決定 / 未決（仮説） / 証跡ログが分離されている
- [ ] Pending（未返信）が次年度に引き継げる
- [ ] 検索で「河川」「備品」「会費」「免除」「出不足金」「引き継ぎ袋」「ローテ」がヒット
- [ ] 個人情報ガード完全
- [ ] Editor は公開不可、Admin 承認必須
- [ ] 港区ミニマル・ラグジュアリーデザイン適用完了
