> **ステータス**: Implemented（2026-07。`src/globalBudgetLayout.js` + `src/packing/` として実装済み）
>
> **2026-09 追記**: 本文が参照する `saColumnLayout.js` / `lpt.js` などのファイルは、どこからも import されていなかったため削除済み。内容は git 履歴に残っている。現行の実装は `src/layout/` を参照。

# B_d をビンパッキング容量として捉え直し、配置戦略をプラガブル化

## 1. きっかけ

[2026-07-global-budget-design.md](./2026-07-global-budget-design.md) / [-solution.md](./2026-07-global-budget-solution.md) で導入した `B_d`(ダミーノードごとの高さ予算)は、実装を終えてみると「容量 `B_d` のビンに葉ノードを詰める、古典的なビンパッキング問題」そのものだと気づいた。

これまでの実装(`computeColumnsForBudget`)は、LPT(Longest Processing Time first、本来はマルチプロセッサスケジューリングのアルゴリズム)を使い、「列数kを1から増やしながらLPTを試し、makespanが`B_d`以下になったら採用する」という**探索でビンパッキングを模倣**していた。これはこれで動くが、真正のビンパッキング系アルゴリズム(First-Fit Decreasing等)と比較していなかった。

## 2. 設計: 配置戦略(packing strategy)インターフェース

「支配的ノードの検出・幅拡張」(形状を変える処理、`h_i > B_d`の閾値判定+面積保存リシェイプ)と、「残りノードを列に詰める処理」(割当を変える処理)は独立した関心事。差し替え可能にするのは後者のみとした。

```js
/**
 * @param {{height:number, width:number, ...}[]} items - 1次元配列。全item.height <= capacity
 * @param {number} capacity - B_d
 * @returns {{ columns: Item[][], columnHeights: number[] }}
 */
```

この契約に従う限り、実装の内部構造は自由。LPTは「列数を探索してから割当」、FFD/BFDは「詰めながら列数が自然に決まる」という全く異なる制御構造を持つが、呼び出し側(`computeColumnsForBudget`)から見れば同じインターフェースで扱える。

## 3. 実装した戦略

| 戦略 | ファイル | 概要 |
|---|---|---|
| `lpt`(デフォルト) | `src/packing/lpt.js` | 従来通り。列数を`⌈Σh/B_d⌉`から探索しながらLPTで割当 |
| `ffd` | `src/packing/firstFitDecreasing.js` | First-Fit Decreasing。高さ降順に、収まる最初の列に入れる |
| `bfd` | `src/packing/bestFitDecreasing.js` | Best-Fit Decreasing。高さ降順に、最も残り容量が少ない(ぴったり収まる)列に入れる |

`src/packing/index.js` にレジストリ(`packingStrategies`)と `resolvePackingStrategy(nameOrFn)` を用意し、文字列名だけでなく関数を直接渡すこともできるようにした(登録なしで新しい戦略を試せる)。

## 4. ファイル構成の変更

`src/saColumnLayout.js`(1187行、旧SA方式のコメントアウトが大量に残っていた)を刷新し、`src/globalBudgetLayout.js` として新規作成した。

- 旧SA方式・旧`localFoldingLayout`関連のコメントアウトコード([2026-07-global-budget-fix.md](./2026-07-global-budget-fix.md) §7で「今後の課題」として指摘されていた)を削除
- デバッグ用の`console.log`ダンプを削除
- 未使用だった`computeGlobalTop`(呼び出し箇所なし)を削除
- 列分配部分を`packStrategy`引数として注入する形に変更(`computeColumnsForBudget`, `applyGlobalBudget`, `globalFoldingLayout`)
- `export function layout(data, width, height, options = {})` の `options.packing`(デフォルト`"lpt"`)で戦略を選択

旧 `src/saColumnLayout.js` は `src/archive/saColumnLayout.js` に退避(削除はしない。SA→LPTへの過渡期の実装として、`src/archive/SALayout.js` とは別に記録的価値がある)。

`src/lpt.js` は `src/packing/lpt.js` に統合。旧 `lptColumnFromSorted`(削除済みの`lptColumnWithDominant`専用だった)は移植していない。

## 5. benchmark.js への反映

3手法目(LPT)に加えて、4番目・5番目としてFFD・BFDを追加。既存の2手法(Misue既存手法、SA)と合わせて計5手法を同一データセットで比較できる。

```
1. 既存手法 (misue先生 - layout.js)
2. 焼きなまし法 (SA - SALayout.js)
3. 提案手法 (H_t + LPT - globalBudgetLayout.js)
4. 提案手法 (H_t + FFD - globalBudgetLayout.js)
5. 提案手法 (H_t + BFD - globalBudgetLayout.js)
```

計算時間の比較はここから得られるが、**面積効率(TNA/DA)や列数そのものの比較はまだ未実装**。今後の課題とする。

## 6. 今後の課題

- 面積効率・列数を指標にした LPT / FFD / BFD の定量比較(`benchmark.js`は現状、計算時間のみ)
- SA(`src/sa.js`)も同じ`(items, capacity)`インターフェースに適合させれば、LPT/FFD/BFDと完全に横並びで比較できる(現状はSAだけ別インターフェース・別エントリポイントのまま)
- `docs/paper/section-map.md` への反映(配置戦略の比較実験を論文のどのセクションに書くか)
