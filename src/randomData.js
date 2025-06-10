// Node.js環境で実行する場合はfsモジュールを使用
// import { writeFile } from "fs";
function generateRandomName() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function generateTree(numNodes, alpha) {
  const nodes = [{ name: "Eve", parent: "", width: 100 + Math.floor(Math.random() * 2000), height: 100 + Math.floor(Math.random() * 2000) }]; // ルートノード
  const childrenCount = { "Eve": 0 }; // 各ノードの子の数

  while (nodes.length < numNodes) {
    // 各ノードの重みを計算
    let maxWeight = -Infinity;
    let selectedNode = null;

    for (let node of nodes) {
      let s = Math.random();
      let weight = s * Math.pow((childrenCount[node.name] || 0) + 1, alpha);

      if (weight > maxWeight) {
        maxWeight = weight;
        selectedNode = node;
      }
    }

    if (selectedNode) {
      let newNodeName;
      do {
        newNodeName = generateRandomName();
      } while (nodes.some(n => n.name === newNodeName)); // 重複回避

      nodes.push({ name: newNodeName, parent: selectedNode.name, width: 100 + Math.floor(Math.random() * 2000), height: 100 + Math.floor(Math.random() * 2000) });
      childrenCount[selectedNode.name] = (childrenCount[selectedNode.name] || 0) + 1;
      childrenCount[newNodeName] = 0;
    }
  }

  return nodes;
}

// // Node.js環境でJSONファイルを生成する関数
// const createFile = (pathName, source) => {
//   const toJSON = JSON.stringify(source);
//   writeFile(pathName, toJSON, (err) => {
//     if (err) console.error(err);
//     if (!err) {
//       console.log("JSONファイルを生成しました");
//     }
//   });
// };

// // このファイルがNode.js環境で直接実行された場合のみ実行
// // Node.jsでESMを使用する場合は、以下のコマンドで実行します：
// // node --experimental-json-modules src/randomData.js
// if (typeof process !== "undefined") {
//   // ブラウザ環境ではなくNode.js環境で実行されている場合
//   const isDirectlyExecuted = process.argv[1] && process.argv[1].endsWith("randomData.js");
//   if (isDirectlyExecuted) {
//     createFile("newObj.json", generateTree(50, 0.5));
//   }
// }
