// §4.1 面積効率(TNA/DA)実験。docs/paper/draft.pdf §4.1 の設定を再現する。
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
import { tnaDa } from "./lib/metrics.js";
import { ASPECT_RATIOS, resolvePreset } from "./lib/methods.js";
import { runExperiment } from "./lib/runner.js";

const preset = resolvePreset();
const TRIALS = Number(process.env.TRIALS ?? 1000); // 論文§4の設定。動作確認は TRIALS=5 のように環境変数で下げる
const NUM_NODES = Number(process.env.NUM_NODES ?? 1000);
const ALPHA = 0.25;
const NODE_WIDTH = 1000;
// 木データも保存するか（後追い分析用。サイズが大きいので SAVE_TRIALS=0 で無効化できる）
const SAVE_TRIALS = process.env.SAVE_TRIALS !== "0";

runExperiment({
  prefix: `area_efficiency${preset.suffix}`,
  methods: preset.methods,
  varianceLevels: preset.levels,
  cases: ASPECT_RATIOS.map(([label, width, height]) => ({ label, width, height, numNodes: NUM_NODES })),
  trials: TRIALS,
  alpha: ALPHA,
  nodeWidth: NODE_WIDTH,
  measure: ({ fn, data, width, height }) => tnaDa(fn(data, width, height).nodes, width, height),
  recordKey: "scores",
  summaryTitle: "TNA/DA 平均値",
  caseHeader: "aspect",
  saveTrials: SAVE_TRIALS,
  config: { trials: TRIALS, numNodes: NUM_NODES, alpha: ALPHA, nodeWidth: NODE_WIDTH, methodSet: preset.name, varianceLevels: preset.levels },
  note: preset.note,
});
