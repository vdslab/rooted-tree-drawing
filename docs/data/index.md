# データセット一覧

定型的な分類を避けた追加調査は [不規則な実階層を持つデータ](irregular-tree-candidates.md)。英国教育省の組織図、返信木、実行プロファイルを取得して比較している。

実データの追加候補と構造の実測は [可変サイズ根付き木レイアウトに適した実データ](real-data-candidates.md) を参照。法令の条単位の木を第一候補とし、メモリ支配木などとの適性を比較している。

[manifest.json](manifest.json) に現在のファイルの件数・SHA-256・出典・生成手順・未確認事項を記録する。
確認できない出典・取得版・生成seedは null または未記録として残す。名前から上流プロジェクトや利用条件を断定しない。

| 形式 | キー | 利用方法 |
|---|---|---|
| A | name, parent, width, height | レイアウトへ直接入力 |
| B | name, parent, value, type | UIでvalueをheightに変換 |
| C | name, parent, value | typeを持たない値データ。変換規則を指定して使う |

| ファイル | 形式 | 件数 | 使用状況 | 出典・生成 |
|---|---|---|---|---|
| d3_tree.json | A | 194 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| d3_tree_log.json | C | 194 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| flareData.json | A | 252 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| git_tree.json | A | 4902 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| gorm_nodelink.json | A | 194 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| gorm_treemap.json | C | 194 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| kagawa_river_tree.json | A | 113 | 現在のUI・合成実験から未参照 | 生成手順あり |
| linux_kernel_tree_size.json | C | 95796 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| lua_tree.json | B | 116 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| react_tree.json | B | 7438 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| toaruos_tree.json | B | 883 | UIで選択可能（既定では未選択） | 出典・生成手順未確認 |
| xv6-riscv_tree.json | B | 83 | 現在のUI・合成実験から未参照 | 出典・生成手順未確認 |
| data/examples/inline-tree.json | A | 1000 | UIの既定入力 | 生成手順あり |

河川データの生成条件と出典は [kagawa-river-tree.md](kagawa-river-tree.md) にある。
Appから分離した合成データの値は維持したが、元の生成seedは残っていない。
論文のバッチ実験とCLIは [generateTree.js](../../experiments/lib/generateTree.js) で生成する合成木を使い、ルートの実データJSONは使わない。
旧 benchmark.js は削除済みで、現在の評価入口ではない。

出典不明の既存JSONは、この変更で第三者資料と断定して削除しない。由来を確認した際に、取得URL・上流の版・変換スクリプト・利用条件をmanifestへ補う。
新しい第三者の原資料はGit対象外の local-references に置き、追跡する派生データには再生成手順と出典を添える。

## LAYOUT-004 再現fixture

[test/fixtures/regression_budget_lpt_tall.json](../../test/fixtures/regression_budget_lpt_tall.json) はCLIの seed=1 / medium / 1:4 / trial=86。
nodes=300, alpha=0.25, nodeWidth=1000, heights=[500,1500], treeSeed=2334875884（FNV-1aで導出、mulberry32）。
[生成器](../../experiments/lib/generateTree.js)へこのシードの乱数関数を渡して再生成できる。
