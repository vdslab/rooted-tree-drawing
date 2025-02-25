import { layout } from "./layout.js";
import fs from 'fs';
import * as d3 from "d3";
import { generateTree } from "./randomData.js";
export default function evaluation() {

}
const width = 1000;
const height = 1000;
const evaluationNum = 100;
const result = []
for (let i = 0; i < evaluationNum; i++) {
    const tree = layout(generateTree(100, 0.5), width, height);
    const area = calcarea(tree.nodes)
    const nodesArea = calcSumNodesArea(tree.nodes)
    result.push(nodesArea / area);
}
console.log(result);
// JSONファイルに保存
fs.writeFileSync('data.json', JSON.stringify(result), 'utf-8');
console.log('data.json に保存しました');
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
    }, 0); // 初期値 0 を指定
}