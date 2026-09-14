/**
 * van der Ploeg の非レイヤード木描画と、その輪郭(contour)。
 *
 * 4手法(既存/SA/LPT/binpacking)すべてがこのファイルを共有する。
 *
 * 輪郭は「y の区間ごとの端の極値」を持つスカイライン。以前は輪郭ノードの鎖を
 * 辿る実装だったが、同じ y 帯に横並びのノードがあると片方しか通れず、
 * ノードが重なっていた(docs/decisions/2026-09-contour-skyline.md)。
 */
import * as d3 from "d3";

export function vanderploeg(root, startify) {
  if (root.children) {
    let leftData = [{ ...root.data }];
    const t = leftData[0].parent;
    leftData[0].parent = "";
    let leftSiblings;
    let currentTree;
    for (const child of root.children) {
      let currentData = [{ ...root.data }];
      currentData[0].parent = "";
      child.data.y = root.data.y + root.data.height / 2 + child.data.height / 2;
      currentData.push(...vanderploeg(child, startify));
      currentTree = startify(currentData);
      leftSiblings = startify(leftData);
      const move = separate(
        leftSiblings.children ? rightSkyline(leftSiblings) : [],
        leftSkyline(currentTree)
      );
      for (let item of currentData) {
        item.x += move;
      }
      currentData.shift();
      leftData.push(...currentData);
    }
    leftSiblings = startify(leftData);
    const leftMostNode = leftMostSiblingNode(leftSiblings.children);
    const rightMostNode = rightMostSiblingNode(leftSiblings.children);
    leftData[0].x =
      (leftMostNode.data.x -
        leftMostNode.data.width / 2 +
        rightMostNode.data.x +
        rightMostNode.data.width / 2) /
      2;
    leftData[0].parent = t;
    return leftData;
  } else {
    return [root.data];
  }
}

/**
 * 左兄弟の右スカイラインと、これから置く部分木の左スカイラインから、
 * 重ならないために必要な右方向の移動量を求める。
 *
 * 両方を y の昇順に同時に歩き、y が重なる区間だけで「右端 - 左端」を取り、
 * その最大値を返す。左に引き戻すことはしない(0 で下限を切る)。
 */
export function separate(rightSky, leftSky) {
  let move = 0;
  let r = 0;
  let l = 0;
  while (r < rightSky.length && l < leftSky.length) {
    const top = Math.max(rightSky[r].top, leftSky[l].top);
    const bottom = Math.min(rightSky[r].bottom, leftSky[l].bottom);
    if (top < bottom) {
      const need = rightSky[r].x - leftSky[l].x;
      if (need > move) move = need;
    }
    // 先に終わる方を進める
    if (rightSky[r].bottom <= leftSky[l].bottom) r += 1;
    else l += 1;
  }
  return move;
}

/**
 * 部分木の右スカイライン(y の区間ごとの右端の最大値)。
 *
 * @param {object} subtreeRoot d3.hierarchy のノード
 * @returns {Array<{top:number, bottom:number, x:number}>} y の昇順
 */
export function rightSkyline(subtreeRoot) {
  return buildSkyline(subtreeRoot, true);
}

/** 部分木の左スカイライン(y の区間ごとの左端の最小値)。 */
export function leftSkyline(subtreeRoot) {
  return buildSkyline(subtreeRoot, false);
}

/**
 * スカイラインを作る。
 *
 * 以前はこれを「輪郭ノードの鎖」として持っていたが、同じ y 帯に横並びのノードが
 * 複数あると鎖は片方しか通れず、真の端を取りこぼしてノードが重なっていた
 * (原因だった `y - width/2` の項を含め docs/known-issues.md を参照)。
 * 区間ごとに掛かっている全ノードの極値を取る形にすれば「どのノードを辿るか」という
 * 選択自体が無くなるので、取りこぼしようがない。
 *
 * subtreeRoot 自身は除く。親の x はこの時点ではまだ確定しておらず
 * (vanderploeg は全ての子を置いてから親の x を決める)、混ぜると古い値を使うことになる。
 *
 * 箱を top の昇順に持ち、各区間では「top がその区間の上端以下」の箱だけを見る。
 * 昇順なので条件を外れた時点で打ち切れる。箱の数を k として最悪 O(k^2) だが、
 * k は「葉をダミーに畳んだ後」の木の大きさなので、葉が多い木では |V| によらず
 * 小さいままになる(300ノードでも6400ノードでも20前後)。
 */
function buildSkyline(subtreeRoot, isRight) {
  const nodes = subtreeRoot.descendants();
  const boxes = [];
  const ys = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] === subtreeRoot) continue;
    const d = nodes[i].data;
    const half = (d.height || 0) / 2;
    const top = d.y - half;
    const bottom = d.y + half;
    boxes.push({ top, bottom, x: isRight ? d.x + d.width / 2 : d.x - d.width / 2 });
    ys.push(top, bottom);
  }
  if (boxes.length === 0) return [];

  boxes.sort((a, b) => a.top - b.top);
  ys.sort((a, b) => a - b);

  const skyline = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const top = ys[i];
    const bottom = ys[i + 1];
    if (top === bottom) continue;  // 重複した区切り
    let x = null;
    for (let k = 0; k < boxes.length; k++) {
      const box = boxes[k];
      if (box.top > top) break;    // top 昇順なので以降は掛からない
      if (box.bottom < bottom) continue;
      if (x === null) x = box.x;
      else if (isRight ? box.x > x : box.x < x) x = box.x;
    }
    // 空の区間は、この y の決め方では起きない。vanderploeg が
    // child.y = 親.y + 親の高さ/2 + 子の高さ/2 と置くので子の上端は必ず親の下端に
    // 接し、除外した根の下端から最下端まで隙間なく埋まるため(実測でも
    // 2,046,029 区間すべてで x が決まった)。壊れたスカイラインを黙って返さない
    // ための保険として残してある。
    if (x === null) continue;
    const last = skyline[skyline.length - 1];
    if (last && last.bottom === top && last.x === x) last.bottom = bottom;  // 同じ値なら結合
    else skyline.push({ top, bottom, x });
  }
  return skyline;
}

export function rightMostSiblingNode(children) {
  let rightMost = children[0];
  for (let i = 1; i < children.length; i++) {
    rightMost =
      rightMost.data.x + rightMost.data.width / 2 <
        children[i].data.x + children[i].data.width / 2
        ? children[i]
        : rightMost;
  }
  return rightMost;
}

export function leftMostSiblingNode(children) {
  let leftMost = children[0];
  for (let i = 1; i < children.length; i++) {
    leftMost =
      leftMost.data.x - leftMost.data.width / 2 >
        children[i].data.x - children[i].data.width / 2
        ? children[i]
        : leftMost;
  }
  return leftMost;
}

export function calcAspectRatio(root) {
  const left = d3.min(
    root.descendants(),
    (node) => node.data.x - node.data.width / 2
  );
  const right = d3.max(
    root.descendants(),
    (node) => node.data.x + node.data.width / 2
  );
  const top = d3.min(
    root.descendants(),
    (node) => node.data.y - node.data.height / 2
  );
  const bottom = d3.max(
    root.descendants(),
    (node) => node.data.y + node.data.height / 2
  );
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  return layoutWidth / layoutHeight;
}
