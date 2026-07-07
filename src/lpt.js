/**
 * LPT (Longest Processing Time first) アルゴリズムによる列分配
 * 
 * ビンパッキングの双対問題（Multiprocessor Scheduling）を
 * 貪欲法で解く。サイズ降順にソートし、最も負荷の小さいビンに
 * アイテムを割り当てることで、最大負荷を最小化する。
 * 
 * 性能保証: 最大負荷 ≤ (4/3 - 1/(3k)) · OPT
 * 計算量: O(n log n)
 * 
 * saColumn と同じインターフェースを持つため、ドロップイン置換が可能。
 */

/**
 * LPT アルゴリズムによる列分配
 * - 幅固定、高さ可変
 * - 最大列高さを最小化
 * 
 * @param {Array} leaves - 葉ノードの2次元配列
 * @param {number} colNum - 分配先の列数
 * @returns {{ bestPartition: Array[], maxHeight: number, columnHeights: number[] }}
 */
export function lptColumn(leaves, colNum) {
  // --- 1. 初期化 ---
  const arr = to1D(leaves);
  const leavesNum = arr.length;

  if (leavesNum < colNum) {
    console.error("エラー: ノード数より列数の方が多いです。");
    return null;
  }

  // ★ 列が1つしかない場合は探索不要で即時リターン
  if (colNum <= 1) {
    const resultPartition = Array.from({ length: colNum }, () => []);
    if (colNum === 1) {
      resultPartition[0] = arr;
    }
    const finalHeights = resultPartition.map(group =>
      group.reduce((sum, node) => sum + (node.height || 0), 0)
    );
    const maxHeight = finalHeights.length > 0 ? Math.max(...finalHeights) : 0;

    return {
      bestPartition: resultPartition,
      maxHeight: maxHeight,
      columnHeights: finalHeights,
    };
  }

  // --- 2. LPT アルゴリズム ---
  // 高さの降順にソート（インデックスを保持）
  const indexed = arr.map((node, i) => ({ node, height: node.height || 0, index: i }));
  indexed.sort((a, b) => b.height - a.height);

  // 各列を初期化し、Min-Heapを構成
  const columns = Array.from({ length: colNum }, () => ({ items: [], totalHeight: 0 }));
  const heap = new ColumnMinHeap([...columns]);

  // 最も大きいアイテムから、最も負荷の小さい列に入れる
  for (const { node } of indexed) {
    const minCol = heap.pop();
    minCol.items.push(node);
    minCol.totalHeight += node.height || 0;
    heap.push(minCol);
  }

  // --- 3. 結果の整形 ---
  const bestPartition = columns.map(col => col.items);
  const columnHeights = columns.map(col => col.totalHeight);
  const maxHeight = Math.max(...columnHeights);

  return {
    bestPartition: bestPartition,
    maxHeight: maxHeight,
    columnHeights: columnHeights.sort((a, b) => b - a),
  };
}

/**
 * ソート済み配列に対する LPT 貪欲割り当て（再ソート不要版）
 * 
 * detectDominantNodes で既にソート済みの残りノードに対して使用する。
 * 
 * @param {Array} sortedNodes - 高さ降順にソート済みのノード配列
 * @param {number} colNum - 分配先の列数
 * @returns {{ bestPartition: Array[], maxHeight: number, columnHeights: number[] }}
 */
export function lptColumnFromSorted(sortedNodes, colNum) {
  if (sortedNodes.length === 0 || colNum <= 0) {
    return {
      bestPartition: Array.from({ length: colNum }, () => []),
      maxHeight: 0,
      columnHeights: new Array(colNum).fill(0),
    };
  }

  if (colNum <= 1) {
    const totalHeight = sortedNodes.reduce((s, n) => s + (n.height || 0), 0);
    return {
      bestPartition: [sortedNodes],
      maxHeight: totalHeight,
      columnHeights: [totalHeight],
    };
  }

  // 各列を初期化し、Min-Heapを構成
  const columns = Array.from({ length: colNum }, () => ({ items: [], totalHeight: 0 }));
  const heap = new ColumnMinHeap([...columns]);

  // ソート済みなので、そのまま最小負荷の列に入れる
  for (const node of sortedNodes) {
    const minCol = heap.pop();
    minCol.items.push(node);
    minCol.totalHeight += node.height || 0;
    heap.push(minCol);
  }

  const bestPartition = columns.map(col => col.items);
  const columnHeights = columns.map(col => col.totalHeight);
  const maxHeight = Math.max(...columnHeights);

  return {
    bestPartition,
    maxHeight,
    columnHeights: columnHeights.sort((a, b) => b - a),
  };
}

/**
 * 2次元配列を1次元に変換
 */
function to1D(leaves) {
  return leaves.flat();
}

/**
 * 列（ビン）の負荷（totalHeight）を管理するためのMin-Heap
 * O(log C) で最小負荷の列を取得・更新する
 */
class ColumnMinHeap {
  constructor(columns) {
    // 初期状態は全てtotalHeight=0のため、そのままヒープとして有効
    this.heap = columns;
  }

  push(col) {
    this.heap.push(col);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return min;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].totalHeight <= this.heap[index].totalHeight) break;
      
      // Swap
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      let leftIndex = 2 * index + 1;
      let rightIndex = 2 * index + 2;
      let smallest = index;

      if (leftIndex < length && this.heap[leftIndex].totalHeight < this.heap[smallest].totalHeight) {
        smallest = leftIndex;
      }
      if (rightIndex < length && this.heap[rightIndex].totalHeight < this.heap[smallest].totalHeight) {
        smallest = rightIndex;
      }

      if (smallest === index) break;
      
      // Swap
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}
