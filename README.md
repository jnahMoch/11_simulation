# 7/11 Simulation — Discrete-Event Store Simulator

A dual-mode **discrete-event simulation** of a 7-Eleven convenience store, available as both a **Python/SimPy backend** and a **live web dashboard** with an animated store floor.

## Quick Start

### Backend (Python)

```bash
pip install -r requirements.txt
python -m simulation.run
```

Outputs 24-hour metrics and a staffing analysis (1–6 cashiers) with cycle-time and throughput charts.

### Web Dashboard

```bash
cd web
python -m http.server 8000
# then open http://127.0.0.1:8000/
```

A live animated simulation with interactive sliders, real-time metrics, and a store-floor canvas.

## Architecture

```
11_simulation/
├── simulation/              # Python backend (SimPy)
│   ├── __init__.py
│   ├── config.py            # Default parameters (rates, thresholds, schedule)
│   ├── metrics.py           # Metric collection and reporting
│   ├── resources.py         # Store resource model (queues, POS lanes, staff)
│   ├── processes.py         # SimPy processes (arrivals, service, utility tasks)
│   └── run.py               # Entry point + staffing analysis runner
├── web/                     # Frontend live simulation
│   ├── index.html           # Dashboard layout
│   ├── styles.css           # Store floor, counters, theming
│   └── app.js               # Canvas simulation engine (1459 lines)
├── requirements.txt         # simpy, matplotlib
└── README.md
```

## Store Model

| Aspect | Detail |
|---|---|
| Hours | 24/7 continuous |
| Staff | 3 (1 primary cashier + 1 utility + 1 night utility) |
| POS lanes | 2 (lane 2 opens dynamically) |
| Peak hours | 09:00–12:00, 17:00–19:00, 21:00–23:00 |
| Night shift | 18:00–02:00 (staff 3 active) |
| Queue threshold | Lane 2 opens when ≥5 customers waiting |

### Staff Roles

- **Staff 1** — Primary cashier (POS 1), always active.
- **Staff 2** — Utility tasks (restock, clean, food prep). Becomes secondary cashier (POS 2) during peak hours or when queue exceeds threshold.
- **Staff 3** — Night-shift utility only (18:00–02:00).

### Service Time Distribution

Both backend and frontend use an **exponential distribution** (matching `expovariate` in SimPy):

- **Backend:** `random.expovariate(1 / service_rate)` with `service_rate = 1/90` seconds.
- **Frontend:** `exponentialDelay((serviceMin + serviceMax) / 2)` converted to milliseconds, seeded via a multiplicative congruential generator for reproducibility.

Shopping time is uniform random between configurable min/max bounds.

## Web Dashboard Features

- **Animated store floor** — Customers (18×22 px icons) move through entry → shelves → queue → POS → exit.
- **Interactive controls** — Operating hours, arrival rate, service min/max, shop min/max, peak surge multiplier, cashier count, random seed.
- **Real-time metrics** — Avg wait time, queue length, customers inside, utilization, served/arrived.
- **Live charts** — Queue length & busy cashiers over time (Canvas), staffing analysis charts.
- **Staff status panel** — POS lane state, staff tasks, shopping/queued/upset customer counts.
- **Event log** — Customer arrival, service, upset, and departure events.
- **Playback controls** — 1×, 2×, 5×, 10×, 20× speed, play/pause, surge alert badge.

## Backend Staffing Analysis

Running `python -m simulation.run` executes a 24-hour simulation with the default config, then runs a **fixed-staff analysis** across 1–6 cashiers (peak disabled) to compare:

- Average cycle time (minutes)
- Average waiting time (minutes)
- Throughput (customers/minute)

Results are printed to stdout and plotted via `matplotlib` if available.

## Configuration

Key parameters in `simulation/config.py` (`SimulationConfig`):

| Parameter | Default | Description |
|---|---|---|
| `arrival_rate` | 1/150 | Customer inter-arrival rate (1 per 150 s) |
| `peak_arrival_rate` | 1/75 | During peak hours |
| `service_rate` | 1/90 | Service time rate (mean 90 s) |
| `shopping_min/max` | 30–120 s | Uniform shopping duration |
| `queue_open_threshold` | 5 | Open POS 2 at ≥5 waiting |
| `upset_wait_time` | 360 s | Customer leaves after 6 min wait |

Frontend sliders override these values during live simulation.

## Development

All three web files (`index.html`, `styles.css`, `app.js`) pass linting and syntax checks. The backend compiles and runs without errors.

```bash
# Verify JS syntax
node --check web/app.js

# Run backend simulation
python -m simulation.run
```
