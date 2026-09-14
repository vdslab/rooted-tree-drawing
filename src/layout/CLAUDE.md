# src/layout/ — レイアウト実装の契約

このディレクトリを触るときのルール。全体像はリポジトリルートの CLAUDE.md、
アルゴリズムの詳細は各ファイル冒頭のコメント、設計の理由は docs/decisions/ を見ること。

## 変えてはいけない構造

パイプラインは `core/pipeline.js` の `runLayout()` 1本で、**手法が差し替えるのは `fold` だけ**。

```js
fold(root, targetAspect, xMargin, yMargin, innerYMargin, stratify) => root
```

`core/` に手法固有の分岐（`if (method === ...)`）を持ち込まないこと。手法を足すなら
`methods/` に新しいファイルを作り、そこに `fold` と `layout()` を書く。

## 2種類のソルバーを混同しない

| | 解く問題 | インターフェース | 置き場 |
|---|---|---|---|
| `solvers/` | 列数 k を固定 → 最大列高さ(makespan)を最小化 | `(leaves, columns) => { bestPartition, maxHeight }` | `saColumn.js`, `lptColumn.js` |
| `../packing/` | 容量 `B_d` → 収まる最小列数 | `(items, capacity) => { columns, columnHeights }` | `lpt.js`, `firstFitDecreasing.js`, `bestFitDecreasing.js` |

互いに双対の問題なので、`solvers/` の関数を `packing` として渡すことはできない。
`packing/lpt.js` は makespan ソルバーを列数探索でラップして容量ソルバーに変換している。

## 手法を追加する手順

1. `methods/<name>.js` に `fold` と `layout(data, width, height, options)` を書く。
   （パイプラインが共通で良いなら `runLayout` を呼ぶ。既存手法のように別物なら独自に組んでよい。）
   マージンは `options.xMargin ?? 300` のように引数で受け、ファイル内に固定値を書かない。
2. 実験に載せるなら `experiments/lib/methods.js` の `METHODS` に登録する。
3. `test/golden.mjs` の `METHODS` に追加し、`npm run test:golden:update` で記録する。

## 触ると壊れる箇所

- **`core/dummy.js` の `addMargin(..., skipInnerNodes)`**: binpacking は `true`、列成長型は `false`。
  揃えると SA/LPT の出力が変わる（golden 24ケース中12件）。当時の実験値との対応を保つための意図的な差。
- **`core/tree.js` の輪郭追跡**: 次元的に不自然な条件が実際の候補選択を支配している
  （known-issues §2）。「明らかな typo」に見えるが、直すと全手法の出力が変わる。
- **既存手法（`methods/existing.js`）は `core/pipeline.js` を使わない**。innerYMargin の概念が無く、
  ダミー展開が折りたたみ配置で、normalize の見るプロパティも違うため。共有しているのは
  `core/tree.js`（van der Ploeg と輪郭追跡）と `core/render.js` の `createPath` だけ。
  ここに `runLayout` を無理に適用しないこと。

**このディレクトリを1行でも変えたら `npm run test:golden`。** 出力が変わったなら、それが意図した
変更かを必ず確認する（意図しない変更なら、上のいずれかを踏んでいる可能性が高い）。
