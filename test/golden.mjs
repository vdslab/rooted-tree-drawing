/**
 * ゴールデンテスト: 各レイアウト手法の出力を固定入力に対してハッシュ化し、
 * リファクタ前後で完全に一致することを確認する。
 *
 *   node test/golden.mjs            検証（差分があれば終了コード1）
 *   node test/golden.mjs --update   現在の出力を正解として記録
 *
 * SA にシード付き乱数関数を渡して決定化する。
 * 手法の実装を移動・分割しても、ここのハッシュが変わらなければ挙動は同一。
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const update = process.argv.includes("--update");
const filter = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

import { METHODS as DEFINITIONS, layoutMethod } from "../src/layout/registry.js";
import { seededRandom } from "../experiments/lib/random.js";
import { assertLayout, countOverlaps } from "./layout-invariants.mjs";

// 旧ゴールデンのキーは維持しつつ、登録された全手法を両マージンで検査する。
const METHODS = Object.fromEntries(Object.keys(DEFINITIONS).flatMap((id) => [
  [id === "growth-sa" ? "sa" : id, { id, preset: "paper" }],
  [`ui-${id}`, { id, preset: "ui" }],
]));
const ASPECTS = [["1:4", 500, 2000], ["1:2", 500, 1000], ["1:1", 500, 500], ["2:1", 1000, 500], ["4:1", 2000, 500]];

const FIXTURES = fs.readdirSync(path.join(here, "fixtures"))
  .filter((f) => f.endsWith(".json")).sort();

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

async function run() {
  const out = {};
  const failures = [];
  const prev = fs.existsSync(path.join(here, "golden.json"))
    ? JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"))
    : null;

  for (const [method, { id, preset }] of Object.entries(METHODS)) {
    if (filter && !method.includes(filter)) continue;
    for (const fixture of FIXTURES) {
      const data = JSON.parse(fs.readFileSync(path.join(here, "fixtures", fixture), "utf8"));
      for (const [label, w, h] of ASPECTS) {
        const key = `${method} | ${fixture} | ${label}`;
        let record;
        try {
          const res = layoutMethod(id, structuredClone(data), w, h, preset, { random: seededRandom(12345) });
          assertLayout(res, data);
          const c = canonical(res);
          record = {
            nodes: c.nodes.length, links: c.links.length,
            overlaps: countOverlaps(res),
            hash: sha(c.nodes.join("\n") + "|" + c.links.join("\n")),
          };
        } catch (e) {
          record = { error: `${e.name}: ${e.message}` };
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

  const invalid = Object.entries(out).filter(([, record]) => record.error);
  if (invalid.length || !Object.keys(out).length) {
    for (const [key, record] of invalid) console.error(`${key}: ${record.error}`);
    console.error("不変条件違反・例外・対象0件のため検証/更新を中止");
    return 1;
  }
  if (!filter && prev && !update) {
    for (const key of Object.keys(prev)) if (!(key in out)) failures.push(`${key}: ケースが削除されている`);
  }
  if (update) {
    if (filter) { console.error("--update と --only の併用は記録を欠落させるため禁止"); return 1; }
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
