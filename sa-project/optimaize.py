import optuna
import subprocess
import json
import sys
import os
import argparse
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
import pandas as pd
import math

# 可視化用のライブラリが利用可能かチェック
try:
    # ↓↓↓ ここのインポートに関数を追加 ↓↓↓
    from optuna.visualization import plot_optimization_history, plot_param_importances, plot_slice, plot_contour
    visualization_available = True
except ImportError:
    visualization_available = False
    print("Warning: optuna.visualization is not available. Skipping visualization.")

# plotlyが利用可能かチェック
try:
    import plotly.express as px
    plotly_available = True
except ImportError:
    plotly_available = False
    print("Warning: plotly.express is not available. Skipping parallel coordinates plot.")

# -----------------------------------------------------
# 最適化したい目的関数 (Objective Function)
# -----------------------------------------------------
def objective(trial):
    """
    Optunaの各試行(trial)で実行される関数。
    ハイパーパラメータを提案し、JSスクリプトを実行してコストを返す。
    """
    # 1. Optunaに、試行するハイパーパラメータを提案させる
    TOTAL_ITERATION_BUDGET = 10000  # 10^4 = 1万回

    # 2. Optunaに、冷却スケジュールを決めるパラメータを提案させる
    initial_temp = trial.suggest_float("initialTemp", 100, 10000, log=True)
    final_temp = trial.suggest_float("finalTemp", 0.01, 10.0, log=True)
    cooling_rate = trial.suggest_float("coolingRate", 0.90, 0.999)
    num_temp_steps = math.log(final_temp / initial_temp) / math.log(cooling_rate)
    iterations_per_temp = int(TOTAL_ITERATION_BUDGET / num_temp_steps)
    trial.set_user_attr('iterations_per_temp', iterations_per_temp)
    params = {
        # 固定するパラメータ
        "rowNum": 3,

        # Optunaが提案したパラメータ
        "initialTemp": initial_temp,
        "finalTemp": final_temp,
        "coolingRate": cooling_rate,

        # ★ 計算によって導出されたパラメータ
        "iterationsPerTemp": iterations_per_temp
    }

    # パラメータをコマンドラインで渡せるようにJSON文字列に変換
    params_json_string = json.dumps(params)

    try:
        # 2. JavaScriptのスクリプトを子プロセスとして実行する
        result = subprocess.run(
            ["node", "sa_worker.js", params_json_string],
            capture_output=True,  # 標準出力をキャプチャする
            text=True,            # 出力をテキストとして扱う
            check=True,           # 実行時エラーがあれば例外を発生させる
            timeout=120           # タイムアウトを120秒に設定（任意）
        )

        # 3. JavaScriptからの出力(JSON)をパースしてコストを取得
        # 標準出力から最初のJSON部分だけを抽出
        stdout_lines = result.stdout.strip().split('\n')
        json_line = None
        for line in stdout_lines:
            if line.startswith('{') and line.endswith('}'):
                json_line = line
                break
        
        if not json_line:
            print(f"エラー: 有効なJSON出力が見つかりませんでした")
            print(f"実際の出力: {result.stdout}")
            return float("inf")
            
        output = json.loads(json_line)
        cost = output["cost"]
        
        # 追加情報をログに記録
        trial.set_user_attr("group_widths", output.get("groupWidths", []))
        
        print(f"Trial {trial.number}: cost={cost}, params={params}")

        # 4. Optunaにコストを返す
        return cost

    except subprocess.CalledProcessError as e:
        # JavaScript側でエラーが発生した場合
        print(f"Error executing Node.js script: {e.stderr}", file=sys.stderr)
        return float("inf") # 失敗した試行としてOptunaに伝える
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        return float("inf")

def save_visualization(study, output_dir="results"):
    """最適化の可視化結果を保存する"""
    if not visualization_available:
        return
    
    # 出力ディレクトリの作成
    os.makedirs(output_dir, exist_ok=True)
    
    # 最適化の履歴をプロット
    try:
        fig1 = plot_optimization_history(study)
        fig1.write_image(f"{output_dir}/optimization_history.png")
        
        # パラメータの重要度をプロット
        fig2 = plot_param_importances(study)
        fig2.write_image(f"{output_dir}/param_importances.png")
        
        print(f"Visualization saved to {output_dir}/")
    except Exception as e:
        print(f"Error saving plotly visualizations: {e}")
    
     # --- 1. スライスプロット (Slice Plot) ---
    # 各パラメータと目的関数の関係を個別に表示
    try:
        # study.best_params.keys() で最適化対象の全パラメータを取得
        params_to_plot = list(study.best_params.keys())
        
        fig3 = plot_slice(study, params=params_to_plot)
        fig3.write_image(f"{output_dir}/slice_plot.png")
        print("Slice plot saved.")
        
    except Exception as e:
        print(f"Error saving slice plot: {e}")

    # --- 2. 等高線プロット (Contour Plot) ---
    # パラメータの組み合わせと目的関数の関係を表示
    # 重要度の高いパラメータの組み合わせを見るのが効果的
    try:
        # 重要度の高いパラメータを2つ選ぶ
        param_importances = optuna.importance.get_param_importances(study)
        
        # 重要度が2つ以上ある場合のみプロット
        if len(param_importances) >= 2:
            # sortedで重要度の高い順にソートし、上位2つを取得
            most_important_params = sorted(param_importances.items(), key=lambda x: x[1], reverse=True)[:2]
            params_for_contour = [p[0] for p in most_important_params]
            
            fig4 = plot_contour(study, params=params_for_contour)
            fig4.write_image(f"{output_dir}/contour_plot.png")
            print(f"Contour plot for {params_for_contour} saved.")

    except Exception as e:
        print(f"Error saving contour plot: {e}")
    
    # Matplotlibを使用した可視化
    try:
        # 各パラメータの分布をプロット
        params = ["coolingRate", "initialTemp", "finalTemp", "iterationsPerTemp"]
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        axes = axes.flatten()
        
        for i, param in enumerate(params):
            values = [t.params[param] for t in study.trials if param in t.params]
            if values:
                axes[i].hist(values, bins=20)
                axes[i].set_title(param)
                axes[i].set_xlabel("Value")
                axes[i].set_ylabel("Frequency")
                
                # 最適値をマーク
                if param in study.best_params:
                    best_value = study.best_params[param]
                    axes[i].axvline(best_value, color='r', linestyle='--')
                    axes[i].text(best_value, 0, f"Best: {best_value:.4f}", 
                                color='r', rotation=90, va='bottom')
        
        plt.tight_layout()
        plt.savefig(f"{output_dir}/parameter_distributions.png")
    except Exception as e:
        print(f"Error saving matplotlib visualizations: {e}")
        
     # --- 3. パラレルコーディネートプロット ---
    if plotly_available:
        try:
            # トライアルデータをDataFrameに変換
            data = []
            for trial in study.trials:
                # 正常に完了したトライアルのみを対象
                if trial.state == optuna.trial.TrialState.COMPLETE:
                    row = {
                        'cost': trial.value, # 評価値（コスト）
                    }
                    # Optunaが提案したパラメータを追加
                    row.update(trial.params)
                    # ★★★★★ 修正点 ★★★★★
                    # trial.user_attrs から計算されたパラメータを取得して追加
                    # objective関数で 'calculated_iterationsPerTemp' を記録しておく必要がある
                    # (前の回答のコード例を参照)
                    calculated_iterations = trial.user_attrs.get('iterations_per_temp', None)
                    if calculated_iterations is not None:
                        row['iterationsPerTemp'] = calculated_iterations

                    data.append(row)
                    print(row, 'dakfjakldj')
            df = pd.DataFrame(data)
            print(df, 'dddd')
            # DataFrameが空でなく、必要な列が存在する場合のみプロット
            if not df.empty and 'iterationsPerTemp' in df.columns:
                # プロットに含める列（次元）を選択
                dimensions_to_plot = ['cost', 'coolingRate', 'initialTemp', 'finalTemp', 'iterationsPerTemp']

                fig = px.parallel_coordinates(
                    df,
                    dimensions=dimensions_to_plot,
                    color='cost',  # この列の値で線の色を変化させる
                    color_continuous_scale=px.colors.sequential.Viridis,
                    labels={
                        'cost': '評価値 (cost)',
                        'coolingRate': '冷却率',
                        'initialTemp': '初期温度',
                        'finalTemp': '終了温度',
                        'iterationsPerTemp': '温度ごとの反復回数'
                    }
                )
                # プロットのタイトル
                fig.update_layout(
                    title_text="SAパラメータ最適化のパラレルコーディネートプロット"
                )
                # HTMLファイルとして保存
                html_path = f"{output_dir}/parallel_coordinates.html"
                fig.write_html(html_path)
                # 画像としても保存
                img_path = f"{output_dir}/parallel_coordinates.png"
                fig.write_image(img_path)
                print(f"パラレルコーディネートプロットを保存しました。")
        except Exception as e:
            print(f"Error saving parallel coordinates plot: {e}")

# -----------------------------------------------------
# コマンドライン引数の解析
# -----------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(description="SAパラメータの最適化")
    parser.add_argument("--test", action="store_true", help="テストモードで実行")
    parser.add_argument("--trials", type=int, default=100, help="試行回数")
    return parser.parse_args()

# -----------------------------------------------------
# Optunaの実行部分
# -----------------------------------------------------
if __name__ == "__main__":
    # コマンドライン引数の解析
    args = parse_args()
    
    # テストモードかどうか
    is_test_mode = args.test
    
    # 試行回数 - データセット全体を使用するため、より多くの試行回数を設定
    n_trials = args.trials if args.trials else 200
    
    # タイムスタンプを使用して一意のスタディ名を作成
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    study_name = f"sa_optimization_{timestamp}"
    storage_name = "sqlite:///sa_optimization.db"  # 結果をSQLiteに保存
    
    # 結果保存用のディレクトリ
    results_dir = f"results_{timestamp}"
    os.makedirs(results_dir, exist_ok=True)
    
    # Optunaのスタディを作成
    study = optuna.create_study(
        study_name=study_name,
        storage=storage_name,
        direction="maximize",
        load_if_exists=True  # 既存のスタディがあれば読み込む
    )

    # 最適化を実行
    print(f"Starting optimization with {n_trials} trials...")
    study.optimize(objective, n_trials=n_trials)

    # 結果の表示
    print("\n-----------------------------------------")
    print("Optimization finished.")
    print("Number of finished trials: ", len(study.trials))

    print("\nBest trial:")
    best = study.best_trial
    bestParms = best.params | {'iterations_per_temp': best.user_attrs['iterations_per_temp']}
    print(best, "alkfjakldj")
    print(f"  Value (最小コスト): {best.value}")
    print("  Best Parameters: ")
    for key, value in bestParms.items():
        print(f"    {key}: {value}")
    
    # 結果をJSONファイルに保存
    best_params = {
        "best_value": best.value,
        "params": bestParms,
        "group_widths": best.user_attrs.get("group_widths", [])
    }
    
    with open(f"{results_dir}/best_params.json", "w") as f:
        json.dump(best_params, f, indent=2)
    
    # テストモードでなければ可視化結果を保存
    if not is_test_mode:
        save_visualization(study, results_dir)
