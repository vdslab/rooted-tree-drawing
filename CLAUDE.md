# rooted-tree-drawing

可変サイズノードを持つ根付き木を、指定アスペクト比の矩形領域に収めて描画するレイアウトアルゴリズムの研究リポジトリ。
Misue の Monotone Local Folding Layout を、ノードサイズが可変な場合（量をノード高さでエンコードする場合）に
拡張することが目的。

## 3行で現在地

- 主手法は**グローバル高さ予算 `H_t` の二分探索 + 容量ベースのビンパッキング**（`src/layout/methods/binpacking.js`）。
- 比較対象として、既存手法（Misue）と列成長型（SA / LPT）を同じリポジトリに持っている。
- **このリポジトリの目的は実装**。論文執筆はスコープ外で、`docs/paper/` は参照用の置き場
  （原稿・図・章↔実装の対応表）。執筆環境は必要になった時に別途用意する。
- ただし**論文（`draft.pdf`）は旧SA版のまま**で現行実装とは別手法であり、この食い違いが
  [known-issues.md](docs/known-issues.md) §3・§4 の着手可否を縛っている（[section-map.md](docs/paper/section-map.md)）。

## 詳細はどこにあるか

このファイルは**常に読み込まれる入口**なので、地図とルールだけを置く。
作業する場所に近いほど確実に読まれるので、領域ごとの知識は各ディレクトリに分けてある。

| 作業する場所 | 読むもの |
|---|---|
| レイアウトの実装を変える | [src/layout/CLAUDE.md](src/layout/CLAUDE.md) — パイプラインの契約、ソルバーの種類、触ると壊れる箇所 |
| 実験を回す・手法を足す | [experiments/CLAUDE.md](experiments/CLAUDE.md) — 論文条件、環境変数、results の扱い |
| 実験結果を分析する | `/run-experiments` スキル（[SKILL.md](.claude/skills/run-experiments/SKILL.md)） — 条件を指定して実行、特筆すべき試行の抽出、レイアウトのSVG比較 |

## コードの地図

```
src/
  main.jsx App.jsx Tree.jsx        UI。App.jsx の const data = [...] に入力が直書きされている
  uiLayout.js                      UI のエントリ。手法の切り替え（METHOD）とマージン100/100
  layout/
    core/pipeline.js               共通パイプライン。手法ごとに差し替わるのは fold だけ
    core/tree.js                   van der Ploeg と輪郭追跡（全手法で同一）
    core/dummy.js                  ダミーノードの生成・サイズ・マージン
    core/render.js                 ダミー展開・エッジ生成・表示サイズ
    methods/binpacking.js          H_t の二分探索（現行の主手法）
    methods/growth.js              列成長型。SA と LPT はソルバー差し替えだけの違い
    methods/existing.js            既存手法（Misue）。パイプラインが別物なので core/pipeline.js は使わない
    solvers/                       列数k固定 → 最大列高さ最小化（saColumn / lptColumn）
  packing/                         容量 B_d → 最小列数（lpt / ffd / bfd）
experiments/
  lib/methods.js                   手法レジストリ + プリセット。手法の一次情報
  lib/runner.js                    実験の共通ランナー
  area_efficiency.js               §4.1 面積効率（TNA/DA）
  computation_time.js              §4.2 計算時間
  plot_*.py                        結果JSON → 図
test/golden.mjs                    全手法の出力ハッシュ（192ケース）
```

**`solvers/` と `packing/` は解いている問題が違う**（前者は列数固定の makespan 最小化、
後者はその双対の箱詰め）。混ぜないこと。

`src/` と `experiments/` に**到達不能なコードは無い**（2026-09に16ファイル削除済み）。
昔の実装を参照したいときはファイルを探さず `git log` を見る。

## 変更するときの手順

```bash
npm run test:golden      # 1. 変更前に通ることを確認（240ケースの出力ハッシュ）
# 2. 変更する
npm run test:golden      # 3. 挙動が変わっていないか判定
npm run build            # 4. UI がビルドできるか
npm run check:docs       # 5. ドキュメントのパス参照が壊れていないか
```

- **レイアウトに触ったら必ず `npm run test:golden`。** 意図した変更で出力が変わったなら
  `npm run test:golden:update` で記録を更新し、何が変わったかをコミットメッセージに書く。
- 手法を足す・名前を変えるときは `experiments/lib/methods.js` だけを触る。
- **追跡しないもの**: `experiments/results/`（再生成できる派生物。`_trials.json` は1ファイル数百MB）、
  論文のバイナリ（`draft.pdf` と `talk/*.png`。実装がこのリポジトリの成果物なので）、Pythonキャッシュ。
  詳細は `.gitignore` の末尾。どうしても追跡したい図があれば `git add -f` で個別に足す。
- 使わなくなったファイルは**削除する**（git 履歴に残る）。`archive/`（2026-09に削除） に「移す」ルールは過去に
  機能しなかった（移動ではなくコピーになり、どちらが正か分からないファイルが9本できた。2026-09に廃止）。

## ドキュメントの役割分担

| 置き場 | 何を書くか |
|---|---|
| コードのコメント | **「なぜこの実装なのか」の一次情報。** マージン条件、フォークの理由、当時の挙動を残す理由などはここが正 |
| [docs/implementation.md](docs/implementation.md) | 全体フローと「どのファイルを見ればいいか」の索引。関数単位の説明は書かない |
| [docs/decisions/](docs/decisions/) | 設計判断の理由。[index.md](docs/decisions/index.md) に一覧がある |
| [docs/known-issues.md](docs/known-issues.md) | **未解決の問題だけ。** 解消済みの記録は書かない |
| [docs/data/index.md](docs/data/index.md) | データセットの出典・形式・使用状況 |
| [docs/paper/](docs/paper/) | 論文ドラフト、章↔実装の対応表、発表原稿と図 |

ルール:

- **実装を変えたら `docs/implementation.md` を同期する。** ただし索引に徹し、詳細はコードに書く。
- **設計を変えたら `docs/decisions/` に `YYYY-MM-テーマ.md` を足し、[index.md](docs/decisions/index.md) に1行追記する。**
  冒頭は必ずステータス行（Implemented / Superseded / Proposed）から始める。
  **1テーマ1ファイル。** 同じテーマに `-fix` `-solution` を足さない（過去に `2026-07-global-budget-` が
  3ファイルに割れて、どれが正か分からなくなった）。続報は元ファイルのステータス行に追記するか、
  新しい日付で「これを置き換える」と書いた別ファイルにする。
  既存ファイルの本文は編集しない。生成AIとの検討で有用な結論が出たら要点だけ残す（対話ログは貼らない）。
- **`docs/**/*.md` か `CLAUDE.md` を編集したら `npm run check:docs` を実行する。**
  既知の未修正は `scripts/check-docs.mjs` の `KNOWN_BROKEN` に登録してある（`docs/decisions/` の本文が、
  削除した旧実装を指している分。本文は編集しないルールなのでステータス行に注記済み）。**新規0件であることだけを見る。**
- 論文を書き進めるときは [section-map.md](docs/paper/section-map.md) を確認・更新する。

## 実験の回し方

```bash
node experiments/area_efficiency.js                      # 論文§4.1（TRIALS既定=1000）
METHOD_SET=growth5 node experiments/computation_time.js  # 手法セットを切り替え
TRIALS=5 SEED=1 node experiments/area_efficiency.js      # 動作確認用の短縮 + 再現可能
```

**`SEED` を付けない実行は再現できない。** 条件・手法セット・結果ファイルの扱いは
[experiments/CLAUDE.md](experiments/CLAUDE.md) を参照。

## 今の判断待ち

- **論文の軸**: SA版で一本化するか、H_t版で書き直すか（[section-map.md](docs/paper/section-map.md)）。
  これが決まらないと [known-issues.md](docs/known-issues.md) §3・§4（直すと全手法の出力が変わる項目）に着手できない。
- **既存手法の共通化**: `experiments/lib/existingPaper.js` だけ `src/layout/` に載っていない
  （[2026-09-layout-core-extraction.md](docs/decisions/2026-09-layout-core-extraction.md) の残作業）。
