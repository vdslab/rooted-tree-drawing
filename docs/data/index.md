# データセット一覧

リポジトリ直下の `*.json` は全て「レイアウトの入力データ」だが、**形式も使用状況もバラバラ**なので、使う前にここで確認する。実際に生成方法まで記録があるのは `kagawa_river_tree.json` だけ（[kagawa-river-tree.md](kagawa-river-tree.md)）。

## 形式は3種類

| 形式 | キー | 意味 |
|---|---|---|
| **A: レイアウト直接入力** | `name, parent, width, height` | `layout()` にそのまま渡せる。量は `height` にエンコード済み |
| **B: 生の階層データ** | `name, parent, value, type` | `value`（ファイルサイズ等）を `height` に変換してから渡す。変換は利用側の責任 |
| **C: 値のみ** | `name, parent, value` | B から `type` が落ちたもの |

## 一覧

| ファイル | 形式 | 件数 | サイズ | 使われている場所 | 由来 |
|---|---|---|---|---|---|
| `toaruos_tree.json` | B | 883 | 111KB | **`benchmark.js`（唯一の入力）**。`src/App.jsx` は import しているが変換処理がコメントアウトされていて未使用 | ToaruOS のソースツリー（生成方法の記録なし） |
| `kagawa_river_tree.json` | A | 113 | 13KB | どのコードからも未参照。[explanation.md](../paper/talk/explanation.md) で言及 | 国土数値情報の河川データ。生成: `scripts/generate_river_tree.py`（[記録あり](kagawa-river-tree.md)） |
| `linux_kernel_tree_size.json` | C | 95796 | **12.6MB** | 未参照 | Linux カーネルのソースツリーと思われる（記録なし） |
| `react_tree.json` | B | 7438 | 1.7MB | 未参照 | 記録なし |
| `git_tree.json` | A | 4902 | 590KB | 未参照 | 記録なし |
| `flareData.json` | A | 252 | 23KB | 未参照 | D3 の flare サンプルと思われる（記録なし） |
| `d3_tree.json` | A | 194 | 22KB | 未参照 | 記録なし |
| `d3_tree_log.json` | C | 194 | 19KB | 未参照 | `d3_tree` の値を対数変換したものと思われる（記録なし） |
| `gorm_nodelink.json` | A | 194 | 21KB | 未参照 | 記録なし |
| `gorm_treemap.json` | C | 194 | 17KB | 未参照 | 記録なし |
| `lua_tree.json` | B | 116 | 11KB | 未参照 | 記録なし |
| `xv6-riscv_tree.json` | B | 83 | 9KB | 未参照 | 記録なし |

## 注意

- **論文の実験（`experiments/`）はこれらのJSONを一切使っていない。** `experiments/lib/generateTree.js` が生成する合成スケールフリー木のみを入力にしている。実データでの評価は現状 `benchmark.js`（toaruos のみ）だけ。
- **UI が描画しているのもこれらではない。** [src/App.jsx](../../src/App.jsx) の `const data = [...]` に1002ノードのランダム生成データが直書きされている。
- 由来が「記録なし」のものは、思い出したタイミングでこの表に書き足す。生成スクリプトがあるなら `scripts/` に置いて、ここからリンクする。
