import * as d3 from "d3";

/**
 * 列管理の焼きなまし法
 * - 幅固定、高さ可変
 * - 最大列高さを最小化
 */
export function saColumn(leaves, colNum) {
  // --- 1. パラメータ設定 ---
  //1万回以内
  const options = {
    initialTemp: 916.5693407083919,
    finalTemp: 8.823760112359201,
    coolingRate: 0.9533798833054334,
    iterationsPerTemp: 102
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
        // ★ 変更: ダミーノード内部のノードには innerYMargin を適用
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
function addMargin(root, xMargin, yMargin, innerYMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin, innerYMargin)
    };
  } else {
    root.data.width = root.data.width + xMargin;
    root.data.height = root.data.height + yMargin * 2;
  }
  // 初期座標を設定（layout.js の initRoot と同様）
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
  // 初期座標を更新（layout.js の setDummyMargin と同様）
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;
  if (root?.children) {
    for (const child of root.children) {
      setDummyMargin(child, xMargin, yMargin, innerYMargin);
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
function calcDummyNodeHeight(leaves, yMargin, innerYMargin) {
  let maxHeight = 0;
  for (const colLeaves of leaves) {
    // 各列の高さ合計（内部ノードはすでに innerYMargin 込みの高さを持っている）
    const colHeight = colLeaves.reduce((sum, node) => sum + (node.height || 0), 0);
    maxHeight = Math.max(maxHeight, colHeight);
  }
  // 外枠のマージンは yMargin を使用し、上部に innerYMargin 分のスペースを追加
  return maxHeight + yMargin * 2 + innerYMargin;
}

//ダミーノードの横・縦幅を設定
function setDummyNodeSize(leaves, xMargin, yMargin, innerYMargin) {
  return {
    width: calcDummyDataWidth(leaves, xMargin),
    height: calcDummyNodeHeight(leaves, yMargin, innerYMargin)
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
function format(root, xMargin, yMargin, innerYMargin) {
  for (let node of root.descendants()) {
    node.x = node.data.x;
    node.y = node.data.y;

    // ★ 変更: 内部ノードの場合は innerYMargin を引く
    const marginY = node.data.isInner ? innerYMargin : yMargin;

    // 通常のマージン処理
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
  // 通常のマージン処理（全ノード共通）
  return {
    width: node.data.width - xMargin,
    height: node.data.height - yMargin * 2
  };
}

//底辺のダミーノード（leaves を持つノード）を返す関数
function searchBottomNode(root) {
  let descendants = root.descendants();
  // ダミーノード（leaves を持つノード）のみをフィルタリング
  let dummyNodes = descendants.filter(node => node.data?.leaves);

  if (dummyNodes.length === 0) {
    return null; // ダミーノードがない場合
  }

  let max = 0;
  for (let i = 1; i < dummyNodes.length; i++) {
    max =
      dummyNodes[max].data.y + dummyNodes[max].data.height / 2 <
        dummyNodes[i].data.y + dummyNodes[i].data.height / 2
        ? i
        : max;
  }
  return dummyNodes[max];
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
function localFoldingLayout(root, at, xMargin, yMargin, innerYMargin, stratify) {
  let a = calcAspectRatio(root);


  // 列管理：アスペクト比が目標より小さい（縦長すぎる）場合、列を増やして横長にする
  let iteration = 0;
  while (a < at) {
    iteration++;
    const bottomNode = searchBottomNode(root);
    // console.log(`Iteration ${iteration}: bottomNode = ${bottomNode?.id}, columns = ${bottomNode?.data?.columns}, leavesNum = ${bottomNode?.data?.leavesNum}`);

    // ダミーノードがない、または全てのダミーノードが展開済みの場合は終了
    if (!bottomNode || bottomNode.data?.columns >= bottomNode.data?.leavesNum) {
      break;
    }

    // 列数を1つ増やす（layout.jsと同様）
    bottomNode.data.columns += 1;
    // console.log(`  Expanding columns to: ${bottomNode.data.columns}`);

    // saColumnで最適化
    const saResult = saColumn(bottomNode.data.leaves, bottomNode.data.columns);
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

// 列管理版：ダミーノードを展開する関数
function undoDummyNode(root, xMargin, yMargin, innerYMargin) {
  const newData = root.descendants().flatMap((item) => {
    const { data, parent } = item;
    if (data?.leaves) {
      const leaves = [];
      const { x, y, height, width } = data;
      // ダミーノードの表示上端を計算
      const displayHeight = height - yMargin * 2;
      const dummyTop = y - displayHeight / 2;
      // 葉の配置開始位置：ダミーノード上端から innerYMargin * 2 分下
      const top = dummyTop + innerYMargin * 2;
      const left = x - width / 2 + xMargin / 2;

      if (data?.columns === data?.leavesNum) {
        // 1行（各列に1ノードずつ）：横に並べる
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
          // 次のノードへの位置更新（node.height は innerYMargin 込み）
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
            // 次のノードへの位置更新（node.height は innerYMargin 込み）
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
function createLinks(root, xMargin, yMargin, innerYMargin) {
  if (root.children) {
    const links = [];
    const leftMostNode = leftMostSiblingNode(root.children);
    const rightMostNode = rightMostSiblingNode(root.children);

    // 表示サイズ（内部ノードは正方形）で計算
    const rootDisplaySize = getDisplaySize(root, xMargin, yMargin);

    // 親の下端
    const parentBottom = root.data.y + rootDisplaySize.height / 2;

    // 子ノードの上端を計算
    const childTops = root.children.map(child => {
      // 内部ノードかどうかでサイズ計算を分ける
      const marginY = child.data.isInner ? innerYMargin : yMargin;
      const childHeight = child.data.height - marginY * 2;
      return child.data.y - childHeight / 2;
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
      const marginY = child.data.isInner ? innerYMargin : yMargin;
      const childHeight = child.data.height - marginY * 2;
      const childTop = child.data.y - childHeight / 2;

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
      links.push(...createLinks(child, xMargin, yMargin, innerYMargin));
    }
    return links;
  } else if (root.data?.leaves) {
    return createDummyLinks(root, xMargin, yMargin, innerYMargin);
  } else {
    return [];
  }
}

//ダミーノード内のリンクを作成する関数（列管理版）
function createDummyLinks(dummyNode, xMargin, yMargin, innerYMargin) {
  if (dummyNode.data?.leaves) {
    const links = [];
    const data = dummyNode.data;
    const { leaves, x, y, height, width } = dummyNode.data;

    // ダミーノードの表示サイズ（外枠マージン yMargin * 2 を引く）
    const displayHeight = height - yMargin * 2;
    const dummyTop = y - displayHeight / 2; // ダミーノードの上端（親からの接続点）

    // 葉の配置開始位置：ダミーノード上端から innerYMargin * 2 分下
    // これにより水平線（dummyTop）から最初の葉までの間隔がノード間と同じになる
    const leafStartY = dummyTop + innerYMargin * 2;
    const left = x - width / 2 + xMargin / 2;

    // 水平線の位置: ダミーノードの上端（親からの接続点と同じ）
    const horizonY = dummyTop;

    // 各列の最大幅を計算（マージン込み）
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
        // ★ 変更: innerYMargin を使用
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
        // ★ 変更: innerYMargin を使用
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
          // ★ 変更: innerYMargin を使用
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

export function layout(data, width, height) {
  const xMargin = 300;
  const yMargin = 200;
  // ★ 追加: 内部マージンを半分に設定
  const innerYMargin = yMargin / 2;

  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);
  let root = stratify(data);
  // ★ createDammuy に innerYMargin を渡す
  const dummyData = createDammuy(root, xMargin, yMargin, innerYMargin);
  const initializedDummyData = initDammyData(dummyData);
  root = stratify(initializedDummyData);
  addMargin(root, xMargin, yMargin, innerYMargin);

  console.log("=== After addMargin ===");
  root.descendants().forEach(node => {
    if (node.data?.leaves) {
      console.log(`Dummy: ${node.id}, columns: ${node.data.columns}, leavesNum: ${node.data.leavesNum}, size: ${node.data.width}x${node.data.height}`);
    }
  });

  root = stratify(vanderploeg(root, stratify));
  root = localFoldingLayout(root, width / height, xMargin, yMargin, innerYMargin, stratify);

  console.log("=== After localFoldingLayout ===");
  root.descendants().forEach(node => {
    if (node.data?.leaves) {
      console.log(`Dummy: ${node.id}, columns: ${node.data.columns}, leavesNum: ${node.data.leavesNum}, size: ${node.data.width}x${node.data.height}`);
    }
  });

  // ★ undoDummyNode に innerYMargin を渡す
  const layoutedData = undoDummyNode(root, xMargin, yMargin, innerYMargin);
  // ★ createLinks に innerYMargin を渡す
  const links = createLinks(root, xMargin, yMargin, innerYMargin);

  root = stratify(layoutedData);
  // ★ format に innerYMargin を渡す
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