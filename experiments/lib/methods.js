/**
 * 実験で比較する手法のレジストリ。
 *
 * 手法の実装は src/layout/registry.js、論文での旧名と比較条件はここが一次情報。各実験スクリプトが
 * 個別に手法を並べると food chain がずれるので、定義はこのファイルだけに置く。
 *
 * 全手法ともレジストリの paper プリセットで xMargin=300, yMargin=200 に揃える。マージンを揃えているのは evaluation ブランチ
 * 実装の条件に合わせるためで、UI 側（src/uiLayout.js, 100/100）とは別条件。
 *
 * 手法名の読み方:
 *   existing    Misue手法（列成長型のベースライン）
 *   sa-paper    列成長型 + 焼きなまし法（論文§3.4の提案手法）
 *   growth-lpt  列成長型 + LPT（SAをLPTに置き換えたもの。外側ループは sa-paper と同一）
 *   budget-*    グローバル高さ予算 H_t の二分探索 + 容量ベースの配置戦略（lpt/ffd/bfd）
 *
 * 注意: budget-lpt は旧スクリプトでは単に "lpt" という名前で記録されている。
 * results/ の古いJSONを読むときはこの対応に注意すること。
 */
import { METHODS as DEFINITIONS, layoutMethod } from "../../src/layout/registry.js";

// 論文の出力IDのみ互換のため残す。実装の登録は src/layout/registry.js に一元化。
export const paperId = (id) => id === "growth-sa" ? "sa-paper" : id;
export const METHODS = Object.fromEntries(Object.keys(DEFINITIONS).map((id) => [
  paperId(id), (data, width, height, options = {}) => layoutMethod(id, data, width, height, "paper", options),
]));

/**
 * 実験ごとの手法セット。
 *
 * paper5:  論文§4の5手法。budget系を "lpt"/"ffd"/"bfd" という旧名で記録するため、
 *          過去の results/*.json や plot スクリプトとの互換性が保てる。
 * growth5: growth-lpt を加えた5手法（explanation.md 4.5節）。列成長型{既存,SA,LPT}と
 *          高さ予算型{LPT,BFD}の対比になっている。
 */
export const METHOD_SETS = {
  paper5: {
    existing: METHODS.existing,
    "sa-paper": METHODS["sa-paper"],
    lpt: METHODS["budget-lpt"],
    ffd: METHODS["budget-ffd"],
    bfd: METHODS["budget-bfd"],
  },
  growth5: {
    existing: METHODS.existing,
    "sa-paper": METHODS["sa-paper"],
    "growth-lpt": METHODS["growth-lpt"],
    "budget-lpt": METHODS["budget-lpt"],
    "budget-bfd": METHODS["budget-bfd"],
  },
};

/**
 * 実験プリセット。手法セットと分散レベル、出力ファイル名の接尾辞をまとめたもの。
 *
 * 実験スクリプトは面積効率用・計算時間用の2本だけで、この preset を環境変数
 * METHOD_SET で切り替える（既定 paper5）:
 *
 *   node experiments/area_efficiency.js                    → area_efficiency_<runId>.json
 *   METHOD_SET=growth5 node experiments/area_efficiency.js → area_efficiency_growth_lpt_<runId>.json
 *
 * suffix は過去の結果ファイルと plot_*.py の --growth に合わせてある。
 */
export const PRESETS = {
  paper5: {
    methods: () => METHOD_SETS.paper5,
    levels: () => ({ low: VARIANCE_LEVELS.low, medium: VARIANCE_LEVELS.medium, high: VARIANCE_LEVELS.high }),
    suffix: "",
    note: "論文§4の5手法。全手法とも xMargin=300, yMargin=200 に統一(evaluationブランチ実装通り)。UI側の src/uiLayout.js は 100/100 で別条件。",
  },
  growth5: {
    methods: () => METHOD_SETS.growth5,
    levels: () => VARIANCE_LEVELS, // low / medium / high / extreme
    suffix: "_growth_lpt",
    note: "growth-lpt(列成長型+LPT)を加えた5手法の比較。extreme分散レベル(10-10000)で巨大ノードの出現を確認する。",
  },
};

/**
 * 分散レベルの絞り込み。環境変数 LEVELS（例 "low,medium,high"）で指定する。
 *
 * プリセットの並び順を保つ。runner は木用の乱数列をレベル順に消費するので、
 * 末尾のレベルを外す分には残りのレベルの入力集合が変わらないが、途中を抜くと変わる。
 */
export function selectLevels(levels, spec = process.env.LEVELS) {
  if (spec === undefined || spec === "") return levels;
  const names = String(spec).split(",").map((s) => s.trim()).filter(Boolean);
  if (!names.length) throw new Error("LEVELS が空");
  for (const name of names) {
    if (!Object.hasOwn(levels, name)) {
      throw new Error(`Unknown level: "${name}". Available: ${Object.keys(levels).join(", ")}`);
    }
  }
  return Object.fromEntries(Object.keys(levels).filter((n) => names.includes(n)).map((n) => [n, levels[n]]));
}

/** 環境変数 METHOD_SET からプリセットを取り出す */
export function resolvePreset(name = process.env.METHOD_SET ?? "paper5") {
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown METHOD_SET: "${name}". Available: ${Object.keys(PRESETS).join(", ")}`);
  }
  return { name, ...preset, methods: preset.methods(), levels: preset.levels() };
}

/** ノード高さの分散レベル [下限, 上限]。論文§4.1 の Low/Medium/High と、後から追加した extreme */
export const VARIANCE_LEVELS = {
  low: [900, 1100],
  medium: [500, 1500],
  high: [10, 2000],
  // 巨大ノード(支配的ノード)が確実に出現する条件。論文には無い追加実験用
  extreme: [10, 10000],
};

/** 論文§4.1 のアスペクト比 [ラベル, 幅, 高さ]（evaluationブランチ src/evaluation_variance.js と同じ） */
export const ASPECT_RATIOS = [
  ["1:4", 500, 2000],
  ["1:2", 500, 1000],
  ["1:1", 500, 500],
  ["2:1", 1000, 500],
  ["4:1", 2000, 500],
];
