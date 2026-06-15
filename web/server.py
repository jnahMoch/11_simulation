"""Local web server that connects the dashboard to the SimPy simulation."""

from __future__ import annotations

import contextlib
import io
import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from simulation.config import DEFAULT_CONFIG, SimulationConfig  # noqa: E402
from simulation.run import print_results, run_simulation  # noqa: E402


class SimulationHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        if parsed_url.path == "/api/simulation":
            self.send_simulation(parsed_url.query)
            return

        super().do_GET()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_simulation(self, query: str) -> None:
        config = config_from_query(parse_qs(query))

        console_buffer = io.StringIO()
        with contextlib.redirect_stdout(console_buffer):
            metrics = run_simulation(config)
            print_results(metrics, config)

        payload = summary_payload(metrics, config)
        payload["consoleOutput"] = console_buffer.getvalue()
        body = json.dumps(payload).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def config_from_query(params: dict[str, list[str]]) -> SimulationConfig:
    sim_minutes = number_param(params, "simTimeMinutes", DEFAULT_CONFIG.sim_time / 60)
    arrival_mean = number_param(params, "arrivalMeanSeconds", 1 / DEFAULT_CONFIG.arrival_rate)
    service_mean = number_param(params, "serviceMeanSeconds", 1 / DEFAULT_CONFIG.service_rate)
    shopping_min = number_param(params, "shoppingMinSeconds", DEFAULT_CONFIG.shopping_min)
    shopping_max = number_param(params, "shoppingMaxSeconds", DEFAULT_CONFIG.shopping_max)
    pos_lanes = int(number_param(params, "posLanes", DEFAULT_CONFIG.pos_lanes))
    seed = int(number_param(params, "seed", DEFAULT_CONFIG.random_seed))
    peak_enabled = params.get("peakEnabled", ["1"])[0] == "1"
    surge_multiplier = number_param(params, "surgeMultiplier", 2)

    return SimulationConfig(
        total_staff=DEFAULT_CONFIG.total_staff,
        pos_lanes=max(1, pos_lanes),
        initial_active_cashiers=max(1, min(pos_lanes, DEFAULT_CONFIG.pos_lanes)),
        queue_open_threshold=DEFAULT_CONFIG.queue_open_threshold,
        queue_close_threshold=DEFAULT_CONFIG.queue_close_threshold,
        wait_open_threshold=DEFAULT_CONFIG.wait_open_threshold,
        wait_close_threshold=DEFAULT_CONFIG.wait_close_threshold,
        pos_monitor_interval=DEFAULT_CONFIG.pos_monitor_interval,
        arrival_rate=1 / max(1, arrival_mean),
        peak_arrival_rate=peak_rate_for(arrival_mean, surge_multiplier),
        service_rate=1 / max(1, service_mean),
        shopping_min=max(0, min(shopping_min, shopping_max)),
        shopping_max=max(shopping_min, shopping_max),
        sim_time=max(60, sim_minutes * 60),
        random_seed=seed,
        peak_enabled=peak_enabled,
        morning_peak=DEFAULT_CONFIG.morning_peak,
        evening_peak=DEFAULT_CONFIG.evening_peak,
        night_peak=DEFAULT_CONFIG.night_peak,
        night_shift=DEFAULT_CONFIG.night_shift,
        utility_tasks=DEFAULT_CONFIG.utility_tasks,
        utility_task_interval=DEFAULT_CONFIG.utility_task_interval,
        utility_task_duration=DEFAULT_CONFIG.utility_task_duration,
        upset_wait_time=DEFAULT_CONFIG.upset_wait_time,
    )


def summary_payload(metrics, config: SimulationConfig) -> dict[str, object]:
    return {
        "customersArrived": metrics.arrived_customers,
        "customersServed": metrics.completed_customers,
        "averageWaitingTime": metrics.average_waiting_time,
        "maximumWaitingTime": max(metrics.waiting_times, default=0),
        "peakAverageWaitingTime": metrics.peak_average_waiting_time,
        "offPeakAverageWaitingTime": metrics.off_peak_average_waiting_time,
        "averageServiceTime": metrics.average_service_time,
        "averageCycleTime": metrics.average_cycle_time,
        "averageQueueLength": metrics.average_queue_length,
        "maximumQueueLength": metrics.max_queue_length,
        "cashierUtilization": metrics.cashier_utilization(config.sim_time, config.pos_lanes),
        "maximumBusyCashiers": metrics.max_busy_cashiers,
        "averageActivePosLanes": metrics.average_active_cashiers,
        "pos2Activations": metrics.pos2_activation_count,
        "utilityWorkloadMinutes": metrics.total_utility_workload / 60,
        "utilityWorkloadByStaff": {
            staff_name: workload / 60
            for staff_name, workload in sorted(metrics.utility_workload.items())
        },
        "eventLog": metrics.event_log[-14:],
        "series": {
            "queueLength": sampled_series(metrics.queue_samples, config.sim_time),
            "busyCashiers": sampled_series(metrics.busy_cashier_samples, config.sim_time),
        },
    }


def peak_rate_for(arrival_mean: float, surge_multiplier: float) -> float:
    return 1 / max(1, arrival_mean / max(1, surge_multiplier))


def sampled_series(samples: list[tuple[float, int]], sim_time: float, limit: int = 260) -> list[dict[str, float]]:
    if not samples:
        return []

    if len(samples) <= limit:
        selected = samples
    else:
        step = len(samples) / limit
        selected = [samples[int(index * step)] for index in range(limit)]

    return [
        {"time": round(now / 60, 2), "value": value}
        for now, value in selected
        if now <= sim_time
    ]


def number_param(params: dict[str, list[str]], name: str, default: float) -> float:
    try:
        return float(params.get(name, [default])[0])
    except (TypeError, ValueError):
        return float(default)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("0.0.0.0", port), SimulationHandler)
    print(f"Serving dashboard at http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
