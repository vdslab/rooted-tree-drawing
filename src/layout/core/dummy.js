/**
 * ダミーノード(兄弟の葉群をまとめた仮想ノード)の生成・サイズ計算・マージン付与。
 *
 * SA / LPT / binpacking の3手法で共有する。既存手法(Misue)は別系統の
 * ダミー処理を持つため、ここは使わない。
 *
 * addMargin の skipInnerNodes だけは手法で挙動が違う(下記コメント参照)。
 */

export function createDammuy(root, xMargin, yMargin, innerYMargin) {
  if (root.children) {
    const data = [{ ...root.data, x: 0, y: 0 }];
    const dummyLesaves = [];
    for (const child of root.children) {
      const childData = createDammuy(child, xMargin, yMargin, innerYMargin);

      //childDataが葉だったら
      if (childData.length == 1) {
        const childObj = childData[0];
        childObj.width += xMargin;
        childObj.height += innerYMargin * 2;
        childObj.isInner = true; // 識別フラグ
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
        columns: 1, // 列管理:初期は1列(縦長から開始)
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

export function initDammyData([...dummyData]) {
  return (
    dummyData.map((item) => {
      if (item?.leaves) {
        item.leaves = [item.leaves];
      }
      return item;
    })
  );
}

export function setDummyNodeSize(leaves, xMargin, yMargin, innerYMargin) {
  return {
    width: calcDummyDataWidth(leaves, xMargin),
    height: calcDummyNodeHeight(leaves, yMargin, innerYMargin)
  };
}

/**
 * ダミーノードの幅。
 *
 * 各列の幅は既に w' = w + xMargin（createDammuy が葉に xMargin を加算済み）なので、
 * 列を w' ピッチで並べた合計がそのまま内容の幅になる。最後の + xMargin は
 * van der Ploeg に渡すための補正（Misue 2024 §4.5「ノード幅に s_h を足す」）。
 *
 * 列ピッチ w' は Misue 2024 の式(3)(5)そのもので、列間に追加の間隔は取らない。
 * 「提案手法は列ごとに縦のバス線を引くのだから、Misue が行間で間隔を 2s_v に
 * 倍化している（§4.3.3）のと同様に横も広げるべきでは」という疑問が出るが、
 * バス線の周りの余白を**リード線の長さを単位に**測ると倍化は不要と分かる:
 *
 *   Misue の行間バス : リード線 s_v   / バス線の片側 s_v   = リード線1本分（§5.1 Fig 7(a)）
 *   提案手法の列間バス: リード線 s_h/2 / バス線の片側 s_h/2 = リード線1本分（§5.1 Fig 7(b)）
 *
 * どちらも「バス線はギャップの中央、両側にリード線1本分」で一致する。論文が縦だけ
 * 倍化して見えるのは、水平リード線を s_h/2（垂直 s_v の半分）と定めているため。
 * 経緯と却下した他案は docs/decisions/2026-09-column-pitch-misue.md。
 *
 * **render.js の列ピッチ（tx += colWidth）と対で直すこと。片方だけだとノードが重なる。**
 */
export function calcDummyDataWidth(leaves, xMargin) {
  let totalWidth = 0;
  for (const colLeaves of leaves) {
    const maxWidthInCol = colLeaves.reduce((max, node) => Math.max(max, node.width || 0), 0);
    totalWidth += maxWidthInCol;
  }
  return totalWidth + xMargin;
}

export function calcDummyNodeHeight(leaves, yMargin, innerYMargin) {
  let maxHeight = 0;
  for (const colLeaves of leaves) {
    const colHeight = colLeaves.reduce((sum, node) => sum + (node.height || 0), 0);
    maxHeight = Math.max(maxHeight, colHeight);
  }
  return maxHeight + yMargin * 2 + innerYMargin;
}

export function setDummyMargin(root, xMargin, yMargin, innerYMargin) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin, innerYMargin)
    };
  }
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;
  if (root?.children) {
    for (const child of root.children) {
      setDummyMargin(child, xMargin, yMargin, innerYMargin);
    }
  }
}

export function to1D(leaves) {
  return leaves.flat();
}

/**
 * 全ノードにマージンを付与し、初期座標を設定する。
 *
 * skipInnerNodes: ダミーノード内部の葉(isInner)にマージンを付けないか。
 *   - binpacking: true。isInner には createDammuy が既に innerYMargin を付けているため、
 *     ここで重ねると二重になる(コミット 16953df「兄弟を待たない葉ノードのmarginを修正」)。
 *   - SA / LPT: false。この修正が入る前の実装で論文の実験値を出しており、
 *     true にすると出力が変わる(test/golden.mjs で24ケース中12件が変化する)ため、
 *     当時の挙動を保つ。修正を取り込むかは実験の再取得とセットで判断すること。
 */
export function addMargin(root, xMargin, yMargin, innerYMargin, skipInnerNodes = true) {
  if (root.data?.leaves) {
    root.data = {
      ...root.data, ...setDummyNodeSize(root.data.leaves, xMargin, yMargin, innerYMargin)
    };
  } else if (!skipInnerNodes || !root.data.isInner) {
    root.data.width = root.data.width + xMargin;
    root.data.height = root.data.height + yMargin * 2;
  }
  root.data.x = root.data.width / 2;
  root.data.y = root.data.height / 2;
  if (root?.children) {
    for (const child of root.children) {
      addMargin(child, xMargin, yMargin, innerYMargin, skipInnerNodes);
    }
  }
}
