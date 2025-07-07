/**
 * 焼きなまし法のメイン関数 (高速化版・バグ修正済み)
 */
export function sa(leaves, rowNum) {
  // --- 1. パラメータ設定 ---
  const options = {
    initialTemp: 1000,
    finalTemp: 0.1,
    coolingRate: 0.95,
    iterationsPerTemp: 100,
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
  let currentCost = Math.max(...eachRowWidth);

  // ★追加: グループが1つしかない場合は探索不要で即時リターン
  if (rowNum <= 1) {
    const resultPartition = Array.from({ length: rowNum }, () => []);
    if (rowNum === 1) {
      resultPartition[0] = arr;
    }
    const finalWidths = resultPartition.map(group => group.reduce((sum, node) => sum + node.width, 0));

    return {
      bestPartition: resultPartition,
      maxWidth: currentCost,
      groupWidths: finalWidths,
    };
  }

  // 最良解の保存用
  let bestSolution = [...solution];
  let bestCost = currentCost;
  let temp = options.initialTemp;

  // --- 3. 焼きなまし法のメインループ ---
  while (temp > options.finalTemp) {
    for (let i = 0; i < options.iterationsPerTemp; i++) {
      // a. 移動するノードを選択
      let nodeIndexToMove;
      let attempts = 0;
      while (true) {
        nodeIndexToMove = getRandomInt(leavesNum);
        const currentGroup = solution[nodeIndexToMove];
        if (groupCounts[currentGroup] > 1) break;
        attempts++;
        if (attempts > leavesNum * 2) { nodeIndexToMove = -1; break; }
      }
      if (nodeIndexToMove === -1) continue;

      const currentGroup = solution[nodeIndexToMove];
      const nodeWidth = arr[nodeIndexToMove].width;

      // b. 移動先を選択
      let newGroup;
      do {
        newGroup = getRandomInt(rowNum);
      } while (newGroup === currentGroup);

      // c. 状態を「仮に」変更
      solution[nodeIndexToMove] = newGroup;
      eachRowWidth[currentGroup] -= nodeWidth;
      eachRowWidth[newGroup] += nodeWidth;
      groupCounts[currentGroup]--;
      groupCounts[newGroup]++;

      const newCost = Math.max(...eachRowWidth);
      const costDelta = newCost - currentCost;

      // d. 採択判定
      if (costDelta < 0 || Math.random() < Math.exp(-costDelta / temp)) {
        currentCost = newCost;
      } else {
        // e. 不採択: 変更を元に戻す
        solution[nodeIndexToMove] = currentGroup;
        eachRowWidth[currentGroup] += nodeWidth;
        eachRowWidth[newGroup] -= nodeWidth;
        groupCounts[currentGroup]++;
        groupCounts[newGroup]--;
      }

      // f. 最良解の更新
      if (currentCost < bestCost) {
        bestCost = currentCost;
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

  return {
    bestPartition: resultPartition,
    maxWidth: bestCost,
    groupWidths: finalWidths.sort((a, b) => b - a),
  };
}

// ... (他のヘルパー関数は変更なし)


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

// --- 以下のヘルパー関数は前回と同じか、少し変更 ---

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