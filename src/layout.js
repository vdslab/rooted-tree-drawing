import * as d3 from "d3";
//折りたたみレイアウト実装する関数
function areaAdaptive(root, data, dummyLeaves) {
  return createDammuy(root, data, dummyLeaves);
}

//同じ親のを持つ葉群でダミーノードを作る関数
function createDammuy(root, data, dummyLeaves) {
  let dummy = [];
  for (const child of root.children) {
    if (child.children) {
      data = createDammuy(child, data, dummyLeaves);
    } else {
      data = data.filter(item => item.name != child.data.name)
      dummy.push(child)
    }
  }
  if (dummy.length > 0) {
    dummyLeaves[root.data.name + "leaves"] = dummy;
    data.push({ "name": root.data.name + "leaves", "parent": root.data.name, "dummy": true });
  }
  return data;
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
      child.data.y = root.data.y + root.data.height;
      currentData.push(...vanderploeg(child, startify));
      currentTree = startify(currentData);
      leftSiblings = startify(leftData);
      const move = separate(leftSiblings.children ? rightCountur(leftSiblings, rightMostSiblingNode(leftSiblings.children)) : [], leftCountur(currentTree, leftMostSiblingNode(currentTree.children)));
      for (let item of currentData) {
        item.x += move;
      }
      currentData.shift();
      leftData.push(...currentData);
    }
    leftSiblings = startify(leftData);
    leftData[0].x = (leftMostSiblingNode(leftSiblings.children).data.x + rightMostSiblingNode(leftSiblings.children).data.x) / 2;
    leftData[0].parent = t;
    return leftData;
  } else {
    return [{ ...root.data }];
  }
}

//左の兄弟ツリーに現在のサブツリーを、左からくっつけるための最小移動距離を返す関数
function separate(leftSiblings, currentSubtree) {
  let currentRightCounturNode = leftSiblings;
  let currentLeftCounturNode = currentSubtree;
  let l = 0;
  let r = 0;
  let diffSum = 0;
  while (currentRightCounturNode[r] && currentLeftCounturNode[l]) {
    // debugger;
    let xl = currentLeftCounturNode[l].data.x;
    let xr = currentRightCounturNode[r].data.x + currentRightCounturNode[r].data.width;
    if (xl + diffSum < xr) {
      const diff = xr - xl - diffSum;
      diffSum += diff;
    }
    let yl = currentLeftCounturNode[l].data.y + currentLeftCounturNode[l].data.height;
    let yr = currentRightCounturNode[r].data.y + currentRightCounturNode[r].data.height;
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
function rightMostSiblingNode(siblings) {
  let rightMost = siblings[0];
  for (let i = 1; i < siblings.length; i++) {
    rightMost = rightMost.data.x < siblings[i].data.x ? siblings[i] : rightMost;
  }
  return rightMost;
}
//兄弟の左端を返す関数
function leftMostSiblingNode(siblings) {
  let leftMost = siblings[0];
  for (let i = 1; i < siblings.length; i++) {
    leftMost = leftMost.data.x > siblings[i].data.x ? siblings[i] : leftMost;
  }
  return leftMost;
}

//rightMostNodeからの右輪郭ノードを返す関数
function rightCountur(root, rightMostNode) {
  let countur;
  if (rightMostNode.children) {
    countur = [rightMostNode, ...rightCountur(root, rightMostSiblingNode(rightMostNode.children))];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if ((rightMostNode.data.y + rightMostNode.data.height < node.data.y + node.data.height) && (kouho === null || kouho.data.y >= node.data.y && kouho.data.x <= node.data.x || rightMostNode.data.y + rightMostNode.data.height < kouho.data.y && rightMostNode.data.y + rightMostNode.data.height > node.data.y)) {
        kouho = node;
      }
    }
    countur = kouho ? [rightMostNode, ...rightCountur(root, kouho)] : [rightMostNode];
    return countur;
  }
}

//leftMostNodeからの左輪郭ノードを返す関数
function leftCountur(root, leftMostNode) {
  let countur;
  if (leftMostNode.children) {
    countur = [leftMostNode, ...leftCountur(root, leftMostSiblingNode(leftMostNode.children))];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if ((leftMostNode.data.y + leftMostNode.data.height < node.data.y + node.data.height) && (kouho === null || kouho.data.y >= node.data.y && kouho.data.x >= node.data.x || leftMostNode.data.y + leftMostNode.data.height < kouho.data.y && leftMostNode.data.y + leftMostNode.data.height > node.data.y)) {
        kouho = node;
      }
    }
    countur = kouho ? [leftMostNode, ...leftCountur(root, kouho)] : [leftMostNode];
    return countur;
  }
}




//ダミーノードを含んだ根付き木で、それぞれのノードの横幅・縦幅を設定
function initRoot(root, w, h, xMargin, yMargin, dummyLeaves) {
  root.data.width = (w + xMargin);
  root.data.height = root.data.dummy ? dummyLeaves[root.id].length * (h + yMargin) : h + yMargin;
  root.data.x = 0;
  root.data.y = 0;
  if (root.children) {
    for (let child of root.children) {
      initRoot(child, w, h, xMargin, yMargin, dummyLeaves);
    }
  }
}

function format(root) {
  for(let node of root.descendants())  {
    node.x = node.data.x;
    node.y = node.data.y;
    node.width = node.data.width;
    node.height = node.data.height;
  }
}

export function layout(data, width, height) {
  const nodeWidth = 1000;
  const nodeHeight = 500;
  const xMargin = 50;
  const yMargin = 200;
  const stratify = d3
    .stratify()
    .id((d) => d.name)
    .parentId((d) => d.parent);

  // 仮のレイアウト


  let root = stratify(data);
  let dummyData = [...data];
  let dummyLeaves = {};
  dummyData = areaAdaptive(root, dummyData, dummyLeaves);
  root = stratify(dummyData);
  initRoot(root, nodeWidth, nodeHeight, xMargin, yMargin, dummyLeaves);
  // const tree = d3
  //   .tree()
  //   .size([width, height])
  //   .nodeSize([nodeWidth + xMargin, nodeHeight + yMargin])
  //   .separation(() => 1);
  // tree(root);

  const newData = vanderploeg(root, stratify);
  root = stratify(newData);
  format(root);


  // normalize
  const left = d3.min(root.descendants(), (node) => node.x - nodeWidth / 2);
  const right = d3.max(root.descendants(), (node) => node.x + nodeWidth / 2);
  const top = d3.min(root.descendants(), (node) => node.y - node.height / 2);
  const bottom = d3.max(root.descendants(), (node) => node.y + node.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  const scale = Math.min(width / layoutWidth, height / layoutHeight);
  for (const node of root.descendants()) {
    node.x = (node.x - left - layoutWidth / 2) * scale + width / 2;
    node.y = (node.y - top - layoutHeight / 2) * scale + height / 2;
    node.width = nodeWidth * scale;
    node.height = node.height * scale;
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
