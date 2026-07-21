/**
 * First-Fit Decreasing (FFD) による列パッキング。
 *
 * 古典的なビンパッキングの近似アルゴリズム。高さ降順にソートし、
 * 各アイテムを「容量に収まる最初の列」に入れる。収まる列がなければ
 * 新しい列を作る。近似比 11/9 * OPT + 6/9 が知られている。
 *
 * @param {Array} items - 1次元配列。全item.heightがcapacity以下であること
 * @param {number} capacity
 * @returns {{ columns: Array[], columnHeights: number[] }}
 */
export function packFirstFitDecreasing(items, capacity) {
  if (items.length === 0) return { columns: [], columnHeights: [] };

  const sorted = [...items].sort((a, b) => (b.height || 0) - (a.height || 0));
  const columns = [];

  for (const item of sorted) {
    const h = item.height || 0;
    const column = columns.find((col) => col.totalHeight + h <= capacity);
    if (column) {
      column.items.push(item);
      column.totalHeight += h;
    } else {
      columns.push({ items: [item], totalHeight: h });
    }
  }

  return {
    columns: columns.map((col) => col.items),
    columnHeights: columns.map((col) => col.totalHeight),
  };
}
