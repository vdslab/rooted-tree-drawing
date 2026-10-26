# 既知の未解決問題

現行実装（`src/layout/`）に残っている制限と、実害は確認されていないが放置している疑わしい箇所。
解消済みの問題は書かない（履歴は `docs/decisions/` と git ログにある）。

---

<a id="layout-001"></a>

## LAYOUT-001: 列をまたぐ（colspan）ことができない — アーキテクチャ由来

現在のレイアウトは「1つの列の中にノードを積む」モデルで、HTMLのテーブルでいう `colspan`
（複数列の結合）にあたる概念がない。

**苦手な入力**: 幅も高さも巨大なノードが1つあり、残りが小さいノード群。

支配的ノードを幅拡張すると、そのノードが入っている列自体の幅が巨大になり、残りのノードは
細い列に押し込められる。画面の左80%を1列が占め、残り20%に他の列が密集する、といった
バランスの悪い結果になりうる。本来はレンガ積み（Masonry）のように「3列分の幅を使い、
その下に小さいノードを並べる」のが望ましいが、列管理モデルでは表現できない。

**解消するには**: 列幅を固定する現在のアプローチを捨て、2次元パッキング（Treemap的な
敷き詰めや Masonry）へアーキテクチャを変える必要がある。`H_t` / LPT 方式への移行でも
ここは変わっていない。

---

<a id="layout-002"></a>

## LAYOUT-002: ダミーノード内部の余白が上下非対称 — 面積効率を0.3〜0.7%損している

[src/layout/core/dummy.js:81](../src/layout/core/dummy.js#L81) の
`maxHeight + yMargin * 2 + innerYMargin` と、
[src/layout/core/render.js:18](../src/layout/core/render.js#L18) の
`top = dummyTop + innerYMargin * 2` の組み合わせで、ダミーの表示箱の中が
**上300 / 下0**（`innerYMargin=100` の場合）になっている。

コミット `16953df`（"兄弟を待たない葉ノードのmarginを修正"）のコメントは
「上部に innerYMargin 分のスペースを追加」と書いており、意図は「上に100」。
しかし実装は箱を +100、配置を +200 しているため、差の100が下から食われている。

**実測**: 両方を外して対称に戻すと、ノードの重なりは発生せず（0件）、面積効率は
0.27〜0.65% 改善する。直すと全手法の出力が変わるため、論文の図の再取得とセットで判断すること。

---

<a id="layout-003"></a>

## LAYOUT-003: SA / LPT だけ、ダミー内部の葉に二重にマージンが付いている可能性

`addMargin` の `skipInnerNodes`（[src/layout/core/dummy.js](../src/layout/core/dummy.js)）は
binpacking では `true`、列成長型（SA / LPT）では `false` になっている。
コミット `16953df` の修正が H_t 実装にだけ入り、論文実験用の SA / LPT に反映されなかったため。

揃えると出力が変わる（`npm run test:golden` で24ケース中12件が変化）ので、当時の実験値との
対応を保つために両方の挙動を残している。取り込むかは実験の再取得とセットで判断する。

---

<a id="layout-004"></a>

## LAYOUT-004: budget-lpt が縦長（1:4）で稀に破綻する — 平均には出ない裾の事故

`experiments/cli.mjs` で 1500 試行（5アスペクト比 × 3分散 × 100試行、
`|V|=300`、`SEED=1`）を回すと、`budget-lpt` が `budget-ffd` に対して **15%以上劣化する試行が
1:4 に集中する**。

| アスペクト比 | 崩壊（ffd比15%以上劣化） | 最悪劣化 |
|---|---|---|
| 1:4 | **23 / 300** | 35% |
| 1:2 | 1 / 300 | 17% |
| 1:1 / 2:1 / 4:1 | 0 / 300 | 6〜10% |

- **分散とは無関係**。1:4 の内訳は low / medium / high にばらける。高さ比が1.2倍の木でも
  84倍の木でも同じように崩れる。
- 共通するのは**最大子数80〜104の巨大ノードが幅500の領域に入る**こと。
- **平均では 1:4 でも budget-lpt が勝ち越している**（169/300）ため、条件平均の表には現れない。
- ダミー幅の水平マージン計上を変えても件数が変わらない（21/300 → 23/300）ので、
  列間の間隔とは別の原因（間隔自体は2026-09に
  [Misue の配線規約から導出し直した](decisions/2026-09-column-pitch-misue.md)）。

崩れた試行では列が極端に細長く伸びて指定領域を大きくはみ出す。LPT が列数を少なく
見積もっている疑いがあるが、`src/packing/lpt.js` の列数決定は未確認。

再現:

```bash
node experiments/cli.mjs run --metric=area --trials=100 --seed=1 --name=area_t100
node experiments/cli.mjs top area_t100 --by=loss --method=budget-lpt --n=5
node experiments/cli.mjs compare area_t100 medium/1:4/86 \
  --methods=existing,budget-ffd,budget-lpt --out=/tmp/cmp.svg
```

再現入力は [regression_budget_lpt_tall.json](../test/fixtures/regression_budget_lpt_tall.json) に固定した。
生成条件: CLI seed=1、medium=[500,1500]、aspect=1:4、trial=86、nodes=300、alpha=0.25、nodeWidth=1000、treeSeed=2334875884。
全手法・両マージンで回帰と不変条件を検査する。これは劣化する挙動の追跡であり、LPTの面積効率問題を解消したという意味ではない。
