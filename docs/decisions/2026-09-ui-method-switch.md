> **ステータス**: Implemented（2026-09。旧 `globalBudgetLayout.js` を [uiLayout.js](../../src/uiLayout.js) に改名し、
> 手法を1行のコメント切り替えで選べるようにした。既定は従来と同じ binpacking / bfd で、
> `test/golden.mjs` は 192 ケースすべて更新なしで通過）

# UI の手法をコメント1行で切り替えられるようにする

## 背景

UI（`App.jsx` → `Tree.jsx`）は binpacking（`packing: "bfd"`）しか呼べなかった。
手法は `src/layout/methods/` に4つあり、どれも `layout(data, width, height, options)` で
同じ形なのに、UI で見比べるにはコードを書き換える必要があった。

旧 `globalBudgetLayout.js`（`src/` 直下）は「binpacking にマージン 100/100 を渡すだけ」の
ラッパーで、切り替えを足すと名前（globalBudget = `H_t` 方式）と中身が食い違う。

## 判断

**`src/uiLayout.js` に改名し、手法の選択をこのファイルの `SELECTED` に集約した。**

```javascript
const MARGIN = { xMargin: 100, yMargin: 100 };

const METHODS = {
  "budget-bfd": { fn: binpacking, opts: { packing: "bfd" } },
  "budget-ffd": { fn: binpacking, opts: { packing: "ffd" } },
  "budget-lpt": { fn: binpacking, opts: { packing: "lpt" } },
  "growth-lpt": { fn: growth, opts: { solver: "lpt" } },
  "growth-sa": { fn: growth, opts: { solver: "sa" } },
  "existing": { fn: existing, opts: {} },
};

// 手法の選択: 使いたい1行だけコメントを外す
const SELECTED = "budget-bfd";
// const SELECTED = "budget-ffd";
// ...
```

**候補を「関数そのもの」ではなくレジストリのキーで選ぶ形にしたのは lint のため。**
`const METHOD = { fn: binpacking, ... }` を並べてコメントアウトする書き方だと、
選ばれなかった手法の import が `no-unused-vars` になる。レジストリなら全ての import が
参照されるので、`eslint-disable` を書かずに済む。手法名は
`experiments/lib/methods.js` のレジストリに合わせた（`sa-paper` だけは論文条件を指す
名前なので、ここでは `growth-sa` と呼ぶ）。存在しないキーを書いたときは
起動時に使えるキー一覧つきで例外を投げる。

- `Tree.jsx` は `layout(data, width, height)` を呼ぶだけにした。手法固有のオプション
  （`packing` / `solver`）は UI 側に散らさず `uiLayout.js` に閉じている。
- マージン 100/100 は全手法共通で `MARGIN` にまとめた。

### ゴールデンを切り替え状態から切り離した

`test/golden.mjs` の `ui-budget-lpt` / `ui-budget-bfd` は旧ラッパーを import していたので、
そのままだと **UI の手法を切り替えるとゴールデンが壊れる**。UI 条件（100/100）の
カバレッジが目的なので、手法を直接呼ぶ形に変えた。

```javascript
"ui-budget-lpt": { mod: "src/layout/methods/binpacking.js",
                   opts: { packing: "lpt", xMargin: 100, yMargin: 100 } },
```

旧ラッパーは `{...options, xMargin: 100, yMargin: 100}` を渡すだけだったので、
この直接呼び出しと出力はビット単位で同一。**192 ケースすべて更新なしで通過した**ことで確認済み。

## 検証

`App.jsx` の実データ（1000ノード、深さ5、最大子数360）を 1000x750 で、候補6つすべて実行した。

| 候補 | ノード | リンク | 重なり | 時間 |
|---|---|---|---|---|
| binpacking / bfd（既定） | 1000 | 1064 | 0 | 17ms |
| binpacking / ffd | 1000 | 1064 | 0 | 10ms |
| binpacking / lpt | 1000 | 1064 | 0 | 11ms |
| growth / lpt | 1000 | 1064 | 0 | 10ms |
| growth / sa | 1000 | 1064 | 0 | 42ms |
| existing | 1000 | 1210 | 0 | 15ms |

`existing` はリンクの張り方が違うため本数が多い（ダミー内の水平線の扱いの差）。

## 影響範囲

- 旧 `globalBudgetLayout.js` は削除。参照していた `src/Tree.jsx`、`test/golden.mjs`、
  `CLAUDE.md`、`docs/implementation.md`、`experiments/CLAUDE.md`、
  `experiments/lib/methods.js`、`experiments/lib/globalBudgetPaperMargin.js` を更新した。
- `docs/decisions/2026-09-layout-core-extraction.md` の本文は旧パスを指したままにし
  （本文は編集しない運用）、ステータス行に注記して `scripts/check-docs.mjs` の
  `KNOWN_BROKEN` に登録した。
- 論文実験には影響しない（`experiments/lib/` は 300/200 の別ラッパーを使う）。

## あわせて lint を 0 件にした

`npx eslint src experiments scripts --ext .js,.jsx,.mjs` が 9 件出ていたので、
この機会に全部潰した（`src/uiLayout.js` の 2 件は上記のレジストリ化で解消）。

| 場所 | 内容 | 対応 |
|---|---|---|
| `src/App.jsx` | `useMemo` / `toaruRaw` が未使用（`toaruos_tree.json` からの変換がコメントアウトされていた） | `uiLayout.js` と同じ形にして `DATA_SOURCE` で切り替えられるようにした。両方が参照されるので未使用が消える |
| `src/layout/core/render.js` | 分割代入した `parent` が未使用 | 外した |
| `src/layout/methods/existing.js` | シングルクォート2箇所 | ダブルクォートに統一 |
| `src/layout/methods/growth.js` | `iteration` がインクリメントのみで未参照 | コメントアウトされた `console.log` ごと削除 |
| `src/packing/lpt.js` | ヒープの `while (true)` が `no-constant-condition` | 理由を書いて `eslint-disable-next-line`。設定を緩めるより局所的 |

`App.jsx` の切り替えは両データソース（直書き1000ノード / toaruos 883ノード）を
全6手法で実行し、いずれも重なり 0 を確認した。
