import { layout } from "./layout.js";
import { layout as saColumnLayout } from "./saColumnLayout.js";
import fs from "fs";
import * as d3 from "d3";
import { generateTree } from "./randomData.js";
//分散
const V = {
  low: [900, 1100],
  medium: [500, 1500],
  high: [10, 2000]
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 一様分布 U(min, max) からサンプリング
 */
function uniformSample(min, max) {
  return min + Math.random() * (max - min);
}

function generateTreeWithUniformHeight(numNodes, alpha, fixedWidth, heightMin, heightMax) {
  const existingNames = new Set();
  existingNames.add("Eve");

  // ルートノード
  const nodes = [{
    name: "Eve",
    parent: "",
    width: fixedWidth,
    height: uniformSample(heightMin, heightMax)
  }];

  const childrenCount = { "Eve": 0 };

  while (nodes.length < numNodes) {
    let maxWeight = -Infinity;
    let selectedNode = null;
    let potentialParents = [];

    for (let node of nodes) {
      potentialParents.push(node);
    }

    if (potentialParents.length === 0) break;

    for (let node of potentialParents) {
      let s = Math.random();
      let weight = s * Math.pow((childrenCount[node.name] || 0) + 1, alpha);
      if (weight > maxWeight) {
        maxWeight = weight;
        selectedNode = node;
      }
    }

    if (selectedNode) {
      let newNodeName;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      do {
        newNodeName = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      } while (existingNames.has(newNodeName));
      existingNames.add(newNodeName);

      nodes.push({
        name: newNodeName,
        parent: selectedNode.name,
        width: fixedWidth,
        height: uniformSample(heightMin, heightMax)
      });

      childrenCount[selectedNode.name] = (childrenCount[selectedNode.name] || 0) + 1;
      childrenCount[newNodeName] = 0;
    } else {
      break;
    }
  }

  return nodes;
}

/**
 * 面積を計算
 */
function calcarea(nodes) {
  const left = d3.min(nodes, (node) => node.x - node.width / 2);
  const right = d3.max(nodes, (node) => node.x + node.width / 2);
  const top = d3.min(nodes, (node) => node.y - node.height / 2);
  const bottom = d3.max(nodes, (node) => node.y + node.height / 2);
  return (right - left) * (bottom - top);
}

/**
 * ノードの総面積を計算
 */
function calcSumNodesArea(nodes) {
  return nodes.reduce((acc, cur) => {
    let width = typeof cur.width === "number" ? cur.width : 0;
    let height = typeof cur.height === "number" ? cur.height : 0;
    return acc + width * height;
  }, 0);
}

/**
 * アスペクト比を整数表記に変換
 * @param {number} ratio - アスペクト比（幅/高さ）
 * @returns {string} "1:4", "1:2", "1:1", "2:1", "4:1" 形式
 */
function formatAspectRatio(ratio) {
  if (ratio < 1) {
    return `1:${Math.round(1 / ratio)}`;
  } else {
    return `${Math.round(ratio)}:1`;
  }
}


const evaluation = (width, height) => {
  const evaNum = 1000;
  const results = Object.fromEntries(
    Object.keys(V).map(key => [key, []])
  );
  const NODE_WIDTH = 1000;
  for (const level in V) {
    const lebelResults = [];
    console.log(`  分散レベル: ${level}`);
    const [min, max] = V[level];
    for (let i = 0; i < evaNum; i++) {
      console.log(`    評価 ${i + 1} / ${evaNum}`);
      // const nodes = [];
      // const nodesNum = uniformSample(100, 1000);
      const nodesNum = 1000;
      const data = generateTreeWithUniformHeight(nodesNum, 1 / 4, NODE_WIDTH, min, max);
      try {
        const baselineData = JSON.parse(JSON.stringify(data));
        const saColumnData = JSON.parse(JSON.stringify(data));

        // ベースライン版 (layout.js)
        const baselineTree = layout(baselineData, width, height);
        const baselineArea = calcarea(baselineTree.nodes);
        const baselineNodesArea = calcSumNodesArea(baselineTree.nodes);
        const baselineEfficiency = baselineNodesArea / baselineArea;

        // SA列管理版 (saColumnLayout.js)
        const saColumnTree = saColumnLayout(saColumnData, width, height);
        const saColumnArea = calcarea(saColumnTree.nodes);
        const saColumnNodesArea = calcSumNodesArea(saColumnTree.nodes);
        const saColumnEfficiency = saColumnNodesArea / saColumnArea;


        // 結果を保存
        lebelResults.push({
          heightRange: `U(${min},${max})`,
          aspectRatio: formatAspectRatio(width / height),
          method: "layout",
          BaseResult: baselineEfficiency,
          SaResult: saColumnEfficiency,
          nodesNum: data.length,
          data: data
        });

      } catch (error) {
        console.error(`  エラー: ${error.message}`);
      }
    }
    results[level].push(lebelResults);
  }
  return results;
};

for (const [width, height] of [[500, 2000], [500, 1000], [500, 500], [1000, 500], [2000, 500]]) {
  console.log(`評価実行: ${width}x${height}`);
  const results = evaluation(width, height);
  const filename = `evaluation_v_${width}x${height}.json`;
  fs.writeFileSync(`./sample/${filename}`, JSON.stringify(results, null, 2));
}