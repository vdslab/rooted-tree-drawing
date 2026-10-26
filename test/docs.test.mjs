import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkDocuments } from "../scripts/check-docs.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
test("checks pass with only shareable files, without local PDFs or generated results", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "layout-docs-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  for (const file of files) {
    const source = path.join(root, file);
    if (!fs.existsSync(source)) continue;
    fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    fs.copyFileSync(source, path.join(directory, file));
  }
  assert.equal(fs.existsSync(path.join(directory, "docs/paper/draft.pdf")), false);
  assert.equal(fs.existsSync(path.join(directory, "experiments/results")), false);
  assert.deepEqual(checkDocuments(directory).broken, []);
  // 歴史的リンクを含む文書でも、新しい誤参照は必ず検出する。
  const policy = JSON.parse(fs.readFileSync(path.join(directory, "scripts/docs-references.json")));
  fs.appendFileSync(path.join(directory, policy.historical[0].file), "\n[regression](./new-missing-file.md)\n");
  assert.ok(checkDocuments(directory).broken.some((b) => b.raw === "./new-missing-file.md"));
  // 新しいサービス入口・階層別指示も自動的に検査対象になる。
  fs.writeFileSync(path.join(directory, "GEMINI.md"), "[rules](missing-rules.md)");
  assert.ok(checkDocuments(directory).broken.some((b) => b.file === "GEMINI.md"));
});
