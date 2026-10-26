/** 必須の参照を検査する。任意資料と生成物は docs-references.json で明示する。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
export function checkDocuments(directory = root) {
  const policy = JSON.parse(fs.readFileSync(path.join(directory, "scripts/docs-references.json"), "utf8"));
  const files = [];
  const ignored = new Set(["node_modules", "results", ".git", "dist", "local-references", "__pycache__"]);
  const walk = (dir) => {
    if (!fs.existsSync(path.join(directory, dir))) return;
    for (const e of fs.readdirSync(path.join(directory, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory() && !ignored.has(e.name)) walk(rel);
      else if (e.isFile() && e.name.endsWith(".md")) files.push(rel);
    }
  };
  for (const e of fs.readdirSync(directory, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith(".md")) files.push(e.name);
  }
  for (const dir of ["docs", "src", "experiments", ".claude/skills", ".agents/skills"]) walk(dir);
  const broken = [], historical = [];
  let checked = 0, optional = 0;
  for (const file of files) {
    const text = fs.readFileSync(path.join(directory, file), "utf8");
    const refs = [
      ...Array.from(text.matchAll(/\]\(([^)\s]+)\)/g), (m) => ({ raw: m[1], kind: "link" })),
      ...Array.from(text.matchAll(/`((?:src|docs|experiments|scripts|test|data|local-references)\/[A-Za-z0-9_./-]+)`/g), (m) => ({ raw: m[1], kind: "root" })),
      ...Array.from(text.matchAll(/^@([A-Za-z0-9_./-]+\.md)\s*$/gm), (m) => ({ raw: m[1], kind: "link" })),
    ];
    for (const { raw, kind } of refs) {
      if (/^[a-z]+:/i.test(raw) || raw.startsWith("#") || raw.includes("...") || raw.includes("{")) continue;
      const target = raw.split("#")[0];
      if (!target) continue;
      checked++;
      const abs = path.resolve(directory, kind === "link" ? path.dirname(file) : ".", target);
      const rel = path.relative(directory, abs).split(path.sep).join("/");
      if (policy.optionalFiles.includes(rel) || policy.optionalDirectories.some((p) => rel === p || rel.startsWith(p + "/"))) {
        optional++;
        continue;
      }
      if (fs.existsSync(abs)) continue;
      const ref = { file, raw };
      if (policy.historical.some((h) => h.file === file && h.raw === raw)) historical.push(ref);
      else broken.push(ref);
    }
  }
  return { checked, optional, historical, broken };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = checkDocuments();
  console.log(`検査: ${result.checked} / 任意資料・生成物: ${result.optional} / 歴史的参照: ${result.historical.length} / 新規エラー: ${result.broken.length}`);
  for (const { file, raw } of result.broken) console.error(`  ${file} -> ${raw}`);
  process.exitCode = result.broken.length ? 1 : 0;
}
