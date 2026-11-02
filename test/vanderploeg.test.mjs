/**
 * van der Ploeg の線形時間実装（core/vanderPloeg.js）のテスト
 * （docs/decisions/2026-10-linear-vanderploeg.md）。
 *
 * 仕様をそのまま書いた素朴な実装（naiveLayout、O(n^2)）をオラクルにして座標を突き合わせる。
 * 一致の確認だけでは「両方とも同じように間違っている」ことを見逃すため、
 * 論文 §2 の美的基準 1〜3 と、兄弟の詰め方の規則も直接検査する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as d3 from "d3";
import { vanderPloegLayout } from "../src/layout/core/vanderPloeg.js";
import { seededRandom } from "../experiments/lib/random.js";
import { randomTree, deepTree, paperSize, skewedSize, spikySize } from "./tree-generators.mjs";

const EPS = 1e-6;
const stratify = d3.stratify().id((d) => d.name).parentId((d) => d.parent);

const row = (name, parent, width, height) => ({ name, parent, width, height });

/**
 * 手書きの小さな木。threads の左右両方向と、下端が揃う場合を必ず通るように選んでいる。
 */
export const HANDMADE = {
  single: [row("r", "", 4, 2)],
  chain: [row("r", "", 4, 2), row("a", "r", 2, 3), row("b", "a", 6, 1)],
  // 兄弟の高さがすべて違う。下端の高い方の輪郭だけが進む（論文 Algorithm 1 の17・19行）。
  mixedHeights: [
    row("r", "", 10, 2), row("a", "r", 3, 5), row("b", "r", 3, 1), row("c", "r", 3, 3),
  ],
  // 論文 Figure 5 と同じ形：左兄弟の方が背が高く、右の threads が張られる。
  figure5: [
    row("r", "", 6, 1),
    row("n1", "r", 2, 2), row("n2", "r", 2, 2), row("n3", "r", 3, 1),
    row("n4", "n3", 2, 3), row("n5", "n4", 2, 2), row("n6", "n3", 4, 1),
    row("n7", "r", 3, 1), row("n8", "n7", 2, 2), row("n9", "n7", 4, 1),
  ],
  // 右の部分木の方が背が高く、左の threads が張られる。
  taller_current: [
    row("r", "", 4, 1), row("a", "r", 3, 1),
    row("b", "r", 2, 1), row("b1", "b", 8, 2), row("b2", "b1", 1, 4),
  ],
  // 左右の部分木の下端がちょうど揃う（threads を張らない分岐）。
  equal_bottoms: [
    row("r", "", 4, 1), row("a", "r", 2, 2), row("a1", "a", 3, 2),
    row("b", "r", 2, 3), row("b1", "b", 3, 1),
  ],
  // 論文 Figure 7：小さい中間の兄弟が大きい兄弟に挟まれる（均等配置を入れると変わる形）。
  figure7: [
    row("r", "", 4, 1),
    row("c1", "r", 2, 1), row("c1a", "c1", 12, 3),
    row("c2", "r", 1, 1), row("c3", "r", 1, 1), row("c4", "r", 1, 1),
    row("c5", "r", 2, 2),
  ],
  // 右の部分木の根が広い子の中央に寄り、最初から左兄弟より右にある。論文の separate は
  // 右にしか動かさないので、b は左に詰められず原点に残る（隙間 7.5）。
  right_only_gap: [
    row("r", "", 4, 1), row("a", "r", 2, 1),
    row("b", "r", 1, 1), row("b1", "b", 10, 1), row("b2", "b", 10, 1),
  ],
  // 横長21:1のダミーに相当する極端な比率（2026-09-contour-skyline の再現条件に近い形）。
  extreme_aspect: [
    row("r", "", 100, 10), row("wide", "r", 16822, 787), row("w1", "wide", 50, 2000),
    row("tall", "r", 1706, 3000), row("small", "r", 40, 5000),
  ],
};

export function randomCases() {
  const cases = [];
  const kinds = [
    ["paper", randomTree, paperSize, 2014],
    ["skewed", randomTree, skewedSize, 2026],
    ["deep", deepTree, spikySize, 7],
  ];
  for (const [label, generate, size, seed] of kinds) {
    const random = seededRandom(seed);
    for (let i = 0; i < 150; i++) {
      const n = 2 + Math.floor(random() * 120);
      cases.push([`${label}-${i}`, generate(n, random, size)]);
    }
  }
  return cases;
}

/**
 * パイプラインと同じ初期状態（addMargin と同じく、各ノードの左端・上端が 0）から
 * レイアウト関数を呼び、名前 → 箱 の Map を返す。
 * layout は d3.hierarchy を受け取り、座標を data.x / data.y（中心）に入れた hierarchy を返す。
 */
export function runLayout(rows, layout) {
  const input = structuredClone(rows).map((d) => ({ ...d, x: d.width / 2, y: d.height / 2 }));
  const root = layout(stratify(input));
  const boxes = new Map();
  for (const node of root.descendants()) {
    const d = node.data;
    boxes.set(d.name, {
      left: d.x - d.width / 2, right: d.x + d.width / 2,
      top: d.y - d.height / 2, bottom: d.y + d.height / 2,
      parent: d.parent, children: (node.children ?? []).map((c) => c.data.name),
    });
  }
  return boxes;
}

/**
 * 仕様をそのまま書いた素朴な実装（O(n^2)）。差分テストのオラクル。
 *
 * 各部分木を「最初の子だけをたどった先の葉の左端 = 0」の座標系で作り、2番目以降の子の部分木を、
 * 左兄弟の全ノードと y が重なる組の「右端 - 左端」の最大値だけ右へ動かす（0 以下なら動かさない）。
 * 親は最初の子の左端と最後の子の右端の中央に置く。
 * 2026-10 に、置き換え前の core/tree.js（スカイライン版）と全ケースで一致することを確かめた。
 */
export function naiveLayout(root) {
  const place = (node, top) => {
    const d = node.data;
    const self = { node, left: 0, top, w: d.width, h: d.height };
    if (!node.children) return [self];
    let forest = [];
    let firstLeft = 0;
    let lastRight = 0;
    node.children.forEach((child, i) => {
      const boxes = place(child, top + d.height);
      let dist = 0;
      for (const c of boxes) {
        for (const l of forest) {
          if (Math.max(c.top, l.top) < Math.min(c.top + c.h, l.top + l.h)) {
            dist = Math.max(dist, l.left + l.w - c.left);
          }
        }
      }
      for (const b of boxes) b.left += dist;
      // boxes[0] は子の根
      if (i === 0) firstLeft = boxes[0].left;
      lastRight = boxes[0].left + boxes[0].w;
      forest = forest.concat(boxes);
    });
    self.left = (firstLeft + lastRight) / 2 - d.width / 2;
    return [self, ...forest];
  };
  for (const b of place(root, root.data.y - root.data.height / 2)) {
    b.node.data.x = b.left + b.w / 2;
    b.node.data.y = b.top + b.h / 2;
  }
  return root;
}

/**
 * 論文の美的基準 1〜3、y の決め方、兄弟の詰め方を検査する。
 * packing: 詰め方の規則を検査するか。均等配置（spacing）は中間の兄弟を左兄弟から離すので false にする。
 */
export function assertTidy(boxes, label, { packing = true } = {}) {
  const all = [...boxes.entries()];
  for (const [name, b] of all) {
    // y：子の上端は親の下端（論文 §2）。根の上端は 0。
    const expectedTop = b.parent ? boxes.get(b.parent).bottom : 0;
    assert.ok(Math.abs(b.top - expectedTop) < EPS, `${label}: ${name} の上端が親の下端と違う`);
    if (b.children.length === 0) continue;
    const kids = b.children.map((c) => boxes.get(c));
    // 基準3：親は「最初の子の左端」と「最後の子の右端」の中点（論文 positionRoot）。
    const mid = (kids[0].left + kids[kids.length - 1].right) / 2;
    assert.ok(Math.abs((b.left + b.right) / 2 - mid) < EPS, `${label}: ${name} が子の中央にない`);
    // 基準2：子は与えた順に左から並ぶ。
    for (let i = 1; i < kids.length; i++) {
      assert.ok(kids[i].left >= kids[i - 1].right - EPS, `${label}: ${b.children[i]} の順序`);
    }
  }
  // 基準1：重ならない。
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const [na, a] = all[i];
      const [nb, c] = all[j];
      const overlapX = Math.min(a.right, c.right) - Math.max(a.left, c.left);
      const overlapY = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      assert.ok(!(overlapX > EPS && overlapY > EPS), `${label}: ${na} と ${nb} が重なる`);
    }
  }
  if (!packing) return;
  // 詰め方：2番目以降の子の部分木は、左兄弟のどれかと y が重なる位置で接しているか、
  // 一度も動かされていない。論文の separate は右にしか動かさない（dist > 0 のときだけ）ので、
  // 最初から左兄弟より右にある部分木は原点に残り、隙間ができる。これは論文どおりの挙動。
  // 原点：各部分木は「最初の子だけをたどった先の葉の左端」が 0 から始まり、最初の子は動かない。
  const subtree = (name) => [name, ...boxes.get(name).children.flatMap(subtree)];
  const firstLeaf = (name) => {
    while (boxes.get(name).children.length) name = boxes.get(name).children[0];
    return boxes.get(name);
  };
  for (const [name, b] of all) {
    const origin = b.children.length ? firstLeaf(b.children[0]).left : 0;
    for (let i = 1; i < b.children.length; i++) {
      const left = b.children.slice(0, i).flatMap(subtree).map((n) => boxes.get(n));
      const cur = subtree(b.children[i]).map((n) => boxes.get(n));
      const touches = cur.some((c) => left.some((l) =>
        Math.abs(c.left - l.right) < EPS && Math.min(c.bottom, l.bottom) - Math.max(c.top, l.top) > EPS));
      const unmoved = Math.abs(firstLeaf(b.children[i]).left - origin) < EPS;
      assert.ok(touches || unmoved, `${label}: ${name} の子 ${b.children[i]} が接しても原点にもない`);
    }
  }
}

/** 2つのレイアウトの座標が一致することを確かめる。 */
export function assertSameLayout(expected, actual, label) {
  assert.equal(actual.size, expected.size, `${label}: ノード数`);
  for (const [name, e] of expected) {
    const a = actual.get(name);
    for (const key of ["left", "top"]) {
      const tol = EPS * Math.max(1, Math.abs(e[key]));
      assert.ok(Math.abs(a[key] - e[key]) <= tol, `${label}: ${name}.${key} 期待 ${e[key]} 実際 ${a[key]}`);
    }
  }
}

const allCases = () => [...Object.entries(HANDMADE), ...randomCases()];

test("オラクル（素朴な実装）は美的基準1〜3と詰め方の規則を満たす", () => {
  for (const [label, rows] of allCases()) assertTidy(runLayout(rows, naiveLayout), label);
});

test("線形時間実装はオラクルと同じ座標を返す", () => {
  for (const [label, rows] of allCases()) {
    assertSameLayout(runLayout(rows, naiveLayout), runLayout(rows, vanderPloegLayout), label);
  }
});

test("線形時間実装は美的基準1〜3と詰め方の規則を満たす", () => {
  for (const [label, rows] of allCases()) assertTidy(runLayout(rows, vanderPloegLayout), label);
});

test("座標系：最初の子だけをたどった先の葉の左端が 0（論文の prelim の原点と同じ）", () => {
  for (const [label, rows] of allCases()) {
    const boxes = runLayout(rows, vanderPloegLayout);
    let name = rows[0].name;
    while (boxes.get(name).children.length) name = boxes.get(name).children[0];
    assert.ok(Math.abs(boxes.get(name).left) < EPS, `${label}: 原点が ${boxes.get(name).left}`);
  }
});

test("均等配置（spacing）を有効にしても美的基準1〜3を満たす", () => {
  const layout = (root) => vanderPloegLayout(root, { spacing: true });
  for (const [label, rows] of allCases()) assertTidy(runLayout(rows, layout), label, { packing: false });
});

test("均等配置は論文 Figure 7 のとおり、挟まれた兄弟の間隔を揃える", () => {
  const boxes = runLayout(HANDMADE.figure7, (root) => vanderPloegLayout(root, { spacing: true }));
  const [c1, c2, c3, c4, c5] = ["c1", "c2", "c3", "c4", "c5"].map((n) => boxes.get(n));
  // c5 は c1 の子 c1a に押されるので、c1 と c5 の間の余白を c2〜c4 に均等に配る
  const gaps = [c2.left - c1.right, c3.left - c2.right, c4.left - c3.right, c5.left - c4.right];
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) < EPS && g > 0, `間隔 ${gaps}`);
});

test("幅・高さが数値でないノードは止まり続けずエラーになる", () => {
  for (const bad of [NaN, undefined, Infinity]) {
    const rows = [row("r", "", 4, 2), row("a", "r", 2, bad), row("b", "r", 2, 1)];
    assert.throws(() => runLayout(rows, vanderPloegLayout), /non-finite size/);
  }
});

test("処理する輪郭の組の総数は論文 §4 の上限 4n を超えない", () => {
  // 線形時間の根拠そのものを数える。実時間の比較は環境のノイズで不定期に落ちるので使わない。
  const large = [
    ["large-paper", randomTree(20000, seededRandom(1), paperSize)],
    ["large-deep", deepTree(5000, seededRandom(2), spikySize)],
  ];
  for (const [label, rows] of [...allCases(), ...large]) {
    const stats = { contourPairs: 0 };
    runLayout(rows, (root) => vanderPloegLayout(root, { stats }));
    assert.ok(stats.contourPairs <= 4 * rows.length, `${label}: ${stats.contourPairs} > 4 * ${rows.length}`);
  }
});
