import * as d3 from "d3";
//折りたたみレイアウト実装する関数
function areaAdaptive(root) {
  return createDammuy(root);
}

//同じ親のを持つ葉群でダミーノードを作る関数
// function createDammuy(root, data) {
//   let dummy = [];
//   for (const child of root.children) {
//     if (child.children) {
//       data = createDammuy(child, data);
//     } else {
//       data = data.filter(item => item.name != child.id);
//       dummy.push(child.data);
//     }
//   }
//   if (dummy.length > 0) {
//     data.push({ "name": root.data.name + "leaves", "parent": root.data.name, "leaves": dummy, "columns": 1 });
//   }
//   return data;
// }

function createDammuy(root) {
  if (root.children) {
    let data = [{ ...root.data }];
    let dummyLesaves = []
    let dummyData = []
    for (const child of root.children) {
      // debugger;
      const childData = createDammuy(child);
      childData.length <= 1 ? dummyLesaves.push(...childData) : dummyData.push(...childData);
    }
    dummyLesaves.length <= 1 ? data.push(...dummyLesaves) : data.push({ "name": root.data.name + "leaves", "parent": root.data.name, "leaves": dummyLesaves, "columns": 1 });
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
      const move = separate(leftSiblings.children ? rightCountur(leftSiblings, rightMostSiblingNode(leftSiblings.children)) : [], leftCountur(currentTree, leftMostSiblingNode(currentTree.children)));
      for (let item of currentData) {
        item.x += move;
      }
      currentData.shift();
      leftData.push(...currentData);
    }
    leftSiblings = startify(leftData);
    const leftMostNode = leftMostSiblingNode(leftSiblings.children);
    const rightMostNode = rightMostSiblingNode(leftSiblings.children);
    leftData[0].x = (leftMostNode.data.x - leftMostNode.data.width / 2  + rightMostNode.data.x + rightMostNode.data.width / 2) / 2;
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
  root.data.width = root.data.leaves ? root.data.columns * (w + xMargin * 2) : w + xMargin * 2;
  root.data.height = root.data.leaves ? Math.ceil(root.data.leaves.length / root.data.columns) * (h + yMargin * 2) : h + yMargin * 2;
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

// function createLinks(root, nodeWidth, nodeHeight, xMargin, yMargin) {
//   if (root.children) {
//     let links = [];
//     const leftMostNode = leftMostSiblingNode(root.children);
//     const rightMostNode = rightMostSiblingNode(root.children);
//     // debugger;
//     links.push(
//       {
//         id: `${root.id}toChild`,
//         segments: [
//           [root.data.x, root.data.y],
//           [root.data.x, root.data.y + nodeHeight / 2 + yMargin],
//         ]
//       },
//       {
//         id: `${root.id}Horizon`,
//         segments: [
//           [leftMostNode.data.x, root.data.y + nodeHeight / 2 + yMargin],
//           [rightMostNode.data.x, root.data.y + nodeHeight / 2 + yMargin],
//         ]
//       },
//     );
//     for (const child of root.children) {
//       links.push(...createLinks(child, nodeWidth, nodeHeight, xMargin, yMargin));
//       // if (child.data.columns) {
//       //   if (child.data.colums === 1) {
//       //     data.push(child.data.width / 2 + child.data.x <= root.data.x ?
//       //     {
//       //       id: `${child.id}dummyStart`,
//       //       segments: [
//       //         [child.data.x, child.data.y + child.data.height / 2] ,
//       //         [child.data.x, child.data.y + child.data.height / 2 + yMargin],
//       //       ]
//       //     } :

//       //   )
//       //   } else if (child.data.columns === child.data.leaves.length) {
//       //   } else {

//       //   }
//       // }
//     }
//     return links;
//   } else {
//     return [];
//   }
// }

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
      initRoot(root, w, h, xMargin, yMargin);
      root = stratify(vanderploeg(root, stratify));
      a = calcAspectRatio(root);
    } else {
      break;
    }
  }
  return root;
}

//ダミーノードを元に戻す
function undoDummyNode(root, w, h, xMargin, yMargin) {
  const data = root.descendants().flatMap((node) => {
    if (node.data.leaves) {
      return node.data.leaves.map((leaf, j) => {
        leaf.width = w + xMargin * 2;
        leaf.height = h + yMargin * 2;
        leaf.x = Math.trunc(j / node.data.columns) % 2 === 0 ? leaf.width / 2 + (j % node.data.columns) * leaf.width + node.data.x - node.data.width / 2 : (node.data.columns - 1) * leaf.width + leaf.width / 2 - (j % node.data.columns) * leaf.width + node.data.x - node.data.width / 2;
        leaf.y = leaf.height / 2 + Math.trunc(j / node.data.columns) * leaf.height + node.data.y - node.data.height / 2;
        return leaf;
      });
    } else {
      return [node.data];
    }
  });

  return data;
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
  // const tree = d3
  //   .tree()
  //   .size([width, height])
  //   .nodeSize([nodeWidth + xMargin, nodeHeight + yMargin])
  //   .separation(() => 1);
  // tree(root);

  let root = stratify(data);
  let dummyData = [];
  dummyData = areaAdaptive(root);
  console.log(dummyData);
  root = stratify(dummyData);
  initRoot(root, nodeWidth, nodeHeight, xMargin, yMargin);

  root = stratify(vanderploeg(root, stratify));
  root = localFoldingLayout(root, width / height, nodeWidth, nodeHeight, xMargin, yMargin, stratify);
  // const links = createLinks(root, nodeWidth, nodeHeight, xMargin, yMargin);
  root = stratify(undoDummyNode(root, nodeWidth, nodeHeight, xMargin, yMargin));
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

  const links =  createLinks(root, xMargin * scale, yMargin * scale);

  // const scaledLinks = links.map((link) => {
  //   const originalLink = JSON.parse(JSON.stringify(link));
  //   console.log('Before scaling:', originalLink);

  //   // スケーリング処理
  //   link.segments[0][0] *= scale;
  //   link.segments[0][1] *= scale;
  //   link.segments[1][0] *= scale;
  //   link.segments[1][1] *= scale;

  //   // スケーリング後の状態をログに出力
  //   console.log('After scaling:', link);
  //   return link;
  // })


  return {
    nodes: root.descendants().map(({ id, x, y, width, height }) => {
      return { id, x, y, width, height };
    }),
    links: links
  };
}
