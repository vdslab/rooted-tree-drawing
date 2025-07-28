import { layout } from "./layout.js";
// import { layout as newLayout } from "./newLayout.js";
import { layout as zenLayout } from "../sa-project/saLayout.js";
import { layout as saLayout } from "./SALayout.js";
import fs from "fs";
import * as d3 from "d3";
import { generateTree } from "./randomData.js";
export default function evaluation() {

}

import dataSet from "../random_trees_dataset5000-10000.json" with { type: 'json' };

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; // min以上max以下の整数
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min; // min以上max未満の浮動小数点数
}

const sa = [];
const width = 1000;
const height = 500;
const options = {
  initialTemp: 443.64638595470666,       // 最適化された値
  finalTemp: 0.10305869402445039,          // 最適化された値
  coolingRate: 0.9923474667651442,        // 最適化された値
  iterationsPerTemp: 782      // 最適化された値
};
dataSet.forEach((tree, i) => {
  const satree = zenLayout(tree.tree, width, height, options);
  const saarea = calcarea(satree.nodes);
  const sanodesArea = calcSumNodesArea(satree.nodes);
  sa.push({ result: sanodesArea / saarea, alpha: tree.alpha, nodesNum: tree.numNodes });
  console.log(`process:${i + 1}`);
});


// JSONファイルに保存
// // fs.writeFileSync("resultData/kison-randomParm.json", JSON.stringify(kisonresult), "utf-8");
// // fs.writeFileSync("resultData/new-randomParm.json", JSON.stringify(newresult), "utf-8");
fs.writeFileSync("resultData/sa.json", JSON.stringify(sa), "utf-8");
// fs.writeFileSync("resultData/zen-randomParm.json", JSON.stringify(zenresult), "utf-8");
// fs.writeFileSync("resultData/twice-itteretion.json", JSON.stringify(twice), "utf-8");
// fs.writeFileSync("resultData/kison-randomParm.json", JSON.stringify(kisonresult), "utf-8");
// fs.writeFileSync("resultData/new-randomParm.json", JSON.stringify(newresult), "utf-8");
// fs.writeFileSync("resultData/zen-randomParm.json", JSON.stringify(zenresult), "utf-8");

console.log("data.json に保存しました");
//ツリーのアスペクト比を返す関数
function calcarea(nodes) {
  const left = d3.min(
    nodes,
    (node) => node.x - node.width / 2,
  );
  const right = d3.max(
    nodes,
    (node) => node.x + node.width / 2,
  );
  const top = d3.min(
    nodes,
    (node) => node.y - node.height / 2,
  );
  const bottom = d3.max(
    nodes,
    (node) => node.y + node.height / 2,
  );
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  return layoutWidth * layoutHeight;
}

function calcSumNodesArea(nodes) {
  return nodes.reduce((acc, cur) => {
    let width = typeof cur.width === "number" ? cur.width : 0;
    let height = typeof cur.height === "number" ? cur.height : 0;
    return acc + width * height;
  }, 0);
}