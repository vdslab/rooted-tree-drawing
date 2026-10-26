import test from "node:test";
import assert from "node:assert/strict";
import { assertLayout } from "./layout-invariants.mjs";

const input = [{ name: "a" }, { name: "b" }];
const valid = () => ({ nodes: [{ id: "a", x: 0, y: 0, width: 2, height: 2 }, { id: "b", x: 3, y: 0, width: 2, height: 2 }], links: [{ segments: [[1, 0], [2, 0]] }] });
test("invariants reject missing IDs, non-finite coordinates, non-positive sizes, overlap and invalid links", () => {
  assert.doesNotThrow(() => assertLayout(valid(), input));
  for (const mutate of [
    (r) => r.nodes.pop(), (r) => { r.nodes[1].id = "a"; },
    (r) => { r.nodes[0].x = NaN; }, (r) => { r.nodes[0].height = 0; },
    (r) => { r.nodes[1].x = 0; }, (r) => { r.links[0].segments[0][0] = Infinity; },
  ]) {
    const result = valid(); mutate(result);
    assert.throws(() => assertLayout(result, input));
  }
});
