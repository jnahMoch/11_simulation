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

const playIconSvg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const pauseIconSvg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

const metrics = {
  wait: document.querySelector("#metric-wait"),
  maxWait: document.querySelector("#max-wait"),
  qLen: document.querySelector("#metric-qlen"),
  qStatus: document.querySelector("#q-status"),
  inside: document.querySelector("#metric-inside"),
  upset: document.querySelector("#metric-upset"),
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

const UTILITY_TASKS = [
  "prepare hotdogs",
  "prepare donuts",
  "prepare soft-serves",
  "prepare ice cream station",
  "organize inventory",
  "restock shelves",
  "refill refrigerators",
  "clean store",
];
const UTILITY_INTERVAL = 20 * 60;
const UTILITY_DURATION = 8 * 60;
const POS_MONITOR_INTERVAL = 10;
const RESTOCK_THRESHOLD = 40;

const points = {
  entrance: { x: 50, y: 250 },
  station1: { x: 680, y: 165 },
  station2: { x: 680, y: 315 },
  exit: { x: 710, y: 475 },
  shelfSnacks: { x: 112, y: 68 },
  shelfDrinks: { x: 228, y: 68 },
  shelfInstant: { x: 344, y: 68 },
  shelfCandy: { x: 460, y: 68 },
  shelfBakery: { x: 576, y: 68 },
  fridgeBeverage: { x: 118, y: 430 },
  fridgeDairy: { x: 264, y: 430 },
  fridgeFrozen: { x: 410, y: 430 },
  fridgeBeer: { x: 556, y: 430 },
  // Vertical queue below counter, bottom to top
  sharedQueue: [
    { x: 610, y: 225 },  // front of line (served next)
    { x: 610, y: 260 },
    { x: 610, y: 295 },
    { x: 610, y: 330 },
    { x: 610, y: 365 },
    { x: 610, y: 400 },
  ],
};

const shoppingAreas = [
  { key: "shelfSnacks", type: "Shelf", label: "Snacks", stock: 0 },
  { key: "shelfDrinks", type: "Shelf", label: "Drinks", stock: 0 },
  { key: "shelfInstant", type: "Shelf", label: "Instant", stock: 0 },
  { key: "shelfCandy", type: "Shelf", label: "Candy", stock: 0 },
  { key: "shelfBakery", type: "Shelf", label: "Bakery", stock: 0 },
  { key: "fridgeBeverage", type: "Fridge", label: "Beverage", stock: 0 },
  { key: "fridgeDairy", type: "Fridge", label: "Dairy", stock: 0 },
  { key: "fridgeFrozen", type: "Fridge", label: "Frozen", stock: 0 },
  { key: "fridgeBeer", type: "Fridge", label: "Beer", stock: 0 },
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
  queue: [],
  pos: [
    { id: 1, open: true, busy: false, busyUntil: 0, current: null, busyTotal: 0, serviceStartedAt: 0 },
    { id: 2, open: false, busy: false, busyUntil: 0, current: null, busyTotal: 0, serviceStartedAt: 0 },
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
  lastChartUpdate: 0,
  backendResultsActive: false,
  backendLoading: false,
  upsetCount: 0,
  staff2: { taskIndex: 0, busyUntil: 0, task: null, pausedForPos2: false },
  staff3: { taskIndex: 0, busyUntil: 0, task: null },
  utilityWorkload: { "Staff 2": 0, "Staff 3": 0 },
  nextUtilityCheck: 0
};

function init() {
  window.addEventListener('resize', resizeCanvas);
  syncTimingControls();
  setupEventListeners();
  updatePlaybackControls();
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
      const serviceTime = exponentialDelay((timings.serviceMin + timings.serviceMax) / 2, randomFn);
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
  toggleButton.addEventListener("click", runAuthoritativeSimulation);
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

function backendQueryParams() {
  const timings = timingConfig();
  const serviceMean = (timings.serviceMin + timings.serviceMax) / 2;
  const params = new URLSearchParams({
    simTimeMinutes: String(Number(hoursInput.value) * 60),
    arrivalMeanSeconds: arrivalRateInput.value,
    serviceMeanSeconds: String(serviceMean),
    shoppingMinSeconds: String(timings.shopMin),
    shoppingMaxSeconds: String(timings.shopMax),
    posLanes: cashierCountEl.textContent,
    seed: seedInput.value || "42",
    peakEnabled: state.peakEnabled ? "1" : "0",
    surgeMultiplier: surgeInput.value
  });

  return params.toString();
}

async function runAuthoritativeSimulation() {
  if (state.backendLoading) return;

  state.backendLoading = true;
  const previousLabel = toggleButton.innerHTML;
  toggleButton.disabled = true;
  toggleButton.textContent = "RUNNING...";

  try {
    const response = await fetch(`/api/simulation?${backendQueryParams()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Simulation API returned ${response.status}`);

    const payload = await response.json();
    resetSimulation();
    applyBackendResults(payload);
    state.started = true;
    state.running = true;
  } catch (error) {
    addEventLog(`Simulation API error: ${error.message}`);
  } finally {
    state.backendLoading = false;
    toggleButton.disabled = false;
    if (!state.backendResultsActive) toggleButton.innerHTML = previousLabel;
    updatePlaybackControls();
  }
}

function applyBackendResults(payload) {
  state.backendResultsActive = true;
  state.history = mergeBackendSeries(payload.series);
  state.eventLog = payload.eventLog || [];

  simTimeEl.textContent = "00:00:00";
  metrics.wait.textContent = formatTime(payload.averageWaitingTime || 0);
  metrics.maxWait.textContent = formatTime(payload.maximumWaitingTime || payload.averageWaitingTime || 0);
  metrics.qLen.textContent = Number(payload.averageQueueLength || 0).toFixed(1);
  metrics.qStatus.textContent = (payload.maximumQueueLength || 0) > 5 ? "CONGESTED" : "STABLE";
  metrics.qStatus.className = `status-tag ${(payload.maximumQueueLength || 0) > 5 ? "neutral" : "positive"}`;
  metrics.util.textContent = `${Math.round((payload.cashierUtilization || 0) * 100)}%`;
  metrics.utilStatus.textContent = (payload.cashierUtilization || 0) > 0.7 ? "HIGH" : "IDLE";
  metrics.served.textContent = payload.customersServed || 0;
  metrics.arrived.textContent = payload.customersArrived || 0;
  metrics.surgeValBadge.textContent = Number(surgeInput.value).toFixed(1);

  renderChart();
  renderEventLog();
}

function mergeBackendSeries(series = {}) {
  const queueSeries = series.queueLength || [];
  const busySeries = series.busyCashiers || [];
  const byTime = new Map();

  queueSeries.forEach((point) => {
    const time = Math.round(point.time * 60);
    byTime.set(time, { time, qLen: point.value, busy: 0 });
  });

  busySeries.forEach((point) => {
    const time = Math.round(point.time * 60);
    const row = byTime.get(time) || { time, qLen: 0, busy: 0 };
    row.busy = point.value;
    byTime.set(time, row);
  });

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function updatePlaybackControls() {
  const hasStarted = state.started || state.time > 0;
  const isComplete = state.time >= state.limit;
  const playLabel = state.running ? "Pause simulation" : (isComplete ? "Replay simulation" : "Play simulation");
  const runLabel = state.running
    ? "PAUSE SIMULATION"
    : (hasStarted && !isComplete ? "RESUME SIMULATION" : "RUN SIMULATION");

  playBtn.innerHTML = state.running ? pauseIconSvg : playIconSvg;
  playBtn.setAttribute("aria-label", playLabel);
  playBtn.setAttribute("title", playLabel);
  playBtn.setAttribute("aria-pressed", String(state.running));
  playBtn.classList.toggle("is-running", state.running);

  toggleButton.innerHTML = `${runLabel} <span aria-hidden="true">${state.running ? "II" : "&#9654;"}</span>`;
  toggleButton.classList.toggle("is-running", state.running);
}

function adjustCashiers(delta) {
  let count = Number(cashierCountEl.textContent);
  count = Math.max(1, Math.min(2, count + delta));
  cashierCountEl.textContent = String(count).padStart(2, '0');
  
  state.pos.forEach((p, i) => {
    p.open = (i < count);
    updateCounterUI(i);
  });
  
  if (delta < 0) repositionQueues();
  renderCycleChart();
  renderThroughputChart();
}

function setPos2Open(open, reason) {
  if (!state.pos[1] || state.pos[1].open === open) return;

  state.pos[1].open = open;
  updateCounterUI(1);

  addEventLog(open
    ? `POS 2: Opens (${reason || "queue rule"})`
    : "POS 2: Closes; Staff 2 returns to utility work");
  repositionQueues();
  tryStartService();
}

function updateCounterUI(idx) {
  const p = state.pos[idx];
  const el = document.querySelector(`#counter-${idx+1}`);
  if (!el) return;

  el.className = "counter-desk";
  if (p.open && p.busy) el.classList.add("busy");
  else if (p.open) el.classList.add("open");
  else el.classList.add("closed");

  const statusText = p.open ? (p.busy ? "BUSY" : "OPEN") : "CLOSED";
  const statusDotEl = el.querySelector(".counter-status-dot");
  const statusTextEl = el.querySelector(".counter-status-text");
  if (statusDotEl) statusDotEl.style.display = "";
  if (statusTextEl) statusTextEl.textContent = statusText;

  // Show/hide staff icon based on open status
  const staffIcon = el.querySelector(".counter-staff-icon");
  if (staffIcon) staffIcon.style.display = p.open ? "" : "none";

  // Update shared queue lane visibility
  const qLane = document.querySelector("#queue-lane-shared");
  if (qLane) {
    const anyOpen = state.pos.some(p => p.open);
    qLane.classList.toggle("empty", !anyOpen || state.queue.length === 0);
  }
}

function averageQueueWait() {
  const queue = state.queue;
  if (!queue || queue.length === 0) return 0;
  let totalWait = 0;
  let count = 0;
  queue.forEach((id) => {
    const customer = state.customers.get(id);
    if (customer && customer.queueJoinedAt !== null) {
      totalWait += state.time - customer.queueJoinedAt;
      count++;
    }
  });
  return count > 0 ? totalWait / count : 0;
}

function evaluateDynamicPos2() {
  const queueLen = state.queue.length;
  const avgWait = averageQueueWait();
  const pos2Idle = state.pos[1] && !state.pos[1].busy;

  const queuePressure = queueLen >= 5;
  const waitPressure = avgWait >= 180;

  if (!state.pos[1].open && (queuePressure || waitPressure)) {
    const reason = waitPressure ? "average wait reached threshold" : "Shared queue reached threshold";
    setPos2Open(true, reason);
    return;
  }

  if (state.pos[1].open && pos2Idle && queueLen <= 2 && avgWait < 60) {
    setPos2Open(false);
  }
}

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function isNightShift(now = state.time) {
  const dayTime = now % (24 * 3600);
  if (dayTime >= 18 * 3600 || dayTime < 2 * 3600) return true;
  return false;
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
  if (state.backendResultsActive) return;

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
  if (state.time >= state.limit) {
    resetSimulation();
  }

  if (!state.started) {
    resetSimulation();
    state.started = true;
  }
  state.running = !state.running;
  updatePlaybackControls();
}

function resetSimulation() {
  customersLayer.innerHTML = "";
  state.running = false;
  state.started = false;
  state.backendResultsActive = false;
  state.time = 0;
  state.nextCustomerId = 1;
  state.events = [];
  state.customers.clear();
  state.queue = [];
  state.served = 0;
  state.arrived = 0;
  state.totalWait = 0;
  state.maxWait = 0;
  state.upsetCount = 0;
  state.history = [];
  state.eventLog = [];
  state.lastChartUpdate = 0;
  state.staff2 = { taskIndex: 0, busyUntil: 0, task: null, pausedForPos2: false };
  state.staff3 = { taskIndex: 0, busyUntil: 0, task: null };
  state.staffAvatars = null; // Clear dynamically created avatars
  state.utilityWorkload = { "Staff 2": 0, "Staff 3": 0 };
  state.nextUtilityCheck = 1200;
  
  state.pos.forEach((p, index) => {
    p.open = index === 0;
    p.busy = false;
    p.current = null;
    p.busyTotal = 0;
    p.serviceStartedAt = 0;
    updateCounterUI(index);
    const nowServing = document.querySelector(`#now-serving-${index+1}`);
    const ccId = document.querySelector(`#cc-id-${index+1}`);
    const ccTime = document.querySelector(`#cc-time-${index+1}`);
    if (nowServing) nowServing.classList.remove("active");
    if (ccId) ccId.textContent = "";
    if (ccTime) ccTime.textContent = "";
  });
  cashierCountEl.textContent = "01";
  repositionQueues();

  // Reinitialize shelf stock
  shoppingAreas.forEach((area) => {
    area.stock = 50 + Math.floor(Math.random() * 51);
  });
  updateShelfUI();

  schedule(1, "arrival");
  updateMetrics();
  renderChart();
  updateStaffingAnalysis();
  renderEventLog();
  updatePlaybackControls();
}

const GREEN_SHADES = ["#22c55e","#16a34a","#2dd4a0","#10b981","#34d399","#4ade80","#14b85a","#0ea55a","#28a860","#1db85c","#3bcf6a","#18bf5c","#42d478","#5ce088","#2bc86a"];

function personSVG(pose) {
  const clip = '<clipPath id="hc"><circle cx="8" cy="3" r="2.8"/></clipPath><clipPath id="tc"><rect x="4" y="5" width="8" height="8" rx="1.4"/></clipPath>';
  const shadow = '<ellipse cx="8" cy="19" rx="4.5" ry="1.5" fill="rgba(0,0,0,0.2)"/>';
  const headBase = '<circle cx="8" cy="3" r="2.8" fill="currentColor"/>';
  const headHL = '<circle cx="6.8" cy="1.8" r="2.4" fill="white" opacity="0.5" clip-path="url(#hc)"/>';
  const headSD = '<circle cx="9.4" cy="4.4" r="2.4" fill="black" opacity="0.2" clip-path="url(#hc)"/>';
  const torsoBase = '<rect x="4" y="5" width="8" height="8" rx="1.4" fill="currentColor"/>';
  const torsoHL = '<rect x="3.5" y="4.5" width="3.5" height="9" rx="1.5" fill="white" opacity="0.3" clip-path="url(#tc)"/>';
  const torsoSD = '<rect x="9" y="4.5" width="3.5" height="9" rx="1.5" fill="black" opacity="0.18" clip-path="url(#tc)"/>';
  const legHL = '<line x1="5.6" y1="12.2" x2="4.6" y2="17.8" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/><line x1="9.6" y1="12.2" x2="10.6" y2="17.8" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/>';
  const legBase = '<line x1="6" y1="12.5" x2="5" y2="18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="10" y1="12.5" x2="11" y2="18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
  let armHL = '';
  let armBase = '';
  let extras = '';
  if (pose === "shopping") {
    armBase = '<line x1="4" y1="6.5" x2="1" y2="3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="12" y1="6.5" x2="15" y2="3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
    armHL = '<line x1="3.6" y1="6.2" x2="0.6" y2="3.2" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/><line x1="11.6" y1="6.2" x2="14.6" y2="3.2" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/>';
  } else if (pose === "queued") {
    armBase = '<line x1="4" y1="6.5" x2="2.5" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="12" y1="6.5" x2="13.5" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
    armHL = '<line x1="3.6" y1="6.2" x2="2.1" y2="11.8" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/><line x1="11.6" y1="6.2" x2="13.1" y2="11.8" stroke="white" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/>';
  } else if (pose === "upset") {
    armBase = '<line x1="4" y1="6.5" x2="2" y2="8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="6.5" x2="14" y2="8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
    armHL = '<line x1="3.6" y1="6.2" x2="1.6" y2="8.3" stroke="white" stroke-width="0.8" stroke-linecap="round" opacity="0.35"/><line x1="11.6" y1="6.2" x2="13.6" y2="8.3" stroke="white" stroke-width="0.8" stroke-linecap="round" opacity="0.35"/>';
    extras = '<line x1="5.2" y1="1.5" x2="7.5" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10.8" y1="1.5" x2="8.5" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
  }
  return `<svg class="person-body" viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg"><defs>${clip}</defs>${shadow}${headBase}${headHL}${headSD}${torsoBase}${torsoHL}${torsoSD}${armHL}${armBase}${legHL}${legBase}${extras}</svg>`;
}

function createCustomer() {
  const id = state.nextCustomerId++;
  const el = document.createElement("div");
  el.className = "customer-dot";
  el.innerHTML = personSVG("shopping");
  customersLayer.appendChild(el);

  const label = document.createElement("div");
  label.className = "customer-label";
  label.textContent = `#${id}`;
  customersLayer.appendChild(label);

  const stateLabel = document.createElement("div");
  stateLabel.className = "customer-state-label";
  stateLabel.textContent = "ENTER";
  customersLayer.appendChild(stateLabel);

  // Trail dots (movement history)
  const trailEls = [];
  for (let i = 0; i < 3; i++) {
    const t = document.createElement("div");
    t.className = `customer-trail customer-trail-${i}`;
    customersLayer.appendChild(t);
    trailEls.push(t);
  }

  const greenShade = GREEN_SHADES[id % GREEN_SHADES.length];
  el.style.color = greenShade;

  const customer = {
    id,
    el,
    label,
    stateLabel,
    trailEls,
    greenShade,
    prevPositions: [],
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
  if (customer.label) {
    customer.label.style.left = `${xPct}%`;
    customer.label.style.top = `${yPct + 1.4}%`;
  }
  if (customer.stateLabel) {
    customer.stateLabel.style.left = `${xPct}%`;
    customer.stateLabel.style.top = `${yPct + 2.6}%`;
  }
  // Update trail dots
  if (customer.trailEls) {
    customer.trailEls.forEach((t, i) => {
      const prev = customer.prevPositions[i];
      if (prev) {
        const tx = (prev.x / VIEWPORT_WIDTH) * 100;
        const ty = (prev.y / VIEWPORT_HEIGHT) * 100;
        t.style.left = `${tx}%`;
        t.style.top = `${ty}%`;
        t.style.opacity = String(0.25 - i * 0.07);
      } else {
        t.style.opacity = "0";
      }
    });
  }
}

function moveCustomer(customer, point) {
  customer.prevPositions.unshift({ ...customer.position });
  if (customer.prevPositions.length > 4) customer.prevPositions.pop();
  customer.position = { ...point };
  updateCustomerPos(customer);
}

function markCustomerUpset(customer) {
  if (customer.upset) return;

  customer.upset = true;
  state.upsetCount++;
  customer.el.classList.add("upset");
  customer.el.style.color = "";
  customer.el.innerHTML = personSVG("upset");
  addEventLog(`Customer ${customer.id}: Becomes upset after waiting ${UPSET_WAIT_SECONDS} seconds`);
}

function handleArrival() {
  if (state.time >= state.limit) return;
  
  state.arrived++;
  const customer = createCustomer();
  customer.arrivalAt = state.time;
  addEventLog(`Customer ${customer.id}: Arrives at time ${state.time.toFixed(2)}`);
  evaluateDynamicPos2();
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
  customer.el.classList.add("shopping");
  customer.el.style.color = customer.greenShade;
  if (customer.stateLabel) customer.stateLabel.textContent = "BROWSE";
  moveCustomer(customer, points[area.key]);
  addEventLog(`Customer ${id}: Goes to ${area.type} ${area.label} at time ${state.time.toFixed(2)}`);
}

function handleFinishShopping({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;

  const area = customer.shoppingArea;
  area.stock = Math.max(0, area.stock - 1);
  addEventLog(`Customer ${id}: Picks item from ${area.type} ${area.label} at time ${state.time.toFixed(2)}`);
  const s2 = getStaffAvatar("Staff 2");
  const s3 = getStaffAvatar("Staff 3");
  assignCriticalRestocks({
    isPos2Open: state.pos[1] && state.pos[1].open,
    onNightShift: isNightShift(state.time),
    s2,
    s3,
  });
  handleJoinQueue({ id });
}

function handleJoinQueue({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;

  const openStations = state.pos.filter(p => p.open);
  if (openStations.length === 0) return;

  customer.status = "queued";
  customer.queueJoinedAt = state.time;
  customer.el.classList.remove("shopping");
  customer.el.classList.add("queued");
  customer.el.style.color = "";
  customer.el.innerHTML = personSVG("queued");
  if (customer.stateLabel) customer.stateLabel.textContent = "QUEUE";
  state.queue.push(id);
  addEventLog(`Customer ${id}: Joins shared queue at time ${state.time.toFixed(2)}`);
  
  evaluateDynamicPos2();
  repositionQueues();
  tryStartService();
}

function repositionQueues() {
  const q = state.queue;
  const entriesEl = document.querySelector("#ql-entries");
  const countEl = document.querySelector("#ql-count");
  const laneEl = document.querySelector("#queue-lane-shared");

  // Update queue lane visibility
  if (laneEl) {
    const anyOpen = state.pos.some(p => p.open);
    laneEl.classList.toggle("empty", q.length === 0 || !anyOpen);
  }

  // Render customer entries
  if (entriesEl) {
    entriesEl.innerHTML = "";
    const maxShow = Math.min(q.length, 10);
    for (let i = 0; i < maxShow; i++) {
      const id = q[i];
      const customer = state.customers.get(id);
      if (!customer) continue;
      const entry = document.createElement("div");
      entry.className = `queue-lane-entry${customer.upset ? " upset" : ""}`;
      const personSVGEl = document.createElement("span");
      personSVGEl.className = "entry-person";
      personSVGEl.innerHTML = personSVG(customer.upset ? "upset" : "queued");
      const idSpan = document.createElement("span");
      idSpan.className = "entry-id";
      idSpan.textContent = `#${id}`;
      if (customer.upset) idSpan.classList.add("upset");
      entry.appendChild(personSVGEl);
      entry.appendChild(idSpan);
      entriesEl.appendChild(entry);
    }
    if (q.length > 10) {
      const more = document.createElement("div");
      more.className = "queue-lane-entry queue-more";
      const moreSpan = document.createElement("span");
      moreSpan.className = "entry-id";
      moreSpan.textContent = `+${q.length - 10} more`;
      moreSpan.style.color = "#94a3b8";
      more.appendChild(moreSpan);
      entriesEl.appendChild(more);
    }
  }

  if (countEl) countEl.textContent = String(q.length);

  // Position customer dots in shared queue
  q.forEach((id, i) => {
    const customer = state.customers.get(id);
    if (!customer) return;
    const qPoints = points.sharedQueue;
    const point = qPoints[Math.min(i, qPoints.length - 1)];
    moveCustomer(customer, point);
  });
}

function tryStartService() {
  state.pos.forEach((pos, i) => {
    if (!pos.open || pos.busy || state.queue.length === 0) return;

    const id = state.queue.shift();
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
    pos.serviceStartedAt = state.time;
    const timings = timingConfig();
    const serviceTime = exponentialDelay((timings.serviceMin + timings.serviceMax) / 2);
    pos.busyUntil = state.time + serviceTime;
    pos.busyTotal += serviceTime;

    customer.status = "serving";
    customer.el.classList.remove("queued");
    if (customer.stateLabel) { customer.stateLabel.textContent = "PAY"; customer.stateLabel.classList.add("pay"); }
    // Position customer in front of counter
    const counterIdx = i + 1;
    const counterEl = document.querySelector(`#counter-${counterIdx}`);
    moveCustomer(customer, { x: points[`station${counterIdx}`].x - 50, y: points[`station${counterIdx}`].y + 30 });
    
    updateCounterUI(i);
    // Show now-serving display
    const nowServing = document.querySelector(`#now-serving-${counterIdx}`);
    const ccId = document.querySelector(`#cc-id-${counterIdx}`);
    const ccTime = document.querySelector(`#cc-time-${counterIdx}`);
    if (nowServing) nowServing.classList.add("active");
    if (ccId) ccId.textContent = `#${id}`;
    if (ccTime) ccTime.textContent = "0s";

    schedule(serviceTime, "service-complete", { id, posIdx: i });
    repositionQueues();
  });
}

function handleServiceComplete({ id, posIdx }) {
  const pos = state.pos[posIdx];
  const customer = state.customers.get(id);
  pos.busy = false;
  pos.current = null;
  
  updateCounterUI(posIdx);
  // Clear now-serving display
  const nowServing = document.querySelector(`#now-serving-${posIdx+1}`);
  const ccId = document.querySelector(`#cc-id-${posIdx+1}`);
  const ccTime = document.querySelector(`#cc-time-${posIdx+1}`);
  if (nowServing) nowServing.classList.remove("active");
  if (ccId) ccId.textContent = "";
  if (ccTime) ccTime.textContent = "";

  if (customer) {
    state.served++;
    addEventLog(`Customer ${id}: Leaves at time ${state.time.toFixed(2)}`);
    addEventLog(`Customer ${id}: Cycle time ${(state.time - customer.arrivalAt).toFixed(2)} seconds`);
    customer.status = "exiting";
    moveCustomer(customer, points.exit);
    setTimeout(() => {
      customer.el.remove();
      if (customer.label) customer.label.remove();
      if (customer.stateLabel) customer.stateLabel.remove();
      if (customer.trailEls) customer.trailEls.forEach(t => t.remove());
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
      "service-complete": handleServiceComplete,
      "utility-staff2-complete": () => {
        addEventLog(`Staff 2: Completes ${state.staff2.task}`);
        state.staff2.task = null;
      },
      "utility-staff3-complete": () => {
        addEventLog(`Staff 3: Completes ${state.staff3.task}`);
        state.staff3.task = null;
      }
    };
    handlers[event.type]?.(event.payload);
  }
}

function updateMetrics() {
  simTimeEl.textContent = formatTime(state.time);
  metrics.surgeValBadge.textContent = Number(surgeInput.value).toFixed(1);
  metrics.surgeAlert.style.display = isWebPeakTime() ? "flex" : "none";

  if (state.backendResultsActive) {
    updateCustomerUpsetStates();
    return;
  }

  updateCustomerUpsetStates();
  
  const avgWait = state.served ? state.totalWait / state.served : 0;
  metrics.wait.textContent = formatTime(avgWait);
  metrics.maxWait.textContent = formatTime(state.maxWait);

  const totalQLen = state.queue.length;
  evaluateDynamicPos2();
  metrics.qLen.textContent = totalQLen.toFixed(1);
  metrics.qStatus.textContent = totalQLen > 5 ? "CONGESTED" : "STABLE";
  metrics.qStatus.className = `status-tag ${totalQLen > 5 ? 'neutral' : 'positive'}`;

  const customersInside = state.customers.size;
  metrics.inside.textContent = customersInside;
  metrics.upset.textContent = state.upsetCount;

  const activeLanes = state.pos.filter(p => p.open).length;
  const busyTotal = state.pos.reduce((s, p) => s + p.busyTotal, 0);
  const capacityTime = activeLanes ? state.time * activeLanes : state.time;
  const utilization = state.time && capacityTime ? (busyTotal / capacityTime) * 100 : 0;
  metrics.util.textContent = `${Math.round(utilization)}%`;
  metrics.utilStatus.textContent = utilization > 70 ? "HIGH" : "IDLE";

  metrics.served.textContent = state.served;
  metrics.arrived.textContent = state.arrived;
  updateServiceTimers();
  updateShelfUI();
  updateStatusPanel();
  updateBrowsingCounts();
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

  const maxVal = Math.max(10, ...state.history.map((point) => Math.max(point.qLen, point.busy))) * 1.1;
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

function getStaffAvatar(staffId) {
  if (!state.staffAvatars) state.staffAvatars = {};
  if (!state.staffAvatars[staffId]) {
    const el = document.createElement("div");
    el.className = "staff-avatar";
    el.innerHTML = personSVG("shopping");
    el.style.color = staffId === "Staff 2" ? "#3182ce" : "#ed8936";
    customersLayer.appendChild(el);
    const label = document.createElement("div");
    label.className = "customer-label";
    label.textContent = staffId;
    customersLayer.appendChild(label);
    state.staffAvatars[staffId] = { el, label, restockTarget: null, badgeEl: null, x: 0, y: 0 };
  }
  return state.staffAvatars[staffId];
}

function updateStaffAvatarPos(avatar, point) {
  avatar.x = point.x;
  avatar.y = point.y;
  const xPct = (point.x / VIEWPORT_WIDTH) * 100;
  const yPct = (point.y / VIEWPORT_HEIGHT) * 100;
  avatar.el.style.left = `${xPct}%`;
  avatar.el.style.top = `${yPct}%`;
  avatar.label.style.left = `${xPct}%`;
  avatar.label.style.top = `${yPct + 1.4}%`;
}

function removeStaffBadge(avatar) {
  if (avatar.badgeEl) {
    avatar.badgeEl.remove();
    avatar.badgeEl = null;
  }
}

function depletedShoppingAreas() {
  return shoppingAreas
    .filter(area => area.stock < RESTOCK_THRESHOLD && !area.restockingBy)
    .sort((a, b) => a.stock - b.stock);
}

function availableRestockers({ isPos2Open, onNightShift, s2, s3 }) {
  if (onNightShift) {
    return !s3.restockTarget
      ? [{ id: "Staff 3", avatar: s3, available: true }]
      : [];
  }

  return !isPos2Open && !s2.restockTarget
    ? [{ id: "Staff 2", avatar: s2, available: true }]
    : [];
}

function staffStateFor(staffId) {
  return state[staffId === "Staff 3" ? "staff3" : "staff2"];
}

function assignRestock(staff, targetArea) {
  targetArea.restockingBy = staff.id;
  staff.avatar.restockTarget = targetArea;
  const staffState = staffStateFor(staff.id);
  if (staffState.task && !staffState.task.startsWith("Restock")) {
    addEventLog(`${staff.id}: Pauses ${staffState.task} for critical restock`);
  }
  staffState.task = `Restock ${targetArea.label}`;
  staffState.busyUntil = Number.POSITIVE_INFINITY;
  addEventLog(`${staff.id}: Starts restocking ${targetArea.label}`);
  updateStaffAvatarPos(staff.avatar, points[targetArea.key]);

  const badge = document.createElement("div");
  badge.className = "restocking-badge";
  badge.textContent = "RESTOCKING";
  const domKey = targetArea.key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  const fixture = document.querySelector(`.fixture[data-area="${domKey}"]`);
  if (fixture) fixture.appendChild(badge);
  staff.avatar.badgeEl = badge;
}

function assignCriticalRestocks({ isPos2Open, onNightShift, s2, s3 }) {
  const depletedAreas = depletedShoppingAreas();
  if (!depletedAreas.length) return;

  const restockers = availableRestockers({ isPos2Open, onNightShift, s2, s3 });
  restockers.forEach((staff, index) => {
    const targetArea = depletedAreas[index];
    if (!targetArea) return;
    assignRestock(staff, targetArea);
  });
}

function processUtilityStaff(delta) {
  const isPos2Open = state.pos[1] && state.pos[1].open;

  // Ensure avatars exist
  const s2 = getStaffAvatar("Staff 2");
  const s3 = getStaffAvatar("Staff 3");

  if (isPos2Open && !state.staff2.pausedForPos2) {
    state.staff2.pausedForPos2 = true;
    if (s2.restockTarget) {
      s2.restockTarget.restockingBy = null;
      s2.restockTarget = null;
      removeStaffBadge(s2);
    }
    state.staff2.task = null;
    state.staff2.busyUntil = state.time;
    addEventLog("Staff 2: Pauses utility work while operating POS 2");
    updateStaffAvatarPos(s2, { x: points.station2.x + 30, y: points.station2.y });
  }

  if (!isPos2Open && state.staff2.pausedForPos2) {
    state.staff2.pausedForPos2 = false;
    addEventLog("Staff 2: Resumes utility work after POS 2 closes");
    updateStaffAvatarPos(s2, { x: points.station2.x + 40, y: points.station2.y - 40 });
  }

  const onNightShift = isNightShift(state.time);
  assignCriticalRestocks({ isPos2Open, onNightShift, s2, s3 });

  // Process Active Restocks
  ["Staff 2", "Staff 3"].forEach(staffId => {
    const avatar = staffId === "Staff 2" ? s2 : s3;
    if (avatar.restockTarget) {
      const area = avatar.restockTarget;
      // Replenish stock gradually
      area.stock = Math.min(100, area.stock + (delta * state.speed * 2)); // Restock rate
      if (area.stock >= 100) {
        addEventLog(`${staffId}: Finished restocking ${area.label}`);
        area.restockingBy = null;
        avatar.restockTarget = null;
        removeStaffBadge(avatar);
        staffStateFor(staffId).task = "Idle";
        staffStateFor(staffId).busyUntil = state.time;
        // Move to idle pos
        if (staffId === "Staff 2") updateStaffAvatarPos(s2, { x: points.station2.x + 40, y: points.station2.y - 40 });
        else updateStaffAvatarPos(s3, { x: points.station1.x + 40, y: points.station1.y - 40 });
      }
    }
  });

  // Basic idle positioning if not doing anything
  if (!onNightShift) {
     s3.el.style.display = "none";
     s3.label.style.display = "none";
     if (s3.restockTarget) {
       s3.restockTarget.restockingBy = null;
       s3.restockTarget = null;
       removeStaffBadge(s3);
       state.staff3.task = null;
       state.staff3.busyUntil = state.time;
     }
  } else {
     s3.el.style.display = "";
     s3.label.style.display = "";
     if (!s3.restockTarget) updateStaffAvatarPos(s3, { x: points.station1.x + 40, y: points.station1.y - 40 });
  }

  if (!isPos2Open && !s2.restockTarget) {
     updateStaffAvatarPos(s2, { x: points.station2.x + 40, y: points.station2.y - 40 });
  }

  updateStaffUI();
}

function updateStaffUI() {
  const staff2TaskEl = document.querySelector("#staff-2-task");
  const staff3TaskEl = document.querySelector("#staff-3-task");
  const staff2TaskRow = document.querySelector("#staff-2-task-row");
  const staff3TaskRow = document.querySelector("#staff-3-task-row");
  const spStaff2 = document.querySelector("#sp-staff2");
  const spStaff3 = document.querySelector("#sp-staff3");

  const isPos2Open = state.pos[1] && state.pos[1].open;
  const s2 = state.staffAvatars?.["Staff 2"];
  const s3 = state.staffAvatars?.["Staff 3"];
  const staff2Restock = s2?.restockTarget;
  const staff3Restock = s3?.restockTarget;

  if (staff2Restock) {
    const restockText = `Restocking ${staff2Restock.label} (${Math.round(staff2Restock.stock)}%)`;
    if (staff2TaskEl) staff2TaskEl.textContent = restockText;
    if (spStaff2) { spStaff2.textContent = "RESTOCKING"; spStaff2.className = "sp-value sp-green"; }
    if (staff2TaskRow) staff2TaskRow.style.display = "";
  } else if (isPos2Open) {
    if (staff2TaskEl) staff2TaskEl.textContent = "POS 2: OPERATING";
    if (spStaff2) { spStaff2.textContent = "POS 2"; spStaff2.className = "sp-value sp-green"; }
    if (staff2TaskRow) staff2TaskRow.style.display = "";
  } else if (state.time >= state.staff2.busyUntil) {
    if (staff2TaskEl) staff2TaskEl.textContent = "IDLE";
    if (spStaff2) { spStaff2.textContent = "IDLE"; spStaff2.className = "sp-value"; }
    if (staff2TaskRow) staff2TaskRow.style.display = "";
  } else {
    const taskName = state.staff2.task || "working";
    if (staff2TaskEl) staff2TaskEl.textContent = taskName;
    if (spStaff2) { spStaff2.textContent = "BUSY"; spStaff2.className = "sp-value sp-red"; }
    if (staff2TaskRow) staff2TaskRow.style.display = "";
  }

  if (staff3Restock) {
    const restockText = `Restocking ${staff3Restock.label} (${Math.round(staff3Restock.stock)}%)`;
    if (staff3TaskEl) staff3TaskEl.textContent = restockText;
    if (spStaff3) { spStaff3.textContent = "RESTOCKING"; spStaff3.className = "sp-value sp-green"; }
    if (staff3TaskRow) staff3TaskRow.style.display = "";
    return;
  }

  const onNightShift = isNightShift(state.time);
  if (!onNightShift) {
    if (staff3TaskEl) staff3TaskEl.textContent = "—";
    if (spStaff3) { spStaff3.textContent = "OFF DUTY"; spStaff3.className = "sp-value sp-muted"; }
    if (staff3TaskRow) staff3TaskRow.style.display = "none";
  } else if (state.time >= state.staff3.busyUntil) {
    if (staff3TaskEl) staff3TaskEl.textContent = "IDLE";
    if (spStaff3) { spStaff3.textContent = "IDLE"; spStaff3.className = "sp-value"; }
    if (staff3TaskRow) staff3TaskRow.style.display = "";
  } else {
    const taskName = state.staff3.task || "working";
    if (staff3TaskEl) staff3TaskEl.textContent = taskName;
    if (spStaff3) { spStaff3.textContent = "BUSY"; spStaff3.className = "sp-value sp-red"; }
    if (staff3TaskRow) staff3TaskRow.style.display = "";
  }
}

function updateBrowsingCounts() {
  const browsing = {};
  state.customers.forEach((c) => {
    if (c.status === "shopping" && c.shoppingArea) {
      browsing[c.shoppingArea.key] = (browsing[c.shoppingArea.key] || 0) + 1;
    }
  });
  shoppingAreas.forEach((area) => {
    const domKey = area.key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const el = document.querySelector(`#browse-${domKey}`);
    if (el) {
      const count = browsing[area.key] || 0;
      el.textContent = count > 0 ? `BROWSING: ${count}` : "";
    }
  });
}

function updateShelfUI() {
  shoppingAreas.forEach((area) => {
    const domKey = area.key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const fixture = document.querySelector(`.fixture[data-area="${domKey}"]`);
    if (!fixture) return;
    const displayStock = Math.round(area.stock);
    fixture.classList.toggle("low-stock", area.stock < RESTOCK_THRESHOLD);
    fixture.classList.toggle("is-restocking", Boolean(area.restockingBy));
    fixture.setAttribute(
      "title",
      area.restockingBy
        ? `${area.label}: ${displayStock}% stock, restocking by ${area.restockingBy}`
        : `${area.label}: ${displayStock}% stock`
    );
    const stockBar = fixture.querySelector(".fixture-stock-bar");
    if (stockBar) {
      const pct = (area.stock / 100) * 100;
      stockBar.style.width = `${Math.min(100, pct)}%`;
      stockBar.style.background = pct > 70 ? "var(--primary)" : (pct > 40 ? "var(--accent-yellow)" : (pct > 20 ? "var(--accent-orange)" : "var(--accent-red)"));
    }
    const stockLabel = fixture.querySelector(".fixture-stock-pct");
    if (stockLabel) stockLabel.textContent = `${displayStock}%`;
  });
}

function updateServiceTimers() {
  state.pos.forEach((pos, i) => {
    if (!pos.busy || pos.current === null) return;
    const idx = i + 1;
    const ccTime = document.querySelector(`#cc-time-${idx}`);
    if (ccTime) {
      const elapsed = state.time - (pos.serviceStartedAt || state.time);
      ccTime.textContent = `${Math.round(elapsed)}s`;
    }
  });
}

function updateStatusPanel() {
  const spInside = document.querySelector("#sp-inside");
  const spShopping = document.querySelector("#sp-shopping");
  const spQueued = document.querySelector("#sp-queued");
  const spUpset = document.querySelector("#sp-upset");
  const spPos1 = document.querySelector("#sp-pos1");
  const spPos2 = document.querySelector("#sp-pos2");
  const spShopTime = document.querySelector("#sp-shop-time");
  const spRevenue = document.querySelector("#sp-revenue");
  const spBusyHours = document.querySelector("#sp-busy-hours");

  // Enhanced analytics
  if (spShopTime) {
    // Estimate avg shopping time from completed customers
    const totalCycle = state.served ? (state.totalWait / state.served) : 0;
    spShopTime.textContent = `${(totalCycle / 60).toFixed(1)}m`;
  }
  if (spRevenue) {
    const avgBasket = 95;
    const estRevenue = state.served * avgBasket;
    spRevenue.textContent = `₱${estRevenue.toLocaleString()}`;
  }
  if (spBusyHours) {
    const pct = state.limit ? Math.round((state.time / state.limit) * 100) : 0;
    spBusyHours.textContent = `${Math.min(100, pct)}%`;
  }

  if (spInside) spInside.textContent = state.customers.size;
  if (spShopping) {
    let shopping = 0;
    state.customers.forEach((c) => { if (c.status === "shopping") shopping++; });
    spShopping.textContent = shopping;
  }
  if (spQueued) spQueued.textContent = state.queue.length;
  if (spUpset) {
    spUpset.textContent = state.upsetCount;
    spUpset.className = "sp-value" + (state.upsetCount > 0 ? " sp-red" : " sp-muted");
  }

  if (spPos1) {
    const p1 = state.pos[0];
    spPos1.textContent = p1.busy ? "BUSY" : "OPEN";
    spPos1.className = `sp-value ${p1.busy ? "sp-red" : "sp-green"}`;
  }
  if (spPos2) {
    const p2 = state.pos[1];
    if (!p2.open) {
      spPos2.textContent = "CLOSED";
      spPos2.className = "sp-value sp-muted";
    } else if (p2.busy) {
      spPos2.textContent = "BUSY";
      spPos2.className = "sp-value sp-red";
    } else {
      spPos2.textContent = "OPEN";
      spPos2.className = "sp-value sp-green";
    }
  }
}

function tick(now) {
  const delta = Math.min((now - state.lastFrame) / 1000, 0.1);
  state.lastFrame = now;

  if (state.running) {
    if (state.time < state.limit) {
      state.time += delta * state.speed;
    } else {
      state.running = false;
      updatePlaybackControls();
    }
    processEvents();
    processUtilityStaff(delta);
    updateMetrics();
  }
  requestAnimationFrame(tick);
}

init();
