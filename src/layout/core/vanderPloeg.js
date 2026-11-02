/**
 * van der Ploeg (2014) "Drawing non-layered tidy trees in linear time" を実装したレイアウト関数。
 *
 * 論文付録C の Java コードを1行ずつ移植している。関数名・フィールド名は付録C に合わせ、
 * 付録C の印をコメントに残す（⋆ 非レイヤード拡張、◦ 中間兄弟の均等配置、• IYL）。
 * 設計の経緯は docs/decisions/2026-10-linear-vanderploeg.md。
 *
 * 出典: A. van der Ploeg, Software: Practice and Experience 44(12), 2014, doi:10.1002/spe.2213。
 * 著者のコードは public domain（https://github.com/cwi-swat/non-layered-tidy-trees の Paper.java）。
 *
 * 座標の取り決め:
 * - 内部の x, y はノードの左端・上端（付録C と同じ）。最後に data.x / data.y（中心）へ書き戻す。
 * - 間隔は扱わない。マージンは呼び出し側が幅・高さに足してある（論文 §2）。
 *
 * y は x より先に決まる。非レイヤード木では子の上端が親の下端に等しく、
 * y は祖先だけで決まるので、根から1回たどれば済む（論文 §2）。
 *
 * x は相対座標で持つ（論文 付録A）。
 * - prelim: 部分木の中での仮の位置。各部分木は「最初の子だけをたどった先の葉の左端」を 0 として作られる。
 * - mod: その部分木全体を、親の座標系の中でどれだけ右へずらすか。
 * 絶対座標は prelim + (根から自分までの mod の合計) で、最後に secondWalk で1回だけ求める。
 * 部分木の移動が mod への1回の加算で済む。
 *
 * 輪郭は threads で辿る（論文 付録A）。子を持つノードの次の輪郭ノードは最初の子／最後の子、
 * 葉の次の輪郭ノードは葉に張った thread（tl / tr）。threads を張るのは部分木の最下端の
 * 「極端ノード」（el / er）だけで、その mod と prelim を逆向きに調整して、thread を辿ったときの
 * mod の合計が本来の経路と一致するようにする。比べる輪郭の組の総数が O(n) に収まる証明は論文 §4。
 *
 * 付録C からの変更点が1つある。最初の輪郭の組（兄弟の根どうし）は dist が負でも動かす。
 * 付録C は dist > 0 のときだけ動かすので、最初から左兄弟より右にある部分木に隙間が残り、
 * 反転した木と絵が変わっていた。著者が公開後に修正した内容で（Paper.java）、著者の条件
 * first && dist < 0 は dist がちょうど 0 のとき印が次の組へ残り重なるので、最初の組を無条件に扱う。
 * 結果として部分木の移動量は全ての組の dist の最大値になる（負でもよい）。
 *
 * spacing（◦）: 大きな兄弟に挟まれた小さい部分木を、間に均等に配る（論文 §5）。既定で有効。
 * 上の修正と合わせて美的基準5（左右反転すると鏡像になる）が成り立つ。IYL（•）はそのための
 * 兄弟番号の参照で、無効のときも論文どおり維持する（コストは子の数に比例するだけ）。
 */

/**
 * d3.hierarchy の各ノードの data.x / data.y（中心）に座標を書き込み、同じ root を返す。
 * 根の上端は呼び出し前の data.y - height/2 を保つ。
 *
 * stats を渡すと、処理した輪郭の組の数を stats.contourPairs に足す。論文 §4 の定理
 * （組の総数は 4n 以下）を実時間によらず検査するためのもの。
 */
export function vanderPloegLayout(root, { spacing = true, stats = null } = {}) {
  const tree = buildTree(root);
  const options = { spacing, stats };
  setY(tree, root.data.y - root.data.height / 2);
  firstWalk(tree, options);
  secondWalk(tree, 0, spacing);
  writeBack(tree);
  return root;
}

/**
 * 付録C の Tree に相当する作業用のノード。hierarchy 自体には作業用の値を書かない。
 * 全フィールドをここで初期化し、途中でフィールドを増やさない。
 */
function buildTree(node) {
  const { width: w, height: h } = node.data;
  // 寸法が NaN だと separate の下端の比較がどちらも偽になり、輪郭が進まず止まらなくなる
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    throw new Error(`Node "${node.id}" has a non-finite size: ${w} x ${h}`);
  }
  const c = (node.children ?? []).map(buildTree);
  return {
    node,
    w,
    h,
    x: 0,
    y: 0,
    prelim: 0,
    mod: 0,
    shift: 0, // ◦ 中間兄弟へ配る移動量（addChildSpacing で mod に反映）
    change: 0, // ◦
    tl: null, // 左 thread: 葉の次の左輪郭ノード
    tr: null, // 右 thread
    el: null, // 部分木の最下端の、左から見える極端ノード
    er: null, // 右から見える極端ノード
    msel: 0, // el までの mod の合計（この部分木の根の mod を含む）
    mser: 0, // er までの mod の合計
    c,
    cs: c.length,
  };
}

/** 根から葉へ、子の上端を親の下端に揃える。y は祖先だけで決まる。 */
function setY(t, top) {
  t.y = top;
  for (const child of t.c) setY(child, bottom(t));
}

function bottom(t) {
  return t.y + t.h;
}

/** 葉から根へ。子を左から順に置き、それぞれを左兄弟に重ならない所まで右へ押す。 */
function firstWalk(t, options) {
  if (t.cs === 0) {
    setExtremes(t);
    return;
  }
  firstWalk(t.c[0], options);
  // • 右輪郭にノードを出している左兄弟の番号と、その最下端
  let ih = updateIYL(bottom(t.c[0].el), 0, null);
  for (let i = 1; i < t.cs; i++) {
    firstWalk(t.c[i], options);
    // • separate が極端ノードを付け替える前に、子 i の最下端を取っておく
    const minY = bottom(t.c[i].er);
    separate(t, i, ih, options);
    ih = updateIYL(minY, i, ih);
  }
  positionRoot(t);
  setExtremes(t);
}

function setExtremes(t) {
  if (t.cs === 0) {
    t.el = t;
    t.er = t;
    t.msel = 0;
    t.mser = 0;
  } else {
    t.el = t.c[0].el;
    t.msel = t.c[0].msel;
    t.er = t.c[t.cs - 1].er;
    t.mser = t.c[t.cs - 1].mser;
  }
}

/**
 * 子 i の部分木を、左兄弟（子 0..i-1）と重ならない所まで右へ押す。
 *
 * 左兄弟の右輪郭（sr）と子 i の左輪郭（cl）を上から同時に辿る。それぞれ mod の合計
 * （mssr / mscl）を持ち歩き、親 t の座標系での位置を求める。
 * 下端が高い方の輪郭だけを進める（⋆ 非レイヤード拡張。下端が等しければ両方）。
 * 片方の輪郭が先に尽きたら、短い側の極端ノードから長い側へ thread を張る。
 */
function separate(t, i, ih, { spacing, stats }) {
  let sr = t.c[i - 1];
  let mssr = sr.mod;
  let cl = t.c[i];
  let mscl = cl.mod;
  let first = true;
  while (sr !== null && cl !== null) {
    if (stats) stats.contourPairs += 1;
    if (bottom(sr) > ih.lowY) ih = ih.nxt; // •
    // cl の左端が sr の右端よりどれだけ左にあるか
    const dist = mssr + sr.prelim + sr.w - (mscl + cl.prelim);
    if (first || dist > 0) {
      mscl += dist;
      moveSubtree(t, i, ih.index, dist, spacing);
    }
    first = false;
    const sy = bottom(sr);
    const cy = bottom(cl);
    if (sy <= cy) {
      // ⋆
      sr = nextRightContour(sr);
      if (sr !== null) mssr += sr.mod;
    }
    if (sy >= cy) {
      // ⋆
      cl = nextLeftContour(cl);
      if (cl !== null) mscl += cl.mod;
    }
  }
  // 子 i の方が背が高い: 左兄弟の左輪郭の続きを子 i の左輪郭へつなぐ
  if (sr === null && cl !== null) setLeftThread(t, i, cl, mscl);
  // 左兄弟の方が背が高い: 子 i の右輪郭の続きを左兄弟の右輪郭へつなぐ
  else if (sr !== null && cl === null) setRightThread(t, i, sr, mssr);
}

function moveSubtree(t, i, si, dist, spacing) {
  t.c[i].mod += dist;
  t.c[i].msel += dist;
  t.c[i].mser += dist;
  if (spacing) distributeExtra(t, i, si, dist); // ◦
}

function nextLeftContour(t) {
  return t.cs === 0 ? t.tl : t.c[0];
}

function nextRightContour(t) {
  return t.cs === 0 ? t.tr : t.c[t.cs - 1];
}

function setLeftThread(t, i, cl, modsumcl) {
  const li = t.c[0].el;
  li.tl = cl;
  // thread を辿った後の mod の合計が、根から cl への本来の経路の合計と一致するよう li.mod を調整し、
  // li 自身が動かないよう prelim を逆向きに調整する
  const diff = modsumcl - cl.mod - t.c[0].msel;
  li.mod += diff;
  li.prelim -= diff;
  t.c[0].el = t.c[i].el;
  t.c[0].msel = t.c[i].msel;
}

function setRightThread(t, i, sr, modsumsr) {
  const ri = t.c[i].er;
  ri.tr = sr;
  const diff = modsumsr - sr.mod - t.c[i].mser;
  ri.mod += diff;
  ri.prelim -= diff;
  t.c[i].er = t.c[i - 1].er;
  t.c[i].mser = t.c[i - 1].mser;
}

/** 親を「最初の子の左端」と「最後の子の右端」の中央に置く。子の mod を含めた位置で測る。 */
function positionRoot(t) {
  const first = t.c[0];
  const last = t.c[t.cs - 1];
  t.prelim = (first.prelim + first.mod + last.mod + last.prelim + last.w) / 2 - t.w / 2;
}

/** 根から葉へ mod を足し込み、絶対座標（左端）を求める。 */
function secondWalk(t, modsum, spacing) {
  modsum += t.mod;
  t.x = t.prelim + modsum;
  if (spacing) addChildSpacing(t); // ◦
  for (const child of t.c) secondWalk(child, modsum, spacing);
}

/**
 * ◦ 子 i を dist 動かした原因が左兄弟 si の輪郭なら、間の兄弟 si+1..i-1 を
 * 距離に比例して右へ配る（論文 §5、付録B）。ここでは shift / change に記録するだけで、
 * 実際の移動は addChildSpacing で子をまとめて処理するときに mod へ反映する。
 */
export function distributeExtra(t, i, si, dist) {
  if (si !== i - 1) {
    const nr = i - si;
    t.c[si + 1].shift += dist / nr;
    t.c[i].shift -= dist / nr;
    t.c[i].change -= dist - dist / nr;
  }
}

/** ◦ shift / change を累積して、各子の mod に加える。 */
export function addChildSpacing(t) {
  let d = 0;
  let modsumdelta = 0;
  for (const child of t.c) {
    d += child.shift;
    modsumdelta += d + child.change;
    child.mod += modsumdelta;
  }
}

/**
 * • 右輪郭にノードを出している左兄弟の、番号と最下端の連結リスト（番号の降順）。
 * separate で右輪郭を下へ辿るとき、先頭の兄弟の最下端より下に来たら次へ進めば、
 * 今の右輪郭ノードがどの兄弟の部分木に属するかが O(1) で分かる（論文 §6）。
 */
export function updateIYL(minY, i, ih) {
  // 新しい部分木に隠された兄弟を取り除く
  while (ih !== null && minY >= ih.lowY) ih = ih.nxt;
  return { lowY: minY, index: i, nxt: ih };
}

function writeBack(t) {
  t.node.data.x = t.x + t.w / 2;
  t.node.data.y = t.y + t.h / 2;
  for (const child of t.c) writeBack(child);
}
