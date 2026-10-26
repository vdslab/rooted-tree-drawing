/**
 * 焼きなまし法(SA)による列分配ソルバー。
 *
 * 部分問題: 列数 k を固定して、最大列高さ(makespan)を最小化する。
 * インターフェースは lptColumn と同じ (leaves, columns) => { bestPartition, maxHeight }。
 *
 * 乱数関数を引数で注入できる。省略時は Math.random。
 */
import { to1D } from "../core/dummy.js";

export function getRandomInt(max, random = Math.random) {
  return Math.floor(random() * max);
}

export function generateInitialSolutionNoEmpty(colNum, leavesNum, random = Math.random) {
  if (colNum === 0) return [];
  const solution = [];
  // まず各列に1つずつノードを割り当て
  for (let i = 0; i < colNum; i++) solution.push(i);
  // 残りのノードはランダムに割り当て
  for (let i = colNum; i < leavesNum; i++) solution.push(getRandomInt(colNum, random));
  // シャッフル
  for (let i = solution.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [solution[i], solution[j]] = [solution[j], solution[i]];
  }
  return solution;
}

export function calcInitialState(arr, solution, colNum) {
  const eachColHeight = new Array(colNum).fill(0);
  const groupCounts = new Array(colNum).fill(0);
  solution.forEach((colIndex, nodeIndex) => {
    eachColHeight[colIndex] += arr[nodeIndex].height || 0;
    groupCounts[colIndex]++;
  });
  return { eachColHeight, groupCounts };
}

export function saColumn(leaves, colNum, random = Math.random) {
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

  const solution = generateInitialSolutionNoEmpty(colNum, leavesNum, random);
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
        nodeIndexToMove = getRandomInt(leavesNum, random);
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
        newCol = getRandomInt(colNum, random);
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
        random() < Math.exp(-heightDelta / Math.max(temp, 1e-9));

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
