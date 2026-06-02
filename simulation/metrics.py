"""Metrics collected by the simulation."""

from dataclasses import dataclass, field


@dataclass
class Metrics:
    waiting_times: list[float] = field(default_factory=list)
    cycle_times: list[float] = field(default_factory=list)
    completed_customers: int = 0
    upset_customers: int = 0
    max_queue_length: int = 0
    pos2_opened_at: float | None = None

    def record_queue_length(self, queue_length: int) -> None:
        self.max_queue_length = max(self.max_queue_length, queue_length)

    @property
    def average_wait(self) -> float:
        return sum(self.waiting_times) / len(self.waiting_times) if self.waiting_times else 0

    @property
    def average_cycle(self) -> float:
        return sum(self.cycle_times) / len(self.cycle_times) if self.cycle_times else 0

    def print_results(self) -> None:
        print("\n===== 7/11 DISCRETE EVENT SIMULATION =====")
        print(f"Customers served: {self.completed_customers}")
        print(f"Average waiting time: {self.average_wait:.2f} seconds")
        print(f"Average cycle time: {self.average_cycle:.2f} seconds")
        print(f"Maximum queue length: {self.max_queue_length}")
        print(f"Upset customers: {self.upset_customers}")

        if self.pos2_opened_at is None:
            print("POS 2 first opened at: never")
        else:
            print(f"POS 2 first opened at: {self.pos2_opened_at:.2f} seconds")

