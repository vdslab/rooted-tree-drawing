"""欠測を隠した図を作らない。旧形式でも非有限値・件数不足を検査する。"""
import math


def require_complete(payload):
    if payload.get("failures"):
        raise ValueError("Incomplete experiment: failures are recorded; inspect the result JSON before plotting")
    expected = payload.get("config", {}).get("trials")
    for level, cases in payload["results"].items():
        for case, methods in cases.items():
            for method, values in methods.items():
                if not values or (expected is not None and len(values) != expected):
                    raise ValueError(f"Incomplete experiment: {level}/{case}/{method} has {len(values)} samples, expected {expected}")
                if any(not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) for v in values):
                    raise ValueError(f"Incomplete experiment: {level}/{case}/{method} contains missing/non-finite values")
