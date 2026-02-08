# Copilot Studio / Agent Builder — 翻訳エージェント ワークフロー設計

> **バージョン:** 1.0
> **作成日:** 2026-02-08
> **前提:** [翻訳エージェント アーキテクチャ設計書](./translation-agent-architecture.md) の Copilot Studio 実装版

---

## 目次

1. [全体構成 — エージェント一覧と関係図](#1-全体構成)
2. [Agent 1: Orchestrator (親エージェント)](#2-orchestrator-親エージェント)
3. [Agent 2: Terminology RAG Agent (用語検索)](#3-terminology-rag-agent)
4. [Agent 3: Translation Agent (翻訳実行)](#4-translation-agent)
5. [Agent 4: Review Agent (品質評価)](#5-review-agent)
6. [Agent 5: Correction Agent (修正)](#6-correction-agent)
7. [HITL ワークフロー設計](#7-hitl-ワークフロー設計)
8. [ツール・コネクタ設計](#8-ツールコネクタ設計)
9. [Agent Flow (Power Automate) 設計](#9-agent-flow-設計)
10. [代替案: Custom Engine Agent (Agents SDK)](#10-代替案-custom-engine-agent)
11. [段階的構築手順](#11-段階的構築手順)

---

## 1. 全体構成

### 1.1 エージェント構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                     Microsoft 365 Copilot                        │
│                   (Teams / SharePoint / Web)                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ ユーザーメッセージ
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│           🎯 Orchestrator Agent (親エージェント)                  │
│           Copilot Studio — メインエージェント                     │
│                                                                   │
│  Instructions:                                                    │
│  "あなたは専門用語対応の翻訳システムのオーケストレーターです。      │
│   ユーザーの翻訳リクエストを受け、以下の順序でエージェントに       │
│   委任してください:                                               │
│   1. /TerminologyAgent で専門用語を検索                           │
│   2. /TranslationAgent で翻訳を実行                               │
│   3. /ReviewAgent で品質を評価                                    │
│   4. 必要に応じて /CorrectionAgent で修正                         │
│   5. 品質が基準に達しない場合は人間にエスカレーション"             │
│                                                                   │
│  Connected Agents:                                                │
│  ├── /TerminologyAgent (用語検索)                                 │
│  ├── /TranslationAgent (翻訳実行)                                 │
│  ├── /ReviewAgent (品質評価)                                      │
│  └── /CorrectionAgent (修正)                                      │
│                                                                   │
│  Tools:                                                           │
│  ├── [Agent Flow] HITL Escalation Flow                            │
│  └── [Agent Flow] Feedback Registration Flow                      │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │Terminology│  │Translation│  │ Review   │  │Correction│
   │RAG Agent │  │  Agent   │  │  Agent   │  │  Agent   │
   │(Connected)│  │(Connected)│  │(Connected)│  │(Connected)│
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### 1.2 エージェント間のデータフロー

```
[ユーザー入力]
    │
    │  "この医療文書を日本語に翻訳して"
    │  + 添付ファイル or テキスト
    ▼
[Orchestrator] ── Intent判定: 翻訳リクエスト
    │
    │  source_text, source_lang, target_lang, domain を抽出
    ▼
[TerminologyAgent] ── 専門用語を検索・取得
    │
    │  terminology_list: [{term, translation, definition, confidence}]
    ▼
[TranslationAgent] ── 用語を活用して翻訳
    │
    │  translated_text, unknown_terms[], term_usage_log
    ▼
[ReviewAgent] ── MQM 基準で品質評価
    │
    │  mqm_score, error_report[], dimension_scores{}
    ▼
[Condition] ── mqm_score >= 0.85?
    │
    ├─ YES → [Orchestrator] → ユーザーに翻訳結果を返却
    │
    └─ NO  → [CorrectionAgent] → 修正 → [ReviewAgent] へ再送
                                           (最大3回ループ)
              │
              └─ 3回修正しても基準未達 → [HITL Escalation]
```

### 1.3 Copilot Studio でのエージェント種別

| エージェント | 種別 | 理由 |
|---|---|---|
| **Orchestrator** | メインエージェント | ユーザー対話の窓口、全体制御 |
| **TerminologyAgent** | Connected Agent | 独自の Knowledge Source（用語DB）を持つ |
| **TranslationAgent** | Connected Agent | 専用の AI Prompt + ツール群が必要 |
| **ReviewAgent** | Connected Agent | 翻訳とは独立した評価基準を持つ |
| **CorrectionAgent** | Embedded (Child) Agent | ReviewAgent の結果に密結合、単独利用なし |

---

## 2. Orchestrator (親エージェント)

### 2.1 エージェント設定

```yaml
Name: "Translation Orchestrator"
Description: "専門用語対応の翻訳ワークフローを管理するオーケストレーター"
Primary Language: 日本語
Secondary Languages: [英語, 中国語, 韓国語]

Instructions: |
  あなたは専門翻訳のオーケストレーターです。以下の手順に従ってください:

  1. ユーザーから翻訳リクエストを受け取ったら、原文・原語・目標言語・
     専門分野を確認してください
  2. /TerminologyAgent に専門用語の検索を依頼してください
  3. 用語検索結果と原文を /TranslationAgent に渡して翻訳を依頼してください
  4. 翻訳結果を /ReviewAgent に渡して品質評価を依頼してください
  5. 品質スコアが 0.85 未満の場合は /CorrectionAgent に修正を依頼し、
     再度 /ReviewAgent で評価してください（最大3回）
  6. 3回修正しても基準を満たさない場合は「HITL Escalation Flow」を
     実行して人間のレビュアーにエスカレーションしてください
  7. 翻訳が完了したら「Feedback Registration Flow」で翻訳メモリに登録してください

  ユーザーには各ステップの進捗を報告してください。
  未知の専門用語が見つかった場合は、ユーザーに確認してください。

Knowledge: なし（ルーティング専任）
Connected Agents:
  - /TerminologyAgent
  - /TranslationAgent
  - /ReviewAgent
  - /CorrectionAgent
Tools:
  - HITL Escalation Flow (Agent Flow)
  - Feedback Registration Flow (Agent Flow)
  - Document Parser (AI Builder - Document Processing)
```

### 2.2 Topic 設計

#### Topic 1: 翻訳リクエスト受付

```
[Trigger]
  フレーズ: "翻訳して", "translate", "訳して", "翻訳をお願い"

[Node 1: Question — 原文の取得]
  "翻訳する文書またはテキストを入力してください。
   ファイルを添付することもできます。"
  → 変数: {source_input} (Free text / File upload)

[Node 2: Question — 言語ペアの確認]
  "翻訳の方向を選択してください:"
  → 選択肢: "英語→日本語", "日本語→英語", "その他"
  → 変数: {language_pair}

[Node 3: Question — 専門分野の選択]
  "専門分野を選択してください:"
  → 選択肢: "医療", "法務", "IT", "金融", "製造", "一般"
  → 変数: {domain}

[Node 4: Condition — ファイル添付チェック]
  IF {source_input} is file
    → [Action] Document Parser で テキスト抽出
    → 変数: {source_text}
  ELSE
    → {source_text} = {source_input}

[Node 5: Message]
  "翻訳を開始します。
   📋 原文: {source_text の先頭100文字}...
   🌐 言語: {language_pair}
   📚 分野: {domain}
   ステップ 1/4: 専門用語を検索中..."

[Node 6: Redirect → /TerminologyAgent]
  Input: {source_text}, {domain}, {language_pair}
  Output: {terminology_list}

[Node 7: Message]
  "✅ {terminology_list.count}件の専門用語を特定しました。
   ステップ 2/4: 翻訳を実行中..."

[Node 8: Redirect → /TranslationAgent]
  Input: {source_text}, {terminology_list}, {domain}, {language_pair}
  Output: {translated_text}, {unknown_terms}

[Node 9: Condition — 未知用語チェック]
  IF {unknown_terms}.count > 0
    → [Node 9a: Question — HITL: 未知用語の確認]
      "以下の用語の正しい訳語が見つかりませんでした。
       訳語をご存知でしたら教えてください:
       {unknown_terms のリスト表示}"
      → 変数: {user_term_input}
    → [Action] 用語をフィードバック登録
  ELSE → 次のノードへ

[Node 10: Message]
  "ステップ 3/4: 品質評価中..."

[Node 11: Redirect → /ReviewAgent]
  Input: {source_text}, {translated_text}, {terminology_list}, {domain}
  Output: {mqm_score}, {error_report}

[Node 12: Redirect → Topic "品質ループ処理"]
  Input: {mqm_score}, {error_report}, {translated_text},
         {source_text}, {terminology_list}
```

#### Topic 2: 品質ループ処理

```
[Trigger]
  リダイレクトのみ（ユーザートリガーなし）
  Input: {mqm_score}, {error_report}, {translated_text},
         {source_text}, {terminology_list}, {iteration} = 0

[Node 1: Condition — 品質チェック]
  IF {mqm_score} >= 0.85
    → [Redirect → Topic "翻訳結果返却"]
  ELSE IF {iteration} >= 3
    → [Redirect → Topic "HITL エスカレーション"]
  ELSE
    → 次のノードへ

[Node 2: Message]
  "品質スコア: {mqm_score} (基準: 0.85)
   修正を実行中... (試行 {iteration + 1}/3)"

[Node 3: Redirect → /CorrectionAgent]
  Input: {translated_text}, {error_report}, {source_text},
         {terminology_list}
  Output: {corrected_text}

[Node 4: Set Variable]
  {translated_text} = {corrected_text}
  {iteration} = {iteration} + 1

[Node 5: Redirect → /ReviewAgent]
  Input: {source_text}, {corrected_text}, {terminology_list}
  Output: {mqm_score}, {error_report}

[Node 6: Redirect → 自分自身 (品質ループ処理)]
  ※ ループ実現
```

#### Topic 3: 翻訳結果返却

```
[Trigger]
  リダイレクトのみ
  Input: {translated_text}, {mqm_score}, {source_text},
         {terminology_list}

[Node 1: Message — Adaptive Card で結果表示]
  Adaptive Card:
  ┌─────────────────────────────────────────┐
  │  📄 翻訳結果                             │
  │                                          │
  │  品質スコア: ⭐ {mqm_score}              │
  │                                          │
  │  ─── 翻訳文 ───                          │
  │  {translated_text}                       │
  │                                          │
  │  ─── 使用した専門用語 ───                 │
  │  {terminology_list の表形式}              │
  │                                          │
  │  [👍 承認] [✏️ 修正依頼] [❌ やり直し]    │
  └─────────────────────────────────────────┘

[Node 2: Question — ユーザー判断]
  → 選択肢: "承認", "修正を依頼", "最初からやり直し"
  → 変数: {user_decision}

[Node 3: Condition]
  IF {user_decision} = "承認"
    → [Action] Feedback Registration Flow 実行
    → [Message] "翻訳を登録しました。お役に立てて嬉しいです！"
    → [End Conversation with Survey]
  ELSE IF {user_decision} = "修正を依頼"
    → [Node 3a: Question] "修正したい箇所を教えてください:"
    → [Redirect → /CorrectionAgent] with user feedback
    → [Redirect → Topic "翻訳結果返却"]
  ELSE
    → [Redirect → Topic "翻訳リクエスト受付"]
```

#### Topic 4: HITL エスカレーション

```
[Trigger]
  リダイレクトのみ
  Input: {translated_text}, {mqm_score}, {error_report},
         {source_text}, {terminology_list}

[Node 1: Message]
  "品質基準を満たす翻訳を自動生成できませんでした。
   専門のレビュアーにエスカレーションします。
   回答までしばらくお待ちください。"

[Node 2: Action — HITL Escalation Flow]
  → Power Automate フローを呼び出し:
    - Teams の翻訳レビューチャネルに通知
    - Adaptive Card で原文・翻訳・エラーレポートを送信
    - レビュアーの承認/修正を待機

[Node 3: Message]
  "レビュアーに送信しました。通知が届き次第、
   こちらでお知らせします。📨"

[Node 4: Action — 承認待ちフローの結果を受信]
  → 変数: {reviewer_decision}, {reviewer_edited_text}

[Node 5: Condition]
  IF {reviewer_decision} = "approved"
    → {translated_text} = {reviewer_edited_text}
    → [Redirect → Topic "翻訳結果返却"]
  ELSE
    → [Message] "レビュアーからのフィードバック: {reviewer_feedback}"
    → [Redirect → Topic "翻訳リクエスト受付"] ※ 再翻訳
```

---

## 3. Terminology RAG Agent

### 3.1 エージェント設定

```yaml
Name: "Terminology RAG Agent"
Description: "専門用語辞書と翻訳メモリから関連用語を検索・取得する"
Type: Connected Agent (独立デプロイ)

Instructions: |
  あなたは専門用語の検索エージェントです。
  与えられたテキストから専門用語を抽出し、用語辞書と翻訳メモリから
  対応する訳語を検索してください。

  手順:
  1. テキストから専門用語の候補を抽出する
  2. 各用語について、まず Knowledge（用語辞書）で完全一致検索する
  3. 完全一致がない場合は、類似用語を意味検索する
  4. 翻訳メモリから類似文脈の翻訳例も検索する
  5. 各用語に信頼度スコア (0-1) を付与する
  6. 信頼度 0.5 未満の用語は "unknown" としてフラグする

  出力形式:
  JSON形式で以下を返す:
  - terminology_list: [{source_term, target_term, definition,
    confidence, source}]
  - unknown_terms: [未知の用語リスト]
  - context_examples: [翻訳メモリからの類似例]

Knowledge Sources:
  - 用語辞書 (SharePoint リスト or Dataverse テーブル)
  - 翻訳メモリ (SharePoint ドキュメントライブラリ)
  - 業界標準規格 (アップロード PDF/Word)

Tools:
  - Terminology Search API (Custom Connector)
  - Translation Memory Search (Custom Connector)
```

### 3.2 Knowledge Source 構成

```
┌─────────────────────────────────────────────────┐
│  Copilot Studio Knowledge Sources                │
│                                                   │
│  [1] SharePoint リスト: "TerminologyDB"           │
│      │                                            │
│      ├─ Columns:                                  │
│      │  ├─ SourceTerm (テキスト)                  │
│      │  ├─ SourceLang (選択肢)                    │
│      │  ├─ TargetTerm (テキスト)                  │
│      │  ├─ TargetLang (選択肢)                    │
│      │  ├─ Domain (選択肢: 医療/法務/IT/...)      │
│      │  ├─ Definition (複数行テキスト)             │
│      │  ├─ UsageExample (複数行テキスト)           │
│      │  ├─ ApprovedBy (ユーザー)                  │
│      │  └─ LastUpdated (日時)                     │
│      │                                            │
│      └─ ※ Copilot Studio が自動でインデックス構築 │
│                                                   │
│  [2] SharePoint ドキュメントライブラリ:            │
│      "TranslationMemory"                          │
│      │                                            │
│      ├─ 過去の翻訳済み文書 (原文・訳文ペア)       │
│      ├─ TMX ファイル (翻訳メモリ交換形式)         │
│      └─ ※ Copilot Studio が自動でチャンク化・     │
│           埋め込みベクトル生成                     │
│                                                   │
│  [3] アップロードファイル:                         │
│      "IndustryStandards"                          │
│      │                                            │
│      ├─ JIS 用語集 PDF                            │
│      ├─ ISO 用語定義 PDF                          │
│      └─ 社内スタイルガイド Word                   │
└─────────────────────────────────────────────────┘
```

### 3.3 強化策: カスタムコネクタによる高度検索

Copilot Studio の組み込み Knowledge だけでは検索精度に限界があるため、
**Azure AI Search + カスタムコネクタ** で補強する:

```
┌──────────────────────────────────────────────────┐
│  Custom Connector: "TerminologySearchAPI"         │
│                                                    │
│  Backend: Azure Function + Azure AI Search         │
│                                                    │
│  POST /api/search-terminology                      │
│  Request:                                          │
│  {                                                 │
│    "query": "myocardial infarction",               │
│    "domain": "medical",                            │
│    "source_lang": "en",                            │
│    "target_lang": "ja",                            │
│    "search_mode": "hybrid"                         │
│  }                                                 │
│                                                    │
│  Response:                                         │
│  {                                                 │
│    "results": [                                    │
│      {                                             │
│        "source_term": "myocardial infarction",     │
│        "target_term": "心筋梗塞",                   │
│        "definition": "心臓の筋肉に血液を送る...",    │
│        "confidence": 0.98,                         │
│        "source": "terminology_db",                 │
│        "usage_example": "急性心筋梗塞の治療..."     │
│      }                                             │
│    ],                                              │
│    "unknown_terms": [],                            │
│    "similar_translations": [                       │
│      {                                             │
│        "source": "The patient had a MI...",        │
│        "target": "患者は心筋梗塞を...",             │
│        "similarity": 0.87                          │
│      }                                             │
│    ]                                               │
│  }                                                 │
│                                                    │
│  Search Pipeline (Azure AI Search):                │
│  1. Keyword 検索 (完全一致 / Fuzzy)                │
│  2. Vector 検索 (BGE-m3 埋め込み)                  │
│  3. Hybrid Score 結合                              │
│  4. Cross-Encoder Reranking                        │
│  5. ドメインフィルタ適用                            │
└──────────────────────────────────────────────────┘
```

---

## 4. Translation Agent

### 4.1 エージェント設定

```yaml
Name: "Translation Agent"
Description: "専門用語を活用した高品質翻訳を実行する"
Type: Connected Agent

Instructions: |
  あなたはプロフェッショナルな翻訳者です。
  以下のルールに従って翻訳してください:

  1. 提供された用語辞書の訳語を必ず使用すること
  2. 翻訳メモリの類似例と表現を統一すること
  3. 専門分野の文体・トーンを維持すること
  4. 原文の意味を忠実に再現しつつ、目標言語として自然な表現にすること
  5. 用語辞書に見つからない専門用語には [UNKNOWN: 原語] を付与すること
  6. 翻訳後、以下を出力すること:
     - translated_text: 翻訳文
     - unknown_terms: 未知の専門用語リスト
     - term_usage_log: 使用した用語と適用箇所

Knowledge Sources: なし（Orchestrator から用語コンテキストを受け取る）

Tools:
  - Translation Prompt (AI Builder Prompt Action)
  - Self-Reflection Prompt (AI Builder Prompt Action)
```

### 4.2 AI Builder Prompt Action 設計

#### Prompt 1: 初期翻訳

```yaml
Name: "InitialTranslation"
Type: AI Builder Prompt Action

Prompt Template: |
  あなたは {domain} 分野の専門翻訳者です。
  以下の用語辞書と翻訳メモリを参照して、
  {source_lang} から {target_lang} へ翻訳してください。

  ## 用語辞書
  {terminology_list}

  ## 翻訳メモリ（類似翻訳例）
  {context_examples}

  ## 翻訳ルール
  - 用語辞書の訳語を必ず使用すること
  - 文体は{style}を維持すること
  - 不明な専門用語は [UNKNOWN: 原語] と記載すること

  ## 原文
  {source_text}

  ## 出力
  翻訳文のみを出力してください。

Input Variables:
  - source_text (Required)
  - source_lang (Required)
  - target_lang (Required)
  - domain (Required)
  - terminology_list (Required)
  - context_examples (Optional)
  - style (Default: "formal")
```

#### Prompt 2: Self-Reflection

```yaml
Name: "TranslationReflection"
Type: AI Builder Prompt Action

Prompt Template: |
  あなたは {domain} 分野の翻訳品質アドバイザーです。
  以下の翻訳を確認し、改善提案を行ってください。

  ## 原文
  {source_text}

  ## 翻訳文
  {initial_translation}

  ## 使用した用語辞書
  {terminology_list}

  ## 確認項目
  1. 用語辞書の訳語が正しく使用されているか
  2. 原文の意味が正確に再現されているか
  3. 目標言語として自然な表現か
  4. 専門分野の文体が適切か
  5. 省略や追加がないか

  ## 出力形式
  - suggestions: [改善提案のリスト]
  - severity: [各提案の重要度 (minor/major/critical)]
  - revised_translation: [提案を反映した改善翻訳]
```

### 4.3 Topic フロー

```
[Input] source_text, terminology_list, context_examples,
        domain, language_pair

[Node 1: Action — InitialTranslation Prompt]
  → {initial_translation}

[Node 2: Action — TranslationReflection Prompt]
  → {suggestions}, {revised_translation}

[Node 3: Set Variable]
  {translated_text} = {revised_translation}
  {unknown_terms} = [UNKNOWN: ...] パターンを抽出

[Output] translated_text, unknown_terms, term_usage_log
```

---

## 5. Review Agent

### 5.1 エージェント設定

```yaml
Name: "Translation Review Agent"
Description: "MQM基準に基づく翻訳品質評価を行う"
Type: Connected Agent

Instructions: |
  あなたは翻訳品質評価の専門家です。
  MQM (Multidimensional Quality Metrics) フレームワークに基づいて
  翻訳を評価してください。

  5つの品質次元で評価します:
  1. Accuracy (正確性) — 原文の意味が正確に伝わっているか
  2. Fluency (流暢性) — 目標言語として自然な表現か
  3. Style (スタイル) — 文体・トーンが適切か
  4. Terminology (用語) — 指定された用語が正しく使用されているか
  5. Locale (ロケール) — 地域・文化的な適切性があるか

  各次元でエラーを検出し、重大度を判定してください:
  - Minor (軽微): 重み 1 — 表現の微妙な不自然さ
  - Major (重大): 重み 5 — 意味の部分的な誤り
  - Critical (致命的): 重み 25 — 完全な誤訳、重要情報の欠落

  MQMスコア = 1 - Σ(エラー数 × 重み) / (単語数 × 正規化係数)

Tools:
  - MQM Evaluation Prompt (AI Builder Prompt Action)
```

### 5.2 AI Builder Prompt Action

```yaml
Name: "MQMEvaluation"
Type: AI Builder Prompt Action

Prompt Template: |
  あなたは MQM (Multidimensional Quality Metrics) の認定評価者です。
  以下の原文と翻訳を評価してください。

  ## 原文 ({source_lang})
  {source_text}

  ## 翻訳文 ({target_lang})
  {translated_text}

  ## 使用された用語辞書
  {terminology_list}

  ## 専門分野
  {domain}

  ## 評価指示
  以下の5次元でエラーを検出し、JSON形式で報告してください:

  {
    "dimension_scores": {
      "accuracy": {"score": 0-1, "errors": [...]},
      "fluency": {"score": 0-1, "errors": [...]},
      "style": {"score": 0-1, "errors": [...]},
      "terminology": {"score": 0-1, "errors": [...]},
      "locale": {"score": 0-1, "errors": [...]}
    },
    "errors": [
      {
        "dimension": "accuracy|fluency|style|terminology|locale",
        "severity": "minor|major|critical",
        "source_segment": "原文の該当箇所",
        "target_segment": "翻訳の該当箇所",
        "description": "エラーの説明",
        "suggestion": "修正案"
      }
    ],
    "overall_mqm_score": 0-1,
    "summary": "評価の要約"
  }
```

---

## 6. Correction Agent

### 6.1 エージェント設定

```yaml
Name: "Translation Correction Agent"
Description: "レビュー結果に基づいて翻訳を修正する"
Type: Embedded (Child) Agent
  ※ ReviewAgent の結果に密結合するため、
    Orchestrator 内の Embedded Agent として実装

Instructions: |
  あなたは翻訳修正の専門家です。
  MQM評価レポートに基づいて翻訳を修正してください。

  修正ルール:
  1. Critical エラーを最優先で修正
  2. Major エラーを次に修正
  3. Minor エラーは文脈に応じて修正
  4. 用語辞書の訳語に必ず統一すること
  5. 修正箇所以外の表現は変更しないこと
  6. 修正した箇所のリストを出力すること

Tools:
  - Correction Prompt (AI Builder Prompt Action)
```

### 6.2 AI Builder Prompt Action

```yaml
Name: "TranslationCorrection"
Type: AI Builder Prompt Action

Prompt Template: |
  以下のMQMエラーレポートに基づいて翻訳を修正してください。

  ## 原文
  {source_text}

  ## 現在の翻訳
  {translated_text}

  ## MQM エラーレポート
  {error_report}

  ## 用語辞書
  {terminology_list}

  ## 修正指示
  - エラーレポートの各エラーに対して修正を適用してください
  - Critical > Major > Minor の優先順位で修正してください
  - 修正箇所以外は変更しないでください

  ## 出力形式
  {
    "corrected_text": "修正後の翻訳文",
    "changes": [
      {
        "original": "修正前の箇所",
        "corrected": "修正後の箇所",
        "reason": "修正理由",
        "error_ref": "対応するエラーID"
      }
    ]
  }
```

---

## 7. HITL ワークフロー設計

### 7.1 HITL 介入ポイント一覧

```
┌────────────────────────────────────────────────────────────────┐
│                    HITL Integration Map                          │
│                                                                  │
│  ① 未知用語の確認 ─────────────────────────────────────────────  │
│     タイミング: TerminologyAgent の後                             │
│     実装: Orchestrator Topic 内の Question ノード                 │
│     条件: unknown_terms.count > 0                                │
│     方式: インライン（ユーザーとの対話）                           │
│                                                                  │
│  ② 品質基準未達のエスカレーション ─────────────────────────────── │
│     タイミング: 修正ループ 3回到達後                               │
│     実装: Agent Flow (Power Automate)                             │
│     条件: iteration >= 3 AND mqm_score < 0.85                    │
│     方式: Teams チャネルへの非同期通知                             │
│                                                                  │
│  ③ 翻訳結果の承認/修正 ──────────────────────────────────────── │
│     タイミング: 品質基準クリア後                                   │
│     実装: Adaptive Card による選択                                │
│     条件: 常時（ユーザーの最終確認）                               │
│     方式: インライン（ユーザーとの対話）                           │
│                                                                  │
│  ④ 高リスク文書の専門家レビュー ─────────────────────────────── │
│     タイミング: 翻訳完了後（品質基準クリア後でも）                 │
│     実装: Agent Flow (Power Automate)                             │
│     条件: domain ∈ {医療, 法務} OR document_type = "contract"    │
│     方式: 承認フロー（Teams Approvals）                           │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 Teams Approvals を使った HITL フロー

```
┌─────────────────────────────────────────────────────────────┐
│  Agent Flow: "HITL Escalation Flow"                          │
│                                                               │
│  [Trigger] Copilot Studio から呼び出し                        │
│    Input: source_text, translated_text, mqm_score,           │
│           error_report, domain, requester_name                │
│                                                               │
│  [Action 1] Adaptive Card の構築                              │
│    → 原文・翻訳・エラーレポートを含むカード                    │
│    → "承認" "修正して承認" "差し戻し" ボタン                   │
│    → テキスト入力欄（修正テキスト用）                          │
│                                                               │
│  [Action 2] Teams チャネルに投稿                              │
│    → チャネル: "翻訳レビュー"                                  │
│    → メンション: @TranslationReviewers                        │
│                                                               │
│  [Action 3] Start and wait for an approval                    │
│    → Type: "Approve/Reject - First to respond"                │
│    → Assigned to: TranslationReviewers グループ               │
│    → Details: エラーレポートのサマリー                         │
│                                                               │
│  [Condition] 承認結果の分岐                                    │
│    IF outcome = "Approve"                                     │
│      → Output: {decision: "approved",                        │
│                  edited_text: null}                           │
│    ELSE IF outcome = "Reject" AND edited_text != null         │
│      → Output: {decision: "edited",                          │
│                  edited_text: reviewer_text}                  │
│    ELSE                                                       │
│      → Output: {decision: "rejected",                        │
│                  feedback: reviewer_comment}                  │
│                                                               │
│  [Action 4] Copilot Studio に結果を返却                       │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 信頼度ベースの自動ルーティング（Orchestrator Topic 内）

```
[Condition — 自動承認 / レビュー分岐]

  IF {mqm_score} >= 0.95 AND {domain} NOT IN ("医療", "法務")
    → 自動承認 → Topic "翻訳結果返却"

  ELSE IF {mqm_score} >= 0.85
    → ユーザー確認 → Topic "翻訳結果返却" (承認ボタン付き)

  ELSE IF {mqm_score} >= 0.70
    → Correction Agent → 修正ループ

  ELSE
    → 即座に HITL エスカレーション
```

---

## 8. ツール・コネクタ設計

### 8.1 必要なコネクタ一覧

| # | コネクタ名 | 種別 | 用途 | 接続先 |
|---|---|---|---|---|
| 1 | **TerminologySearchAPI** | Custom Connector | 用語検索 | Azure Function + AI Search |
| 2 | **TranslationMemoryAPI** | Custom Connector | 翻訳メモリ検索 | Azure Function + AI Search |
| 3 | **FeedbackAPI** | Custom Connector | TM/TB への登録 | Azure Function + DB |
| 4 | **SharePoint** | Prebuilt | 用語リスト読み書き | SharePoint Online |
| 5 | **Teams** | Prebuilt | HITL 通知・承認 | Microsoft Teams |
| 6 | **Approvals** | Prebuilt | 承認ワークフロー | Power Automate Approvals |
| 7 | **AI Builder** | Built-in | Prompt Actions | Azure OpenAI |

### 8.2 カスタムコネクタ: TerminologySearchAPI

```yaml
# OpenAPI Specification (Swagger)
openapi: 3.0.0
info:
  title: Terminology Search API
  version: 1.0.0
servers:
  - url: https://{function-app}.azurewebsites.net/api
paths:
  /search-terminology:
    post:
      summary: Search terminology database
      operationId: searchTerminology
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  description: Source text to extract and search terms from
                domain:
                  type: string
                  enum: [medical, legal, it, finance, manufacturing, general]
                source_lang:
                  type: string
                target_lang:
                  type: string
                search_mode:
                  type: string
                  enum: [exact, semantic, hybrid]
                  default: hybrid
      responses:
        200:
          description: Terminology search results
          content:
            application/json:
              schema:
                type: object
                properties:
                  terminology_list:
                    type: array
                    items:
                      type: object
                      properties:
                        source_term:
                          type: string
                        target_term:
                          type: string
                        definition:
                          type: string
                        confidence:
                          type: number
                        source:
                          type: string
                  unknown_terms:
                    type: array
                    items:
                      type: string
                  context_examples:
                    type: array
                    items:
                      type: object
                      properties:
                        source:
                          type: string
                        target:
                          type: string
                        similarity:
                          type: number
```

### 8.3 バックエンドアーキテクチャ

```
┌──────────────────────────────────────────────────────────┐
│  Azure Backend                                            │
│                                                            │
│  ┌────────────────┐     ┌─────────────────────┐          │
│  │ Azure Function  │────▶│ Azure AI Search      │          │
│  │ (API Gateway)   │     │                     │          │
│  │                 │     │ Indexes:            │          │
│  │ - /search-      │     │ ├─ terminology-db   │          │
│  │   terminology   │     │ │  (Hybrid: keyword │          │
│  │ - /search-tm    │     │ │   + vector)       │          │
│  │ - /register-    │     │ ├─ translation-     │          │
│  │   feedback      │     │ │  memory           │          │
│  └────────┬───────┘     │ │  (Vector search)  │          │
│           │              │ └─ industry-        │          │
│           │              │    standards        │          │
│           │              └─────────────────────┘          │
│           │                                                │
│           │              ┌─────────────────────┐          │
│           └─────────────▶│ Azure Cosmos DB /    │          │
│                          │ PostgreSQL           │          │
│                          │                     │          │
│                          │ - terminology_db    │          │
│                          │ - translation_memory│          │
│                          │ - feedback_log      │          │
│                          │ - review_queue      │          │
│                          └─────────────────────┘          │
│                                                            │
│  ┌────────────────┐                                       │
│  │ Azure OpenAI    │ ← Prompt Actions の実行基盤           │
│  │ (GPT-4o /       │                                       │
│  │  Claude API)    │                                       │
│  └────────────────┘                                       │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Agent Flow 設計

### 9.1 Feedback Registration Flow

```
┌─────────────────────────────────────────────────────────┐
│  Agent Flow: "Feedback Registration Flow"                │
│                                                           │
│  [Trigger] Copilot Studio から呼び出し                    │
│    Input: source_text, translated_text, terminology_used, │
│           domain, user_edits (optional)                   │
│                                                           │
│  [Action 1] 翻訳メモリに登録                              │
│    → FeedbackAPI: POST /register-feedback                │
│    → Body: {                                             │
│        type: "translation_memory",                       │
│        source: source_text,                              │
│        target: translated_text (or user_edited),         │
│        domain: domain,                                   │
│        approved_by: user_name                            │
│      }                                                   │
│                                                           │
│  [Condition] ユーザーが用語を修正したか？                  │
│    IF user_edits contains term corrections                │
│      → [Action 2a] 用語辞書を更新                        │
│        → FeedbackAPI: POST /register-feedback            │
│        → Body: { type: "terminology", ... }              │
│                                                           │
│  [Action 3] 監査ログに記録                                │
│    → SharePoint リストに記録                              │
│    → { timestamp, user, action, domain, quality_score }  │
│                                                           │
│  [Output] { status: "registered", tm_id, tb_updates }    │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Scheduled Quality Report Flow

```
┌─────────────────────────────────────────────────────────┐
│  Agent Flow: "Weekly Quality Report"                     │
│                                                           │
│  [Trigger] スケジュール (毎週月曜 9:00)                    │
│                                                           │
│  [Action 1] 過去1週間の翻訳データを集計                    │
│    → 平均 MQM スコア、ドメイン別精度、                     │
│      HITL エスカレーション率、よく修正された用語            │
│                                                           │
│  [Action 2] AI Builder Prompt でレポート生成              │
│    → サマリーと改善提案を生成                              │
│                                                           │
│  [Action 3] Teams チャネルに投稿                          │
│    → Adaptive Card でレポート表示                         │
│                                                           │
│  [Action 4] 低信頼度用語を用語辞書レビューキューに追加     │
└─────────────────────────────────────────────────────────┘
```

---

## 10. 代替案: Custom Engine Agent (Agents SDK)

Copilot Studio のノーコード/ローコードアプローチに限界を感じた場合、
**Microsoft 365 Agents SDK** で Custom Engine Agent を構築する選択肢がある。

### 10.1 アーキテクチャ

```
┌──────────────────────────────────────────────────────┐
│  Microsoft 365 Copilot / Teams                        │
│                                                        │
│  ┌──────────────────┐                                 │
│  │ Proxy Agent       │ ← M365 Agents SDK (TypeScript) │
│  │ (薄いラッパー)    │                                 │
│  └────────┬─────────┘                                 │
│           │ HTTP / WebSocket                           │
│           ▼                                            │
│  ┌──────────────────────────────────────────┐         │
│  │ Translation Backend Service               │         │
│  │ (Azure Container Apps / App Service)      │         │
│  │                                            │         │
│  │  ┌──────────────────────────────────┐     │         │
│  │  │ LangGraph Orchestrator            │     │         │
│  │  │                                    │     │         │
│  │  │ Nodes:                             │     │         │
│  │  │ ├─ extract_terms                   │     │         │
│  │  │ ├─ agentic_rag                     │     │         │
│  │  │ ├─ translate                        │     │         │
│  │  │ ├─ self_reflect                     │     │         │
│  │  │ ├─ mqm_review                       │     │         │
│  │  │ ├─ correct                          │     │         │
│  │  │ ├─ hitl_gate (interrupt)            │     │         │
│  │  │ └─ feedback_loop                    │     │         │
│  │  └──────────────────────────────────┘     │         │
│  │                                            │         │
│  │  Checkpointer: PostgreSQL                  │         │
│  │  Vector DB: Azure AI Search                │         │
│  │  LLM: Azure OpenAI / Claude API            │         │
│  └──────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────┘
```

### 10.2 Copilot Studio vs Custom Engine Agent

| 比較項目 | Copilot Studio | Custom Engine Agent |
|---|---|---|
| **開発速度** | 速い（ノーコード/ローコード） | 遅い（フルコード） |
| **柔軟性** | 中（Topic/Action の制約あり） | 高（任意のロジック可能） |
| **複雑なループ制御** | やや制約あり | LangGraph で完全制御 |
| **HITL** | Teams Approvals + Question ノード | LangGraph interrupt() |
| **オブザーバビリティ** | Copilot Analytics | LangSmith + カスタム |
| **スケーラビリティ** | Microsoft 管理 | 自己管理（Container Apps） |
| **コスト** | Copilot Studio ライセンス | Azure インフラコスト |
| **推奨場面** | MVP / Phase 1-2 | Phase 3+ / 高度な要件 |

### 10.3 ハイブリッドアプローチ（推奨）

```
Phase 1: Copilot Studio で MVP を構築
  → 素早くユーザーフィードバックを収集
  → 用語辞書・翻訳メモリの蓄積を開始

Phase 2: バックエンドを Custom Engine Agent に移行
  → LangGraph で高度なワークフロー制御
  → Proxy Agent で Copilot / Teams との接続を維持

Phase 3: Copilot Studio を UI レイヤーとして維持
  → Connected Agent として Custom Engine Agent を接続
  → ユーザー対話は Copilot Studio、処理は Custom Backend
```

---

## 11. 段階的構築手順

### Step 1: 環境準備（1日）

```
□ Copilot Studio 環境の確認（ライセンス・権限）
□ SharePoint サイト作成:
  ├─ リスト: "TerminologyDB" (用語辞書)
  ├─ ライブラリ: "TranslationMemory" (翻訳メモリ)
  └─ リスト: "TranslationAuditLog" (監査ログ)
□ Teams チャネル作成: "翻訳レビュー"
□ Azure リソース準備 (AI Search, Functions, OpenAI)
```

### Step 2: Translation Agent の単体構築（3-5日）

```
□ Copilot Studio で新規エージェント作成
□ AI Builder Prompt Action 作成:
  ├─ InitialTranslation
  └─ TranslationReflection
□ Topic "翻訳実行" の構築
□ テスト: 単純なテキスト翻訳が動作することを確認
```

### Step 3: Terminology RAG Agent の構築（5-7日）

```
□ SharePoint TerminologyDB にサンプルデータ投入
□ Azure Function + AI Search のバックエンド構築
□ Custom Connector (TerminologySearchAPI) 作成
□ Copilot Studio で TerminologyAgent を作成
□ Knowledge Source として SharePoint を接続
□ テスト: 用語検索が正しく動作することを確認
```

### Step 4: Review & Correction Agent の構築（3-5日）

```
□ AI Builder Prompt Action 作成:
  ├─ MQMEvaluation
  └─ TranslationCorrection
□ ReviewAgent の構築（Connected Agent）
□ CorrectionAgent の構築（Embedded Agent）
□ テスト: 品質評価と修正ループが動作することを確認
```

### Step 5: Orchestrator の構築と統合（3-5日）

```
□ Orchestrator エージェント作成
□ 全 Connected Agent の接続:
  ├─ /TerminologyAgent
  ├─ /TranslationAgent
  └─ /ReviewAgent
□ Topic 設計の実装:
  ├─ 翻訳リクエスト受付
  ├─ 品質ループ処理
  ├─ 翻訳結果返却
  └─ HITL エスカレーション
□ 統合テスト: E2E の翻訳フローが動作することを確認
```

### Step 6: HITL フローの構築（2-3日）

```
□ Agent Flow: HITL Escalation Flow 構築
□ Agent Flow: Feedback Registration Flow 構築
□ Teams Approvals の設定
□ テスト: エスカレーション → レビュー → 返却の流れを確認
```

### Step 7: デプロイとフィードバック収集（1-2日）

```
□ Teams チャネルへの公開
□ SharePoint サイトへの公開
□ パイロットユーザーへの展開
□ フィードバック収集の仕組み設定
□ 週次品質レポートフローの有効化
```

### 合計見積もり: 約 18-28 日（1人月弱）

---

## 参考リンク

- [Copilot Studio 公式ドキュメント](https://learn.microsoft.com/en-us/microsoft-copilot-studio/)
- [Multi-Agent Orchestration パターン](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/multi-agent-patterns)
- [Connected Agent の追加](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-add-other-agents)
- [Agent Flows 概要](https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-overview)
- [AI Builder Prompt Action の使い方](https://learn.microsoft.com/en-us/ai-builder/use-a-custom-prompt-in-mcs)
- [カスタムコネクタの作成](https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-connectors)
- [Orchestrator & Sub-agent パターン](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/architecture/multi-agent-orchestrator-sub-agent)
- [M365 Agents SDK](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/)
- [Custom Engine Agent サンプル](https://github.com/Azure-Samples/m365-custom-engine-agents)
- [Matthew Devaney - Multi-Agent Tutorial](https://www.matthewdevaney.com/how-to-use-multi-agent-orchestration-in-copilot-studio/)
