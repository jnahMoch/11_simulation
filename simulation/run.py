"""Application entry point for the SimPy discrete event simulation."""

import random

import simpy

from simulation import config
from simulation.metrics import Metrics
from simulation.processes import generator
from simulation.resources import create_store, pos2_monitor


def main():
    random.seed(config.RANDOM_SEED)

    # SETUP
    env = simpy.Environment()
    metrics = Metrics()
    store = create_store(env)
    env.process(generator(env, store, metrics))
    env.process(pos2_monitor(env, store, metrics))

    # RUN
    env.run(until=config.SIM_TIME)

    # RESULTS
    metrics.print_results()


if __name__ == "__main__":
    main()
