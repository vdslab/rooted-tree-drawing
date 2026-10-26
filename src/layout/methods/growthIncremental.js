/**
 * 列成長型レイアウトの差分更新プロトタイプ。
 *
 * growth.js と同じ列成長順・最終配置を保ちつつ、列を増やすたびに折り畳み木全体を
 * vanderploeg() へ渡す代わりに、変更したダミーノードから根までの部分木だけを再合成する。
 * 各キャッシュは部分木上端を y=0 とするローカル座標なので、祖先側の配置変更があっても
 * 無関係な部分木内部の配置を再計算する必要がない。
 *
 * 既存 growth.js は変更せず、比較可能な別手法として registry に登録する。
 */
import * as d3 from "d3";
import {
  leftMostSiblingNode,
  leftSkyline,
  rightMostSiblingNode,
  rightSkyline,
  separate,
} from "../core/tree.js";
import {
  addMargin,
  createDammuy,
  initDammyData,
  setDummyNodeSize,
} from "../core/dummy.js";
import { createLinks, format, undoDummyNode } from "../core/render.js";
import { saColumn } from "../solvers/saColumn.js";
import { lptColumn } from "../solvers/lptColumn.js";

export const solvers = { sa: saColumn, lpt: lptColumn };

function createStratify() {
  return d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);
}

function cloneAtLocalTop(data) {
  return { ...data, x: data.width / 2, y: data.height / 2 };
}

function buildState(node, parent = null, byName = new Map()) {
  const state = {
    data: node.data,
    parent,
    children: [],
    layout: null,
  };
  byName.set(node.data.name, state);
  state.children = (node.children ?? []).map((child) => buildState(child, state, byName));
  return state;
}

/**
 * state の部分木をローカル座標で再配置する。
 * 子のキャッシュは平行移動して利用し、子部分木内部には触れない。
 */
function rebuild(state, stratify) {
  const rootData = cloneAtLocalTop(state.data);
  if (state.children.length === 0) {
    state.layout = [rootData];
    return;
  }

  const originalParent = rootData.parent;
  const leftData = [{ ...rootData, parent: "" }];

  for (const child of state.children) {
    const childYOffset = state.data.height;
    const childData = child.layout.map((item) => ({
      ...item,
      y: item.y + childYOffset,
    }));
    const currentData = [{ ...rootData, parent: "" }, ...childData];
    const currentTree = stratify(currentData);
    const leftSiblings = stratify(leftData);
    const move = separate(
      leftSiblings.children ? rightSkyline(leftSiblings) : [],
      leftSkyline(currentTree),
    );
    for (let i = 1; i < currentData.length; i += 1) currentData[i].x += move;
    leftData.push(...currentData.slice(1));
  }

  const combined = stratify(leftData);
  const leftMost = leftMostSiblingNode(combined.children);
  const rightMost = rightMostSiblingNode(combined.children);
  leftData[0].x = (
    leftMost.data.x - leftMost.data.width / 2
    + rightMost.data.x + rightMost.data.width / 2
  ) / 2;
  leftData[0].parent = originalParent;
  state.layout = leftData;
}

function initializeCaches(state, stratify, stats) {
  for (const child of state.children) initializeCaches(child, stratify, stats);
  rebuild(state, stratify);
  stats.rebuiltSubtrees += 1;
}

function rebuildAncestors(state, stratify, stats) {
  let current = state;
  while (current) {
    rebuild(current, stratify);
    stats.rebuiltSubtrees += 1;
    current = current.parent;
  }
}

function bounds(layout) {
  return {
    left: d3.min(layout, (d) => d.x - d.width / 2),
    right: d3.max(layout, (d) => d.x + d.width / 2),
    top: d3.min(layout, (d) => d.y - d.height / 2),
    bottom: d3.max(layout, (d) => d.y + d.height / 2),
  };
}

function aspectRatio(layout) {
  const box = bounds(layout);
  return (box.right - box.left) / (box.bottom - box.top);
}

function bottomDummy(layout, byName) {
  let selected = null;
  let selectedBottom = -Infinity;
  for (const item of layout) {
    if (!item.leaves) continue;
    const bottom = item.y + item.height / 2;
    if (bottom > selectedBottom) {
      selected = byName.get(item.name);
      selectedBottom = bottom;
    }
  }
  return selected;
}

function finalize(layoutData, width, height, margins, stratify) {
  const { xMargin, yMargin, innerYMargin } = margins;
  let root = stratify(layoutData);
  const expanded = undoDummyNode(root, xMargin, yMargin, innerYMargin);
  const links = createLinks(root, xMargin, yMargin, innerYMargin);

  root = stratify(expanded);
  format(root, xMargin, yMargin, innerYMargin);

  const left = d3.min(root.descendants(), (node) => node.data.x - node.data.width / 2) - xMargin;
  const right = d3.max(root.descendants(), (node) => node.data.x + node.data.width / 2) + xMargin;
  const top = d3.min(root.descendants(), (node) => node.data.y - node.data.height / 2);
  const bottom = d3.max(root.descendants(), (node) => node.data.y + node.data.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);

  for (const node of root.descendants()) {
    node.x = (node.data.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.data.y - top - layoutHeight / 2) * scale + height / 2;
    node.width *= scale;
    node.height *= scale;
  }

  const scaledLinks = links.map((link) => ({
    ...link,
    segments: link.segments.map(([x, y]) => [
      (x - left - layoutWidth / 2) * scale + width / 2,
      (y - top - layoutHeight / 2) * scale + height / 2,
    ]),
  }));

  return {
    nodes: root.descendants().map(({ id, x, y, width: nodeWidth, height: nodeHeight, children }) => ({
      id,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      isLeaf: !children || children.length === 0,
    })),
    links: scaledLinks,
  };
}

/**
 * @param {Array} data
 * @param {number} width
 * @param {number} height
 * @param {Object} [options]
 * @param {"sa"|"lpt"|Function} [options.solver="lpt"]
 * @param {(stats: Object) => void} [options.onStats] 実験用の統計通知
 */
export function layout(data, width, height, options = {}) {
  const solve = typeof options.solver === "function"
    ? options.solver
    : solvers[options.solver ?? "lpt"];
  if (!solve) {
    throw new Error(`Unknown solver: "${options.solver}". Available: ${Object.keys(solvers).join(", ")}`);
  }

  const xMargin = options.xMargin ?? 300;
  const yMargin = options.yMargin ?? 200;
  const innerYMargin = options.innerYMargin ?? yMargin / 2;
  const stratify = createStratify();

  let root = stratify(data);
  root = stratify(initDammyData(createDammuy(root, xMargin, yMargin, innerYMargin)));
  addMargin(root, xMargin, yMargin, innerYMargin, false);

  const byName = new Map();
  const stateRoot = buildState(root, null, byName);
  const stats = { iterations: 0, rebuiltSubtrees: 0, foldedNodeCount: root.descendants().length };
  initializeCaches(stateRoot, stratify, stats);

  const targetAspect = width / height;
  while (aspectRatio(stateRoot.layout) < targetAspect) {
    const target = bottomDummy(stateRoot.layout, byName);
    // growth.js は最底辺が展開済みなら、他に展開可能なダミーがあっても終了する。
    if (!target || target.data.columns >= target.data.leavesNum) break;

    target.data.columns += 1;
    const result = solve(
      target.data.leaves,
      target.data.columns,
      options.random ?? Math.random,
    );
    if (result) target.data.leaves = result.bestPartition;
    Object.assign(
      target.data,
      setDummyNodeSize(target.data.leaves, xMargin, yMargin, innerYMargin),
    );
    rebuildAncestors(target, stratify, stats);
    stats.iterations += 1;
  }

  options.onStats?.({ ...stats });
  return finalize(
    stateRoot.layout,
    width,
    height,
    { xMargin, yMargin, innerYMargin },
    stratify,
  );
}
