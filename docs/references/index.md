# 参考文献

Gitに残すのは書誌情報・出典URL・自分の要約・実装との対応。PDF本体や第三者の原資料は残さない。

新しく取得する資料は `/local-references/` に保存する。このディレクトリ全体と `*.pdf` は .gitignore 対象。
既存の docs/references のPDFも任意のローカル資料として扱い、移動・削除は要求しない。
資料がなくてもビルドとテストは動く。文書検査の任意資料・生成物は [docs-references.json](../../scripts/docs-references.json) で明示する。
画像・スキャン・配布データも第三者の原資料なら local-references に置く。自作コード・自作の説明文・再生成用スクリプトは追跡する。

新しい文献は著者・題名・出版年・掲載先・DOIまたは公式URL・利用箇所を記録し、未確認の書誌情報はその旨を明記する。

---

## Misue (2024) — Area-adaptive Drawing of Rooted Trees

- ファイル: [misue-2024-area-adaptive.pdf](./misue-2024-area-adaptive.pdf)
- 著者: Kazuo Misue (University of Tsukuba)
- 掲載先: IEEE PacificVis 2024（ページ範囲は資料間で表記が異なるため未確定）。
- 出典: [著者の業績一覧](https://www.cs.tsukuba.ac.jp/~misue/misue-publications/index.html)。
- **本研究の直接の土台**。指定アスペクト比の矩形領域に収まるよう、兄弟の葉ノードを「折れ線」に折り畳んで配置する **Monotone Local Folding Layout** を提案。本リポジトリの `localFoldingLayout` / `createDammuy`（ダミーノード化）はこの手法の実装。
- 借用しているもの: ダミーノード化によるレイアウト、列数を段階的に増やしてアスペクト比を目標に近づけるループ構造。
- 本研究が拡張している点: Misueの手法は**ノードサイズが一様**であることを前提にしており、可変サイズノード（量をノード高さでエンコードする場合）では列内の高さのばらつきが無駄な空白を生む。この限界の解消が本研究の主題。

## van der Ploeg (2013公開 / 2014掲載) — Drawing Non-layered Tidy Trees in Linear Time

- ファイル（任意）: [ploeg-2013-tidy-trees.pdf](./ploeg-2013-tidy-trees.pdf)
- 著者: Atze van der Ploeg。Software: Practice and Experience, 44(12), 1467–1484。
- 出典: [CWIの書誌情報](https://ir.cwi.nl/pub/21856)、[出版社・DOI](https://doi.org/10.1002/spe.2213)。
- Reingold-Tilfordのレイヤード木描画を、ノード高さが可変な場合にも対応する非レイヤード（non-layered）木描画に拡張したアルゴリズム。左右輪郭（contour）を使ってサブツリー間の最小間隔を線形時間で決定する。
- 借用しているもの: `saColumnLayout.js`（2026-09に削除。現行は `src/layout/`） の `vanderploeg` / `rightCountur` / `leftCountur` / `separate` は本論文のアルゴリズムの実装。可変サイズノードを扱う本研究の全体レイアウトの基盤。
- 手元のPDFは2013年8月5日付のプレプリント（26ページ）。付録Cに Java の全コードがあり、行ごとに拡張の印が付いている（印なし＝Reingold-Tilford 本体、⋆＝非レイヤード拡張、◦＝Buchheim らの中間兄弟の均等配置、•＝IYL による兄弟番号の参照）。著者のコード: https://github.com/cwi-swat/non-layered-tidy-trees
- 実装との対応: `src/layout/core/vanderPloeg.js` が付録Cの行単位の移植（O(n)）。関数名・フィールド名は付録Cと同じで、印もコメントに残している。◦（均等配置）は既定で有効で、`spacing: false` で外せる。2026-10 にスカイライン版（O(n²) 前後）から置き換えた経緯は [2026-10-linear-vanderploeg.md](../decisions/2026-10-linear-vanderploeg.md)。
- 付録Cとの違い: 著者は公開後に、最初の輪郭の組を必ず動かすよう `separate` を修正した（[issue #2](https://github.com/cwi-swat/non-layered-tidy-trees/issues/2)、README）。本実装も同じ修正を取り込み、`dist` がちょうど 0 の場合の扱いだけ変えている（[2026-11-mirror-symmetry.md](../decisions/2026-11-mirror-symmetry.md)）。著者の `Paper.java` は public domain と明記されている。

## Bin Packing Survey（書誌情報の同定待ち）

- ファイル（任意）: [binpacking-survey.pdf](./binpacking-survey.pdf)
- 著者・正式題名・出版年・DOIは未記録。ファイル名だけでは特定できないため、同定するまで正式な引用には使わない。
- ダミーノード内の葉ノードを容量`B_d`の列に分配する問題は、本質的にはビンパッキング（容量制約下でのビン数最小化）に相当すると2026-07に気づき、実際に古典的なビンパッキング近似アルゴリズムである **First-Fit Decreasing** と **Best-Fit Decreasing** を実装した（[src/packing/](../../src/packing/)、[decisions/2026-07-pluggable-packing.md](../decisions/2026-07-pluggable-packing.md)）。デフォルトのLPT（Longest Processing Time）はマルチプロセッサスケジューリング側のアルゴリズムで、列数を探索しながら流用している。SA（焼きなまし法）を含めたこれら4手法の位置づけ・近似比の裏付けに使う。

---

## 主要な関連研究（未所持）

原文PDFは未取得だが、位置づけをメモしておく。

- Shneiderman — Treemap（空間充填法の起点）
- Squarified Treemaps — Treemapのアスペクト比改善
- Itoh et al. — 高速矩形パッキングによる階層データ可視化
- Kruskal & Landwehr — Icicle Plot

必要になったら追記する。
