import * as d3 from "d3";
export function bin(data, width, height) {
  const row = 3;
  const xMargin = 10;
  const yMargin = 20;
  let rowArray = initialRowArray(data, xMargin, yMargin);
  let diff = rowArray.length - row
  while (diff > 0) {
    rowArray = createRowArray(rowArray);
    diff--;
  }
  const rectsData = calcArea(rowArray, xMargin, yMargin);
  const layout = rectsData.layout
  // 正規化を行い、座標を最適化
  const left = d3.min(layout, (node) => node.x - node.width / 2) - xMargin;
  const right = d3.max(layout, (node) => node.x + node.width / 2) + xMargin;
  const top = d3.min(layout, (node) => node.y - node.height / 2);
  const bottom = d3.max(layout, (node) => node.y + node.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);

  // 結果の長方形にスケールを適用
  layout.forEach((node) => {
    node.x = (node.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.y - top - layoutHeight / 2) * scale + height / 2;
    node.width *= scale;
    node.height *= scale;
  });
  console.log("最小行の結合 幅、高さ、面積", rectsData.width, rectsData.height, rectsData.area);
  return layout;
}

// 各行を一つの長方形とする配列を作成
function initialRowArray(data, xMargin, yMargin) {
  return data.map((item) => {
    return (
      {
        "width": rowWidth([item]) + xMargin,
        "height": rowHeight([item]) + yMargin,
        rects: [{ ...item }]
      }
    )
  })
}

function createRowArray(rowArray) {
  const sortedData = rowArray.sort((a, b) => a.width - b.width);
  const combineRow = {
    "width": rowWidth([sortedData[0], sortedData[1]]),
    "height": rowHeight([sortedData[0], sortedData[1]]),
    "rects": [...sortedData[0].rects, ...sortedData[1].rects]
  };
  sortedData.splice(0, 2);
  return [combineRow, ...sortedData];
}

function rowWidth(array) {
  let sum = 0;
  array.forEach((item) => {
    sum += item.width;
  })
  return sum;
}

function rowHeight(array) {
  let max = 0;
  array.forEach((item) => {
    max = Math.max(max, item.height);
  })
  return max;
}

function calcArea(rowArray, xMargin, yMargin) {
  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;
  let result = [];
  let totalWidth = 0;
  let totalHeight = 0;

  rowArray.forEach((row) => {
    row.rects.forEach((rect) => {
      const newRect = { ...rect }; // 元データをコピー
      newRect.x = currentX + rect.width / 2;
      newRect.y = currentY + rect.height / 2;

      result.push(newRect);

      currentX += rect.width + xMargin;
      maxHeightInRow = row.height;
    });

    totalWidth = Math.max(totalWidth, row.width);
    currentX = 0;
    currentY += maxHeightInRow + yMargin;
    maxHeightInRow = 0;
  });

  totalHeight = currentY;

  return {
    area: totalWidth * totalHeight,
    layout: result,
    width: totalWidth,
    height: totalHeight,
  };
}
