/**
 * 実験の共通ランナー。
 *
 * 面積効率(§4.1)と計算時間(§4.2)は、測る量と内側の軸が違うだけで
 * ループ構造・集計・保存はまったく同じだった。その共通部分がここ。
 *
 *   分散レベル × ケース(アスペクト比 or ノード数) × 試行 × 手法
 *
 * 各実験スクリプトは「何を測るか(measure)」と「ケースの並べ方」を渡すだけでよい。
 *
 * 出力ファイルの形式は旧スクリプトから変えていない:
 *   <prefix>_<runId>.json         { config, note, elapsedSec, results }
 *   <prefix>_<runId>_trials.json  { config, trials }   ← saveTrials 時のみ
 * results[分散レベル][ケースラベル][手法名] = 値の配列
 *
 * 再現性: 環境変数 SEED を与えると Math.random をシード付き乱数に差し替える。
 * 木の生成用と手法(SA)用に**独立したストリーム**を張るので、レイアウト実装を変えても
 * 木の集合は SEED だけで決まり、実装の前後比較が同じ木の上で行える。
 * SEED 未指定なら従来どおり非決定的（過去の結果と同じ挙動）。
 */
import fs from "fs";
import { generateScaleFreeTree } from "./generateTree.js";

const RESULTS_DIR = "./experiments/results";

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** mulberry32。SEED 指定時に Math.random を置き換える */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {Object} spec
 * @param {string} spec.prefix - 出力ファイル名の接頭辞（例 "area_efficiency"）
 * @param {Object} spec.methods - { 手法名: (data, width, height) => layoutの戻り値 }
 * @param {Object} spec.varianceLevels - { レベル名: [高さ下限, 高さ上限] }
 * @param {Array} spec.cases - [{ label, width, height, numNodes }]
 * @param {number} spec.trials
 * @param {number} spec.alpha
 * @param {number} spec.nodeWidth
 * @param {Function} spec.measure - ({ fn, data, width, height }) => number（測定値）
 * @param {string} spec.recordKey - 試行ログ内での値のキー（"scores" | "times"）
 * @param {string} spec.summaryTitle - サマリー表の見出し
 * @param {string} spec.caseHeader - サマリー表のケース列の見出し（"aspect" | "nodeCount"）
 * @param {Object} spec.config - 出力JSONに残す設定
 * @param {string} [spec.note] - 出力JSONに残す補足
 * @param {boolean} [spec.saveTrials=true] - 試行ごとの木データも別ファイルに保存するか
 */
export function runExperiment(spec) {
  const {
    prefix, methods, varianceLevels, cases, trials, alpha, nodeWidth,
    measure, recordKey, summaryTitle, caseHeader, config, note, saveTrials = true,
  } = spec;

  const seed = process.env.SEED ? Number(process.env.SEED) : null;
  // 木の生成と手法（SA）は独立した乱数ストリームを使う。
  //
  // 以前は両方が同じ Math.random を共有していたため、レイアウト実装を変えて SA が引く
  // 乱数の本数が変わると、それ以降の試行の木までずれていた。つまり SEED を固定しても
  // コード変更をまたいだ前後比較では木が揃わず、手法を触っていない既存手法の平均まで
  // 動いていた（実測で最大0.0014）。ストリームを分ければ、木は SEED と生成順だけで
  // 決まるので、実装を変えても同じ木の集合で比較できる。
  let treeRandom = null;
  let methodRandom = null;
  if (seed !== null) {
    treeRandom = seededRandom(seed);
    methodRandom = seededRandom(seed ^ 0x9e3779b9);
    Math.random = methodRandom;
    console.log(`SEED=${seed} で実行（木と手法で独立した乱数ストリームを使用）`);
  }

  /** 木を生成する間だけ木用ストリームに切り替える */
  const makeTree = (numNodes, hMin, hMax) => {
    if (seed === null) return generateScaleFreeTree(numNodes, alpha, nodeWidth, hMin, hMax);
    Math.random = treeRandom;
    try {
      return generateScaleFreeTree(numNodes, alpha, nodeWidth, hMin, hMax);
    } finally {
      Math.random = methodRandom;
    }
  };

  const methodNames = Object.keys(methods);
  console.log(`TRIALS=${trials}, methods=${methodNames.join(",")}`);
  const startedAt = Date.now();

  // results[level][caseLabel][method] = 値の配列
  const results = {};
  // trials[level][caseLabel] = [{ trial, data, <recordKey> }]
  // 同じ木に対する全手法の値を1レコードにまとめる（後追い分析用）
  const trialLog = {};

  for (const [level, [hMin, hMax]] of Object.entries(varianceLevels)) {
    results[level] = {};
    trialLog[level] = {};
    for (const c of cases) {
      results[level][c.label] = Object.fromEntries(methodNames.map((m) => [m, []]));
      trialLog[level][c.label] = [];

      for (let trial = 0; trial < trials; trial++) {
        const data = makeTree(c.numNodes, hMin, hMax);
        const record = {};

        for (const [methodName, fn] of Object.entries(methods)) {
          try {
            const value = measure({
              fn,
              data: JSON.parse(JSON.stringify(data)),
              width: c.width,
              height: c.height,
            });
            results[level][c.label][methodName].push(value);
            record[methodName] = value;
          } catch (error) {
            console.error(`  [${level}/${c.label}/${methodName}] trial ${trial} error: ${error.message}`);
          }
        }
        trialLog[level][c.label].push({ trial, data, [recordKey]: record });
      }
      console.log(`done: variance=${level} ${caseHeader}=${c.label}`);
    }
  }

  const elapsedSec = (Date.now() - startedAt) / 1000;

  console.log(`\n=== ${summaryTitle} ===`);
  for (const [level, byCase] of Object.entries(results)) {
    console.log(`\n-- variance: ${level} --`);
    console.log([caseHeader, ...methodNames].join("\t"));
    for (const [label, byMethod] of Object.entries(byCase)) {
      console.log([label, ...methodNames.map((m) => mean(byMethod[m]).toFixed(4))].join("\t"));
    }
  }

  console.log(`\n所要時間: ${elapsedSec.toFixed(1)}秒 (TRIALS=${trials})`);
  if (trials < 1000) {
    // 短縮実行のとき（TRIALS を下げて動作確認しているとき）だけ、本番の所要時間の目安を出す
    console.log(`参考: 論文設定の TRIALS=1000 なら ≈ ${((elapsedSec / trials) * 1000).toFixed(0)}秒`);
  }

  const runId = Date.now();
  const fullConfig = seed === null ? config : { ...config, seed };
  // results/ は .gitignore 済みでクローン直後には存在しないので、書く前に作る
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = `${RESULTS_DIR}/${prefix}_${runId}.json`;
  fs.writeFileSync(outPath, JSON.stringify({ config: fullConfig, note, elapsedSec, results }, null, 2));
  console.log(`結果を ${outPath} に保存しました。`);

  if (saveTrials) {
    const trialsOutPath = `${RESULTS_DIR}/${prefix}_${runId}_trials.json`;
    fs.writeFileSync(trialsOutPath, JSON.stringify({ config: fullConfig, trials: trialLog }, null, 2));
    console.log(`試行ごとの木データ+測定値を ${trialsOutPath} に保存しました(後追い分析用)。`);
  }

  return { results, elapsedSec, runId };
}
