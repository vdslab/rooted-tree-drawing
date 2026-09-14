/**
 * LPT(Longest Processing Time first)による列分配ソルバー。
 *
 * 部分問題: 列数 k を固定して、最大列高さ(makespan)を最小化する。
 * saColumn と同じインターフェースを持ち、決定的で O(n log k)。
 *
 * 容量ベース(容量に収まる最小列数を求める)のパッキングは別物で、
 * そちらは src/packing/ にある。
 */
import { to1D } from "../core/dummy.js";

export function lptColumn(leaves, colNum) {
  const arr = to1D(leaves);
  const leavesNum = arr.length;

  if (leavesNum < colNum) {
    console.error("エラー: ノード数より列数の方が多いです。");
    return null;
  }

  // 列が1つしかない場合は割り当て不要で即時リターン
  if (colNum <= 1) {
    const resultPartition = Array.from({ length: colNum }, () => []);
    if (colNum === 1) {
      resultPartition[0] = arr;
    }
    const finalHeights = resultPartition.map(group =>
      group.reduce((sum, node) => sum + (node.height || 0), 0)
    );
    return {
      bestPartition: resultPartition,
      maxHeight: Math.max(...finalHeights, 0),
      columnHeights: finalHeights,
    };
  }

  // LPT本体: 高さ降順にソートし、そのつど負荷最小の列に貪欲に割り当てる
  const sorted = [...arr].sort((a, b) => (b.height || 0) - (a.height || 0));
  const cols = Array.from({ length: colNum }, () => ({ items: [], load: 0 }));

  for (const node of sorted) {
    let minIdx = 0;
    for (let i = 1; i < colNum; i++) {
      if (cols[i].load < cols[minIdx].load) minIdx = i;
    }
    cols[minIdx].items.push(node);
    cols[minIdx].load += node.height || 0;
  }

  const bestPartition = cols.map((c) => c.items);
  const columnHeights = cols.map((c) => c.load);
  const maxHeight = Math.max(...columnHeights);

  return {
    bestPartition,
    maxHeight,
    columnHeights: [...columnHeights].sort((a, b) => b - a),
  };
}
