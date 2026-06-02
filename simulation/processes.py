"""Customer and arrival-generator process layer."""

import random

from simulation import config
from simulation.resources import choose_cashier, maybe_close_pos2, maybe_open_pos2, pos1_queue_length, queue_length


def customer(env, name, store, metrics):
    arrival_time = env.now
    customer_id = name
    store["waiting_since"][customer_id] = None

    print(f"{name}: Arrives at time {arrival_time:.2f}")

    shopping_time = random.uniform(config.SHOPPING_MIN, config.SHOPPING_MAX)
    yield env.timeout(shopping_time)

    queue_join_time = env.now
    store["waiting_since"][customer_id] = queue_join_time
    print(f"{name}: Picks item at time {queue_join_time:.2f}")

    cashier = choose_cashier(store)

    with cashier.request(customer_id=customer_id) as request:
        metrics.record_queue_length(queue_length(store))
        maybe_open_pos2(env, store, metrics, "POS 1 queue length >= 5 or POS 1 average wait >= 3 minutes")
        yield request
        yield from serve_customer(env, name, metrics, arrival_time, queue_join_time)

    store["waiting_since"].pop(customer_id, None)
    maybe_close_pos2(env, store)


def serve_customer(env, name, metrics, arrival_time, queue_join_time):
    start_time = env.now
    waiting_time = start_time - queue_join_time
    metrics.waiting_times.append(waiting_time)

    if waiting_time >= config.UPSET_WAIT_TIME:
        metrics.upset_customers += 1

    print(f"{name}: Starts service at time {start_time:.2f}")
    print(f"{name}: Waiting time {waiting_time:.2f} seconds")

    service_time = random.expovariate(config.SERVICE_RATE)
    yield env.timeout(service_time)

    end_time = env.now
    cycle_time = end_time - arrival_time
    metrics.cycle_times.append(cycle_time)
    metrics.completed_customers += 1

    print(f"{name}: Leaves at time {end_time:.2f}")
    print(f"{name}: Cycle time {cycle_time:.2f} seconds\n")


def generator(env, store, metrics):
    i = 1

    while True:
        interarrival = random.expovariate(config.ARRIVAL_RATE)
        yield env.timeout(interarrival)

        metrics.record_queue_length(queue_length(store))
        metrics.record_queue_length(pos1_queue_length(store))
        maybe_open_pos2(env, store, metrics, "POS 1 queue length >= 5 or POS 1 average wait >= 3 minutes")
        env.process(customer(env, f"Customer {i}", store, metrics))
        i += 1
