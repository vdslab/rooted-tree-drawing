/**
 * ゴールデンテスト: 各レイアウト手法の出力を固定入力に対してハッシュ化し、
 * リファクタ前後で完全に一致することを確認する。
 *
 *   node test/golden.mjs            検証（差分があれば終了コード1）
 *   node test/golden.mjs --update   現在の出力を正解として記録
 *
 * SA は Math.random() を使うため、実行前にシード付き乱数へ差し替えて決定化する。
 * 手法の実装を移動・分割しても、ここのハッシュが変わらなければ挙動は同一。
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const update = process.argv.includes("--update");
const filter = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

// 各手法のエントリポイント。リファクタでファイルを移動したらここだけ書き換える。
const METHODS = {
  "existing":     { mod: "experiments/lib/existingPaper.js",           opts: {} },
  "sa":           { mod: "experiments/lib/saColumnPaper.js",           opts: {} },
  "growth-lpt":   { mod: "experiments/lib/growthLPTPaper.js",          opts: {} },
  "budget-lpt":   { mod: "experiments/lib/globalBudgetPaperMargin.js", opts: { packing: "lpt" } },
  "budget-ffd":   { mod: "experiments/lib/globalBudgetPaperMargin.js", opts: { packing: "ffd" } },
  "budget-bfd":   { mod: "experiments/lib/globalBudgetPaperMargin.js", opts: { packing: "bfd" } },
  // UI のマージン条件（100/100）。src/uiLayout.js は手法を切り替えられるので、
  // ゴールデンが切り替え状態に左右されないよう手法を直接呼ぶ。
  "ui-budget-lpt":{ mod: "src/layout/methods/binpacking.js", opts: { packing: "lpt", xMargin: 100, yMargin: 100 } },
  "ui-budget-bfd":{ mod: "src/layout/methods/binpacking.js", opts: { packing: "bfd", xMargin: 100, yMargin: 100 } },
};

const ASPECTS = [["1:2", 500, 1000], ["1:1", 500, 500], ["2:1", 1000, 500]];

const FIXTURES = fs.readdirSync(path.join(here, "fixtures"))
  .filter((f) => f.endsWith(".json")).sort();

/** 決定的な擬似乱数(mulberry32)。SA の Math.random を置き換える */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(6) : String(v));

/** 出力を順序に依存しない正規形にする */
function canonical(result) {
  const nodes = (result?.nodes ?? []).map((n) =>
    [n.id ?? n.name, num(n.x), num(n.y), num(n.width), num(n.height)].join(",")
  ).sort();
  const links = (result?.links ?? []).map((l) =>
    typeof l === "string" ? l : JSON.stringify(l, Object.keys(l).sort())
  ).sort();
  return { nodes, links };
}

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

/**
 * 重なっているノード対の数を数える。
 *
 * ハッシュは「出力が変わったか」しか見ないので、レイアウトが壊れて
 * ノードが重なっても、更新してしまえば気づけない。この件数を記録に混ぜることで
 * 重なりの増減がゴールデンの差分として出る。
 *
 * 接触（辺が一致）は重なりとみなさない。浮動小数の誤差を EPS で吸収する。
 */
const OVERLAP_EPS = 1e-6;
function countOverlaps(result) {
  const r = (result?.nodes ?? [])
    .filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y)
      && Number.isFinite(n.width) && Number.isFinite(n.height))
    .map((n) => ({
      l: n.x - n.width / 2, r: n.x + n.width / 2,
      t: n.y - n.height / 2, b: n.y + n.height / 2,
    }))
    .sort((a, b) => a.l - b.l);
  let count = 0;
  for (let i = 0; i < r.length; i++) {
    for (let j = i + 1; j < r.length; j++) {
      if (r[j].l >= r[i].r - OVERLAP_EPS) break;   // l でソート済み。以降は重ならない
      if (r[j].t < r[i].b - OVERLAP_EPS && r[i].t < r[j].b - OVERLAP_EPS) count++;
    }
  }
  return count;
}

async function run() {
  const out = {};
  const failures = [];
  const prev = fs.existsSync(path.join(here, "golden.json"))
    ? JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"))
    : null;

  for (const [method, { mod, opts }] of Object.entries(METHODS)) {
    if (filter && !method.includes(filter)) continue;
    const { layout } = await import(path.join(root, mod));
    for (const fixture of FIXTURES) {
      const data = JSON.parse(fs.readFileSync(path.join(here, "fixtures", fixture), "utf8"));
      for (const [label, w, h] of ASPECTS) {
        const key = `${method} | ${fixture} | ${label}`;
        const realRandom = Math.random;
        Math.random = seeded(12345);
        let record;
        try {
          const res = layout(JSON.parse(JSON.stringify(data)), w, h, opts);
          const c = canonical(res);
          record = {
            nodes: c.nodes.length, links: c.links.length,
            overlaps: countOverlaps(res),
            hash: sha(c.nodes.join("\n") + "|" + c.links.join("\n")),
          };
        } catch (e) {
          record = { error: `${e.name}: ${e.message}` };
        } finally {
          Math.random = realRandom;
        }
        out[key] = record;
        if (!update && prev) {
          const before = prev[key];
          if (!before) failures.push(`${key}: 新しいケース（golden に記録がない）`);
          else if (JSON.stringify(before) !== JSON.stringify(record))
            failures.push(`${key}:\n    期待 ${JSON.stringify(before)}\n    実際 ${JSON.stringify(record)}`);
        }
      }
    }
  }

  if (update) {
    fs.writeFileSync(path.join(here, "golden.json"), JSON.stringify(out, null, 1));
    const errs = Object.entries(out).filter(([, v]) => v.error);
    const ov = Object.entries(out).filter(([, v]) => v.overlaps > 0);
    console.log(`golden.json を更新: ${Object.keys(out).length} ケース（うちエラー ${errs.length} 件）`);
    console.log(`  重なりのあるケース: ${ov.length} 件 / 重なり対の合計: ${ov.reduce((s, [, v]) => s + v.overlaps, 0)}`);
    for (const [k, v] of ov) console.log(`  重なり ${v.overlaps} 対  ${k}`);
    for (const [k, v] of errs) console.log(`  ERROR ${k} -> ${v.error}`);
    return 0;
  }

  if (!prev) { console.error("golden.json がない。まず --update で記録すること"); return 1; }
  if (failures.length) {
    console.error(`✗ ${failures.length} / ${Object.keys(out).length} ケースが不一致\n`);
    for (const f of failures.slice(0, 20)) console.error("  " + f);
    if (failures.length > 20) console.error(`  ...他 ${failures.length - 20} 件`);
    return 1;
  }
  const ov = Object.entries(out).filter(([, v]) => v.overlaps > 0);
  console.log(`✓ ${Object.keys(out).length} ケースすべて一致`
    + (ov.length ? `（既知の重なり: ${ov.length} ケース / ${ov.reduce((s, [, v]) => s + v.overlaps, 0)} 対）` : "（重なり 0）"));
  return 0;
}

process.exit(await run());
