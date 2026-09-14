> **ステータス**: Implemented（2026-07、`src/saColumnLayout.js` の `globalFoldingLayout` として実装済み。バグ修正は [2026-07-global-budget-fix.md](./2026-07-global-budget-fix.md)、実装の解説は [2026-07-global-budget-solution.md](./2026-07-global-budget-solution.md) を参照）
>
> このドキュメントは提案時点の設計案（付録の対話ログを含む）をそのまま残した記録。現在の正式な仕様は [docs/implementation.md](../implementation.md) を参照すること。
>
> **2026-09 追記**: 本文が参照する `saColumnLayout.js` / `lpt.js` などのファイルは、どこからも import されていなかったため削除済み。内容は git 履歴に残っている。現行の実装は `src/layout/` を参照。

# グローバル高さ予算 H_t による統一的レイアウト

## 目次

1. [背景と動機](#1-背景と動機)
2. [鍵になる不変量](#2-鍵になる不変量)
3. [B_d による再定式化](#3-bd-による再定式化)
4. [具体例で理解する](#4-具体例で理解する)
5. [H_t の二分探索](#5-ht-の二分探索)
6. [アルゴリズム全体の擬似コード](#6-アルゴリズム全体の擬似コード)
7. [旧方式との比較](#7-旧方式との比較)
8. [留意点と制約](#8-留意点と制約)

---

## 1. 背景と動機

### 旧方式の問題点

旧方式 `localFoldingLayout` は「最底辺のダミーノードの列数を1ずつ増やし、再レイアウト → アスペクト比確認」というループで動作する。この方式には2つのミスマッチがある。

**ミスマッチ1: ターゲット高さの決定がローカル**

幅拡張時のターゲット高さは「残りノードの理想列高さ」（＝ダミーノード内部で閉じた計算）で決まるが、レイアウト全体の高さは「最底辺のダミーノードの底辺」で決まる。

```
例: ダミーノード D が深さ 3000 の位置にあり、内部ノード合計高さが 1500
    理想列高さ（2列の場合）= 750
    → 支配的ノード A(h=1200) を k=1.6 で拡張 → 高さ 750 に

    しかし、レイアウト全体の底辺は 3000 + 750 = 3750
    別のダミーノード D' が深さ 200 にあり、高さ 4000 で底辺 = 4200
    → D'が全体高さを支配しているので、D の底辺 3750 は余裕がある
    → D を 750 まで縮めたのは過剰。D は高さ 1200（=4200-3000）まで
      許容できたのに、幅だけ無駄に広がった
```

この「ローカルな理想列高さ」に合わせる設計が、**過剰な幅拡張（下に空白ができる）** の原因。

**ミスマッチ2: 最底辺のみの逐次処理**

`localFoldingLayout` は毎ループで「最底辺のダミー」1つだけを処理する。しかし全体のアスペクト比は全てのダミーノードの幅と高さが影響するため、非効率。

### 解法の方向

これら2つのミスマッチを解消するために、**グローバルな高さ予算 H_t** を導入する:
- 各ダミーのターゲット高さをグローバルに決定（ミスマッチ1の解消）
- 全ダミーを同時に処理（ミスマッチ2の解消）
- H_t を二分探索して目標アスペクト比に合わせる

---

## 2. 鍵になる不変量

### y_top(d) は列数に依存しない

van der Ploeg のレイアウトでは、ノードの y 座標は以下の式で決まる:

```
child.y = parent.y + parent.height / 2 + child.height / 2
```

したがって、ダミーノード d の**上端** y_top(d) は:

```
y_top(d) = d.y - d.height / 2
         = parent.y + parent.height / 2
```

ここで parent は分岐ノード（ダミーノードの親）であり、分岐ノードの高さは固定。つまり **y_top(d) はダミーノード d 自身の高さ（＝列数）に依存しない**。

> **不変量**: ダミーノードの列数を変えても、そのダミーノードの上端 y_top(d) は動かない。変化するのは幅と高さだけ。

この不変量が成り立つことで、H_t から B_d を「反復なし」で計算できる。

---

## 3. B_d による再定式化

### 高さ予算 B_d の定義

目標のレイアウト高さ H_t を1つのスカラーとして与えると、各ダミーノード d には独立に**高さ予算**が定まる:

```
B_d = H_t − y_top(d)
```

これは「レイアウト全体の底辺ライン H_t から、ダミーノードの上端を引いた残り」であり、**そのダミーノードが使える縦方向のスペース** を意味する。

### B_d で何が変わるか

B_d を用いると、旧方式の3つの処理が全て B_d に対して閉じた形になる:

#### 3.1 支配的ノードの判定

**旧方式**: `nodeHeight > (残りノードの高さ合計) / (残り列数)` — 文脈依存

**新方式**: `nodeHeight > B_d` — これだけ

```
B_d は「このダミーノードが使える高さの上限」なので、
それを超えるノードは定義上「1列に収まらない」
→ 幅拡張が必要 = 支配的ノード
```

旧方式の `detectDominantNodes` の複雑な逐次判定ロジック（残り高さ・残り列数を更新しながらソート順にbreak）は不要になり、**単純な閾値比較**に置き換わる。

#### 3.2 幅拡張のターゲット

**旧方式**: `新height = 理想列高さ`（ローカルな計算）

**新方式**: `新height = B_d`（グローバルな計算）

```
k = nodeHeight / B_d
新width  = width × k
新height = height / k = B_d   ← 高さ予算ちょうどに収まる
```

これにより「過剰に折りたたまれて下に空白ができる」問題は**原理的に消える**。B_d は「レイアウト全体の底辺ライン − このダミーの上端」なので、これ以上縮めても全体高さは1ピクセルも下がらず、幅だけ増える。

#### 3.3 列数の決定

**旧方式**: 列数を1ずつ増やすループ

**新方式**: 「最大列高さ ≤ B_d を満たす最小列数 k_d」を直接求める

```
1. 支配的ノード（h_i > B_d）を先に分離・幅拡張
2. 残りノードの高さ合計を Σh_i とする
3. 列数の下界 k = ⌈Σh_i / B_d⌉ から開始
4. LPT で k 列に分配し、makespan ≤ B_d か確認
5. 超えていれば k += 1 で再試行（通常 数回で収束）
6. 最終列数 = 支配的ノード数 + k
```

---

## 4. 具体例で理解する

### 例1: 旧方式で空白が生じるケース

```
ツリー構造:
  Root (h=500)
    ├─ SubTree1 (h=500)
    │   └─ DummyA: [X(h=3000), Y(h=500), Z(h=500)]  ← 深い位置
    └─ DummyB: [A(h=4000), B(h=1000), C(h=800), D(h=700)]  ← 浅い位置
```

**旧方式の問題**:

DummyA の理想列高さ（2列）= (500+500)/1 = 1000
X(h=3000) の拡張係数 k = 3000/1000 = 3.0
→ X を高さ 1000 に拡張
→ DummyA の底辺 = y_top(A) + 1000

しかし DummyB の底辺がもっと下にあるなら、DummyA を 1000 まで縮めたのは過剰。

**新方式**:

1列レイアウトで全体の底辺を計算 → H_initial を得る
H_t の二分探索で目標アスペクト比に合わせる

仮に H_t = 5500 と決まったとする:

```
y_top(DummyA) = 1000 (Root + SubTree1 の分)
B_A = 5500 - 1000 = 4500

→ X(h=3000): 3000 ≤ 4500 → 支配的でない！拡張不要
→ 全ノード合計 = 4000, 列数下界 = ⌈4000/4500⌉ = 1
→ 1列で makespan = 4000 ≤ 4500 → OK
→ DummyA は 1列のまま（過剰な拡張なし）
```

```
y_top(DummyB) = 500 (Root の分)
B_B = 5500 - 500 = 5000

→ A(h=4000): 4000 ≤ 5000 → 支配的でない
→ 全ノード合計 = 6500, 列数下界 = ⌈6500/5000⌉ = 2
→ 2列 LPT: [A(4000), D(700)] → 4700, [B(1000), C(800)] → 1800
→ makespan = 4700 ≤ 5000 → OK
→ DummyB は 2列
```

### 例2: 支配的ノードが存在するケース

```
DummyC: [P(h=8000), Q(h=1000), R(h=800), S(h=700)]
y_top(DummyC) = 500
H_t = 6000
B_C = 6000 - 500 = 5500
```

**Step 1: 支配的ノードの検出**
```
P(h=8000) > B_C(5500) → ✅ 支配的ノード
Q(h=1000) ≤ B_C(5500) → ❌
R(h=800)  ≤ B_C(5500) → ❌
S(h=700)  ≤ B_C(5500) → ❌
```

**Step 2: P を幅拡張**
```
k = 8000 / 5500 = 1.455
新width  = width × 1.455
新height = 8000 / 1.455 = 5500 = B_C  ← 予算ちょうど！
```

**Step 3: 残りノードの列数決定**
```
残り: Q(1000), R(800), S(700)
合計 = 2500
列数下界 = ⌈2500 / 5500⌉ = 1
1列 LPT: [Q, R, S] → makespan = 2500 ≤ 5500 → OK
```

**最終結果**:
```
列1: [P(拡張済, h=5500)]  列2: [Q, R, S (合計 h=2500)]
合計列数 = 2
DummyC の底辺 = 500 + 5500 = 6000 = H_t  ← ぴったり！
```

### 例3: 複数の支配的ノードがあるケース

```
DummyD: [A(h=10000), B(h=7000), C(h=500), D(h=300)]
y_top(DummyD) = 1000
H_t = 5000
B_D = 5000 - 1000 = 4000
```

**Step 1: 支配的ノードの検出**
```
A(h=10000) > B_D(4000) → ✅ 支配的
B(h=7000)  > B_D(4000) → ✅ 支配的
C(h=500)   ≤ B_D(4000) → ❌
D(h=300)   ≤ B_D(4000) → ❌
```

**Step 2: 幅拡張**
```
A: k = 10000/4000 = 2.5, 新height = 4000
B: k = 7000/4000  = 1.75, 新height = 4000
```

**Step 3: 残りの列数決定**
```
残り: C(500), D(300), 合計 = 800
列数下界 = ⌈800/4000⌉ = 1
1列: makespan = 800 ≤ 4000 → OK
```

**最終結果**:
```
列1: [A(h=4000)]  列2: [B(h=4000)]  列3: [C, D (h=800)]
合計列数 = 3
```

---

## 5. H_t の二分探索

### なぜ二分探索が可能か

H_t とレイアウト幅 W(H_t) の関係は**単調非増加**:

```
H_t を大きくする
  → 各 B_d が増える
  → 必要列数 k_d が減る（少ない列で収まる）
  → 幅拡張も弱まる（拡張対象が減り、拡張係数も小さくなる）
  → レイアウト幅 W(H_t) が減少
```

したがってアスペクト比 `a(H_t) = W(H_t) / H_t` は H_t について**単調減少**になり、目標アスペクト比 `a_t` に対する H_t の1次元二分探索が成立する。

### 探索範囲

```
H_max = 1列レイアウト時の全体高さ（最大値）
  → 全ダミーが1列 → 幅が最小 → 最も縦長
  → アスペクト比が最小

H_min = max(y_top(d) + 最低限の高さ) for all d
  → 各ダミーで最低1列は必要なので、最大ノード高さ分は確保
  → 実用上は「全ダミーの列数が最大（各ノードが1列ずつ）」の状態に近い
  → 幅が最大 → 最も横長
```

### 探索アルゴリズム

```
function globalFoldingLayout(root, at, ...):
  // Step 1: 初期レイアウト（1列）の底辺を H_max とする
  H_max = computeGlobalBottom(root)

  // Step 2: H_min を計算
  //   各ダミーについて y_top(d) + max(ダミー内ノードの高さ) の最大値
  H_min = max over all dummies d:
            y_top(d) + max(h_i for i in d.leaves)

  // Step 3: 二分探索
  for iteration = 1 to MAX_ITER:
    H_mid = (H_max + H_min) / 2

    // H_mid に基づいて全ダミーを処理
    applyGlobalBudget(root, H_mid, ...)

    // ダミーサイズ再計算 + van der Ploeg 再レイアウト
    setDummyMargin(root, ...)
    root = stratify(vanderploeg(root, stratify))

    // アスペクト比を計算
    a = calcAspectRatio(root)

    if |a - at| / at < 0.05:   // 5%以内なら収束
      break

    if a < at:                 // まだ縦長 → H_t を下げて幅を広げる
      H_max = H_mid
    else:                      // 横長すぎ → H_t を上げて幅を狭める
      H_min = H_mid

  return root
```

### 計算量

二分探索のステップ数は O(log(H_max / tolerance)) で、各ステップで:
- 全ダミーの B_d 計算: O(|D|)（D = ダミーノード数）
- 各ダミーの列数決定（LPT）: O(n_d log n_d)（n_d = ダミー内ノード数）
- van der Ploeg: O(|V|²) 最悪ケース

合計: O(log(H_range) × |V|²)

旧方式の O(M × |V|²)（M = 列増加ステップ数）と比べ、M が大きい場合に有利。

---

## 6. アルゴリズム全体の擬似コード

### 6.1 collectDummyNodes — 全ダミーノードの収集

```javascript
function collectDummyNodes(root) {
  return root.descendants()
    .filter(node => node.data?.leaves)
    .map(node => ({
      node: node,
      yTop: node.data.y - node.data.height / 2
    }));
}
```

### 6.2 computeColumnsForBudget — B_d に基づく列数・分配決定

```javascript
function computeColumnsForBudget(leaves1D, Bd) {
  // Step 1: 支配的ノードを検出（h_i > B_d）
  const dominants = leaves1D.filter(n => n.height > Bd);
  const normals = leaves1D.filter(n => n.height <= Bd);

  // Step 2: 支配的ノードを幅拡張（高さ = B_d に）
  const widenedDominants = dominants.map(n => {
    const k = n.height / Bd;
    return {
      ...n,
      width: n.width * k,
      height: n.height / k,  // = B_d
      isWidened: true,
    };
  });

  // Step 3: 残りノードの列数を決定
  if (normals.length === 0) {
    // 全ノードが支配的 → 各ノード1列ずつ
    return {
      partition: widenedDominants.map(n => [n]),
      columns: widenedDominants.length,
    };
  }

  const totalNormalHeight = normals.reduce((s, n) => s + n.height, 0);
  let k = Math.max(1, Math.ceil(totalNormalHeight / Bd));

  // LPT で k 列に分配し、makespan ≤ B_d か確認
  while (k <= normals.length) {
    const lptResult = lptColumn([normals], k);
    if (lptResult.maxHeight <= Bd) break;
    k++;
  }

  // Step 4: 結合
  const lptResult = lptColumn([normals], k);
  const partition = [
    ...widenedDominants.map(n => [n]),
    ...lptResult.bestPartition,
  ];

  return {
    partition: partition,
    columns: widenedDominants.length + k,
  };
}
```

### 6.3 applyGlobalBudget — H_t に基づく全ダミー一括処理

```javascript
function applyGlobalBudget(root, Ht, xMargin, yMargin, innerYMargin) {
  const dummies = collectDummyNodes(root);

  for (const { node, yTop } of dummies) {
    const Bd = Ht - yTop;

    // B_d が小さすぎる場合の保護
    const maxLeafHeight = Math.max(...to1D(node.data.leaves).map(n => n.height));
    const effectiveBd = Math.max(Bd, maxLeafHeight);

    const leaves1D = to1D(node.data.leaves);
    const result = computeColumnsForBudget(leaves1D, effectiveBd);

    node.data.leaves = result.partition;
    node.data.columns = result.columns;
  }

  // ダミーノードサイズを再計算
  setDummyMargin(root, xMargin, yMargin, innerYMargin);
}
```

### 6.4 globalFoldingLayout — H_t の二分探索（localFoldingLayout の置き換え）

```javascript
function globalFoldingLayout(root, at, xMargin, yMargin, innerYMargin, stratify) {
  // Step 1: 初期状態（1列）のアスペクト比を確認
  let a = calcAspectRatio(root);
  if (a >= at) return root;  // 既に目標以上なら何もしない

  // Step 2: 探索範囲の設定
  const globalBottom = computeGlobalBottom(root);
  const globalTop = computeGlobalTop(root);
  let H_max = globalBottom - globalTop;  // 1列時の全体高さ
  let H_min = computeHMin(root);          // 最低限必要な高さ

  // Step 3: 二分探索
  const MAX_ITER = 30;
  let bestRoot = root;

  for (let i = 0; i < MAX_ITER; i++) {
    const H_mid = (H_max + H_min) / 2;

    // 全ダミーに B_d を適用
    applyGlobalBudget(root, globalTop + H_mid, xMargin, yMargin, innerYMargin);

    // van der Ploeg で再レイアウト
    root = stratify(vanderploeg(root, stratify));

    // アスペクト比を計算
    a = calcAspectRatio(root);

    if (Math.abs(a - at) / at < 0.05) {
      bestRoot = root;
      break;  // 十分近い
    }

    if (a < at) {
      // まだ縦長 → H_t を下げる → 列を増やす → 幅を広げる
      H_max = H_mid;
    } else {
      // 横長すぎ → H_t を上げる → 列を減らす → 幅を狭める
      H_min = H_mid;
    }
    bestRoot = root;
  }

  return bestRoot;
}
```

---

## 7. 旧方式との比較

### 構造の比較

| 観点 | 旧方式 (localFoldingLayout) | 新方式 (globalFoldingLayout) |
|------|----------------------------|------------------------------|
| **探索変数** | 最底辺ダミーの列数（離散的、多次元） | H_t（連続的、1次元スカラー） |
| **ループ構造** | 列数を1ずつ増やすwhile | H_t の二分探索 |
| **対象ダミー** | 毎ループで最底辺の1つだけ | 全ダミーを同時処理 |
| **幅拡張ターゲット** | ローカルな理想列高さ | グローバルな B_d = H_t − y_top(d) |
| **支配的ノード判定** | `h > 残り合計 / 残り列数`（文脈依存） | `h > B_d`（単純閾値） |
| **空白問題** | 発生しうる（ローカル最適化のため） | 原理的に消える |
| **van der Ploeg 回数** | O(M)（M = 列増加ステップ数） | O(log(H_range))（二分探索） |

### 具体的な改善

```
旧方式で空白が生じるケース:
  DummyA (深い位置): 理想列高さ = 750 → X(h=1200) を 750 に拡張
  DummyB (浅い位置): 底辺 = 4200 が全体を支配
  → DummyA の底辺 = 3750 < 4200 → 下に 450 の空白

新方式:
  H_t = 4200 から二分探索
  B_A = 4200 - 3000 = 1200
  → X(h=1200) ≤ B_A(1200) → 拡張不要！
  → 空白なし
```

---

## 8. 留意点と制約

### 8.1 B_d が負になるケース

深いダミーノードで `y_top(d) > H_t` となり B_d が負になることがある。この場合:

```
effectiveBd = max(Bd, max(ダミー内ノードの高さ))
```

として、最低限そのダミー内の最大ノードが1列に入る高さを保証する。

### 8.2 収束条件

二分探索の収束条件は2つ:
1. **アスペクト比ベース**: `|a − a_t| / a_t < 0.05`（5%以内）
2. **最大反復回数**: 30回（安全弁）

### 8.3 maxK 制約の廃止

旧方式では `widenDominantNode` に `maxK = 3.0` の上限があったが、新方式では廃止する。B_d ベースの拡張は「全体の底辺ラインに合わせる」ものなので、拡張が過剰になる構造的な原因がない。面積効率を最優先とする。

### 8.4 エンコーディングの整合性

高さ = 量のエンコーディングは、幅拡張ノードだけ面積 = 量になり混在する。論文として一貫させるなら、拡張ノードを視覚的に区別するなどの工夫が必要（今回の実装スコープ外）。

---

## 参照

- 旧方式の実装: [src/saColumnLayout.js](../../src/saColumnLayout.js)
- 支配的ノードの旧判定: [2026-06-dominant-node-v1.md](./2026-06-dominant-node-v1.md)
- 全体設計: [docs/implementation.md](../implementation.md)

---

> 付録にあった生成AIとの設計検討ログ（47行）は2026-09に削除した。結論はこの本文に反映済み。
