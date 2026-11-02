/**
 * テスト用のランダムな木の生成（vanderploeg.test.mjs と growth-incremental.test.mjs が共有する）。
 * 行は { name, parent, width, height }。乱数関数は引数で受け取る。
 */
/**
 * 論文 §7 と同じ生成法：根から子の番号を乱数で選んで降り、0 が出たらそこに子を足す。
 * size はノードの幅・高さを返す関数。
 */
export function randomTree(n, random, size) {
  const rows = [{ name: "n0", parent: "", ...size(random) }];
  const children = [[]];
  for (let k = 1; k < n; k++) {
    let cur = 0;
    for (;;) {
      const pick = Math.floor(random() * (children[cur].length + 1));
      if (pick === 0) break;
      cur = children[cur][pick - 1];
    }
    children[cur].push(k);
    children.push([]);
    rows.push({ name: `n${k}`, parent: `n${cur}`, ...size(random) });
  }
  return rows;
}

/**
 * 深い木。直前の数ノードのどれかを親にするので、輪郭が長くなり threads を何段も辿る。
 * randomTree は浅く幅広い木になりやすく、この形を作れない。
 */
export function deepTree(n, random, size) {
  const rows = [{ name: "n0", parent: "", ...size(random) }];
  for (let k = 1; k < n; k++) {
    const parent = Math.max(0, k - 1 - Math.floor(random() * Math.min(k, 6)));
    rows.push({ name: `n${k}`, parent: `n${parent}`, ...size(random) });
  }
  return rows;
}

/** 論文 §7 の幅・高さ（1〜10 の一様分布）。 */
export const paperSize = (random) => ({ width: 1 + 9 * random(), height: 1 + 9 * random() });

/** 本研究のダミーのような極端な縦横比（各辺が 1〜10^4 の対数一様分布）。 */
export const skewedSize = (random) => ({
  width: 10 ** (4 * random()),
  height: 10 ** (4 * random()),
});

/** 高さがほぼ 0 から 10^3 まで極端にばらつく。輪郭の下端がほとんど揃わない。 */
export const spikySize = (random) => ({
  width: 1 + 50 * random(),
  height: random() < 0.3 ? 0.01 + random() : 10 ** (3 * random()),
});
