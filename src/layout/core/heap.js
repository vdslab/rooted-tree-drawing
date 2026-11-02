/**
 * 比較関数で順序を決める二分ヒープ。
 *
 * before(a, b) が true なら a を b より先に出す。同点の扱いも before に含めること
 * （出力を既存の線形探索と一致させるには、探索順の番号で同点を割る必要がある）。
 *
 * 優先度を変えられるのは先頭の要素だけ（updateTop）。列成長のダミーも LPT の列もマージの先頭も
 * 「先頭を取り出して書き換えて戻す」形なので、任意の要素の位置を覚えておく必要がない。
 * LPT では葉1枚ごとに呼ばれるので、余計な管理を持たないことが速さに効く。
 */
export class Heap {
  constructor(before, items = []) {
    this.before = before;
    this.items = [];
    for (const item of items) this.push(item);
  }

  get size() {
    return this.items.length;
  }

  peek() {
    return this.items.length ? this.items[0] : null;
  }

  push(item) {
    const items = this.items;
    let i = items.length;
    items.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(item, items[parent])) break;
      items[i] = items[parent];
      i = parent;
    }
    items[i] = item;
  }

  pop() {
    const items = this.items;
    if (items.length === 0) return null;
    const top = items[0];
    const last = items.pop();
    if (items.length) {
      items[0] = last;
      this.updateTop();
    }
    return top;
  }

  /** 先頭の要素の優先度を変えた後に呼び、正しい位置へ沈める。 */
  updateTop() {
    const { items, before } = this;
    const n = items.length;
    const item = items[0];
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= n) break;
      if (child + 1 < n && before(items[child + 1], items[child])) child += 1;
      if (!before(items[child], item)) break;
      items[i] = items[child];
      i = child;
    }
    items[i] = item;
  }
}
