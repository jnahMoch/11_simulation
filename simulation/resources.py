"""Resource and queue-management layer."""

from __future__ import annotations

import simpy

from simulation.config import DEFAULT_CONFIG, SimulationConfig


class TrackedResource(simpy.Resource):
    def request(self, *args, **kwargs):
        customer_id = kwargs.pop("customer_id", None)
        request = super().request(*args, **kwargs)
        request.customer_id = customer_id
        return request


def create_store(env, sim_config: SimulationConfig = DEFAULT_CONFIG):
    pos_lanes = [
        TrackedResource(env, capacity=1)
        for _ in range(sim_config.pos_lanes)
    ]
    open_lanes = [
        lane_index < sim_config.initial_active_cashiers
        for lane_index in range(sim_config.pos_lanes)
    ]
    return {
        "config": sim_config,
        "pos_lanes": pos_lanes,
        "open_lanes": open_lanes,
        "waiting_since": {},
    }


def active_lane_indexes(store) -> list[int]:
    return [
        index
        for index, open_lane in enumerate(store["open_lanes"])
        if open_lane
    ]


def choose_cashier(store):
    active_indexes = active_lane_indexes(store)
    if not active_indexes:
        store["open_lanes"][0] = True
        active_indexes = [0]

    best_index = min(
        active_indexes,
        key=lambda index: len(store["pos_lanes"][index].queue) + store["pos_lanes"][index].count,
    )
    return store["pos_lanes"][best_index]


def queue_length(store) -> int:
    return sum(
        len(store["pos_lanes"][index].queue)
        for index in active_lane_indexes(store)
    )


def pos1_queue_length(store) -> int:
    pos1 = store["pos_lanes"][0]
    return len(pos1.queue)


def busy_cashiers(store) -> int:
    return sum(lane.count for lane in store["pos_lanes"])


def active_cashiers(store) -> int:
    return len(active_lane_indexes(store))


def queued_customer_ids(store, lane_index: int | None = None) -> list[str]:
    if lane_index is not None:
        return [request.customer_id for request in store["pos_lanes"][lane_index].queue]

    customer_ids = []
    for index in active_lane_indexes(store):
        customer_ids.extend(request.customer_id for request in store["pos_lanes"][index].queue)
    return customer_ids


def average_queue_wait(env, store, lane_index: int | None = None) -> float:
    waiting_since = store["waiting_since"]
    waits = [
        env.now - waiting_since[customer_id]
        for customer_id in queued_customer_ids(store, lane_index)
        if waiting_since.get(customer_id) is not None
    ]
    return sum(waits) / len(waits) if waits else 0


def is_peak_time(now: float, sim_config: SimulationConfig = DEFAULT_CONFIG) -> bool:
    if not sim_config.peak_enabled:
        return False

    now = now % (24 * 60 * 60)
    return any(
        window_contains(now, window)
        for window in (
            sim_config.morning_peak,
            sim_config.evening_peak,
            sim_config.night_peak,
        )
    )


def is_night_shift(now: float, sim_config: SimulationConfig = DEFAULT_CONFIG) -> bool:
    return window_contains(now % (24 * 60 * 60), sim_config.night_shift)


def window_contains(now: float, window: tuple[float, float]) -> bool:
    start, end = window
    if start <= end:
        return start <= now < end
    return now >= start or now < end


def current_arrival_rate(now: float, sim_config: SimulationConfig = DEFAULT_CONFIG) -> float:
    return sim_config.peak_arrival_rate if is_peak_time(now, sim_config) else sim_config.arrival_rate


def maybe_open_pos2(env, store, metrics, reason: str = "queue rule") -> None:
    sim_config = store["config"]
    if sim_config.pos_lanes < 2 or store["open_lanes"][1]:
        return

    queue_pressure = pos1_queue_length(store) >= sim_config.queue_open_threshold
    wait_pressure = average_queue_wait(env, store, 0) >= sim_config.wait_open_threshold

    if queue_pressure or wait_pressure:
        store["open_lanes"][1] = True
        metrics.pos2_activation_count += 1
        if metrics.pos2_opened_at is None:
            metrics.pos2_opened_at = env.now
        metrics.log_event(env.now, f"POS 2 opens ({reason})")


def maybe_close_pos2(env, store, metrics) -> None:
    sim_config = store["config"]
    if sim_config.pos_lanes < 2 or not store["open_lanes"][1]:
        return

    pos2 = store["pos_lanes"][1]
    if pos2.queue or pos2.count:
        return

    demand_recovered = (
        queue_length(store) <= sim_config.queue_close_threshold
        and average_queue_wait(env, store, 0) < sim_config.wait_close_threshold
    )
    if demand_recovered:
        store["open_lanes"][1] = False
        metrics.log_event(env.now, "POS 2 closes; Staff 2 returns to utility work")


def pos2_monitor(env, store, metrics):
    sim_config = store["config"]
    while True:
        yield env.timeout(sim_config.pos_monitor_interval)
        metrics.record_queue_length(env.now, queue_length(store))
        metrics.record_cashiers(env.now, busy_cashiers(store), active_cashiers(store))
        maybe_open_pos2(env, store, metrics, "POS 1 queue reached threshold")
        maybe_close_pos2(env, store, metrics)
