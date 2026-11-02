# データセット一覧

[manifest.json](manifest.json) に現在のファイルの件数・SHA-256・出典・生成手順・未確認事項を記録する。
確認できない出典・取得版・生成seedは null または未記録として残す。名前から上流プロジェクトや利用条件を断定しない。

| 形式 | キー | 利用方法 |
|---|---|---|
| A | name, parent, width, height | レイアウトへ直接入力 |
| B | name, parent, value, type | UIでvalueをheightに変換 |

| ファイル | 形式 | 件数 | 使用状況 | 出典・生成 |
|---|---|---|---|---|
| toaruos_tree.json | B | 883 | UIで選択可能（既定では未選択） | 出典・生成手順未確認 |
| data/examples/inline-tree.json | A | 1000 | UIの既定入力 | 生成手順あり |

河川データは元データの使用許諾が非商用のため、`local-references/kagawa_river_tree.json` に生成して追跡しない。生成条件と出典は [kagawa-river-tree.md](kagawa-river-tree.md) にある。
Appから分離した合成データの値は維持したが、元の生成seedは残っていない。
論文のバッチ実験とCLIは [generateTree.js](../../experiments/lib/generateTree.js) で生成する合成木を使い、ルートの実データJSONは使わない。
旧 benchmark.js は削除済みで、現在の評価入口ではない。

新しい第三者の原資料はGit対象外の local-references に置き、追跡する派生データには再生成手順と出典を添える。
使わなくなった実データJSONを削除した理由は [リポジトリの範囲](../decisions/2026-11-repository-scope.md) にある。

## LAYOUT-004 再現fixture

[test/fixtures/regression_budget_lpt_tall.json](../../test/fixtures/regression_budget_lpt_tall.json) はCLIの seed=1 / medium / 1:4 / trial=86。
nodes=300, alpha=0.25, nodeWidth=1000, heights=[500,1500], treeSeed=2334875884（FNV-1aで導出、mulberry32）。
[生成器](../../experiments/lib/generateTree.js)へこのシードの乱数関数を渡して再生成できる。
