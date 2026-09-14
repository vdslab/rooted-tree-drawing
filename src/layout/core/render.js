/**
 * レイアウト結果の出力: ダミーノードの展開、エッジ生成、表示サイズの確定。
 *
 * SA / LPT / binpacking の3手法で完全に同一のコード。
 */
import { leftMostSiblingNode, rightMostSiblingNode } from "./tree.js";

export function undoDummyNode(root, xMargin, yMargin, innerYMargin) {
  const newData = root.descendants().flatMap((item) => {
    const { data } = item;
    if (data?.leaves) {
      const leaves = [];
      const { x, y, height, width } = data;
      // ダミーノードの表示上端を計算
      const displayHeight = height - yMargin * 2;
      const dummyTop = y - displayHeight / 2;
      // 葉の配置開始位置:ダミーノード上端から innerYMargin * 2 分下
      const top = dummyTop + innerYMargin * 2;
      const left = x - width / 2 + xMargin / 2;

      if (data?.columns === data?.leavesNum) {
        // 1行(各列に1ノードずつ):横に並べる
        const colWidths = data.leaves.map(col => col[0].width);
        let tx = left;
        for (let i = 0; i < data.leavesNum; i++) {
          const node = data.leaves[i][0];
          const colWidth = colWidths[i];
          node.x = tx + colWidth / 2;
          node.y = top + node.height / 2;
          tx += colWidth;
          leaves.push({ ...node });
        }
      } else if (data.columns === 1) {
        // 1列(全ノードが縦に並ぶ)
        let ty = top;
        for (let i = 0; i < data.leaves[0].length; i++) {
          const node = data.leaves[0][i];
          node.x = left + node.width / 2;
          node.y = ty + node.height / 2;
          ty += node.height;
          leaves.push({ ...node });
        }
      } else {
        // 複数列:全て上から下に配置
        const colMaxWidths = data.leaves.map(col =>
          col.reduce((max, node) => Math.max(max, node.width || 0), 0)
        );

        let tx = left;
        data.leaves.forEach((col, colIndex) => {
          const colWidth = colMaxWidths[colIndex];
          let ty = top;

          col.forEach((node) => {
            node.x = tx + colWidth / 2;
            node.y = ty + node.height / 2;
            ty += node.height;
            leaves.push({ ...node });
          });

          tx += colWidth;
        });
      }
      return leaves;
    } else {
      return [data];
    }
  });

  return newData;
}

export function createPath(pathId, x1, x2, y1, y2) {
  return {
    id: pathId,
    segments: [
      [x1, y1],
      [x2, y2],
    ],
  };
}

export function getDisplaySize(node, xMargin, yMargin) {
  return {
    width: node.data.width - xMargin,
    height: node.data.height - yMargin * 2
  };
}

export function createDummyLinks(dummyNode, xMargin, yMargin, innerYMargin) {
  if (dummyNode.data?.leaves) {
    const links = [];
    const data = dummyNode.data;
    const { leaves, x, y, height, width } = dummyNode.data;

    const displayHeight = height - yMargin * 2;
    const dummyTop = y - displayHeight / 2; // ダミーノードの上端(親からの接続点)

    const leafStartY = dummyTop + innerYMargin * 2;
    const left = x - width / 2 + xMargin / 2;

    // 水平線の位置:ダミーノードの上端(親からの接続点と同じ)
    const horizonY = dummyTop;

    const colMaxWidths = leaves.map(col =>
      col.reduce((max, node) => Math.max(max, node.width || 0), 0)
    );

    if (data?.columns === data?.leavesNum) {
      // 1行
      const colWidths = leaves.map(col => col[0].width);
      let tx = left;
      const nodePositions = [];
      for (let i = 0; i < data.leavesNum; i++) {
        const node = leaves[i][0];
        const colWidth = colWidths[i];
        const displayWidth = colWidth - xMargin;
        const displayNodeHeight = node.height - innerYMargin * 2;
        const nodeX = tx + colWidth / 2;
        const nodeY = leafStartY + node.height / 2;
        nodePositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
        tx += colWidth;
      }

      const leftX = nodePositions[0].x;
      const rightX = nodePositions[nodePositions.length - 1].x;
      const horizonStartX = Math.min(x, leftX);
      const horizonEndX = Math.max(x, rightX);
      links.push(createPath(`${dummyNode.id}Horizon`, horizonStartX, horizonEndX, horizonY, horizonY));

      nodePositions.forEach((pos) => {
        const nodeTop = pos.y - pos.displayHeight / 2;
        links.push(createPath(`${pos.node.name}toParent`, pos.x, pos.x, horizonY, nodeTop));
      });

    } else if (data.columns === 1) {
      // 1列
      let ty = leafStartY;
      const nodePositions = [];
      for (const node of leaves[0]) {
        const nodeX = left + node.width / 2;
        const nodeY = ty + node.height / 2;
        const displayWidth = node.width - xMargin;
        const displayNodeHeight = node.height - innerYMargin * 2;
        nodePositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
        ty += node.height;
      }

      const lastPos = nodePositions[nodePositions.length - 1];
      const bottomY = lastPos.y;
      links.push(createPath(`${dummyNode.id}Horizon`, x, left, horizonY, horizonY));
      links.push(createPath(`${dummyNode.id}Vertical`, left, left, horizonY, bottomY));

      for (const pos of nodePositions) {
        const nodeLeft = pos.x - pos.displayWidth / 2;
        links.push(createPath(`${pos.node.name}Horizon`, left, nodeLeft, pos.y, pos.y));
      }

    } else {
      // 複数列
      let tx = left;
      const allNodePositions = [];

      leaves.forEach((col, colIndex) => {
        const colWidth = colMaxWidths[colIndex];
        let ty = leafStartY;
        const colPositions = [];

        col.forEach((node) => {
          const nodeX = tx + colWidth / 2;
          const nodeY = ty + node.height / 2;
          const displayWidth = node.width - xMargin;
          const displayNodeHeight = node.height - innerYMargin * 2;
          colPositions.push({ x: nodeX, y: nodeY, displayWidth, displayHeight: displayNodeHeight, node });
          ty += node.height;
        });

        allNodePositions.push(colPositions);
        tx += colWidth;
      });

      const colVerticalXs = [];
      tx = left;
      for (let i = 0; i < data.columns; i++) {
        colVerticalXs.push(tx);
        tx += colMaxWidths[i];
      }

      const firstVerticalX = colVerticalXs[0];
      const lastVerticalX = colVerticalXs[data.columns - 1];
      const horizonStartX = Math.min(x, firstVerticalX);
      const horizonEndX = Math.max(x, lastVerticalX);
      links.push(createPath(`${dummyNode.id}HorizontalMain`, horizonStartX, horizonEndX, horizonY, horizonY));

      allNodePositions.forEach((colPositions, colIndex) => {
        const lastPos = colPositions[colPositions.length - 1];
        const colBottom = lastPos.y;
        const verticalX = colVerticalXs[colIndex];

        links.push(createPath(`${dummyNode.id}Col${colIndex}Vertical`, verticalX, verticalX, horizonY, colBottom));

        colPositions.forEach((pos) => {
          const nodeLeft = pos.x - pos.displayWidth / 2;
          links.push(createPath(`${pos.node.name}toLink`, verticalX, nodeLeft, pos.y, pos.y));
        });
      });
    }
    return links;
  } else {
    return [];
  }
}

export function createLinks(root, xMargin, yMargin, innerYMargin) {
  if (root.children) {
    const links = [];
    const leftMostNode = leftMostSiblingNode(root.children);
    const rightMostNode = rightMostSiblingNode(root.children);

    const rootDisplaySize = getDisplaySize(root, xMargin, yMargin);
    const parentBottom = root.data.y + rootDisplaySize.height / 2;

    const childTops = root.children.map(child => {
      const marginY = child.data.isInner ? innerYMargin : yMargin;
      const childHeight = child.data.height - marginY * 2;
      return child.data.y - childHeight / 2;
    });
    const minChildTop = Math.min(...childTops);

    // 水平線のY座標:親の下端と子の上端の中間点
    const horizonY = (parentBottom + minChildTop) / 2;

    links.push(
      createPath(
        `${root.id}toChild`,
        root.data.x,
        root.data.x,
        parentBottom,
        horizonY,
      ),
      createPath(
        `${root.id}Horizon`,
        leftMostNode.data.x,
        rightMostNode.data.x,
        horizonY,
        horizonY,
      ),
    );

    for (const child of root.children) {
      const marginY = child.data.isInner ? innerYMargin : yMargin;
      const childHeight = child.data.height - marginY * 2;
      const childTop = child.data.y - childHeight / 2;

      links.push(
        createPath(
          `${child.id}toParent`,
          child.data.x,
          child.data.x,
          horizonY,
          childTop,
        ),
      );
      links.push(...createLinks(child, xMargin, yMargin, innerYMargin));
    }
    return links;
  } else if (root.data?.leaves) {
    return createDummyLinks(root, xMargin, yMargin, innerYMargin);
  } else {
    return [];
  }
}

export function format(root, xMargin, yMargin, innerYMargin) {
  for (let node of root.descendants()) {
    node.x = node.data.x;
    node.y = node.data.y;

    const marginY = node.data.isInner ? innerYMargin : yMargin;

    node.width = node.data.width - xMargin;
    node.height = node.data.height - marginY * 2;
  }
}
