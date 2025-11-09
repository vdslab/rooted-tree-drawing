/**
 * 焼きなまし法のメイン関数
 */
export function sa(leaves, rowNum) {
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

  if (leavesNum < rowNum) {
    console.error("エラー: ノード数よりグループ数の方が多いです。");
    return null;
  }

  const solution = generateInitialSolutionNoEmpty(rowNum, leavesNum);
  const { eachRowWidth, groupCounts } = calcInitialState(arr, solution, rowNum);
  let eachRowMaxHeight = calcEachRowMaxHeight(arr, solution, rowNum);
  let currentWidthCost = Math.max(...eachRowWidth);
  let currentHeightCost = sum(eachRowMaxHeight);

  // ★追加: グループが1つしかない場合は探索不要で即時リターン
  if (rowNum <= 1) {
    const resultPartition = Array.from({ length: rowNum }, () => []);
    if (rowNum === 1) {
      resultPartition[0] = arr;
    }
    const finalWidths = resultPartition.map(group => group.reduce((sum, node) => sum + node.width, 0));
    const finalHeightCost = rowNum === 0 ? 0 : Math.max(0, ...resultPartition.map(group => group.reduce((m, n) => Math.max(m, n.height || 0), 0)));

    return {
      bestPartition: resultPartition,
      maxWidth: currentWidthCost,
      totalRowMaxHeights: finalHeightCost,
      groupWidths: finalWidths,
    };
  }

  // 最良解の保存用
  let bestSolution = [...solution];
  let bestWidthCost = currentWidthCost;
  let bestHeightCost = currentHeightCost;
  let temp = options.initialTemp;

  // --- 3. 焼きなまし法のメインループ ---
  while (temp > options.finalTemp) {
    for (let i = 0; i < options.iterationsPerTemp; i++) {
      // a. 移動するノードを選択
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

      const currentGroup = solution[nodeIndexToMove];
      const nodeWidth = arr[nodeIndexToMove].width;

      // 移動先を選択
      let newGroup;
      do {
        newGroup = getRandomInt(rowNum);
      } while (newGroup === currentGroup);

      //  状態を「仮に」変更
      solution[nodeIndexToMove] = newGroup;
      eachRowWidth[currentGroup] -= nodeWidth;
      eachRowWidth[newGroup] += nodeWidth;
      groupCounts[currentGroup]--;
      groupCounts[newGroup]++;

      // 高さ評価（2行のみ再計算）
      const oldHeightCurrent = eachRowMaxHeight[currentGroup];
      const oldHeightNew = eachRowMaxHeight[newGroup];
      eachRowMaxHeight[currentGroup] = recomputeGroupMaxHeight(arr, solution, currentGroup);
      eachRowMaxHeight[newGroup] = recomputeGroupMaxHeight(arr, solution, newGroup);

      const newWidthCost = Math.max(...eachRowWidth);
      const newHeightCost = sum(eachRowMaxHeight);

      // 幅優先のレキシコグラフィック評価
      const widthDelta = newWidthCost - currentWidthCost;
      const heightDelta = newHeightCost - currentHeightCost;
      const accept =
        widthDelta < 0 ||
        (widthDelta === 0 && (heightDelta < 0 || Math.random() < Math.exp(-heightDelta / Math.max(temp, 1e-9)))) ||
        (widthDelta > 0 && Math.random() < Math.exp(-widthDelta / Math.max(temp, 1e-9)));

      if (accept) {
        currentWidthCost = newWidthCost;
        currentHeightCost = newHeightCost;
      } else {
        // 不採択: 変更を元に戻す
        solution[nodeIndexToMove] = currentGroup;
        eachRowWidth[currentGroup] += nodeWidth;
        eachRowWidth[newGroup] -= nodeWidth;
        groupCounts[currentGroup]++;
        groupCounts[newGroup]--;
        eachRowMaxHeight[currentGroup] = oldHeightCurrent;
        eachRowMaxHeight[newGroup] = oldHeightNew;
      }

      // 最良解の更新（幅→高さの順で比較）
      if (
        currentWidthCost < bestWidthCost ||
        (currentWidthCost === bestWidthCost && currentHeightCost < bestHeightCost)
      ) {
        bestWidthCost = currentWidthCost;
        bestHeightCost = currentHeightCost;
        bestSolution = [...solution];
      }
    }
    temp *= options.coolingRate;
  }

  // --- 4. 結果の整形 ---
  const resultPartition = Array.from({ length: rowNum }, () => []);
  for (let i = 0; i < leavesNum; i++) {
    resultPartition[bestSolution[i]].push(arr[i]);
  }
  const finalWidths = resultPartition.map(group => group.reduce((sum, node) => sum + node.width, 0));
  const finalHeightCost = resultPartition.reduce((acc, group) => {
    const mh = group.reduce((m, n) => Math.max(m, n.height || 0), 0);
    return acc + mh;
  }, 0);

  return {
    bestPartition: resultPartition,
    maxWidth: bestWidthCost,
    totalRowMaxHeights: finalHeightCost,
    groupWidths: finalWidths.sort((a, b) => b - a),
  };
}


/**
 * ★追加: 初期状態（各行の幅とノード数）を一度に計算する関数
 */
function calcInitialState(arr, solution, rowNum) {
  const eachRowWidth = new Array(rowNum).fill(0);
  const groupCounts = new Array(rowNum).fill(0);
  solution.forEach((groupIndex, nodeIndex) => {
    eachRowWidth[groupIndex] += arr[nodeIndex].width;
    groupCounts[groupIndex]++;
  });
  return { eachRowWidth, groupCounts };
}

function calcEachRowMaxHeight(arr, solution, rowNum) {
  const maxHeights = new Array(rowNum).fill(0);
  for (let i = 0; i < arr.length; i++) {
    const g = solution[i];
    const h = arr[i].height || 0;
    if (h > maxHeights[g]) maxHeights[g] = h;
  }
  return maxHeights;
}

function recomputeGroupMaxHeight(arr, solution, groupIndex) {
  let maxH = 0;
  for (let i = 0; i < arr.length; i++) {
    if (solution[i] === groupIndex) {
      const h = arr[i].height || 0;
      if (h > maxH) maxH = h;
    }
  }
  return maxH;
}

function sum(arr) {
  return arr.reduce((s, v) => s + v, 0);
}

function generateInitialSolutionNoEmpty(rowNum, leavesNum) {
  if (rowNum === 0) return [];
  const solution = [];
  for (let i = 0; i < rowNum; i++) solution.push(i);
  for (let i = rowNum; i < leavesNum; i++) solution.push(getRandomInt(rowNum));
  for (let i = solution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [solution[i], solution[j]] = [solution[j], solution[i]];
  }
  return solution;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function to1D(leaves) {
  return leaves.flat();
}