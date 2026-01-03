import json
import matplotlib.pyplot as plt
import numpy as np
from scipy import stats

# JSONファイルを読み込み
with open('computation_time_results.json', 'r') as f:
    data = json.load(f)

# データを取得
node_counts = [d['nodeCount'] for d in data['nodeCountAnalysis']]
existing_times = [d['existingTime'] for d in data['nodeCountAnalysis']]
proposed_times = [d['proposedTime'] for d in data['nodeCountAnalysis']]

# 線形回帰を計算
existing_slope, existing_intercept, existing_r, _, _ = stats.linregress(node_counts, existing_times)
proposed_slope, proposed_intercept, proposed_r, _, _ = stats.linregress(node_counts, proposed_times)

# 回帰直線用のデータ
node_counts_line = np.linspace(min(node_counts), max(node_counts), 100)
existing_line = existing_slope * node_counts_line + existing_intercept
proposed_line = proposed_slope * node_counts_line + proposed_intercept

# プロット設定（論文用）
plt.rcParams['font.size'] = 12
plt.rcParams['axes.labelsize'] = 14
plt.rcParams['legend.fontsize'] = 11

# グラフを作成
plt.figure(figsize=(10, 6))

# 散布図をプロット（透明度を上げて、サイズを小さく）
plt.scatter(node_counts, existing_times, alpha=0.3, color='#666666', s=20, zorder=2)
plt.scatter(node_counts, proposed_times, alpha=0.3, color='#4169E1', s=20, zorder=2)

# 回帰直線をプロット（太く、濃く、前面に表示）
plt.plot(node_counts_line, existing_line, '--', color='#333333', linewidth=3, 
         label='Existing Method', zorder=3)
plt.plot(node_counts_line, proposed_line, '-', color='#0000CD', linewidth=3,
         label='Proposed Method', zorder=3)

# 軸ラベルを設定
plt.xlabel('Number of Nodes')
plt.ylabel('Computation Time (ms)')

# 凡例とグリッド
plt.legend(loc='upper left')
plt.grid(True, linestyle='--', alpha=0.3)
plt.tight_layout()

# 保存
plt.savefig('computation_time_analysis.png', dpi=300, bbox_inches='tight')
print("グラフを computation_time_analysis.png に保存しました。")

# 統計情報を表示
print("\n=== 線形回帰の結果 ===")
print(f"Existing Method: y = {existing_slope:.3f}x + {existing_intercept:.1f} (R² = {existing_r**2:.3f})")
print(f"Proposed Method: y = {proposed_slope:.3f}x + {proposed_intercept:.1f} (R² = {proposed_r**2:.3f})")
print(f"\n試行回数: {len(node_counts)}")
print(f"ノード数範囲: {min(node_counts)} ~ {max(node_counts)}")

plt.show()
