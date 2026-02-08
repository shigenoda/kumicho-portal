# 専門用語対応 翻訳エージェント アーキテクチャ設計書

> **バージョン:** 1.0
> **作成日:** 2026-02-08
> **対象:** Agent Teams / Copilot Studio を活用したマルチエージェント翻訳システム

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [リサーチ結果の概要](#2-リサーチ結果の概要)
3. [アーキテクチャ全体像](#3-アーキテクチャ全体像)
4. [Phase 1: Agentic RAG — 専門用語検索設計](#4-phase-1-agentic-rag--専門用語検索設計)
5. [Phase 2: 翻訳エージェント設計](#5-phase-2-翻訳エージェント設計)
6. [Phase 3: レビュー＆修正エージェント協働](#6-phase-3-レビュー修正エージェント協働)
7. [Phase 4: Human-in-the-Loop (HITL) 統合](#7-phase-4-human-in-the-loop-hitl-統合)
8. [批判的レビュー — リスクと課題](#8-批判的レビュー--リスクと課題)
9. [最終アーキテクチャ計画](#9-最終アーキテクチャ計画)
10. [技術選定マトリクス](#10-技術選定マトリクス)
11. [参考文献](#11-参考文献)

---

## 1. エグゼクティブサマリー

本ドキュメントは、**専門用語に対応した翻訳エージェントシステム**のアーキテクチャ設計をまとめたものである。単純な翻訳だけでなく、以下の4つの軸を統合的に設計する。

| 軸 | 概要 |
|---|---|
| **Agentic RAG** | 専門用語辞書・翻訳メモリをエージェントが自律的に検索・取得 |
| **翻訳エージェント** | 取得した用語を活用し、文脈を踏まえた高品質翻訳を実行 |
| **レビュー＆修正エージェント** | MQM基準に基づく品質評価と反復的な修正ループ |
| **HITL** | 信頼度ベースのルーティングで人間の介入ポイントを最適化 |

---

## 2. リサーチ結果の概要

### 2.1 マルチエージェントオーケストレーション（業界動向）

**Microsoft Copilot Studio（2025-2026）** では、マルチエージェントオーケストレーションが正式にサポートされた。3つの統合パターンが提供されている：

- **Embedded (Child) Agents**: 親エージェント内の軽量子エージェント
- **Connected Agents**: 独立デプロイされた専門エージェント間のルーティング
- **MCP (Model Context Protocol)**: JSON-RPCベースのオープン標準でツール/データ接続を標準化

**Semantic Kernel** は Sequential / Concurrent / Handoff / Group Chat / Magentic の5つのオーケストレーションパターンを提供し、プラグインアーキテクチャにより各エージェントの能力をモジュール化できる。

**フレームワーク比較:**

| フレームワーク | 特徴 | 翻訳システムへの適性 |
|---|---|---|
| **LangGraph** | グラフベースの状態機械、条件分岐・ループに強い | 反復改善ループの制御に最適 |
| **CrewAI** | ロールベースのチーム編成、Flows による制御 | 役割分担が明確な翻訳チームに適合 |
| **Semantic Kernel** | Microsoft エコシステム統合、プラグインアーキテクチャ | Copilot Studio との統合に最適 |
| **AutoGen** | 会話型マルチエージェント | プロトタイピングに有用 |

### 2.2 Andrew Ng の Translation Agent

Andrew Ng のオープンソース Translation Agent は **3ステップの Reflection Workflow** を提唱している：

1. **Translate** — LLM による初期翻訳
2. **Reflect** — 翻訳に対する建設的な改善提案の生成
3. **Refine** — 提案を適用した改善翻訳

このアプローチは高い「ステアビリティ」（制御可能性）を持ち、スタイル、専門用語の扱い、地域方言の指定などをプロンプトで柔軟に制御できる。ただし、BLEU スコアでは商用サービスに劣る場合もあり、文レベル評価では限界がある。

### 2.3 MATT (Multi-Agent Translation Team)

MATT は以下のロールベースのマルチエージェントアーキテクチャを提唱：

- **Translator** — 初期翻訳
- **Proofreader** — 建設的フィードバック
- **Editor** — 口語表現・正確性の修正（追加、誤訳、省略、未翻訳の検出）
- **Editor-in-Chief** — GPT-4o を用いた意味損失の定量化

反復ループにより、翻訳損失が閾値を満たすまで改善を続ける。

### 2.4 MAATS (MQM ベースのマルチエージェント翻訳)

2025年5月に発表された最新手法。**MQM (Multidimensional Quality Metrics)** の各カテゴリに特化したエージェントを配置：

- **Accuracy Agent** — 正確性評価
- **Fluency Agent** — 流暢性評価
- **Style Agent** — スタイル評価
- **Terminology Agent** — 用語評価
- **Synthesis Agent** — 各評価を統合し翻訳を反復改善

ゼロショットや単一エージェント手法を統計的に有意に上回る結果を示した。

### 2.5 Agentic RAG

従来の静的 RAG パイプラインから、**エージェントが検索戦略を自律的に決定する Agentic RAG** への移行が進んでいる：

- **ルーティングエージェント**: クエリに基づき最適な知識ソースを選択
- **クエリ書き換え**: ドメイン固有の略語解決、サブクエリ分解
- **反復的検索**: 初回検索結果が不十分な場合に再検索戦略を動的に調整
- **Cross-Encoder リランキング**: 検索結果の精度を高める再ランク付け

### 2.6 多言語 RAG とクロスリンガル検索

- **多言語埋め込みモデル**: BGE-m3, LaBSE, XLM-RoBERTa 等が共有意味空間でのクロスリンガル検索を実現
- **課題**: クロスリンガル設定では Hits@20 が同一言語と比べ 30-50 ポイント低下
- **対策**: ハイブリッド検索（密検索 + 翻訳品質ゲーティング）、多言語リランキング、言語認識生成制約

### 2.7 HITL パターン

LangGraph の HITL 実装が最も成熟している：

- **`interrupt()`**: グラフを任意ノードで一時停止、人間の判断を待つ
- **`Command`**: 人間入力に基づく状態更新とノードジャンプ
- **7つのデザインパターン**: Approve/Reject、State Edit、Tool Call Review、Human Edit、Multi-turn Conversation、Input Validation、Confidence-based Routing

---

## 3. アーキテクチャ全体像

```
┌──────────────────────────────────────────────────────────────────┐
│                    Translation Agent System                       │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Source     │───▶│  Agentic    │───▶│ Translation │          │
│  │   Document   │    │  RAG Engine │    │   Agent     │          │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘          │
│                            │                   │                  │
│                     ┌──────▼──────┐     ┌──────▼──────┐         │
│                     │ Terminology │     │   Review    │         │
│                     │ DB / TM     │     │   Agent     │         │
│                     │ (Vector +   │     │  (MQM-based)│         │
│                     │  Structured)│     └──────┬──────┘         │
│                     └─────────────┘            │                 │
│                                          ┌─────▼──────┐         │
│                                          │ Correction  │         │
│                                          │   Agent     │         │
│                                          └──────┬──────┘         │
│                                                 │                 │
│                     ┌───────────────────────────▼───────┐        │
│                     │     HITL Gate (Confidence-based)   │        │
│                     │  ┌─────────┐    ┌──────────────┐  │        │
│                     │  │ Auto    │    │ Human Review  │  │        │
│                     │  │ Approve │    │ & Feedback    │  │        │
│                     │  └────┬────┘    └──────┬───────┘  │        │
│                     └───────┼────────────────┼──────────┘        │
│                             │                │                    │
│                             ▼                ▼                    │
│                     ┌─────────────────────────────┐              │
│                     │    Final Translation Output   │              │
│                     │  + Feedback Loop to TM/TB     │              │
│                     └─────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

### エージェント一覧

| # | エージェント | 役割 | オーケストレーション |
|---|---|---|---|
| 1 | **Terminology RAG Agent** | 専門用語・翻訳メモリの自律検索 | Agentic RAG |
| 2 | **Translation Agent** | 用語を活用した高品質翻訳の生成 | Sequential |
| 3 | **Review Agent (MQM)** | 5次元（正確性/流暢性/スタイル/用語/ロケール）品質評価 | Parallel |
| 4 | **Correction Agent** | レビュー結果に基づく修正 | Conditional Loop |
| 5 | **HITL Controller** | 信頼度に基づくルーティング＆人間介入管理 | Interrupt-based |
| 6 | **Orchestrator** | 全体のワークフロー制御とエージェント間調整 | Graph-based (LangGraph) |

---

## 4. Phase 1: Agentic RAG — 専門用語検索設計

### 4.1 なぜ Agentic RAG が必要か

従来の RAG（検索→生成の単純パイプライン）では以下の限界がある：

| 従来 RAG の限界 | Agentic RAG の解決策 |
|---|---|
| 固定的な検索クエリ | エージェントがクエリを動的に書き換え・分解 |
| 単一ソース検索 | ルーティングエージェントが最適ソースを選択 |
| 検索失敗時のフォールバックなし | 反復的検索で検索戦略を動的調整 |
| 略語・表記揺れに弱い | ドメイン認識クエリリライトで解決 |

### 4.2 アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│              Agentic RAG Engine                       │
│                                                       │
│  ┌──────────────┐                                    │
│  │ Query Router  │─── "この用語はどのDBにあるか？"      │
│  │  Agent        │                                    │
│  └──────┬───────┘                                    │
│         │                                             │
│    ┌────┼────────┬──────────┐                        │
│    ▼    ▼        ▼          ▼                        │
│  ┌────┐ ┌─────┐ ┌────────┐ ┌──────────┐            │
│  │用語│ │翻訳 │ │業界標準│ │外部知識  │            │
│  │辞書│ │メモリ│ │規格DB │ │(Web等)  │            │
│  │(TB)│ │(TM) │ │       │ │         │            │
│  └──┬─┘ └──┬──┘ └───┬───┘ └────┬────┘            │
│     │      │       │          │                    │
│     └──────┴───────┴──────────┘                    │
│                    │                                  │
│            ┌───────▼────────┐                        │
│            │ Cross-Encoder  │                        │
│            │ Reranker       │                        │
│            └───────┬────────┘                        │
│                    │                                  │
│            ┌───────▼────────┐                        │
│            │ Context        │                        │
│            │ Assembler      │                        │
│            └────────────────┘                        │
└─────────────────────────────────────────────────────┘
```

### 4.3 知識ソース設計

| ソース | 格納方式 | 検索方式 | 内容 |
|---|---|---|---|
| **用語辞書 (TB)** | 構造化DB (PostgreSQL) + ベクトルインデックス | ハイブリッド（完全一致 + 意味検索） | 原語→訳語、定義、使用文脈 |
| **翻訳メモリ (TM)** | ベクトルDB (Weaviate/Milvus) | 意味的類似度検索 | 過去の翻訳ペア (原文→訳文) |
| **業界標準規格** | 構造化DB | キーワード検索 | JIS/ISO 等の公式用語定義 |
| **外部知識** | Web 検索 API | リアルタイム検索 | 最新の用語使用例 |

### 4.4 クロスリンガル検索戦略

専門用語検索では、原語と目標言語の両方でマッチングが必要：

```
1. 原文から用語候補を抽出（NER + ドメイン固有パターン）
2. 各用語に対して:
   a. 用語辞書(TB)で完全一致検索 → ヒットなら即採用
   b. ヒットしなければ、多言語埋め込み (BGE-m3) で意味検索
   c. 翻訳メモリ(TM)からの類似文脈検索
   d. Cross-Encoder でリランキング
3. 信頼度スコアが閾値以下の場合:
   a. クエリを書き換えて再検索（略語展開、表記揺れ対応）
   b. それでもヒットしなければ「未知用語」としてフラグ → HITL
```

### 4.5 埋め込みモデル選定

| モデル | 特徴 | 推奨用途 |
|---|---|---|
| **BGE-m3** | 多言語対応、密検索・疎検索・コルバートの3方式 | メイン検索モデル |
| **LaBSE** | 100+言語対応、バイテキスト検索に強い | 翻訳メモリ検索 |
| **ドメイン固有ファインチューン** | 対象ドメインのペアデータで追加学習 | 精度が求められる専門分野 |

---

## 5. Phase 2: 翻訳エージェント設計

### 5.1 翻訳ワークフロー

Andrew Ng の Reflection Workflow を拡張し、Agentic RAG を統合：

```
┌─────────┐    ┌──────────────┐    ┌────────────┐
│ 原文    │───▶│ Agentic RAG  │───▶│ Translation│
│ 入力    │    │ (用語取得)   │    │   Agent    │
└─────────┘    └──────────────┘    └─────┬──────┘
                                         │
                                   ┌─────▼──────┐
                                   │ 初期翻訳    │
                                   │ + 用語注釈  │
                                   └─────┬──────┘
                                         │
                                   ┌─────▼──────┐
                                   │ Self-       │
                                   │ Reflection  │
                                   │ Agent       │
                                   └─────┬──────┘
                                         │
                                   ┌─────▼──────┐
                                   │ Refined     │
                                   │ Translation │
                                   └─────────────┘
```

### 5.2 翻訳エージェントのプロンプト設計（概念）

```
[System]
あなたは {domain} 分野の専門翻訳者です。
以下の用語辞書と翻訳メモリを参照して翻訳してください。

[用語辞書 (Agentic RAG から取得)]
- {source_term_1} → {target_term_1} （定義: ...）
- {source_term_2} → {target_term_2} （定義: ...）

[翻訳メモリ (類似翻訳例)]
- 原文: "..." → 訳文: "..."

[翻訳ルール]
1. 用語辞書の訳語を必ず使用すること
2. 翻訳メモリと整合性のある表現を使うこと
3. 未知の専門用語には [UNKNOWN: 原語] タグを付与すること

[原文]
{source_text}
```

### 5.3 チャンク戦略

長文ドキュメントの翻訳では適切なチャンク分割が重要：

| 戦略 | 説明 | 適用場面 |
|---|---|---|
| **段落ベース** | 段落単位で翻訳 | 一般的な文書 |
| **セクションベース** | 見出し単位で翻訳 | 技術文書 |
| **意味ベース** | 意味的なまとまりで分割 | 文学・マーケティング |
| **重複ウィンドウ** | 前後の文脈を含むスライディングウィンドウ | 文脈依存性が高い文書 |

---

## 6. Phase 3: レビュー＆修正エージェント協働

### 6.1 MQM ベースのレビューアーキテクチャ

MAATS の知見を取り入れ、MQM の各品質次元に特化したエージェントを配置：

```
                    ┌──────────────┐
                    │  Translation │
                    │  Output      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌───▼──────┐
        │ Accuracy │ │ Fluency  │ │ Term-    │
        │ Reviewer │ │ Reviewer │ │ inology  │
        │          │ │          │ │ Reviewer │
        └─────┬────┘ └────┬─────┘ └───┬──────┘
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐     │
        │ Style    │ │ Locale   │     │
        │ Reviewer │ │ Reviewer │     │
        └─────┬────┘ └────┬─────┘     │
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼───────┐
                    │  Synthesis   │
                    │  Agent       │
                    │  (統合評価)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  MQM Score   │
                    │  + Error     │
                    │    Report    │
                    └──────────────┘
```

### 6.2 MQM 品質スコアリング

| エラー重大度 | 重み | 例 |
|---|---|---|
| **Minor** | 1 | 表現の微妙な不自然さ |
| **Major** | 5 | 意味の部分的な誤り、用語不統一 |
| **Critical** | 25 | 意味の完全な誤訳、重要情報の欠落 |

**スコア計算:**
```
MQM Score = 1 - (Σ(error_count × weight)) / (word_count × normalization_factor)
```

### 6.3 修正エージェントの反復ループ

```python
# 概念的な LangGraph フロー
def translation_review_loop(state):
    """翻訳 → レビュー → 修正の反復ループ"""

    # 品質閾値
    QUALITY_THRESHOLD = 0.85  # MQM スコア
    MAX_ITERATIONS = 3

    while state.iteration < MAX_ITERATIONS:
        # 1. MQM レビュー（並列実行）
        mqm_result = parallel_review(state.translation)

        # 2. 品質チェック
        if mqm_result.score >= QUALITY_THRESHOLD:
            return {"status": "approved", "translation": state.translation}

        # 3. 修正エージェントによる改善
        state.translation = correction_agent.fix(
            translation=state.translation,
            errors=mqm_result.errors,
            terminology=state.terminology_context
        )
        state.iteration += 1

    # 閾値未達の場合 → HITL エスカレーション
    return {"status": "escalate_to_human", "translation": state.translation}
```

### 6.4 レビューエージェントの並列 vs 順次実行

| パターン | メリット | デメリット | 推奨場面 |
|---|---|---|---|
| **並列実行** | 高速、独立した評価 | エージェント間の矛盾 | 初回レビュー |
| **順次実行** | 前段の知見を活用 | 低速 | 修正後の確認レビュー |
| **ハイブリッド** | バランス | 設計複雑 | プロダクション環境 |

---

## 7. Phase 4: Human-in-the-Loop (HITL) 統合

### 7.1 HITL の設計原則

> "HITL介入はリアクティブであるべきで、システムが欠落情報や曖昧性を検出した場合にのみトリガーされるべきである" — Permit.io Best Practices

全文に対して人間レビューを要求するのは非効率。信頼度ベースのルーティングで介入を最適化する。

### 7.2 介入ポイントの設計

```
┌────────────────────────────────────────────────────┐
│              HITL Integration Points                 │
│                                                      │
│  [Point 1] 用語検索後                                │
│  ├─ 未知用語が検出された場合                          │
│  ├─ 用語候補の信頼度が低い場合                        │
│  └─ トリガー: interrupt() at RAG node               │
│                                                      │
│  [Point 2] 翻訳品質評価後                            │
│  ├─ MQM スコアが閾値以下                             │
│  ├─ Critical エラーが検出された場合                    │
│  ├─ 反復修正が MAX_ITERATIONS に到達                 │
│  └─ トリガー: interrupt() at review node            │
│                                                      │
│  [Point 3] 最終承認                                  │
│  ├─ 高リスクドキュメント（法務、医療等）               │
│  ├─ 新規ドメインの初回翻訳                            │
│  └─ トリガー: approval gate before output           │
│                                                      │
│  [Point 4] フィードバック収集                         │
│  ├─ 人間の修正内容を翻訳メモリに反映                  │
│  ├─ 新用語を用語辞書に登録                            │
│  └─ トリガー: post-output feedback loop             │
└────────────────────────────────────────────────────┘
```

### 7.3 信頼度ベースのルーティング

```
Confidence Score の計算:
  = w1 × (用語一致率)
  + w2 × (MQM Score)
  + w3 × (翻訳メモリ類似度)
  + w4 × (ドメイン経験スコア)

ルーティングルール:
  Score >= 0.90 → 自動承認 (Auto Approve)
  Score >= 0.70 → サンプリングレビュー (10-20% を人間がチェック)
  Score >= 0.50 → 必須レビュー (Human Review Required)
  Score <  0.50 → エスカレーション (Expert Review + 修正指示)
```

### 7.4 LangGraph での HITL 実装パターン

```python
from langgraph.graph import StateGraph
from langgraph.types import interrupt, Command

def hitl_review_node(state):
    """信頼度に基づく HITL ゲート"""
    confidence = state["confidence_score"]

    if confidence < 0.70:
        # グラフを一時停止し、人間の判断を待つ
        human_decision = interrupt({
            "translation": state["translation"],
            "mqm_report": state["mqm_report"],
            "flagged_terms": state["unknown_terms"],
            "action_required": "review_and_approve"
        })

        if human_decision["action"] == "approve":
            return {"status": "approved"}
        elif human_decision["action"] == "edit":
            return {
                "translation": human_decision["edited_translation"],
                "status": "human_edited",
                "feedback": human_decision.get("feedback")
            }
        elif human_decision["action"] == "reject":
            return {"status": "re_translate", "feedback": human_decision["feedback"]}

    return {"status": "auto_approved"}
```

### 7.5 フィードバックループ（アクティブラーニング）

人間のフィードバックを翻訳メモリ・用語辞書に自動反映：

```
Human Edit → Diff 検出 → カテゴリ分類:
  ├─ 用語修正 → 用語辞書 (TB) に新エントリ登録 or 既存更新
  ├─ 表現修正 → 翻訳メモリ (TM) に新ペア追加
  ├─ スタイル修正 → スタイルガイド更新候補としてキュー
  └─ 構造修正 → プロンプトテンプレート改善の入力データ
```

---

## 8. 批判的レビュー — リスクと課題

### 8.1 技術的リスク

| リスク | 深刻度 | 影響 | 緩和策 |
|---|---|---|---|
| **幻覚の連鎖** | 高 | 翻訳エラーがレビューで見逃され、修正エージェントで増幅 | 独立モデルによるレビュー、MQM の多次元評価 |
| **クロスリンガル検索精度** | 高 | 用語の取得漏れが翻訳品質に直結 | ハイブリッド検索、完全一致優先のフォールバック |
| **レイテンシ** | 中 | マルチエージェント + RAG で応答時間が増大 | 並列処理、キャッシュ、バッチ処理 |
| **コスト** | 中 | 複数 LLM 呼び出しによる API コスト増 | 小モデルでのプレフィルタ、キャッシュ |
| **エージェント間の矛盾** | 中 | 複数レビューエージェントの評価が衝突 | Synthesis Agent による統合、重み付き投票 |

### 8.2 設計上の懸念

**過度な複雑性のリスク:**
- 6つのエージェント + HITL は、小規模プロジェクトにはオーバーエンジニアリング
- **緩和策**: フェーズドアプローチで段階的に導入。Phase 1 は Translation + Simple Review の2エージェントから開始

**用語辞書のコールドスタート問題:**
- 新規ドメインでは用語辞書が空の状態から始まる
- **緩和策**: 既存の業界標準辞書のインポート、初期は HITL 比率を高く設定

**評価指標の信頼性:**
- BLEU/COMET 等の自動指標と人間評価のギャップ
- MQM の自動スコアリングも LLM の判断に依存
- **緩和策**: 定期的な人間評価とのキャリブレーション

**HITL のボトルネック化:**
- 信頼度閾値が低すぎると人間レビュー待ちがキューに溜まる
- **緩和策**: 閾値の動的調整、レビュアーの負荷監視、優先度キュー

### 8.3 Andrew Ng モデルとの比較での強み・弱み

| 観点 | Andrew Ng (3-step) | 本アーキテクチャ (6-agent) |
|---|---|---|
| シンプルさ | ◎ | △ |
| 専門用語対応 | △（プロンプト依存） | ◎（Agentic RAG） |
| 品質保証 | ○（Self-Reflection） | ◎（MQM multi-dimensional） |
| 人間介入 | × | ◎（HITL 4-point） |
| スケーラビリティ | △ | ○ |
| 導入コスト | ◎ | △ |

---

## 9. 最終アーキテクチャ計画

### 9.1 段階的導入ロードマップ

```
Phase 1 (MVP — 4-6 weeks)
├─ Translation Agent + Self-Reflection (Andrew Ng style)
├─ 用語辞書の構造化DB (PostgreSQL)
├─ 単純 RAG (完全一致 + 基本的な意味検索)
└─ 基本的な HITL (全件レビュー)

Phase 2 (Enhanced — 6-8 weeks)
├─ Agentic RAG (ルーティング + クエリ書き換え + リランキング)
├─ 翻訳メモリ (TM) の統合
├─ MQM ベースの Review Agent (Accuracy + Fluency)
├─ Correction Agent + 反復ループ
└─ 信頼度ベースの HITL ルーティング

Phase 3 (Production — 8-12 weeks)
├─ 全5次元の MQM Review Agents
├─ Synthesis Agent
├─ フィードバックループ (TM/TB 自動更新)
├─ 動的閾値調整
├─ モニタリング＆オブザーバビリティ
└─ 複数ドメイン対応
```

### 9.2 推奨技術スタック

```
┌─────────────────────────────────────────────────┐
│  Orchestration Layer                             │
│  ├─ LangGraph (メインワークフロー制御)            │
│  ├─ Semantic Kernel (Copilot Studio 統合時)      │
│  └─ MCP (外部ツール接続)                         │
├─────────────────────────────────────────────────┤
│  Agent Layer                                     │
│  ├─ Claude Opus 4.6 / Sonnet 4.5 (翻訳・レビュー)│
│  ├─ GPT-4o (補助レビュー・独立評価)               │
│  └─ Haiku 4.5 (プレフィルタ・分類)               │
├─────────────────────────────────────────────────┤
│  RAG Layer                                       │
│  ├─ PostgreSQL (構造化用語辞書)                   │
│  ├─ Weaviate / Milvus (ベクトル検索)             │
│  ├─ BGE-m3 (多言語埋め込み)                      │
│  └─ Cross-Encoder Reranker                       │
├─────────────────────────────────────────────────┤
│  HITL Layer                                      │
│  ├─ LangGraph interrupt() / Command              │
│  ├─ PostgreSQL (レビューキュー・状態管理)          │
│  └─ WebSocket / SSE (リアルタイム通知)            │
├─────────────────────────────────────────────────┤
│  Observability                                   │
│  ├─ LangSmith (トレーシング)                     │
│  ├─ MQM Dashboard (品質メトリクス)               │
│  └─ Cost Tracker (API コスト監視)                │
└─────────────────────────────────────────────────┘
```

### 9.3 LangGraph グラフ定義（概念設計）

```python
from langgraph.graph import StateGraph, END

# 状態定義
class TranslationState(TypedDict):
    source_text: str
    target_language: str
    domain: str
    terminology_context: list[dict]
    translation: str
    mqm_report: dict
    confidence_score: float
    iteration: int
    status: str

# グラフ構築
graph = StateGraph(TranslationState)

# ノード登録
graph.add_node("extract_terms", extract_terms_node)
graph.add_node("agentic_rag", agentic_rag_node)
graph.add_node("translate", translation_node)
graph.add_node("self_reflect", reflection_node)
graph.add_node("mqm_review", parallel_mqm_review_node)
graph.add_node("correct", correction_node)
graph.add_node("hitl_gate", hitl_review_node)
graph.add_node("feedback_loop", feedback_loop_node)

# エッジ定義
graph.set_entry_point("extract_terms")
graph.add_edge("extract_terms", "agentic_rag")
graph.add_edge("agentic_rag", "translate")
graph.add_edge("translate", "self_reflect")
graph.add_edge("self_reflect", "mqm_review")

# 条件分岐: MQM スコアに基づく
graph.add_conditional_edges("mqm_review", route_by_quality, {
    "pass": "hitl_gate",
    "fail": "correct",
})

# 修正後の再レビュー
graph.add_edge("correct", "mqm_review")

# HITL ゲート後の分岐
graph.add_conditional_edges("hitl_gate", route_by_hitl_decision, {
    "approved": "feedback_loop",
    "edited": "feedback_loop",
    "rejected": "translate",
})

graph.add_edge("feedback_loop", END)

# コンパイル
app = graph.compile(checkpointer=PostgresSaver(...))
```

### 9.4 kumicho-portal との統合ポイント

本アーキテクチャは kumicho-portal の既存基盤と以下の点で統合可能：

| 既存機能 | 統合方法 |
|---|---|
| **tRPC API** | 翻訳リクエスト/結果の型安全な通信 |
| **PostgreSQL (Drizzle ORM)** | 用語辞書・翻訳メモリ・レビューキューの永続化 |
| **AI Chat 機能** | 翻訳エージェントのフロントエンド UI として拡張 |
| **認証 (JWT)** | HITL レビュアーのアクセス制御 |
| **Audit Logs** | 翻訳・レビュー・修正の全履歴追跡 |

---

## 10. 技術選定マトリクス

### オーケストレーションフレームワーク

| 要件 | LangGraph | CrewAI | Semantic Kernel | Copilot Studio |
|---|---|---|---|---|
| HITL サポート | ◎ (interrupt) | ○ | ○ | ◎ (handoff) |
| 条件分岐・ループ | ◎ | ○ | ◎ | ○ |
| 状態管理 | ◎ (checkpointer) | ○ | ○ | ○ |
| TypeScript 対応 | ◎ | × (Python) | ◎ | N/A |
| プロダクション実績 | ◎ (v1.0) | ○ | ◎ | ◎ |
| MS エコシステム統合 | △ | × | ◎ | ◎ |

**推奨:** LangGraph をメインのオーケストレーターとし、Copilot Studio 統合が必要な場合は Semantic Kernel のプラグインとして接続

### ベクトルDB

| 要件 | Weaviate | Milvus | Qdrant | pgvector |
|---|---|---|---|---|
| 多言語検索 | ◎ | ◎ | ◎ | ○ |
| ハイブリッド検索 | ◎ | ◎ | ○ | △ |
| 既存 PG 統合 | × | × | × | ◎ |
| スケーラビリティ | ◎ | ◎ | ○ | △ |

**推奨:** Phase 1 は pgvector（既存 PostgreSQL 活用）、Phase 2 以降で Weaviate に移行

---

## 11. 参考文献

### マルチエージェントオーケストレーション
- [Microsoft Copilot Studio Multi-Agent Orchestration (Build 2025)](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/multi-agent-orchestration-maker-controls-and-more-microsoft-copilot-studio-announcements-at-microsoft-build-2025/)
- [Semantic Kernel Multi-Agent Orchestration](https://devblogs.microsoft.com/semantic-kernel/semantic-kernel-multi-agent-orchestration/)
- [Semantic Kernel Agent Orchestration - Microsoft Learn](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/)
- [6 Core Capabilities to Scale Agent Adoption in 2026](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/6-core-capabilities-to-scale-agent-adoption-in-2026/)
- [LangGraph vs CrewAI vs AutoGen (2026 Guide)](https://dev.to/pockit_tools/langgraph-vs-crewai-vs-autogen-the-complete-multi-agent-ai-orchestration-guide-for-2026-2d63)
- [Copilot Studio Multi-Agent Orchestration - Architecture & Patterns](https://holgerimbery.blog/multi-agent-orchestration)

### 翻訳エージェント
- [Andrew Ng Translation Agent (GitHub)](https://github.com/andrewyng/translation-agent)
- [Building Multi-Agent Translation Systems with Reasoning Models](https://medium.com/@haberlah/building-a-multi-agent-translation-systems-with-reasoning-models-b2646e91f596)
- [MATT: Multi-Agent Translation Team](https://scholar.smu.edu/cgi/viewcontent.cgi?article=1288&context=datasciencereview)
- [MAATS: Multi-Agent Automated Translation System Based on MQM](https://arxiv.org/html/2505.14848v1)
- [Improving LLM-based MT with Systematic Self-Correction (TER)](https://arxiv.org/html/2402.16379v2)

### Agentic RAG
- [Agentic RAG Survey (arXiv 2501.09136)](https://arxiv.org/abs/2501.09136)
- [What is Agentic RAG - IBM](https://www.ibm.com/think/topics/agentic-rag)
- [What is Agentic RAG - Weaviate](https://weaviate.io/blog/what-is-agentic-rag)
- [Agentic RAG Complete Guide 2025 - Aisera](https://aisera.com/blog/agentic-rag/)
- [Retrieval-Augmented Machine Translation with Unstructured Knowledge](https://arxiv.org/html/2412.04342v1)

### 多言語 RAG / クロスリンガル検索
- [Building Multilingual RAG Systems - Microsoft Data Science](https://medium.com/data-science-at-microsoft/building-and-evaluating-multilingual-rag-systems-943c290ab711)
- [Multilingual RAG with Milvus, LangChain, OpenAI - Zilliz](https://zilliz.com/blog/building-multilingual-rag-milvus-langchain-openai)
- [Cross-Lingual IR Systems - NVIDIA](https://developer.nvidia.com/blog/develop-multilingual-and-cross-lingual-information-retrieval-systems-with-efficient-data-storage/)
- [Multilingual Embedding Models for RAG](https://www.analyticsvidhya.com/blog/2024/07/multilingual-embedding-model-for-rag/)

### MQM / 翻訳品質評価
- [MQM Official Site](https://themqm.org/)
- [MQM Scoring Models](https://themqm.org/error-types-2/the-mqm-scoring-models/)
- [Multi-Range Theory of TQM (arXiv)](https://arxiv.org/abs/2405.16969)

### HITL パターン
- [LangChain HITL Documentation](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)
- [HITL Best Practices - Permit.io](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo)
- [HITL with LangGraph & Elasticsearch - Elastic](https://www.elastic.co/search-labs/blog/human-in-the-loop-hitllanggraph-elasticsearch)
- [HITL Patterns in LangGraph - Medium](https://medium.com/the-advanced-school-of-ai/human-in-the-loop-in-langgraph-approve-or-reject-pattern-fcf6ba0c5990)
