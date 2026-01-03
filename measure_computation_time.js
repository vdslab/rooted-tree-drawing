// measure_computation_time.js
// 各ノード数での計算時間を測定するスクリプト

import { layout } from "./src/layout.js";
import { layout as saColumnLayout } from "./src/saColumnLayout.js";
import fs from "fs";
import * as d3 from "d3";
import { generateTree } from "./src/randomData.js";

// ノード数の範囲
const NODE_COUNT_RANGE = {
  min: 100,
  max: 3000
};

// ノードサイズの範囲
const NODE_SIZE_RANGE = {
  min: 10,
  max: 3000
};

// 試行回数
const TRIALS = 500;

// ノード幅
const NODE_WIDTH = 1000;

/**
 * 計算時間を測定
 */
function measureTime(callback) {
  const start = performance.now();
  callback();
  const end = performance.now();
  return end - start;
}

/**
 * 各ノード数で計算時間を測定
 */
async function measureComputationTimeByNodeCount() {
  console.log("=".repeat(60));
  console.log("計算時間測定を開始します");
  console.log("=".repeat(60));

  const results = {
    timestamp: new Date().toISOString(),
    config: {
      nodeCountRange: NODE_COUNT_RANGE,
      trials: TRIALS,
      nodeWidth: NODE_WIDTH,
      nodeSizeRange: NODE_SIZE_RANGE
    },
    nodeCountAnalysis: []
  };

  // 各試行でランダムなノード数を生成
  for (let trial = 0; trial < TRIALS; trial++) {
    // ランダムなノード数を生成（100~3000）
    const nodeCount = Math.floor(
      NODE_COUNT_RANGE.min + Math.random() * (NODE_COUNT_RANGE.max - NODE_COUNT_RANGE.min)
    );

    console.log(`\n試行 ${trial + 1}/${TRIALS} - ノード数: ${nodeCount}`);
    console.log("-".repeat(40));

    // ランダムな木を生成
    const data = generateTree(nodeCount, 1 / 4);

    // ノードサイズを設定
    data.forEach(node => {
      node.width = NODE_WIDTH;
      node.height = NODE_SIZE_RANGE.min +
        Math.random() * (NODE_SIZE_RANGE.max - NODE_SIZE_RANGE.min);
    });

    let existingTime = 0;
    let proposedTime = 0;

    // 既存手法（Baseline）の計算時間測定
    const baselineData = JSON.parse(JSON.stringify(data));
    try {
      existingTime = measureTime(() => {
        layout(baselineData, 1000, 250);
      });
      console.log(`  Existing Method: ${existingTime.toFixed(2)}ms`);
    } catch (error) {
      console.error(`  Baseline エラー: ${error.message}`);
    }

    // 提案手法（SA Column Layout）の計算時間測定
    const proposedData = JSON.parse(JSON.stringify(data));
    try {
      proposedTime = measureTime(() => {
        saColumnLayout(proposedData, 1000, 250);
      });
      console.log(`  Proposed Method: ${proposedTime.toFixed(2)}ms`);
    } catch (error) {
      console.error(`  SA Column Layout エラー: ${error.message}`);
    }

    // 結果を保存
    results.nodeCountAnalysis.push({
      nodeCount,
      existingTime,
      proposedTime,
      ratio: proposedTime / existingTime
    });
  }

  // 結果をファイルに保存（time.pyと同じ形式）
  const outputFile = `./computation_time_results.json`;
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n結果を ${outputFile} に保存しました。`);

  // サマリーを表示
  console.log("\n" + "=".repeat(60));
  console.log("測定完了 - サマリー");
  console.log("=".repeat(60));
  console.log(`\n合計試行回数: ${TRIALS}`);
  console.log(`ノード数範囲: ${NODE_COUNT_RANGE.min} ~ ${NODE_COUNT_RANGE.max}`);

  // 平均計算
  const avgExisting = results.nodeCountAnalysis.reduce((sum, r) => sum + r.existingTime, 0) / TRIALS;
  const avgProposed = results.nodeCountAnalysis.reduce((sum, r) => sum + r.proposedTime, 0) / TRIALS;

  console.log(`\n平均計算時間:`);
  console.log(`  Existing Method: ${avgExisting.toFixed(2)}ms`);
  console.log(`  Proposed Method: ${avgProposed.toFixed(2)}ms`);
  console.log(`  平均倍率: ${(avgProposed / avgExisting).toFixed(3)}x`);

  return results;
}

// スクリプトを実行
measureComputationTimeByNodeCount().catch(err => {
  console.error("エラーが発生しました:", err);
  process.exit(1);
});
