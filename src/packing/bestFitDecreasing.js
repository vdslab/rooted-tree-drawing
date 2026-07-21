/**
 * Best-Fit Decreasing (BFD) による列パッキング。
 *
 * FFDと同じ降順ソートだが、「収まる列の中で最も残り容量が小さい列」
 * (最もぴったり収まる列)にアイテムを入れる点が異なる。FFDと理論上の
 * 近似比は同じだが、実データでは列数がFFD以下になることが多い。
 *
 * @param {Array} items - 1次元配列。全item.heightがcapacity以下であること
 * @param {number} capacity
 * @returns {{ columns: Array[], columnHeights: number[] }}
 */
export function packBestFitDecreasing(items, capacity) {
  if (items.length === 0) return { columns: [], columnHeights: [] };

  const sorted = [...items].sort((a, b) => (b.height || 0) - (a.height || 0));
  const columns = [];

  for (const item of sorted) {
    const h = item.height || 0;
    let bestColumn = null;
    let bestRemaining = Infinity;

    for (const col of columns) {
      const remaining = capacity - col.totalHeight;
      if (h <= remaining && remaining < bestRemaining) {
        bestRemaining = remaining;
        bestColumn = col;
      }
    }

    if (bestColumn) {
      bestColumn.items.push(item);
      bestColumn.totalHeight += h;
    } else {
      columns.push({ items: [item], totalHeight: h });
    }
  }

  return {
    columns: columns.map((col) => col.items),
    columnHeights: columns.map((col) => col.totalHeight),
  };
}
