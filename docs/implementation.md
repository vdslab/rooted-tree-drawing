# 実装の索引

可変サイズノードの根付き木を、指定アスペクト比の矩形にレイアウトする。
主手法は H_t の二分探索と容量ベースのパッキング。導出は [設計記録](decisions/2026-07-global-budget-design.md)、処理の詳細はコードコメントに置く。

## レイアウトの流れ

```mermaid
flowchart LR
  A[入力] --> B[ダミー化・余白]
  B --> C[van der Ploeg]
  C --> D[手法固有のfold]
  D --> E[ダミー展開・エッジ生成]
  E --> F[表示サイズ・正規化]
```

| 役割 | 実装 |
|---|---|
| 手法ID・実装・UI/論文マージン | [registry.js](../src/layout/registry.js) |
| 共通パイプライン | [core/pipeline.js](../src/layout/core/pipeline.js) |
| 木の配置とスカイライン輪郭 | [core/tree.js](../src/layout/core/tree.js) |
| ダミー生成と余白 | [core/dummy.js](../src/layout/core/dummy.js) |
| 展開・描画サイズ・エッジ | [core/render.js](../src/layout/core/render.js) |
| H_t 二分探索 | [methods/binpacking.js](../src/layout/methods/binpacking.js) |
| 列成長型 SA/LPT | [methods/growth.js](../src/layout/methods/growth.js) |
| 列成長型 LPT（差分更新） | [methods/growthIncremental.js](../src/layout/methods/growthIncremental.js) |
| 既存手法（独自パイプライン） | [methods/existing.js](../src/layout/methods/existing.js) |
| 列数固定の makespan ソルバー | [solvers/](../src/layout/solvers/) |
| 容量固定のパッキング | [packing/](../src/packing/) |

共通パイプラインを使う手法は fold を差し替える。既存手法は折りたたみ配置と正規化の契約が異なるため独自パイプラインを保つ。
H_t はダミーの上端から各ダミーの容量を導き、支配的ノードの幅拡張と残りの列分配を決める。
詳細な契約と変更時の注意は [レイアウトの指示](../src/layout/AGENTS.md)。

## UI・入力データ

- [App.jsx](../src/App.jsx): 表示寸法とデータ選択。幅500への変換はここに残し、従来の表示条件を維持。
- [Tree.jsx](../src/Tree.jsx): レイアウトを呼びSVGを描画。
- [uiLayout.js](../src/uiLayout.js): SELECTED で共通レジストリの手法を指定。マージン100/100。
- [inline-tree.json](../data/examples/inline-tree.json): Appから分離した入力データ。元の値とノード順を維持。
- [データセット一覧](data/index.md): 形式・由来・生成手順と未確認事項。
- [実データ候補の調査](data/real-data-candidates.md): 法令XML等の適性と構造の記述統計。[集計スクリプト](../experiments/inspect_data_candidates.py)はレイアウトを実行せず、原資料から数量と木構造を検査する。
- [不規則な実階層の再調査](data/irregular-tree-candidates.md): 組織図・返信木・実行プロファイルの適性。[集計スクリプト](../experiments/inspect_irregular_candidates.py)は公開データの木構造と数量を検査する。

## 実験

- [CLI](../experiments/cli.mjs): run / summary / top / show / tree / render / compare / verify。
- [CLIの使い方](experiments.md): 対話的な実験と欠測・再現性の扱い。
- [methods.js](../experiments/lib/methods.js): 論文用の旧名と実験プリセット。実装一覧はレジストリから取得。
- [runner.js](../experiments/lib/runner.js): バッチ共通処理。欠測はnullと失敗理由、成功数・失敗数を保存。
- [random.js](../experiments/lib/random.js): 注入可能な乱数。木と手法を分離し、グローバル状態を変更しない。
- [provenance.js](../experiments/lib/provenance.js): コミット・dirty状態・Node/OS・生成器と依存lockのハッシュ。
- 実験の旧 *Paper.js エントリは互換ラッパー。既存手法を含むすべてが src/layout を呼ぶ。

## 検証と資料

`npm test` で不変条件・ゴールデン・実験・CLI・文書検査の回帰テストを実行する。
ゴールデンはレジストリの全手法をUI/論文の両マージン、5アスペクト比で検査する。
例外・非有限値・非正寸法・ノード欠落・重なりは、基準値更新時にも拒否する。
LAYOUT-004 の縦長入力も固定fixtureとして含む。既存の面積効率問題は [未解決問題](known-issues.md) に残す。

CIは npm ci / npm test / build / check:docs / Pythonの入力検査を実行する。
[資料管理](references/index.md)に従い、PDF・手元資料・実験結果がない環境でも検証を完了できる。
