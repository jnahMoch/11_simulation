"""Application entry point for the SimPy discrete event simulation."""

from __future__ import annotations

import contextlib
import io
import random
from dataclasses import replace
from statistics import mean, pstdev

import simpy

from simulation.config import DEFAULT_CONFIG, STAFF_COUNTS, SimulationConfig
from simulation.metrics import Metrics
from simulation.processes import generator, staffing_processes
from simulation.resources import create_store, pos2_monitor


def run_simulation(sim_config: SimulationConfig = DEFAULT_CONFIG) -> Metrics:
    """Run the README-aligned 24/7 7-Eleven DES model."""
    random.seed(sim_config.random_seed)
    env = simpy.Environment()
    metrics = Metrics()
    store = create_store(env, sim_config)

    env.process(generator(env, store, metrics))
    env.process(pos2_monitor(env, store, metrics))
    staffing_processes(env, store, metrics)
    env.run(until=sim_config.sim_time)
    return metrics


def print_results(metrics: Metrics, sim_config: SimulationConfig = DEFAULT_CONFIG) -> None:
    metrics.print_results(sim_config.sim_time, sim_config.pos_lanes)


def run_fixed_staff_simulation(staff_count: int, sim_config: SimulationConfig = DEFAULT_CONFIG) -> Metrics:
    """Run a scenario with a fixed number of always-open cashier lanes.

    This supports the README's expected analysis: whether one cashier is enough
    and when extra cashier capacity changes cycle time and throughput.
    """
    scenario_config = replace(
        sim_config,
        pos_lanes=staff_count,
        initial_active_cashiers=staff_count,
        peak_enabled=False,
        random_seed=sim_config.random_seed + staff_count,
    )
    return run_simulation(scenario_config)


def summarize_staffing_metrics(metrics: Metrics, sim_config: SimulationConfig) -> tuple[float, float, float]:
    average_cycle_minutes = metrics.average_cycle_time / 60
    average_wait_minutes = metrics.average_waiting_time / 60
    throughput_per_minute = metrics.completed_customers / (sim_config.sim_time / 60)
    return average_cycle_minutes, average_wait_minutes, throughput_per_minute


def print_staffing_summary(ct_values, waiting_values, throughput_values) -> None:
    if ct_values:
        print(
            "Mean Cycle time: "
            f"{mean(ct_values):.2f} minutes +/- {pstdev(ct_values):.2f} minutes"
        )
    else:
        print("No cycle time data collected (check simulation logic).")

    if waiting_values:
        print(
            "Mean Waiting time: "
            f"{mean(waiting_values):.2f} minutes +/- {pstdev(waiting_values):.2f} minutes"
        )
    else:
        print("No waiting time data collected (check simulation logic).")

    if throughput_values:
        print(
            "Mean Throughput: "
            f"{mean(throughput_values):.2f} customers/minute +/- "
            f"{pstdev(throughput_values):.2f} customers/minute"
        )
    else:
        print("No throughput data collected.")


def plot_staffing_analysis(staff_counts, ct_values, throughput_values) -> None:
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("Install matplotlib to show staffing analysis plots.")
        return

    plt.figure()
    plt.plot(staff_counts, ct_values, marker="o")
    plt.title("Average CT VS Number of Staffs")
    plt.xlabel("Number of Staffs")
    plt.ylabel("Average CT (minutes)")

    plt.figure()
    plt.plot(staff_counts, throughput_values, marker="o")
    plt.title("Throughput VS Number of Staffs")
    plt.xlabel("Number of Staffs")
    plt.ylabel("Throughput (customers/minute)")

    plt.show()


def run_staffing_analysis(sim_config: SimulationConfig = DEFAULT_CONFIG) -> None:
    staff_counts = list(STAFF_COUNTS)
    ct_values = []
    waiting_values = []
    throughput_values = []

    print("\n===== STAFFING ANALYSIS =====")

    for staff_count in staff_counts:
        event_log = io.StringIO()
        with contextlib.redirect_stdout(event_log):
            metrics = run_fixed_staff_simulation(staff_count, sim_config)
        average_cycle, average_wait, throughput = summarize_staffing_metrics(metrics, sim_config)
        ct_values.append(average_cycle)
        waiting_values.append(average_wait)
        throughput_values.append(throughput)
        print(
            f"{staff_count} staff: "
            f"CT={average_cycle:.2f} min, "
            f"Wait={average_wait:.2f} min, "
            f"Throughput={throughput:.2f} customers/min"
        )

    print_staffing_summary(ct_values, waiting_values, throughput_values)
    plot_staffing_analysis(staff_counts, ct_values, throughput_values)


def main() -> None:
    metrics = run_simulation(DEFAULT_CONFIG)
    print_results(metrics, DEFAULT_CONFIG)
    run_staffing_analysis(DEFAULT_CONFIG)


if __name__ == "__main__":
    main()
