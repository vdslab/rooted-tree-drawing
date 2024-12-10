import * as d3 from "d3";

export function permutation(data, width, height) {
  const row = 4;
  const columnCount = 10;
  const xMargin = 10;
  const yMargin = 20;
  let result = []; // 配置後の座標付きのオブジェクトを格納
  let minArea = Infinity;
  let optimalLayout = null;

  const permuData = getPermutations(data);

  permuData.forEach((data, index) => {
    const premuIndex = getPartitionIndices(data, row);
    premuIndex.forEach((item) => {
      const areaResult = calcArea(data, item, xMargin, yMargin);
      const area = areaResult.area;

      if (area < minArea) {
        minArea = area;
        optimalLayout = areaResult.layout; // 最小面積を持つレイアウトを保存
      }
    });
  });

  // 正規化を行い、座標を最適化
  const left = d3.min(optimalLayout, (node) => node.x - node.width / 2) - xMargin;
  const right = d3.max(optimalLayout, (node) => node.x + node.width / 2) + xMargin;
  const top = d3.min(optimalLayout, (node) => node.y - node.height / 2);
  const bottom = d3.max(optimalLayout, (node) => node.y + node.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);

  // 結果の長方形にスケールを適用
  optimalLayout.forEach((node) => {
    node.x = (node.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.y - top - layoutHeight / 2) * scale + height / 2;
    node.width *= scale;
    node.height *= scale;
  });

  return optimalLayout;
}

function getPermutations(array) {
  if (array.length === 0) return [[]];
  return array.flatMap((val, index) =>
    getPermutations([...array.slice(0, index), ...array.slice(index + 1)]).map(
      (perm) => [val, ...perm]
    )
  );
}

function getPartitionIndices(array, n) {
  const len = array.length;
  if (n < 2 || n > len) {
    throw new Error("n must be between 2 and the length of the array.");
  }

  function generateIndices(start, depth) {
    if (depth === 0) return [[]];
    const indices = [];
    for (let i = start; i < len; i++) {
      generateIndices(i + 1, depth - 1).forEach((rest) => {
        indices.push([i, ...rest]);
      });
    }
    return indices;
  }

  return generateIndices(1, n - 1);
}

function calcArea(data, breaks, xMargin, yMargin) {
  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;
  let result = [];
  let totalWidth = 0;
  let totalHeight = 0;

  const partitionedData = partitionArray(data, breaks);

  partitionedData.forEach((row) => {
    row.forEach((rect) => {
      const newRect = { ...rect }; // 元データをコピー
      newRect.x = currentX + rect.width / 2;
      newRect.y = currentY + rect.height / 2;

      result.push(newRect);

      currentX += rect.width + xMargin;
      maxHeightInRow = Math.max(maxHeightInRow, rect.height);
    });

    totalWidth = Math.max(totalWidth, currentX);
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


// 配列を指定された区切り位置で分割
function partitionArray(array, breaks) {
  const result = [];
  let prevIndex = 0;

  breaks.forEach((index) => {
    result.push(array.slice(prevIndex, index));
    prevIndex = index;
  });

  result.push(array.slice(prevIndex)); // 最後の部分
  return result;
}
