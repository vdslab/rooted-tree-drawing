# rooted-tree-drawing

可変サイズノードを持つ根付き木を、指定アスペクト比の矩形領域に収めて描画するレイアウトアルゴリズムの研究リポジトリ。
Misue の Monotone Local Folding Layout を、量をノード高さでエンコードする場合に拡張したもの。

```bash
npm install
npm run dev            # UI を起動
npm run test:golden    # 全レイアウト手法の回帰テスト（192ケース）
node experiments/area_efficiency.js   # 論文§4.1 の実験（experiments/CLAUDE.md 参照）
```

- 実装の索引: [docs/implementation.md](docs/implementation.md)
- 設計判断の履歴: [docs/decisions/index.md](docs/decisions/index.md)
- 未解決の問題: [docs/known-issues.md](docs/known-issues.md)
- **コードを触る前に [CLAUDE.md](CLAUDE.md) を読むこと**（コードの地図、変更手順、ドキュメントの運用ルール）
