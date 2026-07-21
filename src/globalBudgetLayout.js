import * as d3 from "d3";
import { resolvePackingStrategy } from "./packing/index.js";

// ========================================
// グローバル高さ予算 H_t による統一的レイアウト
// 詳細: docs/decisions/2026-07-global-budget-design.md, docs/decisions/2026-07-global-budget-solution.md
// 配置戦略(packing strategy)の切り替え: docs/decisions/2026-07-pluggable-packing.md
// ========================================

/**
 * 2次元配列を1次元に変換
 */
function to1D(leaves) {
  return leaves.flat();
}

/**
 * 全ダミーノードを収集し、各ダミーの y_top(上端座標)を返す
 *
 * @param {Object} root - d3.stratify() で構築されたツリーのルート
 * @returns {Array} [{ node, yTop }, ...]
 */
function collectDummyNodes(root) {
  return root.descendants()
    .filter(node => node.data?.leaves)
    .map(node => ({
      node: node,
      yTop: node.data.y - node.data.height / 2
    }));
}

/**
 * レイアウト全体の底辺(最大の y + height/2)を返す
 *
 * @param {Object} root - d3.stratify() で構築されたツリーのルート
 * @returns {number} グローバル底辺の y 座標
 */
function computeGlobalBottom(root) {
  return d3.max(root.descendants(), node => node.data.y + node.data.height / 2);
}

/**
 * H_t の下限を計算する
 *
 * 各ダミー d の B_d = H_t - y_top(d) が正である限り、computeColumnsForBudget
 * は(どんなに小さい正の値でも)支配的ノードを B_d ちょうどまで幅拡張して
 * 縮められる。縮小が本当に止まる(原寸のまま専用列に置くフォールバックに
 * 切り替わる)のは B_d <= 0 になったときだけ。
 *
 * B_d(d) <= 0 <=> H_t <= y_top(d) であり、y_top(d) は非葉(分岐)ノードの
 * 高さの積み上げだけで決まる、ダミー内部の中身に一切依存しない不変値。
 * つまり「これ以上どうやっても縮められない」という意味での真の下限は
 * y_top(d) そのものであり、葉の高さは無関係。
 *
 * 全ダミーが同時に B_d <= 0(これ以上探索しても意味がない状態)になる
 * には、H_t が全ダミーの y_top の中で最小のものを下回っている必要がある
 * (y_top が一番小さい=一番浅いダミーが、一番最後まで B_d > 0 を保てる
 * ため、そこが基準になる)。
 *
 * @param {Object} root - d3.stratify() で構築されたツリーのルート
 * @returns {number} H_min(グローバル上端からの相対値ではなく、絶対 y 座標)
 */
function computeHMin(root) {
  const dummies = collectDummyNodes(root);
  if (dummies.length === 0) return 0;

  return Math.min(...dummies.map(({ yTop }) => yTop));
}

/**
 * B_d(高さ予算)に基づいてダミーノード内の列数・分配を決定する
 *
 * 1. h_i > B_d のノードを支配的ノードとして幅拡張(高さ = B_d に面積保存)
 * 2. 残りノードを packStrategy(items, B_d) に渡して列分配を決定する
 *
 * @param {Array} leaves1D - ダミーノード内の全ノード(1次元配列)
 * @param {number} Bd - 高さ予算 B_d = H_t - y_top(d)
 * @param {Function} packStrategy - (items, capacity) => { columns, columnHeights }
 * @returns {{ partition: Array[], columns: number }}
 */
function computeColumnsForBudget(leaves1D, Bd, packStrategy) {
  if (leaves1D.length === 0) {
    return { partition: [], columns: 0 };
  }

  // Step 1: 支配的ノードを検出(h_i > B_d)し、幅拡張
  //
  // B_d <= 0(深いダミーで y_top が H_t を超えた場合)は面積保存で拡張先の
  // 高さが 0 以下になり計算できないため、その場合は原寸のまま専用列に置く
  // (これ以上は縮められない=最大列数に達した状態として扱う)。
  const dominants = [];
  const normals = [];

  for (const node of leaves1D) {
    const nodeHeight = node.height || 0;
    if (nodeHeight > Bd) {
      if (Bd > 0) {
        const k = nodeHeight / Bd;
        dominants.push({
          ...node,
          width: node.width * k,
          height: Bd,
          isWidened: true,
        });
      } else {
        dominants.push({ ...node });
      }
    } else {
      normals.push(node);
    }
  }

  // 全ノードが支配的 -> 各ノード1列ずつ
  if (normals.length === 0) {
    return {
      partition: dominants.map(n => [n]),
      columns: dominants.length,
    };
  }

  // Step 2: 残りノードの列分配を packStrategy に委譲
  const { columns: normalColumns } = packStrategy(normals, Bd);

  // Step 3: 支配的ノード列 + 通常ノード列を結合
  const partition = [
    ...dominants.map(n => [n]),
    ...normalColumns,
  ];

  return {
    partition: partition,
    columns: dominants.length + normalColumns.length,
  };
}

/**
 * H_t(グローバル高さ予算)に基づいて全ダミーノードの列数・分配を一括決定する
 *
 * 各ダミーノード d について:
 *   B_d = Ht - y_top(d)  (使える高さ予算)
 *   computeColumnsForBudget で列数・分配を決定
 *
 * @param {Object} root - d3.stratify() で構築されたツリーのルート
 * @param {number} Ht - グローバル高さ予算(絶対 y 座標)
 * @param {number} xMargin - x方向マージン
 * @param {number} yMargin - y方向マージン
 * @param {number} innerYMargin - ダミーノード内部のy方向マージン
 * @param {Function} packStrategy - (items, capacity) => { columns, columnHeights }
 */
function applyGlobalBudget(root, Ht, xMargin, yMargin, innerYMargin, packStrategy) {
  const dummies = collectDummyNodes(root);

  for (const { node, yTop } of dummies) {
    const Bd = Ht - yTop;
    const leaves1D = to1D(node.data.leaves);
    const result = computeColumnsForBudget(leaves1D, Bd, packStrategy);

    node.data.leaves = result.partition;
    node.data.columns = result.columns;
  }

  // ダミーノードサイズを再計算
  setDummyMargin(root, xMargin, yMargin, innerYMargin);
}

/**
 * H_t の二分探索によるアスペクト比制御
 *
 * H_t を二分探索して目標アスペクト比 at に合わせる。
 *
 * 単調性:
 *   H_t を大きくする -> B_d が増える -> 列数が減る -> 幅が狭まる
 *   -> アスペクト比 W/H が減少
 *   つまりアスペクト比は H_t に対して単調減少 -> 二分探索が成立
 *
 * @param {Object} root - d3.stratify() で構築されたツリーのルート
 * @param {number} at - 目標アスペクト比 (width / height)
 * @param {number} xMargin - x方向マージン
 * @param {number} yMargin - y方向マージン
 * @param {number} innerYMargin - ダミーノード内部のy方向マージン
 * @param {Function} stratify - d3.stratify() 関数
 * @param {Function} packStrategy - (items, capacity) => { columns, columnHeights }
 * @returns {Object} レイアウト済みのルートノード
 */
function globalFoldingLayout(root, at, xMargin, yMargin, innerYMargin, stratify, packStrategy) {
  // Step 1: 初期状態(1列)のアスペクト比を確認
  let a = calcAspectRatio(root);
  if (a >= at) return root;  // 既に目標以上なら何もしない

  // ダミーノードがない場合は終了
  const dummies = collectDummyNodes(root);
  if (dummies.length === 0) return root;

  // 各ダミーの元のleavesデータ(1列状態)を保存
  // 二分探索の各イテレーションで復元して、累積的な幅拡張を防止する
  const originalLeavesMap = new Map();
  for (const { node } of dummies) {
    const leaves1D = to1D(node.data.leaves);
    originalLeavesMap.set(node.id, leaves1D.map(n => ({
      ...n,
      _origWidth: n.width,
      _origHeight: n.height,
    })));
  }

  // Step 2: 探索範囲の設定(絶対 y 座標)
  const globalBottom = computeGlobalBottom(root);  // 1列時の底辺 = H_max
  const H_min_abs = computeHMin(root);              // 最低限必要な底辺

  let H_max = globalBottom;
  let H_min = H_min_abs;

  // Step 3: 二分探索
  const MAX_ITER = 30;
  const TOLERANCE = 0.05;  // アスペクト比の相対誤差 5% 以内で収束
  let bestRoot = root;
  let bestAspectDiff = Math.abs(a - at);

  for (let i = 0; i < MAX_ITER; i++) {
    const H_mid = (H_max + H_min) / 2;

    // 各ダミーのleavesを元データから復元してからapplyGlobalBudgetを適用
    // これにより、前のイテレーションの幅拡張が累積しない
    for (const { node } of collectDummyNodes(root)) {
      const origLeaves = originalLeavesMap.get(node.id);
      if (origLeaves) {
        const restored = origLeaves.map(n => ({
          ...n,
          width: n._origWidth,
          height: n._origHeight,
          isWidened: false,
        }));
        node.data.leaves = [restored];
        node.data.columns = 1;
      }
    }

    applyGlobalBudget(root, H_mid, xMargin, yMargin, innerYMargin, packStrategy);
    root = stratify(vanderploeg(root, stratify));
    a = calcAspectRatio(root);
    const aspectDiff = Math.abs(a - at);

    if (aspectDiff < bestAspectDiff) {
      bestAspectDiff = aspectDiff;
      bestRoot = root;
    }

    if (aspectDiff / at < TOLERANCE) break;

    if (a < at) {
      // まだ縦長 -> H_t を下げる -> 列を増やす -> 幅を広げる
      H_max = H_mid;
    } else {
      // 横長すぎ -> H_t を上げる -> 列を減らす -> 幅を狭める
      H_min = H_mid;
    }
  }

  return bestRoot;
}

// ========================================
// 列管理版レイアウト(ジオメトリ)
// ========================================

//葉群をダミーノードにする関数
function createDammuy(root, xMargin, yMargin, innerYMargin) {
  if (root.children) {
    const data = [{ ...root.data, x: 0, y: 0 }];
    const dummyLesaves = [];
    for (const child of root.children) {
      const childData = createDammuy(child, xMargin, yMargin, innerYMargin);

      //childDataが葉だったら
      if (childData.length == 1) {
        const childObj = childData[0];
        childObj.width += xMargin;
        childObj.height += innerYMargin * 2;
        childObj.isInner = true; // 識別フラグ
        dummyLesaves.push(childObj);
      } else {
        data.push(...childData);
      }
    }
    dummyLesaves.length <= 1
      ? data.push(...dummyLesaves)
      : data.unshift({
        name: root.data.name + "leaves",
        parent: root.data.name,
        leaves: dummyLesaves,
        columns: 1, // 列管理:初期は1列(縦長から開始)
        leavesNum: dummyLesaves.length,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      });
    return data;
  } else {
    return [{ ...root.data, x: 0, y: 0 }];
  }
}

//van der ploegのアルゴリズムを実装する関数
function vanderploeg(root, startify) {
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
        leftSiblings.children
          ? rightCountur(
            leftSiblings,
            rightMostSiblingNode(leftSiblings.children)
          )
          : [],
        leftCountur(currentTree, leftMostSiblingNode(currentTree.children))
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

//左の兄弟ツリーに現在のサブツリーを、左からくっつけるための最小移動距離を返す関数
function separate(leftSiblingsRightCounturList, curentSubTreeLeftCounturList) {
  let currentRightCounturNode = leftSiblingsRightCounturList;
  let currentLeftCounturNode = curentSubTreeLeftCounturList;
  let l = 0;
  let r = 0;
  let diffSum = 0;
  while (currentRightCounturNode[r] && currentLeftCounturNode[l]) {
    let xl =
      currentLeftCounturNode[l].data.x -
      currentLeftCounturNode[l].data.width / 2;
    let xr =
      currentRightCounturNode[r].data.x +
      currentRightCounturNode[r].data.width / 2;
    if (xl + diffSum < xr) {
      const diff = xr - xl - diffSum;
      diffSum += diff;
    }
    let yl =
      currentLeftCounturNode[l].data.y +
      currentLeftCounturNode[l].data.height / 2;
    let yr =
      currentRightCounturNode[r].data.y +
      currentRightCounturNode[r].data.height / 2;
    if (yl <= yr) {
      l += 1;
    }
    if (yl >= yr) {
      r += 1;
    }
  }
  return diffSum;
}

//兄弟の右端を返す関数
function rightMostSiblingNode(children) {
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

//兄弟の左端を返す関数
function leftMostSiblingNode(children) {
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

//rightMostNodeからの右輪郭ノードを返す関数
function rightCountur(root, rightMostNode) {
  let countur;
  if (rightMostNode.children) {
    countur = [
      rightMostNode,
      ...rightCountur(root, rightMostSiblingNode(rightMostNode.children)),
    ];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if (
        rightMostNode.data.y + rightMostNode.data.height / 2 <
        node.data.y + node.data.height / 2 &&
        (kouho === null ||
          (kouho.data.y - kouho.data.width / 2 >=
            node.data.y - node.data.width / 2 &&
            kouho.data.x + kouho.data.width / 2 <=
            node.data.x + node.data.width / 2) ||
          (rightMostNode.data.y + rightMostNode.data.height / 2 <
            kouho.data.y - kouho.data.height / 2 &&
            rightMostNode.data.y - rightMostNode.data.height / 2 >
            kouho.data.y - kouho.data.height / 2))
      ) {
        kouho = node;
      }
    }
    countur = kouho
      ? [rightMostNode, ...rightCountur(root, kouho)]
      : [rightMostNode];
    return countur;
  }
}

//leftMostNodeからの左輪郭ノードを返す関数
function leftCountur(root, leftMostNode) {
  let countur;
  if (leftMostNode.children) {
    countur = [
      leftMostNode,
      ...leftCountur(root, leftMostSiblingNode(leftMostNode.children)),
    ];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if (
        leftMostNode.data.y + leftMostNode.data.height / 2 <
        node.data.y + node.data.height / 2 &&
        (kouho === null ||
          (kouho.data.y - kouho.data.width / 2 >=
            node.data.y - node.data.width / 2 &&
            kouho.data.x - kouho.data.width / 2 >=
            node.data.x - node.data.width / 2) ||
          (leftMostNode.data.y + leftMostNode.data.height / 2 <
            kouho.data.y - kouho.data.height / 2 &&
            leftMostNode.data.y - leftMostNode.data.height / 2 >
            kouho.data.y - kouho.data.height / 2))
      ) {
        kouho = node;
      }
    }
    countur = kouho
      ? [leftMostNode, ...leftCountur(root, kouho)]
      : [leftMostNode];
    return countur;
  }
}

//ダミーノードを含んだ根付き木で、それぞれのノードサイズを余白付きに変更
function addMargin(root, xMargin, yMargin, innerYMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin, innerYMargin)
    };
  } else if (!root.data.isInner) {
    // isInner でないノードにのみマージンを追加(isInner は createDammuy で既にマージン追加済み)
    root.data.width = root.data.width + xMargin;
    root.data.height = root.data.height + yMargin * 2;
  }
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;
  if (root?.children) {
    for (const child of root.children) {
      addMargin(child, xMargin, yMargin, innerYMargin);
    }
  }
}

//ダミーノードの余白を計算し設定
function setDummyMargin(root, xMargin, yMargin, innerYMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin, innerYMargin)
    };
  }
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;
  if (root?.children) {
    for (const child of root.children) {
      setDummyMargin(child, xMargin, yMargin, innerYMargin);
    }
  }
}

// 列管理版:ダミーノードの幅を計算(各列の最大幅の合計 + 列間のマージン)
function calcDummyDataWidth(leaves, xMargin) {
  let totalWidth = 0;
  for (const colLeaves of leaves) {
    const maxWidthInCol = colLeaves.reduce((max, node) => Math.max(max, node.width || 0), 0);
    totalWidth += maxWidthInCol;
  }
  const columnGaps = Math.max(0, leaves.length - 1) * xMargin;
  return totalWidth + columnGaps + xMargin;
}

// 列管理版:ダミーノードの高さを計算(最大列高さ)
function calcDummyNodeHeight(leaves, yMargin, innerYMargin) {
  let maxHeight = 0;
  for (const colLeaves of leaves) {
    const colHeight = colLeaves.reduce((sum, node) => sum + (node.height || 0), 0);
    maxHeight = Math.max(maxHeight, colHeight);
  }
  return maxHeight + yMargin * 2 + innerYMargin;
}

//ダミーノードの横・縦幅を設定
function setDummyNodeSize(leaves, xMargin, yMargin, innerYMargin) {
  return {
    width: calcDummyDataWidth(leaves, xMargin),
    height: calcDummyNodeHeight(leaves, yMargin, innerYMargin)
  };
}

//最初に、ダミーノードを含んだデータから1列の2次元葉群データを作成(全ノードを1列に)
function initDammyData([...dummyData]) {
  return (
    dummyData.map((item) => {
      if (item?.leaves) {
        item.leaves = [item.leaves];
      }
      return item;
    })
  );
}

//余白を取り除く関数
function format(root, xMargin, yMargin, innerYMargin) {
  for (let node of root.descendants()) {
    node.x = node.data.x;
    node.y = node.data.y;

    const marginY = node.data.isInner ? innerYMargin : yMargin;

    node.width = node.data.width - xMargin;
    node.height = node.data.height - marginY * 2;
  }
}

function createPath(pathId, x1, x2, y1, y2) {
  return {
    id: pathId,
    segments: [
      [x1, y1],
      [x2, y2],
    ],
  };
}

// ノードの表示サイズを計算するヘルパー関数
function getDisplaySize(node, xMargin, yMargin) {
  return {
    width: node.data.width - xMargin,
    height: node.data.height - yMargin * 2
  };
}

//ツリーのアスペクト比を返す関数
function calcAspectRatio(root) {
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

// 列管理版:ダミーノードを展開する関数
function undoDummyNode(root, xMargin, yMargin, innerYMargin) {
  const newData = root.descendants().flatMap((item) => {
    const { data, parent } = item;
    if (data?.leaves) {
      const leaves = [];
      const { x, y, height, width } = data;
      // ダミーノードの表示上端を計算
      const displayHeight = height - yMargin * 2;
      const dummyTop = y - displayHeight / 2;
      // 葉の配置開始位置:ダミーノード上端から innerYMargin * 2 分下
      const top = dummyTop + innerYMargin * 2;
      const left = x - width / 2 + xMargin / 2;

      if (data?.columns === data?.leavesNum) {
        // 1行(各列に1ノードずつ):横に並べる
        const colWidths = data.leaves.map(col => col[0].width);
        let tx = left;
        for (let i = 0; i < data.leavesNum; i++) {
          const node = data.leaves[i][0];
          const colWidth = colWidths[i];
          node.x = tx + colWidth / 2;
          node.y = top + node.height / 2;
          tx += colWidth + xMargin;
          leaves.push({ ...node });
        }
      } else if (data.columns === 1) {
        // 1列(全ノードが縦に並ぶ)
        let ty = top;
        for (let i = 0; i < data.leaves[0].length; i++) {
          const node = data.leaves[0][i];
          node.x = left + node.width / 2;
          node.y = ty + node.height / 2;
          ty += node.height;
          leaves.push({ ...node });
        }
      } else {
        // 複数列:全て上から下に配置
        const colMaxWidths = data.leaves.map(col =>
          col.reduce((max, node) => Math.max(max, node.width || 0), 0)
        );

        let tx = left;
        data.leaves.forEach((col, colIndex) => {
          const colWidth = colMaxWidths[colIndex];
          let ty = top;

          col.forEach((node) => {
            node.x = tx + colWidth / 2;
            node.y = ty + node.height / 2;
            ty += node.height;
            leaves.push({ ...node });
          });

          tx += colWidth + xMargin;
        });
      }
      return leaves;
    } else {
      return [data];
    }
  });

  return newData;
}

// 配線を作る関数
function createLinks(root, xMargin, yMargin, innerYMargin) {
  if (root.children) {
    const links = [];
    const leftMostNode = leftMostSiblingNode(root.children);
    const rightMostNode = rightMostSiblingNode(root.children);

    const rootDisplaySize = getDisplaySize(root, xMargin, yMargin);
    const parentBottom = root.data.y + rootDisplaySize.height / 2;

    const childTops = root.children.map(child => {
      const marginY = child.data.isInner ? innerYMargin : yMargin;
      const childHeight = child.data.height - marginY * 2;
      return child.data.y - childHeight / 2;
    });
    const minChildTop = Math.min(...childTops);

    // 水平線のY座標:親の下端と子の上端の中間点
    const horizonY = (parentBottom + minChildTop) / 2;

    links.push(
      createPath(
        `${root.id}toChild`,
        root.data.x,
        root.data.x,
        parentBottom,
        horizonY,
      ),
      createPath(
        `${root.id}Horizon`,
        leftMostNode.data.x,
        rightMostNode.data.x,
        horizonY,
        horizonY,
      ),
    );

    for (const child of root.children) {
      const marginY = child.data.isInner ? innerYMargin : yMargin;
      const childHeight = child.data.height - marginY * 2;
      const childTop = child.data.y - childHeight / 2;

      links.push(
        createPath(
          `${child.id}toParent`,
          child.data.x,
          child.data.x,
          horizonY,
          childTop,
        ),
      );
      links.push(...createLinks(child, xMargin, yMargin, innerYMargin));
    }
    return links;
  } else if (root.data?.leaves) {
    return createDummyLinks(root, xMargin, yMargin, innerYMargin);
  } else {
    return [];
  }
}

//ダミーノード内のリンクを作成する関数(列管理版)
function createDummyLinks(dummyNode, xMargin, yMargin, innerYMargin) {
  if (dummyNode.data?.leaves) {
    const links = [];
    const data = dummyNode.data;
    const { leaves, x, y, height, width } = dummyNode.data;

    const displayHeight = height - yMargin * 2;
    const dummyTop = y - displayHeight / 2; // ダミーノードの上端(親からの接続点)

    const leafStartY = dummyTop + innerYMargin * 2;
    const left = x - width / 2 + xMargin / 2;

    // 水平線の位置:ダミーノードの上端(親からの接続点と同じ)
    const horizonY = dummyTop;

    const colMaxWidths = leaves.map(col =>
      col.reduce((max, node) => Math.max(max, node.width || 0), 0)
    );

    if (data?.columns === data?.leavesNum) {
      // 1行
      const colWidths = leaves.map(col => col[0].width);
      let tx = left;
      const nodePositions = [];
      for (let i = 0; i < data.leavesNum; i++) {
        const node = leaves[i][0];
        const colWidth = colWidths[i];
        const displayWidth = colWidth - xMargin;
        const displayNodeHeight = node.height - innerYMargin * 2;
        const nodeX = tx + colWidth / 2;
        const nodeY = leafStartY + node.height / 2;
        nodePositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
        tx += colWidth + xMargin;
      }

      const leftX = nodePositions[0].x;
      const rightX = nodePositions[nodePositions.length - 1].x;
      const horizonStartX = Math.min(x, leftX);
      const horizonEndX = Math.max(x, rightX);
      links.push(createPath(`${dummyNode.id}Horizon`, horizonStartX, horizonEndX, horizonY, horizonY));

      nodePositions.forEach((pos) => {
        const nodeTop = pos.y - pos.displayHeight / 2;
        links.push(createPath(`${pos.node.name}toParent`, pos.x, pos.x, horizonY, nodeTop));
      });

    } else if (data.columns === 1) {
      // 1列
      let ty = leafStartY;
      const nodePositions = [];
      for (const node of leaves[0]) {
        const nodeX = left + node.width / 2;
        const nodeY = ty + node.height / 2;
        const displayWidth = node.width - xMargin;
        const displayNodeHeight = node.height - innerYMargin * 2;
        nodePositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
        ty += node.height;
      }

      const lastPos = nodePositions[nodePositions.length - 1];
      const bottomY = lastPos.y;
      links.push(createPath(`${dummyNode.id}Horizon`, x, left, horizonY, horizonY));
      links.push(createPath(`${dummyNode.id}Vertical`, left, left, horizonY, bottomY));

      for (const pos of nodePositions) {
        const nodeLeft = pos.x - pos.displayWidth / 2;
        links.push(createPath(`${pos.node.name}Horizon`, left, nodeLeft, pos.y, pos.y));
      }

    } else {
      // 複数列
      let tx = left;
      const allNodePositions = [];

      leaves.forEach((col, colIndex) => {
        const colWidth = colMaxWidths[colIndex];
        let ty = leafStartY;
        const colPositions = [];

        col.forEach((node) => {
          const nodeX = tx + colWidth / 2;
          const nodeY = ty + node.height / 2;
          const displayWidth = node.width - xMargin;
          const displayNodeHeight = node.height - innerYMargin * 2;
          colPositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
          ty += node.height;
        });

        allNodePositions.push(colPositions);
        tx += colWidth + xMargin;
      });

      const colVerticalXs = [];
      tx = left;
      for (let i = 0; i < data.columns; i++) {
        colVerticalXs.push(tx);
        tx += colMaxWidths[i] + xMargin;
      }

      const firstVerticalX = colVerticalXs[0];
      const lastVerticalX = colVerticalXs[data.columns - 1];
      const horizonStartX = Math.min(x, firstVerticalX);
      const horizonEndX = Math.max(x, lastVerticalX);
      links.push(createPath(`${dummyNode.id}HorizontalMain`, horizonStartX, horizonEndX, horizonY, horizonY));

      allNodePositions.forEach((colPositions, colIndex) => {
        const lastPos = colPositions[colPositions.length - 1];
        const colBottom = lastPos.y;
        const verticalX = colVerticalXs[colIndex];

        links.push(createPath(`${dummyNode.id}Col${colIndex}Vertical`, verticalX, verticalX, horizonY, colBottom));

        colPositions.forEach((pos) => {
          const nodeLeft = pos.x - pos.displayWidth / 2;
          links.push(createPath(`${pos.node.name}toLink`, verticalX, nodeLeft, pos.y, pos.y));
        });
      });
    }
    return links;
  } else {
    return [];
  }
}

/**
 * @param {Object} data - d3.stratify() 用のフラットなノード配列
 * @param {number} width - 出力キャンバスの幅
 * @param {number} height - 出力キャンバスの高さ
 * @param {Object} [options]
 * @param {string|Function} [options.packing="lpt"] - ダミーノード内の配置戦略。
 *   "lpt" | "ffd" | "bfd" またはカスタム関数 (items, capacity) => { columns, columnHeights }
 *   一覧: src/packing/index.js
 */
export function layout(data, width, height, options = {}) {
  const packStrategy = resolvePackingStrategy(options.packing ?? "lpt");

  const xMargin = 500;
  const yMargin = 500;
  const innerYMargin = yMargin / 2;

  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);
  let root = stratify(data);
  const dummyData = createDammuy(root, xMargin, yMargin, innerYMargin);
  const initializedDummyData = initDammyData(dummyData);
  root = stratify(initializedDummyData);
  addMargin(root, xMargin, yMargin, innerYMargin);

  root = stratify(vanderploeg(root, stratify));
  root = globalFoldingLayout(root, width / height, xMargin, yMargin, innerYMargin, stratify, packStrategy);

  const layoutedData = undoDummyNode(root, xMargin, yMargin, innerYMargin);
  const links = createLinks(root, xMargin, yMargin, innerYMargin);

  root = stratify(layoutedData);
  format(root, xMargin, yMargin, innerYMargin);

  const left =
    d3.min(root.descendants(), (node) => node.data.x - node.data.width / 2) - xMargin;
  const right =
    d3.max(root.descendants(), (node) => node.data.x + node.data.width / 2) + xMargin;
  const top = d3.min(root.descendants(), (node) => node.data.y - node.data.height / 2);
  const bottom = d3.max(root.descendants(), (node) => node.data.y + node.data.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);

  for (const node of root.descendants()) {
    node.x = (node.data.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.data.y - top - layoutHeight / 2) * scale + height / 2;
    node.width = node.width * scale;
    node.height = node.height * scale;
  }

  const scaledLinks = links.map((link) => {
    link.segments[0][0] =
      (link.segments[0][0] - left - layoutWidth / 2) * scale + width / 2;
    link.segments[0][1] =
      (link.segments[0][1] - top - layoutHeight / 2) * scale + height / 2;
    link.segments[1][0] =
      (link.segments[1][0] - left - layoutWidth / 2) * scale + width / 2;
    link.segments[1][1] =
      (link.segments[1][1] - top - layoutHeight / 2) * scale + height / 2;
    return link;
  });

  const finalNodes = root.descendants().map((node) => {
    const { id, x, y, width, height, children } = node;
    const isLeaf = !children || children.length === 0;
    return { id, x, y, width, height, isLeaf };
  });

  return {
    nodes: finalNodes,
    links: scaledLinks,
  };
}
