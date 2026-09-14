> **ステータス**: Implemented（2026-09。`src/layout/` として実装済み。挙動不変を `test/golden.mjs` の240ケースで確認）
>
> **2026-09 追記**: 本文中の `src/globalBudgetLayout.js` は `src/uiLayout.js` に改名した
> （手法を切り替えられるようにしたため。[2026-09-ui-method-switch.md](2026-09-ui-method-switch.md)）。

# レイアウト手法の共通コア切り出し（4手法 → core + methods + solvers）

## 背景

レイアウト手法が4つ（既存=Misue / SA / LPT / binpacking）あり、それぞれが独立したファイルに
van der Ploeg 本体・輪郭追跡・ダミー処理・描画処理を丸ごと持っていた。

トップレベル関数を空白・末尾カンマ・タイポを無視して突き合わせた結果:

| 区分 | 行数 |
|---|---|
| 4実装の合計（関数部分） | 3,237行 |
| 4実装すべてで同一（`vanderploeg`, `separate`, `rightCountur`, `leftCountur`, 兄弟ノード探索, `createPath`, `calcAspectRatio`） | 194行 |
| SA/LPT/binpacking の3実装で同一（上に加えてダミー処理・描画・`undoDummyNode`） | 608行 |
| 単純重複として削減可能 | 約1,410行 |

特に **SA と LPT は1行しか違わなかった**（`saColumn(...)` が `lptColumn(...)` になるだけ。
インターフェースは `(leaves, columns) => { bestPartition, maxHeight }` で共通）。

## 決めたこと

```
src/layout/
  core/
    tree.js       van der Ploeg と輪郭追跡（4手法で同一のコード）
    dummy.js      ダミーノードの生成・サイズ計算・マージン付与
    render.js     ダミー展開・エッジ生成・表示サイズ確定
    pipeline.js   共通パイプライン。fold だけを手法から受け取る
  methods/
    growth.js     列成長型（SA / LPT をソルバー差し替えで表現）
    binpacking.js H_t の二分探索
  solvers/
    saColumn.js   列数k固定 → makespan最小化（焼きなまし法）
    lptColumn.js  列数k固定 → makespan最小化（LPT）
```

`src/packing/`（容量 `B_d` に収まる最小列数を求める lpt/ffd/bfd）は従来どおり別枠。
**`solvers/` と `packing/` は解いている問題が違う**（前者は列数固定の makespan 最小化、
後者はその双対の箱詰め）ので統合しない。

### 外側ループは共通化しない

列成長型と二分探索型で共有するのは「再マージン付与 → van der Ploeg 再レイアウト →
アスペクト比計測」の1イテレーション分だけで、探索の制御構造は各 `methods/` に残した。
二分探索型は反復ごとに全ダミーを1列に復元する必要があり、累積的に列を増やす列成長型とは
前提が両立しないため、共通の抽象にすると両方に分岐が生えて元より読みにくくなる。

### 既存のエントリポイントはラッパーとして残す

`src/globalBudgetLayout.js`（UI、マージン100/100）と `experiments/lib/` の3ファイル
（論文実験、マージン300/200）は、import パスと論文条件を保つための薄いラッパーになった。
呼び出し側（`src/Tree.jsx`, `experiments/*.js`）は変更していない。

## 挙動を変えないことの担保

`test/golden.mjs` を先に用意した。8つの固定入力（`test/fixtures/`）× 3アスペクト比 ×
10エントリポイント = 240ケースの出力座標をハッシュ化して比較する。

- SA は `Math.random()` を使うため、テスト実行時のみシード付き乱数に差し替えて決定化する
- リファクタ後も **240ケースすべて一致**
- `npm run test:golden` で検証、`npm run test:golden:update` で記録更新
- 当初は `archive/`（2026-09に削除） のベースライン2本も対象にしていた（240ケース）が、それらを使う
  `benchmark.js` ごと2026-09に削除したため192ケースになった。残る192ケースのハッシュは削除前と完全一致

## 意図的に残した差分

**`addMargin` の `skipInnerNodes`**。binpacking は `isInner`（ダミー内部の葉）にマージンを
足さないが、SA/LPT は足す。これはコミット `16953df`「兄弟を待たない葉ノードのmarginを修正」が
H_t 実装にだけ入って、論文実験用のSA/LPTには反映されなかったことによる差。
揃えると出力が変わる（ゴールデン24ケース中12件が変化）ため、当時の実験値との対応を保つために
フラグで両方の挙動を残した。**SA/LPT側は「兄弟のいない葉」に二重にマージンが付いている可能性が高い。**
取り込むかどうかは実験の再取得とセットで判断する。

## 残っている作業

1. ~~既存手法（Misue）の取り込み~~ → **2026-09 に完了**。`src/layout/methods/existing.js` に移し、
   `experiments/lib/existingPaper.js` はラッパー（813行 → 18行）にした。
   ただし `core/pipeline.js` は共有していない（innerYMargin の概念が無く、ダミー展開が折りたたみ配置、
   normalize の見るプロパティも違うため）。共有したのは `core/tree.js` の van der Ploeg・輪郭追跡と
   `core/render.js` の `createPath` の計194行。挙動不変は golden の existing 24ケースで確認済み。
2. ~~SAの世代の判断~~ → **解消**。`benchmark.js` とそれが使っていた `archive/`（2026-09に削除）（別版のMisueと
   行削減方式のSA）、および `sa.js`（2026-09に削除） を2026-09に削除した。「既存手法」「SA」が指す実装は
   `src/layout/methods/` の1つずつになった。
3. **`calcDummyNodeHeight` の非対称**。`maxHeight + yMargin * 2 + innerYMargin` と
   `undoDummyNode` の `top = dummyTop + innerYMargin * 2` の組み合わせで、ダミー内部の余白が
   上300/下0になっている（意図は「上に innerYMargin 分」）。直すと面積効率が0.3〜0.7%改善するが、
   全手法の出力が変わるため論文の図の再取得とセットで判断する。
