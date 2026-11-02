import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import * as d3 from "d3";

import { layout as currentLayout } from "../src/layout/methods/growth.js";
import { layout as incrementalLayout, incrementalPlacement } from "../src/layout/methods/growthIncremental.js";
import { vanderPloegLayout } from "../src/layout/core/vanderPloeg.js";
import { calcAspectRatio } from "../src/layout/core/tree.js";
import { seededRandom } from "../experiments/lib/random.js";
import { randomTree, deepTree, paperSize, skewedSize, spikySize } from "./tree-generators.mjs";

const fixtureDirectory = new URL("./fixtures/", import.meta.url);
const sizes = [
  [250, 1000],
  [500, 1000],
  [1000, 1000],
  [1000, 500],
  [1000, 250],
];

function clone(value) {
  return structuredClone(value);
}

function assertClose(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: element count`);
  for (let i = 0; i < actual.length; i += 1) {
    assert.equal(actual[i].id, expected[i].id, `${label}[${i}].id`);
    for (const key of ["x", "y", "width", "height"]) {
      assert.ok(
        Math.abs(actual[i][key] - expected[i][key]) < 1e-9,
        `${label}[${i}].${key}: ${actual[i][key]} != ${expected[i][key]}`,
      );
    }
  }
}

function assertSegmentsClose(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: point count`);
  for (let i = 0; i < actual.length; i += 1) {
    for (let axis = 0; axis < 2; axis += 1) {
      assert.ok(
        Math.abs(actual[i][axis] - expected[i][axis]) < 1e-9,
        `${label}[${i}][${axis}]: ${actual[i][axis]} != ${expected[i][axis]}`,
      );
    }
  }
}

const fixtureNames = (await readdir(fixtureDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();

for (const fixtureName of fixtureNames) {
  const source = JSON.parse(await readFile(new URL(fixtureName, fixtureDirectory), "utf8"));
  for (const [width, height] of sizes) {
    test(`incremental LPT matches growth.js: ${path.basename(fixtureName)} ${width}:${height}`, () => {
      const expected = currentLayout(clone(source), width, height, { solver: "lpt" });
      const actual = incrementalLayout(clone(source), width, height, { solver: "lpt" });
      assertClose(actual.nodes, expected.nodes, "nodes");
      assert.equal(actual.links.length, expected.links.length, "links: element count");
      for (let i = 0; i < actual.links.length; i += 1) {
        assert.equal(actual.links[i].id, expected.links[i].id, `links[${i}].id`);
        assertSegmentsClose(actual.links[i].segments, expected.links[i].segments, `links[${i}].segments`);
      }
    });
  }
}

test("incremental SA preserves the solver call and random sequence", async () => {
  const source = JSON.parse(
    await readFile(new URL("small_high.json", fixtureDirectory), "utf8"),
  );
  const expected = currentLayout(clone(source), 1000, 250, {
    solver: "sa",
    random: seededRandom(42),
  });
  const actual = incrementalLayout(clone(source), 1000, 250, {
    solver: "sa",
    random: seededRandom(42),
  });
  assertClose(actual.nodes, expected.nodes, "SA nodes");
});

/**
 * 配置エンジン単体の差分テスト。fixture より多様な木で、葉（ダミーに相当）の寸法を何度も変え、
 * 差分で組み直した結果が、木全体を van der Ploeg で配置し直した結果と一致することを確かめる。
 * 各反復のアスペクト比（列成長の停止判定に使う値）と、最後に書き戻す全ノードの座標を比べる。
 */
test("incremental placement matches full van der Ploeg relayout on random trees", () => {
  const stratify = d3.stratify().id((d) => d.name).parentId((d) => d.parent);
  const build = (rows) => {
    const root = stratify(structuredClone(rows).map((d) => ({ ...d, x: d.width / 2, y: d.height / 2 })));
    return vanderPloegLayout(root);
  };
  const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  const random = seededRandom(31);
  for (const generate of [randomTree, deepTree]) {
    for (const size of [paperSize, skewedSize, spikySize]) {
      for (let i = 0; i < 30; i += 1) {
        const label = `${generate.name}/${size.name}/${i}`;
        const rows = generate(2 + Math.floor(random() * 150), random, size);
        const full = build(rows);
        const partial = build(rows);
        const placement = incrementalPlacement(partial);
        const fullLeaves = full.leaves();
        const partialLeaves = partial.leaves();
        for (let u = 0; u < 20; u += 1) {
          const k = Math.floor(random() * fullLeaves.length);
          const { width, height } = size(random);
          for (const leaf of [fullLeaves[k], partialLeaves[k]]) Object.assign(leaf.data, { width, height });
          vanderPloegLayout(full);
          placement.update(partialLeaves[k]);
          assert.ok(close(calcAspectRatio(full), placement.aspectRatio()), `${label} update ${u}: aspect ratio`);
        }
        placement.finish();
        const positions = new Map(partial.descendants().map((n) => [n.id, n.data]));
        for (const node of full.descendants()) {
          const d = positions.get(node.id);
          assert.ok(close(node.data.x, d.x) && close(node.data.y, d.y), `${label}: ${node.id}`);
        }
      }
    }
  }
});
