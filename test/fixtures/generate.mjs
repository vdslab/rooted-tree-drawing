/**
 * ゴールデンテスト用の固定入力を生成する一回限りのスクリプト。
 *
 * generateScaleFreeTree() は Math.random() を使うため実行ごとに違う木になる。
 * リファクタ前後で同じ入力を使えるよう、生成結果をJSONとして固定する。
 * 既にJSONがある場合は上書きしない(--force で強制上書き)。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateScaleFreeTree } from "../../experiments/lib/generateTree.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes("--force");

// [ファイル名, ノード数, 高さ下限, 高さ上限]
const SPECS = [
  ["small_low.json", 30, 900, 1100],
  ["small_high.json", 30, 10, 2000],
  ["medium_medium.json", 150, 500, 1500],
  ["medium_extreme.json", 150, 10, 10000],
];

for (const [name, n, hMin, hMax] of SPECS) {
  const file = path.join(here, name);
  if (fs.existsSync(file) && !force) {
    console.log(`skip (既存): ${name}`);
    continue;
  }
  const tree = generateScaleFreeTree(n, 0.25, 1000, hMin, hMax);
  fs.writeFileSync(file, JSON.stringify(tree, null, 1));
  console.log(`生成: ${name} (${tree.length}ノード)`);
}

// 手書きのエッジケース(生成器では作れない構造)
const handmade = {
  "edge_single_leaf.json": [
    { name: "Eve", parent: "", width: 1000, height: 400 },
    { name: "A", parent: "Eve", width: 1000, height: 1000 },
  ],
  "edge_one_dummy.json": [
    { name: "Eve", parent: "", width: 1000, height: 400 },
    { name: "L1", parent: "Eve", width: 1000, height: 1000 },
    { name: "L2", parent: "Eve", width: 1000, height: 1000 },
    { name: "L3", parent: "Eve", width: 1000, height: 1000 },
  ],
  // 1枚だけ極端に高い葉(支配的ノード判定を通る)
  "edge_dominant_leaf.json": [
    { name: "Eve", parent: "", width: 1000, height: 400 },
    { name: "P", parent: "Eve", width: 1000, height: 400 },
    { name: "big", parent: "P", width: 1000, height: 20000 },
    { name: "s1", parent: "P", width: 1000, height: 300 },
    { name: "s2", parent: "P", width: 1000, height: 300 },
    { name: "s3", parent: "P", width: 1000, height: 300 },
  ],
  // 兄弟のいない葉と、葉群を両方持つ木
  "edge_mixed.json": [
    { name: "Eve", parent: "", width: 1000, height: 400 },
    { name: "P1", parent: "Eve", width: 1000, height: 400 },
    { name: "S1", parent: "P1", width: 1000, height: 1000 },
    { name: "P2", parent: "Eve", width: 1000, height: 400 },
    { name: "T1", parent: "P2", width: 1000, height: 1500 },
    { name: "T2", parent: "P2", width: 1000, height: 700 },
    { name: "T3", parent: "P2", width: 1000, height: 300 },
  ],
};
for (const [name, tree] of Object.entries(handmade)) {
  const file = path.join(here, name);
  if (fs.existsSync(file) && !force) { console.log(`skip (既存): ${name}`); continue; }
  fs.writeFileSync(file, JSON.stringify(tree, null, 1));
  console.log(`生成: ${name} (${tree.length}ノード, 手書き)`);
}
