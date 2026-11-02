/**
 * LPT(Longest Processing Time first)による列分配ソルバー。
 *
 * 部分問題: 列数 k を固定して、最大列高さ(makespan)を最小化する。
 * saColumn と同じインターフェースを持ち、決定的。
 *
 * 計算量は葉の数を m として O(m log k)。列成長型は同じダミーの列数を1ずつ増やしながら
 * 呼ぶので、入力（前回の分配）の各列はすでに高さの降順に並んでいる。全体をソートし直す
 * 代わりに k 本の列をマージし、負荷が最小の列はヒープで探す。入力の列が降順でなければ
 * （初回の1列や SA の分配）ソートする（O(m log m)）。
 *
 * 出力は「列を順につなげて高さ降順に安定ソートし、そのつど負荷最小（同点は番号の小さい列）に
 * 割り当てる」素朴な LPT と同じ。マージでも高さの同点は番号の小さい列を先に出すので、
 * 安定ソートと同じ順になる。
 *
 * 容量ベース(容量に収まる最小列数を求める)のパッキングは別物で、
 * そちらは src/packing/ にある。
 */
import { to1D } from "../core/dummy.js";
import { Heap } from "../core/heap.js";

const heightOf = (node) => node.height || 0;

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
      group.reduce((sum, node) => sum + heightOf(node), 0)
    );
    return {
      bestPartition: resultPartition,
      maxHeight: Math.max(...finalHeights, 0),
      columnHeights: finalHeights,
    };
  }

  // LPT本体: 高さ降順に、そのつど負荷最小の列に貪欲に割り当てる
  const cols = Array.from({ length: colNum }, (_, index) => ({ index, items: [], load: 0 }));
  const lightest = new Heap((a, b) => a.load < b.load || (a.load === b.load && a.index < b.index), cols);
  for (const node of byHeightDescending(leaves, arr)) {
    const col = lightest.peek();
    col.items.push(node);
    col.load += heightOf(node);
    lightest.updateTop();
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

/**
 * 列をつなげた arr を高さ降順に安定ソートした並びを返す。
 * 各列が降順なら列のマージで済ませる（O(m log k)）。同点は番号の小さい列を先に出す。
 */
function byHeightDescending(leaves, arr) {
  const sortedColumns = leaves.every((col) =>
    col.every((node, i) => i === 0 || heightOf(col[i - 1]) >= heightOf(node)));
  if (!sortedColumns) return [...arr].sort((a, b) => heightOf(b) - heightOf(a));

  const heads = leaves
    .map((col, index) => ({ col, index, pos: 0, height: col.length ? heightOf(col[0]) : 0 }))
    .filter((h) => h.col.length > 0);
  const tallest = new Heap(
    (a, b) => a.height > b.height || (a.height === b.height && a.index < b.index),
    heads,
  );
  const merged = [];
  while (tallest.size) {
    const head = tallest.peek();
    merged.push(head.col[head.pos]);
    head.pos += 1;
    if (head.pos < head.col.length) {
      head.height = heightOf(head.col[head.pos]);
      tallest.updateTop();
    } else {
      tallest.pop();
    }
  }
  return merged;
}
