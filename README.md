# rooted-tree-drawing

可変サイズノードを持つ根付き木を指定アスペクト比の矩形領域に描画する研究リポジトリ。
Misue の Monotone Local Folding Layout を、量をノード高さでエンコードする場合に拡張する。

Node 22以上（.nvmrc）、Python 3（図の入力検査用）を使う。

```bash
npm ci
npm run dev
npm test
npm run build
npm run check:docs
python3 -m unittest discover -s test -p 'test_*.py'
npm run experiment -- run --trials=5 --nodes=100 --seed=1
```

- AI共通の指示: [AGENTS.md](AGENTS.md)。Claude Codeは CLAUDE.md から同じ指示を読み込む。
- 他のAIサービスでは、そのサービスの指示入口から AGENTS.md と作業領域の指示を読むよう設定する。共通本文は複製しない。
- 実装: [索引](docs/implementation.md) / [設計判断](docs/decisions/index.md) / [未解決問題](docs/known-issues.md)
- 実験: [CLIガイド](docs/experiments.md) / [実験の契約](experiments/AGENTS.md)
- 入力: [データセット一覧](docs/data/index.md)
- PDF・第三者の原資料はGit対象外。[資料管理](docs/references/index.md)を参照。PDFなしでも開発・検証できる。

論文用の測定はSEEDを明示し、コミット済みコードで実行する。結果のprovenanceと実効設定を採用記録に残す。
新しいバッチ結果では欠測も保存し、欠測がある実行は終了コード1。図作成は不完全な結果を受け付けない。
