/**
 * solvers/lptColumn.js（O(m log k)）が、素朴な LPT と同じ分配を返すことを確かめる。
 *
 * 素朴な LPT: 列を順につなげて高さ降順に安定ソートし、そのつど負荷最小（同点は番号の小さい列）の
 * 列に割り当てる。O(m log m + m k)。列成長型と同じく前回の分配を次の入力にして列数を1ずつ増やし、
 * 同点の多い入力・高さの欠けた入力・未ソートの入力（SA の分配に相当）も試す。
 * 同点の割り方が1つでも違うと列の中身が変わり、レイアウトの出力が変わる。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { lptColumn } from "../src/layout/solvers/lptColumn.js";
import { seededRandom } from "../experiments/lib/random.js";

function naiveLpt(leaves, colNum) {
  const sorted = leaves.flat().sort((a, b) => (b.height || 0) - (a.height || 0));
  const cols = Array.from({ length: colNum }, () => ({ items: [], load: 0 }));
  for (const node of sorted) {
    let min = 0;
    for (let i = 1; i < colNum; i += 1) if (cols[i].load < cols[min].load) min = i;
    cols[min].items.push(node);
    cols[min].load += node.height || 0;
  }
  return cols.map((c) => c.items);
}

const names = (partition) => partition.map((col) => col.map((n) => n.name));

test("lptColumn matches naive LPT while columns grow one by one", () => {
  const random = seededRandom(5);
  for (let t = 0; t < 600; t += 1) {
    const m = 1 + Math.floor(random() * 60);
    const mode = t % 3;
    const leaves = Array.from({ length: m }, (_, i) => ({
      name: `L${i}`,
      height: mode === 0 ? 1 + Math.floor(random() * 4)
        : mode === 1 ? random() * 100
          : random() < 0.2 ? undefined : Math.floor(random() * 3),
    }));
    let partition = [leaves];
    for (let k = 2; k <= m; k += 1) {
      const expected = naiveLpt(partition, k);
      const actual = lptColumn(partition, k).bestPartition;
      assert.deepEqual(names(actual), names(expected), `t=${t} k=${k}`);
      partition = actual;
    }
  }
});

test("lptColumn matches naive LPT on unsorted partitions", () => {
  const random = seededRandom(6);
  for (let t = 0; t < 600; t += 1) {
    const m = 2 + Math.floor(random() * 60);
    const leaves = Array.from({ length: m }, (_, i) => ({ name: `L${i}`, height: Math.floor(random() * 5) }));
    const k = 1 + Math.floor(random() * (m - 1));
    const partition = Array.from({ length: k }, () => []);
    leaves.forEach((leaf) => partition[Math.floor(random() * k)].push(leaf));
    assert.deepEqual(names(lptColumn(partition, k + 1).bestPartition), names(naiveLpt(partition, k + 1)), `t=${t}`);
  }
});
