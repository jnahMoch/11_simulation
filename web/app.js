const store = document.querySelector("#store");
const introScreen = document.querySelector("#intro-screen");
const appShell = document.querySelector("#app-shell");
const startButton = document.querySelector("#start-simulation");
const customersLayer = document.querySelector("#customers");
const entryDoor = document.querySelector(".entry");
const logEl = document.querySelector("#event-log");
const simTimeEl = document.querySelector("#sim-time");
const toggleButton = document.querySelector("#toggle-run");
const resetButton = document.querySelector("#reset");
const rushButton = document.querySelector("#rush");
const arrivalRateInput = document.querySelector("#arrival-rate");
const openThresholdInput = document.querySelector("#open-threshold");
const waitThresholdInput = document.querySelector("#wait-threshold");
const speedInput = document.querySelector("#speed");

const metrics = {
  q1: document.querySelector("#metric-q1"),
  q2: document.querySelector("#metric-q2"),
  wait: document.querySelector("#metric-wait"),
  served: document.querySelector("#metric-served"),
  upset: document.querySelector("#metric-upset"),
  pos2Opened: document.querySelector("#metric-pos2"),
  pos1Status: document.querySelector("#pos1-status"),
  pos2Status: document.querySelector("#pos2-status"),
  pos1Panel: document.querySelector("#pos1"),
  pos2Panel: document.querySelector("#pos2"),
  pos2Img: document.querySelector("#pos2-img"),
  floatingStaff: document.querySelector("#floating-staff"),
  floatingStaffImg: document.querySelector("#floating-staff-img"),
};

const points = {
  entrance: { x: 492, y: 626 },
  shelfA: { x: 194, y: 344 },
  shelfB: { x: 388, y: 344 },
  shelfC: { x: 194, y: 498 },
  shelfD: { x: 388, y: 498 },
  fridgeA: { x: 132, y: 194 },
  fridgeB: { x: 364, y: 194 },
  exit: { x: 492, y: 626 },
  service1: { x: 744, y: 394 },
  service2: { x: 744, y: 550 },
  queue1: [
    { x: 590, y: 354 },
    { x: 550, y: 354 },
    { x: 510, y: 354 },
    { x: 470, y: 354 },
    { x: 430, y: 354 },
    { x: 390, y: 354 },
    { x: 350, y: 354 },
  ],
  queue2: [
    { x: 590, y: 510 },
    { x: 550, y: 510 },
    { x: 510, y: 510 },
    { x: 470, y: 510 },
    { x: 430, y: 510 },
    { x: 390, y: 510 },
    { x: 350, y: 510 },
  ],
};

const shoppingTargets = [
  { key: "shelfA", label: "snacks" },
  { key: "shelfB", label: "meals" },
  { key: "shelfC", label: "pantry" },
  { key: "shelfD", label: "offers" },
  { key: "fridgeA", label: "cold food" },
  { key: "fridgeB", label: "fridge" },
];

const customerSprites = {
  1: {
    front: "customer1C1.png",
    back: "customer1C2.png",
    carryingFront: "customer1C1.png",
    carryingBack: "customer1C2.png",
    bagFront: "customer1Bag1.png",
    bagBack: "customer1Bag3.png",
  },
  2: {
    front: "customer2C1.png",
    back: "customer2C2.png",
    carryingFront: "customer2C1.png",
    carryingBack: "customer2C2.png",
    bagFront: "customer2Bag1.png",
    bagBack: "customer2Bag2.png",
  },
};

const restockFrames = ["getbox1.png", "getbox2.png", "getbox3.png", "restock1.png"];

const state = {
  running: false,
  started: false,
  time: 0,
  lastFrame: performance.now(),
  nextCustomerId: 1,
  events: [],
  customers: new Map(),
  queues: [[], []],
  pos: [
    { open: true, busy: false, busyUntil: 0, current: null, busyTotal: 0 },
    { open: false, opening: false, busy: false, busyUntil: 0, current: null, busyTotal: 0, openedAt: null },
  ],
  totalWait: 0,
  served: 0,
  upset: 0,
};

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function schedule(delay, type, payload = {}) {
  state.events.push({ at: state.time + delay, type, payload });
  state.events.sort((a, b) => a.at - b.at);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function addLog(text) {
  const item = document.createElement("li");
  item.textContent = `${formatTime(state.time)}  ${text}`;
  logEl.prepend(item);

  while (logEl.children.length > 42) {
    logEl.lastElementChild.remove();
  }
}

function createCustomer() {
  const id = state.nextCustomerId++;
  const el = document.createElement("div");
  el.className = "customer";
  const variant = ((id - 1) % Object.keys(customerSprites).length) + 1;
  const spriteSet = customerSprites[variant];
  el.innerHTML = `<img class="customer-img" src="img/customer/${spriteSet.front}" alt="" /><span class="mood">:)</span>`;
  customersLayer.appendChild(el);

  const customer = {
    id,
    el,
    spriteSet,
    walkTimer: null,
    facing: "front",
    spriteState: "normal",
    position: null,
    queueJoinedAt: null,
    mood: "happy",
    status: "arriving",
    itemTarget: shoppingTargets[randomBetween(0, shoppingTargets.length - 1)],
  };

  state.customers.set(id, customer);
  moveCustomer(customer, points.entrance);
  return customer;
}

function setCustomerFacing(customer, direction) {
  const img = customer.el.querySelector(".customer-img");
  const spriteKey = {
    normal: direction === "back" ? "back" : "front",
    carrying: direction === "back" ? "carryingBack" : "carryingFront",
    bag: direction === "back" ? "bagBack" : "bagFront",
  }[customer.spriteState];

  img.src = `img/customer/${customer.spriteSet[spriteKey]}`;
  customer.facing = direction;
}

function setCustomerSpriteState(customer, spriteState) {
  customer.spriteState = spriteState;
  setCustomerFacing(customer, customer.facing);
}

function moveCustomer(customer, point, direction = "front") {
  const isSamePosition = customer.position?.x === point.x && customer.position?.y === point.y;
  const isSameFacing = customer.facing === direction;

  if (isSamePosition && isSameFacing) return;

  setCustomerFacing(customer, direction);
  customer.position = point;

  if (!isSamePosition) {
    customer.el.classList.add("walking");
    window.clearTimeout(customer.walkTimer);
    customer.walkTimer = window.setTimeout(() => {
      customer.el.classList.remove("walking");
    }, 1900);
  }

  customer.el.style.left = `${point.x}px`;
  customer.el.style.top = `${point.y}px`;
}

function animateDoor() {
  entryDoor.classList.add("door-open");
  window.clearTimeout(animateDoor.timer);
  animateDoor.timer = window.setTimeout(() => {
    entryDoor.classList.remove("door-open");
  }, 900);
}

function updateMood(customer) {
  if (!customer.queueJoinedAt) return;

  const waitMinutes = (state.time - customer.queueJoinedAt) / 60;
  const moodEl = customer.el.querySelector(".mood");

  if (waitMinutes >= 6) {
    customer.mood = "upset";
    moodEl.textContent = "!";
    customer.el.classList.add("upset");
  } else if (waitMinutes >= 3) {
    customer.mood = "neutral";
    moodEl.textContent = ":|";
  } else {
    customer.mood = "happy";
    moodEl.textContent = ":)";
  }
}

function repositionQueues() {
  state.queues.forEach((queue, queueIndex) => {
    queue.forEach((id, index) => {
      const customer = state.customers.get(id);
      if (!customer) return;

      const slots = queueIndex === 0 ? points.queue1 : points.queue2;
      const point = slots[Math.min(index, slots.length - 1)];
      moveCustomer(customer, point);
      customer.el.classList.add("waiting");
      updateMood(customer);
    });
  });
}

function getArrivalDelay() {
  const base = Number(arrivalRateInput.value);
  return randomBetween(base * 0.45, base * 0.95);
}

function handleArrival() {
  const customer = createCustomer();
  addLog(`Customer ${customer.id} arrived.`);
  schedule(7, "enter-store", { id: customer.id });
  schedule(getArrivalDelay(), "arrival");
}

function handleEnterStore({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;

  animateDoor();
  customer.status = "shopping";
  moveCustomer(customer, points[customer.itemTarget.key], "back");
  addLog(`Customer ${id} entered and went to ${customer.itemTarget.label}.`);
  schedule(randomBetween(30, 120), "join-queue", { id });
}

function handleJoinQueue({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;

  const queueIndex = chooseQueue();
  customer.status = "queued";
  setCustomerSpriteState(customer, "carrying");
  customer.queueJoinedAt = state.time;
  state.queues[queueIndex].push(id);
  addLog(`Customer ${id} joined Queue ${queueIndex + 1}.`);
  repositionQueues();
  evaluatePos2();
  tryStartService();
}

function chooseQueue() {
  if (!state.pos[1].open) return 0;
  return state.queues[0].length <= state.queues[1].length ? 0 : 1;
}

function tryStartService() {
  state.pos.forEach((pos, index) => {
    if (!pos.open || pos.busy || state.queues[index].length === 0) return;

    const id = state.queues[index].shift();
    const customer = state.customers.get(id);
    if (!customer) return;

    const wait = state.time - customer.queueJoinedAt;
    state.totalWait += wait;
    if (customer.mood === "upset") state.upset += 1;

    pos.busy = true;
    pos.current = id;
    const serviceTime = randomBetween(60, 180);
    pos.busyUntil = state.time + serviceTime;
    pos.busyTotal += serviceTime;

    customer.status = "paying";
    customer.el.classList.remove("waiting");
    moveCustomer(customer, index === 0 ? points.service1 : points.service2, "front");
    addLog(`POS ${index + 1} started Customer ${id}.`);
    updateStaffAndPos();
    schedule(serviceTime, "service-complete", { id, posIndex: index });
    repositionQueues();
  });
}

function handleServiceComplete({ id, posIndex }) {
  const pos = state.pos[posIndex];
  const customer = state.customers.get(id);

  pos.busy = false;
  pos.current = null;
  updateStaffAndPos();

  if (customer) {
    state.served += 1;
    customer.status = "exiting";
    setCustomerSpriteState(customer, "bag");
    animateDoor();
    moveCustomer(customer, points.exit, "back");
    addLog(`Customer ${id} paid and exited.`);
    schedule(24, "remove-customer", { id });
  }

  evaluatePos2();
  tryStartService();
}

function handleRemoveCustomer({ id }) {
  const customer = state.customers.get(id);
  if (!customer) return;
  window.clearTimeout(customer.walkTimer);
  customer.el.remove();
  state.customers.delete(id);
}

function averageWaitingMinutes() {
  if (state.served === 0) return 0;
  return state.totalWait / state.served / 60;
}

function longestCurrentWaitMinutes() {
  const ids = [...state.queues[0], ...state.queues[1]];
  if (ids.length === 0) return 0;
  return Math.max(
    ...ids.map((id) => {
      const customer = state.customers.get(id);
      return customer?.queueJoinedAt ? (state.time - customer.queueJoinedAt) / 60 : 0;
    }),
  );
}

function averageQueueWaitMinutes(queueIndex = 0) {
  const queue = state.queues[queueIndex];
  if (queue.length === 0) return 0;

  const totalWait = queue.reduce((sum, id) => {
    const customer = state.customers.get(id);
    return sum + (customer?.queueJoinedAt ? state.time - customer.queueJoinedAt : 0);
  }, 0);

  return totalWait / queue.length / 60;
}

function evaluatePos2() {
  const queue1Length = state.queues[0].length;
  const totalQueue = queue1Length + state.queues[1].length;
  const openThreshold = Number(openThresholdInput.value);
  const waitThreshold = Number(waitThresholdInput.value);
  const queue1AverageWait = averageQueueWaitMinutes(0);

  if (!state.pos[1].open && !state.pos[1].opening && (queue1Length >= openThreshold || queue1AverageWait >= waitThreshold)) {
    state.pos[1].opening = true;
    addLog(`Restocking staff is walking to POS 2 because Queue 1 has ${queue1Length} waiting.`);
    updateStaffAndPos();
    schedule(18, "open-pos2");
  }

  if (
    state.pos[1].open &&
    !state.pos[1].busy &&
    totalQueue <= 2 &&
    averageQueueWaitMinutes(0) < 1 &&
    state.time - state.pos[1].openedAt > 120
  ) {
    state.pos[1].open = false;
    state.pos[1].opening = false;
    addLog("POS 2 closed after queue recovered.");
    redistributeQueues();
  }
}

function handleOpenPos2() {
  const pos = state.pos[1];
  if (!pos.opening) return;

  pos.opening = false;
  pos.open = true;
  pos.openedAt = state.time;
  addLog("Staff arrived and opened POS 2.");
  redistributeQueues();
}

function redistributeQueues() {
  if (!state.pos[1].open) {
    state.queues[0].push(...state.queues[1]);
    state.queues[1] = [];
  } else {
    const allWaiting = [...state.queues[0], ...state.queues[1]];
    state.queues = [[], []];
    allWaiting.forEach((id, index) => state.queues[index % 2].push(id));
  }

  repositionQueues();
  tryStartService();
}

function processEvents() {
  while (state.events.length && state.events[0].at <= state.time) {
    const event = state.events.shift();
    const previousTime = state.time;
    state.time = event.at;

    const handlers = {
      arrival: handleArrival,
      "enter-store": handleEnterStore,
      "join-queue": handleJoinQueue,
      "open-pos2": handleOpenPos2,
      "service-complete": handleServiceComplete,
      "remove-customer": handleRemoveCustomer,
    };

    handlers[event.type]?.(event.payload);
    state.time = Math.max(state.time, previousTime);
  }
}

function updateMetrics() {
  simTimeEl.textContent = formatTime(state.time);
  metrics.q1.textContent = String(state.queues[0].length);
  metrics.q2.textContent = String(state.queues[1].length);
  metrics.wait.textContent = `${averageWaitingMinutes().toFixed(1)}m`;
  metrics.served.textContent = String(state.served);
  metrics.upset.textContent = String(state.upset);
  metrics.pos2Opened.textContent = state.pos[1].openedAt === null ? "Never" : formatTime(state.pos[1].openedAt);
  metrics.pos1Status.textContent = "OPEN";
  metrics.pos2Status.textContent = state.pos[1].open ? "OPEN" : state.pos[1].opening ? "OPENING" : "CLOSED";
  updateStaffAndPos();

  state.customers.forEach(updateMood);
}

function updateStaffAndPos() {
  const pos2Active = state.pos[1].open || state.pos[1].opening;
  const restockFrame = restockFrames[Math.floor(state.time / 2) % restockFrames.length];

  metrics.pos1Panel.classList.toggle("serving", state.pos[0].busy);
  metrics.pos2Panel.classList.toggle("open", state.pos[1].open);
  metrics.pos2Panel.classList.toggle("opening", state.pos[1].opening);
  metrics.pos2Panel.classList.toggle("serving", state.pos[1].busy);
  metrics.floatingStaff.classList.toggle("opening-pos2", pos2Active);
  metrics.floatingStaff.classList.toggle("at-pos2", state.pos[1].open);
  metrics.pos2Img.src = state.pos[1].open ? "img/staff/cashier2.png" : "img/staff/pos2.png";
  metrics.floatingStaffImg.src = `img/staff/${restockFrame}`;
}

function tick(now) {
  const delta = Math.min((now - state.lastFrame) / 1000, 0.3);
  state.lastFrame = now;

  if (state.running) {
    state.time += delta * Number(speedInput.value);
    processEvents();
    evaluatePos2();
    tryStartService();
    repositionQueues();
    updateMetrics();
  }

  requestAnimationFrame(tick);
}

function resetSimulation() {
  customersLayer.replaceChildren();
  logEl.replaceChildren();
  Object.assign(state, {
    running: true,
    started: true,
    time: 0,
    lastFrame: performance.now(),
    nextCustomerId: 1,
    events: [],
    customers: new Map(),
    queues: [[], []],
    pos: [
      { open: true, busy: false, busyUntil: 0, current: null, busyTotal: 0 },
      { open: false, opening: false, busy: false, busyUntil: 0, current: null, busyTotal: 0, openedAt: null },
    ],
    totalWait: 0,
    served: 0,
    upset: 0,
  });
  toggleButton.textContent = "Pause";
  schedule(1, "arrival");
  schedule(getArrivalDelay(), "arrival");
  addLog("Simulation started.");
  updateMetrics();
}

function startSimulation() {
  introScreen.classList.add("is-hidden");
  appShell.classList.remove("app-hidden");
  document.body.classList.remove("intro-active");
  resetSimulation();
}

document.body.classList.add("intro-active");
startButton.addEventListener("click", startSimulation);

toggleButton.addEventListener("click", () => {
  if (!state.started) return;
  state.running = !state.running;
  toggleButton.textContent = state.running ? "Pause" : "Play";
});

resetButton.addEventListener("click", resetSimulation);

rushButton.addEventListener("click", () => {
  for (let i = 0; i < 6; i += 1) {
    schedule(i * 4, "arrival");
  }
  addLog("Rush wave scheduled.");
});

requestAnimationFrame(tick);
