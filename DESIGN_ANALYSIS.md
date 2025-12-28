# 港区ミニマル・ラグジュアリー デザイン分析

## 参考サイト分析結果

### 虎ノ門ヒルズ（Toranomon Hills）
**特徴：**
- ヒーロー画像：実在の人物・空間を使用。落ち着いた色調（グレー・紺・ベージュ）
- ナビゲーション：上部固定、項目は少なく、シンプル（What's on / Shops & Restaurants / Workplaces など）
- タイポグラフィ：大見出しは大きく、本文は読みやすいサイズ
- 余白：セクション間に広い余白。視線の呼吸を作る
- 色：白背景 + 濃いグレー（テキスト） + 低彩度の緑（アクセント）
- コンポーネント：角丸は控えめ、影は弱い
- テキスト：「A business hub that connects to the world」など、短く断定的

### 麻布台ヒルズ（Azabudai Hills）
**特徴：**
- ヒーロー画像：自然（緑）と建築の融合。明るい色調
- コンセプト：「Modern Urban Village」。人間中心のアプローチ
- タイポグラフィ：「Welcome to our town, a city filled with greenery and like a square.」
- 色：オフホワイト背景 + 濃いグレー + 低彩度の緑
- 余白：大きなセクション間隔。密度を上げない
- アニメーション：スクロール時のフェード。派手なパララックスなし

### 共通要素
1. **余白の美学**：セクション間隔は 3rem 以上。視線に呼吸を与える
2. **タイポグラフィ**：英数字は Sans Serif（Inter 相当）、日本語は Noto Sans JP
3. **色使い**：ニュートラル（白〜オフホワイト）+ 濃いグレー + 低彩度アクセント1色
4. **写真**：実在の人物・空間。落ち着いた色調。情報の可読性を損なわない
5. **ナビゲーション**：上部固定、項目少なく、検索を最優先
6. **コンポーネント**：角丸 4px 以下、影 0 2px 4px rgba(0,0,0,0.08)、線 1px #e5e5e5
7. **アイコン**：線アイコンのみ。装飾的なアイコン禁止
8. **アニメーション**：フェード 0.3s、スライド 0.4s。パララックス禁止
9. **レイアウト**：12カラムグリッド、最大幅 1200px、中央整列
10. **コピー**：短く、断定、品よく。感嘆符や絵文字禁止

---

## グリーンピア・ポータル適用ガイドライン

### 色パレット
```
Background: #FFFFFF (white)
Text Primary: #1a1a1a (dark gray)
Text Secondary: #666666 (medium gray)
Border: #e5e5e5 (light gray)
Accent: #4a7c7e (low-saturation teal/blue-green)
Success: #5a8a7a
Warning: #8a7a5a
Error: #8a5a5a
```

### タイポグラフィ
```
Font Family: Inter (English/Numbers) + Noto Sans JP (Japanese)
H1: 2.5rem (40px) / line-height: 1.2 / font-weight: 400
H2: 2rem (32px) / line-height: 1.3 / font-weight: 400
H3: 1.5rem (24px) / line-height: 1.4 / font-weight: 500
Body: 1rem (16px) / line-height: 1.6 / font-weight: 400
Small: 0.875rem (14px) / line-height: 1.5 / font-weight: 400
```

### スペーシング
```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
3xl: 4rem (64px)
```

### コンポーネント
```
Border Radius: 4px (cards, inputs) / 2px (buttons)
Box Shadow: 0 2px 4px rgba(0, 0, 0, 0.08)
Border: 1px solid #e5e5e5
Button Padding: 0.75rem 1.5rem
Input Padding: 0.75rem 1rem
Card Padding: 1.5rem
```

### アニメーション
```
Fade: 0.3s ease-in-out
Slide: 0.4s ease-in-out
Hover: 0.2s ease-in-out
Transition: all 0.3s ease-in-out
```

### レイアウト
```
Max Width: 1200px
Grid Columns: 12
Gutter: 1.5rem
Mobile Breakpoint: 768px
Tablet Breakpoint: 1024px
```

---

## Member トップ画面での適用例

### セクション構成
1. **ヘッダー**：タイトル + 検索バー（最優先）
2. **対象範囲カード**：地域/建物/年度（固定、小さく）
3. **4枚カード**：「今週やること」「最優先3課題」「未解決（仮説）」「返信待ち」
   - 各カード：高さ固定、余白 2rem
   - カード間隔：2rem
4. **9年ローテ表**：スクロール可能、余白 3rem
5. **最新更新**：Changelog、余白 2rem

### 視覚階層
- H1：「焼津市 集合住宅「グリーンピア」 組長引き継ぎ」
- H2：「今週やること」「最優先3課題」など
- Body：内容テキスト
- Small：日時、ステータスなど

### 色の使い分け
- **背景**：白 (#FFFFFF)
- **テキスト**：濃いグレー (#1a1a1a)
- **アクセント**：低彩度青緑 (#4a7c7e)
- **未解決（仮説）**：低彩度黄 (#8a7a5a)
- **返信待ち**：低彩度オレンジ (#8a7a5a)

### モバイル最適化
- スタック：縦方向に積み重ね
- 余白：デスクトップの 60% に削減
- フォントサイズ：本文 1rem 維持、見出しは 1.5rem に縮小
- カード幅：100% - 1rem（左右余白）

---

## 実装チェックリスト

- [ ] 色パレット CSS 変数化
- [ ] フォント設定（Inter + Noto Sans JP）
- [ ] スペーシング システム実装
- [ ] コンポーネント設計（Button, Card, Input など）
- [ ] アニメーション定義
- [ ] レイアウト グリッド実装
- [ ] Member トップ画面実装
- [ ] モバイルレスポンシブ確認
- [ ] 全ページで情報階層（H1/H2/H3）と要約が先に来ることを確認
