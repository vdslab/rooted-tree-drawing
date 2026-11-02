# 設計判断の記録（decisions）

「なぜそうなっているか」だけを置く。**何をしているか**は実装（`src/layout/` のコメント）と
[implementation.md](../implementation.md) が正。

新しい判断をしたら `YYYY-MM-テーマ.md` を作り、ここに1行足す。既存ファイルの本文は書き換えず、
状況が変わったら冒頭のステータス行に追記する。

**日付をファイル名に入れる理由**: `ls` した瞬間に新しさが分かるようにするため。ステータス行を
開かなくても「2026-06 のものは古い可能性が高い」と当たりがつく。git の日時では代用できない
（後から書き足すとコミット日時がずれる）。

**1テーマ1ファイル。** 同じテーマに `-fix` / `-solution` を足さないこと。

| 日付 | ファイル | ステータス | 内容 |
|---|---|---|---|
| 2026-07 | [2026-07-global-budget-design.md](2026-07-global-budget-design.md) | Implemented | `H_t`（全体高さ）を二分探索し、各ダミーの予算 `B_d` を決める方式の導出と具体例 |
| 2026-07 | [2026-07-pluggable-packing.md](2026-07-pluggable-packing.md) | Implemented | `B_d` をビンパッキングの容量と捉え直し、配置戦略（lpt/ffd/bfd）を差し替え可能にした |
| 2026-09 | [2026-09-layout-core-extraction.md](2026-09-layout-core-extraction.md) | Implemented | 4手法の重複1,400行を `core/` + `methods/` + `solvers/` に分離。ゴールデンテストで挙動不変を担保 |
| 2026-09 | [2026-09-experiment-runner.md](2026-09-experiment-runner.md) | Implemented | 実験スクリプトの二重管理を解消（手法レジストリ + 共通ランナー + `METHOD_SET`）。`SEED` で再現可能に |
| 2026-09 | [2026-09-contour-skyline.md](2026-09-contour-skyline.md) | Implemented | 輪郭を「ノードの鎖」からスカイラインに変更。`y - width/2` という次元の合わない項が原因でノードが重なっていた。全手法で重なり0に |
| 2026-09 | [2026-09-existing-dummy-height.md](2026-09-existing-dummy-height.md) | Implemented | 既存手法のダミー箱の高さを配置に合わせた（`max_j Σ_i` → `Σ_i max_j`）。葉が箱からはみ出して重なっていた。手法比較の結論が変わる |
| 2026-09 | [2026-09-ui-method-switch.md](2026-09-ui-method-switch.md) | Implemented | `globalBudgetLayout.js` → `uiLayout.js`。UI の手法を `METHOD` の1行で切り替えられるようにした |
| 2026-09 | [2026-09-column-pitch-misue.md](2026-09-column-pitch-misue.md) | Implemented | 列ピッチを Misue 2024 の式(3)(5)の `w'` に。列間ギャップ `2s_h` → `s_h` で既存手法と一致。バス線の余白は「リード線1本分」で論文と整合 |
| 2026-09 | [2026-09-experiment-rng-streams.md](2026-09-experiment-rng-streams.md) | Implemented | 実験の乱数を木用と手法用に分離。SA の乱数消費で木がずれ、`SEED` を固定しても実装の前後比較ができなかった |
| 2026-09 | [2026-09-shared-agent-workflow.md](2026-09-shared-agent-workflow.md) | Implemented | AI共通指示・CLI・資料管理・クローン可能な文書検査 |
| 2026-09 | [2026-09-experiment-integrity.md](2026-09-experiment-integrity.md) | Implemented | 欠測の保存と集計・メモリ使用・乱数注入・provenance |
| 2026-09 | [2026-09-registry-validation.md](2026-09-registry-validation.md) | Implemented | 手法レジストリの共有・UIデータ分離・不変条件と540ケース |
| 2026-10 | [2026-10-incremental-growth-layout.md](2026-10-incremental-growth-layout.md) | Implemented | 列成長型で部分木のローカル配置をキャッシュし、変更ダミーから根までだけを差分更新する実験的手法 |
| 2026-10 | [2026-10-linear-vanderploeg.md](2026-10-linear-vanderploeg.md) | Implemented | van der Ploeg を論文付録Cどおりの O(n) に置き換えた。出力は不変、均等配置は `spacing` オプション（既定で無効） |
| 2026-11 | [2026-11-growth-iteration-cost.md](2026-11-growth-iteration-cost.md) | Implemented | 列成長型の2手法の違いを配置だけにし、差分配置を輪郭キャッシュに、LPT を O(m log k) に。出力は不変 |
| 2026-11 | [2026-11-repository-scope.md](2026-11-repository-scope.md) | Implemented | 論文・発表資料・準備文書を外へ移し、未使用データと互換入口を削除した |

## 2026-09 に削除した記録

内容が現行コードに対応しなくなった、または他のドキュメントと重複していたため削除した。
必要になったら git 履歴（`git log --diff-filter=D --name-only`）から取り出せる。

| ファイル | 削除理由 |
|---|---|
| `2026-06-dominant-node-v1.md` | Superseded。旧・支配的ノード判定の説明で、現行コードに対応物がない |
| `2026-07-global-budget-solution.md` | implementation.md と内容が重複（同じ `H_t` 方式の解説が2箇所にあった） |
| `2026-07-global-budget-fix.md` | 修正済みバグの報告書。唯一残っていた未解決の懸念は [known-issues.md](../known-issues.md#layout-002) LAYOUT-002 に移した |
| `2026-07-smartphone-validation-necessity.md` | 実装判断ではなく検証計画の弁明。コードに対応しない |
