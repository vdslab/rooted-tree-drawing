import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runExperiment } from "../experiments/lib/runner.js";
import { seededRandom } from "../experiments/lib/random.js";
import { generateScaleFreeTree } from "../experiments/lib/generateTree.js";
import { METHODS } from "../experiments/lib/methods.js";

function spec(outputDir, extra = {}) {
  return { prefix: "test", outputDir, methods: { ok: () => 1 }, varianceLevels: { low: [10, 20] },
    cases: [{ label: "1:4", width: 100, height: 400, numNodes: 8 }], trials: 3, alpha: 0.25,
    nodeWidth: 10, measure: ({ fn, data, width, height }) => fn(data, width, height), recordKey: "scores",
    summaryTitle: "test", caseHeader: "aspect", config: {}, ...extra };
}

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "layout-runner-"));
  const seed = process.env.SEED;
  process.env.SEED = "1";
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    if (seed === undefined) delete process.env.SEED; else process.env.SEED = seed;
  });
  return directory;
}

test("missing/non-finite measurements keep trial positions and suppress incomplete means", (t) => {
  const directory = setup(t);
  const before = Math.random;
  let count = 0;
  const result = runExperiment(spec(directory, { methods: {
    ok: () => 7,
    intermittent: () => { if (++count === 2) throw new Error("deliberate"); return 4; },
    invalid: () => NaN,
  } }));
  assert.equal(Math.random, before);
  assert.deepEqual(result.results.low["1:4"].intermittent, [4, null, 4]);
  assert.deepEqual(result.summary.low["1:4"].intermittent, { success: 2, failed: 1, mean: null });
  assert.equal(result.summary.low["1:4"].ok.mean, 7);
  assert.equal(result.failures.length, 4);
  assert.ok(result.failures.some((f) => f.id === "low/1:4/1" && f.method === "intermittent"));
  const saved = JSON.parse(fs.readFileSync(result.outPath));
  assert.equal(saved.provenance.node, process.version);
  assert.equal(saved.config.seed, 1);
  assert.deepEqual(saved.config.cases, spec(directory).cases);
  assert.equal(saved.provenance.generatorSha256.length, 64);
  assert.equal(fs.readdirSync(directory).length, 1);
  assert.equal("trials" in saved, false);
});

test("saving trees is opt-in and preserves IDs and seeds", (t) => {
  const directory = setup(t);
  const result = runExperiment(spec(directory, { saveTrials: true }));
  const saved = JSON.parse(fs.readFileSync(path.join(directory, `test_${result.runId}_trials.json`)));
  assert.equal(saved.trials.low["1:4"].length, 3);
  assert.equal(saved.trials.low["1:4"][1].id, "low/1:4/1");
  assert.equal(saved.trials.low["1:4"][0].data.length, 8);
});

test("tree cohort is independent of method random consumption and global RNG is unchanged", (t) => {
  const directory = setup(t);
  const trees = [], trees2 = [];
  const before = Math.random;
  for (const [capture, draws] of [[trees, 1], [trees2, 20]]) {
    runExperiment(spec(directory, { methods: { sample: (data, w, h, { random }) => {
      capture.push(data); for (let i = 0; i < draws; i++) random(); return 1;
    } } }));
  }
  assert.deepEqual(trees, trees2);
  assert.equal(Math.random, before);
});

test("SA uses the supplied RNG even if global Math.random throws", () => {
  const data = generateScaleFreeTree(30, 0.25, 100, 10, 100, seededRandom(1));
  const before = Math.random;
  Math.random = () => { throw new Error("global RNG used"); };
  try {
    const first = METHODS["sa-paper"](structuredClone(data), 2000, 500, { random: seededRandom(123) });
    const second = METHODS["sa-paper"](structuredClone(data), 2000, 500, { random: seededRandom(123) });
    assert.deepEqual(first, second);
  } finally { Math.random = before; }
});

test("invalid seeds and trial counts fail before writing results", (t) => {
  const directory = setup(t);
  process.env.SEED = "nope";
  assert.throws(() => runExperiment(spec(directory)), /SEED/);
  process.env.SEED = "1";
  assert.throws(() => runExperiment(spec(directory, { trials: 0 })), /TRIALS/);
  assert.deepEqual(fs.readdirSync(directory), []);
});
