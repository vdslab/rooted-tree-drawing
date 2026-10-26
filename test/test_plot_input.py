import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "experiments"))
from plot_input import require_complete


class PlotInputTest(unittest.TestCase):
    def test_complete_and_missing(self):
        for values, expected in [([1, 2], True), ([1, None], False), ([1], False), ([1, float("nan")], False)]:
            payload = {"config": {"trials": 2}, "results": {"low": {"1:4": {"existing": values}}}}
            if expected:
                require_complete(payload)
            else:
                with self.assertRaises(ValueError):
                    require_complete(payload)

    def test_recorded_failures(self):
        with self.assertRaises(ValueError):
            require_complete({"failures": [{"error": "failed"}], "results": {}})


if __name__ == "__main__":
    unittest.main()
