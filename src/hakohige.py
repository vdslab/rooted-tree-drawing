import json
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd

# --- 設定箇所 ---
# 各アルゴリズムのデータファイルパス
BASELINE_ALGORITHM_FILE = 'resultData/kison-randomParm.json'
PROPOSED_HEURISTIC_ALGORITHM_FILE = 'resultData/new-randomParm.json'
SA_FILE = 'resultData/sa-randomParm.json'
EXHAUSTIVE_SEARCH_FILE = 'resultData/zen-randomParm.json'

# 各アルゴリズムの凡例名
BASELINE_ALGORITHM_LABEL = 'Baseline Algorithm (Original Paper)'
PROPOSED_HEURISTIC_ALGORITHM_LABEL = 'Proposed Heuristic Algorithm'
SA_LABEL = 'SA Algorithm'
EXHAUSTIVE_SEARCH_LABEL = 'Exhaustive Search (Optimal Solution)'
# --- 設定箇所ここまで ---

def load_json_data(filepath):
    """指定されたJSONファイルを読み込み、データを返す"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f: # encoding='utf-8' を追加
            raw_data = json.load(f)
        return raw_data
    except FileNotFoundError:
        print(f"エラー: ファイル '{filepath}' が見つかりません。")
        return []
    except json.JSONDecodeError:
        print(f"エラー: ファイル '{filepath}' のJSON形式が不正です。")
        return []

# 各アルゴリズムの生データを読み込む
baseline_raw_data = load_json_data(BASELINE_ALGORITHM_FILE)
heuristic_raw_data = load_json_data(PROPOSED_HEURISTIC_ALGORITHM_FILE)
sa_data = load_json_data(SA_FILE)
optimal_raw_data = load_json_data(EXHAUSTIVE_SEARCH_FILE)

# 各データから 'result' の値を抽出
# 各アイテムが辞書であり、'result' キーが存在する場合のみ抽出
baseline_results = [item['result'] for item in baseline_raw_data if isinstance(item, dict) and 'result' in item]
heuristic_results = [item['result'] for item in heuristic_raw_data if isinstance(item, dict) and 'result' in item]
sa_results = [item['result'] for item in sa_data if isinstance(item, dict) and 'result' in item]
optimal_results = [item['result'] for item in optimal_raw_data if isinstance(item, dict) and 'result' in item]

# プロットできる有効なデータがあるか確認
if not baseline_results and not heuristic_results and not sa_results and not optimal_results:
    print("プロットできる有効なデータがありません。処理を終了します。")
else:
    # データを長い形式に変換（pandasのDataFrame）
    all_results_values = baseline_results + heuristic_results + sa_results + optimal_results

    algorithm_labels = ([BASELINE_ALGORITHM_LABEL] * len(baseline_results) +
                        [PROPOSED_HEURISTIC_ALGORITHM_LABEL] * len(heuristic_results) +
                        [SA_LABEL] * len(heuristic_results) +
                        [EXHAUSTIVE_SEARCH_LABEL] * len(optimal_results))

    # 英語のラベルを使う場合（もし国際的な文脈で使うなら）
    # BASELINE_ALGORITHM_LABEL_EN = 'Baseline Algorithm (Original Paper)'
    # PROPOSED_HEURISTIC_ALGORITHM_LABEL_EN = 'Proposed Heuristic Algorithm'
    # EXHAUSTIVE_SEARCH_LABEL_EN = 'Exhaustive Search (Optimal Solution)'
    # algorithm_labels_en = ([BASELINE_ALGORITHM_LABEL_EN] * len(baseline_results) +
    #                     [PROPOSED_HEURISTIC_ALGORITHM_LABEL_EN] * len(heuristic_results) +
    #                     [EXHAUSTIVE_SEARCH_LABEL_EN] * len(optimal_results))


    df_results = pd.DataFrame({
        'Result Value': all_results_values, # Y軸のラベルに合わせて列名を変更
        'Algorithm': algorithm_labels      # X軸のラベルに合わせて列名を変更
        # 'Algorithm_EN': algorithm_labels_en # 英語ラベル版
    })

    # バイオリンプロットを作成
    plt.figure(figsize=(12, 7)) # プロットのサイズを少し調整
    
    # 日本語フォントの設定 (matplotlibで日本語が表示されない場合)
    # 使用する環境に合わせてフォント名を指定してください
    # 例: Windowsなら 'Yu Gothic', macOSなら 'Hiragino Sans' など
    # plt.rcParams['font.family'] = 'IPAexGothic' # もしインストールされていれば
    # plt.rcParams['font.sans-serif'] = ['Hiragino Maru Gothic Pro', 'Yu Gothic', 'Meirio', 'Takao', 'IPAexGothic', 'IPAPGothic'] # フォント候補
    # plt.rcParams['axes.unicode_minus'] = False # マイナス記号の文字化け対策

    sns.violinplot(x='Algorithm', y='Result Value', data=df_results, inner='box', palette='Pastel1', cut=0)
    # `cut=0` を追加して、データの範囲外にバイオリンが伸びないようにする (データの最小値・最大値で止める)

    # タイトルとラベル
    plt.title('Algorithm Performance Comparison: Distribution of Result Values', fontsize=16)
    plt.ylabel('Result Value (e.g., Score, Objective Function Value)', fontsize=12) # Y軸ラベルをより具体的に
    plt.xlabel('Algorithm / Method', fontsize=12) # X軸ラベルを変更

    # X軸のラベルが長い場合に回転させる (任意)
    plt.xticks(rotation=15, ha="right", fontsize=10) # ha="right" で右寄せ

    # グリッドを追加して見やすくする (任意)
    plt.grid(axis='y', linestyle='--', alpha=0.7)

    # グラフ表示
    plt.tight_layout() # レイアウトを調整
    plt.show()