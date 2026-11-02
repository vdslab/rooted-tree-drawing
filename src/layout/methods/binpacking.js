/**
 * グローバル高さ予算 H_t の二分探索によるレイアウト(binpacking手法)。
 *
 * 全体の高さ H_t を二分探索で決めると、各ダミーが使える高さ予算
 * B_d = H_t - y_top(d) が確定する。あとは各ダミーが独立に「容量 B_d に収まる
 * 最小列数」を求めればよい(= ビンパッキング)。列成長型が解く
 * 「列数固定で makespan 最小化」の双対問題にあたる。
 *
 * 容量ベースのソルバーは src/packing/ にある(lpt / ffd / bfd)。
 */
import * as d3 from "d3";
import { calcAspectRatio } from "../core/tree.js";
import { vanderPloegLayout } from "../core/vanderPloeg.js";
import { setDummyMargin, to1D } from "../core/dummy.js";
import { runLayout } from "../core/pipeline.js";
import { resolvePackingStrategy } from "../../packing/index.js";

export function collectDummyNodes(root) {
  return root.descendants()
    .filter(node => node.data?.leaves)
    .map(node => ({
      node: node,
      yTop: node.data.y - node.data.height / 2
    }));
}

export function computeGlobalBottom(root) {
  return d3.max(root.descendants(), node => node.data.y + node.data.height / 2);
}

export function computeHMin(root) {
  const dummies = collectDummyNodes(root);
  if (dummies.length === 0) return 0;

  return Math.min(...dummies.map(({ yTop }) => yTop));
}

export function computeColumnsForBudget(leaves1D, Bd, packStrategy) {
  if (leaves1D.length === 0) {
    return { partition: [], columns: 0 };
  }

  // Step 1: 支配的ノードを検出(h_i > B_d)し、幅拡張
  //
  // B_d <= 0(深いダミーで y_top が H_t を超えた場合)は面積保存で拡張先の
  // 高さが 0 以下になり計算できないため、その場合は原寸のまま専用列に置く
  // (これ以上は縮められない=最大列数に達した状態として扱う)。
  const dominants = [];
  const normals = [];

  for (const node of leaves1D) {
    const nodeHeight = node.height || 0;
    if (nodeHeight > Bd) {
      if (Bd > 0) {
        const k = nodeHeight / Bd;
        dominants.push({
          ...node,
          width: node.width * k,
          height: Bd,
          isWidened: true,
        });
      } else {
        dominants.push({ ...node });
      }
    } else {
      normals.push(node);
    }
  }

  // 全ノードが支配的 -> 各ノード1列ずつ
  if (normals.length === 0) {
    return {
      partition: dominants.map(n => [n]),
      columns: dominants.length,
    };
  }

  // Step 2: 残りノードの列分配を packStrategy に委譲
  const { columns: normalColumns } = packStrategy(normals, Bd);

  // Step 3: 支配的ノード列 + 通常ノード列を結合
  const partition = [
    ...dominants.map(n => [n]),
    ...normalColumns,
  ];

  return {
    partition: partition,
    columns: dominants.length + normalColumns.length,
  };
}

export function applyGlobalBudget(root, Ht, xMargin, yMargin, innerYMargin, packStrategy) {
  const dummies = collectDummyNodes(root);

  for (const { node, yTop } of dummies) {
    const Bd = Ht - yTop;
    const leaves1D = to1D(node.data.leaves);
    const result = computeColumnsForBudget(leaves1D, Bd, packStrategy);

    node.data.leaves = result.partition;
    node.data.columns = result.columns;
  }

  // ダミーノードサイズを再計算
  setDummyMargin(root, xMargin, yMargin, innerYMargin);
}

export function globalFoldingLayout(root, at, xMargin, yMargin, innerYMargin, packStrategy) {
  // Step 1: 初期状態(1列)のアスペクト比を確認
  let a = calcAspectRatio(root);
  if (a >= at) return root;  // 既に目標以上なら何もしない

  // ダミーノードがない場合は終了
  const dummies = collectDummyNodes(root);
  if (dummies.length === 0) return root;

  // 各ダミーの元のleavesデータ(1列状態)を保存
  // 二分探索の各イテレーションで復元して、累積的な幅拡張を防止する
  const originalLeavesMap = new Map();
  for (const { node } of dummies) {
    const leaves1D = to1D(node.data.leaves);
    originalLeavesMap.set(node.id, leaves1D.map(n => ({
      ...n,
      _origWidth: n.width,
      _origHeight: n.height,
    })));
  }

  // Step 2: 探索範囲の設定(絶対 y 座標)
  const globalBottom = computeGlobalBottom(root);  // 1列時の底辺 = H_max
  const H_min_abs = computeHMin(root);              // 最低限必要な底辺

  let H_max = globalBottom;
  let H_min = H_min_abs;

  // Step 3: 二分探索
  const MAX_ITER = 30;
  const TOLERANCE = 0.05;  // アスペクト比の相対誤差 5% 以内で収束
  // 「最良の H_mid」の値そのものを覚えておく(bestH)。bestRoot = root のように
  // root への参照だけを保存すると、vanderPloegLayout が同じ data オブジェクトを
  // 直接書き換えるため、後続の反復で中身が上書きされてしまう
  // (JSオブジェクトは参照渡しであり、スナップショットにならない)。
  let bestH = H_max;  // 初期状態(全ダミー1列 = H_t が H_max のときと等価)
  let bestAspectDiff = Math.abs(a - at);

  for (let i = 0; i < MAX_ITER; i++) {
    const H_mid = (H_max + H_min) / 2;

    // 各ダミーのleavesを元データから復元してからapplyGlobalBudgetを適用
    // これにより、前のイテレーションの幅拡張が累積しない
    for (const { node } of collectDummyNodes(root)) {
      const origLeaves = originalLeavesMap.get(node.id);
      if (origLeaves) {
        const restored = origLeaves.map(n => ({
          ...n,
          width: n._origWidth,
          height: n._origHeight,
          isWidened: false,
        }));
        node.data.leaves = [restored];
        node.data.columns = 1;
      }
    }

    applyGlobalBudget(root, H_mid, xMargin, yMargin, innerYMargin, packStrategy);
    root = vanderPloegLayout(root);
    a = calcAspectRatio(root);
    const aspectDiff = Math.abs(a - at);

    if (aspectDiff < bestAspectDiff) {
      bestAspectDiff = aspectDiff;
      bestH = H_mid;
    }

    if (aspectDiff / at < TOLERANCE) break;

    if (a < at) {
      // まだ縦長 -> H_t を下げる -> 列を増やす -> 幅を広げる
      H_max = H_mid;
    } else {
      // 横長すぎ -> H_t を上げる -> 列を減らす -> 幅を狭める
      H_min = H_mid;
    }
  }

  // 最良だった H_mid(bestH)で、元データから改めてクリーンに計算し直す。
  // ループ内の root は反復のたびに同じオブジェクトを書き換え続けているため、
  // 「ベストな反復のときの状態」をそのまま持ち越すことはできない。
  for (const { node } of collectDummyNodes(root)) {
    const origLeaves = originalLeavesMap.get(node.id);
    if (origLeaves) {
      const restored = origLeaves.map(n => ({
        ...n,
        width: n._origWidth,
        height: n._origHeight,
        isWidened: false,
      }));
      node.data.leaves = [restored];
      node.data.columns = 1;
    }
  }
  applyGlobalBudget(root, bestH, xMargin, yMargin, innerYMargin, packStrategy);
  root = vanderPloegLayout(root);

  return root;
}

/**
 * @param {Array} data
 * @param {number} width
 * @param {number} height
 * @param {Object} [options]
 * @param {"lpt"|"ffd"|"bfd"|Function} [options.packing="lpt"] - 容量ベースの配置戦略
 * @param {number} [options.xMargin=300]
 * @param {number} [options.yMargin=200]
 * @param {number} [options.innerYMargin] - 既定は yMargin / 2
 */
export function layout(data, width, height, options = {}) {
  const packStrategy = resolvePackingStrategy(options.packing ?? "lpt");
  const xMargin = options.xMargin ?? 300;
  const yMargin = options.yMargin ?? 200;
  const innerYMargin = options.innerYMargin ?? yMargin / 2;

  return runLayout(data, width, height, {
    xMargin,
    yMargin,
    innerYMargin,
    skipInnerMargin: true,
    fold: (root, at, xM, yM, iyM) =>
      globalFoldingLayout(root, at, xM, yM, iyM, packStrategy),
  });
}
