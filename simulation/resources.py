"""Resource and queue-management layer."""

import simpy

from simulation import config


class TrackedResource(simpy.Resource):
    def request(self, *args, **kwargs):
        customer_id = kwargs.pop("customer_id", None)
        request = super().request(*args, **kwargs)
        request.customer_id = customer_id
        return request


def create_store(env):
    return {
        "pos1": TrackedResource(env, capacity=1),
        "pos2": TrackedResource(env, capacity=1),
        "pos2_open": False,
        "waiting_since": {},
    }


def choose_cashier(store):
    if not store["pos2_open"]:
        return store["pos1"]

    if len(store["pos1"].queue) <= len(store["pos2"].queue):
        return store["pos1"]

    return store["pos2"]


def queue_length(store):
    if not store["pos2_open"]:
        return len(store["pos1"].queue)

    return len(store["pos1"].queue) + len(store["pos2"].queue)


def pos1_queue_length(store):
    return len(store["pos1"].queue)


def queued_customer_ids(store):
    active_ids = [request.customer_id for request in store["pos1"].queue]

    if store["pos2_open"]:
        active_ids += [request.customer_id for request in store["pos2"].queue]

    return active_ids


def average_queue_wait(env, store, pos="all"):
    waiting_since = store["waiting_since"]
    if pos == "pos1":
        active_ids = [request.customer_id for request in store["pos1"].queue]
    else:
        active_ids = queued_customer_ids(store)

    waits = [
        env.now - waiting_since[customer_id]
        for customer_id in active_ids
        if waiting_since.get(customer_id) is not None
    ]

    return sum(waits) / len(waits) if waits else 0


def maybe_open_pos2(env, store, metrics, reason="queue rule"):
    queue1_length = pos1_queue_length(store)
    queue1_average_wait = average_queue_wait(env, store, "pos1")

    if store["pos2_open"]:
        return

    if queue1_length >= config.POS2_QUEUE_TRIGGER or queue1_average_wait >= config.POS2_WAIT_TRIGGER:
        store["pos2_open"] = True

        if metrics.pos2_opened_at is None:
            metrics.pos2_opened_at = env.now

        print(f"POS 2: Opens at time {env.now:.2f} ({reason})")


def maybe_close_pos2(env, store):
    if not store["pos2_open"]:
        return

    if len(store["pos2"].queue) > 0 or store["pos2"].count > 0:
        return

    if queue_length(store) <= config.POS2_CLOSE_QUEUE and average_queue_wait(env, store) < config.POS2_CLOSE_WAIT:
        store["pos2_open"] = False
        print(f"POS 2: Closes at time {env.now:.2f}")


def pos2_monitor(env, store, metrics):
    while True:
        yield env.timeout(config.POS2_CHECK_INTERVAL)
        maybe_open_pos2(env, store, metrics, "POS 1 queue length >= 5 or POS 1 average wait >= 3 minutes")
        maybe_close_pos2(env, store)
