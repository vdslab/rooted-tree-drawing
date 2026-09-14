# 参考文献

各論文について「何を借りているか / どこで使っているか」を1段落でまとめる。詳細を読み返す前に、まずここで当たりを付ける。

---

## Misue (2024) — Area-adaptive Drawing of Rooted Trees

- ファイル: [misue-2024-area-adaptive.pdf](./misue-2024-area-adaptive.pdf)
- 著者: Kazuo Misue (University of Tsukuba)
- **本研究の直接の土台**。指定アスペクト比の矩形領域に収まるよう、兄弟の葉ノードを「折れ線」に折り畳んで配置する **Monotone Local Folding Layout** を提案。本リポジトリの `localFoldingLayout` / `createDammuy`（ダミーノード化）はこの手法の実装。
- 借用しているもの: ダミーノード化によるレイアウト、列数を段階的に増やしてアスペクト比を目標に近づけるループ構造。
- 本研究が拡張している点: Misueの手法は**ノードサイズが一様**であることを前提にしており、可変サイズノード（量をノード高さでエンコードする場合）では列内の高さのばらつきが無駄な空白を生む。この限界の解消が本研究の主題（[docs/paper/draft.pdf](../paper/draft.pdf) の 2.3 節・3節で直接言及）。

## van der Ploeg (2013) — Drawing Non-layered Tidy Trees in Linear Time

- ファイル: [ploeg-2013-tidy-trees.pdf](./ploeg-2013-tidy-trees.pdf)
- Reingold-Tilfordのレイヤード木描画を、ノード高さが可変な場合にも対応する非レイヤード（non-layered）木描画に拡張したアルゴリズム。左右輪郭（contour）を使ってサブツリー間の最小間隔を線形時間で決定する。
- 借用しているもの: `saColumnLayout.js`（2026-09に削除。現行は `src/layout/`） の `vanderploeg` / `rightCountur` / `leftCountur` / `separate` は本論文のアルゴリズムの実装。可変サイズノードを扱う本研究の全体レイアウトの基盤。

## Bin Packing Survey

- ファイル: [binpacking-survey.pdf](./binpacking-survey.pdf)
- ダミーノード内の葉ノードを容量`B_d`の列に分配する問題は、本質的にはビンパッキング（容量制約下でのビン数最小化）に相当すると2026-07に気づき、実際に古典的なビンパッキング近似アルゴリズムである **First-Fit Decreasing** と **Best-Fit Decreasing** を実装した（[src/packing/](../../src/packing/)、[decisions/2026-07-pluggable-packing.md](../decisions/2026-07-pluggable-packing.md)）。デフォルトのLPT（Longest Processing Time）はマルチプロセッサスケジューリング側のアルゴリズムで、列数を探索しながら流用している。SA（焼きなまし法）を含めたこれら4手法の位置づけ・近似比の裏付けに使う。
- 「3.3 Formulation of the Optimization Problem」「3.4 Optimization by Simulated Annealing」（[section-map.md](../paper/section-map.md)参照）で参照候補。

---

## 論文が引用する主要な関連研究（`docs/paper/draft.pdf` §2 より、未所持）

`draft.pdf` の Related Work では以下も引用されている。原文PDFは未取得だが、位置づけをメモしておく。

- Shneiderman — Treemap（空間充填法の起点）
- Squarified Treemaps — Treemapのアスペクト比改善
- Itoh et al. — 高速矩形パッキングによる階層データ可視化
- Kruskal & Landwehr — Icicle Plot

必要になったら追記する。
