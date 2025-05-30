import json
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd

# JSONファイルを読み込む
with open('resultData/kisonAspect:500:1000.json', 'r') as f:
    data = json.load(f)

with open('resultData/newAspect:500:1000.json', 'r') as f:
    newData = json.load(f)

# データを長い形式に変換（pandasのDataFrame）
df = pd.DataFrame({
    'value': data + newData,
    'group': ['kisonAspect'] * len(data) + ['newAspect'] * len(newData)
})

# バイオリンプロットを作成
sns.violinplot(x='group', y='value', data=df, inner='box', palette='Pastel1')

# タイトルとラベル
plt.title('Violin Plot Comparison')
plt.ylabel('Value')
plt.xlabel('Group')

# グラフ表示
plt.show()
