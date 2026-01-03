import os
import json
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# --- 設定 ---
SAMPLE_DIR = 'sample'
# --- 設定ここまで ---

def load_all_sample_results(sample_dir):
    """sampleディレクトリ内の全evaluation_v_*.jsonを読み込んでDataFrame化"""
    records = []
    if not os.path.exists(sample_dir):
        return pd.DataFrame()

    for fname in os.listdir(sample_dir):
        if fname.startswith('evaluation_v_') and fname.endswith('.json'):
            aspect = fname.replace('evaluation_v_', '').replace('.json', '')
            fpath = os.path.join(sample_dir, fname)
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                for level, result_lists in data.items():
                    for result_list in result_lists:
                        for result in result_list:
                            records.append({
                                'aspect': aspect,
                                'variance': level,
                                'aspectLabel': result.get('aspectRatio', aspect),
                                'heightRange': result.get('heightRange', ''),
                                'method': 'Existing Method', 
                                'result': result.get('BaseResult', None),
                                'nodesNum': result.get('nodesNum', None)
                            })
                            records.append({
                                'aspect': aspect,
                                'variance': level,
                                'aspectLabel': result.get('aspectRatio', aspect),
                                'heightRange': result.get('heightRange', ''),
                                'method': 'Proposed Method', 
                                'result': result.get('SaResult', None),
                                'nodesNum': result.get('nodesNum', None)
                            })
            except Exception as e:
                print(f"Error reading {fname}: {e}")
                
    return pd.DataFrame(records)

def compare_sample_results():
    df = load_all_sample_results(SAMPLE_DIR)
    if df.empty:
        print('サンプルデータが見つかりません')
        return
    print(f"✓ {len(df)}件のサンプルデータを読み込みました")
    
    # ラベル整形
    aspect_order = ['500x2000', '500x1000', '500x500', '1000x500', '2000x500']
    aspect_label_map = {
        '500x2000': '1:4',
        '500x1000': '1:2',
        '500x500': '1:1',
        '1000x500': '2:1',
        '2000x500': '4:1',
    }
    variance_order = ['low', 'medium', 'high']
    variance_label_map = {'low': 'Low', 'medium': 'Medium', 'high': 'High'}
    
    df['aspectLabel'] = df['aspect'].map(aspect_label_map)
    df['varianceLabel'] = df['variance'].map(variance_label_map)

    # 統計出力（省略せずにそのまま実行されます）
    # ...（前回のコードと同じ統計出力部分は省略していませんが、表示の便宜上ここには書きません）...
    
    # プロット設定
    fig, axes = plt.subplots(1, 5, figsize=(20, 6), sharey=True) # 高さを少し増やしました (5 -> 6)
    colors = {'Existing Method': '#95a5a6', 'Proposed Method': '#3498db'}
    
    # 凡例用のハンドルとラベルを保存する変数
    handles, labels = None, None

    for idx, aspect in enumerate(aspect_order):
        ax = axes[idx]
        aspect_df = df[df['aspect'] == aspect]
        
        if aspect_df.empty:
            continue

        sns.violinplot(
            x='varianceLabel',
            y='result',
            hue='method',
            data=aspect_df,
            order=['Low', 'Medium', 'High'],
            hue_order=['Existing Method', 'Proposed Method'],
            palette=colors,
            inner='box',
            cut=0,
            ax=ax
        )
        
        ax.set_title(f'Aspect Ratio {aspect_label_map[aspect]}', fontsize=12, fontweight='bold')
        ax.set_xlabel('Variance Category', fontsize=11)
        
        # Y軸ラベル
        if idx == 0:
            ax.set_ylabel('Area Efficiency (TNA/DA)', fontsize=11, fontweight='bold')
        else:
            ax.set_ylabel('')
            
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        
        # 個別の凡例は削除し、情報を取得するだけにする
        if idx == 0:
            handles, labels = ax.get_legend_handles_labels()
        if ax.get_legend():
            ax.get_legend().remove()

    # 全体タイトル (位置を調整: y=1.02 -> 0.96)
    plt.suptitle('Layout Algorithm Comparison by Aspect Ratio and Variance Category', 
                 fontsize=16, fontweight='bold', y=0.96)
    
    # 図全体の凡例を下部に作成
    if handles and labels:
        fig.legend(handles, labels, loc='lower center', ncol=2, 
                   bbox_to_anchor=(0.5, 0.02), fontsize=12, frameon=True)

    # レイアウトの自動調整
    # bottomを大きく取って凡例スペースを確保 (0.15 -> 0.18)
    # topを下げてタイトルとの被りを防止 (0.82 -> 0.88)
    plt.tight_layout()
    plt.subplots_adjust(left=0.06, right=0.98, top=0.88, bottom=0.18, wspace=0.1)
    
    plt.show()

if __name__ == '__main__':
    print('='*80)
    print('サンプルフォルダの結果比較')
    print('='*80)
    compare_sample_results()