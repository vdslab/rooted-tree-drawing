/**
 * LPT (Longest Processing Time first) による列パッキング。
 *
 * LPT本来は「列数kを固定してmakespanを最小化する」アルゴリズムであり、
 * 「容量capacityに収まる最小列数」を直接は求められない。そのため、
 * 列数の下限から順に増やしながらLPTを試し、makespan <= capacity を
 * 満たした時点で採用する、という探索でビンパッキング的に振る舞わせている。
 */

/**
 * 列(ビン)の負荷(totalHeight)を管理するためのMin-Heap
 * O(log 列数) で最小負荷の列を取得・更新する
 */
class ColumnMinHeap {
  constructor(columns) {
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
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

/**
 * items を colNum 列に分配し、最大列高さを最小化する(LPT本体)。
 *
 * @param {Array} items - 1次元配列
 * @param {number} colNum
 * @returns {{ columns: Array[], columnHeights: number[] }}
 */
function lptAssign(items, colNum) {
  if (colNum <= 1) {
    return {
      columns: colNum === 1 ? [items] : [],
      columnHeights: colNum === 1 ? [items.reduce((s, n) => s + (n.height || 0), 0)] : [],
    };
  }

  const sorted = [...items].sort((a, b) => (b.height || 0) - (a.height || 0));
  const columns = Array.from({ length: colNum }, () => ({ items: [], totalHeight: 0 }));
  const heap = new ColumnMinHeap([...columns]);

  for (const node of sorted) {
    const minCol = heap.pop();
    minCol.items.push(node);
    minCol.totalHeight += node.height || 0;
    heap.push(minCol);
  }

  return {
    columns: columns.map((col) => col.items),
    columnHeights: columns.map((col) => col.totalHeight),
  };
}

/**
 * capacity(B_d)に収まる最小列数になるまでLPTの列数を増やしながら探索する。
 *
 * @param {Array} items - 1次元配列。全item.heightがcapacity以下であること
 * @param {number} capacity
 * @returns {{ columns: Array[], columnHeights: number[] }}
 */
export function packLongestProcessingTime(items, capacity) {
  if (items.length === 0) return { columns: [], columnHeights: [] };

  const totalHeight = items.reduce((s, n) => s + (n.height || 0), 0);
  let k = Math.max(1, Math.ceil(totalHeight / capacity));
  const maxK = items.length;

  let result = lptAssign(items, k);
  while (Math.max(...result.columnHeights) > capacity && k < maxK) {
    k++;
    result = lptAssign(items, k);
  }

  return result;
}
