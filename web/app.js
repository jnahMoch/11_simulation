const storeFloor = document.querySelector("#store-floor");
const customersLayer = document.querySelector("#customers-layer");
const simTimeEl = document.querySelector("#sim-time");
const toggleButton = document.querySelector("#toggle-run");
const resetButton = document.querySelector("#reset");
const arrivalRateInput = document.querySelector("#arrival-rate");
const arrivalValEl = document.querySelector("#arrival-val");
const hoursInput = document.querySelector("#hours-input");
const hoursValEl = document.querySelector("#hours-val");
const surgeInput = document.querySelector("#surge-input");
const peakToggle = document.querySelector("#peak-toggle");
const seedInput = document.querySelector("#seed-input");
const randomizeSeedBtn = document.querySelector("#randomize-seed");
const playBtn = document.querySelector("#btn-play");
const cashierCountEl = document.querySelector("#cashier-count");
const incCashiersBtn = document.querySelector("#inc-cashiers");
const decCashiersBtn = document.querySelector("#dec-cashiers");
const serviceMinInput = document.querySelector("#service-min-input");
const serviceMaxInput = document.querySelector("#service-max-input");
const shopMinInput = document.querySelector("#shop-min-input");
const shopMaxInput = document.querySelector("#shop-max-input");
const serviceMinValEl = document.querySelector("#service-min-val");
const serviceMaxValEl = document.querySelector("#service-max-val");
const shopMinValEl = document.querySelector("#shop-min-val");
const shopMaxValEl = document.querySelector("#shop-max-val");
const speedButtons = document.querySelectorAll(".speed-selector button");

const metrics = {
  wait: document.querySelector("#metric-wait"),
  maxWait: document.querySelector("#max-wait"),
  qLen: document.querySelector("#metric-qlen"),
  qStatus: document.querySelector("#q-status"),
  util: document.querySelector("#metric-util"),
  utilStatus: document.querySelector("#util-status"),
  served: document.querySelector("#metric-served"),
  arrived: document.querySelector("#metric-arrived"),
  surgeAlert: document.querySelector("#surge-alert"),
  surgeValBadge: document.querySelector("#surge-val-badge")
};

const chartCanvas = document.querySelector("#analysis-chart");
const chartCtx = chartCanvas?.getContext("2d");
const cycleCanvas = document.querySelector("#cycle-chart");
const cycleCtx = cycleCanvas?.getContext("2d");
const throughputCanvas = document.querySelector("#throughput-chart");
const throughputCtx = throughputCanvas?.getContext("2d");
const chartTooltip = document.querySelector("#chart-tooltip");
const tooltipQ = document.querySelector("#tooltip-q");
const tooltipB = document.querySelector("#tooltip-b");
const customerEventLog = document.querySelector("#customer-event-log");
const eventLogShown = document.querySelector("#event-log-shown");
const eventLogTotal = document.querySelector("#event-log-total");

const VIEWPORT_WIDTH = 800; 
const VIEWPORT_HEIGHT = 500;
const UPSET_WAIT_SECONDS = 360;

const points = {
  entrance: { x: 50, y: 250 },
  station1: { x: 600, y: 190 },
  station2: { x: 600, y: 310 },
  exit: { x: 50, y: 250 },
  shelfSnacks: { x: 112, y: 68 },
  shelfDrinks: { x: 228, y: 68 },
  shelfInstant: { x: 344, y: 68 },
  shelfCandy: { x: 460, y: 68 },
  shelfBakery: { x: 576, y: 68 },
  fridgeBeverage: { x: 118, y: 430 },
  fridgeDairy: { x: 264, y: 430 },
  fridgeFrozen: { x: 410, y: 430 },
  fridgeBeer: { x: 556, y: 430 },
  queue1: Array.from({length: 10}, (_, i) => ({ x: 550 - (i * 25), y: 190 })),
  queue2: Array.from({length: 10}, (_, i) => ({ x: 550 - (i * 25), y: 310 })),
};

const shoppingAreas = [
  { key: "shelfSnacks", type: "Shelf", label: "Snacks" },
  { key: "shelfDrinks", type: "Shelf", label: "Drinks" },
  { key: "shelfInstant", type: "Shelf", label: "Instant" },
  { key: "shelfCandy", type: "Shelf", label: "Candy" },
  { key: "shelfBakery", type: "Shelf", label: "Bakery" },
  { key: "fridgeBeverage", type: "Fridge", label: "Beverage" },
  { key: "fridgeDairy", type: "Fridge", label: "Dairy" },
  { key: "fridgeFrozen", type: "Fridge", label: "Frozen" },
  { key: "fridgeBeer", type: "Fridge", label: "Beer" },
];

const state = {
  running: false,
  started: false,
  time: 0,
  limit: 24 * 3600,
  lastFrame: performance.now(),
  nextCustomerId: 1,
  events: [],
  customers: new Map(),
  queues: [[], []],
  pos: [
    { id: 1, open: true, busy: false, busyUntil: 0, current: null, busyTotal: 0 },
    { id: 2, open: false, busy: false, busyUntil: 0, current: null, busyTotal: 0 },
  ],
  totalWait: 0,
  maxWait: 0,
  served: 0,
  arrived: 0,
  speed: 2,
  peakEnabled: true,
  history: [], 
  staffingThroughput: [],
  eventLog: [],
  chartUpdateInterval: 10,
  lastChartUpdate: 0
};

function init() {
  window.addEventListener('resize', resizeCanvas);
  syncTimingControls();
  setupEventListeners();
  // Ensure canvas size is set after layout paints
  setTimeout(resizeCanvas, 100);
  requestAnimationFrame(tick);
}

function resizeCanvas() {
  [chartCanvas, cycleCanvas, throughputCanvas].forEach((canvas) => {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  });

  renderChart();
  updateStaffingAnalysis();
}

function createSeededRandom(seed) {
  const seedText = String(seed);
  let value = 0;

  for (let index = 0; index < seedText.length; index++) {
    value = (value * 31 + seedText.charCodeAt(index)) % 2147483647;
  }

  value = Math.max(1, value);
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function randomBetweenWith(randomFn, min, max) {
  return Math.round(min + randomFn() * (max - min));
}

function exponentialDelay(meanSeconds, randomFn = Math.random) {
  return -Math.log(1 - randomFn()) * meanSeconds;
}

function minutesLabel(seconds) {
  return `${(seconds / 60).toFixed(1)}m`;
}

function timingConfig() {
  return {
    serviceMin: Number(serviceMinInput.value),
    serviceMax: Number(serviceMaxInput.value),
    shopMin: Number(shopMinInput.value),
    shopMax: Number(shopMaxInput.value)
  };
}

function syncTimingControlPair(minInput, maxInput, minValueEl, maxValueEl) {
  const minValue = Number(minInput.value);
  const maxValue = Number(maxInput.value);

  if (minValue > maxValue) {
    maxInput.value = minValue;
  }

  minValueEl.textContent = minutesLabel(Number(minInput.value));
  maxValueEl.textContent = minutesLabel(Number(maxInput.value));
}

function syncTimingControls() {
  syncTimingControlPair(serviceMinInput, serviceMaxInput, serviceMinValEl, serviceMaxValEl);
  syncTimingControlPair(shopMinInput, shopMaxInput, shopMinValEl, shopMaxValEl);
}

function simulateFixedStaffMetrics(staffCount) {
  const randomFn = createSeededRandom(`${seedInput.value}${staffCount}`);
  const limit = Number(hoursInput.value) * 3600;
  const baseDelay = Number(arrivalRateInput.value);
  const intensity = state.peakEnabled ? Number(surgeInput.value) : 1;
  const timings = timingConfig();
  const queues = Array.from({ length: staffCount }, () => []);
  const busyUntil = Array.from({ length: staffCount }, () => 0);
  const events = [{ at: 1, type: "arrival" }];
  const cycleTimes = [];
  let served = 0;

  function scheduleAnalysisEvent(at, type, payload = {}) {
    const nextEvent = { at, type, payload };
    let low = 0;
    let high = events.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (events[mid].at <= at) low = mid + 1;
      else high = mid;
    }

    events.splice(low, 0, nextEvent);
  }

  function tryStartAnalysisService(now) {
    for (let index = 0; index < staffCount; index++) {
      if (busyUntil[index] > now || queues[index].length === 0) continue;

      const arrivalAt = queues[index].shift();
      const serviceTime = randomBetweenWith(randomFn, timings.serviceMin, timings.serviceMax);
      busyUntil[index] = now + serviceTime;
      scheduleAnalysisEvent(busyUntil[index], "service-complete", { index, arrivalAt });
    }
  }

  while (events.length) {
    const event = events.shift();
    if (event.at > limit) break;

    if (event.type === "arrival") {
      const shopTime = randomBetweenWith(randomFn, timings.shopMin, timings.shopMax);
      scheduleAnalysisEvent(event.at + shopTime, "join-queue", { arrivalAt: event.at });

      const nextDelay = exponentialDelay(baseDelay / intensity, randomFn);
      scheduleAnalysisEvent(event.at + nextDelay, "arrival");
    }

    if (event.type === "join-queue") {
      let bestIndex = 0;
      let bestLength = Infinity;
      queues.forEach((queue, index) => {
        if (queue.length < bestLength) {
          bestLength = queue.length;
          bestIndex = index;
        }
      });
      queues[bestIndex].push(event.payload.arrivalAt);
      tryStartAnalysisService(event.at);
    }

    if (event.type === "service-complete") {
      served++;
      cycleTimes.push(event.at - event.payload.arrivalAt);
      tryStartAnalysisService(event.at);
    }
  }

  return {
    averageCycle: cycleTimes.length
      ? cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length / 60
      : 0,
    throughput: served / Math.max(1, limit / 60)
  };
}

function updateStaffingAnalysis() {
  state.staffingThroughput = Array.from({ length: 6 }, (_, index) => ({
    staff: index + 1,
    ...simulateFixedStaffMetrics(index + 1)
  }));
  renderCycleChart();
  renderThroughputChart();
}

function setupEventListeners() {
  toggleButton.addEventListener("click", toggleRun);
  playBtn.addEventListener("click", toggleRun);
  resetButton.addEventListener("click", resetSimulation);
  
  arrivalRateInput.addEventListener("input", (e) => {
    const val = (e.target.value / 60).toFixed(1);
    arrivalValEl.textContent = `${val}m`;
    updateStaffingAnalysis();
  });

  hoursInput.addEventListener("input", (e) => {
    const val = e.target.value;
    hoursValEl.textContent = `${val}h`;
    state.limit = val * 3600;
    updateStaffingAnalysis();
  });

  peakToggle.addEventListener("click", () => {
    state.peakEnabled = !state.peakEnabled;
    peakToggle.classList.toggle("active", state.peakEnabled);
    updateStaffingAnalysis();
    updateMetrics();
  });

  randomizeSeedBtn.addEventListener("click", () => {
    seedInput.value = Math.floor(Math.random() * 1000);
    updateStaffingAnalysis();
  });

  seedInput.addEventListener("input", updateStaffingAnalysis);
  surgeInput.addEventListener("input", () => {
    updateStaffingAnalysis();
    updateMetrics();
  });

  [serviceMinInput, serviceMaxInput, shopMinInput, shopMaxInput].forEach((input) => {
    input.addEventListener("input", () => {
      syncTimingControls();
      updateStaffingAnalysis();
    });
  });

  incCashiersBtn.addEventListener("click", () => adjustCashiers(1));
  decCashiersBtn.addEventListener("click", () => adjustCashiers(-1));

  speedButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      speedButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.speed = Number(btn.dataset.speed);
    });
  });
}

function adjustCashiers(delta) {
  let count = Number(cashierCountEl.textContent);
  count = Math.max(1, Math.min(2, count + delta));
  cashierCountEl.textContent = String(count).padStart(2, '0');
  
  state.pos.forEach((p, i) => {
    p.open = (i < count);
    const stationEl = document.querySelector(`#station-${i+1}`);
    if (stationEl) {
      stationEl.classList.toggle("open", p.open);
      stationEl.classList.toggle("closed", !p.open);
      stationEl.querySelector(".status").textContent = p.open ? (p.busy ? "BUSY" : "OPEN") : "CLOSED";
      stationEl.querySelector(".name").textContent = `POS 0${i+1}`;
    }
  });
  
  if (delta < 0) redistributeQueues();
  renderCycleChart();
  renderThroughputChart();
}

function redistributeQueues() {
  const activeQueues = state.pos.filter(p => p.open).length;
  const allWaiting = [];
  state.queues.forEach(q => allWaiting.push(...q));
  
  state.queues = [[], []];
  allWaiting.forEach((id, i) => {
    state.queues[i % Math.max(1, activeQueues)].push(id);
  });
  repositionQueues();
}

function setPos2Open(open) {
  if (!state.pos[1] || state.pos[1].open === open) return;

  state.pos[1].open = open;
  const stationEl = document.querySelector("#station-2");
  if (stationEl) {
    stationEl.classList.toggle("open", open);
    stationEl.classList.toggle("closed", !open);
    stationEl.querySelector(".status").textContent = open ? "OPEN" : "CLOSED";
  }

  addEventLog(open
    ? "POS 2: Opens because POS 1 queue reached 5 waiting customers"
    : "POS 2: Closes; Staff 2 returns to utility work");
  redistributeQueues();
  tryStartService();
}

function evaluateDynamicPos2() {
  const totalQLen = state.queues.reduce((sum, queue) => sum + queue.length, 0);
  const pos1QueuePressure = state.queues[0].length >= 5;
  const pos2Idle = state.pos[1] && !state.pos[1].busy && state.queues[1].length === 0;

  if (!state.pos[1].open && pos1QueuePressure) {
    setPos2Open(true);
    return;
  }

  if (state.pos[1].open && totalQLen <= 2 && pos2Idle) {
    setPos2Open(false);
  }
}

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function isWebPeakTime(now = state.time) {
  if (!state.peakEnabled) return false;
  const dayTime = now % (24 * 3600);
  return (
    (dayTime >= 9 * 3600 && dayTime < 12 * 3600) ||
    (dayTime >= 17 * 3600 && dayTime < 19 * 3600) ||
    (dayTime >= 21 * 3600 && dayTime < 23 * 3600)
  );
}

function schedule(delay, type, payload = {}) {
  state.events.push({ at: state.time + delay, type, payload });
  state.events.sort((a, b) => a.at - b.at);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function addEventLog(message) {
  state.eventLog.push(message);
  if (state.eventLog.length > 341) state.eventLog.shift();
  renderEventLog();
}

function renderEventLog() {
  if (!customerEventLog) return;

  const shown = state.eventLog.slice(-40);
  customerEventLog.innerHTML = "";
  shown.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    customerEventLog.appendChild(item);
  });

  if (eventLogShown) eventLogShown.textContent = shown.length;
  if (eventLogTotal) eventLogTotal.textContent = state.eventLog.length;
  customerEventLog.scrollTop = customerEventLog.scrollHeight;
}

function toggleRun() {
  if (!state.started) {
    state.started = true;
    resetSimulation();
  }
  state.running = !state.running;
  toggleButton.textContent = state.running ? "PAUSE SIMULATION" : "RESUME SIMULATION";
}

function resetSimulation() {
  customersLayer.innerHTML = "";
  state.time = 0;
  state.nextCustomerId = 1;
  state.events = [];
  state.customers.clear();
  state.queues = [[], []];
  state.served = 0;
  state.arrived = 0;
  state.totalWait = 0;
  state.maxWait = 0;
  state.history = [];
  state.eventLog = [];
  state.lastChartUpdate = 0;
  
  state.pos.forEach((p, index) => {
    p.open = index === 0;
    p.busy = false;
    p.current = null;
    p.busyTotal = 0;
    const stationEl = document.querySelector(`#station-${index + 1}`);
    if (stationEl) {
      stationEl.classList.toggle("open", p.open);
      stationEl.classList.toggle("closed", !p.open);
      stationEl.classList.remove("busy");
      stationEl.querySelector(".status").textContent = p.open ? "OPEN" : "CLOSED";
    }
  });
  cashierCountEl.textContent = "01";

  schedule(1, "arrival");
  updateMetrics();
  renderChart();
  updateStaffingAnalysis();
  renderEventLog();
}

function createCustomer() {
  const id = state.nextCustomerId++;
  const el = document.createElement("div");
  el.className = "customer-dot";
  customersLayer.appendChild(el);

  const customer = {
    id,
    el,
    position: { ...points.entrance },
    shoppingArea: shoppingAreas[randomBetween(0, shoppingAreas.length - 1)],
    queueJoinedAt: null,
    upset: false,
    status: "arriving"
  };

  state.customers.set(id, customer);
  updateCustomerPos(customer);
  return customer;
}

function updateCustomerPos(customer) {
  const xPct = (customer.position.x / VIEWPORT_WIDTH) * 100;
  const yPct = (customer.position.y / VIEWPORT_HEIGHT) * 100;
  customer.el.style.left = `${xPct}%`;
  customer.el.style.top = `${yPct}%`;
}

function moveCustomer(customer, point) {
  customer.position = { ...point };
  updateCustomerPos(customer);
}

function markCustomerUpset(customer) {
  if (customer.upset) return;

  customer.upset = true;
  customer.el.classList.add("upset");
  addEventLog(`Customer ${customer.id}: Becomes upset after waiting ${UPSET_WAIT_SECONDS} seconds`);
}

function handleArrival() {
  if (state.time >= state.limit) return;
  
  state.arrived++;
  const customer = createCustomer();
  customer.arrivalAt = state.time;
  addEventLog(`Customer ${customer.id}: Arrives at time ${state.time.toFixed(2)}`);
  const timings = timingConfig();
  const shopTime = randomBetween(timings.shopMin, timings.shopMax);
  schedule(4, "go-shopping", { id: customer.id });
  schedule(shopTime, "finish-shopping", { id: customer.id });
  
  const baseDelay = Number(arrivalRateInput.value);
  const intensity = isWebPeakTime() ? Number(surgeInput.value) : 1.0;
  const nextDelay = exponentialDelay(baseDelay / intensity);
  schedule(nextDelay, "arrival");
}

function handleGoShopping({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;

  const area = customer.shoppingArea;
  customer.status = "shopping";
  moveCustomer(customer, points[area.key]);
  addEventLog(`Customer ${id}: Goes to ${area.type} ${area.label} at time ${state.time.toFixed(2)}`);
}

function handleFinishShopping({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;

  const area = customer.shoppingArea;
  addEventLog(`Customer ${id}: Picks item from ${area.type} ${area.label} at time ${state.time.toFixed(2)}`);
  handleJoinQueue({ id });
}

function handleJoinQueue({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;

  const openStations = state.pos.filter(p => p.open);
  if (openStations.length === 0) return;

  let bestIdx = 0;
  let minLen = Infinity;
  state.pos.forEach((p, i) => {
    if (p.open && state.queues[i].length < minLen) {
      minLen = state.queues[i].length;
      bestIdx = i;
    }
  });

  customer.status = "queued";
  customer.queueJoinedAt = state.time;
  state.queues[bestIdx].push(id);
  addEventLog(`Customer ${id}: Joins queue at time ${state.time.toFixed(2)}`);
  
  evaluateDynamicPos2();
  repositionQueues();
  tryStartService();
}

function repositionQueues() {
  state.queues.forEach((q, qIdx) => {
    q.forEach((id, i) => {
      const customer = state.customers.get(id);
      if (!customer) return;
      const qPoints = points[`queue${qIdx + 1}`];
      const point = qPoints[Math.min(i, qPoints.length - 1)];
      moveCustomer(customer, point);
    });
  });
}

function tryStartService() {
  state.pos.forEach((pos, i) => {
    if (!pos.open || pos.busy || state.queues[i].length === 0) return;

    const id = state.queues[i].shift();
    const customer = state.customers.get(id);
    if (!customer) return;

    const wait = state.time - customer.queueJoinedAt;
    state.totalWait += wait;
    state.maxWait = Math.max(state.maxWait, wait);
    if (wait >= UPSET_WAIT_SECONDS) markCustomerUpset(customer);
    addEventLog(`Customer ${id}: Starts service at time ${state.time.toFixed(2)}`);
    addEventLog(`Customer ${id}: Waiting time ${wait.toFixed(2)} seconds`);

    pos.busy = true;
    pos.current = id;
    const timings = timingConfig();
    const serviceTime = randomBetween(timings.serviceMin, timings.serviceMax);
    pos.busyUntil = state.time + serviceTime;
    pos.busyTotal += serviceTime;

    customer.status = "serving";
    const stationPoint = points[`station${i+1}`];
    moveCustomer(customer, { x: stationPoint.x - 40, y: stationPoint.y });
    
    const stationEl = document.querySelector(`#station-${i+1}`);
    if (stationEl) {
      stationEl.querySelector(".status").textContent = "BUSY";
      stationEl.classList.add("busy");
      stationEl.classList.add("open");
    }

    schedule(serviceTime, "service-complete", { id, posIdx: i });
    repositionQueues();
  });
}

function handleServiceComplete({ id, posIdx }) {
  const pos = state.pos[posIdx];
  const customer = state.customers.get(id);
  pos.busy = false;
  pos.current = null;
  
  const stationEl = document.querySelector(`#station-${posIdx+1}`);
  if (stationEl) {
    stationEl.querySelector(".status").textContent = pos.open ? "OPEN" : "CLOSED";
    stationEl.classList.remove("busy");
    stationEl.classList.toggle("open", pos.open);
    stationEl.classList.toggle("closed", !pos.open);
  }

  if (customer) {
    state.served++;
    addEventLog(`Customer ${id}: Leaves at time ${state.time.toFixed(2)}`);
    addEventLog(`Customer ${id}: Cycle time ${(state.time - customer.arrivalAt).toFixed(2)} seconds`);
    customer.status = "exiting";
    moveCustomer(customer, points.exit);
    setTimeout(() => {
      customer.el.remove();
      state.customers.delete(id);
    }, 1000);
  }
  evaluateDynamicPos2();
  tryStartService();
}

function processEvents() {
  while (state.events.length && state.events[0].at <= state.time) {
    const event = state.events.shift();
    const handlers = {
      arrival: handleArrival,
      "go-shopping": handleGoShopping,
      "finish-shopping": handleFinishShopping,
      "service-complete": handleServiceComplete
    };
    handlers[event.type]?.(event.payload);
  }
}

function updateMetrics() {
  simTimeEl.textContent = formatTime(state.time);
  updateCustomerUpsetStates();
  
  const avgWait = state.served ? state.totalWait / state.served : 0;
  metrics.wait.textContent = formatTime(avgWait);
  metrics.maxWait.textContent = formatTime(state.maxWait);

  const totalQLen = state.queues.reduce((s, q) => s + q.length, 0);
  evaluateDynamicPos2();
  metrics.qLen.textContent = (totalQLen / Math.max(1, state.pos.filter(p => p.open).length)).toFixed(1);
  metrics.qStatus.textContent = totalQLen > 5 ? "CONGESTED" : "STABLE";
  metrics.qStatus.className = `status-tag ${totalQLen > 5 ? 'neutral' : 'positive'}`;

  const utilization = state.time ? (state.pos.reduce((s, p) => s + p.busyTotal, 0) / (state.time * state.pos.length)) * 100 : 0;
  metrics.util.textContent = `${Math.round(utilization)}%`;
  metrics.utilStatus.textContent = utilization > 70 ? "HIGH" : "IDLE";

  metrics.served.textContent = state.served;
  metrics.arrived.textContent = state.arrived;
  metrics.surgeValBadge.textContent = Number(surgeInput.value).toFixed(1);
  metrics.surgeAlert.style.display = isWebPeakTime() ? "flex" : "none";

  if (state.time >= state.lastChartUpdate + state.chartUpdateInterval) {
    state.history.push({
      time: state.time,
      qLen: totalQLen,
      busy: state.pos.filter(p => p.busy).length
    });
    if (state.history.length > 200) state.history.shift();
    state.lastChartUpdate = state.time;
    renderChart();
  }
}

function updateCustomerUpsetStates() {
  state.customers.forEach((customer) => {
    if (
      customer.status === "queued" &&
      customer.queueJoinedAt !== null &&
      state.time - customer.queueJoinedAt >= UPSET_WAIT_SECONDS
    ) {
      markCustomerUpset(customer);
    }
  });
}

function renderChart() {
  if (!chartCtx || !chartCanvas) return;

  const w = chartCanvas.width;
  const h = chartCanvas.height;
  chartCtx.clearRect(0, 0, w, h);

  const maxVal = 10;
  const leftPad = 34;
  const rightPad = 18;
  const topPad = 22;
  const bottomPad = 28;
  
  const getX = (i) => leftPad + (i / Math.max(1, state.history.length - 1)) * (w - leftPad - rightPad);
  const getY = (val) => h - bottomPad - (val / maxVal) * (h - topPad - bottomPad);

  // Draw Grid & Labels
  chartCtx.strokeStyle = "#f3f4f6";
  chartCtx.lineWidth = 1;
  chartCtx.font = "10px Inter";
  chartCtx.fillStyle = "#9ca3af";
  
  [0, 5, 10].forEach((tick) => {
    const y = getY(tick);
    chartCtx.beginPath();
    chartCtx.moveTo(leftPad, y);
    chartCtx.lineTo(w - rightPad, y);
    chartCtx.stroke();
    chartCtx.fillText(tick, 14, y + 4);
  });

  if (state.history.length < 2) return;

  // Add Time Labels
  for (let i = 0; i < state.history.length; i += 40) {
    const x = getX(i);
    chartCtx.fillText(formatTime(state.history[i].time), x - 15, h - 6);
  }

  // Busy Cashiers Area (Orange)
  chartCtx.beginPath();
  chartCtx.moveTo(getX(0), getY(0));
  state.history.forEach((pt, i) => chartCtx.lineTo(getX(i), getY(pt.busy)));
  chartCtx.lineTo(getX(state.history.length - 1), getY(0));
  chartCtx.fillStyle = "rgba(237, 137, 54, 0.08)";
  chartCtx.fill();

  chartCtx.strokeStyle = "#ed8936";
  chartCtx.lineWidth = 2;
  chartCtx.beginPath();
  state.history.forEach((pt, i) => {
    if (i === 0) chartCtx.moveTo(getX(i), getY(pt.busy));
    else chartCtx.lineTo(getX(i), getY(pt.busy));
  });
  chartCtx.stroke();

  // Queue Length Area (Green)
  chartCtx.beginPath();
  chartCtx.moveTo(getX(0), getY(0));
  state.history.forEach((pt, i) => chartCtx.lineTo(getX(i), getY(pt.qLen)));
  chartCtx.lineTo(getX(state.history.length - 1), getY(0));
  chartCtx.fillStyle = "rgba(56, 161, 105, 0.12)";
  chartCtx.fill();

  chartCtx.strokeStyle = "#38a169";
  chartCtx.beginPath();
  state.history.forEach((pt, i) => {
    if (i === 0) chartCtx.moveTo(getX(i), getY(pt.qLen));
    else chartCtx.lineTo(getX(i), getY(pt.qLen));
  });
  chartCtx.stroke();
}

function renderStaffMetricChart(canvas, ctx, metricKey, color, yLabel, decimals) {
  if (!ctx || !canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const data = state.staffingThroughput;
  const leftPad = Math.max(52, Math.min(68, w * 0.08));
  const rightPad = 20;
  const topPad = 32;
  const bottomPad = 38;
  const values = data.map((item) => item[metricKey]);
  const maxValue = Math.max(0.1, ...values) * 1.15;
  const plotWidth = Math.max(40, w - leftPad - rightPad);
  const plotHeight = Math.max(40, h - topPad - bottomPad);
  const currentStaff = Math.max(1, Math.min(6, Number(cashierCountEl.textContent) || 1));

  const getX = (staff) => leftPad + ((staff - 1) / 5) * plotWidth;
  const getY = (value) => h - bottomPad - (value / maxValue) * plotHeight;

  ctx.strokeStyle = "#d9e1ea";
  ctx.lineWidth = 1;
  ctx.font = "9px JetBrains Mono";
  ctx.fillStyle = "#53657d";

  for (let i = 0; i <= 4; i++) {
    const value = (maxValue / 4) * i;
    const y = getY(value);
    ctx.beginPath();
    ctx.moveTo(leftPad, y);
    ctx.lineTo(w - rightPad, y);
    ctx.stroke();
    ctx.fillText(value.toFixed(decimals), 8, y + 3);
  }

  data.forEach((point) => {
    ctx.fillText(String(point.staff), getX(point.staff) - 3, h - 18);
  });

  const refX = getX(currentStaff);
  ctx.save();
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = "#8ea0b7";
  ctx.beginPath();
  ctx.moveTo(refX, topPad - 10);
  ctx.lineTo(refX, h - bottomPad + 8);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#53657d";
  ctx.fillText("now", refX - 9, topPad - 16);
  ctx.fillText(yLabel, leftPad + 42, topPad - 16);
  ctx.fillText("Number of Staffs", leftPad + plotWidth / 2 - 44, h - 6);

  if (data.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  data.forEach((point, index) => {
    const x = getX(point.staff);
    const y = getY(point[metricKey]);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  data.forEach((point) => {
    const x = getX(point.staff);
    const y = getY(point[metricKey]);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function renderCycleChart() {
  renderStaffMetricChart(cycleCanvas, cycleCtx, "averageCycle", "#008148", "Avg CT (minutes)", 2);
}

function renderThroughputChart() {
  renderStaffMetricChart(throughputCanvas, throughputCtx, "throughput", "#ff4b33", "Throughput (cust/min)", 3);
}

function tick(now) {
  const delta = Math.min((now - state.lastFrame) / 1000, 0.1);
  state.lastFrame = now;

  if (state.running) {
    if (state.time < state.limit) {
      state.time += delta * state.speed;
    } else {
      state.running = false;
      toggleButton.textContent = "RESUME SIMULATION";
    }
    processEvents();
    updateMetrics();
  }
  requestAnimationFrame(tick);
}

init();
