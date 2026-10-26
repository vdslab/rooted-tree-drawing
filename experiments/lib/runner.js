/**
 * バッチ実験: 分散 × ケース × 試行 × 手法。
 * 木用と手法用の乱数列は従来の SEED と生成順を維持する。
 * 欠測は同じ試行位置の null と failures に記録し、不完全な平均は出さない。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateScaleFreeTree } from "./generateTree.js";
import { seededRandom } from "./random.js";
import { provenance } from "./provenance.js";

const RESULTS_DIR = fileURLToPath(new URL("../results/", import.meta.url));

export function runExperiment(spec) {
  const {
    prefix, methods, varianceLevels, cases, trials, alpha, nodeWidth,
    measure, recordKey, summaryTitle, caseHeader, config, note, saveTrials = false,
    outputDir = RESULTS_DIR,
  } = spec;
  const seed = process.env.SEED === undefined ? null : Number(process.env.SEED);
  if (seed !== null && (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)) {
    throw new Error("SEED must be an integer between 0 and 4294967295");
  }
  if (!Number.isInteger(trials) || trials < 1) throw new Error("TRIALS must be a positive integer");
  if (!Number.isFinite(alpha) || !Number.isFinite(nodeWidth) || nodeWidth <= 0) throw new Error("Invalid tree parameters");
  if (!cases.length || !Object.keys(methods).length || !Object.keys(varianceLevels).length) throw new Error("Empty experiment");
  if (new Set(cases.map((c) => c.label)).size !== cases.length) throw new Error("Duplicate case labels");
  for (const c of cases) {
    if (!Number.isInteger(c.numNodes) || c.numNodes < 1 || ![c.width, c.height].every((v) => Number.isFinite(v) && v > 0)) {
      throw new Error(`Invalid case: ${c.label}`);
    }
  }
  for (const range of Object.values(varianceLevels)) {
    if (!range.every((v) => Number.isFinite(v) && v > 0) || range.length !== 2 || range[0] > range[1]) throw new Error("Invalid variance range");
  }
  const treeRandom = seed === null ? Math.random : seededRandom(seed);
  const methodRandom = seed === null ? Math.random : seededRandom(seed ^ 0x9e3779b9);
  const methodNames = Object.keys(methods);
  const environment = provenance();
  console.log(`TRIALS=${trials}, SEED=${seed ?? "random"}, methods=${methodNames.join(",")}`);
  const startedAt = Date.now();
  const results = {}, summary = {}, failures = [];
  // SAVE_TRIALS=0 では木への参照を蓄積しない。
  const trialLog = saveTrials ? {} : null;

  for (const [level, [hMin, hMax]] of Object.entries(varianceLevels)) {
    results[level] = {};
    summary[level] = {};
    if (trialLog) trialLog[level] = {};
    for (const c of cases) {
      const byMethod = results[level][c.label] = Object.fromEntries(methodNames.map((m) => [m, []]));
      if (trialLog) trialLog[level][c.label] = [];
      for (let trial = 0; trial < trials; trial++) {
        const data = generateScaleFreeTree(c.numNodes, alpha, nodeWidth, hMin, hMax, treeRandom);
        const id = `${level}/${c.label}/${trial}`;
        const record = {};
        for (const [method, fn] of Object.entries(methods)) {
          let value = null;
          try {
            value = measure({
              fn: (d, w, h) => fn(d, w, h, { random: methodRandom }),
              data: structuredClone(data), width: c.width, height: c.height,
            });
            if (!Number.isFinite(value)) throw new Error(`Non-finite measurement: ${value}`);
          } catch (error) {
            value = null;
            failures.push({ id, level, case: c.label, trial, method, error: String(error.message ?? error) });
            console.error(`  [${id}/${method}] ${error.message ?? error}`);
          }
          byMethod[method].push(value);
          record[method] = value;
        }
        if (trialLog) trialLog[level][c.label].push({ id, trial, data, [recordKey]: record });
      }
      summary[level][c.label] = Object.fromEntries(methodNames.map((method) => {
        const values = byMethod[method];
        const success = values.filter(Number.isFinite).length;
        return [method, { success, failed: trials - success, mean: success === trials ? values.reduce((s, v) => s + v, 0) / trials : null }];
      }));
      console.log(`done: variance=${level} ${caseHeader}=${c.label}`);
    }
  }

  console.log(`\n=== ${summaryTitle} (success/total) ===`);
  for (const [level, byCase] of Object.entries(summary)) {
    for (const [label, byMethod] of Object.entries(byCase)) {
      console.log(`${level}/${label}: ` + methodNames.map((m) => {
        const s = byMethod[m];
        return `${m}=${s.mean === null ? "INCOMPLETE" : s.mean.toFixed(4)} (${s.success}/${trials})`;
      }).join("  "));
    }
  }
  const elapsedSec = (Date.now() - startedAt) / 1000;
  const runId = Date.now();
  const fullConfig = {
    ...config, seed, trials, alpha, nodeWidth, cases, varianceLevels, methods: methodNames, saveTrials,
    rngScheme: "mulberry32-independent-streams-v1",
  };
  const payload = { schemaVersion: 2, provenance: environment, config: fullConfig, note, elapsedSec, results, summary, failures };
  fs.mkdirSync(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${prefix}_${runId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  if (trialLog) {
    fs.writeFileSync(path.join(outputDir, `${prefix}_${runId}_trials.json`), JSON.stringify({ config: fullConfig, provenance: environment, trials: trialLog }, null, 2));
  }
  console.log(`結果を ${outPath} に保存 (${failures.length} failures)`);
  return { ...payload, runId, outPath };
}
