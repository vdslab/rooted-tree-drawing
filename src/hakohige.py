import json
import matplotlib.pyplot as plt

# JSONファイルを読み込む
with open('data.json', 'r') as f:
    data = json.load(f)

# 箱ひげ図を描画
plt.boxplot(data, vert=True, patch_artist=True, boxprops=dict(facecolor="lightblue"))

# ラベルとタイトル
plt.title("Box Plot of Data")
plt.ylabel("Value")

# グラフを表示
plt.show()