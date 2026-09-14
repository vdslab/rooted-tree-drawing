#!/usr/bin/env node
/**
 * 実験ドライバー — レイアウト手法の比較実験を回し、結果を後から掘り返すためのCLI。
 *
 *   node .claude/skills/run-experiments/driver.mjs <command> [options]
 *
 * 設計の要点:
 *   - 木データを保存しない。試行ごとに決定的なシードを記録し、必要になったら再生成する。
 *     （既存の experiments/lib/runner.js は木を丸ごと保存していて1ファイル300MBになる）
 *   - 手法の乱数もシードするので、`render` / `verify` は実行時とビット単位で同じ結果になる。
 *   - 手法の定義は experiments/lib/methods.js の METHODS をそのまま使う（論文条件 300/200）。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const RUNS_DIR = path.join(ROOT, "experiments/results/runs");

const { METHODS, VARIANCE_LEVELS, ASPECT_RATIOS } = await import(
  path.join(ROOT, "experiments/lib/methods.js")
);
const { generateScaleFreeTree } = await import(path.join(ROOT, "experiments/lib/generateTree.js"));
const { tnaDa } = await import(path.join(ROOT, "experiments/lib/metrics.js"));

// ---------- 決定的な乱数 ----------

/** 文字列 → uint32（FNV-1a）。試行ごと・手法ごとのシードを導出する */
function hashSeed(...parts) {
  let h = 0x811c9dc5;
  for (const c of parts.join("|")) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Math.random を mulberry32 に差し替える。戻り値を呼ぶと元に戻る */
function seedRandom(seed) {
  const real = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => { Math.random = real; };
}

// ---------- 引数 ----------

function parseArgs(argv) {
  const opts = {};
  const pos = [];
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      opts[k] = v === undefined ? true : v;
    } else pos.push(a);
  }
  return { opts, pos };
}

const list = (v, fallback) => (v === undefined ? fallback : String(v).split(",").map((s) => s.trim()));

// ---------- 実行 ----------

function makeTree(cfg, level, aspect, trial) {
  const [hMin, hMax] = VARIANCE_LEVELS[level];
  const treeSeed = hashSeed(cfg.seed, level, aspect, trial);
  const restore = seedRandom(treeSeed);
  try {
    return { tree: generateScaleFreeTree(cfg.nodes, cfg.alpha, cfg.nodeWidth, hMin, hMax), treeSeed };
  } finally { restore(); }
}

function runMethod(name, tree, w, h, metric, treeSeed) {
  const fn = METHODS[name];
  if (!fn) throw new Error(`Unknown method: ${name}. Available: ${Object.keys(METHODS).join(", ")}`);
  const input = JSON.parse(JSON.stringify(tree));
  // SA は Math.random を使う。試行ごと・手法ごとに決まるシードを与えることで、
  // 後から render / verify したときに実行時とビット単位で同じ結果を再現できる。
  const restore = seedRandom(hashSeed(treeSeed, name));
  try {
    if (metric === "time") {
      const t0 = performance.now();
      fn(input, w, h);
      return (performance.now() - t0) / 1000;
    }
    return tnaDa(fn(input, w, h).nodes, w, h);
  } finally { restore(); }
}

function cmdRun(opts) {
  const cfg = {
    metric: opts.metric ?? "area",
    methods: list(opts.methods, Object.keys(METHODS)),
    aspects: list(opts.aspects, ASPECT_RATIOS.map(([l]) => l)),
    variance: list(opts.variance, ["low", "medium", "high"]),
    trials: Number(opts.trials ?? 10),
    nodes: Number(opts.nodes ?? 300),
    alpha: Number(opts.alpha ?? 0.25),
    nodeWidth: 1000,
    seed: Number(opts.seed ?? 1),
  };
  for (const m of cfg.methods) if (!METHODS[m]) throw new Error(`Unknown method: ${m}. Available: ${Object.keys(METHODS).join(", ")}`);
  for (const l of cfg.variance) if (!VARIANCE_LEVELS[l]) throw new Error(`Unknown variance: ${l}. Available: ${Object.keys(VARIANCE_LEVELS).join(", ")}`);
  const aspectMap = Object.fromEntries(ASPECT_RATIOS.map(([l, w, h]) => [l, [w, h]]));
  for (const a of cfg.aspects) if (!aspectMap[a]) throw new Error(`Unknown aspect: ${a}. Available: ${Object.keys(aspectMap).join(", ")}`);

  const name = opts.name ?? `${cfg.metric}_${Date.now()}`;
  const rows = [];
  const started = Date.now();
  console.log(`metric=${cfg.metric} methods=${cfg.methods.join(",")} trials=${cfg.trials} |V|=${cfg.nodes} seed=${cfg.seed}`);

  for (const level of cfg.variance) {
    for (const aspect of cfg.aspects) {
      const [w, h] = aspectMap[aspect];
      for (let trial = 0; trial < cfg.trials; trial++) {
        const { tree, treeSeed } = makeTree(cfg, level, aspect, trial);
        const scores = {};
        for (const m of cfg.methods) {
          try { scores[m] = runMethod(m, tree, w, h, cfg.metric, treeSeed); }
          catch (e) { console.error(`  [${level}/${aspect}/${trial}/${m}] ${e.message}`); }
        }
        rows.push({ id: `${level}/${aspect}/${trial}`, level, aspect, trial, treeSeed, width: w, height: h, scores });
      }
      console.log(`  done ${level} ${aspect}`);
    }
  }

  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const out = path.join(RUNS_DIR, `${name}.json`);
  fs.writeFileSync(out, JSON.stringify({ createdAt: new Date().toISOString(), elapsedSec: (Date.now() - started) / 1000, config: cfg, rows }, null, 1));
  console.log(`\n${rows.length}試行を ${path.relative(ROOT, out)} に保存（木は保存せずシードから再生成する）`);
  cmdSummary({ _run: name });
}

// ---------- 読み出し ----------

function loadRun(nameOrPath) {
  if (!nameOrPath) {
    const runs = fs.existsSync(RUNS_DIR) ? fs.readdirSync(RUNS_DIR).filter((f) => f.endsWith(".json")) : [];
    if (!runs.length) throw new Error("実行結果がない。まず run を実行すること");
    nameOrPath = runs.map((f) => [fs.statSync(path.join(RUNS_DIR, f)).mtimeMs, f]).sort((a, b) => b[0] - a[0])[0][1];
  }
  const p = fs.existsSync(nameOrPath) ? nameOrPath : path.join(RUNS_DIR, nameOrPath.endsWith(".json") ? nameOrPath : `${nameOrPath}.json`);
  if (!fs.existsSync(p)) throw new Error(`見つからない: ${p}`);
  return { ...JSON.parse(fs.readFileSync(p, "utf8")), _path: p, _name: path.basename(p, ".json") };
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const fmt = (v, metric) => (metric === "time" ? `${(v * 1000).toFixed(1)}ms` : v.toFixed(4));

function cmdList() {
  if (!fs.existsSync(RUNS_DIR)) return console.log("実行結果なし");
  const runs = fs.readdirSync(RUNS_DIR).filter((f) => f.endsWith(".json"))
    .map((f) => loadRun(f)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  for (const r of runs) {
    console.log(`${r._name.padEnd(28)} ${r.config.metric.padEnd(5)} ${String(r.rows.length).padStart(4)}試行  |V|=${r.config.nodes}  seed=${r.config.seed}  ${r.createdAt.slice(0, 16)}`);
    console.log(`   手法: ${r.config.methods.join(", ")}`);
  }
}

function cmdSummary(opts) {
  const run = loadRun(opts._run ?? opts.run);
  const { metric, methods } = run.config;
  const better = metric === "time" ? (a, b) => a < b : (a, b) => a > b;
  console.log(`\n=== ${run._name} (${metric}) ===`);
  const groups = {};
  for (const r of run.rows) (groups[`${r.level}/${r.aspect}`] ??= []).push(r);
  console.log(["条件".padEnd(14), ...methods.map((m) => m.padStart(12))].join(""));
  for (const [key, rows] of Object.entries(groups)) {
    const cells = methods.map((m) => fmt(mean(rows.map((r) => r.scores[m])), metric).padStart(12));
    const best = methods.reduce((b, m) => (better(mean(rows.map((r) => r.scores[m])), mean(rows.map((r) => r.scores[b]))) ? m : b));
    console.log([key.padEnd(14), ...cells].join("") + `   ← ${best}`);
  }
  const wins = Object.fromEntries(methods.map((m) => [m, 0]));
  for (const r of run.rows) wins[methods.reduce((b, m) => (better(r.scores[m], r.scores[b]) ? m : b))]++;
  console.log(`\n試行ごとの勝ち数: ${methods.map((m) => `${m}=${wins[m]}`).join("  ")}`);
}

/** 特筆すべき試行を拾う */
function cmdTop(opts, pos) {
  const run = loadRun(pos[0]);
  const { metric, methods } = run.config;
  const n = Number(opts.n ?? 5);
  const by = opts.by ?? "gap";
  const better = metric === "time" ? (a, b) => a < b : (a, b) => a > b;
  const baseline = opts.baseline ?? "existing";
  const target = opts.method;

  let rows = run.rows.map((r) => {
    const vals = methods.map((m) => r.scores[m]);
    const best = methods.reduce((b, m) => (better(r.scores[m], r.scores[b]) ? m : b));
    const worst = methods.reduce((b, m) => (better(r.scores[b], r.scores[m]) ? m : b));
    return { ...r, best, worst, spread: Math.max(...vals) - Math.min(...vals) };
  });

  let label;
  if (by === "gap") {
    label = "手法間の差が大きい試行";
    rows.sort((a, b) => b.spread - a.spread);
  } else if (by === "baseline-wins") {
    label = `${baseline} が全手法に勝った試行（差の大きい順）`;
    rows = rows.filter((r) => r.best === baseline)
      .map((r) => ({ ...r, margin: Math.abs(r.scores[baseline] - Math.max(...methods.filter((m) => m !== baseline).map((m) => (metric === "time" ? -r.scores[m] : r.scores[m])) ) * (metric === "time" ? -1 : 1)) }))
      .sort((a, b) => b.margin - a.margin);
  } else if (by === "loss") {
    if (!target) throw new Error("--by=loss には --method=<手法名> が要る");
    label = `${target} が最良手法に負けている試行（差の大きい順）`;
    rows = rows.map((r) => ({ ...r, margin: Math.abs(r.scores[r.best] - r.scores[target]) }))
      .filter((r) => r.best !== target).sort((a, b) => b.margin - a.margin);
  } else if (by === "win") {
    if (!target) throw new Error("--by=win には --method=<手法名> が要る");
    label = `${target} が最良の試行（2位との差が大きい順）`;
    rows = rows.filter((r) => r.best === target).map((r) => {
      const others = methods.filter((m) => m !== target).map((m) => r.scores[m]);
      const second = metric === "time" ? Math.min(...others) : Math.max(...others);
      return { ...r, margin: Math.abs(second - r.scores[target]) };
    }).sort((a, b) => b.margin - a.margin);
  } else throw new Error(`Unknown --by=${by}. gap | baseline-wins | loss | win`);

  console.log(`\n=== ${label} （${run._name}, ${metric}） ===`);
  if (!rows.length) return console.log("  該当なし");
  for (const r of rows.slice(0, n)) {
    const scores = methods.map((m) => `${m}=${fmt(r.scores[m], metric)}`).join("  ");
    const extra = r.margin !== undefined ? ` margin=${fmt(r.margin, metric)}` : ` spread=${fmt(r.spread, metric)}`;
    console.log(`  ${r.id.padEnd(18)} best=${r.best.padEnd(11)}${extra}`);
    console.log(`      ${scores}`);
  }
  console.log(`\n  詳細: driver.mjs show ${run._name} ${rows[0].id}`);
}

function treeStats(tree) {
  const byParent = {};
  for (const n of tree) (byParent[n.parent] ??= []).push(n);
  const depth = (name, d = 0) => Math.max(d, ...(byParent[name] ?? []).map((c) => depth(c.name, d + 1)));
  const hs = tree.map((n) => n.height).sort((a, b) => a - b);
  const children = Object.values(byParent).map((c) => c.length);
  return {
    nodes: tree.length,
    leaves: tree.filter((n) => !byParent[n.name]).length,
    depth: depth("Eve"),
    heightMin: hs[0], heightMed: hs[Math.floor(hs.length / 2)], heightMax: hs[hs.length - 1],
    heightRatio: hs[hs.length - 1] / Math.max(hs[0], 1e-9),
    maxChildren: Math.max(...children),
  };
}

function findRow(run, id) {
  const row = run.rows.find((r) => r.id === id);
  if (!row) throw new Error(`試行が見つからない: ${id}（例: ${run.rows[0].id}）`);
  return row;
}

function rebuildTree(run, row) {
  const [hMin, hMax] = VARIANCE_LEVELS[row.level];
  const restore = seedRandom(row.treeSeed);
  try { return generateScaleFreeTree(run.config.nodes, run.config.alpha, run.config.nodeWidth, hMin, hMax); }
  finally { restore(); }
}

function cmdShow(opts, pos) {
  const run = loadRun(pos[0]);
  const row = findRow(run, pos[1]);
  const tree = rebuildTree(run, row);
  const s = treeStats(tree);
  const { metric, methods } = run.config;
  const better = metric === "time" ? (a, b) => a < b : (a, b) => a > b;
  console.log(`\n=== ${row.id} （${run._name}） ===`);
  console.log(`条件      分散=${row.level}  アスペクト比=${row.aspect} (${row.width}x${row.height})  treeSeed=${row.treeSeed}`);
  console.log(`木        ${s.nodes}ノード（葉${s.leaves}）  深さ${s.depth}  最大子数${s.maxChildren}`);
  console.log(`高さ      min=${s.heightMin.toFixed(0)} med=${s.heightMed.toFixed(0)} max=${s.heightMax.toFixed(0)}  (最大/最小=${s.heightRatio.toFixed(1)}倍)`);
  console.log(`\nスコア（良い順）`);
  for (const m of [...methods].sort((a, b) => (better(row.scores[a], row.scores[b]) ? -1 : 1)))
    console.log(`  ${m.padEnd(12)} ${fmt(row.scores[m], metric)}`);
  console.log(`\n木を出す:   driver.mjs tree ${run._name} ${row.id} --out=tree.json`);
  console.log(`図にする:   driver.mjs render ${run._name} ${row.id} --method=${methods[0]}`);
}

function cmdTree(opts, pos) {
  const run = loadRun(pos[0]);
  const row = findRow(run, pos[1]);
  const tree = rebuildTree(run, row);
  const out = opts.out ?? `tree_${row.id.replace(/[/:]/g, "_")}.json`;
  fs.writeFileSync(out, JSON.stringify(tree, null, 1));
  console.log(`${tree.length}ノードを ${out} に出力（treeSeed=${row.treeSeed} から再生成）`);
}

function toSvg(result, w, h, caption, leafIds) {
  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + 28}" width="${w}" height="${h + 28}">`,
    `<rect width="${w}" height="${h + 28}" fill="#ffffff"/>`,
    `<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#d0d0d0" stroke-dasharray="4 4"/>`,
  ];
  for (const l of result.links ?? []) {
    const [[x1, y1], [x2, y2]] = l.segments;
    parts.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#9aa0a6" stroke-width="0.6"/>`);
  }
  for (const n of result.nodes) {
    // isLeaf を返さない手法（existing）があるので、葉かどうかは木データ側から判定する
    const isLeaf = leafIds ? leafIds.has(n.id) : n.isLeaf;
    parts.push(`<rect x="${(n.x - n.width / 2).toFixed(2)}" y="${(n.y - n.height / 2).toFixed(2)}" width="${Math.max(n.width, 0.3).toFixed(2)}" height="${Math.max(n.height, 0.3).toFixed(2)}" fill="${isLeaf ? "#4c8bf5" : "#f2a33c"}" fill-opacity="0.75" stroke="#333" stroke-width="0.3"/>`);
  }
  parts.push(`<text x="6" y="${h + 19}" font-family="monospace" font-size="12" fill="#222">${esc(caption)}</text></svg>`);
  return parts.join("\n");
}

function cmdRender(opts, pos) {
  const run = loadRun(pos[0]);
  const row = findRow(run, pos[1]);
  const method = opts.method ?? run.config.methods[0];
  if (!METHODS[method]) throw new Error(`Unknown method: ${method}`);
  const tree = rebuildTree(run, row);
  const restore = seedRandom(hashSeed(row.treeSeed, method));
  let result;
  try { result = METHODS[method](JSON.parse(JSON.stringify(tree)), row.width, row.height); } finally { restore(); }
  const score = tnaDa(result.nodes, row.width, row.height);
  const out = opts.out ?? `render_${row.id.replace(/[/:]/g, "_")}_${method}.svg`;
  const caption = `${run._name}  ${row.id}  ${method}  TNA/DA=${score.toFixed(4)}  (${row.width}x${row.height}, ${tree.length} nodes)`;
  const parents = new Set(tree.map((n) => n.parent));
  const leafIds = new Set(tree.filter((n) => !parents.has(n.name)).map((n) => n.name));
  fs.writeFileSync(out, toSvg(result, row.width, row.height, caption, leafIds));
  console.log(`${out} に出力  TNA/DA=${score.toFixed(4)}  ノード${result.nodes.length}  リンク${(result.links ?? []).length}`);
  if (run.config.metric === "area") {
    const recorded = row.scores[method];
    if (recorded !== undefined) console.log(`  記録値 ${recorded.toFixed(4)} と ${Math.abs(recorded - score) < 1e-12 ? "一致" : `不一致（差 ${(score - recorded).toExponential(2)}）`}`);
  }
}

/** 同じ試行を複数手法でレイアウトし、1枚のSVGに縦に並べる */
function cmdCompare(opts, pos) {
  const run = loadRun(pos[0]);
  const row = findRow(run, pos[1]);
  const methods = list(opts.methods, run.config.methods);
  const tree = rebuildTree(run, row);
  const parents = new Set(tree.map((n) => n.parent));
  const leafIds = new Set(tree.filter((n) => !parents.has(n.name)).map((n) => n.name));
  const PAD = 34;
  const panels = [];
  for (const m of methods) {
    if (!METHODS[m]) throw new Error(`Unknown method: ${m}`);
    const restore = seedRandom(hashSeed(row.treeSeed, m));
    let result;
    try { result = METHODS[m](JSON.parse(JSON.stringify(tree)), row.width, row.height); } finally { restore(); }
    panels.push({ m, result, score: tnaDa(result.nodes, row.width, row.height) });
  }
  const best = panels.reduce((b, p) => (p.score > b.score ? p : b));
  // 縦長のキャンバスは横に並べ、横長は縦に積む（そうしないと全体が1画面に入らない）
  const dir = opts.layout ?? (row.width <= row.height ? "row" : "col");
  const W = row.width, H = row.height + PAD;
  const totalW = dir === "row" ? W * panels.length : W;
  const totalH = dir === "row" ? H : H * panels.length;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">`,
                 `<rect width="${totalW}" height="${totalH}" fill="#fff"/>`];
  panels.forEach((p, i) => {
    const inner = toSvg(p.result, row.width, row.height,
      `${p.m}  TNA/DA=${p.score.toFixed(4)}${p === best ? "  <- best" : `  (${(p.score / best.score * 100).toFixed(1)}% of best)`}`, leafIds);
    const dx = dir === "row" ? i * W : 0, dy = dir === "row" ? 0 : i * H;
    parts.push(`<g transform="translate(${dx} ${dy})">${inner.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`);
  });
  parts.push("</svg>");
  const out = opts.out ?? `compare_${row.id.replace(/[/:]/g, "_")}.svg`;
  fs.writeFileSync(out, parts.join("\n"));
  console.log(`${out} に出力（${panels.length}手法を${dir === "row" ? "横" : "縦"}に並べた。${totalW}x${totalH}）`);
  for (const p of [...panels].sort((a, b) => b.score - a.score))
    console.log(`  ${p.m.padEnd(12)} ${p.score.toFixed(4)}${p === best ? "  ← 最良" : ""}`);
}

/** 保存済みスコアを再計算して一致を確認する（再現性の検査） */
function cmdVerify(opts, pos) {
  const run = loadRun(pos[0]);
  if (run.config.metric !== "area") throw new Error("verify は metric=area の実行にだけ使える（時間は再現しない）");
  const n = Number(opts.n ?? 3);
  const targets = pos[1] ? [findRow(run, pos[1])] : run.rows.slice(0, n);
  let ok = 0, ng = 0;
  for (const row of targets) {
    const tree = rebuildTree(run, row);
    for (const m of run.config.methods) {
      const v = runMethod(m, tree, row.width, row.height, "area", row.treeSeed);
      const same = Math.abs(v - row.scores[m]) < 1e-12;
      if (same) ok++; else { ng++; console.log(`  ✗ ${row.id} ${m}: 記録 ${row.scores[m]} / 再計算 ${v}`); }
    }
  }
  console.log(`再現性: ${ok}件一致 / ${ng}件不一致（${targets.length}試行 × ${run.config.methods.length}手法）`);
  if (ng) process.exit(1);
}

// ---------- エントリ ----------

const HELP = `実験ドライバー

  run       実験を実行して保存
            --metric=area|time  --methods=a,b  --aspects=1:1,4:1  --variance=low,high
            --trials=N  --nodes=N  --seed=N  --name=ラベル
  list      保存済みの実行を一覧
  summary   [run]                条件ごとの平均と勝ち数
  top       [run] --by=gap|baseline-wins|loss|win [--method=M] [--baseline=M] [--n=5]
            特筆すべき試行を抽出
  show      [run] <試行ID>       木の統計と全手法のスコア
  tree      [run] <試行ID> [--out=t.json]        木データを再生成して出力
  render    [run] <試行ID> [--method=M] [--out=x.svg]  レイアウトをSVGにする
  compare   [run] <試行ID> [--methods=a,b] [--layout=row|col] [--out=x.svg]
            複数手法を1枚に並べて比較（既定は縦長キャンバスなら横並び）
  verify    [run] [試行ID] [--n=3]               保存値を再計算して一致を確認

  run を省略すると最新の実行を使う。手法名: ${Object.keys(METHODS).join(", ")}`;

const { opts, pos } = parseArgs(process.argv.slice(2));
const cmd = pos.shift();
try {
  switch (cmd) {
    case "run": cmdRun(opts); break;
    case "list": cmdList(); break;
    case "summary": cmdSummary({ run: pos[0] }); break;
    case "top": cmdTop(opts, pos); break;
    case "show": cmdShow(opts, pos); break;
    case "tree": cmdTree(opts, pos); break;
    case "render": cmdRender(opts, pos); break;
    case "compare": cmdCompare(opts, pos); break;
    case "verify": cmdVerify(opts, pos); break;
    default: console.log(HELP); process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(`エラー: ${e.message}`);
  process.exit(1);
}
