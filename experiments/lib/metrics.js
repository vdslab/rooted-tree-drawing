/**
 * evaluationブランチの src/evaluation_variance.js の calcarea / calcSumNodesArea
 * と同一の計算(出典: git show evaluation:src/evaluation_variance.js)。
 * layout()が返す最終的な nodes 配列だけから、レイアウト自体の
 * バウンディングボックス面積(目標キャンバスへの正規化後の値)を使う。
 */

/**
 * @param {Array<{x:number,y:number,width:number,height:number}>} nodes
 */
export function calcBoundingBoxArea(nodes) {
  const left = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const right = Math.max(...nodes.map((n) => n.x + n.width / 2));
  const top = Math.min(...nodes.map((n) => n.y - n.height / 2));
  const bottom = Math.max(...nodes.map((n) => n.y + n.height / 2));
  return (right - left) * (bottom - top);
}

/**
 * @param {Array<{width:number,height:number}>} nodes
 */
export function calcSumNodesArea(nodes) {
  return nodes.reduce((acc, cur) => {
    const width = typeof cur.width === "number" ? cur.width : 0;
    const height = typeof cur.height === "number" ? cur.height : 0;
    return acc + width * height;
  }, 0);
}

/**
 * TNA/DA(Total Node Area / Drawing Area)
 *
 * DA(描画領域)は、実際に描画されたノード群の外接矩形(calcBoundingBoxArea)ではなく、
 * 指定領域(width x height)そのものを使う。layout()の正規化はアスペクト比を保ったまま
 * 指定領域に収める(レターボックス)ため、外接矩形を使うと「指定領域のどちらかの辺を
 * 使い切れていない」という無駄がTNA/DAに反映されず、実際より高いスコアになってしまう。
 */
export function tnaDa(nodes, width, height) {
  return calcSumNodesArea(nodes) / (width * height);
}
