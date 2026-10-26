import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
export function provenance() {
  const git = (...args) => {
    try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
    catch { return null; }
  };
  const status = git("status", "--porcelain");
  const hash = (file) => createHash("sha256").update(readFileSync(new URL(file, import.meta.url))).digest("hex");
  return {
    commit: git("rev-parse", "HEAD"), dirty: status === null ? null : status.length > 0,
    node: process.version, platform: process.platform, arch: process.arch,
    generatorSha256: hash("./generateTree.js"), lockSha256: hash("../../package-lock.json"),
  };
}
