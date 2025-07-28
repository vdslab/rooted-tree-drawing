import json
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import glob  # ファイル一覧を取得するために追加
import os    # ファイルパスを操作するために追加

# --- 設定箇所 ---
# データが格納されているフォルダのパス
DATA_FOLDER = 'resultData'
# --- 設定箇所ここまで ---

def load_json_data(filepath):
    """指定されたJSONファイルを読み込み、データを返す"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        return raw_data
    except FileNotFoundError:
        print(f"エラー: ファイル '{filepath}' が見つかりません。")
        return []
    except json.JSONDecodeError:
        print(f"エラー: ファイル '{filepath}' のJSON形式が不正です。")
        return []

def create_violin_plot():
    """指定されたフォルダのデータからバイオリンプロットを作成する"""
    
    # 指定されたフォルダ内のすべての.jsonファイルのパスを取得
    json_files = glob.glob(os.path.join(DATA_FOLDER, '*.json'))

    if not json_files:
        print(f"エラー: フォルダ '{DATA_FOLDER}' 内にJSONファイルが見つかりませんでした。")
        return

    all_results_values = []
    algorithm_labels = []

    # 各JSONファイルをループ処理
    for filepath in json_files:
        # ファイル名からアルゴリズム名（凡例）を生成
        # 例: 'resultData/kison-randomParm.json' -> 'kison-randomParm'
        filename = os.path.basename(filepath)
        algorithm_name, _ = os.path.splitext(filename)
        
        # データを読み込み、'result'の値を抽出
        raw_data = load_json_data(filepath)
        results = [item['result'] for item in raw_data if isinstance(item, dict) and 'result' in item]

        # 有効なデータがあった場合のみリストに追加
        if results:
            all_results_values.extend(results)
            algorithm_labels.extend([algorithm_name] * len(results))
        else:
            print(f"警告: ファイル '{filepath}' から有効なデータが抽出できませんでした。スキップします。")

    # プロットできる有効なデータがあるか確認
    if not all_results_values:
        print("プロットできる有効なデータがありません。処理を終了します。")
        return

    # データを長い形式に変換（pandasのDataFrame）
    df_results = pd.DataFrame({
        'Result Value': all_results_values,
        'Algorithm': algorithm_labels
    })

    # バイオリンプロットを作成
    # ファイル数に応じて横幅を動的に調整しても良い
    fig_width = max(12, len(json_files) * 2) 
    plt.figure(figsize=(fig_width, 7))
    
    # --- 日本語フォントの設定 (必要な場合) ---
    # plt.rcParams['font.family'] = 'IPAexGothic'
    # plt.rcParams['font.sans-serif'] = ['Hiragino Maru Gothic Pro', 'Yu Gothic', 'Meirio']
    # plt.rcParams['axes.unicode_minus'] = False
    
    sns.violinplot(x='Algorithm', y='Result Value', data=df_results, inner='box', palette='Pastel1', cut=0)
    
    # タイトルとラベル
    plt.title('Algorithm Performance Comparison: Distribution of Result Values', fontsize=16)
    plt.ylabel('Result Value (e.g., Score, Objective Function Value)', fontsize=12)
    plt.xlabel('Algorithm / Method', fontsize=12)

    # X軸のラベルが長い場合に回転させる
    plt.xticks(rotation=30, ha="right", fontsize=10)

    # グリッドを追加
    plt.grid(axis='y', linestyle='--', alpha=0.7)

    # レイアウトを調整してグラフを表示
    plt.tight_layout()
    plt.show()

# メイン処理の実行
if __name__ == '__main__':
    create_violin_plot()