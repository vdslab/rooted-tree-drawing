/**
 * UI が使うレイアウトのエントリポイント。
 *
 * **手法の切り替えはこのファイルの SELECTED で行う。** 下の候補のうち使いたい1行だけ
 * コメントを外し、他をコメントアウトする。App.jsx / Tree.jsx は触らなくてよい。
 *
 * マージンは 100/100（論文実験の 300/200 とは別条件。experiments/CLAUDE.md 参照）。
 * 手法名は experiments/lib/methods.js のレジストリに合わせてある（`sa-paper` だけは
 * 論文条件を指す名前なので、ここでは `growth-sa` と呼ぶ）。
 *
 * test/golden.mjs の `ui-budget-*` は binpacking を直接呼んでいるので、
 * ここを切り替えてもゴールデンテストは壊れない。
 */
import { layout as binpacking } from "./layout/methods/binpacking.js";
import { layout as growth } from "./layout/methods/growth.js";
import { layout as existing } from "./layout/methods/existing.js";

/** UI のマージン条件。全手法で共通。 */
const MARGIN = { xMargin: 100, yMargin: 100 };

/** 選べる手法。`fn` は layout(data, width, height, options) の形で共通。 */
const METHODS = {
  "budget-bfd": { fn: binpacking, opts: { packing: "bfd" } },
  "budget-ffd": { fn: binpacking, opts: { packing: "ffd" } },
  "budget-lpt": { fn: binpacking, opts: { packing: "lpt" } },
  "growth-lpt": { fn: growth, opts: { solver: "lpt" } },
  "growth-sa": { fn: growth, opts: { solver: "sa" } },
  "existing": { fn: existing, opts: {} },
};

// ───────────────────────────────────────────────────────────────
// 手法の選択: 使いたい1行だけコメントを外す
// ───────────────────────────────────────────────────────────────

// H_t の二分探索 + 容量ベースのビンパッキング（現行の主手法）
// const SELECTED = "budget-bfd";
// const SELECTED = "budget-ffd";
// const SELECTED = "budget-lpt";

// 列成長型（列数を増やしながら、列数固定の最大列高さ最小化を解く）
// const SELECTED = "growth-lpt";
// const SELECTED = "growth-sa";    // 焼きなまし。他より遅い

// 既存手法（Misue の monotone local folding）
const SELECTED = "existing";

// ───────────────────────────────────────────────────────────────

const METHOD = METHODS[SELECTED];
if (!METHOD) {
  throw new Error(
    `Unknown method: "${SELECTED}". Available: ${Object.keys(METHODS).join(", ")}`
  );
}

/**
 * @param {Array<{name:string, parent:string, width:number, height:number}>} data
 * @param {number} width  指定領域の幅
 * @param {number} height 指定領域の高さ
 * @param {object} [options] METHOD.opts と MARGIN を上書きする（省略可）
 */
export function layout(data, width, height, options = {}) {
  return METHOD.fn(data, width, height, { ...METHOD.opts, ...MARGIN, ...options });
}
