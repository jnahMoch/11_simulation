"""Simulation parameters aligned with the README operating model."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SimulationConfig:
    total_staff: int = 3
    pos_lanes: int = 2
    initial_active_cashiers: int = 1

    # Time is measured in seconds. The store operates continuously for 24 hours.
    sim_time: float = 24 * 60 * 60
    random_seed: int = 11

    # Customer flow.
    arrival_rate: float = 1 / 150
    peak_arrival_rate: float = 1 / 75
    service_rate: float = 1 / 90
    shopping_min: float = 30
    shopping_max: float = 120

    # Dynamic POS 2 rules.
    queue_open_threshold: int = 5
    queue_close_threshold: int = 2
    wait_open_threshold: float = 180
    wait_close_threshold: float = 60
    pos_monitor_interval: float = 10

    # Store schedule.
    peak_enabled: bool = True
    morning_peak: tuple[float, float] = (9 * 60 * 60, 12 * 60 * 60)
    evening_peak: tuple[float, float] = (17 * 60 * 60, 19 * 60 * 60)
    night_peak: tuple[float, float] = (21 * 60 * 60, 23 * 60 * 60)
    night_shift: tuple[float, float] = (18 * 60 * 60, 2 * 60 * 60)

    # Utility staff work.
    utility_tasks: tuple[str, ...] = (
        "prepare hotdogs",
        "prepare donuts",
        "prepare soft-serves",
        "prepare ice cream station",
        "organize inventory",
        "restock shelves",
        "refill refrigerators",
        "clean store",
    )
    utility_task_interval: float = 20 * 60
    utility_task_duration: float = 8 * 60

    upset_wait_time: float = 360


DEFAULT_CONFIG = SimulationConfig()

STAFF_COUNTS = range(1, 7)
