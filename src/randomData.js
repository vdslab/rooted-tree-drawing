function generateRandomName() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function generateTree(numNodes, alpha, maxChildrenPerParent = null) {
  const existingNames = new Set();
  existingNames.add("Eve");
  const nodes = [{ name: "Eve", parent: "", width: 500, height: 100 + Math.floor(Math.random() * 2000) }]; // ルートノード
  const childrenCount = { "Eve": 0 }; // 各ノードの子の数

  while (nodes.length < numNodes) {
    let maxWeight = -Infinity;
    let selectedNode = null;
    let potentialParents = []; // 子を追加できる可能性のある親ノードのリスト

    // 子を追加できる親ノード候補をフィルタリング
    for (let node of nodes) {
      // maxChildrenPerParentが設定されていて、かつ現在の子の数が上限に達していないか、
      // またはmaxChildrenPerParentが設定されていない（上限なし）場合
      if (maxChildrenPerParent === null || (childrenCount[node.name] || 0) < maxChildrenPerParent) {
        potentialParents.push(node);
      }
    }

    if (potentialParents.length === 0) {
      // どの子も追加できない状況（すべての既存ノードが子の上限に達しているなど）
      // この場合、numNodesに達する前にループが終了する可能性がある
      // console.warn("警告: 新しい子ノードを追加できる親がいません。目標ノード数に達する前に処理を終了する可能性があります。");
      break;
    }

    for (let node of potentialParents) { // フィルタリングされた親候補から選択
      let s = Math.random();
      // 優先的選択のアルゴリズムにおける重み計算
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
      } while (existingNames.has(newNodeName)); // 重複回避
      existingNames.add(newNodeName);
      nodes.push({ name: newNodeName, parent: selectedNode.name, width: 100 + Math.floor(Math.random() * 5000), height: 100 + Math.floor(Math.random() * 5000) });
      childrenCount[selectedNode.name] = (childrenCount[selectedNode.name] || 0) + 1;
      childrenCount[newNodeName] = 0; // 新しいノードの子の数は0で初期化
    } else if (nodes.length < numNodes) {
      // selectedNodeが見つからなかったが、まだ目標ノード数に達していない場合
      // (potentialParentsが空ではないのにselectedNodeがnullになることは通常ないはずだが念のため)
      // console.warn("警告: 親ノードの選択に失敗しました。目標ノード数に達する前に処理を終了する可能性があります。");
      break;
    }
  }

  return nodes;
}