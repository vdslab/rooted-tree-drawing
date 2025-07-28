import { layout } from "./layout.js";
// import { layout as newLayout } from "./newLayout.js";
import { layout as zenLayout } from "../sa-project/saLayout.js";
import { layout as saLayout } from "./SALayout.js";
import fs from "fs";
import * as d3 from "d3";
import { generateTree } from "./randomData.js";
export default function evaluation() {

}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; // min以上max以下の整数
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min; // min以上max未満の浮動小数点数
}
const evaluationNum = 50;//試行回数
const width = 1000;//描画範囲横幅
const height = 500;//描画範囲縦幅
const nodesNum = 100;//ノードの数
const alpha = 1 / 4;//α(0~1で値が大きいほど、同じ親に葉ノードができやすい)
// const kisonresult = [];
// const newresult = [];
// const saresult = [];
const zenresult = [];
const twice = [];
for (let i = 0; i < evaluationNum; i++) {
  // const width = getRandomInt(300, 1000);
  // const height = getRandomInt(300, 1000);
  // const nodesNum = getRandomInt(50, 500);
  // const alpha = Math.random();
  const data = generateTree(nodesNum, alpha); // ノード数を10に減らす
  try {
    // const kisonData = JSON.parse(JSON.stringify(data));
    // const newData = JSON.parse(JSON.stringify(data));
    // const saData = JSON.parse(JSON.stringify(data));
    const zenData = JSON.parse(JSON.stringify(data));
    const twiceData = JSON.parse(JSON.stringify(data));

    // // const kisontree = layout(kisonData, width, height);
    // // // const newtree = newLayout(newData, width, height);
    // const satree = saLayout(saData, width, height);
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
    const zentree = zenLayout(zenData, width, height, options);
    const twiceTree = zenLayout(twiceData, width, height, twiceoptions);
    // // const kisonarea = calcarea(kisontree.nodes);
    // // const newarea = calcarea(newtree.nodes);
    // const saarea = calcarea(satree.nodes);
    const zenarea = calcarea(zentree.nodes);
    const twicearea = calcarea(twiceTree.nodes);
    // // const kisonnodesArea = calcSumNodesArea(kisontree.nodes);
    // // const newnodesArea = calcSumNodesArea(newtree.nodes);
    // const sanodesArea = calcSumNodesArea(satree.nodes);
    const zennodesArea = calcSumNodesArea(zentree.nodes);
    const twicenodeArea = calcSumNodesArea(twiceTree.nodes);
    // // // // // kisonresult.push({ result: kisonnodesArea / kisonarea, max_ori: kisontree.max_ori, sum_ori: kisontree.sum_ori, alpha: alpha, nodesNum: nodesNum, aspect: width / height, data: data });
    // // // // // newresult.push({ result: newnodesArea / newarea, max_ori: newtree.max_ori, sum_ori: newtree.sum_ori, alpha: alpha, nodesNum: nodesNum, aspect: width / height, data: data });
    // saresult.push({ result: sanodesArea / saarea, alpha: alpha, nodesNum: nodesNum, aspect: width / height, data: data });
    zenresult.push({ result: zennodesArea / zenarea, data: data });
    twice.push({ result: twicenodeArea / twicearea, data: data });
    console.log(`process:${i + 1} / ${evaluationNum}`);
  } catch (error) {
    console.error("レイアウト処理中にエラーが発生しました:", error);
  }
}
// JSONファイルに保存
// // fs.writeFileSync("resultData/kison-randomParm.json", JSON.stringify(kisonresult), "utf-8");
// // fs.writeFileSync("resultData/new-randomParm.json", JSON.stringify(newresult), "utf-8");
// fs.writeFileSync("resultData/sa-randomParm.json", JSON.stringify(saresult), "utf-8");
fs.writeFileSync("resultData/zen-randomParm.json", JSON.stringify(zenresult), "utf-8");
fs.writeFileSync("resultData/twice-itteretion.json", JSON.stringify(twice), "utf-8");
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