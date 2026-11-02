/**
 * 列成長型レイアウトの差分更新版（docs/decisions/2026-10-incremental-growth-layout.md）。
 *
 * methods/growth.js と同じ growColumns を使い、配置の仕方（placement）だけが違う。
 * growth.js は反復ごとに折り畳み木全体を van der Ploeg で配置し直すが、ここでは
 * 寸法が変わったダミーから根までの部分木だけを、キャッシュした輪郭から組み直す。
 * 出力は growth.js と一致する（test/growth-incremental.test.mjs）。
 *
 * 成立に使う性質:
 * - 折り畳み木ではダミーは葉で、祖先の寸法は変わらない。したがって全ノードの y（上端）は固定で、
 *   変わるのは対象ダミーの幅・高さ（下端）と、それによって決まる x だけ。
 * - 部分木の内部配置は、祖先の中での平行移動に依存しない（van der Ploeg の基準4）。
 *
 * 部分木ごとに、その部分木の座標系（van der Ploeg と同じく「最初の子だけをたどった先の葉の
 * 左端」が 0）で次をキャッシュする。
 * - prelim: 自分の左端
 * - left / right: 左右の輪郭。上から順の { x, bottom } の配列で、各区間の上端は直前の bottom
 *   （先頭は自分の上端）。y は全体で固定なので絶対座標のまま持てる。
 * - minLeft / maxRight / maxBottom: 部分木の外枠
 * - offset[j]: 子 j の座標系をこの部分木の座標系へ移すずらし量
 * - prefix[j]: 子 0..j を並べ終えた森の輪郭・外枠・IYL
 * - steps[j]: 子 j を押した各回の { si, dist }（均等配置で中間の兄弟へ配る量の元）
 *
 * 均等配置は van der Ploeg と同じく輪郭には影響させず、子の位置（c[j].mod）と外枠にだけ反映する。
 * 全体を配置し直す版の既定（spacing 有効）と同じ出力になる。
 *
 * 子 i が変わったら、親では prefix[i-1] から再開して子 i 以降だけを並べ直し、親の輪郭を作り直す。
 * これを根まで繰り返す。1反復の手間は「経路上で並べ直す兄弟の数 × 輪郭の長さ」で、
 * 折り畳み木全体の大きさには比例しない（木全体を辿るのは最後の finish の1回だけ）。
 * 輪郭を比べて押す・結合するやり方は van der Ploeg（core/vanderPloeg.js）の separate と同じで、
 * threads の代わりに輪郭を配列として持つ（論文 §8.3 の Moen による動的な木の配置と同じ考え方）。
 * threads は親が子の部分木の中の葉を書き換えるので、部分木を使い回す差分更新には使えない。
 */
import { growthLayout } from "./growth.js";
import { addChildSpacing, distributeExtra, updateIYL } from "../core/vanderPloeg.js";

export function incrementalPlacement(root) {
  const work = new Map();
  const build = (node, parent, index, top) => {
    const t = {
      node,
      parent,
      index,
      top,
      w: node.data.width,
      h: node.data.height,
      c: [],
      prelim: 0,
      mod: 0,
      shift: 0,
      change: 0,
      left: null,
      right: null,
      minLeft: 0,
      maxRight: 0,
      maxBottom: 0,
      offset: [],
      steps: [],
      prefix: [],
    };
    work.set(node, t);
    t.c = (node.children ?? []).map((child, i) => build(child, t, i, top + node.data.height));
    for (let i = 0; i < t.c.length; i++) placeChild(t, i);
    finishSubtree(t);
    return t;
  };
  const tree = build(root, null, 0, root.data.y - root.data.height / 2);

  return {
    aspectRatio: () => (tree.maxRight - tree.minLeft) / (tree.maxBottom - tree.top),
    update: (target) => {
      let t = work.get(target);
      t.w = target.data.width;
      t.h = target.data.height;
      finishSubtree(t);
      // 親では、変わった子より左の兄弟の森（prefix）を使い回し、変わった子から右だけを並べ直す
      while (t.parent) {
        const p = t.parent;
        for (let i = t.index; i < p.c.length; i++) placeChild(p, i);
        finishSubtree(p);
        t = p;
      }
    },
    finish: () => writePositions(tree, 0),
  };
}

/**
 * 親 p の座標系で子 i を置き、子 0..i の森を prefix[i] に記録する。
 * 子 i の座標系は最初 p の座標系と同じ位置にあり、最初の組（兄弟の根どうし）を接触させたあと、
 * 左兄弟の森と重ならない所まで右へ押す（van der Ploeg の separate と同じ）。
 */
function placeChild(p, i) {
  const child = p.c[i];
  if (i === 0) {
    p.offset[0] = 0;
    p.steps[0] = [];
    p.prefix[0] = {
      left: child.left,
      right: child.right,
      minLeft: child.minLeft,
      maxRight: child.maxRight,
      maxBottom: child.maxBottom,
      ih: updateIYL(child.maxBottom, 0, null),
    };
    return;
  }
  const forest = p.prefix[i - 1];
  const { offset, steps } = separation(forest, child.left);
  p.offset[i] = offset;
  p.steps[i] = steps;
  const childLeft = shift(child.left, offset);
  const childRight = shift(child.right, offset);
  p.prefix[i] = {
    // 左輪郭: 森の左輪郭のあと、子の方が深ければ子の左輪郭の続き
    left: concatBelow(forest.left, childLeft),
    // 右輪郭: 子の右輪郭のあと、森の方が深ければ森の右輪郭の続き
    right: concatBelow(childRight, forest.right),
    minLeft: Math.min(forest.minLeft, child.minLeft + offset),
    maxRight: Math.max(forest.maxRight, child.maxRight + offset),
    maxBottom: Math.max(forest.maxBottom, child.maxBottom),
    ih: updateIYL(child.maxBottom, i, forest.ih),
  };
}

/**
 * 子をすべて並べた後に、自分の位置・輪郭・外枠を決める。
 * 親は最初の子の左端と最後の子の右端の中央（van der Ploeg の positionRoot）。
 */
function finishSubtree(t) {
  const bottom = t.top + t.h;
  if (t.c.length === 0) {
    t.prelim = 0;
    t.left = [{ x: 0, bottom }];
    t.right = [{ x: t.w, bottom }];
    t.minLeft = 0;
    t.maxRight = t.w;
    t.maxBottom = bottom;
    return;
  }
  const last = t.c.length - 1;
  const first = t.c[0];
  const lastChild = t.c[last];
  t.prelim = (first.prelim + t.offset[0] + lastChild.prelim + t.offset[last] + lastChild.w) / 2 - t.w / 2;
  const forest = t.prefix[last];
  t.left = [{ x: t.prelim, bottom }, ...forest.left];
  t.right = [{ x: t.prelim + t.w, bottom }, ...forest.right];

  // 均等配置を子の位置へ反映する。van der Ploeg も addChildSpacing は輪郭を比べ終えた後に行うので、
  // 輪郭には反映しない。外枠は配置後の位置で測る。
  t.c.forEach((child, i) => {
    child.mod = t.offset[i];
    child.shift = 0;
    child.change = 0;
  });
  t.steps.forEach((steps, i) => {
    for (const { si, dist } of steps) distributeExtra(t, i, si, dist);
  });
  addChildSpacing(t);
  t.minLeft = t.prelim;
  t.maxRight = t.prelim + t.w;
  for (const child of t.c) {
    t.minLeft = Math.min(t.minLeft, child.minLeft + child.mod);
    t.maxRight = Math.max(t.maxRight, child.maxRight + child.mod);
  }
  t.maxBottom = Math.max(bottom, forest.maxBottom);
}

/**
 * 左の森の右輪郭と、右の部分木の左輪郭を上から同時に辿り、部分木のずらし量を求める。
 * 両方とも同じ y（兄弟の上端）から始まるので、下端が高い方を進める。最初の組は必ず動かし、
 * 以降は重なるときだけ右へ押す（van der Ploeg の separate と同じ順で IYL も進める）。
 * 押した各回を steps に残す。どの兄弟に押されたか（si）は均等配置で使う。
 */
function separation(forest, left) {
  const { right } = forest;
  let { ih } = forest;
  let offset = 0;
  const steps = [];
  let r = 0;
  let l = 0;
  let first = true;
  while (r < right.length && l < left.length) {
    const rb = right[r].bottom;
    const lb = left[l].bottom;
    if (rb > ih.lowY) ih = ih.nxt;
    const dist = right[r].x - (left[l].x + offset);
    if (first || dist > 0) {
      offset += dist;
      steps.push({ si: ih.index, dist });
    }
    first = false;
    if (rb <= lb) r++;
    if (rb >= lb) l++;
  }
  return { offset, steps };
}

function shift(contour, dx) {
  if (dx === 0) return contour;
  return contour.map((s) => ({ x: s.x + dx, bottom: s.bottom }));
}

/** upper の後ろに、lower のうち upper の最下端より下の部分をつなぐ。 */
function concatBelow(upper, lower) {
  const end = upper[upper.length - 1].bottom;
  let k = 0;
  while (k < lower.length && lower[k].bottom <= end) k++;
  return k < lower.length ? upper.concat(lower.slice(k)) : upper;
}

/** 根から辿って絶対座標（中心）を data.x / data.y に書く。frame はこの部分木の座標系のずらし量。 */
function writePositions(t, frame) {
  t.node.data.x = frame + t.prelim + t.w / 2;
  t.node.data.y = t.top + t.h / 2;
  for (const child of t.c) writePositions(child, frame + child.mod);
}

/**
 * @param {Array} data
 * @param {number} width
 * @param {number} height
 * @param {Object} [options] growth.js の layout と同じ
 */
export function layout(data, width, height, options = {}) {
  return growthLayout(data, width, height, options, incrementalPlacement);
}
