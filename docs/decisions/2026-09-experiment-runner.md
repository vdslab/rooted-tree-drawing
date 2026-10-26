> **ステータス**: Implemented（2026-09。`experiments/lib/methods.js` + `experiments/lib/runner.js` として実装済み。旧スクリプトとの出力一致をシード固定で確認）
> **2026-09追記（現状）**: 手法実装は共通レジストリへ集約。現行の記録・欠測処理は 2026-09-experiment-integrity.md を参照。

# 実験スクリプトの共通化（手法レジストリ + 共通ランナー）

## 背景

`experiments/` に実験スクリプトが4本あり、2組がほぼ複製だった。

| 組 | 差分 | 中身 |
|---|---|---|
| `area_efficiency.js` ↔ `area_efficiency_growth_lpt.js` | 59行 | 手法セット、`extreme`分散レベルの有無、TRIALS既定値、コメント |
| `computation_time.js` ↔ `computation_time_growth_lpt.js` | 52行 | 同上 |

**手法の定義が4ファイルに散らばっていた**のが一番の問題で、手法を1つ足すたびに4箇所を直す必要があり、
実際に `plot_*.py` 側の手法マップが追従できずに古いままになっていた。

## 決めたこと

```
experiments/
  lib/methods.js   METHODS / METHOD_SETS（paper5, growth5）/ PRESETS / VARIANCE_LEVELS / ASPECT_RATIOS
  lib/runner.js    runExperiment(spec)。ループ・集計・サマリー表示・保存
  area_efficiency.js    §4.1（39行）
  computation_time.js   §4.2（45行）
```

- **手法を足す・名前を変えるときは `lib/methods.js` だけを触る。**
- 面積効率と計算時間の違いは `measure`（TNA/DA を測るか、秒を測るか）と
  ケースの並べ方（アスペクト比か、ノード数か）だけなので、同じ `runExperiment` で表現できる。
- **実験スクリプトは metric ごとに1本だけにした。** `*_growth_lpt.js` は削除し、手法セットは
  環境変数 `METHOD_SET`（`paper5` / `growth5`）で切り替える。プリセットが手法セット・分散レベル・
  出力ファイル名の接尾辞をまとめて持つので、`area_efficiency_growth_lpt_<runId>.json` という
  従来の命名も、`plot_*.py --growth` もそのまま使える。
  （中間状態として4本を薄い設定ファイルとして残したが、metric ごとに2本が同じ形をしていて
  二重管理になるため、プリセット方式に置き換えた。）
- `SAVE_TRIALS` で木データの保存を切り替える。既定は面積効率=保存する、計算時間=保存しない。
  旧 `computation_time_growth_lpt.js` は保存していたが、`_trials.json` が数十MBになるため
  既定を「保存しない」に変えた（必要なら `SAVE_TRIALS=1`）。

### 試行数の既定値を論文設定に戻した

旧スクリプトは `TRIALS` の既定値が 20 / 10（パイロット規模）で、うっかりそのまま実行すると
論文と違う条件の結果ファイルが `results/` に増えていく状態だった。既定を論文§4の **1000** にし、
短縮したいときだけ `TRIALS=5` のように環境変数で下げる形に変えた。

### 再現性: SEED を追加

`generateScaleFreeTree` も SA も `Math.random()` を使うので、**これまでの実験結果は再現できなかった**。
`SEED` 環境変数を与えたときだけ `Math.random` をシード付き乱数（mulberry32）に差し替えるようにした。
未指定なら従来どおり非決定的なので、過去の実行条件は変わらない。SEED を指定した実行では
結果JSONの `config.seed` に記録される。

## 直したバグ: plot スクリプトが結果ファイルを選び間違える

`plot_area_efficiency.py` / `plot_computation_time.py` の `find_latest_result()` は
`sorted(glob("area_efficiency_*.json"))[-1]` で「最新」を決めていた。しかしこのglobは
`_trials.json`（木データ本体）や別プレフィックスの `*_growth_lpt_*` にもマッチし、
辞書順の最後は常に `area_efficiency_growth_lpt_<runId>_trials.json` になっていた。
このファイルのトップレベルキーは `config` / `trials` で `results` を持たないため、
**引数なしで実行すると必ず KeyError で落ちる状態だった。**

修正:
- `^<prefix>_(\d+)\.json$` の正規表現で厳密に照合し、runId を数値として比較する
- `--growth` で growth 版のプレフィックスに切り替える
- 手法ラベル・色・マーカーに `growth-lpt` / `budget-lpt` / `budget-ffd` / `budget-bfd` を追加
- 分散レベルに `extreme` を追加し、結果ファイルに実際に含まれる手法・レベルだけを描画する

## 挙動を変えていないことの確認

旧スクリプトを外部からシードして実行し、新スクリプトを `SEED` 付きで実行して比較した。

- 面積効率（TRIALS=1, |V|=1000, 3レベル×5アスペクト比×5手法）: サマリー表が**完全一致**
- 計算時間: 表の構造・手法列・ケース列が一致（計測値は実行ごとにぶれるため構造で比較）
- 出力JSONのキー構成（`config` / `note` / `elapsedSec` / `results`）は旧形式のまま
- 既存の結果ファイルから図を再生成したところ、追跡済みPNGとバイト単位で同一だった

## 残っていること

- `experiments/results/` は33ファイルが epoch 名で並んでいるだけで、どの実行がどの図・
  どの論文の主張に対応するかの記録がない（`results/index.md` のようなものが要る）。
- ~~existingRenderedAspect.js（未追跡・未使用）と _tmp_check_metric.mjs（一回限りの分析スクリプト）~~
  → 2026-09 に削除済み。
