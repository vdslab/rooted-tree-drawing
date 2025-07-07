import json
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd

with open('resultData/kison-randomParm.json', 'r') as f:
    newData = json.load(f)

import pandas as pd
import plotly.express as px

# 1. サンプルデータの準備
# ユーザー提供の形式に似せたサンプルデータ
# "data" キーの中身は、ここでは単純なリストとしていますが、
# 実際にはもっと複雑なオブジェクトのリストかもしれません。
# この例では "data" リストの要素数を新しい特徴量として加えます。

# 2. データの加工とDataFrameへの変換
processed_data = []
for item in newData:
    new_item = {
        'result': item['result'],
        'max_ori': item['max_ori'],
        'sum_ori': item['sum_ori'],
        'alpha': item['alpha'],
        'nodesNum': item['nodesNum'],
        'aspect': item['aspect'],
        # 'data'キーのリストの長さを新しい特徴量として追加
        # 'num_items_in_data': len(item.get('data', [])),
        # もし 'data' の中の特定の数値属性の合計/平均などを使いたい場合:
        # 'sum_val_in_data': sum(d.get('val', 0) for d in item.get('data', [])),
    }
    processed_data.append(new_item)

df = pd.DataFrame(processed_data)

# 3. パラレルコーディネートプロットの作成
# プロットに含める列（次元）を選択します。
# "result" を含め、影響を分析したい他の数値列を指定します。
dimensions_to_plot = ['result', 'max_ori', 'sum_ori', 'alpha',
        'nodesNum',
        'aspect']
# もし上記で 'sum_val_in_data' のような特徴量も作成していたら、それもリストに追加できます。
# dimensions_to_plot = ['result', 'max_ori', 'sum_ori', 'num_items_in_data', 'sum_val_in_data']


# `result` の値で線の色を変化させます。
# これにより、resultが高い/低いデータが他の次元でどのような値を取るかの傾向が見やすくなります。
fig = px.parallel_coordinates(
    df,
    dimensions=dimensions_to_plot,
    color='result',  # この列の値で線の色を変化させる
    color_continuous_scale=px.colors.sequential.Viridis, # カラースケールの例 (他にも多数あり)
    # color_continuous_scale=px.colors.diverging.Tealrose,
    labels={ # 軸ラベルを日本語にしたい場合など
        'result': '描画効率 (result)',
        'max_ori': '最大Ori',
        'sum_ori': '合計Ori',
        'alpha': 'α',
        'nodesNum': 'ノード数',
        'aspect':'アスペクト比'
        # 'num_items_in_data': 'データ内アイテム数'
        # 'sum_val_in_data': 'データ内val合計'
    }
)

# プロットのタイトル
fig.update_layout(
    title_text="パラレルコーディネートプロット (描画効率の要因分析)"
)

# プロットを表示
fig.show()

# どのようなデータが 'result' が高くなる/低くなる傾向にあるか、
# 各軸の線の通り方や色の変化から読み取ることができます。
# 例えば、
# - 'result' が高い線（色が明るい/濃いなど、カラースケールによる）は、
#   'max_ori' の軸では低い値を通り、'sum_ori' の軸では高い値を通る、などの傾向が見えるかもしれません。
# - 特定の軸で線をドラッグして範囲選択すると、その条件に合致するデータのみがハイライトされ、
#   他の軸での挙動を詳しく見ることができます (インタラクティブ機能)。