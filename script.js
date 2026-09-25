// ---------- Persistence ----------
const STORAGE_KEY = "reflex_bests_v1";

function loadBests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveBests(bests) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bests));
  } catch (e) {
    // Storage can fail (private browsing, disabled entirely). The game
    // still works, personal bests just won't survive a reload.
  }
}

let bests = loadBests();

function refreshBestLabels() {
  const reactionBestEl = document.getElementById("reactionBest");
  const sequenceBestEl = document.getElementById("sequenceBest");
  reactionBestEl.textContent = bests.reactionBestMs
    ? `Best: ${Math.round(bests.reactionBestMs)}ms`
    : "Best: —";
  sequenceBestEl.textContent = bests.sequenceBestLength
    ? `Best: ${bests.sequenceBestLength} tiles`
    : "Best: —";
}

// ---------- Mode navigation ----------
const modeSelect = document.getElementById("modeSelect");
const reactionGame = document.getElementById("reactionGame");
const sequenceGame = document.getElementById("sequenceGame");

function showPanel(panel) {
  modeSelect.hidden = panel !== modeSelect;
  reactionGame.hidden = panel !== reactionGame;
  sequenceGame.hidden = panel !== sequenceGame;
}

document.getElementById("pickReaction").addEventListener("click", () => {
  showPanel(reactionGame);
  resetReactionGame();
});
document.getElementById("pickSequence").addEventListener("click", () => {
  showPanel(sequenceGame);
  resetSequenceGame();
});
document.getElementById("reactionBack").addEventListener("click", () => {
  clearReactionTimer();
  showPanel(modeSelect);
});
document.getElementById("sequenceBack").addEventListener("click", () => {
  clearSequenceTimers();
  showPanel(modeSelect);
});

// ================================================================
// REACTION TIME
// ================================================================
const ROUNDS_PER_GAME = 5;
const stage = document.getElementById("reactionStage");
const message = document.getElementById("reactionMessage");
const roundDotsEl = document.getElementById("reactionRoundDots");
const resultsEl = document.getElementById("reactionResults");

let reactionState = "idle"; // idle | armed | go | toosoon
let armTimer = null;
let goStartTime = null;
let roundResults = []; // array of {ms, rating} or {ms: null, rating: 'false-start'}

function clearReactionTimer() {
  if (armTimer) { clearTimeout(armTimer); armTimer = null; }
}

function resetReactionGame() {
  clearReactionTimer();
  reactionState = "idle";
  roundResults = [];
  goStartTime = null;
  resultsEl.hidden = true;
  stage.className = "reaction-stage state-waiting";
  message.textContent = "Click to start";
  renderRoundDots();
}

function renderRoundDots() {
  roundDotsEl.innerHTML = "";
  for (let i = 0; i < ROUNDS_PER_GAME; i++) {
    const dot = document.createElement("span");
    dot.className = "round-dot";
    if (i < roundResults.length) dot.classList.add("done");
    else if (i === roundResults.length) dot.classList.add("current");
    roundDotsEl.appendChild(dot);
  }
}

function armRound() {
  reactionState = "armed";
  stage.className = "reaction-stage state-armed";
  message.textContent = "Wait for green...";
  const delay = 1000 + Math.random() * 2500; // 1s to 3.5s, unpredictable on purpose
  armTimer = setTimeout(() => {
    reactionState = "go";
    goStartTime = performance.now();
    stage.className = "reaction-stage state-go";
    message.textContent = "Click!";
  }, delay);
}

function finishRound(reactionMs) {
  const classified = classifyReaction(reactionMs);
  if (!classified.valid) {
    // False start or an implausible sub-150ms click: don't count it as
    // a round, show a brief message and let them retry the same round.
    reactionState = "toosoon";
    stage.className = "reaction-stage state-toosoon";
    message.textContent = classified.rating === "false-start" ? "Too soon! Click to retry." : "Mistimed, click to retry.";
    clearReactionTimer();
    return;
  }
  roundResults.push({ ms: reactionMs, rating: classified.rating });
  renderRoundDots();

  if (roundResults.length >= ROUNDS_PER_GAME) {
    showReactionResults();
  } else {
    reactionState = "result";
    stage.className = "reaction-stage state-result";
    message.textContent = `${Math.round(reactionMs)}ms, ${classified.rating}. Click for next round.`;
  }
}

function showReactionResults() {
  const times = roundResults.map(r => r.ms);
  const summary = summarizeRounds(times);
  reactionState = "done";
  stage.className = "reaction-stage state-result";
  message.textContent = "Done! See your results below.";

  document.getElementById("resAverage").textContent = `${Math.round(summary.average)}ms`;
  document.getElementById("resBest").textContent = `${Math.round(summary.best)}ms`;
  document.getElementById("resConsistency").textContent =
    summary.consistency !== null ? `±${Math.round(summary.consistency)}ms` : "—";
  resultsEl.hidden = false;

  if (!bests.reactionBestMs || summary.best < bests.reactionBestMs) {
    bests.reactionBestMs = summary.best;
    saveBests(bests);
    refreshBestLabels();
  }
}

stage.addEventListener("click", () => {
  if (reactionState === "idle" || reactionState === "result" || reactionState === "toosoon") {
    if (reactionState === "toosoon") { clearReactionTimer(); }
    armRound();
    return;
  }
  if (reactionState === "armed") {
    clearReactionTimer();
    finishRound(null); // false start
    return;
  }
  if (reactionState === "go") {
    const reactionMs = performance.now() - goStartTime;
    finishRound(reactionMs);
    return;
  }
});

document.getElementById("reactionRetry").addEventListener("click", resetReactionGame);

// ================================================================
// SEQUENCE MEMORY
// ================================================================
const TILE_COUNT = 4;
const tileGrid = document.getElementById("tileGrid");
const roundLabel = document.getElementById("sequenceRoundLabel");
const stateLabel = document.getElementById("sequenceStateLabel");
const sequenceResultsEl = document.getElementById("sequenceResults");

let sequence = [];
let playerInput = [];
let sequenceState = "idle"; // showing | input | gameover
let showTimers = [];

function clearSequenceTimers() {
  showTimers.forEach(t => clearTimeout(t));
  showTimers = [];
}

function buildTileGrid() {
  tileGrid.innerHTML = "";
  for (let i = 0; i < TILE_COUNT; i++) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.dataset.idx = String(i);
    tile.addEventListener("click", () => onTileClick(i));
    tileGrid.appendChild(tile);
  }
}

function resetSequenceGame() {
  clearSequenceTimers();
  sequence = [];
  playerInput = [];
  sequenceResultsEl.hidden = true;
  buildTileGrid();
  nextSequenceRound();
}

function nextSequenceRound() {
  sequence = extendSequence(sequence, TILE_COUNT);
  playerInput = [];
  roundLabel.textContent = `Round ${sequence.length}`;
  playSequence();
}

function playSequence() {
  sequenceState = "showing";
  stateLabel.textContent = "Watch closely";
  const tiles = tileGrid.querySelectorAll(".tile");
  clearSequenceTimers();

  sequence.forEach((tileIdx, step) => {
    const litTimer = setTimeout(() => {
      tiles[tileIdx].classList.add("lit");
      const unlitTimer = setTimeout(() => {
        tiles[tileIdx].classList.remove("lit");
        if (step === sequence.length - 1) {
          sequenceState = "input";
          stateLabel.textContent = "Your turn";
        }
      }, 350);
      showTimers.push(unlitTimer);
    }, step * 600 + 400);
    showTimers.push(litTimer);
  });
}

function onTileClick(idx) {
  if (sequenceState !== "input") return;

  playerInput.push(idx);
  const tiles = tileGrid.querySelectorAll(".tile");
  tiles[idx].classList.add("lit");
  setTimeout(() => tiles[idx].classList.remove("lit"), 200);

  const progress = checkSequenceProgress(sequence, playerInput);
  if (progress.status === "wrong") {
    tiles[idx].classList.add("wrong");
    setTimeout(() => tiles[idx].classList.remove("wrong"), 400);
    endSequenceGame();
  } else if (progress.status === "complete") {
    sequenceState = "between-rounds";
    stateLabel.textContent = "Nice! Next round...";
    const t = setTimeout(nextSequenceRound, 900);
    showTimers.push(t);
  }
}

function endSequenceGame() {
  sequenceState = "gameover";
  stateLabel.textContent = "Game over";
  const reached = sequence.length - 1; // last fully-completed length
  document.getElementById("seqReached").textContent = String(Math.max(0, reached));
  sequenceResultsEl.hidden = false;

  if (!bests.sequenceBestLength || reached > bests.sequenceBestLength) {
    bests.sequenceBestLength = Math.max(0, reached);
    saveBests(bests);
    refreshBestLabels();
  }
}

document.getElementById("sequenceRetry").addEventListener("click", resetSequenceGame);

// ---------- Init ----------
refreshBestLabels();
