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
function vanderPloeg(root) {
  let leftSiblings = [];
  for (const child of root.children) {
    vanderPloeg(child);
    separate(leftSiblings, child);
  }
  //rootの位置設定
}

function separate(leftSiblings, currentSubtree) {
  currentRightCounturNode = rightmostSiblingNode(leftSiblings);
  currentLeftCounturNode = currentSubtree;
  while(currentRightCounturNode !== null && currentLeftCounturNode !== null) {
    let xl = currentLeftCounturNode.x;
    let xr = currentRightCounturNode.x;
    if(xl < xr) {
      xl = xr;
    }
    yl = currentLeftCounturNode.y;
    yr = currentRightCounturNode.y;
    if(yl <= yr) {

    }
  }
}

//兄弟の右端を返す関数
function rightmostSiblingNode(siblings) {
  let rightMost = siblings[0];
  for (let i = 1; i < siblings.length; i++) {
    rightMost = rightMost.x < siblings[i].x ? siblings[i] : rightMost;
  }
  return rightMost;
}

function leftMostSiblingNode(siblings) {
  let leftMost = siblings[0];
  for (let i = 1; i < siblings.length; i++) {
    leftMost = leftMost.x > siblings[i].x ? siblings[i] : leftMost;
  }
  return leftMost;
}

//引数counturに右輪郭ノードを格納する関数
function rightCountur(root, rightMostNode, countur) {
  countur.push(rightMostNode);
  if (rightMostNode.children) {
    rightCountur(root, rightmostSiblingNode(rightMostNode.children), countur);
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if ((countur[countur.length - 1].y + countur[countur.length - 1].height < node.y + node.height) && (kouho === null || kouho.y >= node.y && kouho.x <= node.x || countur[countur.length - 1].y + countur[countur.length - 1].height < kouho.y && countur[countur.length - 1].y + countur[countur.length - 1].height > node.y)) {
        kouho = node;
      }
    }
    kouho ? rightCountur(root, kouho, countur) : kouho;
  }
}

//引数counturに左輪郭ノードを格納する関数
function leftCountur(root, leftMostNode, countur) {
  countur.push(leftMostNode);
  if (leftMostNode.children) {
    leftCountur(root, leftMostSiblingNode(leftMostNode.children), countur);
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if ((countur[countur.length - 1].y + countur[countur.length - 1].height < node.y + node.height) && (kouho === null || kouho.y >= node.y && kouho.x >= node.x || countur[countur.length - 1].y + countur[countur.length - 1].height < kouho.y && countur[countur.length - 1].y + countur[countur.length - 1].height > node.y)) {
        kouho = node;
      }
    }
    kouho ? leftCountur(root, kouho, countur) : kouho;
  }
}


//ダミーノードを含んだ根付き木で、それぞれのノードの横幅・縦幅を設定
function initRoot(root, w, h, xMargin, yMargin, dummyLeaves) {
  root.width = w + xMargin;
  root.height = root.data.dummy ? dummyLeaves[root.id].length * (h + yMargin) : h + yMargin;
  if (root.children) {
    for (let child of root.children) {
      initRoot(child, w, h, xMargin, yMargin, dummyLeaves);
    }
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
  // initRoot(root, nodeWidth, nodeHeight, xMargin, yMargin, dummyLeaves);
  const tree = d3
    .tree()
    .size([width, height])
    .nodeSize([nodeWidth + xMargin, nodeHeight + yMargin])
    .separation(() => 1);
  tree(root);

  let rightCounturList = [];
  let leftCounturList= [];
  // rightCountur(root, rightmostSiblingNode(root.children), rightCounturList);
  leftCountur(root, leftMostSiblingNode(root.children), leftCounturList);
  console.log(leftCounturList);




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
