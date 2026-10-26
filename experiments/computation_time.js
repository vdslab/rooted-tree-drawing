// §4.2 計算時間実験。docs/paper/draft.pdf §4.2 の設定を再現する
// (アスペクト比4:1固定、ノード数100/300/500/1000/3000)。
//
// 論文はこの実験のノード高さの分散レベルを明記していないため、プリセットの
// 全レベルで測定する。手法セットは環境変数 METHOD_SET で切り替える
// （定義は experiments/lib/methods.js）:
//   paper5  (既定) → results/computation_time_<runId>.json
//   growth5        → results/computation_time_growth_lpt_<runId>.json
//
//   node experiments/computation_time.js
//   METHOD_SET=growth5 node experiments/computation_time.js
//   TRIALS=5 NODE_COUNTS=100,300 node experiments/computation_time.js   （動作確認用の短縮）
import { resolvePreset, selectLevels } from "./lib/methods.js";
import { runExperiment } from "./lib/runner.js";
import { MARGINS } from "../src/layout/registry.js";

const preset = resolvePreset();
// 分散レベルはプリセットの既定を LEVELS で絞れる（例 LEVELS=low,medium,high）
const LEVELS = selectLevels(preset.levels);
const TRIALS = Number(process.env.TRIALS ?? 1000); // 論文§4の設定。動作確認は TRIALS=5 のように環境変数で下げる
const ALPHA = 0.25;
const NODE_WIDTH = 1000;
const NODE_COUNTS = (process.env.NODE_COUNTS ?? "100,300,500,1000,3000").split(",").map(Number);
const WIDTH = 2000; // アスペクト比4:1固定
const HEIGHT = 500;
// 時間計測では木データを保存しない（有効にすると数十MBになる）
const SAVE_TRIALS = process.env.SAVE_TRIALS === "1";

const result = runExperiment({
  prefix: `computation_time${preset.suffix}`,
  methods: preset.methods,
  varianceLevels: LEVELS,
  cases: NODE_COUNTS.map((n) => ({ label: String(n), width: WIDTH, height: HEIGHT, numNodes: n })),
  trials: TRIALS,
  alpha: ALPHA,
  nodeWidth: NODE_WIDTH,
  measure: ({ fn, data, width, height }) => {
    const start = performance.now();
    fn(data, width, height);
    return (performance.now() - start) / 1000;
  },
  recordKey: "times",
  summaryTitle: "平均計算時間(秒)",
  caseHeader: "nodeCount",
  saveTrials: SAVE_TRIALS,
  config: { margins: MARGINS.paper, trials: TRIALS, alpha: ALPHA, nodeWidth: NODE_WIDTH, nodeCounts: NODE_COUNTS, width: WIDTH, height: HEIGHT, methodSet: preset.name, varianceLevels: LEVELS },
  note: preset.note,
});

// 欠測のある実験を正常終了として扱わない。診断結果は上で保存済み。
if (result.failures.length) process.exitCode = 1;
