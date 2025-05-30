# rooted-tree-drawing

## 実験手順

1. `src/evaluation.js`のパラメータ設定
   - width:描画領域の幅
   - height:描画領域の高さ
   - evaluationNum:実験回数
   - alpha(0~1の範囲で指定):alphaが大きいほど同じノードに子が集まる(子の数が多いノードにさらに子ノードが挿入されやすい)
2. node.jsで実験
   - `node src/evaluation.js`
   - resultDataにデータが入る
3. pythonで実験結果を描画
   - 2で作られたresltData内のファイル名を設定
   - `python3 src/hakohige.py
