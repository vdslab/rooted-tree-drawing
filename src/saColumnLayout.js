import * as d3 from "d3";

/**
 * 列管理の焼きなまし法
 * - 幅固定、高さ可変
 * - 最大列高さを最小化
 */
export function saColumn(leaves, colNum) {
  // --- 1. パラメータ設定 ---
  const options = {
    initialTemp: 1000,
    finalTemp: 0.1,
    coolingRate: 0.995,
    iterationsPerTemp: 200,
  };

  // --- 2. 初期化 ---
  const arr = to1D(leaves);
  const leavesNum = arr.length;

  if (leavesNum < colNum) {
    console.error("エラー: ノード数より列数の方が多いです。");
    return null;
  }

  const solution = generateInitialSolutionNoEmpty(colNum, leavesNum);
  const { eachColHeight, groupCounts } = calcInitialState(arr, solution, colNum);
  let currentMaxHeight = Math.max(...eachColHeight);

  // ★ 列が1つしかない場合は探索不要で即時リターン
  if (colNum <= 1) {
    const resultPartition = Array.from({ length: colNum }, () => []);
    if (colNum === 1) {
      resultPartition[0] = arr;
    }
    const finalHeights = resultPartition.map(group =>
      group.reduce((sum, node) => sum + (node.height || 0), 0)
    );

    return {
      bestPartition: resultPartition,
      maxHeight: currentMaxHeight,
      columnHeights: finalHeights,
    };
  }

  // 最良解の保存用
  let bestSolution = [...solution];
  let bestMaxHeight = currentMaxHeight;
  let temp = options.initialTemp;

  // --- 3. 焼きなまし法のメインループ ---
  while (temp > options.finalTemp) {
    for (let i = 0; i < options.iterationsPerTemp; i++) {
      // a. 移動するノードを選択（空列を作らないように）
      let nodeIndexToMove;
      let attempts = 0;
      while (attempts <= leavesNum * 2) {
        nodeIndexToMove = getRandomInt(leavesNum);
        const currentGroup = solution[nodeIndexToMove];
        if (groupCounts[currentGroup] > 1) break;
        attempts++;
        if (attempts > leavesNum * 2) { nodeIndexToMove = -1; break; }
      }
      if (nodeIndexToMove === -1) continue;

      const currentCol = solution[nodeIndexToMove];
      const nodeHeight = arr[nodeIndexToMove].height || 0;

      // 移動先を選択
      let newCol;
      do {
        newCol = getRandomInt(colNum);
      } while (newCol === currentCol);

      // 状態を「仮に」変更
      solution[nodeIndexToMove] = newCol;
      eachColHeight[currentCol] -= nodeHeight;
      eachColHeight[newCol] += nodeHeight;
      groupCounts[currentCol]--;
      groupCounts[newCol]++;

      const newMaxHeight = Math.max(...eachColHeight);

      // 評価：最大列高さを最小化
      const heightDelta = newMaxHeight - currentMaxHeight;
      const accept =
        heightDelta < 0 ||
        Math.random() < Math.exp(-heightDelta / Math.max(temp, 1e-9));

      if (accept) {
        currentMaxHeight = newMaxHeight;
      } else {
        // 不採択: 変更を元に戻す
        solution[nodeIndexToMove] = currentCol;
        eachColHeight[currentCol] += nodeHeight;
        eachColHeight[newCol] -= nodeHeight;
        groupCounts[currentCol]++;
        groupCounts[newCol]--;
      }

      // 最良解の更新
      if (currentMaxHeight < bestMaxHeight) {
        bestMaxHeight = currentMaxHeight;
        bestSolution = [...solution];
      }
    }
    temp *= options.coolingRate;
  }

  // --- 4. 結果の整形 ---
  const resultPartition = Array.from({ length: colNum }, () => []);
  for (let i = 0; i < leavesNum; i++) {
    resultPartition[bestSolution[i]].push(arr[i]);
  }

  const finalHeights = resultPartition.map(group =>
    group.reduce((sum, node) => sum + (node.height || 0), 0)
  );

  return {
    bestPartition: resultPartition,
    maxHeight: bestMaxHeight,
    columnHeights: finalHeights.sort((a, b) => b - a),
  };
}


/**
 * 初期状態（各列の高さとノード数）を一度に計算する関数
 */
function calcInitialState(arr, solution, colNum) {
  const eachColHeight = new Array(colNum).fill(0);
  const groupCounts = new Array(colNum).fill(0);
  solution.forEach((colIndex, nodeIndex) => {
    eachColHeight[colIndex] += arr[nodeIndex].height || 0;
    groupCounts[colIndex]++;
  });
  return { eachColHeight, groupCounts };
}

/**
 * 空列を作らない初期解を生成
 */
function generateInitialSolutionNoEmpty(colNum, leavesNum) {
  if (colNum === 0) return [];
  const solution = [];
  // まず各列に1つずつノードを割り当て
  for (let i = 0; i < colNum; i++) solution.push(i);
  // 残りのノードはランダムに割り当て
  for (let i = colNum; i < leavesNum; i++) solution.push(getRandomInt(colNum));
  // シャッフル
  for (let i = solution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [solution[i], solution[j]] = [solution[j], solution[i]];
  }
  return solution;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

/**
 * 2次元配列を1次元に変換
 */
function to1D(leaves) {
  return leaves.flat();
}

// ========================================
// 列管理版レイアウト
// ========================================

//葉群をダミーノードにする関数
function createDammuy(root, xMargin, yMargin) {
  if (root.children) {
    const data = [{ ...root.data, x: 0, y: 0 }];
    const dummyLesaves = [];
    for (const child of root.children) {
      const childData = createDammuy(child, xMargin, yMargin);

      //childDataが葉だったら
      if (childData.length == 1) {
        const childObj = childData[0];
        childObj.width += xMargin;
        childObj.height += yMargin * 2;
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
        columns: 1, // 列管理：初期は1列（縦長から開始）
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
function addMargin(root, xMargin, yMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin)
    };
  } else {
    root.data.width = root.data.width + xMargin;
    root.data.height = root.data.height + yMargin * 2;
  }
  if (root?.children) {
    for (const child of root.children) {
      addMargin(child, xMargin, yMargin);
    }
  }
}

//ダミーノードの余白を計算し設定
function setDummyMargin(root, xMargin, yMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin)
    };
  }
  if (root?.children) {
    for (const child of root.children) {
      setDummyMargin(child, xMargin, yMargin);
    }
  }
}

// 列管理版：ダミーノードの幅を計算（各列の最大幅の合計 + 列間のマージン）
function calcDummyDataWidth(leaves, xMargin) {
  let totalWidth = 0;
  for (const colLeaves of leaves) {
    // 各列の最大幅を計算
    const maxWidthInCol = colLeaves.reduce((max, node) => Math.max(max, node.width || 0), 0);
    totalWidth += maxWidthInCol;
  }
  // 列間のマージンを追加（列数 - 1）
  const columnGaps = Math.max(0, leaves.length - 1) * xMargin;
  return totalWidth + columnGaps + xMargin;
}

// 列管理版：ダミーノードの高さを計算（最大列高さ）
function calcDummyNodeHeight(leaves, yMargin) {
  let maxHeight = 0;
  for (const colLeaves of leaves) {
    const colHeight = colLeaves.reduce((sum, node) => sum + (node.height || 0), 0);
    maxHeight = Math.max(maxHeight, colHeight);
  }
  return maxHeight + yMargin * 2;
}

//ダミーノードの横・縦幅を設定
function setDummyNodeSize(leaves, xMargin, yMargin) {
  return {
    width: calcDummyDataWidth(leaves, xMargin),
    height: calcDummyNodeHeight(leaves, yMargin)
  };
}

//最初に、ダミーノードを含んだデータから1列の２次元葉群データを作成（全ノードを1列に）
function initDammyData([...dummyData]) {
  return (
    dummyData.map((item) => {
      if (item?.leaves) {
        // 列管理：全ノードを1列に配置（縦に全部積む）
        item.leaves = [item.leaves];
      }
      return item;
    })
  );
}

//余白を取り除く関数
function format(root, xMargin, yMargin) {
  for (let node of root.descendants()) {
    node.x = node.data.x;
    node.y = node.data.y;

    // 葉ノードかどうかを判定
    const isLeaf = !node.children || node.children.length === 0;

    if (isLeaf) {
      // 葉ノード: 通常のマージン処理
      node.width = node.data.width - xMargin;
      node.height = node.data.height - yMargin * 2;
    } else {
      // 内部ノード: 正方形にする（幅と高さの大きい方に合わせる）
      const displayWidth = node.data.width - xMargin;
      const displayHeight = node.data.height - yMargin * 2;
      const size = Math.max(displayWidth, displayHeight) / 2;
      node.width = size;
      node.height = size;
    }
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

//底辺のノードを返す関数
function searchBottomNode(root) {
  let descendants = root.descendants();
  let max = 0;
  for (let i = 1; i < descendants.length; i++) {
    max =
      descendants[max].data.y + descendants[max].data.height / 2 <
        descendants[i].data.y + descendants[i].data.height / 2
        ? i
        : max;
  }
  return descendants[max];
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

// 列管理版：アスペクト比の差に応じて増やす列数を決定する関数
function calculateColumnsToAdd(currentAspect, targetAspect, currentColumns, maxColumns) {
  const aspectDiff = targetAspect - currentAspect;

  // 目標に既に到達している、または超えている場合
  if (aspectDiff <= 0) return 0;

  const aspectRatio = aspectDiff / targetAspect; // 0〜1の範囲に正規化

  const exponent = 1;
  const maxAddition = (maxColumns - currentColumns) * 0.5;
  const columnsToAdd = Math.ceil(maxAddition * Math.pow(aspectRatio, exponent));

  // 最低1列、最大でも残り列数まで
  return Math.max(1, Math.min(columnsToAdd, maxColumns - currentColumns));
}

// 列管理版：アスペクト比が最適になるまで列数を増やす関数
function localFoldingLayout(root, at, xMargin, yMargin, stratify) {
  let a = calcAspectRatio(root);
  let previousAspect = a;

  // 列管理：アスペクト比が目標より小さい（縦長すぎる）場合、列を増やして横長にする
  while (a < at) {
    const bottomNode = searchBottomNode(root);
    if (
      bottomNode.data?.leaves &&
      bottomNode.data?.columns < bottomNode.data?.leavesNum
    ) {
      // 増やす列数を動的に決定
      const columnsToAdd = calculateColumnsToAdd(a, at, bottomNode.data.columns, bottomNode.data.leavesNum);
      const newColumns = Math.min(bottomNode.data.leavesNum, bottomNode.data.columns + columnsToAdd);

      // 前の状態を保存
      const previousColumns = bottomNode.data.columns;
      const previousLeaves = JSON.parse(JSON.stringify(bottomNode.data.leaves));

      // 列数を増やして最適化（saColumnを使用）
      bottomNode.data.columns = newColumns;
      const saResult = saColumn(bottomNode.data.leaves, bottomNode.data.columns);
      if (saResult) {
        bottomNode.data.leaves = saResult.bestPartition;
      }
      setDummyMargin(root, xMargin, yMargin);
      root = stratify(vanderploeg(root, stratify));
      a = calcAspectRatio(root);

      // オーバーシュート検出：目標を大きく超えた場合は1列戻す
      if (a > at && columnsToAdd > 1) {
        bottomNode.data.columns = previousColumns + 1;
        const saResult2 = saColumn(previousLeaves, bottomNode.data.columns);
        if (saResult2) {
          bottomNode.data.leaves = saResult2.bestPartition;
        }
        setDummyMargin(root, xMargin, yMargin);
        root = stratify(vanderploeg(root, stratify));
        a = calcAspectRatio(root);
      }

      // 改善が見られない場合は終了
      if (Math.abs(a - previousAspect) < 0.001) {
        break;
      }

      previousAspect = a;
    } else {
      break;
    }
  }
  return root;
}

// 列管理版：ダミーノードを展開する関数
function undoDummyNode(root, xMargin, yMargin) {
  const newData = root.descendants().flatMap((item) => {
    const { data, parent } = item;
    if (data?.leaves) {
      const leaves = [];
      const { x, y, height, width } = data;
      const top = y - height / 2 + yMargin;
      const left = x - width / 2 + xMargin / 2;

      if (data?.columns === data?.leavesNum) {
        // 1行（各列に1ノードずつ）：横に並べる
        // 各列の幅（ノード幅）を取得
        const colWidths = data.leaves.map(col => col[0].width);
        let tx = left;
        for (let i = 0; i < data.leavesNum; i++) {
          const node = data.leaves[i][0];
          const colWidth = colWidths[i];
          node.x = tx + colWidth / 2;
          node.y = top + node.height / 2;
          tx += colWidth + xMargin; // 列間にxMarginを追加
          leaves.push({ ...node });
        }
      } else if (data.columns === 1) {
        // 1列（全ノードが縦に並ぶ）
        let ty = top;
        for (let i = 0; i < data.leaves[0].length; i++) {
          const node = data.leaves[0][i];
          node.x = left + node.width / 2;
          node.y = ty + node.height / 2;
          ty += node.height;
          leaves.push({ ...node });
        }
      } else {
        // 複数列：全て上から下に配置
        // 各列の最大幅を計算
        const colMaxWidths = data.leaves.map(col =>
          col.reduce((max, node) => Math.max(max, node.width || 0), 0)
        );

        let tx = left;
        data.leaves.forEach((col, colIndex) => {
          const colWidth = colMaxWidths[colIndex];
          let ty = top;

          // この列のノードを上から下に配置
          col.forEach((node) => {
            node.x = tx + colWidth / 2;
            node.y = ty + node.height / 2;
            ty += node.height;
            leaves.push({ ...node });
          });

          // 次の列へ（列幅 + xMargin）
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
function createLinks(root, xMargin, yMargin) {
  if (root.children) {
    const links = [];
    const leftMostNode = leftMostSiblingNode(root.children);
    const rightMostNode = rightMostSiblingNode(root.children);

    // 表示サイズ（format後のサイズ）で計算
    const displayHeight = root.data.height - yMargin * 2;

    // 親の下端
    const parentBottom = root.data.y + displayHeight / 2;

    // 子ノードの上端を計算
    const childTops = root.children.map(child => {
      const childDisplayHeight = child.data.height - yMargin * 2;
      return child.data.y - childDisplayHeight / 2;
    });
    const minChildTop = Math.min(...childTops);

    // 水平線のY座標: 親の下端と子の上端の中間点
    const horizonY = (parentBottom + minChildTop) / 2;

    // 親から水平線への縦線
    links.push(
      createPath(
        `${root.id}toChild`,
        root.data.x,
        root.data.x,
        parentBottom,
        horizonY,
      ),
      // 水平線
      createPath(
        `${root.id}Horizon`,
        leftMostNode.data.x,
        rightMostNode.data.x,
        horizonY,
        horizonY,
      ),
    );

    for (const child of root.children) {
      // 子の表示サイズで上端を計算
      const childDisplayHeight = child.data.height - yMargin * 2;
      const childTop = child.data.y - childDisplayHeight / 2;

      // 水平線から子の上端への縦線
      links.push(
        createPath(
          `${child.id}toParent`,
          child.data.x,
          child.data.x,
          horizonY,
          childTop,
        ),
      );
      links.push(...createLinks(child, xMargin, yMargin));
    }
    return links;
  } else if (root.data?.leaves) {
    return createDummyLinks(root, xMargin, yMargin);
  } else {
    return [];
  }
}

//ダミーノード内のリンクを作成する関数（列管理版）
function createDummyLinks(dummyNode, xMargin, yMargin) {
  if (dummyNode.data?.leaves) {
    const links = [];
    const data = dummyNode.data;
    const { leaves, x, y, height, width } = dummyNode.data;

    // ダミーノードの表示サイズ（マージン抜き）
    const displayHeight = height - yMargin * 2;
    const dummyTop = y - displayHeight / 2; // ダミーノードの上端（親からの接続点）
    const leafStartY = y - height / 2 + yMargin; // 葉の配置開始位置（内部座標系）
    const left = x - width / 2 + xMargin / 2;

    // 最初の葉ノードの表示上の上端を計算
    const firstLeafHeight = leaves[0][0].height;
    const firstLeafDisplayHeight = firstLeafHeight - yMargin * 2;
    const firstLeafTop = leafStartY + firstLeafHeight / 2 - firstLeafDisplayHeight / 2;

    // 水平線の位置: ダミーノードの上端と最初の葉の上端の中間点
    const horizonY = (dummyTop + firstLeafTop) / 2;

    // 親からの接続点から水平線への縦線
    links.push(createPath(`${dummyNode.id}FromParent`, x, x, dummyTop, horizonY));

    // 各列の最大幅を計算（マージン込み）
    const colMaxWidths = leaves.map(col =>
      col.reduce((max, node) => Math.max(max, node.width || 0), 0)
    );

    if (data?.columns === data?.leavesNum) {
      // 1行（各列に1ノードずつ）：ノード座標を計算
      const colWidths = leaves.map(col => col[0].width);
      let tx = left;
      const nodePositions = [];
      for (let i = 0; i < data.leavesNum; i++) {
        const node = leaves[i][0];
        const colWidth = colWidths[i];
        const displayWidth = colWidth - xMargin;
        const displayNodeHeight = node.height - yMargin * 2;
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
        // 水平線からノードの上端まで縦線（表示サイズで計算）
        const nodeTop = pos.y - pos.displayHeight / 2;
        links.push(createPath(`${pos.node.name}toParent`, pos.x, pos.x, horizonY, nodeTop));
      });

    } else if (data.columns === 1) {
      // 1列（全ノードが縦に並ぶ）：ノード座標を計算
      let ty = leafStartY;
      const nodePositions = [];
      for (const node of leaves[0]) {
        const nodeX = left + node.width / 2;
        const nodeY = ty + node.height / 2;
        const displayWidth = node.width - xMargin;
        const displayNodeHeight = node.height - yMargin * 2;
        nodePositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
        ty += node.height;
      }

      // 最後のノードの中心Y座標（縦線の終点）
      const lastPos = nodePositions[nodePositions.length - 1];
      const bottomY = lastPos.y;
      // 親の中心から縦線の位置まで水平線
      links.push(createPath(`${dummyNode.id}Horizon`, x, left, horizonY, horizonY));
      // 縦線（水平線から最後のノードの中心まで）
      links.push(createPath(`${dummyNode.id}Vertical`, left, left, horizonY, bottomY));
      // 各ノードへの水平接続（縦線からノードの左端まで）- 表示サイズで計算
      for (const pos of nodePositions) {
        const nodeLeft = pos.x - pos.displayWidth / 2;
        links.push(createPath(`${pos.node.name}Horizon`, left, nodeLeft, pos.y, pos.y));
      }

    } else {
      // 複数列：ノード座標を計算
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
          const displayNodeHeight = node.height - yMargin * 2;
          colPositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
          ty += node.height;
        });

        allNodePositions.push(colPositions);
        tx += colWidth + xMargin;
      });

      // 各列の縦線位置（列の左端）
      const colVerticalXs = [];
      tx = left;
      for (let i = 0; i < data.columns; i++) {
        colVerticalXs.push(tx);
        tx += colMaxWidths[i] + xMargin;
      }

      // 全ての列の縦線と親の中心xを含む水平線
      const firstVerticalX = colVerticalXs[0];
      const lastVerticalX = colVerticalXs[data.columns - 1];
      const horizonStartX = Math.min(x, firstVerticalX);
      const horizonEndX = Math.max(x, lastVerticalX);
      links.push(createPath(`${dummyNode.id}HorizontalMain`, horizonStartX, horizonEndX, horizonY, horizonY));

      // 各列に対して縦線とノードへの接続を描画
      allNodePositions.forEach((colPositions, colIndex) => {
        const lastPos = colPositions[colPositions.length - 1];
        const colBottom = lastPos.y; // 最後のノードの中心Y座標
        const verticalX = colVerticalXs[colIndex];

        // 縦線（水平線から最後のノードの中心まで）
        links.push(createPath(`${dummyNode.id}Col${colIndex}Vertical`, verticalX, verticalX, horizonY, colBottom));

        // 各ノードへの水平接続（縦線からノードの左端まで）- 表示サイズで計算
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

export function layout(data, width, height) {
  const xMargin = 200;
  const yMargin = 200;
  // const newData = data.map((item) => ({ ...item, width: 500, height: item.height }));
  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);
  let root = stratify(data);
  const dummyData = createDammuy(root, xMargin, yMargin);
  initDammyData(dummyData);
  root = stratify(dummyData);
  addMargin(root, xMargin, yMargin);
  root = stratify(vanderploeg(root, stratify));
  root = localFoldingLayout(root, width / height, xMargin, yMargin, stratify);

  const layoutedData = undoDummyNode(root, xMargin, yMargin);
  const links = createLinks(root, xMargin, yMargin);

  root = stratify(layoutedData);
  format(root, xMargin, yMargin);

  // normalize - use data (original size) for bounds calculation to match links
  const left =
    d3.min(root.descendants(), (node) => node.data.x - node.data.width / 2) - xMargin;
  const right =
    d3.max(root.descendants(), (node) => node.data.x + node.data.width / 2) + xMargin;
  const top = d3.min(root.descendants(), (node) => node.data.y - node.data.height / 2);
  const bottom = d3.max(root.descendants(), (node) => node.data.y + node.data.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);

  // スケーリング - node.x = node.data.x なので、同じ座標系を使用
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
