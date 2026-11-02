// §4.1 面積効率(TNA/DA)実験。論文 §4.1 の設定を再現する。
//
// 手法セットは環境変数 METHOD_SET で切り替える（定義は experiments/lib/methods.js）:
//   paper5  (既定) existing / sa-paper / lpt / ffd / bfd、分散 low-medium-high
//                  → results/area_efficiency_<runId>.json
//   growth5        growth-lpt を加えた5手法、分散に extreme を追加
//                  → results/area_efficiency_growth_lpt_<runId>.json
//
//   node experiments/area_efficiency.js
//   METHOD_SET=growth5 node experiments/area_efficiency.js
//   TRIALS=5 SEED=1 node experiments/area_efficiency.js      （動作確認用の短縮）
//   LEVELS=low,medium,high METHOD_SET=growth5 node experiments/area_efficiency.js  （分散を3レベルに絞る）
import { tnaDa } from "./lib/metrics.js";
import { ASPECT_RATIOS, resolvePreset, selectLevels } from "./lib/methods.js";
import { runExperiment } from "./lib/runner.js";
import { MARGINS } from "../src/layout/registry.js";

const preset = resolvePreset();
// 分散レベルはプリセットの既定を LEVELS で絞れる（例 LEVELS=low,medium,high）
const LEVELS = selectLevels(preset.levels);
const TRIALS = Number(process.env.TRIALS ?? 1000); // 論文§4の設定。動作確認は TRIALS=5 のように環境変数で下げる
const NUM_NODES = Number(process.env.NUM_NODES ?? 1000);
const ALPHA = 0.25;
const NODE_WIDTH = 1000;
// 木データも保存するか（後追い分析用。サイズが大きいので SAVE_TRIALS=0 で無効化できる）
const SAVE_TRIALS = process.env.SAVE_TRIALS === "1";

const result = runExperiment({
  prefix: `area_efficiency${preset.suffix}`,
  methods: preset.methods,
  varianceLevels: LEVELS,
  cases: ASPECT_RATIOS.map(([label, width, height]) => ({ label, width, height, numNodes: NUM_NODES })),
  trials: TRIALS,
  alpha: ALPHA,
  nodeWidth: NODE_WIDTH,
  measure: ({ fn, data, width, height }) => tnaDa(fn(data, width, height).nodes, width, height),
  recordKey: "scores",
  summaryTitle: "TNA/DA 平均値",
  caseHeader: "aspect",
  saveTrials: SAVE_TRIALS,
  config: { margins: MARGINS.paper, trials: TRIALS, numNodes: NUM_NODES, alpha: ALPHA, nodeWidth: NODE_WIDTH, methodSet: preset.name, varianceLevels: LEVELS },
  note: preset.note,
});

// 欠測のある実験を正常終了として扱わない。診断結果は上で保存済み。
if (result.failures.length) process.exitCode = 1;
