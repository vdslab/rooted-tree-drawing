/**
 * 列成長型のレイアウト(SA手法 / LPT手法)。
 *
 * 一番下にあるダミーノードの列数を1つずつ増やし、目標アスペクト比に達するまで
 * 繰り返す局所貪欲法。列数 k を固定して最大列高さを最小化する部分問題を解くので、
 * ソルバーは makespan 系(solvers/saColumn.js, solvers/lptColumn.js)を使う。
 *
 * SA手法とLPT手法の違いはソルバーだけで、それ以外は完全に同じ。
 *
 * 配置の仕方（placement）だけを差し替えられる。このファイルの fullPlacement は反復ごとに
 * 折り畳み木全体を van der Ploeg で配置し直し、methods/growthIncremental.js は変わったダミーから
 * 根までだけを組み直す。ダミーの選び方・ソルバーの呼び方・寸法の更新・停止条件は growColumns を
 * 共有するので、2つの手法の違いは配置の差分化だけになる。
 */
import { calcAspectRatio } from "../core/tree.js";
import { vanderPloegLayout } from "../core/vanderPloeg.js";
import { setDummyNodeSize } from "../core/dummy.js";
import { Heap } from "../core/heap.js";
import { runLayout } from "../core/pipeline.js";
import { saColumn } from "../solvers/saColumn.js";
import { lptColumn } from "../solvers/lptColumn.js";

export const solvers = { sa: saColumn, lpt: lptColumn };

/**
 * 列成長のループ。
 *
 * placement は { aspectRatio(), update(target), finish() } を持つ。update はダミー target の
 * 寸法が変わった後に呼ばれ、finish は停止後に折り畳み木の data.x / data.y を確定させる。
 */
export function growColumns(root, at, margins, solve, placement) {
  const { xMargin, yMargin, innerYMargin } = margins;
  const queue = bottomDummyQueue(root);

  while (placement.aspectRatio() < at) {
    const target = queue.peek();
    // ダミーノードがない、または最底辺のダミーが展開済みなら終了する
    // （他に展開できるダミーが残っていても続けない。当時の実験値の挙動）
    if (!target || target.data.columns >= target.data.leavesNum) break;

    target.data.columns += 1;
    const result = solve(target.data.leaves, target.data.columns);
    if (result) target.data.leaves = result.bestPartition;
    // 寸法が変わるのは target だけなので、target だけを計算し直す
    Object.assign(target.data, setDummyNodeSize(target.data.leaves, xMargin, yMargin, innerYMargin));

    queue.updateTop();
    placement.update(target);
  }
  placement.finish();
  return root;
}

/**
 * 下端が最も低いダミーを O(log D) で取り出すヒープ。
 *
 * 折り畳み木ではダミーは葉で、祖先の寸法は変わらないので、ダミーの上端は反復を通じて固定。
 * 変わるのは target の高さだけなので、その1件を並べ直せばよい。
 * 上端は van der Ploeg の setY と同じ足し算の順で求め、下端も data.y（中心）+ height/2 と
 * 同じ順で足す。線形探索だった頃と浮動小数まで一致させ、同点を同じ側に割るため。
 * 同点は d3 の descendants()（幅優先）で先に来るダミーを選ぶ。
 */
function bottomDummyQueue(root) {
  const top = new Map();
  const setTop = (node, y) => {
    top.set(node, y);
    for (const child of node.children ?? []) setTop(child, y + node.data.height);
  };
  setTop(root, root.data.y - root.data.height / 2);

  const order = new Map();
  for (const node of root.descendants()) if (node.data.leaves) order.set(node, order.size);
  const bottom = (node) => top.get(node) + node.data.height / 2 + node.data.height / 2;
  const before = (a, b) => {
    const ba = bottom(a);
    const bb = bottom(b);
    return ba > bb || (ba === bb && order.get(a) < order.get(b));
  };
  return new Heap(before, order.keys());
}

/** 反復ごとに折り畳み木全体を van der Ploeg で配置し直す。 */
export function fullPlacement(root) {
  return {
    aspectRatio: () => calcAspectRatio(root),
    update: () => vanderPloegLayout(root),
    finish: () => {},
  };
}

/** 列成長型の layout()。placement を差し替えると差分更新版になる（methods/growthIncremental.js）。 */
export function growthLayout(data, width, height, options, placement) {
  const solve = typeof options.solver === "function"
    ? options.solver
    : solvers[options.solver ?? "lpt"];
  if (!solve) {
    throw new Error(`Unknown solver: "${options.solver}". Available: ${Object.keys(solvers).join(", ")}`);
  }
  const xMargin = options.xMargin ?? 300;
  const yMargin = options.yMargin ?? 200;
  const innerYMargin = options.innerYMargin ?? yMargin / 2;
  const random = options.random ?? Math.random;

  return runLayout(data, width, height, {
    xMargin,
    yMargin,
    innerYMargin,
    // SA/LPT は isInner にもマージンを足す当時の挙動を保つ(core/dummy.js の addMargin 参照)
    skipInnerMargin: false,
    fold: (root, at, xM, yM, iyM) =>
      growColumns(root, at, { xMargin: xM, yMargin: yM, innerYMargin: iyM },
        (leaves, columns) => solve(leaves, columns, random), placement(root)),
  });
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
  return growthLayout(data, width, height, options, fullPlacement);
}
