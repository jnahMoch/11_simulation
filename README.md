# 7-Eleven Customer Queue Management Simulator

## Project Overview

This project is a **Discrete Event Simulation (DES)** for a **7-Eleven convenience store checkout and store-operation process**.

The simulation models real-world convenience store behavior including:

* Customer arrivals
* Item selection and shopping behavior
* Queue management
* Dynamic cashier operations
* Store cleaning and maintenance
* Inventory preparation and restocking
* Peak-hour staffing adjustments

The simulation represents a **24/7 operating 7-Eleven branch** with limited staffing resources and adaptive cashier management.

The main focus is:

> **Queue management, cashier utilization, dynamic staffing behavior, and operational efficiency using discrete-event simulation principles.**

---

# Store Staffing Configuration

The store operates with:

```text
3 Total Staff Members
```

Staff assignments dynamically change depending on:

* Peak-hour demand
* Queue congestion
* Time of day
* Store operational needs

---

# Staff Roles

## Staff 1 — Primary Cashier

The first staff member is responsible for:

* Operating the main POS/cashiering system
* Processing customer transactions
* Managing the primary checkout lane

At the beginning of normal operations:

```text
ONLY 1 POS lane is active
```

---

## Staff 2 — Utility and Secondary Cashier

The second staff member initially handles store preparation tasks such as:

* Preparing hotdogs
* Preparing donuts
* Preparing soft-serves
* Preparing ice cream stations
* Organizing inventory
* Restocking shelves
* Cleaning the store
* Refilling refrigerators

This staff member only opens the second cashier lane when:

```text
IF peak hours are active
OR
IF queue length exceeds the configured threshold
```

THEN:

```text
Second POS lane becomes active
```

This creates a dynamic cashier-allocation system inside the simulation.

---

## Staff 3 — Night Shift Utility Staff

The third staff member only becomes active during the night shift:

```text
6:00 PM – 2:00 AM
```

This staff member assists with:

* Cleaning
* Shelf restocking
* Inventory management
* Refrigerator restocking
* General store maintenance

The third staff member does not operate a cashier lane unless future simulation configurations enable emergency cashier support.

---

# Store Operating Schedule

## Store Hours

The store operates continuously:

```text
24 Hours / 7 Days
```

The simulation clock continuously cycles through daily operations.

---

# Peak-Hour Configuration

The simulation includes multiple demand-surge windows.

## Morning Peak

```text
9:00 AM – 12:00 PM
```

## Evening Peak

```text
5:00 PM – 7:00 PM
```

## Night Peak

```text
9:00 PM – 11:00 PM
```

During peak periods:

* Customer arrivals increase
* Queue congestion becomes more likely
* Cashier utilization rises
* Waiting times increase
* The second cashier lane may automatically open

---

# Dynamic POS Activation Logic

## Initial State

At the start of regular operations:

```text
POS Lane 1 = OPEN
POS Lane 2 = CLOSED
```

The second cashier lane opens only when:

```text
Peak hours are active
```

OR

```text
Queue length exceeds threshold
```

Example:

```text
IF queue length >= 5 customers
THEN activate second cashier
```

When demand decreases:

```text
Second cashier lane closes
```

and the staff member returns to:

* Cleaning
* Restocking
* Inventory preparation
* Food preparation

---

# What Is Discrete Event Simulation?

A **Discrete Event Simulation (DES)** models a system where state changes happen only when specific events occur.

In this simulation, state changes happen during events such as:

* Customer arrival
* Shopping completed
* Customer joins queue
* Cashier opens
* Cashier closes
* Cashier begins service
* Cashier completes service
* Shelf restocking
* Cleaning operations
* Inventory preparation
* Peak-hour activation

Between events, the simulation clock advances efficiently without recalculating every second.

---

# Simulation Objective

The objective is to evaluate:

> **How customer arrival rates, queue congestion, staffing behavior, peak-hour demand, and dynamic cashier activation affect store efficiency and checkout performance.**

The simulation evaluates:

* Queue performance
* Waiting-time behavior
* Cashier utilization
* Throughput efficiency
* Peak-hour congestion
* Staffing efficiency
* Operational workload distribution

---

# System Components

## Customers

Customers move through the simulation by:

* Arriving at the store
* Shopping for items
* Joining checkout queues
* Receiving cashier service
* Leaving the store

---

## Cashier Resources

The simulation supports:

```text
2 POS Cashier Lanes
```

However:

* Only one cashier lane is initially active
* The second lane dynamically opens based on demand

---

## Utility Operations

Utility operations include:

* Hotdog preparation
* Donut preparation
* Soft-serve preparation
* Ice cream preparation
* Shelf restocking
* Refrigerator refilling
* Cleaning operations
* Inventory organization

These operations run as background DES events.

---

# State Variables

The simulation tracks:

| Variable             | Description                          |
| -------------------- | ------------------------------------ |
| Queue length         | Number of waiting customers          |
| Waiting time         | Customer queue waiting duration      |
| Service time         | Transaction processing duration      |
| Arrival rate         | Customer inter-arrival rate          |
| Cashier utilization  | Cashier workload percentage          |
| Throughput           | Customers served                     |
| Peak queue length    | Maximum queue length                 |
| Busy cashiers        | Number of active POS lanes           |
| Utility workload     | Cleaning/restocking activity         |
| POS activation count | Number of times second cashier opens |

---

# Discrete Events

## Customer Arrival

Customers enter the system according to configurable arrival distributions.

## Shopping Completed

Customers finish selecting items.

## Join Queue

Customers join checkout queues.

## Cashier Opens

The second POS lane activates during:

* Peak hours
* Long queue conditions

## Cashier Starts Service

Available cashiers begin processing customers.

## Cashier Finishes Service

Transactions are completed and metrics are updated.

## Shelf Restocking

Staff restock shelves and refrigerators.

## Food Preparation

Staff prepare:

* Hotdogs
* Donuts
* Soft-serves
* Ice cream stations

## Cleaning Operations

Store cleaning tasks occur periodically throughout the simulation.

---

# Queue Logic

Initial configuration:

```text
Queue Length = 0
POS Lane 1 = OPEN
POS Lane 2 = CLOSED
```

Cashier activation rule:

```text
IF peak hours are active
OR queue length exceeds threshold
THEN open POS Lane 2
```

Cashier deactivation rule:

```text
IF queue demand decreases
THEN close POS Lane 2
```

Service rule:

```text
IF cashier available
AND customer waiting
THEN assign customer to cashier
```

---

# Performance Metrics

The simulation records:

| Metric                        | Purpose                      |
| ----------------------------- | ---------------------------- |
| Average waiting time          | Measures checkout efficiency |
| Average queue length          | Measures congestion          |
| Peak queue length             | Worst queue condition        |
| Customers served              | Checkout throughput          |
| Customers arrived             | Demand generation            |
| Cashier utilization           | POS workload                 |
| Utility workload              | Staff operational workload   |
| POS lane activation frequency | Measures dynamic staffing    |
| Peak-hour performance         | Rush-hour efficiency         |

---

# Recommended Simulation Flow

```text
START

Store operates 24/7

Customer arrives
Customer shops
Customer joins queue

IF queue exceeds threshold
OR peak hours active
    Open POS Lane 2
ENDIF

Cashier serves customer
Transaction completed

Utility staff performs:
    Cleaning
    Shelf restocking
    Food preparation
    Inventory organization

Metrics updated

END
```

---

# Recommended Simulation Engines

Recommended DES frameworks:

* SimPy
* AnyLogic
* Arena Simulation
* Simul8

---

# Layered System Architecture

```text
11_simulation/
|-- README.md
|-- requirements.txt
|-- simulation/
|   |-- config.py
|   |-- metrics.py
|   |-- resources.py
|   |-- processes.py
|   `-- run.py
`-- web/
    |-- index.html
    |-- styles.css
    `-- app.js
```

---

# Running the Simulation

## Python Simulation

```bash
pip install -r requirements.txt
python -m simulation.run
```

---

## Web Dashboard

```bash
cd web
python -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/
```

---

# Dashboard Features

The dashboard includes:

* Queue visualization
* POS lane activity
* Dynamic cashier activation
* Peak-hour monitoring
* Cashier utilization charts
* Queue trend charts
* Utility staff activity monitoring
* Event logs
* Real-time metrics

---

# Git Workflow Rules

To maintain clean version control practices, developers must follow a branch-based workflow.

## Branching Rule

Before making changes:

```bash
git checkout -b feature/branch-name
```

All new features, fixes, and updates must be developed inside their own branch.

---

## Push Workflow

After completing changes:

```bash
git add .
git commit -m "Your commit message"
git push origin feature/branch-name
```

---

## Branch Cleanup Rule

Once the branch has been pushed and merged successfully:

```bash
git branch -d feature/branch-name
```

Optionally delete the remote branch:

```bash
git push origin --delete feature/branch-name
```

This ensures:

* Cleaner repository history
* Better collaboration
* Easier feature tracking
* Safer development workflow

---

# Expected Simulation Analysis

The simulation can analyze:

* Whether one cashier is sufficient during normal hours
* When the second cashier should activate
* Queue congestion severity
* Peak-hour behavior
* Utility staff workload
* Checkout bottlenecks
* Staffing optimization strategies
* Store operational efficiency
