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
 * - prefix[j]: 子 0..j を並べ終えた森の輪郭と外枠
 *
 * 子 i が変わったら、親では prefix[i-1] から再開して子 i 以降だけを並べ直し、親の輪郭を作り直す。
 * これを根まで繰り返す。1反復の手間は「経路上で並べ直す兄弟の数 × 輪郭の長さ」で、
 * 折り畳み木全体の大きさには比例しない（木全体を辿るのは最後の finish の1回だけ）。
 * 輪郭を比べて押す・結合するやり方は van der Ploeg（core/vanderPloeg.js）の separate と同じで、
 * threads の代わりに輪郭を配列として持つ（論文 §8.3 の Moen による動的な木の配置と同じ考え方）。
 * threads は親が子の部分木の中の葉を書き換えるので、部分木を使い回す差分更新には使えない。
 */
import { growthLayout } from "./growth.js";

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
      left: null,
      right: null,
      minLeft: 0,
      maxRight: 0,
      maxBottom: 0,
      offset: [],
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
 * 子 i の座標系は最初 p の座標系と同じ位置にあり、左兄弟の森と重ならない所まで右へ押す
 * （押すのは dist > 0 のときだけ。van der Ploeg の separate と同じ）。
 */
function placeChild(p, i) {
  const child = p.c[i];
  if (i === 0) {
    p.offset[0] = 0;
    p.prefix[0] = {
      left: child.left,
      right: child.right,
      minLeft: child.minLeft,
      maxRight: child.maxRight,
      maxBottom: child.maxBottom,
    };
    return;
  }
  const forest = p.prefix[i - 1];
  const dist = separation(forest.right, child.left);
  const offset = dist > 0 ? dist : 0;
  p.offset[i] = offset;
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
  t.minLeft = Math.min(t.prelim, forest.minLeft);
  t.maxRight = Math.max(t.prelim + t.w, forest.maxRight);
  t.maxBottom = Math.max(bottom, forest.maxBottom);
}

/**
 * 左の森の右輪郭と、右の部分木の左輪郭から、重ならないために必要な右方向の移動量。
 * 両方とも同じ y（兄弟の上端）から始まるので、下端が高い方を進めながら
 * y が重なる区間ごとに「右端 - 左端」を取り、その最大値を返す。
 */
function separation(right, left) {
  let dist = -Infinity;
  let r = 0;
  let l = 0;
  while (r < right.length && l < left.length) {
    const need = right[r].x - left[l].x;
    if (need > dist) dist = need;
    const rb = right[r].bottom;
    const lb = left[l].bottom;
    if (rb <= lb) r++;
    if (rb >= lb) l++;
  }
  return dist;
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
  for (let i = 0; i < t.c.length; i++) writePositions(t.c[i], frame + t.offset[i]);
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
