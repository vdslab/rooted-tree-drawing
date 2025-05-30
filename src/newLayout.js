import * as d3 from "d3";

//葉群をダミーノードにする関数
function createDammuy(root, xMargin, yMargin) {
  if (root.children) {
    const data = [{ ...root.data, x: 0, y: 0 }];
    const dummyLesaves = [];
    for (const child of root.children) {
      const childData = createDammuy(child, xMargin, yMargin);

      //childDataが葉だったら
      if (childData.length == 1) {
        const childObj = childData[0];
        childObj.width += xMargin;
        childObj.height += yMargin * 2;
        dummyLesaves.push(childObj);
      } else {
        data.push(...childData);
      }
    }
    dummyLesaves.length <= 1
      ? data.push(...dummyLesaves)
      : data.unshift({
        name: root.data.name + "leaves",
        parent: root.data.name,
        leaves: dummyLesaves,
        rows: dummyLesaves.length,
        // columns: 1,
        leavesNum: dummyLesaves.length,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      });
    return data;
  } else {
    return [{ ...root.data, x: 0, y: 0 }];
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
            rightMostSiblingNode(leftSiblings.children)
          )
          : [],
        leftCountur(currentTree, leftMostSiblingNode(currentTree.children))
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
          (rightMostNode.data.y + rightMostNode.data.height / 2 <
            kouho.data.y - kouho.data.height / 2 &&
            rightMostNode.data.y - rightMostNode.data.height / 2 >
            kouho.data.y - kouho.data.height / 2))
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
          (leftMostNode.data.y + leftMostNode.data.height / 2 <
            kouho.data.y - kouho.data.height / 2 &&
            leftMostNode.data.y - leftMostNode.data.height / 2 >
            kouho.data.y - kouho.data.height / 2))
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

//ダミーノードを含んだ根付き木で、それぞれのノードサイズを余白付きに変更
function addMargin(root, xMargin, yMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin)
    };
  } else {
    root.data.width = root.data.width + xMargin;
    root.data.height = root.data.height + yMargin * 2;
  }
  if (root?.children) {
    for (const child of root.children) {
      addMargin(child, xMargin, yMargin);
    }
  }
}

//ダミーノードの余白を計算し設定
function setDummyMargin(root, xMargin, yMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin)
    };
  }
  if (root?.children) {
    for (const child of root.children) {
      setDummyMargin(child, xMargin, yMargin);
    }
  }
}



//ダミーノードの幅を計算
function calcDummyDataWidth(leaves, xMargin) {
  let maxRowWitdh = 0;
  for (const rowLeaves of leaves) {
    maxRowWitdh = Math.max(rowLeaves.reduce((acc, { width }) => acc + width, 0), maxRowWitdh);
  }
  return maxRowWitdh + xMargin;
}

//ダミーノードの高さを計算
function calcDummyNodeHeight(leaves) {
  let height = 0;
  for (const rowLeaves of leaves) {
    height += rowLeaves.reduce((maxHeight, { height }) => Math.max(maxHeight, height), Number.NEGATIVE_INFINITY);
  }
  return height;
}

//ダミーノードの横・縦幅を設定
function setDummyNodeSize(leaves, xMargin) {
  return { width: calcDummyDataWidth(leaves, xMargin), height: calcDummyNodeHeight(leaves) };
}

//最初に、ダミーノードを含んだデータからN*1の２次元葉群データを作成
function initDammyData([...dummyData]) {
  return (
    dummyData.map((item) => {
      if (item?.leaves) {
        item.leaves = item.leaves.map((leaf) => [leaf]);
      }
      return item;
    })
  );
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

// 現在は使用されていません
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
    (node) => node.data.x - node.data.width / 2
  );
  const right = d3.max(
    root.descendants(),
    (node) => node.data.x + node.data.width / 2
  );
  const top = d3.min(
    root.descendants(),
    (node) => node.data.y - node.data.height / 2
  );
  const bottom = d3.max(
    root.descendants(),
    (node) => node.data.y + node.data.height / 2
  );
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  return layoutWidth / layoutHeight;
}

// 各行のノードの幅の合計が小さい2つの行を1つの行にまとめる関数
function combineRowArray(leaves) {
  if (!leaves || leaves.length <= 1) {
    return leaves; // 行が1つ以下の場合は何もしない
  }

  // 各行の幅の合計を計算
  const rowWidths = leaves.map(row => {
    return {
      row: row,
      totalWidth: row.reduce((sum, node) => sum + (node.width || 0), 0)
    };
  });

  // 幅の合計が小さい順にソート
  rowWidths.sort((a, b) => a.totalWidth - b.totalWidth);

  // 最も幅の合計が小さい2つの行を取得
  const smallestRows = rowWidths.slice(0, 2);

  // 2つの行を1つの行にマージ
  const mergedRow = [...smallestRows[0].row, ...smallestRows[1].row];

  // 新しいleaves配列を作成（マージした行を含む）
  const newLeaves = leaves.filter(
    row => row !== smallestRows[0].row && row !== smallestRows[1].row
  );
  newLeaves.push(mergedRow);
  // 結果を返す
  return newLeaves;
}

//アスペクト比が最適になるまで底辺ノードの列数を増やす関数
function localFoldingLayout(root, at, xMargin, yMargin, stratify) {
  let a = calcAspectRatio(root);
  while (at > a) {
    const bottomNode = searchBottomNode(root);
    if (
      bottomNode.data.leaves &&
      bottomNode.data.rows > 1
    ) {
      bottomNode.data.leaves = combineRowArray(bottomNode.data.leaves);
      bottomNode.data.rows -= 1;
      setDummyMargin(root, xMargin, yMargin);
      root = stratify(vanderploeg(root, stratify));
      a = calcAspectRatio(root);
    } else {
      break;
    }
  }
  return root;
}


function undoDummyNode(root, xMargin) {
  const newData = root.descendants().flatMap((item) => {
    const { data, parent } = item;
    if (data?.leaves) {
      const leaves = [];
      const { x, y, height, width } = data;
      const top = y - height / 2;
      const left = x - width / 2 + xMargin / 2;
      const right = x + width / 2 - xMargin / 2;
      if (data?.rows === data?.leavesNum) {//1列の時
        let tx = left;
        let ty = top;
        for (let i = 0; i < data.leavesNum; i++) {
          data.leaves[i][0].x = tx + data.leaves[i][0].width / 2;
          data.leaves[i][0].y = ty + data.leaves[i][0].height / 2;
          // tx += data.leaves[i][0].width;
          ty += data.leaves[i][0].height;
          leaves.push({ ...data.leaves[i][0] });
        }
      } else if (data.rows === 1) {//1行の時
        let tx = left;
        for (let i = 0; i < data.leavesNum; i++) {
          data.leaves[0][i].x = tx + data.leaves[0][i].width / 2;
          data.leaves[0][i].y = top + data.leaves[0][i].height / 2;
          tx += data.leaves[0][i].width;
          leaves.push({ ...data.leaves[0][i] });
        }
      } else {//複数行複数列の時
        const isRightOfParentCenter =
          data.x +
          data.width / 2 -
          data.leaves[0][data.leaves[0].length - 1].width / 2 >
          parent.data.x;
        let ty = top;
        let maxHeight = ty;
        if (isRightOfParentCenter) {
          data.leaves.forEach((row, rowIndex) => {
            const isEven = rowIndex % 2 === 0;
            let tx = isEven ? left : right;
            row.forEach((node) => {
              node.x = isEven ? tx + node.width / 2 : tx - node.width / 2;
              node.y = ty + node.height / 2;
              tx += isEven ? node.width : -node.width;
              maxHeight = Math.max(maxHeight, ty + node.height);
              leaves.push({ ...node });
            });
            ty = maxHeight;
          });
        } else {
          data.leaves.forEach((row, rowIndex) => {
            const isEven = rowIndex % 2 === 0;
            let tx = isEven ? right : left;
            row.forEach((node) => {
              node.x = isEven ? tx - node.width / 2 : tx + node.width / 2;
              node.y = ty + node.height / 2;
              tx += isEven ? -node.width : node.width;
              maxHeight = Math.max(maxHeight, ty + node.height);
              leaves.push({ ...node });
            });
            ty = maxHeight;
          });
        }
      }
      return leaves;
    } else {
      return [data];
    }
  });

  return newData;
}

// 配線を作る関数
function createLinks(root, xMargin, yMargin) {
  if (root.children) {
    const links = [];
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
      !child.data?.leaves && links.push(
        createPath(
          `${child.id}toParent`,
          child.data.x,
          child.data.x,
          child.data.y - child.data.height / 2,
          child.data.y - child.data.height / 2 + yMargin,
        ),
      );
      links.push(...createLinks(child, xMargin, yMargin));
    }
    return links;
  } else if (root.data?.leaves) {
    return createDummyLinks(root, xMargin, yMargin);
  } else {
    return [];
  }
}

//ダミーノードないのリンクを作成する関数
function createDummyLinks(dummyNode, xMrgin, yMargin) {
  if (dummyNode.data?.leaves) {
    const links = [];
    const data = dummyNode.data;
    const { leaves, x, y, height, width } = dummyNode.data;
    const left = x - width / 2 + xMrgin / 2;
    const right = x + width / 2 - xMrgin / 2;
    if (data?.rows === data?.leavesNum) {//1列の時
      const bottom = leaves.reduce((acc, [node]) => {
        return Math.max(acc, node.y);
      }, -Infinity);
      links.push(createPath(`${dummyNode.id}Horizon`, left, x, y - height / 2, y - height / 2));
      links.push(createPath(`${dummyNode.id}Verticl`, left, left, y - height / 2, bottom));
      for (const [node] of leaves) {
        links.push(createPath(`${node.name}Horizon`, node.x - node.width / 2, node.x, node.y, node.y));
      }
    } else if (data.rows === 1) {//1行の時
      const left = mostLeftXInrow(leaves[0]);
      const right = mostRightXInrow(leaves[0]);
      links.push(createPath(`${dummyNode.id}Horizon`, left, right, y - height / 2, y - height / 2));
      for (const node of leaves[0]) {
        links.push(createPath(`${node.name}toParent`, node.x, node.x, y - height / 2, node.y - node.height / 2 + yMargin));
      }
    } else {//複数行複数列の時
      const isRightOfParentCenter =
        data.x +
        data.width / 2 -
        data.leaves[0][data.leaves[0].length - 1].width / 2 >
        dummyNode.parent.data.x;
      leaves.forEach((row, rowIndex) => {
        const isEven = rowIndex % 2 === 0;
        let ty = row[0].y - row[0].height / 2;
        if (rowIndex === 0) {
          links.push(createPath(`${dummyNode.id}Horizon${rowIndex}`, isRightOfParentCenter ? mostLeftXInrow(row) : left, isRightOfParentCenter ? right : mostRightXInrow(row), ty, ty));
          links.push(createPath(`${dummyNode.id}verticle${rowIndex}`, isRightOfParentCenter ? right : left, isRightOfParentCenter ? right : left, ty, leaves[1][0].y - leaves[1][0].height / 2));
        } else if (rowIndex === leaves.length - 1) {
          (isRightOfParentCenter && isEven || !isRightOfParentCenter && !isEven) ?
            links.push(createPath(`${dummyNode.id}Horizon${rowIndex}}`, left, mostRightXInrow(row), ty, ty)) :
            links.push(createPath(`${dummyNode.id}Horizon${rowIndex}}`, mostLeftXInrow(row), right, ty, ty));
        } else {
          links.push(createPath(`${dummyNode.id}Horizon${rowIndex}`, left, right, ty, ty));
          (isRightOfParentCenter && isEven || !isRightOfParentCenter && !isEven) ?
            links.push(createPath(`${dummyNode.id}verticle${rowIndex}`, right, right, ty, leaves[rowIndex + 1][0].y - leaves[rowIndex + 1][0].height / 2)) :
            links.push(createPath(`${dummyNode.id}verticle${rowIndex}`, left, left, ty, leaves[rowIndex + 1][0].y - leaves[rowIndex + 1][0].height / 2));
        }
        row.forEach((node) => {
          links.push(createPath(`${node.name}Parent`, node.x, node.x, node.y - node.height / 2, node.y - node.height / 2 + yMargin));
        });
      });
    }
    return links;
  } else {
    return [];
  }
}

//ダミーノードで指定された行の一番左のx座標を返す関数
function mostLeftXInrow(rowArray) {
  return rowArray.reduce((acc, item) => Math.min(acc, item.x), Infinity);
}

//ダミーノードで指定された行の一番右のx座標を返す関数
function mostRightXInrow(rowArray) {
  return rowArray.reduce((acc, item) => Math.max(acc, item.x), -Infinity);
}


export function layout(data, width, height) {
  // const nodeWidth = 1000;
  // const nodeHeight = 500;
  const xMargin = 200;
  const yMargin = 200;
  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);

  let root = stratify(data);
  const dummyData = createDammuy(root, xMargin, yMargin);
  initDammyData(dummyData);
  root = stratify(dummyData);
  addMargin(root, xMargin, yMargin);
  root = stratify(vanderploeg(root, stratify));
  root = localFoldingLayout(root, width / height, xMargin, yMargin, stratify);
  const layoutedData = undoDummyNode(root, xMargin);
  const links = createLinks(root, xMargin, yMargin);
  root = stratify(layoutedData);
  format(root, xMargin, yMargin);


  // // normalize
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
  };
}
