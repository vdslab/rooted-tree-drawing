#!/usr/bin/env python3
"""
国土数値情報 河川データ(W05)から、支流の合流構造を根付き木として復元し、
{name, parent, height} 形式のフラットJSON(src/App.jsx が読み込む既存データセットと同じ形式)を生成する。

データ入手元: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W05.html
設計の詳細: docs/data/kagawa-river-tree.md 参照

使い方:
    pip install pyshp
    python3 scripts/generate_river_tree.py

前提知識(W05データの属性、実データで検証済み):
  Stream(河川中心線, LineString):
    W05_001 = 水系域コード(河川コード上位6桁と一致)
    W05_002 = 河川コード(10桁)
    W05_004 = 河川名("名称不明"の場合あり)
    W05_009 = 流路始点ノードID("#t-XXXXXXX"形式、先頭#を除去して使う)
    W05_010 = 流路終点ノードID
  RiverNode(端点, Point):
    W05_000 = ノードID(t-XXXXXXX)
    W05_011 = 標高(m)

アルゴリズム:
  1. 対象水系コードでStream/RiverNodeをフィルタ
  2. 各セグメントの実長(m)をハーバサイン距離で計算
  3. 全ノードを頂点、全セグメントを辺とするグラフを構築し、各ノードの次数を計算
  4. 標高最小のノードを起点(河口)とし、連結成分ごとに「次数2のノードは
     通過するだけ(区間を延長)、次数3以上のノード(=物理的な合流点)で
     区間を区切る」方式でBFSして木を復元する(区間=run)。
     公式の河川名(river_code)は区間の境界には使わない
     (本流は複数の支流が合流しても改名しないことがあり、river_code基準で
     区切ると本流側の区間が異常に長くなるため。詳細:
     docs/data/kagawa-river-tree.md の「合流点ベースの分割」参照)。
     各runの高さは、そのrunに含まれるセグメントの実長の合計。
     runの代表名(displayName)は、run内で最も合計長が長い河川名を採用する
     (「名称不明」以外があればそちらを優先)。
  5. 複数の連結成分がある場合は、それぞれの河口側runを合成ルート直下の
     子として並べる
"""

import io
import json
import math
import os
import sys
import urllib.request
import zipfile
from collections import defaultdict, deque

import shapefile

# --- 設定 ---------------------------------------------------------------

PREF_CODE = "37"  # 香川県
KSJ_YEAR_CODE = "06"  # w05.htmlで確認したprefコード37の年度コード
# 対象水系(水系域コード)。土器川水系。空にすると香川県内の全水系を対象にする
TARGET_WATER_SYSTEMS = {"880808"}
# W05 の使用許諾は非商用なので、生成物は追跡しない local-references に置く
OUTPUT_PATH = "local-references/kagawa_river_tree.json"
ROOT_NAME = "土器川水系"
UNNAMED_LABEL = "名称不明"

DOWNLOAD_URL = (
    f"https://nlftp.mlit.go.jp/ksj/gml/data/W05/W05-{KSJ_YEAR_CODE}/"
    f"W05-{KSJ_YEAR_CODE}_{PREF_CODE}_GML.zip"
)
REFERER = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W05.html"


def download_and_extract():
    req = urllib.request.Request(
        DOWNLOAD_URL,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
            ),
            "Referer": REFERER,
        },
    )
    print(f"downloading {DOWNLOAD_URL} ...", file=sys.stderr)
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    zf = zipfile.ZipFile(io.BytesIO(data))
    stream_base = None
    node_base = None
    shp_files = {}
    for name in zf.namelist():
        if name.lower().endswith((".shp", ".shx", ".dbf")):
            base, ext = name.rsplit(".", 1)
            shp_files.setdefault(base, {})[ext.lower()] = zf.read(name)
            if base.endswith("_Stream"):
                stream_base = base
            elif base.endswith("_RiverNode"):
                node_base = base
    if stream_base is None or node_base is None:
        raise RuntimeError("Stream/RiverNode シェープファイルが zip 内に見つかりません")

    def make_reader(base):
        files = shp_files[base]
        return shapefile.Reader(
            shp=io.BytesIO(files["shp"]),
            shx=io.BytesIO(files["shx"]),
            dbf=io.BytesIO(files["dbf"]),
            encoding="shift_jis",
        )

    return make_reader(stream_base), make_reader(node_base)


def haversine(p1, p2):
    lon1, lat1 = p1
    lon2, lat2 = p2
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def line_length(points):
    return sum(haversine(points[i], points[i + 1]) for i in range(len(points) - 1))


def load_nodes(node_reader):
    nodes = {}
    for shape, rec in zip(node_reader.shapes(), node_reader.records()):
        node_id = rec["W05_000"]
        elevation = float(rec["W05_011"]) if rec["W05_011"] not in (None, "") else None
        lon, lat = shape.points[0]
        nodes[node_id] = {"lon": lon, "lat": lat, "elevation": elevation}
    return nodes


def load_segments(stream_reader, target_water_systems):
    segments = []
    for shape, rec in zip(stream_reader.shapes(), stream_reader.records()):
        water_sys = rec["W05_001"]
        if target_water_systems and water_sys not in target_water_systems:
            continue
        start = rec["W05_009"].lstrip("#")
        end = rec["W05_010"].lstrip("#")
        if start == end:
            continue  # 自己ループは無視(想定外データ)
        segments.append(
            {
                "river_code": rec["W05_002"],
                "name": rec["W05_004"],
                "start": start,
                "end": end,
                "length": line_length(shape.points),
            }
        )
    return segments


def build_river_tree_by_confluence(segments, nodes):
    """
    河川コード(公式の名前)ではなく、グラフ上の次数(トポロジー)で木を分割する。

    次数2のノードは「セグメントが単に繋がっているだけの通過点」(公式名が
    変わる場合も含む)とみなし区間(run)を延長し、次数3以上のノード
    (=複数の流れが物理的に合流する地点)でのみ区間を区切る。
    これにより、本流のように多数の支流が合流しても改名しない河川でも、
    合流のたびに区間が分割され、1ノードあたりの長さが特定の合流点間の
    距離に収まる。

    @returns list of dict(id, parent_id, name, length)
        - parent_id が None のrunは、その連結成分の最初の区間(合成ルート直下)
    """
    adjacency = defaultdict(list)  # node -> [(neighbor, segment_index), ...]
    for i, seg in enumerate(segments):
        adjacency[seg["start"]].append((seg["end"], i))
        adjacency[seg["end"]].append((seg["start"], i))

    degree = {n: len(adj) for n, adj in adjacency.items()}
    all_nodes_in_graph = set(adjacency.keys())

    def elevation_of(n):
        e = nodes.get(n, {}).get("elevation")
        return e if e is not None else math.inf

    def dominant_name(seg_indices):
        totals = defaultdict(float)
        for i in seg_indices:
            totals[segments[i]["name"]] += segments[i]["length"]
        named = {name: total for name, total in totals.items() if name != UNNAMED_LABEL}
        pool = named if named else totals
        return max(pool.items(), key=lambda kv: kv[1])[0]

    visited_segments = set()

    def walk_run(first_neighbor, first_seg_idx):
        """次数2のノードを辿れるだけ辿り、1区間分をまとめる。
        @returns (end_node, total_length, seg_indices)"""
        seg_indices = [first_seg_idx]
        visited_segments.add(first_seg_idx)
        total_length = segments[first_seg_idx]["length"]
        current = first_neighbor
        while degree.get(current, 0) == 2:
            next_edge = next(
                ((nbr, idx) for nbr, idx in adjacency[current] if idx not in visited_segments),
                None,
            )
            if next_edge is None:
                break  # 閉路などの想定外データ: これ以上未訪問エッジがなければ打ち切り
            nbr, idx = next_edge
            visited_segments.add(idx)
            total_length += segments[idx]["length"]
            seg_indices.append(idx)
            current = nbr
        return current, total_length, seg_indices

    runs = []  # {id, parent_id, name, length}
    run_counter = 0

    remaining_component_nodes = set(all_nodes_in_graph)
    while remaining_component_nodes:
        probe = next(iter(remaining_component_nodes))
        comp_nodes = {probe}
        dq = deque([probe])
        while dq:
            u = dq.popleft()
            for v, _i in adjacency[u]:
                if v not in comp_nodes:
                    comp_nodes.add(v)
                    dq.append(v)
        remaining_component_nodes -= comp_nodes

        root_node = min(comp_nodes, key=elevation_of)

        # (起点ノード, 辿る先のノード, 使うセグメントindex, 親run_id)
        bfs_queue = deque(
            (root_node, nbr, idx, None)
            for nbr, idx in adjacency[root_node]
            if idx not in visited_segments
        )

        while bfs_queue:
            _start_node, first_neighbor, first_seg_idx, parent_run_id = bfs_queue.popleft()
            if first_seg_idx in visited_segments:
                continue  # 別のrunから既に辿られた分岐(通常は起きないが念のため)
            end_node, total_length, seg_indices = walk_run(first_neighbor, first_seg_idx)
            run_counter += 1
            run_id = f"seg{run_counter}"
            runs.append(
                {
                    "id": run_id,
                    "parent_id": parent_run_id,
                    "name": dominant_name(seg_indices),
                    "length": total_length,
                }
            )
            for nbr, idx in adjacency[end_node]:
                if idx not in visited_segments:
                    bfs_queue.append((end_node, nbr, idx, run_id))

    unused = len(segments) - len(visited_segments)
    if unused:
        print(f"warning: {unused} segments unreachable from any mouth (cycle?)", file=sys.stderr)

    return runs


def main():
    stream_reader, node_reader = download_and_extract()
    nodes = load_nodes(node_reader)
    segments = load_segments(stream_reader, TARGET_WATER_SYSTEMS)
    print(f"segments: {len(segments)}", file=sys.stderr)

    runs = build_river_tree_by_confluence(segments, nodes)
    print(f"runs (合流点で区切った区間数): {len(runs)}", file=sys.stderr)

    # JSON組み立て
    # runのidは合成id(seg1, seg2, ...)。表示名は displayName に持たせる。
    output = [{"name": ROOT_NAME, "parent": "", "height": 1, "width": 1000}]
    for run in runs:
        parent_name = run["parent_id"] if run["parent_id"] is not None else ROOT_NAME
        height = round(run["length"])
        output.append(
            {
                "name": run["id"],
                "displayName": run["name"],
                "parent": parent_name,
                "height": max(height, 1),
                "width": 1000,
            }
        )

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"wrote {OUTPUT_PATH}: {len(output)} nodes", file=sys.stderr)


if __name__ == "__main__":
    main()
