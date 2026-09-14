---
name: run-experiments
description: レイアウト手法の比較実験を実行・分析する。手法やアスペクト比・分散レベルを指定して実験を回し、結果を後から掘り返し、特筆すべき試行（手法間の差が大きい／既存手法が勝った）を抽出し、その試行のレイアウトをSVGで描画して比較する。run experiment, compare layout methods, analyze area efficiency, TNA/DA, find cases where existing method wins, render layout, reproduce experiment.
---

# 実験の実行と分析

レイアウト手法（既存 / SA / LPT / binpacking）の比較実験を回し、**結果を後から掘り返す**ための
CLI ドライバー。パスは全てリポジトリルート基準。

```
.claude/skills/run-experiments/driver.mjs
```

論文用のバッチ実行（`experiments/area_efficiency.js`）とは別物。あちらは「1000試行回して
図を作る」ためのもので、こちらは**「なぜこの手法が負けたのか」を追う**ためのもの。
手法の定義（`experiments/lib/methods.js`）とマージン条件（300/200）は共有している。

## 前提

macOS / Node v22.23.2 で動作確認済み。追加インストールは不要。

```bash
npm install    # d3 が入っていない場合だけ
```

SVG を画像として見るなら macOS の QuickLook を使う（後述）。

## 使い方（エージェントはここから）

```bash
node .claude/skills/run-experiments/driver.mjs          # ヘルプ
```

### 1. 実験を回す — 手法と条件を指定できる

```bash
node .claude/skills/run-experiments/driver.mjs run \
  --metric=area --variance=low,high --aspects=1:4,1:1,4:1 \
  --trials=6 --nodes=200 --seed=1 --name=demo_area
```

```
metric=area methods=existing,sa-paper,growth-lpt,budget-lpt,budget-ffd,budget-bfd trials=6 |V|=200 seed=1
  done low 1:4
  ...
36試行を experiments/results/runs/demo_area.json に保存（木は保存せずシードから再生成する）

条件                existing    sa-paper  growth-lpt  budget-lpt  budget-ffd  budget-bfd
low/1:4             0.1753      0.1627      0.1627      0.1775      0.1751      0.1751   ← budget-lpt
high/4:1            0.1783      0.3023      0.2995      0.3081      0.3026      0.3026   ← budget-lpt

試行ごとの勝ち数: existing=8  sa-paper=3  growth-lpt=0  budget-lpt=21  budget-ffd=4  budget-bfd=0
```

| オプション | 既定 | 値 |
|---|---|---|
| `--metric` | `area` | `area`（TNA/DA）または `time`（秒） |
| `--methods` | 全6手法 | `existing, sa-paper, growth-lpt, budget-lpt, budget-ffd, budget-bfd` |
| `--aspects` | 全5種 | `1:4, 1:2, 1:1, 2:1, 4:1` |
| `--variance` | `low,medium,high` | `low, medium, high, extreme`（ノード高さの分散） |
| `--trials` `--nodes` `--seed` `--alpha` | 10 / 300 / 1 / 0.25 | |
| `--name` | `<metric>_<epoch>` | 保存名 |

**36試行×6手法で0.8秒**。`experiments/area_efficiency.js`（既定1000試行）と違い、対話的に回せる規模。

### 2. 後から結果を確認する

```bash
node .claude/skills/run-experiments/driver.mjs list              # 保存済みの実行一覧
node .claude/skills/run-experiments/driver.mjs summary demo_area # 条件ごとの平均と勝ち数
```

run 名を省略すると最新の実行を使う。

### 3. 特筆すべき試行を拾う

```bash
# 手法間の差が一番大きい試行
node .claude/skills/run-experiments/driver.mjs top demo_area --by=gap --n=3

# 既存手法が全手法に勝った試行（差の大きい順）
node .claude/skills/run-experiments/driver.mjs top demo_area --by=baseline-wins --n=3

# 特定手法が負けている試行 / 勝っている試行
node .claude/skills/run-experiments/driver.mjs top demo_area --by=loss --method=budget-lpt --n=2
node .claude/skills/run-experiments/driver.mjs top demo_area --by=win  --method=existing --n=2
```

```
=== existing が全手法に勝った試行（差の大きい順） （demo_area, area） ===
  low/1:4/0          best=existing    margin=0.0180
      existing=0.1802  sa-paper=0.1575  growth-lpt=0.1575  budget-lpt=0.1420  budget-ffd=0.1623  budget-bfd=0.1623
```

`--baseline=<手法>` で `baseline-wins` の対象を変えられる（既定 `existing`）。

### 4. その試行の実データを見る

```bash
node .claude/skills/run-experiments/driver.mjs show demo_area low/1:4/0
```

```
条件      分散=low  アスペクト比=1:4 (500x2000)  treeSeed=2673216763
木        200ノード（葉191）  深さ3  最大子数82
高さ      min=901 med=1011 max=1100  (最大/最小=1.2倍)

スコア（良い順）
  existing     0.1802
  budget-ffd   0.1623
  ...
```

木そのものを JSON で取り出す:

```bash
node .claude/skills/run-experiments/driver.mjs tree demo_area low/1:4/0 --out=/tmp/tree.json
```

### 5. レイアウトを目で見る

```bash
# 1手法だけ
node .claude/skills/run-experiments/driver.mjs render demo_area high/4:1/3 --method=existing --out=/tmp/ex.svg

# 複数手法を1枚に並べる（縦長キャンバスなら自動で横並び）
node .claude/skills/run-experiments/driver.mjs compare demo_area low/1:4/0 \
  --methods=existing,budget-lpt,budget-ffd --out=/tmp/cmp.svg
```

```
/tmp/cmp.svg に出力（3手法を横に並べた。1500x2034）
  existing     0.1802  ← 最良
  budget-ffd   0.1623
  budget-lpt   0.1420
```

葉=青、内部ノード=橙、破線が指定領域。`render` は記録済みスコアとの一致も表示する。

画像として確認する（macOS）:

```bash
cd /tmp && qlmanage -t -s 1400 -o . cmp.svg   # cmp.svg.png ができる
```

### 6. 再現性を確認する

```bash
node .claude/skills/run-experiments/driver.mjs verify demo_area --n=6
# → 再現性: 36件一致 / 0件不一致（6試行 × 6手法）
```

保存済みスコアを再計算して突き合わせる。**木も手法の乱数もシードから再生成している**ので、
一致しなければ実装が変わったということ。リファクタ後の回帰チェックに使える。

## 保存形式

`experiments/results/runs/<name>.json`。**木データは保存せず、試行ごとの `treeSeed` だけ**を持つ。

- 36試行×6手法 = **14.6KB**（`experiments/lib/runner.js` の `_trials.json` は同じ情報で235〜313MB）
- 木が要るときは `treeSeed` から再生成する（`tree` / `show` / `render` / `compare` / `verify` が自動でやる）

## 論文用のバッチ実行（別ルート）

図を作るための本番実行はこちら。詳細は `experiments/CLAUDE.md`。

```bash
TRIALS=5 SEED=1 node experiments/area_efficiency.js      # 動作確認用の短縮
```

## Gotchas

- **`existing` は `isLeaf` を返さない。** `binpacking` / `growth` のノードは
  `{id,x,y,width,height,isLeaf}` だが、`existing` は `isLeaf` を持たない。ドライバーは葉判定を
  木データ側（親として現れない名前）から作っている。手法を足すときも同じ前提で書くこと。
- **`--metric=time` の実行に `verify` は使えない。** 時間は再現しないので明示的に弾いている。
- **`treeSeed` からの再生成は `experiments/lib/generateTree.js` が変わらない前提。**
  生成アルゴリズムを触ると、過去の run の `tree` / `render` は当時と違う木を返す。
  生成器を変えるなら過去の run は捨てること。
- **`qlmanage` のサムネイルは正方形に切り出す。** 1:4 のような縦長キャンバスは下が切れる。
  `compare` は縦長のとき自動で横並びにするのでそちらの方が見やすい（`--layout=row|col` で上書き可）。
- **手法名がドライバーと論文用スクリプトで違う。** ドライバーは `budget-lpt` / `budget-ffd` /
  `budget-bfd`、`experiments/area_efficiency.js` の `paper5` プリセットは旧名 `lpt` / `ffd` / `bfd`
  で結果を保存する（過去の結果ファイルとの互換のため）。
- **`budget-ffd` と `budget-bfd` はほぼ常に同じ値になる。** 上の実行でも全条件で一致していた。
  差を見たいなら極端な分散（`--variance=extreme`）を使う。

## Troubleshooting

| 症状 | 原因と対処 |
|---|---|
| `エラー: Unknown method: nope. Available: existing, sa-paper, ...` | `--methods` の綴り違い。使える名前がそのまま出る |
| `エラー: verify は metric=area の実行にだけ使える` | 時間計測の run に `verify` を使った。`--metric=area` で取り直す |
| `エラー: 試行が見つからない: xxx（例: low/1:4/0）` | 試行IDは `<分散>/<アスペクト比>/<試行番号>`。`top` か `summary` で確認する |
| `エラー: 実行結果がない。まず run を実行すること` | `experiments/results/runs/` が空。先に `run` する |
| SVG が真っ白 / ノードが見えない | ほぼ全ノードが同色なら葉判定の問題。`show` でノード数を確認し、0でなければ描画側を疑う |
