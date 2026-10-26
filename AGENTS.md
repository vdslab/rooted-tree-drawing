# rooted-tree-drawing

可変サイズノードの根付き木レイアウトを研究する実装リポジトリ。
主手法はグローバル高さ予算 H_t + ビンパッキング。比較対象は既存手法と列成長型 SA/LPT。

## 作業前に読むもの

- レイアウト・packing を変更する: [src/layout/AGENTS.md](src/layout/AGENTS.md)
- 実験・CLI・分析を変更する: [experiments/AGENTS.md](experiments/AGENTS.md)
- 実装の入口: [docs/implementation.md](docs/implementation.md)
- 未解決問題: [docs/known-issues.md](docs/known-issues.md)（固定ID LAYOUT-001〜004 で参照）

作業ディレクトリからの自動探索だけに依存せず、対象領域の指示も明示的に読む。
サービス共通の規則はこのファイルと領域別 AGENTS.md に置き、サービスごとに本文を複製しない。
同時に複数のAIが編集する場合は別の作業ディレクトリ・ブランチを使い、統合後に再検証する。

## 実装の契約

- `src/layout/core/` は共通処理。手法固有の判断は `methods/` に置く。
- `solvers/` は列数固定の最大列高さ最小化、`src/packing/` は容量固定の列分配。契約を混同しない。
- 手法IDと実装は `src/layout/registry.js` が一次情報。UIと論文のマージンは ui/paper プリセットで分離。
- 既存手法は独自パイプラインを維持する。実験用 `*Paper.js` は互換ラッパーで、重複実装ではない。
- 乱数関数を引数で渡す。グローバル Math.random は上書きしない。

## 検証

```bash
npm ci
npm run test:golden  # レイアウト変更の前後に実行
npm test            # 不変条件・回帰・実験・文書検査のテスト
npm run build
npm run check:docs
```

レイアウト変更後は必ず回帰テストを実行する。golden更新は意図した差分またはケース追加に限り、
理由をレビュー・コミットに残す。不変条件違反を基準値の更新で受け入れない。
ケース数はテスト出力を正とし、指示には固定値を転記しない。

## ドキュメント運用

- コードコメントは処理の理由、implementation は索引、decisions は設計判断、known-issues は未解決問題。
- 構成を変えたら implementation を同期する。設計判断は decisions に YYYY-MM-テーマ.md を追加し、index に追記。
- 設計記録は1テーマ1ファイル。冒頭に Implemented / Superseded / Proposed。既存本文は当時の記録として維持し、変更はステータス注記か置換する新記録に残す。
- 文書・AI向け指示を変更したら `npm run check:docs`。歴史的リンクの例外は「ファイル＋参照先」の組で管理し、ファイル全体を検査免除しない。
- 不要になった実装は削除する。コピーを archive に残さない。

## 資料・実験結果

- PDF、第三者の原資料、個人設定、実験の生成物は追跡しない。[資料管理](docs/references/index.md)を参照。
- 第三者資料は local-references に置く。Gitに残すのは書誌情報・出典URL・自分の要約・実装との対応。
- 文献PDFや実験結果がなくてもビルドとテストが通る状態を維持する。
- 論文の数値には必ず SEED を指定し、コミットIDと実行条件も保存する。実験CLIは `node experiments/cli.mjs`。
- 論文の本文執筆は別作業。旧SAドラフトと現行H_t実装の対応は [section-map](docs/paper/section-map.md) に記録する。
- LAYOUT-002/003 の余白修正は実験値を変えるため再取得と一緒に判断する。LAYOUT-004 は再現fixtureで追跡する。
