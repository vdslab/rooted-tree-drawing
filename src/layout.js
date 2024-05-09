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
// function vanderPloeg(root, y) {
//   let leftSiblings = {};
//   leftSiblings = { ...root };
//   let rCountur = [];
//   let lCountur = [];
//   if (root.children) {
//     leftSiblings.children = [];
//     for (const child of root.children) {
//       let currentTree = vanderPloeg(child, root.y + root.height);
//       leftCountur(child, currentTree, lCountur);
//       rightCountur(leftSiblings, root, rCountur);
//       separate(rCountur, lCountur, currentTree);
//       leftSiblings.children.push(currentTree);
//       leftSiblings = d3.stratify(leftSiblings.descendants());
//     }
//     //rootの位置設定
//     leftSiblings.x = leftSiblings.children ? (rightmostSiblingNode(leftSiblings.children) + leftMostSiblingNode(leftSiblings.children)) / 2 : leftSiblings.x;
//   }
//   return leftSiblings;
// }

function vanderploeg(root, startify) {
  if (root.children) {
    let data = [root.data];
    let leftSiblings;
    let currentTree;
    for (const child of root.children) {
      child.y = root.y + root.height;
      data.push(vanderploeg(child, startify).data);
      currentTree = startify(data);
      separate()
    }
    return data;
  } else {
    return root.data;
  }
}

function separate(leftSiblings, currentSubtree, currentTree) {
  let currentRightCounturNode = leftSiblings;
  let currentLeftCounturNode = currentSubtree;
  let l = 0;
  let r = 0;
  while (currentRightCounturNode[r] && currentLeftCounturNode[l]) {
    console.log(currentLeftCounturNode[l]);
    let xl = currentLeftCounturNode[l].x;
    let xr = currentRightCounturNode[r].x;
    if (xl < xr) {
      for (let node of currentTree.descendants()) {
        node.x += xr - xl;
      }
    }
    let yl = currentLeftCounturNode[l].y + currentLeftCounturNode[l].height;
    let yr = currentRightCounturNode[r].y + currentRightCounturNode[r].height;
    if (yl <= yr) {
      l += 1;
    }
    if (yl >= yr) {
      r += 1;
    }
  }
}

//兄弟の右端を返す関数
function rightMostSiblingNode(siblings) {
  let rightMost = siblings[0];
  for (let i = 1; i < siblings.length; i++) {
    rightMost = rightMost.x < siblings[i].x ? siblings[i] : rightMost;
  }
  return rightMost;
}
//兄弟の左端を返す関数
function leftMostSiblingNode(siblings) {
  let leftMost = siblings[0];
  for (let i = 1; i < siblings.length; i++) {
    leftMost = leftMost.x > siblings[i].x ? siblings[i] : leftMost;
  }
  return leftMost;
}

// //引数counturに右輪郭ノードを格納する関数
function rightCountur(root, rightMostNode) {
  debugger;
  let countur;
  if (rightMostNode.chidlren) {
     countur = [rightMostNode, ...rightCountur(root, rightMostSiblingNode(rightMostNode.children))];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if ((rightMostNode.y + rightMostNode.height < node.y + node.height) && (kouho === null || kouho.y >= node.y && kouho.x <= node.x || rightMostNode.y + rightMostNode.height < kouho.y && rightMostNode.y + rightMostNode.height > node.y)) {
        kouho = node;
      }
    }
    countur = kouho ? [rightMostNode, ...rightCountur(root, kouho)] : [rightMostNode];
    return countur;
  }
}

//引数counturに左輪郭ノードを格納する関数
function leftCountur(root, leftMostNode) {
  let countur;
  if (leftMostNode.children) {
     countur = [leftMostNode, ...leftCountur(root, leftMostSiblingNode(leftMostNode.children))];
    return countur;
  } else {
    let kouho = null;
    for (const node of root.descendants()) {
      if ((leftMostNode.y + leftMostNode.height < node.y + node.height) && (kouho === null || kouho.y >= node.y && kouho.x >= node.x || leftMostNode.y + leftMostNode.height < kouho.y && leftMostNode.y + leftMostNode.height > node.y)) {
        kouho = node;
      }
    }
    countur = kouho ? [leftMostNode, ...leftCountur(root, kouho)] : [leftMostNode];
    return countur;
  }
}




//ダミーノードを含んだ根付き木で、それぞれのノードの横幅・縦幅を設定
function initRoot(root, w, h, xMargin, yMargin, dummyLeaves) {
  root.width = w + xMargin;
  root.height = root.data.dummy ? dummyLeaves[root.id].length * (h + yMargin) : h + yMargin;
  root.x = 0;
  root.y = 0;
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
  // let dummyData = [...data];
  let dummyData = data.map((item) => {
    let newItem = { ...item };
    newItem.isDisplay = false;
    return newItem;
  })
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

  // const leftSiblings = vanderPloeg(root);

  console.log(leftCountur(root, leftMostSiblingNode(root.children)));


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
