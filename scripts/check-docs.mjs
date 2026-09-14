/**
 * ドキュメント内のパス参照が実在するかを検査する。
 *
 *   npm run check:docs
 *
 * 対象は CLAUDE.md（階層別を含む）、README.md、docs/**\/*.md、スキルの SKILL.md。次の2種類を拾う:
 *   - markdown リンク  [表示](../src/foo.js)      … そのファイルからの相対パスとして解決
 *   - バッククォート    `src/foo.js`               … リポジトリルートからの相対パスとして解決
 *
 * ドキュメントは実装より先に腐る。「気づいたときに直す」では追いつかないので、
 * docs か CLAUDE.md を編集したら必ずこれを走らせる（CLAUDE.md の運用ルール参照）。
 *
 * 既知の未修正がある場合は KNOWN_BROKEN に理由つきで登録し、増えた分だけを検出する。
 */
import fs from "fs";
import path from "path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// docs/decisions/ の本文は「編集しない」運用のため、削除済みファイルへの参照が残る。
// 各ファイルのステータス行に 2026-09 追記として削除済みである旨を書いてある。
const KNOWN_BROKEN = [
  { file: "docs/decisions/2026-07-global-budget-design.md", reason: "本文は編集しない運用。参照先は2026-09に削除済み（ステータス行に注記あり）" },
  { file: "docs/decisions/2026-07-pluggable-packing.md", reason: "同上" },
  { file: "docs/decisions/2026-09-layout-core-extraction.md", reason: "同上。src/globalBudgetLayout.js は 2026-09 に src/uiLayout.js へ改名（ステータス行に注記あり）" },
];

function collect(file) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const refs = [];
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) refs.push({ raw: m[1], kind: "link" });
  for (const m of text.matchAll(/`((?:src|docs|experiments|scripts|test)\/[A-Za-z0-9_./-]+)`/g))
    refs.push({ raw: m[1], kind: "root" });
  return refs;
}

function listDocs() {
  // 階層別の CLAUDE.md（src/layout/, experiments/ など）とスキルの SKILL.md も対象にする
  const out = ["CLAUDE.md", "README.md"];
  for (const p of ["src/layout/CLAUDE.md", "experiments/CLAUDE.md"])
    if (fs.existsSync(path.join(root, p))) out.push(p);
  const skills = path.join(root, ".claude/skills");
  if (fs.existsSync(skills))
    for (const d of fs.readdirSync(skills))
      if (fs.existsSync(path.join(skills, d, "SKILL.md"))) out.push(`.claude/skills/${d}/SKILL.md`);
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith(".md")) out.push(rel);
    }
  };
  walk("docs");
  return out;
}

let checked = 0;
const broken = [];
for (const file of listDocs()) {
  for (const { raw, kind } of collect(file)) {
    if (/^https?:/.test(raw) || raw.startsWith("#") || raw.includes("...") || raw.includes("{")) continue;
    const target = raw.split("#")[0];
    if (!target) continue;
    checked++;
    const abs = kind === "link"
      ? path.resolve(root, path.dirname(file), target)
      : path.resolve(root, target);
    if (!fs.existsSync(abs)) broken.push({ file, raw });
  }
}

const known = broken.filter((b) => KNOWN_BROKEN.some((k) => k.file === b.file));
const fresh = broken.filter((b) => !KNOWN_BROKEN.some((k) => k.file === b.file));

console.log(`検査した参照: ${checked} / 壊れている: ${broken.length}（既知 ${known.length}、新規 ${fresh.length}）`);
if (fresh.length) {
  console.error("\n✗ 新しく壊れた参照:");
  for (const b of fresh) console.error(`   ${b.file} -> ${b.raw}`);
  console.error("\nドキュメントを直すか、意図的なら scripts/check-docs.mjs の KNOWN_BROKEN に理由つきで足すこと。");
  process.exit(1);
}
console.log("✓ 新しく壊れた参照はない");
if (known.length) {
  console.log(`  （既知 ${known.length}件: ${[...new Set(known.map((k) => k.file))].join(", ")}）`);
}
