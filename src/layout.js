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
    data.push({ "name": root.data.name + "leaves", "parent": root.data.name, "leaves": dummy, "columns": 1 });
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
      child.data.y = root.data.y + root.data.height / 2 + child.data.height / 2;
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
    let xl = currentLeftCounturNode[l].data.x - currentLeftCounturNode[l].data.width / 2;
    let xr = currentRightCounturNode[r].data.x + currentRightCounturNode[r].data.width / 2;
    if (xl + diffSum < xr) {
      const diff = xr - xl - diffSum;
      diffSum += diff;
    }
    let yl = currentLeftCounturNode[l].data.y + currentLeftCounturNode[l].data.height / 2;
    let yr = currentRightCounturNode[r].data.y + currentRightCounturNode[r].data.height / 2;
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
    rightMost = rightMost.data.x + rightMost.data.width / 2 < children[i].data.x + children[i].data.width / 2 ? children[i] : rightMost;
  }
  return rightMost;
}

//兄弟の左端を返す関数
function leftMostSiblingNode(children) {
  let leftMost = children[0];
  for (let i = 1; i < children.length; i++) {
    leftMost = leftMost.data.x - leftMost.data.width / 2 > children[i].data.x - children[i].data.width / 2 ? children[i] : leftMost;
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
      if ((rightMostNode.data.y + rightMostNode.data.height / 2 < node.data.y + node.data.height / 2) && (kouho === null || kouho.data.y - kouho.data.width / 2 >= node.data.y - node.data.width / 2 && kouho.data.x + kouho.data.width / 2 <= node.data.x + node.data.width / 2 || rightMostNode.data.y + rightMostNode.data.heigh / 2 < kouho.data.y - kouho.data.heigh / 2 && rightMostNode.data.y - rightMostNode.data.height / 2 > kouho.data.y - kouho.data.heigh / 2)) {
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
      if ((leftMostNode.data.y + leftMostNode.data.height / 2 < node.data.y + node.data.height / 2) && (kouho === null || kouho.data.y - kouho.data.width / 2 >= node.data.y - node.data.width / 2 && kouho.data.x - kouho.data.width / 2 >= node.data.x - node.data.width / 2 || leftMostNode.data.y + leftMostNode.data.heigh / 2 < kouho.data.y - kouho.data.heigh / 2 && leftMostNode.data.y - leftMostNode.data.height / 2 > kouho.data.y - kouho.data.heigh / 2)) {
        kouho = node;
      }
    }
    countur = kouho ? [leftMostNode, ...leftCountur(root, kouho)] : [leftMostNode];
    return countur;
  }
}

//ダミーノードを含んだ根付き木で、それぞれのノードの横幅・縦幅を設定
function initRoot(root, w, h, xMargin, yMargin) {
  root.data.width = root.data.leaves ? root.data.columns * (w + xMargin) : w + xMargin;
  root.data.height = root.data.leaves ? Math.ceil(root.data.leaves.length / root.data.columns) * (h + yMargin) : h + yMargin;
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;;
  if (root.children) {
    for (let child of root.children) {
      initRoot(child, w, h, xMargin, yMargin);
    }
  }
}

//余白を取り除く関数
function format(root, xMargin, yMargin) {
  for (let node of root.descendants()) {
    node.x = node.data.x;
    node.y = node.data.y;
    node.width = node.data.width - xMargin * 2;
    node.height = node.data.height - yMargin * 2;
  }
}

//リンクを作る関数
function createLinks(root, xMargin, yMargin) {
  let links = [];
  for (const link of root.links()) {
    links.push(
      {
        id: `${link.source.id}toChild${link.target.id}`,
        segments: [
          [link.source.x, link.source.y + link.source.height / 2],
          [link.source.x, link.source.y + link.source.height / 2 + yMargin],
        ]
      },
      {
        id: `${link.source.id}:${link.target.id}`,
        segments: [
          [link.source.x, link.source.y + link.source.height / 2 + yMargin],
          [link.target.x, link.target.y - link.target.height / 2 - yMargin],
        ]
      },
      {
        id: `${link.target.id}toParent${link.source.id}`,
        segments: [
          [link.target.x, link.target.y - link.target.height / 2],
          [link.target.x, link.target.y - link.target.height / 2 - yMargin],
          
        ]
      },
    );
  }
  return links;
}

//底辺のノードを返す関数
function searchBottomNode(root) {
  let descendants = root.descendants();
  let max = 0;
  for (let i = 1; i < descendants.length; i++) {
    max = descendants[max].data.y + descendants[max].data.height / 2 < descendants[i].data.y + descendants[i].data.height / 2 ? i : max;
  }
  return descendants[max];
}

//アスペクト比を返す関数
function calcAspectRatio(root) {
  const left = d3.min(root.descendants(), (node) => node.data.x - node.data.width / 2);
  const right = d3.max(root.descendants(), (node) => node.data.x + node.data.width / 2);
  const top = d3.min(root.descendants(), (node) => node.data.y - node.data.height / 2);
  const bottom = d3.max(root.descendants(), (node) => node.data.y + node.data.height / 2);
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  return layoutWidth / layoutHeight;
}

//アスペクト比が最適になるまで底辺ノードの列数を増やす関数
function localFoldingLayout(root, at, w, h, xMargin, yMargin, stratify) {
  let a = calcAspectRatio(root);
  while (at > a) {
    const bottomNode = searchBottomNode(root);
    if (bottomNode.data.leaves && bottomNode.data.columns < bottomNode.data.leaves.length) {
      bottomNode.data.columns += 1;
      // bottomNode.data.width += w + xMargin;
      // bottomNode.data.height = Math.ceil(bottomNode.data.leaves.length / root.data.columns) * (h + yMargin);
      initRoot(root, w, h, xMargin, yMargin);
      root = stratify(vanderploeg(root, stratify));
      a = calcAspectRatio(root);
    } else {
      break;
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
  initRoot(root, nodeWidth, nodeHeight, xMargin, yMargin);
  // const tree = d3
  //   .tree()
  //   .size([width, height])
  //   .nodeSize([nodeWidth + xMargin, nodeHeight + yMargin])
  //   .separation(() => 1);
  // tree(root);

  const newData = vanderploeg(root, stratify);
  root = stratify(newData);
  localFoldingLayout(root, width / height, nodeWidth, nodeHeight, xMargin, yMargin, stratify);
  root = stratify(vanderploeg(root, stratify));
  format(root, xMargin, yMargin);


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
    node.width = node.width * scale;
    node.height = node.height * scale;
  }

  const links = createLinks(root, xMargin * scale, yMargin * scale);

  return {
    nodes: root.descendants().map(({ id, x, y, width, height }) => {
      return { id, x, y, width, height };
    }),
    links: links
  };
}
