import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { layout as currentLayout } from "../src/layout/methods/growth.js";
import { layout as incrementalLayout } from "../src/layout/methods/growthIncremental.js";

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

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
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
