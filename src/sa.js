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

      const newCost = Math.max(...eachRowWidth);
      const costDelta = newCost - currentCost;

      // 採択判定
      if (costDelta < 0 || Math.random() < Math.exp(-costDelta / temp)) {
        currentCost = newCost;
      } else {
        // 不採択: 変更を元に戻す
        solution[nodeIndexToMove] = currentGroup;
        eachRowWidth[currentGroup] += nodeWidth;
        eachRowWidth[newGroup] -= nodeWidth;
        groupCounts[currentGroup]++;
        groupCounts[newGroup]--;
      }

      // 最良解の更新
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



// --- 実行例 ---
const data = [
  [
    { name: "a", width: 212, height: 2134 }, { name: "b", width: 995, height: 85 },
    { name: "c", width: 38, height: 85 }
  ],
  [
    { name: "d", width: 262, height: 5254 }, { name: "e", width: 34, height: 985 },
    { name: "f", width: 965, height: 484 }, { name: "g", width: 838, height: 774 },
    { name: "h", width: 844, height: 88 }, { name: "i", width: 333, height: 477 }
  ],
  [
    { name: "j", width: 777, height: 77 }, { name: "k", width: 43, height: 968 }
  ],
];

const result = sa(data, 1);

// 結果の表示
console.log("--- 焼きなまし法による最適化結果 ---");
console.log(`最小化された最大幅 (コスト): ${result.maxWidth}\n`);

console.log("各グループの幅の合計 (降順):");
console.log(result.groupWidths);

console.log("\n最終的なグループ分け:");
result.bestPartition.forEach((group, i) => {
  const groupContent = group.map(node => `${node.name}(w:${node.width})`).join(", ");
  const groupTotalWidth = group.reduce((sum, node) => sum + node.width, 0);
  console.log(`  グループ ${i} (幅: ${groupTotalWidth}): [${groupContent}]`);
});