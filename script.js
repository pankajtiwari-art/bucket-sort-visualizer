// -------------------- GLOBALS --------------------
let arrayData = [];          // main array values (0-99)
let buckets = [];           // 2D array: 10 buckets
const BUCKET_COUNT = 10;
let isSortingActive = false;
let stopRequested = false;
let animationDelay = 120;    // ms per atomic operation
let audioCtx = null;
let audioEnabled = true;

// DOM elements
const canvas = document.getElementById('arrayCanvas');
const ctx = canvas.getContext('2d');
const bucketsDiv = document.getElementById('bucketsContainer');
const sizeSlider = document.getElementById('arraySizeSlider');
const sizeValSpan = document.getElementById('sizeValue');
const speedSlider = document.getElementById('speedSlider');
const speedSpan = document.getElementById('speedValue');
const randomizeBtn = document.getElementById('randomizeBtn');
const startBtn = document.getElementById('startSortBtn');
const stopBtn = document.getElementById('stopSortBtn');
const phaseSpan = document.getElementById('phaseText');
const infoMsg = document.getElementById('infoMessage');

// Helper: sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// -------------------- AUDIO ENGINE (gentle beep) --------------------
async function initAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    return audioCtx;
  } catch(e) { console.warn("audio error", e); return null; }
}

function playBeep(freq = 680, duration = 0.08, volume = 0.25) {
  if (!audioEnabled) return;
  if (!audioCtx || audioCtx.state !== 'running') {
    // try silent init on demand
    initAudio().then(ctx => {
      if (ctx && ctx.state === 'running') playBeepInternal(freq, duration, volume);
    });
    return;
  }
  playBeepInternal(freq, duration, volume);
}

function playBeepInternal(freq, duration, volume) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
  osc.stop(now + duration);
}

// ensure audio context on first user interaction (any button)
function enableAudioOnUserGesture() {
  if (audioCtx && audioCtx.state === 'running') return;
  initAudio().then(ctx => {
    if (ctx) ctx.resume();
  });
}
// bind user gesture
const gestureElements = [randomizeBtn, startBtn, stopBtn, sizeSlider, speedSlider];
gestureElements.forEach(el => el.addEventListener('click', enableAudioOnUserGesture, { once: false }));
gestureElements.forEach(el => el.addEventListener('mousedown', enableAudioOnUserGesture));

// -------------------- RENDER MAIN ARRAY (canvas bars) --------------------
function renderArray() {
  if (!canvas || !ctx) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  if (!arrayData.length) return;
  const barWidth = Math.max(2, (w / arrayData.length) * 0.7);
  const spacing = 4;
  const effectiveWidth = Math.min(barWidth, (w - arrayData.length * spacing) / arrayData.length);
  const startX = (w - (arrayData.length * (effectiveWidth + spacing))) / 2;
  for (let i = 0; i < arrayData.length; i++) {
    const val = arrayData[i];
    const barHeight = (val / 100) * (h - 30);
    const x = startX + i * (effectiveWidth + spacing);
    const y = h - barHeight - 10;
    ctx.fillStyle = `hsl(${210 - val * 0.8}, 70%, 60%)`;
    ctx.fillRect(x, y, effectiveWidth, barHeight);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px "Fira Code"';
    ctx.shadowBlur = 0;
    ctx.fillText(val, x + 4, y - 4);
  }
}

// -------------------- RENDER BUCKETS (detailed cards) --------------------
function renderBuckets(highlightBucketIdx = null, highlightItemIndices = null) {
  if (!bucketsDiv) return;
  bucketsDiv.innerHTML = '';
  for (let b = 0; b < BUCKET_COUNT; b++) {
    const bucket = buckets[b] || [];
    const card = document.createElement('div');
    card.className = 'bucket-card';
    if (highlightBucketIdx === b) card.style.border = '2px solid #f5a623';
    const header = document.createElement('div');
    header.className = 'bucket-header';
    header.innerHTML = `🔹 BUCKET ${b}  <span style="font-size:0.7rem;">(${bucket.length})</span>`;
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'bucket-items';
    bucket.forEach((item, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'bucket-item';
      itemEl.innerText = item;
      if (highlightBucketIdx === b && highlightItemIndices && highlightItemIndices.includes(idx)) {
        itemEl.classList.add('highlight-item');
      }
      itemsDiv.appendChild(itemEl);
    });
    card.appendChild(header);
    card.appendChild(itemsDiv);
    bucketsDiv.appendChild(card);
  }
}

// update full UI (array + buckets)
function fullRender(highlightBucket = null, highlightItemPos = null) {
  renderArray();
  renderBuckets(highlightBucket, highlightItemPos);
}

// -------------------- UTILITIES --------------------
function generateRandomArray(size) {
  const arr = [];
  for (let i = 0; i < size; i++) {
    arr.push(Math.floor(Math.random() * 100)); // 0-99
  }
  return arr;
}

function resetState(resetArray = true) {
  if (isSortingActive) {
    stopRequested = true;
    isSortingActive = false;
  }
  const size = parseInt(sizeSlider.value);
  if (resetArray) {
    arrayData = generateRandomArray(size);
  }
  // reset buckets empty
  buckets = Array(BUCKET_COUNT).fill().map(() => []);
  fullRender();
  phaseSpan.innerText = '⚡ idle';
  infoMsg.innerHTML = '✅ Ready. Press START to run bucket sort with audio feedback.';
  stopRequested = false;
}

// -------------------- CORE SORT PHASES (async with animation & audio) --------------------
// Phase 1: DISTRIBUTION
async function distributionPhase() {
  phaseSpan.innerText = '📤 DISTRIBUTION: moving elements to buckets';
  infoMsg.innerHTML = '🎯 Distributing each element into correct bucket based on tens digit ...';
  for (let i = 0; i < arrayData.length; i++) {
    if (stopRequested) return false;
    const val = arrayData[i];
    const bucketIdx = Math.min(Math.floor(val / 10), 9);
    renderArray();
    fullRender(bucketIdx, null);
    await sleep(animationDelay * 0.7);
    buckets[bucketIdx].push(val);
    playBeep(520, 0.07, 0.2);
    fullRender(bucketIdx, null);
    await sleep(animationDelay * 0.5);
  }
  fullRender();
  await sleep(animationDelay);
  return true;
}

// Phase 2: SORT EACH BUCKET
async function sortBucketsPhase() {
  phaseSpan.innerText = '🔄 SORTING BUCKETS (insertion sort)';
  for (let b = 0; b < BUCKET_COUNT; b++) {
    if (stopRequested) return false;
    const bucketArr = buckets[b];
    if (bucketArr.length <= 1) continue;
    infoMsg.innerHTML = `🔁 Sorting Bucket ${b} (${bucketArr.length} items) with insertion sort ...`;
    for (let i = 1; i < bucketArr.length; i++) {
      if (stopRequested) return false;
      let key = bucketArr[i];
      let j = i - 1;
      fullRender(b, [i]);
      playBeep(660, 0.05, 0.18);
      await sleep(animationDelay);
      while (j >= 0 && bucketArr[j] > key) {
        if (stopRequested) return false;
        bucketArr[j + 1] = bucketArr[j];
        fullRender(b, [j, j+1]);
        playBeep(880, 0.06, 0.22);
        await sleep(animationDelay);
        j--;
      }
      bucketArr[j + 1] = key;
      fullRender(b, [j+1]);
      playBeep(540, 0.06, 0.2);
      await sleep(animationDelay * 0.8);
    }
    fullRender(b, null);
    await sleep(animationDelay);
  }
  infoMsg.innerHTML = `✅ All buckets sorted internally!`;
  fullRender();
  await sleep(animationDelay);
  return true;
}

// Phase 3: GATHERING
async function gatherPhase() {
  phaseSpan.innerText = '📥 GATHERING: merging buckets into main array';
  infoMsg.innerHTML = '📦 Collecting elements from bucket 0 → 9 back to array ...';
  const newSortedArray = [];
  for (let b = 0; b < BUCKET_COUNT; b++) {
    if (stopRequested) return false;
    const bucketArr = buckets[b];
    for (let idx = 0; idx < bucketArr.length; idx++) {
      if (stopRequested) return false;
      const val = bucketArr[idx];
      newSortedArray.push(val);
      arrayData = [...newSortedArray];
      buckets[b] = bucketArr.slice(idx + 1);
      fullRender(b, [0]);
      playBeep(460, 0.08, 0.23);
      await sleep(animationDelay);
      fullRender(b, null);
      await sleep(animationDelay * 0.4);
    }
    buckets[b] = []; 
    fullRender(b, null);
    await sleep(animationDelay);
  }
  arrayData = newSortedArray;
  buckets = Array(BUCKET_COUNT).fill().map(() => []);
  fullRender();
  return true;
}

// MASTER SORT FUNCTION
async function runBucketSort() {
  if (isSortingActive) {
    infoMsg.innerHTML = '⚠️ Sorting already running! Press STOP first.';
    return;
  }
  stopRequested = false;
  isSortingActive = true;
  await initAudio();
  if (audioCtx && audioCtx.state !== 'running') await audioCtx.resume();

  buckets = Array(BUCKET_COUNT).fill().map(() => []);
  fullRender();
  await sleep(100);

  const distOk = await distributionPhase();
  if (stopRequested || !distOk) {
    resetState(false);
    isSortingActive = false;
    phaseSpan.innerText = '⛔ STOPPED';
    infoMsg.innerHTML = 'Sorting interrupted.';
    return;
  }

  const sortOk = await sortBucketsPhase();
  if (stopRequested || !sortOk) {
    resetState(false);
    isSortingActive = false;
    return;
  }

  const gatherOk = await gatherPhase();
  if (stopRequested || !gatherOk) {
    resetState(false);
    isSortingActive = false;
    return;
  }

  fullRender();
  phaseSpan.innerText = '✅ SORTED!';
  infoMsg.innerHTML = '🎉 Bucket Sort Completed! Array fully sorted. Click RANDOM for new data.';
  playBeep(880, 0.25, 0.35);
  isSortingActive = false;
  stopRequested = false;
}

// handle stop
function stopSort() {
  if (isSortingActive) {
    stopRequested = true;
    isSortingActive = false;
    phaseSpan.innerText = '⏸️ STOPPED';
    infoMsg.innerHTML = 'Sorting halted. You can randomize or start again.';
    playBeep(320, 0.12, 0.2);
  } else {
    infoMsg.innerHTML = 'No sort running. Press START.';
  }
}

// change array size & reset
function resizeArray() {
  if (isSortingActive) stopSort();
  const newSize = parseInt(sizeSlider.value);
  sizeValSpan.innerText = newSize;
  arrayData = generateRandomArray(newSize);
  buckets = Array(BUCKET_COUNT).fill().map(() => []);
  fullRender();
  phaseSpan.innerText = '⚡ idle';
  infoMsg.innerHTML = `Array size = ${newSize}. Ready for bucket sort.`;
}

// randomize without sorting
function randomizeArray() {
  if (isSortingActive) stopSort();
  const size = parseInt(sizeSlider.value);
  arrayData = generateRandomArray(size);
  buckets = Array(BUCKET_COUNT).fill().map(() => []);
  fullRender();
  phaseSpan.innerText = '🎲 random array';
  infoMsg.innerHTML = 'New random array generated.';
  playBeep(480, 0.07, 0.15);
}

// speed slider
function updateSpeed() {
  animationDelay = parseInt(speedSlider.value);
  speedSpan.innerText = animationDelay;
}

// -------------------- EVENT LISTENERS + INIT --------------------
randomizeBtn.addEventListener('click', () => { randomizeArray(); });
startBtn.addEventListener('click', () => {
  if (isSortingActive) {
    infoMsg.innerHTML = 'Sort already in progress!';
    return;
  }
  runBucketSort();
});
stopBtn.addEventListener('click', stopSort);
sizeSlider.addEventListener('input', (e) => {
  sizeValSpan.innerText = e.target.value;
  if (!isSortingActive) {
    const newSize = parseInt(e.target.value);
    arrayData = generateRandomArray(newSize);
    buckets = Array(BUCKET_COUNT).fill().map(() => []);
    fullRender();
  } else {
    infoMsg.innerHTML = 'Stop sorting before changing size!';
  }
});
speedSlider.addEventListener('input', (e) => {
  animationDelay = parseInt(e.target.value);
  speedSpan.innerText = animationDelay;
});

// resize canvas observer
window.addEventListener('resize', () => renderArray());
// initial setup
function init() {
  animationDelay = parseInt(speedSlider.value);
  speedSpan.innerText = animationDelay;
  const initSize = parseInt(sizeSlider.value);
  arrayData = generateRandomArray(initSize);
  buckets = Array(BUCKET_COUNT).fill().map(() => []);
  fullRender();
  phaseSpan.innerText = '⚡ ready';
}
init();
