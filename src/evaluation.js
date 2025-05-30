import { layout } from "./layout.js";
import { layout as newLayout } from "./newLayout.js";
import fs from "fs";
import * as d3 from "d3";
import { generateTree } from "./randomData.js";
export default function evaluation() {

}
const width = 500;
const height = 1000;
const evaluationNum = 1000; // 評価回数を1回に減らす
const alpha = 1;
const kisonresult = [];
const newresult = [];
for (let i = 0; i < evaluationNum; i++) {
  const data = generateTree(100, alpha); // ノード数を10に減らす
  try {
    const newData = JSON.parse(JSON.stringify(data));
    const kisontree = layout(data, width, height);
    const newtree = newLayout(newData, width, height);
    const kisonarea = calcarea(kisontree.nodes);
    const newarea = calcarea(newtree.nodes);
    const kisonnodesArea = calcSumNodesArea(kisontree.nodes);
    const newnodesArea = calcSumNodesArea(newtree.nodes);
    kisonresult.push(kisonnodesArea / kisonarea);
    newresult.push(newnodesArea / newarea);
    console.log(`process:${i + 1} / ${evaluationNum}`);
  } catch (error) {
    console.error("レイアウト処理中にエラーが発生しました:", error);
  }
}
// JSONファイルに保存
fs.writeFileSync(`resultData/kisonAspect:${width}:${height}.json`, JSON.stringify(kisonresult), "utf-8");
fs.writeFileSync(`resultData/newAspect:${width}:${height}.json`, JSON.stringify(newresult), "utf-8");

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
