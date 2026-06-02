"""Simulation parameters."""

# PARAMETERS (seconds)
ARRIVAL_RATE = 1 / 120        # mean interarrival = 2 min
SERVICE_RATE = 1 / 90         # mean service = 1.5 min
SHOPPING_MIN = 30             # shortest item selection time
SHOPPING_MAX = 120            # longest item selection time
SIM_TIME = 3600               # 1 hour
RANDOM_SEED = 11

# POS 2 control rules
POS2_QUEUE_TRIGGER = 5        # open POS 2 when POS 1 queue reaches this size
POS2_WAIT_TRIGGER = 180       # open POS 2 when POS 1 average queue wait reaches 3 min
POS2_CLOSE_QUEUE = 2          # close POS 2 when total queue recovers
POS2_CLOSE_WAIT = 60          # close POS 2 when average queue wait is under 1 min
POS2_CHECK_INTERVAL = 10      # DES monitor event interval for POS rules
UPSET_WAIT_TIME = 360         # customers are upset after 6 min wait
