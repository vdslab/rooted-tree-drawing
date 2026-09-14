"""
experiments/computation_time.js の出力(experiments/results/computation_time_*.json)から
ノード数に対する計算時間のスケーリングを折れ線グラフ(対数軸)で描画する。
分散レベル(Low/Medium/High)ごとに1パネル、手法ごとに1本の線。

使い方:
    python3 experiments/plot_computation_time.py [結果jsonのパス]
    python3 experiments/plot_computation_time.py --growth   (growth_lpt版の最新を自動選択)

パス省略時は experiments/results/ の最新の computation_time_<runId>.json を選ぶ。
"_trials.json" と "_growth_lpt_" は、明示指定するか --growth を付けない限り選ばれない。
"""
import json
import os
import re
import sys

import matplotlib.pyplot as plt
import pandas as pd

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

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
MARKERS = {
    "Existing Method": "o",
    "Proposed (SA, paper)": "s",
    "Proposed (LPT)": "^",
    "Proposed (FFD)": "D",
    "Proposed (BFD)": "v",
    "Growth + LPT": "^",
    "Budget (H_t) + LPT": "D",
    "Budget (H_t) + FFD": "v",
    "Budget (H_t) + BFD": "P",
}


def find_latest_result(prefix="computation_time"):
    """<prefix>_<runId>.json のうち runId が最大のものを返す。

    glob + 辞書順だと "_trials.json"(木データ) や別プレフィックスの
    "computation_time_growth_lpt_*" を掴んでしまうため、runId を数値で比較する。
    """
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)\.json$")
    if not os.path.isdir(RESULTS_DIR):
        raise FileNotFoundError(
            f"{RESULTS_DIR} がない。実験結果は .gitignore 済みなので、まず実験を回すこと:\n"
            f"  TRIALS=5 SEED=1 node experiments/computation_time.js"
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
    for level, by_count in payload["results"].items():
        for node_count, by_method in by_count.items():
            for method, values in by_method.items():
                for v in values:
                    records.append(
                        {
                            "variance": level,
                            "varianceLabel": VARIANCE_LABEL_MAP.get(level, level.capitalize()),
                            "nodeCount": int(node_count),
                            "method": METHOD_LABEL_MAP.get(method, method),
                            "seconds": v,
                        }
                    )
    return pd.DataFrame(records), payload.get("config", {})


def plot(df, config, out_path):
    # 結果ファイルに実際に入っている手法・分散レベルだけを描く
    present_methods = set(df["method"])
    method_labels = [
        METHOD_LABEL_MAP[m] for m in METHOD_ORDER
        if m in METHOD_LABEL_MAP and METHOD_LABEL_MAP[m] in present_methods
    ]
    levels = [v for v in VARIANCE_ORDER if v in set(df["variance"])]

    fig, axes = plt.subplots(1, len(levels), figsize=(16, 5.5), sharey=True, squeeze=False)
    axes = axes[0]

    for idx, level in enumerate(levels):
        ax = axes[idx]
        level_df = df[df["variance"] == level]

        for method in method_labels:
            m_df = level_df[level_df["method"] == method]
            stats = m_df.groupby("nodeCount")["seconds"].agg(["mean", "std"]).reset_index().sort_values("nodeCount")
            ax.errorbar(
                stats["nodeCount"],
                stats["mean"],
                yerr=stats["std"],
                label=method,
                color=COLORS[method],
                marker=MARKERS[method],
                markersize=6,
                capsize=3,
                linewidth=1.8,
            )

        ax.set_xscale("log")
        ax.set_yscale("log")
        ax.set_title(f"Variance: {VARIANCE_LABEL_MAP.get(level, level.capitalize())}", fontsize=12, fontweight="bold")
        ax.set_xlabel("Node Count (|V|)", fontsize=11)
        if idx == 0:
            ax.set_ylabel("Computation Time (s)", fontsize=11, fontweight="bold")
        ax.grid(True, which="both", linestyle="--", alpha=0.4)

    handles, labels = axes[0].get_legend_handles_labels()
    trials = config.get("trials", "?")
    plt.suptitle(
        f"Computation Time vs Node Count, aspect 4:1 (trials={trials})",
        fontsize=15,
        fontweight="bold",
        y=1.02,
    )
    fig.legend(handles, labels, loc="lower center", ncol=len(labels), bbox_to_anchor=(0.5, -0.06), fontsize=10, frameon=True)

    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    print(f"保存しました: {out_path}")


def main():
    args = [a for a in sys.argv[1:] if a != "--growth"]
    prefix = "computation_time_growth_lpt" if "--growth" in sys.argv else "computation_time"
    path = args[0] if args else find_latest_result(prefix)
    print(f"読み込み: {path}")
    df, config = load_dataframe(path)
    print(f"{len(df)}件のデータ点を読み込みました")

    out_path = os.path.splitext(path)[0] + "_scaling.png"
    plot(df, config, out_path)


if __name__ == "__main__":
    main()
