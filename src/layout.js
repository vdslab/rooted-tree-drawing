import * as d3 from "d3";

export function layout(data, width, height) {
  const nodeWidth = 1000;
  const nodeHeight = 500;
  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);
  const root = stratify(data);

  // 仮のレイアウト
  const xMargin = 50;
  const yMargin = 200;
  const tree = d3
    .tree()
    .size([width, height])
    .nodeSize([nodeWidth + xMargin, nodeHeight + yMargin])
    .separation(() => 1);
  tree(root);

  // normalize
  const left = d3.min(root.descendants(), (node) => node.x - nodeWidth / 2);
  const right = d3.max(root.descendants(), (node) => node.x + nodeWidth / 2);
  const top = d3.min(root.descendants(), (node) => node.y - nodeHeight / 2);
  const bottom = d3.max(root.descendants(), (node) => node.y + nodeHeight / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);
  for (const node of root.descendants()) {
    node.x = (node.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.y - top - layoutHeight / 2) * scale + height / 2;
    node.width = nodeWidth * scale;
    node.height = nodeHeight * scale;
  }

  return {
    nodes: root.descendants().map(({ id, x, y, width, height }) => {
      return { id, x, y, width, height };
    }),
    links: root.links().map(({ source, target }) => {
      return {
        id: `${source.id}:${target.id}`,
        segments: [
          [source.x, source.y],
          [target.x, target.y],
        ],
      };
    }),
  };
}
