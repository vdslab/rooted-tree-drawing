# experiments/ — 論文の実験

**論文・スライドの図の数値はこの層から出る。** `src/` を直接呼ばず、
`lib/*Paper.js` のラッパー経由で論文条件（`xMargin=300, yMargin=200`）に固定して測る。
UI（`src/uiLayout.js`）は 100/100 なので、数値は一致しない。

## 手法の一次情報は lib/methods.js

手法を足す・名前を変える・プリセットを変えるときは**このファイルだけ**を触る。
実験スクリプトに手法を直接書かないこと（過去に4ファイルへ散らばり、plot 側が追従できなくなった）。

- `METHODS` … 個々の手法
- `METHOD_SETS` … `paper5`（論文§4の5手法）/ `growth5`（growth-lpt を含む5手法）
- `PRESETS` … 手法セット + 分散レベル + 出力ファイル名の接尾辞
- `VARIANCE_LEVELS` / `ASPECT_RATIOS` … 論文§4.1 の条件

`lib/*Paper.js` は4本とも `src/layout/` を呼ぶラッパーで、論文条件のマージンを渡すだけ。
実装の重複はもう無い。

「既存手法」「SA」と言ったら、それぞれ `src/layout/methods/existing.js` と
`methods/growth.js` + `solvers/saColumn.js` を指す。かつて `benchmark.js` が別版・別マージンで
同じ名前の手法を測っていたが、2026-09に benchmark ごと削除して一本化した。

## 回し方

```bash
node experiments/area_efficiency.js                      # 既定 = paper5, TRIALS=1000
METHOD_SET=growth5 node experiments/computation_time.js
TRIALS=5 SEED=1 NUM_NODES=100 node experiments/area_efficiency.js   # 動作確認
python3 experiments/plot_area_efficiency.py [--growth]
```

| 環境変数 | 効果 |
|---|---|
| `METHOD_SET` | `paper5`（既定）/ `growth5`。出力ファイル名の接尾辞も変わる |
| `TRIALS` | 試行数。既定は論文設定の1000 |
| `SEED` | `Math.random` をシード固定。**指定しない実行は再現できない** |
| `NUM_NODES` / `NODE_COUNTS` | 木の規模 |
| `SAVE_TRIALS` | 木データ（`_trials.json`）を残すか。面積効率は既定で保存、計算時間は既定で保存しない |

**論文に載せる数字を取るときは必ず `SEED` を指定する**（結果JSONの `config.seed` に残る）。
既存の `results/*.json` はシードなしで取られており、再現できない。

## 対話的に回して分析する（/run-experiments）

論文用のバッチ実行とは別に、**条件を指定して小さく回し、結果を掘り返すためのドライバー**がある。

```bash
node .claude/skills/run-experiments/driver.mjs run --variance=low,high --aspects=1:4,4:1 --trials=6 --nodes=200
node .claude/skills/run-experiments/driver.mjs top --by=baseline-wins      # 既存手法が勝った試行
node .claude/skills/run-experiments/driver.mjs compare <run> low/1:4/0     # 手法を並べてSVG化
```

木を保存せず試行ごとのシードだけ持つので1実行が数十KBで済み、`tree` / `render` / `verify` で
後から木もレイアウトも再生成できる。使い方は `.claude/skills/run-experiments/SKILL.md`。

## 過去の結果を読むときの注意

古い結果JSONでは budget系の手法が**旧名**で保存されている。過去の数値を引用・比較するときは
取り違えないこと。

| 現在の名前 | 古い結果JSON内の名前 | 図のラベル |
|---|---|---|
| `budget-lpt` | `lpt` | Proposed (LPT) / Budget (H_t) + LPT |
| `budget-ffd` | `ffd` | Proposed (FFD) |
| `budget-bfd` | `bfd` | Proposed (BFD) |
| `growth-lpt` | （当時は存在しない） | Growth + LPT |

`paper5` プリセットは互換のため今も旧名で記録する（`lib/methods.js` 参照）。

## results/ は追跡していない

`experiments/results/` は **.gitignore 済み**（2026-09）。過去の結果33ファイル（1.8GB）は削除した。
クローン直後にはディレクトリ自体が存在しないが、実験を回せば自動で作られる。

- `<prefix>_<epoch>.json` … 集計結果。plot スクリプトが読む。軽い
- `<prefix>_<epoch>_trials.json` … 各試行の木データ。**1ファイル235〜313MB**になるので
  `SAVE_TRIALS=0` を基本にする。後から木を見たいだけなら `/run-experiments` のドライバーを使う
  （シードから再生成するので数十KBで済む）
- 結果を残したいときは、**実行IDと `SEED` をドキュメント側に書く**。ファイルそのものは追跡しない

## 新しい実験を足すとき

`lib/runner.js` の `runExperiment(spec)` に「何を測るか（`measure`）」と「ケースの並べ方」を
渡すだけでよい。ループ・集計・サマリー表示・保存は共通。metric ごとに1ファイル。
