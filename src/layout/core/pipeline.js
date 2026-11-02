/**
 * レイアウトの共通パイプライン。
 *
 * SA / LPT / binpacking の layout() は、折りたたみ処理(fold)を除いて完全に
 * 同一のコードだった。その共通部分をここに一本化している。
 *
 *   入力 → ダミー化 → マージン付与 → van der Ploeg → fold → 展開 → 正規化
 *
 * fold だけが手法固有:
 *   - 列成長型   (methods/growth.js)     一番下のダミーの列を1つずつ増やす
 *   - 二分探索型 (methods/binpacking.js) 全体高さ H_t を二分探索する
 */
import * as d3 from "d3";
import { vanderPloegLayout } from "./vanderPloeg.js";
import { createDammuy, initDammyData, addMargin } from "./dummy.js";
import { undoDummyNode, createLinks, format } from "./render.js";

/**
 * @param {Array} data - {name, parent, width, height} の配列
 * @param {number} width - 目標領域の幅
 * @param {number} height - 目標領域の高さ
 * @param {Object} config
 * @param {number} config.xMargin
 * @param {number} config.yMargin
 * @param {number} config.innerYMargin - ダミーノード内部のyマージン
 * @param {boolean} config.skipInnerMargin - addMargin の skipInnerNodes に渡す値
 * @param {Function} config.fold - (root, targetAspect, xMargin, yMargin, innerYMargin) => root
 * @returns {{nodes: Array, links: Array}}
 */
export function runLayout(data, width, height, config) {
  const { xMargin, yMargin, innerYMargin, fold, skipInnerMargin } = config;

  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);
  let root = stratify(data);
  const dummyData = createDammuy(root, xMargin, yMargin, innerYMargin);
  const initializedDummyData = initDammyData(dummyData);
  root = stratify(initializedDummyData);
  addMargin(root, xMargin, yMargin, innerYMargin, skipInnerMargin);

  root = vanderPloegLayout(root);
  root = fold(root, width / height, xMargin, yMargin, innerYMargin);

  const layoutedData = undoDummyNode(root, xMargin, yMargin, innerYMargin);
  const links = createLinks(root, xMargin, yMargin, innerYMargin);

  root = stratify(layoutedData);
  format(root, xMargin, yMargin, innerYMargin);

  const left =
    d3.min(root.descendants(), (node) => node.data.x - node.data.width / 2) - xMargin;
  const right =
    d3.max(root.descendants(), (node) => node.data.x + node.data.width / 2) + xMargin;
  const top = d3.min(root.descendants(), (node) => node.data.y - node.data.height / 2);
  const bottom = d3.max(root.descendants(), (node) => node.data.y + node.data.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);

  for (const node of root.descendants()) {
    node.x = (node.data.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.data.y - top - layoutHeight / 2) * scale + height / 2;
    node.width = node.width * scale;
    node.height = node.height * scale;
  }

  const scaledLinks = links.map((link) => {
    link.segments[0][0] =
      (link.segments[0][0] - left - layoutWidth / 2) * scale + width / 2;
    link.segments[0][1] =
      (link.segments[0][1] - top - layoutHeight / 2) * scale + height / 2;
    link.segments[1][0] =
      (link.segments[1][0] - left - layoutWidth / 2) * scale + width / 2;
    link.segments[1][1] =
      (link.segments[1][1] - top - layoutHeight / 2) * scale + height / 2;
    return link;
  });

  const finalNodes = root.descendants().map((node) => {
    const { id, x, y, width, height, children } = node;
    const isLeaf = !children || children.length === 0;
    return { id, x, y, width, height, isLeaf };
  });

  return {
    nodes: finalNodes,
    links: scaledLinks,
  };
}
