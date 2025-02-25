function generateRandomName() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function generateTree(numNodes, alpha) {
    const nodes = [{ name: "Eve", parent: "" }]; // ルートノード
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

            nodes.push({ name: newNodeName, parent: selectedNode.name });
            childrenCount[selectedNode.name] = (childrenCount[selectedNode.name] || 0) + 1;
            childrenCount[newNodeName] = 0;
        }
    }

    return nodes;
}

// 例: 50ノード、α=0.5 でツリーを生成
console.log(generateTree(50, 0.5));