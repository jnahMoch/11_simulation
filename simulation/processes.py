"""Customer, cashier, staffing, and utility process layer."""

from __future__ import annotations

import random

from simulation.config import SimulationConfig
from simulation.resources import (
    choose_cashier,
    current_arrival_rate,
    is_night_shift,
    is_peak_time,
    maybe_close_pos2,
    maybe_open_pos2,
    queue_length,
)


def customer(env, name: str, store, metrics):
    sim_config: SimulationConfig = store["config"]
    arrival_time = env.now
    customer_id = name
    metrics.arrived_customers += 1
    store["waiting_since"][customer_id] = None
    metrics.log_event(env.now, f"{name}: arrives")

    shopping_time = random.uniform(sim_config.shopping_min, sim_config.shopping_max)
    yield env.timeout(shopping_time)

    queue_join_time = env.now
    store["waiting_since"][customer_id] = queue_join_time
    metrics.log_event(env.now, f"{name}: shopping completed; joins checkout queue")

    maybe_open_pos2(env, store, metrics, "POS 1 queue reached threshold")
    cashier = choose_cashier(store)

    with cashier.request(customer_id=customer_id) as request:
        metrics.record_queue_length(env.now, queue_length(store))
        yield request
        yield from serve_customer(env, name, store, metrics, arrival_time, queue_join_time)

    store["waiting_since"].pop(customer_id, None)
    maybe_close_pos2(env, store, metrics)


def serve_customer(env, name: str, store, metrics, arrival_time: float, queue_join_time: float):
    sim_config: SimulationConfig = store["config"]
    start_time = env.now
    waiting_time = start_time - queue_join_time
    metrics.record_wait(waiting_time, is_peak_time(start_time, sim_config))

    if waiting_time >= sim_config.upset_wait_time:
        metrics.upset_customers += 1

    metrics.log_event(env.now, f"{name}: cashier starts service; waited {waiting_time:.2f} seconds")

    service_time = random.expovariate(sim_config.service_rate)
    metrics.service_times.append(service_time)
    yield env.timeout(service_time)

    end_time = env.now
    cycle_time = end_time - arrival_time
    metrics.cycle_times.append(cycle_time)
    metrics.completed_customers += 1
    metrics.log_event(env.now, f"{name}: transaction completed; cycle time {cycle_time:.2f} seconds")


def generator(env, store, metrics):
    customer_number = 1
    sim_config: SimulationConfig = store["config"]

    while True:
        arrival_rate = current_arrival_rate(env.now, sim_config)
        interarrival = random.expovariate(arrival_rate)
        yield env.timeout(interarrival)

        maybe_open_pos2(env, store, metrics, "POS 1 queue reached threshold")
        env.process(customer(env, f"Customer {customer_number}", store, metrics))
        customer_number += 1


def utility_staff_process(env, store, metrics, staff_name: str, night_only: bool = False):
    sim_config: SimulationConfig = store["config"]
    task_index = 0

    while True:
        yield env.timeout(sim_config.utility_task_interval)

        if night_only and not is_night_shift(env.now, sim_config):
            continue

        paused_for_pos2 = False
        while staff_name == "Staff 2" and len(store["open_lanes"]) > 1 and store["open_lanes"][1]:
            if not paused_for_pos2:
                metrics.log_event(env.now, "Staff 2 pauses utility work while operating POS 2")
                paused_for_pos2 = True
            yield env.timeout(sim_config.pos_monitor_interval)

        if night_only and not is_night_shift(env.now, sim_config):
            continue

        if paused_for_pos2:
            metrics.log_event(env.now, "Staff 2 resumes utility work after POS 2 closes")

        task_name = sim_config.utility_tasks[task_index % len(sim_config.utility_tasks)]
        task_index += 1
        metrics.log_event(env.now, f"{staff_name}: starts {task_name}")
        yield env.timeout(sim_config.utility_task_duration)
        metrics.record_utility_work(staff_name, sim_config.utility_task_duration)
        metrics.log_event(env.now, f"{staff_name}: completes {task_name}")


def staffing_processes(env, store, metrics):
    """Start README-defined staff roles.

    Staff 1 is represented by POS Lane 1. Staff 2 alternates between utility
    work and POS 2. Staff 3 works utility tasks during the night shift.
    """
    sim_config: SimulationConfig = store["config"]
    if sim_config.total_staff >= 2:
        env.process(utility_staff_process(env, store, metrics, "Staff 2"))
    if sim_config.total_staff >= 3:
        env.process(utility_staff_process(env, store, metrics, "Staff 3", night_only=True))
    for staff_number in range(4, sim_config.total_staff + 1):
        env.process(utility_staff_process(env, store, metrics, f"Staff {staff_number}"))
