"""Metrics collected by the 7-Eleven DES model."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Metrics:
    waiting_times: list[float] = field(default_factory=list)
    peak_waiting_times: list[float] = field(default_factory=list)
    off_peak_waiting_times: list[float] = field(default_factory=list)
    service_times: list[float] = field(default_factory=list)
    cycle_times: list[float] = field(default_factory=list)

    arrived_customers: int = 0
    completed_customers: int = 0
    upset_customers: int = 0

    queue_samples: list[tuple[float, int]] = field(default_factory=list)
    busy_cashier_samples: list[tuple[float, int]] = field(default_factory=list)
    active_cashier_samples: list[tuple[float, int]] = field(default_factory=list)
    max_queue_length: int = 0
    max_busy_cashiers: int = 0

    pos2_opened_at: float | None = None
    pos2_activation_count: int = 0
    total_utility_workload: float = 0
    utility_workload: dict[str, float] = field(default_factory=dict)
    event_log: list[str] = field(default_factory=list)

    def log_event(self, now: float, message: str) -> None:
        entry = f"{format_clock(now)} | {message}"
        self.event_log.append(entry)
        if len(self.event_log) > 500:
            self.event_log = self.event_log[-500:]
        print(entry)

    def record_queue_length(self, now: float, queue_length: int) -> None:
        self.max_queue_length = max(self.max_queue_length, queue_length)
        self.queue_samples.append((now, queue_length))

    def record_cashiers(self, now: float, busy_cashiers: int, active_cashiers: int) -> None:
        self.max_busy_cashiers = max(self.max_busy_cashiers, busy_cashiers)
        self.busy_cashier_samples.append((now, busy_cashiers))
        self.active_cashier_samples.append((now, active_cashiers))

    def record_wait(self, waiting_time: float, peak_period: bool) -> None:
        self.waiting_times.append(waiting_time)
        if peak_period:
            self.peak_waiting_times.append(waiting_time)
        else:
            self.off_peak_waiting_times.append(waiting_time)

    def record_utility_work(self, staff_name: str, duration: float) -> None:
        self.total_utility_workload += duration
        self.utility_workload[staff_name] = self.utility_workload.get(staff_name, 0) + duration

    @property
    def average_waiting_time(self) -> float:
        return average(self.waiting_times)

    @property
    def peak_average_waiting_time(self) -> float:
        return average(self.peak_waiting_times)

    @property
    def off_peak_average_waiting_time(self) -> float:
        return average(self.off_peak_waiting_times)

    @property
    def average_service_time(self) -> float:
        return average(self.service_times)

    @property
    def average_cycle_time(self) -> float:
        return average(self.cycle_times)

    @property
    def average_queue_length(self) -> float:
        return average([value for _, value in self.queue_samples])

    @property
    def average_active_cashiers(self) -> float:
        return average([value for _, value in self.active_cashier_samples])

    def cashier_utilization(self, sim_time: float, pos_lanes: int) -> float:
        if sim_time <= 0 or pos_lanes <= 0:
            return 0
        return sum(self.service_times) / (sim_time * pos_lanes)

    def print_results(self, sim_time: float | None = None, pos_lanes: int = 2) -> None:
        sim_time = sim_time or 1
        print("\n===== 7-ELEVEN CUSTOMER QUEUE MANAGEMENT SIMULATOR =====")
        print(f"Customers arrived: {self.arrived_customers}")
        print(f"Customers served: {self.completed_customers}")
        print(f"Throughput: {self.completed_customers / max(1, sim_time / 60):.2f} customers/minute")
        print(f"Average waiting time: {self.average_waiting_time:.2f} seconds")
        print(f"Peak average waiting time: {self.peak_average_waiting_time:.2f} seconds")
        print(f"Off-peak average waiting time: {self.off_peak_average_waiting_time:.2f} seconds")
        print(f"Average service time: {self.average_service_time:.2f} seconds")
        print(f"Average cycle time: {self.average_cycle_time:.2f} seconds")
        print(f"Average queue length: {self.average_queue_length:.2f}")
        print(f"Maximum queue length: {self.max_queue_length}")
        print(f"Maximum busy cashiers: {self.max_busy_cashiers}")
        print(f"Cashier utilization: {self.cashier_utilization(sim_time, pos_lanes) * 100:.1f}%")
        print(f"POS 2 activation count: {self.pos2_activation_count}")
        print(f"Utility workload: {self.total_utility_workload / 60:.2f} staff-minutes")
        print(f"Upset customers: {self.upset_customers}")

        if self.pos2_opened_at is None:
            print("POS 2 first opened at: never")
        else:
            print(f"POS 2 first opened at: {format_clock(self.pos2_opened_at)}")


def average(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0


def format_clock(now: float) -> str:
    now = now % (24 * 60 * 60)
    hours = int(now // 3600)
    minutes = int((now % 3600) // 60)
    seconds = int(now % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
