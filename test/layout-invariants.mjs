import assert from "node:assert/strict";

export function countOverlaps(result) {
  const eps = 1e-6;
  const boxes = result.nodes.map((n) => ({ l: n.x - n.width / 2, r: n.x + n.width / 2, t: n.y - n.height / 2, b: n.y + n.height / 2 })).sort((a, b) => a.l - b.l);
  let count = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxes[j].l >= boxes[i].r - eps) break;
      if (boxes[j].t < boxes[i].b - eps && boxes[i].t < boxes[j].b - eps) count++;
    }
  }
  return count;
}

/** 基準値の更新とは独立した、すべての手法で必要な条件。 */
export function assertLayout(result, input) {
  assert.ok(Array.isArray(result.nodes) && Array.isArray(result.links), "nodes/links must be arrays");
  assert.equal(result.nodes.length, input.length, "node count changed");
  assert.deepEqual(new Set(result.nodes.map((n) => n.id)), new Set(input.map((n) => n.name)), "node IDs changed");
  for (const n of result.nodes) {
    assert.ok([n.x, n.y, n.width, n.height].every(Number.isFinite), `non-finite node: ${n.id}`);
    assert.ok(n.width > 0 && n.height > 0, `non-positive size: ${n.id}`);
  }
  for (const link of result.links) {
    assert.ok(Array.isArray(link.segments) && link.segments.length >= 2, "invalid link");
    assert.ok(link.segments.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)), "non-finite link");
  }
  assert.equal(countOverlaps(result), 0, "overlapping nodes");
}
