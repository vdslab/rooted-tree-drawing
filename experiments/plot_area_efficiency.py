"""
experiments/area_efficiency.js の出力(experiments/results/area_efficiency_*.json)から
バイオリンプロットを描画する。

evaluationブランチの src/compare_sample_results.py(論文Figure 3の生成スクリプト、
Existing/Proposedの2手法版)を、5手法(existing/sa-paper/lpt/ffd/bfd)に一般化したもの。

使い方:
    pip install matplotlib seaborn pandas
    python3 experiments/plot_area_efficiency.py [結果jsonのパス]
    python3 experiments/plot_area_efficiency.py --growth   (growth_lpt版の最新を自動選択)

パス省略時は experiments/results/ の最新の area_efficiency_<runId>.json を選ぶ。
"_trials.json"(木データ)と "_growth_lpt_"(別の手法セット)は、明示的に指定するか
--growth を付けない限り選ばれない。
"""
import json
import os
import re
import sys

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

ASPECT_ORDER = ["1:4", "1:2", "1:1", "2:1", "4:1"]
VARIANCE_ORDER = ["low", "medium", "high", "extreme"]
VARIANCE_LABEL_MAP = {"low": "Low", "medium": "Medium", "high": "High", "extreme": "Extreme"}
# 手法名は experiments/lib/methods.js のレジストリと対応する。
# "lpt"/"ffd"/"bfd" は paper5 セットでの budget系の旧名（過去の結果ファイル互換）。
METHOD_LABEL_MAP = {
    "existing": "Existing Method",
    "sa-paper": "Proposed (SA, paper)",
    "lpt": "Proposed (LPT)",
    "ffd": "Proposed (FFD)",
    "bfd": "Proposed (BFD)",
    "growth-lpt": "Growth + LPT",
    "budget-lpt": "Budget (H_t) + LPT",
    "budget-ffd": "Budget (H_t) + FFD",
    "budget-bfd": "Budget (H_t) + BFD",
}
METHOD_ORDER = [
    "existing", "sa-paper", "lpt", "ffd", "bfd",
    "growth-lpt", "budget-lpt", "budget-ffd", "budget-bfd",
]
COLORS = {
    "Existing Method": "#95a5a6",
    "Proposed (SA, paper)": "#3498db",
    "Proposed (LPT)": "#2ecc71",
    "Proposed (FFD)": "#e67e22",
    "Proposed (BFD)": "#9b59b6",
    "Growth + LPT": "#2ecc71",
    "Budget (H_t) + LPT": "#e67e22",
    "Budget (H_t) + FFD": "#9b59b6",
    "Budget (H_t) + BFD": "#e74c3c",
}


def find_latest_result(prefix="area_efficiency"):
    """<prefix>_<runId>.json のうち runId が最大のものを返す。

    glob だと "_trials.json" や別プレフィックスの "area_efficiency_growth_lpt_*" まで
    拾ってしまい、辞書順で最後に来るファイル（=中身が木データの _trials.json）を
    掴んでいたため、runId を数値として比較する。
    """
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)\.json$")
    if not os.path.isdir(RESULTS_DIR):
        raise FileNotFoundError(
            f"{RESULTS_DIR} がない。実験結果は .gitignore 済みなので、まず実験を回すこと:\n"
            f"  TRIALS=5 SEED=1 node experiments/area_efficiency.js"
        )
    candidates = []
    for name in os.listdir(RESULTS_DIR):
        m = pattern.match(name)
        if m:
            candidates.append((int(m.group(1)), os.path.join(RESULTS_DIR, name)))
    if not candidates:
        raise FileNotFoundError(f"{RESULTS_DIR} に {prefix}_<runId>.json が見つかりません")
    return max(candidates)[1]


def load_dataframe(path):
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    records = []
    for level, by_aspect in payload["results"].items():
        for aspect, by_method in by_aspect.items():
            for method, values in by_method.items():
                for v in values:
                    records.append(
                        {
                            "variance": level,
                            "varianceLabel": VARIANCE_LABEL_MAP.get(level, level.capitalize()),
                            "aspect": aspect,
                            "method": METHOD_LABEL_MAP.get(method, method),
                            "result": v,
                        }
                    )
    return pd.DataFrame(records), payload.get("config", {})


def plot(df, config, out_path):
    present = set(df["method"])
    method_order_labels = [
        METHOD_LABEL_MAP[m] for m in METHOD_ORDER
        if m in METHOD_LABEL_MAP and METHOD_LABEL_MAP[m] in present
    ]
    variance_labels = [
        VARIANCE_LABEL_MAP[v] for v in VARIANCE_ORDER
        if VARIANCE_LABEL_MAP[v] in set(df["varianceLabel"])
    ]

    fig, axes = plt.subplots(1, len(ASPECT_ORDER), figsize=(24, 6), sharey=True)
    handles, labels = None, None

    for idx, aspect in enumerate(ASPECT_ORDER):
        ax = axes[idx]
        aspect_df = df[df["aspect"] == aspect]
        if aspect_df.empty:
            continue

        sns.violinplot(
            x="varianceLabel",
            y="result",
            hue="method",
            data=aspect_df,
            order=variance_labels,
            hue_order=method_order_labels,
            palette=COLORS,
            inner="box",
            cut=0,
            ax=ax,
        )

        ax.set_title(f"Aspect Ratio {aspect}", fontsize=12, fontweight="bold")
        ax.set_xlabel("Variance Category", fontsize=11)
        if idx == 0:
            ax.set_ylabel("Area Efficiency (TNA/DA)", fontsize=11, fontweight="bold")
        else:
            ax.set_ylabel("")
        ax.grid(axis="y", linestyle="--", alpha=0.5)

        if idx == 0:
            handles, labels = ax.get_legend_handles_labels()
        if ax.get_legend():
            ax.get_legend().remove()

    trials = config.get("trials", "?")
    plt.suptitle(
        f"Area Efficiency (TNA/DA) by Aspect Ratio and Variance (trials={trials})",
        fontsize=16,
        fontweight="bold",
        y=0.98,
    )
    if handles and labels:
        fig.legend(handles, labels, loc="lower center", ncol=len(labels), bbox_to_anchor=(0.5, 0.0), fontsize=11, frameon=True)

    plt.tight_layout()
    plt.subplots_adjust(left=0.05, right=0.99, top=0.86, bottom=0.22, wspace=0.08)
    plt.savefig(out_path, dpi=150)
    print(f"保存しました: {out_path}")


def main():
    args = [a for a in sys.argv[1:] if a != "--growth"]
    prefix = "area_efficiency_growth_lpt" if "--growth" in sys.argv else "area_efficiency"
    path = args[0] if args else find_latest_result(prefix)
    print(f"読み込み: {path}")
    df, config = load_dataframe(path)
    print(f"{len(df)}件のデータ点を読み込みました")

    out_path = os.path.splitext(path)[0] + "_violin.png"
    plot(df, config, out_path)


if __name__ == "__main__":
    main()
