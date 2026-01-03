import * as d3 from "d3";

//葉群をダミーノードにする関数
function createDammuy(root) {
  if (root.children) {
    let data = [{ ...root.data }];
    let dummyLesaves = [[]];
    let dummyData = [];
    for (const child of root.children) {
      const childData = createDammuy(child);
      childData.length <= 1
        ? dummyLesaves[0].push(...childData)
        : dummyData.push(...childData);
    }
    dummyLesaves[0].length <= 1
      ? data.push(...dummyLesaves[0])
      : data.push({
        name: root.data.name + "leaves",
        parent: root.data.name,
        leaves: dummyLesaves,
        columns: 1,
        leavesNum: dummyLesaves[0].length,
      });
    data.push(...dummyData);
    return data;
  } else {
    return [root.data];
  }
}

//van der ploegのアルゴリズムを実装する関数
function vanderploeg(root, startify) {
  if (root.children) {
    let leftData = [{ ...root.data }];
    const t = leftData[0].parent;
    leftData[0].parent = "";
    let leftSiblings;
    let currentTree;
    for (const child of root.children) {
      let currentData = [{ ...root.data }];
      currentData[0].parent = "";
      child.data.y = root.data.y + root.data.height / 2 + child.data.height / 2;
      currentData.push(...vanderploeg(child, startify));
      currentTree = startify(currentData);
      leftSiblings = startify(leftData);
      const move = separate(
        leftSiblings.children
          ? rightCountur(
            leftSiblings,
            rightMostSiblingNode(leftSiblings.children),
          )
          : [],
        leftCountur(currentTree, leftMostSiblingNode(currentTree.children)),
      );
      for (let item of currentData) {
        item.x += move;
      }
      currentData.shift();
      leftData.push(...currentData);
    }
    leftSiblings = startify(leftData);
    const leftMostNode = leftMostSiblingNode(leftSiblings.children);
    const rightMostNode = rightMostSiblingNode(leftSiblings.children);
    leftData[0].x =
      (leftMostNode.data.x -
        leftMostNode.data.width / 2 +
        rightMostNode.data.x +
        rightMostNode.data.width / 2) /
      2;
    leftData[0].parent = t;
    return leftData;
  } else {
    return [root.data];
  }
}

//左の兄弟ツリーに現在のサブツリーを、左からくっつけるための最小移動距離を返す関数
function separate(leftSiblingsRightCounturList, curentSubTreeLeftCounturList) {
  let currentRightCounturNode = leftSiblingsRightCounturList;
  let currentLeftCounturNode = curentSubTreeLeftCounturList;
  let l = 0;
  let r = 0;
  let diffSum = 0;
  while (currentRightCounturNode[r] && currentLeftCounturNode[l]) {
    let xl =
      currentLeftCounturNode[l].data.x -
      currentLeftCounturNode[l].data.width / 2;
    let xr =
      currentRightCounturNode[r].data.x +
      currentRightCounturNode[r].data.width / 2;
    if (xl + diffSum < xr) {
      const diff = xr - xl - diffSum;
      diffSum += diff;
    }
    let yl =
      currentLeftCounturNode[l].data.y +
      currentLeftCounturNode[l].data.height / 2;
    let yr =
      currentRightCounturNode[r].data.y +
      currentRightCounturNode[r].data.height / 2;
    if (yl <= yr) {
      l += 1;
    }
    if (yl >= yr) {
      r += 1;
    }
  }
  return diffSum;
}

//兄弟の右端を返す関数
function rightMostSiblingNode(children) {
  let rightMost = children[0];
  for (let i = 1; i < children.length; i++) {
    rightMost =
      rightMost.data.x + rightMost.data.width / 2 <
        children[i].data.x + children[i].data.width / 2
        ? children[i]
        : rightMost;
  }
  return rightMost;
}

//兄弟の左端を返す関数
function leftMostSiblingNode(children) {
  let leftMost = children[0];
  for (let i = 1; i < children.length; i++) {
    leftMost =
      leftMost.data.x - leftMost.data.width / 2 >
        children[i].data.x - children[i].data.width / 2
        ? children[i]
        : leftMost;
  }
  return leftMost;
}

//rightMostNodeからの右輪郭ノードを返す関数
function rightCountur(root, rightMostNode) {
  let countur;
  if (rightMostNode.children) {
    countur = [
      rightMostNode,
      ...rightCountur(root, rightMostSiblingNode(rightMostNode.children)),
    ];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if (
        rightMostNode.data.y + rightMostNode.data.height / 2 <
        node.data.y + node.data.height / 2 &&
        (kouho === null ||
          (kouho.data.y - kouho.data.width / 2 >=
            node.data.y - node.data.width / 2 &&
            kouho.data.x + kouho.data.width / 2 <=
            node.data.x + node.data.width / 2) ||
          (rightMostNode.data.y + rightMostNode.data.heigh / 2 <
            kouho.data.y - kouho.data.heigh / 2 &&
            rightMostNode.data.y - rightMostNode.data.height / 2 >
            kouho.data.y - kouho.data.heigh / 2))
      ) {
        kouho = node;
      }
    }
    countur = kouho
      ? [rightMostNode, ...rightCountur(root, kouho)]
      : [rightMostNode];
    return countur;
  }
}

//leftMostNodeからの左輪郭ノードを返す関数
function leftCountur(root, leftMostNode) {
  let countur;
  if (leftMostNode.children) {
    countur = [
      leftMostNode,
      ...leftCountur(root, leftMostSiblingNode(leftMostNode.children)),
    ];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if (
        leftMostNode.data.y + leftMostNode.data.height / 2 <
        node.data.y + node.data.height / 2 &&
        (kouho === null ||
          (kouho.data.y - kouho.data.width / 2 >=
            node.data.y - node.data.width / 2 &&
            kouho.data.x - kouho.data.width / 2 >=
            node.data.x - node.data.width / 2) ||
          (leftMostNode.data.y + leftMostNode.data.heigh / 2 <
            kouho.data.y - kouho.data.heigh / 2 &&
            leftMostNode.data.y - leftMostNode.data.height / 2 >
            kouho.data.y - kouho.data.heigh / 2))
      ) {
        kouho = node;
      }
    }
    countur = kouho
      ? [leftMostNode, ...leftCountur(root, kouho)]
      : [leftMostNode];
    return countur;
  }
}

//ダミーノードを含んだ根付き木で、それぞれのノードの横幅・縦幅を設定
function initRoot(root, xMargin, yMargin) {
  if (root.data.leaves) {
    let maxWidth = 0;
    for (let i = 0; i < root.data.leaves[0].length; i++) {
      let rowSum = 0;
      for (let j = 0; j < root.data.leaves.length; j++) {
        if (isNotEmptyObject(root.data.leaves[j][i])) {
          root.data.leaves[j][i].width += xMargin;
        }
        rowSum += root.data.leaves[j][i].width;
      }
      maxWidth = maxWidth < rowSum ? rowSum : maxWidth;
    }
    root.data.width = maxWidth + xMargin;
    let maxHeight = 0;
    for (let j = 0; j < root.data.leaves.length; j++) {
      let columnSum = 0;
      for (let i = 0; i < root.data.leaves[0].length; i++) {
        if (isNotEmptyObject(root.data.leaves[j][i])) {
          root.data.leaves[j][i].height += 2 * yMargin;
        }
        columnSum += root.data.leaves[j][i].height;
      }
      maxHeight = maxHeight < columnSum ? columnSum : maxHeight;
    }
    root.data.height = maxHeight + 2 * yMargin;
  } else {
    root.data.width = root.data.width + xMargin;
    root.data.height = root.data.height + yMargin * 2;
  }
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;
  if (root.children) {
    for (let child of root.children) {
      initRoot(child, xMargin, yMargin);
    }
  }
}

//ダミーノードの余白をセット
function setDummyMargin(root, xMargin, yMargin) {
  if (root.data.leaves) {
    let maxWidth = 0;
    for (let i = 0; i < root.data.leaves[0].length; i++) {
      let rowSum = 0;
      for (let j = 0; j < root.data.leaves.length; j++) {
        rowSum += root.data.leaves[j][i].width;
      }
      maxWidth = maxWidth < rowSum ? rowSum : maxWidth;
    }
    root.data.width = maxWidth + xMargin;
    let maxHeight = 0;
    for (let j = 0; j < root.data.leaves.length; j++) {
      let columnSum = 0;
      for (let i = 0; i < root.data.leaves[0].length; i++) {
        columnSum += root.data.leaves[j][i].height;
      }
      maxHeight = maxHeight < columnSum ? columnSum : maxHeight;
    }
    root.data.height = maxHeight + 2 * yMargin;
  }
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;
  if (root.children) {
    for (let child of root.children) {
      setDummyMargin(child, xMargin, yMargin);
    }
  }
}

//余白を取り除く関数
function format(root, xMargin, yMargin) {
  for (let node of root.descendants()) {
    node.x = node.data.x;
    node.y = node.data.y;
    node.width = node.data.width - xMargin;
    node.height = node.data.height - yMargin * 2;
  }
}

//リンクを作る関数
function createLinks(root, xMargin, yMargin) {
  if (root.children) {
    let links = [];
    const leftMostNode = leftMostSiblingNode(root.children);
    const rightMostNode = rightMostSiblingNode(root.children);

    links.push(
      createPath(
        `${root.id}toChild`,
        root.data.x,
        root.data.x,
        root.data.y + root.data.height / 2 - yMargin,
        root.data.y + root.data.height / 2,
      ),
      createPath(
        `${root.id}Horizon`,
        leftMostNode.data.x,
        rightMostNode.data.x,
        root.data.y + root.data.height / 2,
        root.data.y + root.data.height / 2,
      ),
    );
    for (const child of root.children) {
      links.push(...createLinks(child, xMargin, yMargin));
      if (child.data.columns) {
        //
      } else {
        links.push(
          createPath(
            `${child.id}toParent`,
            child.data.x,
            child.data.x,
            child.data.y - child.data.height / 2,
            child.data.y - child.data.height / 2 + yMargin,
          ),
        );
      }
    }
    return links;
  } else {
    return [];
  }
}

function createPath(pathId, x1, x2, y1, y2) {
  return {
    id: pathId,
    segments: [
      [x1, y1],
      [x2, y2],
    ],
  };
}

//底辺のノードを返す関数
function searchBottomNode(root) {
  let descendants = root.descendants();
  let max = 0;
  for (let i = 1; i < descendants.length; i++) {
    max =
      descendants[max].data.y + descendants[max].data.height / 2 <
        descendants[i].data.y + descendants[i].data.height / 2
        ? i
        : max;
  }
  return descendants[max];
}

//ツリーのアスペクト比を返す関数
function calcAspectRatio(root) {
  const left = d3.min(
    root.descendants(),
    (node) => node.data.x - node.data.width / 2,
  );
  const right = d3.max(
    root.descendants(),
    (node) => node.data.x + node.data.width / 2,
  );
  const top = d3.min(
    root.descendants(),
    (node) => node.data.y - node.data.height / 2,
  );
  const bottom = d3.max(
    root.descendants(),
    (node) => node.data.y + node.data.height / 2,
  );
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  return layoutWidth / layoutHeight;
}

//アスペクト比が最適になるまで底辺ノードの列数を増やす関数
function localFoldingLayout(root, at, xMargin, yMargin, stratify) {
  let a = calcAspectRatio(root);
  while (at > a) {
    const bottomNode = searchBottomNode(root);
    if (
      bottomNode.data.leaves &&
      bottomNode.data.columns < bottomNode.data.leavesNum
    ) {
      bottomNode.data.columns += 1;
      const leaves1D = to1D(bottomNode.data.leaves);
      const rowCount = Math.ceil(
        bottomNode.data.leavesNum / bottomNode.data.columns,
      );
      let newLeaves = create2DArray(rowCount, bottomNode.data.columns);
      for (let i = 0; i < rowCount; i++) {
        for (let j = 0; j < bottomNode.data.columns; j++) {
          newLeaves[j][i] = leaves1D[i * bottomNode.data.columns + j]
            ? leaves1D[i * bottomNode.data.columns + j]
            : {};
        }
      }
      bottomNode.data.leaves = newLeaves;
      setDummyMargin(root, xMargin, yMargin);
      root = stratify(vanderploeg(root, stratify));
      a = calcAspectRatio(root);
    } else {
      break;
    }
  }
  return root;
}

function undoDummyNode(root, xMargin, yMargin, links) {
  const data = root.descendants().flatMap((node) => {
    if (node.data.leaves) {
      const rowCount = Math.ceil(node.data.leavesNum / node.data.columns);
      const isRightOfParentCenter =
        node.data.x +
        node.data.width / 2 -
        xMargin -
        node.data.leaves[node.data.columns - 1][0].width / 2 >
        node.parent.data.x;
      let rowMaxHeight = node.data.y - node.data.height / 2;
      for (let j = 0; j < node.data.columns; j++) {
        node.data.leaves[j][0].y =
          node.data.y -
          node.data.height / 2 +
          node.data.leaves[j][0].height / 2;
      }
      //列数が１かどうか
      let isMultipleColumns = true;
      for (let i = 0; i < rowCount; i++) {
        if (node.data.columns > 1) {
          node.data.leaves[0][i].x = isRightOfParentCenter
            ? i % 2 === 0
              ? node.data.x -
              node.data.width / 2 +
              node.data.leaves[0][i].width / 2 +
              xMargin / 2
              : node.data.x +
              node.data.width / 2 -
              node.data.leaves[0][i].width / 2 -
              xMargin / 2
            : i % 2 === 0
              ? node.data.x +
              node.data.width / 2 -
              node.data.leaves[0][i].width / 2 -
              xMargin / 2
              : node.data.x -
              node.data.width / 2 +
              node.data.leaves[0][i].width / 2 +
              xMargin / 2;
        } else {
          isMultipleColumns = false;
          node.data.leaves[0][i].x =
            node.data.x -
            node.data.width / 2 +
            node.data.leaves[0][i].width / 2 +
            xMargin / 2;
        }

        let newMaxHeight = rowMaxHeight;
        for (let j = 0; j < node.data.columns; j++) {
          if (isNotEmptyObject(node.data.leaves[j][i])) {
            if (!node.data.leaves[j][i].x) {
              node.data.leaves[j][i].x = isRightOfParentCenter
                ? i % 2 === 0
                  ? node.data.leaves[j - 1][i].x +
                  node.data.leaves[j - 1][i].width / 2 +
                  node.data.leaves[j][i].width / 2
                  : node.data.leaves[j - 1][i].x -
                  node.data.leaves[j - 1][i].width / 2 -
                  node.data.leaves[j][i].width / 2
                : i % 2 === 0
                  ? node.data.leaves[j - 1][i].x -
                  node.data.leaves[j - 1][i].width / 2 -
                  node.data.leaves[j][i].width / 2
                  : node.data.leaves[j - 1][i].x +
                  node.data.leaves[j - 1][i].width / 2 +
                  node.data.leaves[j][i].width / 2;
            }
            if (!node.data.leaves[j][i].y) {
              node.data.leaves[j][i].y =
                rowMaxHeight + node.data.leaves[j][i].height / 2;
            }
            links.push(
              isMultipleColumns
                ? createPath(
                  `${node.data.leaves[j][i].name}`,
                  node.data.leaves[j][i].x,
                  node.data.leaves[j][i].x,
                  rowMaxHeight,
                  rowMaxHeight + yMargin,
                )
                : createPath(
                  `${node.data.leaves[j][i].name}`,
                  node.data.leaves[j][i].x - node.data.leaves[j][i].width / 2,
                  node.data.leaves[j][i].x -
                  node.data.leaves[j][i].width / 2 +
                  xMargin / 2,
                  node.data.leaves[j][i].y,
                  node.data.leaves[j][i].y,
                ),
            );
            newMaxHeight = Math.max(
              newMaxHeight,
              node.data.leaves[j][i].y + node.data.leaves[j][i].height / 2,
            );
          }
        }
        if (isMultipleColumns) {
          if (i < 1) {
            const firstNodeX = isRightOfParentCenter
              ? mostLeftXInRow(node, i)
              : node.data.x - node.data.width / 2 + xMargin / 2;
            const pathX = isRightOfParentCenter
              ? node.data.x + node.data.width / 2 - xMargin / 2
              : node.data.x - node.data.width / 2 + xMargin / 2;
            links.push(
              createPath(
                `dummyHorizon${node.data.name + i}1`,
                firstNodeX,
                node.data.x,
                rowMaxHeight,
                rowMaxHeight,
              ),
            );
            if (node.data.columns !== node.data.leavesNum) {
              // links.push(createPath(
              //   `dummyHorizon${node.data.name}0`,
              //   node.parent.data.x,
              //   pathX,
              //   rowMaxHeight,
              //   rowMaxHeight,
              // ));
              links.push(
                createPath(
                  `dummyVarticle${node.data.name + i}`,
                  pathX,
                  pathX,
                  rowMaxHeight,
                  newMaxHeight,
                ),
              );
            } else {
              links.push(
                createPath(
                  `dummyHorizon${node.name}0`,
                  node.parent.data.x,
                  mostRightXInRow(node, i),
                  rowMaxHeight,
                  rowMaxHeight,
                ),
              );
            }
          } else if (i < rowCount - 1) {
            const pathX = isRightOfParentCenter
              ? i % 2 == 0
                ? node.data.x + node.data.width / 2 - xMargin / 2
                : node.data.x - node.data.width / 2 + xMargin / 2
              : i % 2 == 0
                ? node.data.x - node.data.width / 2 + xMargin / 2
                : node.data.x + node.data.width / 2 - xMargin / 2;
            links.push(
              createPath(
                `dummyHorizon${node.data.name + i}`,
                node.data.x - node.data.width / 2 + xMargin / 2,
                node.data.x + node.data.width / 2 - xMargin / 2,
                rowMaxHeight,
                rowMaxHeight,
              ),
            );
            links.push(
              createPath(
                `dummyVarticle${node.data.name + i}`,
                pathX,
                pathX,
                rowMaxHeight,
                newMaxHeight,
              ),
            );
          } else {
            const pathX = !isRightOfParentCenter
              ? i % 2 == 0
                ? node.data.x + node.data.width / 2 - xMargin / 2
                : node.data.x - node.data.width / 2 + xMargin / 2
              : i % 2 == 0
                ? node.data.x - node.data.width / 2 + xMargin / 2
                : node.data.x + node.data.width / 2 - xMargin / 2;
            const finaNodeX = isRightOfParentCenter
              ? i % 2 == 0
                ? mostRightXInRow(node, i)
                : mostLeftXInRow(node, i)
              : i % 2 == 0
                ? mostLeftXInRow(node, i)
                : mostRightXInRow(node, i);
            links.push(
              createPath(
                `dummyVarticle${node.data.name + i}`,
                pathX,
                finaNodeX,
                rowMaxHeight,
                rowMaxHeight,
              ),
            );
          }
        }

        rowMaxHeight = newMaxHeight;
      }
      if (!isMultipleColumns) {
        links.push(
          createPath(
            `dummyVarticle${node.data.name}`,
            node.data.x - node.data.width / 2 + xMargin / 2,
            node.data.x - node.data.width / 2 + xMargin / 2,
            node.data.y - node.data.height / 2,
            node.data.leaves[0][rowCount - 1].y,
          ),
        );
        links.push(
          createPath(
            `dummyHorizon${node.data.name}`,
            node.data.x - node.data.width / 2 + xMargin / 2,
            node.data.x,
            node.data.y - node.data.height / 2,
            node.data.y - node.data.height / 2,
          ),
        );
      }

      return to1D(node.data.leaves).filter((item) => isNotEmptyObject(item));
    } else {
      return [node.data];
    }
  });

  return data;
}

//ダミーノードで指定された行の一番右のx座標を返す関
function mostRightXInRow(dummyNode, row) {
  const leaves = dummyNode.data.leaves;
  let max = dummyNode.data.x - dummyNode.data.width / 2;
  for (let j = 0; j < dummyNode.data.columns; j++) {
    max = isNotEmptyObject(leaves[j][row])
      ? Math.max(leaves[j][row].x, max)
      : max;
  }
  return max;
}

//ダミーノードで指定された行の一番左のx座標を返す関
function mostLeftXInRow(dummyNode, row) {
  const leaves = dummyNode.data.leaves;
  let min = dummyNode.data.x + dummyNode.data.width / 2;
  for (let j = 0; j < dummyNode.data.columns; j++) {
    min = isNotEmptyObject(leaves[j][row])
      ? Math.min(leaves[j][row].x, min)
      : min;
  }
  return min;
}

//2次元配列を1次元にして返す関数
function to1D(array2D) {
  let array1D = [];
  for (let j = 0; j < array2D[0].length; j++) {
    for (let i = 0; i < array2D.length; i++) {
      if (array2D[i][j]) {
        array1D.push(array2D[i][j]);
      } else {
        break;
      }
    }
  }
  return array1D;
}

//の2次元配列を作る関数
function create2DArray(rowNum, columnNum) {
  let array2D = [];
  for (var j = 0; j < columnNum; j++) {
    array2D[j] = [];
    for (var i = 0; i < rowNum; i++) {
      array2D[j][i] = {};
    }
  }
  return array2D;
}

function isNotEmptyObject(obj) {
  return obj && typeof obj === "object" && Object.keys(obj).length > 0;
}

export function layout(data, width, height) {
  // const nodeWidth = 1000;
  // const nodeHeight = 500;
  const xMargin = 300;
  const yMargin = 200;
  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);

  // 仮のレイアウト
  // const tree = d3
  //   .tree()
  //   .size([width, height])
  //   .nodeSize([nodeWidth + xMargin, nodeHeight + yMargin])
  //   .separation(() => 1);
  // tree(root);

  //dataにランダムなノード幅と高さを設定
  // const newData = data.map((item) => {
  //   item.width = 500 + Math.floor(Math.random() * 1000);
  //   item.height = 500 + Math.floor(Math.random() * 1000);
  //   return item;
  // });

  let root = stratify(data);
  const dummyData = createDammuy(root);
  root = stratify(dummyData);
  initRoot(root, xMargin, yMargin);
  root = stratify(vanderploeg(root, stratify));
  root = localFoldingLayout(root, width / height, xMargin, yMargin, stratify);
  const { max_ori, sum_ori } = oritatamiCount(root);
  const links = createLinks(root, xMargin, yMargin);
  root = stratify(undoDummyNode(root, xMargin, yMargin, links));
  format(root, xMargin, yMargin);

  // normalize
  const left =
    d3.min(root.descendants(), (node) => node.x - node.width / 2) - xMargin;
  const right =
    d3.max(root.descendants(), (node) => node.x + node.width / 2) + xMargin;
  const top = d3.min(root.descendants(), (node) => node.y - node.height / 2);
  const bottom = d3.max(root.descendants(), (node) => node.y + node.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);
  for (const node of root.descendants()) {
    node.x = (node.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.y - top - layoutHeight / 2) * scale + height / 2;
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

  return {
    nodes: root.descendants().map(({ id, x, y, width, height }) => {
      return { id, x, y, width, height };
    }),
    links: scaledLinks,
    max_ori,
    sum_ori
  };
}

function oritatamiCount(root) {
  let current_node_max_ori = -Infinity; // このノード自身のori、またはサブツリーを含めた最大値の候補
  let current_node_sum_ori = 0;   // このノード自身のori、またはサブツリーを含めた合計値の候補

  // 1. このノード自身の `ori` を計算
  if (root.data && typeof root.data.leavesNum === 'number' && typeof root.data.rows === 'number') {
    const ori = root.data.leavesNum / Math.ceil(
      root.data.leavesNum / root.data.columns,
    );
    // console.log(`Node: ${root.data.name || 'Unnamed'}, leavesNum: ${root.data.leavesNum}, rows: ${root.data.rows}, ori: ${ori}`); // デバッグ用

    current_node_max_ori = ori; // このノードのoriを最大値の初期候補とする
    current_node_sum_ori = ori;   // このノードのoriを合計値の初期値とする
  } else {
    // このノードでoriが計算できない場合、
    // maxの初期値は-Infinity (他の有効なoriが見つかれば上書きされる)
    // sumの初期値は0 (このノードは合計に寄与しない)
    // console.log(`Node: ${root.data.name || 'Unnamed'}, no leavesNum/rows, ori not calculated.`); // デバッグ用
  }

  // 2. 子ノードがあれば、再帰的に処理し結果を集約
  if (root.children && root.children.length > 0) {
    for (const child of root.children) {
      const child_result = oritatamiCount(child); // 子のサブツリーの結果を取得

      // console.log(`  Child ${child.data.name || 'Unnamed'} returned: max_ori=${child_result.max_ori}, sum_ori=${child_result.sum_ori}`); // デバッグ用

      // サブツリー全体の最大値を更新
      // (現在のノードのori、または既に処理した他の兄弟サブツリーのmax、と今処理した子のサブツリーのmaxを比較)
      current_node_max_ori = Math.max(current_node_max_ori, child_result.max_ori);

      // サブツリー全体の合計値に加算
      // (現在のノードのoriは既にcurrent_node_sum_oriの初期値として入っているか、0なので、
      //  子のサブツリーの合計を加えるだけでよい)
      current_node_sum_ori += child_result.sum_ori;
    }
  }
  // 葉ノード (childrenがない) または oriが計算できないが子孫は持つノードの場合、
  // current_node_max_ori と current_node_sum_ori は適切に初期化されているか、
  // 子からの結果で更新されています。

  // console.log(`Returning for ${root.data.name || 'Unnamed'}: max_ori=${current_node_max_ori}, sum_ori=${current_node_sum_ori}`); // デバッグ用
  return { max_ori: current_node_max_ori, sum_ori: current_node_sum_ori };
}