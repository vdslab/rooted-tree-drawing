/**
 * 焼きなまし法のメイン関数 (高速化版・バグ修正済み)
 * 
 * @param {Array} leaves - 葉ノードの配列
 * @param {number} rowNum - 行数
 * @param {Object} customOptions - カスタムオプション（省略可能）
 * @returns {Object} 最適化結果
 */
export function sa(leaves, rowNum, customOptions = null) {
  // --- 1. パラメータ設定 ---
  // 外部から渡されたオプションがあれば使用し、なければ最適化された値を使用
  const defaultOptions = {
    initialTemp: 443.64638595470666,       // 最適化された値
    finalTemp: 0.10305869402445039,          // 最適化された値
    coolingRate: 0.9923474667651442,        // 最適化された値
    iterationsPerTemp: 391      // 最適化された値
  };

  // 外部からのオプションとデフォルトをマージ
  const options = { ...defaultOptions, ...customOptions };

  // グローバル変数からのオプション設定（Optuna最適化用）
  if (typeof global !== "undefined" && global.saOptions) {
    Object.assign(options, global.saOptions);
    // 使用後にクリア
    global.saOptions = null;
  }
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

  // ★追加: グループが1つ以下の場合は探索不要で即時リターン
  // ESLint対策: 変数に計算結果を格納してから条件判定に使用
  const rowCount = rowNum;
  const needsOptimization = rowCount > 1;

  if (!needsOptimization) {
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
  // ESLint対策: 有限回のループに変更
  const maxIterations = 1000; // 十分大きな値
  let iteration = 0;

  while (iteration < maxIterations) {
    // 終了条件をチェック
    if (temp <= options.finalTemp) {
      break;
    }
    iteration++;
    for (let i = 0; i < options.iterationsPerTemp; i++) {
      // a. 移動するノードを選択
      let nodeIndexToMove = -1;
      const maxAttempts = leavesNum * 2;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidateIndex = getRandomInt(leavesNum);
        const currentGroup = solution[candidateIndex];

        if (groupCounts[currentGroup] > 1) {
          nodeIndexToMove = candidateIndex;
          break;
        }
      }

      if (nodeIndexToMove === -1) continue;

      const currentGroup = solution[nodeIndexToMove];
      const nodeWidth = arr[nodeIndexToMove].width;

      // b. 移動先を選択
      let newGroup = currentGroup;
      const maxGroupAttempts = rowNum * 2;

      for (let attempt = 0; attempt < maxGroupAttempts; attempt++) {
        const candidateGroup = getRandomInt(rowNum);
        if (candidateGroup !== currentGroup) {
          newGroup = candidateGroup;
          break;
        }
      }

      // 移動先が見つからなかった場合（ほぼありえないが念のため）
      if (newGroup === currentGroup) continue;

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

function calucItteretionSum(options) {
  const { initialTemp, finalTemp, coolingRate, iterationsPerTemp } = options;
  return (Math.log(finalTemp / initialTemp) / Math.log(coolingRate)) * iterationsPerTemp;
}

const options = {
  initialTemp: 443.64638595470666,       // 最適化された値
  finalTemp: 0.10305869402445039,          // 最適化された値
  coolingRate: 0.9923474667651442,        // 最適化された値
  iterationsPerTemp: 782      // 最適化された値
};
const twiceoptions = {
  initialTemp: 443.64638595470666,       // 最適化された値
  finalTemp: 0.10305869402445039,          // 最適化された値
  coolingRate: 0.9923474667651442,        // 最適化された値
  iterationsPerTemp: 782 * 2      // 最適化された値
};
const defaultOptions = {
  initialTemp: 1000,       // 最適化された値
  finalTemp: 0.1,          // 最適化された値
  coolingRate: 0.95,        // 最適化された値
  iterationsPerTemp: 100      // 最適化された値
};

console.log(calucItteretionSum(defaultOptions));