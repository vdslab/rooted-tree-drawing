/**
 * 列成長型のレイアウト(SA手法 / LPT手法)。
 *
 * 一番下にあるダミーノードの列数を1つずつ増やし、目標アスペクト比に達するまで
 * 繰り返す局所貪欲法。列数 k を固定して最大列高さを最小化する部分問題を解くので、
 * ソルバーは makespan 系(solvers/saColumn.js, solvers/lptColumn.js)を使う。
 *
 * SA手法とLPT手法の違いはソルバーだけで、それ以外は完全に同じ。
 */
import { calcAspectRatio, vanderploeg } from "../core/tree.js";
import { setDummyMargin, searchBottomNode } from "../core/dummy.js";
import { runLayout } from "../core/pipeline.js";
import { saColumn } from "../solvers/saColumn.js";
import { lptColumn } from "../solvers/lptColumn.js";

export const solvers = { sa: saColumn, lpt: lptColumn };

function localFoldingLayout(root, at, xMargin, yMargin, innerYMargin, stratify, solve) {
  let a = calcAspectRatio(root);


  // 列管理：アスペクト比が目標より小さい（縦長すぎる）場合、列を増やして横長にする
  while (a < at) {
    const bottomNode = searchBottomNode(root);

    // ダミーノードがない、または全てのダミーノードが展開済みの場合は終了
    if (!bottomNode || bottomNode.data?.columns >= bottomNode.data?.leavesNum) {
      break;
    }

    // 列数を1つ増やす（layout.jsと同様）
    bottomNode.data.columns += 1;
    // console.log(`  Expanding columns to: ${bottomNode.data.columns}`);

    // ソルバー(SA または LPT)で列内を再分配する
    const saResult = solve(bottomNode.data.leaves, bottomNode.data.columns);
    if (saResult) {
      bottomNode.data.leaves = saResult.bestPartition;
      // console.log(`  SA result: maxHeight = ${saResult.maxHeight}, partitions = ${saResult.bestPartition.length}`);
    }

    setDummyMargin(root, xMargin, yMargin, innerYMargin);
    root = stratify(vanderploeg(root, stratify));
    a = calcAspectRatio(root);
    // console.log(`  New aspect ratio: ${a}`);
  }

  return root;
}

/**
 * @param {Array} data
 * @param {number} width
 * @param {number} height
 * @param {Object} [options]
 * @param {"sa"|"lpt"|Function} [options.solver="lpt"] - 列内の分配ソルバー
 * @param {number} [options.xMargin=300]
 * @param {number} [options.yMargin=200]
 * @param {number} [options.innerYMargin] - 既定は yMargin / 2
 * @param {Function} [options.random=Math.random] - SA用の乱数関数
 */
export function layout(data, width, height, options = {}) {
  const solve = typeof options.solver === "function"
    ? options.solver
    : solvers[options.solver ?? "lpt"];
  if (!solve) {
    throw new Error(`Unknown solver: "${options.solver}". Available: ${Object.keys(solvers).join(", ")}`);
  }
  const xMargin = options.xMargin ?? 300;
  const yMargin = options.yMargin ?? 200;
  const innerYMargin = options.innerYMargin ?? yMargin / 2;

  return runLayout(data, width, height, {
    xMargin,
    yMargin,
    innerYMargin,
    // SA/LPT は isInner にもマージンを足す当時の挙動を保つ(core/dummy.js の addMargin 参照)
    skipInnerMargin: false,
    fold: (root, at, xM, yM, iyM, stratify) =>
      localFoldingLayout(root, at, xM, yM, iyM, stratify, (leaves, columns) => solve(leaves, columns, options.random ?? Math.random)),
  });
}
