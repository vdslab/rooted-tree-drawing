---
name: run-experiments
description: 根付き木レイアウトの比較実験を小規模に実行し、結果分析・SVG比較・シードからの再現を行う。
---

# レイアウト実験

[実験の契約](../../../experiments/AGENTS.md)を読み、`node experiments/cli.mjs` を使う。
実行前に [CLIガイド](../../../docs/experiments.md) の必要な操作を確認する。
パスとコマンドの基準はリポジトリルート。

- 探索用は少数試行から始め、手法・分散・アスペクト比・seedを明示する。
- top で試行IDを特定し、compare で同じ木の配置を比較する。
- 特筆すべき試行を示すときは、top が出す対照例（逆の結果になった試行。同条件を優先）も必ず compare して並べ、
  両方のスコアと、手法ごとに何が違ったかを説明する。1例だけで結論を出さない。
- 面積スコアの再現は verify。計算時間には使えない。
- INCOMPLETE や errors がある結果は成功試行だけで優劣を断定しない。
- 結果には実行名・条件・provenanceを添える。画像化はSVGを基本にし、閲覧ツールは利用環境に合わせる。

実装は [experiments/cli.mjs](../../../experiments/cli.mjs) に置く。スキル内に実験コードを複製しない。
