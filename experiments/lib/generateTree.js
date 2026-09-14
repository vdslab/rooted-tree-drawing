/**
 * 論文 §4.1/§4.2 の木生成アルゴリズム(scale-freeモデル, α=0.25)の再現。
 * evaluationブランチの src/evaluation_variance.js の
 * generateTreeWithUniformHeight を移植したもの。
 *
 * 優先的選択: weight = random() * (childCount + 1)^alpha
 */

const NAME_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateRandomName() {
  return Array.from({ length: 5 }, () => NAME_CHARS[Math.floor(Math.random() * NAME_CHARS.length)]).join("");
}

function uniformSample(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * @param {number} numNodes - 生成するノード数 |V|
 * @param {number} alpha - scale-freeモデルのα(論文では0.25)
 * @param {number} fixedWidth - 全ノード共通の幅
 * @param {number} heightMin - ノード高さの一様分布の下限
 * @param {number} heightMax - ノード高さの一様分布の上限
 * @returns {Array<{name:string, parent:string, width:number, height:number}>}
 */
export function generateScaleFreeTree(numNodes, alpha, fixedWidth, heightMin, heightMax) {
  const existingNames = new Set(["Eve"]);
  const nodes = [
    {
      name: "Eve",
      parent: "",
      width: fixedWidth,
      height: uniformSample(heightMin, heightMax),
    },
  ];
  const childrenCount = { Eve: 0 };

  while (nodes.length < numNodes) {
    let maxWeight = -Infinity;
    let selectedNode = null;

    for (const node of nodes) {
      const s = Math.random();
      const weight = s * Math.pow((childrenCount[node.name] || 0) + 1, alpha);
      if (weight > maxWeight) {
        maxWeight = weight;
        selectedNode = node;
      }
    }

    if (!selectedNode) break;

    let newNodeName;
    do {
      newNodeName = generateRandomName();
    } while (existingNames.has(newNodeName));
    existingNames.add(newNodeName);

    nodes.push({
      name: newNodeName,
      parent: selectedNode.name,
      width: fixedWidth,
      height: uniformSample(heightMin, heightMax),
    });

    childrenCount[selectedNode.name] = (childrenCount[selectedNode.name] || 0) + 1;
    childrenCount[newNodeName] = 0;
  }

  return nodes;
}
