# 7/11 Convenience Store

# Discrete Event Simulation (DES)

## Project Overview

This project is a **Discrete Event Simulation (DES)** of a **7/11 convenience store** using **2D pixel-art sprite assets and animations**.

The simulation models real-world store operations where:

* Customers arrive at random times
* Customers select items
* Customers queue at cashier stations
* Queue congestion occurs
* A second POS cashier station opens dynamically

The simulation focuses on:

> **Queue management and cashier utilization using discrete-event modeling principles.**

---

# What is Discrete Event Simulation?

A **Discrete Event Simulation (DES)** models a system where changes happen only at specific events in time.

In this project:

* The system state changes whenever an event occurs.
* Time moves from one event to another.

Example events:

* Customer arrival
* Customer enters store
* Customer picks item
* Customer joins queue
* Cashier starts service
* Cashier finishes transaction
* POS 2 opens
* Customer exits store

---

# Simulation Objective

The main objective is to determine:

> **At what queue length or waiting time should the 2nd cashiering system open to minimize long queues and customer dissatisfaction?**

---

# System Components

## Entities

Entities are objects that move through the system.

### Customers

Customers:

* Enter store
* Pick items
* Queue at cashier
* Pay
* Exit store

### Cashiers

Cashiers:

* Process transactions
* Serve queues
* Open/close POS systems

### Staff

Staff:

* Clean store
* Refill shelves
* Maintain store operations

---

# Resources

Resources are limited service points.

## POS Systems

* POS 1 (Initially Open)
* POS 2 (Initially Closed)

Only one customer can be served per POS at a time.

---

# Queues

## Queue 1

Used when:

```text id="jlwm4r"
POS 1 is the only active cashier.
```

## Queue 2

Activated when:

```text id="ewu6cl"
POS 2 opens.
```

---

# State Variables

The simulation tracks:

| Variable      | Description                    |
| ------------- | ------------------------------ |
| Queue Length  | Number of waiting customers    |
| Waiting Time  | Customer waiting duration      |
| POS Status    | Open or Closed                 |
| Customer Mood | Happy, Neutral, Upset          |
| Service Time  | Time cashier serves customer   |
| Arrival Rate  | Frequency of customer arrivals |

---

# Discrete Events

## Event 1 — Customer Arrival

A customer arrives at the store entrance.

### State Change:

```text id="a3q7to"
Customers in Store +1
```

---

## Event 2 — Customer Opens Door

Customer performs entrance animation.

### Animation:

* Walk to door
* Door opens
* Customer enters

---

## Event 3 — Item Selection

Customer chooses:

* Shelf item
* Fridge item

### Random Selection Time:

```text id="bq8ah8"
30–120 seconds
```

---

## Event 4 — Join Queue

Customer enters:

* Queue 1
  OR
* Shortest available queue

---

## Event 5 — Cashier Starts Service

Cashier begins:

* Scanning items
* Receiving payment
* Giving change

### Service Time:

```text id="1x9q4p"
1–3 minutes
```

---

## Event 6 — Queue Congestion

Queue 1 at POS 1 becomes long.

### Condition:

```text id="jlwm4r"
Queue 1 Length >= 5
```

OR

```text id="n0zfj5"
Queue 1 Average Waiting Time >= 3 minutes
```

---

## Event 7 — POS 2 Opens

Second cashier station activates.

### State Change:

```text id="l4mk6s"
POS 2 = OPEN
```

Customers redistribute between queues.

---

## Event 8 — Customer Exits

Customer leaves store.

### Animation:

* Walk to door
* Door opens
* Customer exits

---

# Queue Logic

## Initial State

```text id="sy7bzb"
POS 1 = OPEN
POS 2 = CLOSED
```

All customers use Queue 1.

---

# Dynamic Queue Management

## Opening Rule

```text id="bnd27h"
IF Queue 1 Length >= 5
OR Queue 1 Average Waiting Time >= 3 mins
THEN Open POS 2
```

---

## Closing Rule

```text id="n4mb9m"
IF Queue Length <= 2
AND Average Waiting Time < 1 min
THEN Close POS 2
```

---

# Customer Mood System

| Waiting Time | Mood    |
| ------------ | ------- |
| 0–2 mins     | Happy   |
| 3–5 mins     | Neutral |
| 6+ mins      | Upset   |

---

# Performance Metrics

The simulation records:

| Metric                 | Purpose               |
| ---------------------- | --------------------- |
| Average Waiting Time   | Queue efficiency      |
| Queue Length           | Congestion level      |
| Total Customers Served | Store throughput      |
| Upset Customers        | Satisfaction analysis |
| POS Utilization        | Cashier workload      |
| Time POS 2 Opened      | Staffing optimization |

---

# Sprite Animations Included

## Customer Animations

* Walking
* Entering store
* Opening door
* Picking shelf items
* Picking fridge items
* Queue waiting
* Exiting store

---

## Cashier Animations

* Idle
* Scanning
* Accepting payment
* Giving change

---

## Staff Animations

* Sweeping floor
* Cleaning store
* Restocking shelves
* Carrying stock boxes
* Stopping restock work to open POS 2 when Queue 1 becomes long
* Cashier scanning animation while serving customers

---

# Recommended Simulation Flow

```text id="ytv60l"
START

Customer Arrives
    ↓
Customer Enters Store
    ↓
Customer Picks Items
    ↓
Customer Joins Queue
    ↓
Cashier Processes Transaction
    ↓
IF Queue Too Long:
    Open POS 2
    Redistribute Customers
    ↓
Customer Exits Store

END
```

---

# Recommended Simulation Engines

## Best for DES

* SimPy (Python)
* AnyLogic
* Arena Simulation
* Simul8

## Best for Game-Based Visual Simulation

* Unity 2D
* Godot
* Construct 3

---

# Conclusion

This project is a **Discrete Event Simulation** because:

* System changes occur only during events
* Customers interact through queues and service points
* Time advances from event to event
* Resources and queues are dynamically managed

The simulation demonstrates how opening a second cashiering system at the correct time can significantly reduce queue congestion and improve customer satisfaction in a convenience store environment.

---

# Layered System Architecture

```text
11_simulation/
├── README.md
├── requirements.txt
├── simulation/
│   ├── config.py       # simulation parameters and POS rules
│   ├── metrics.py      # performance measurements
│   ├── resources.py    # cashier resources and queue logic
│   ├── processes.py    # customer and arrival processes
│   └── run.py          # setup, run, and results
└── web/
    ├── assets/         # local image assets for sprites and store fixtures
    ├── index.html      # presentation structure
    ├── styles.css      # visual layout and animations
    └── app.js          # browser animation simulation
```

The project has two runnable layers:

* **Simulation Core** - the SimPy DES model in `simulation/`
* **Presentation Layer** - the animated browser prototype in `web/`

---

# Running the Discrete Simulation

Run the SimPy version from the terminal:

```bash
pip install -r requirements.txt
python -m simulation.run
```

The Python model is organized as layers:

* `simulation/config.py` - parameters and POS rules
* `simulation/metrics.py` - waiting time, cycle time, queue, and POS metrics
* `simulation/resources.py` - cashier resources and queue-management rules
* `simulation/processes.py` - customer and arrival-generator processes
* `simulation/run.py` - setup, run, and results entry point

---

# Running the Web Simulation

Open `web/index.html` in a browser to run the animated DES prototype.

The app includes:

* Local image assets for customers, staff, cashier, shelves, and fridge
* Random customer arrivals
* Shopping, queueing, service, and exit events
* Dynamic POS 2 opening and closing rules
* Customer mood changes based on waiting time
* Live queue, wait time, throughput, and upset-customer metrics
* Controls for arrival pace, POS 2 thresholds, simulation speed, reset, and rush waves
