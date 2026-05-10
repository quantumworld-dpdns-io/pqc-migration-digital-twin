from __future__ import annotations

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from service import Metrics


class ServiceMetricsUnitTests(unittest.TestCase):
    def test_metrics_render_contains_red_fields(self) -> None:
        metrics = Metrics()
        metrics.record(status=200, latency_ms=3)
        metrics.record(status=500, latency_ms=7)
        out = metrics.render()
        self.assertIn("request_count 2", out)
        self.assertIn("error_count 1", out)
        self.assertIn("latency_ms_sum 10", out)
        self.assertIn("latency_ms_max 7", out)


if __name__ == "__main__":
    unittest.main()
