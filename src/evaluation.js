import { layout } from "./layout.js";
import { layout as newLayout } from "./newLayout.js";
import { layout as zenLayout } from "./parmutationLayout.js";
import { layout as saLayout } from "./SALayout.js"
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
const evaluationNum = 100;//試行回数
const width = 1000;//描画範囲横幅
const height = 500;//描画範囲縦幅
const nodesNum = 500;//ノードの数
const alpha = 1 / 4;//α(0~1で値が大きいほど、同じ親に葉ノードができやすい)
const kisonresult = [];
const newresult = [];
const saresult = [];
// const zenresult = [];
for (let i = 0; i < evaluationNum; i++) {
  // const width = getRandomInt(300, 1000);
  // const height = getRandomInt(300, 1000);
  // const nodesNum = getRandomInt(50, 500);
  // const alpha = Math.random();
  const data = generateTree(nodesNum, alpha); // ノード数を10に減らす
  // const data = [{ "name": "Eve", "parent": "", "width": 637, "height": 490 }, { "name": "QWHDL", "parent": "Eve", "width": 840, "height": 2082 }, { "name": "MZINV", "parent": "QWHDL", "width": 432, "height": 1021 }, { "name": "ZUKSC", "parent": "MZINV", "width": 874, "height": 1984 }, { "name": "WWPLW", "parent": "MZINV", "width": 883, "height": 754 }, { "name": "BLXWR", "parent": "Eve", "width": 2032, "height": 1047 }, { "name": "UDFMB", "parent": "ZUKSC", "width": 681, "height": 877 }, { "name": "MBIYA", "parent": "ZUKSC", "width": 1146, "height": 1179 }, { "name": "NIQLZ", "parent": "UDFMB", "width": 1616, "height": 1407 }, { "name": "GXGWH", "parent": "MZINV", "width": 171, "height": 2011 }, { "name": "UANJV", "parent": "MZINV", "width": 1978, "height": 1113 }, { "name": "OXCPQ", "parent": "Eve", "width": 1738, "height": 1656 }, { "name": "ZHKWC", "parent": "MZINV", "width": 634, "height": 618 }, { "name": "NPRDF", "parent": "Eve", "width": 1806, "height": 921 }, { "name": "VYACA", "parent": "NPRDF", "width": 1348, "height": 483 }, { "name": "HMISZ", "parent": "QWHDL", "width": 262, "height": 295 }, { "name": "AEKHR", "parent": "ZHKWC", "width": 833, "height": 199 }, { "name": "WQQUV", "parent": "ZHKWC", "width": 209, "height": 862 }, { "name": "WRXRZ", "parent": "NPRDF", "width": 721, "height": 1204 }, { "name": "SGXEM", "parent": "ZHKWC", "width": 827, "height": 236 }, { "name": "BXOZY", "parent": "MZINV", "width": 1275, "height": 1250 }, { "name": "ZXUCR", "parent": "ZUKSC", "width": 519, "height": 1014 }, { "name": "NZBNF", "parent": "UDFMB", "width": 1199, "height": 1362 }, { "name": "SXBXS", "parent": "UDFMB", "width": 1224, "height": 784 }, { "name": "QFCCB", "parent": "ZUKSC", "width": 1667, "height": 402 }, { "name": "URAJC", "parent": "ZHKWC", "width": 903, "height": 1989 }, { "name": "ISFVJ", "parent": "ZUKSC", "width": 2014, "height": 654 }, { "name": "KBLMM", "parent": "UDFMB", "width": 1400, "height": 1724 }, { "name": "DMGJX", "parent": "Eve", "width": 337, "height": 1180 }, { "name": "QFZYF", "parent": "UDFMB", "width": 1417, "height": 1440 }, { "name": "XAKTS", "parent": "UDFMB", "width": 507, "height": 245 }, { "name": "SLDHJ", "parent": "ZUKSC", "width": 202, "height": 333 }, { "name": "DZQBJ", "parent": "ZHKWC", "width": 584, "height": 421 }, { "name": "LYNCS", "parent": "MZINV", "width": 401, "height": 1415 }, { "name": "MJULI", "parent": "NPRDF", "width": 280, "height": 886 }, { "name": "FOMMP", "parent": "MZINV", "width": 2042, "height": 763 }, { "name": "JGDJX", "parent": "ZHKWC", "width": 1176, "height": 1993 }, { "name": "RTTSN", "parent": "Eve", "width": 1976, "height": 1974 }, { "name": "ARXPX", "parent": "ZUKSC", "width": 361, "height": 1409 }, { "name": "BMZAE", "parent": "Eve", "width": 537, "height": 1663 }, { "name": "PAFGN", "parent": "JGDJX", "width": 1760, "height": 1107 }, { "name": "URZBV", "parent": "ZUKSC", "width": 1899, "height": 816 }, { "name": "FCFVH", "parent": "UDFMB", "width": 585, "height": 1710 }, { "name": "RLDOG", "parent": "ZHKWC", "width": 1805, "height": 1035 }, { "name": "SASAR", "parent": "Eve", "width": 1778, "height": 227 }, { "name": "YCBFX", "parent": "JGDJX", "width": 826, "height": 503 }, { "name": "VMNEL", "parent": "Eve", "width": 1204, "height": 1261 }, { "name": "QQMTB", "parent": "ZUKSC", "width": 1531, "height": 1197 }, { "name": "LVDPM", "parent": "ZUKSC", "width": 1579, "height": 621 }, { "name": "NCGES", "parent": "ZUKSC", "width": 715, "height": 673 }];
  try {
    const kisonData = JSON.parse(JSON.stringify(data));
    const newData = JSON.parse(JSON.stringify(data));
    const saData = JSON.parse(JSON.stringify(data));
    // const zenData = JSON.parse(JSON.stringify(data));
    const kisontree = layout(kisonData, width, height);
    const newtree = newLayout(newData, width, height);
    const satree = saLayout(saData, width, height);
    // // // const zentree = zenLayout(zenData, width, height);
    const kisonarea = calcarea(kisontree.nodes);
    const newarea = calcarea(newtree.nodes);
    const saarea = calcarea(newtree.nodes);
    // const zenarea = calcarea(zentree.nodes);
    const kisonnodesArea = calcSumNodesArea(kisontree.nodes);
    const newnodesArea = calcSumNodesArea(newtree.nodes);
    const sanodesArea = calcSumNodesArea(satree.nodes);
    // // const zennodesArea = calcSumNodesArea(zentree.nodes);
    // console.log(newnodesArea / newarea, zennodesArea / zenarea);
    kisonresult.push({ result: kisonnodesArea / kisonarea, max_ori: kisontree.max_ori, sum_ori: kisontree.sum_ori, alpha: alpha, nodesNum: nodesNum, aspect: width / height, data: data });
    newresult.push({ result: newnodesArea / newarea, max_ori: newtree.max_ori, sum_ori: newtree.sum_ori, alpha: alpha, nodesNum: nodesNum, aspect: width / height, data: data });
    saresult.push({ result: sanodesArea / saarea, alpha: alpha, nodesNum: nodesNum, aspect: width / height, data: data });
    // // // zenresult.push({ result: zennodesArea / zenarea, data: data });
    console.log(`process:${i + 1} / ${evaluationNum}`);
  } catch (error) {
    console.error("レイアウト処理中にエラーが発生しました:", error);
  }
}
// JSONファイルに保存
fs.writeFileSync("resultData/kison-randomParm.json", JSON.stringify(kisonresult), "utf-8");
fs.writeFileSync("resultData/new-randomParm.json", JSON.stringify(newresult), "utf-8");
fs.writeFileSync("resultData/sa-randomParm.json", JSON.stringify(saresult), "utf-8");
// // fs.writeFileSync("resultData/zen-randomParm.json", JSON.stringify(zenresult), "utf-8");
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