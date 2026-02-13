const ASSET_BASE = "../assets/whack-a-mole";

const CHARACTERS = [
  "canon",
  "eggplant",
  "eve",
  "kris",
  "mei",
  "onion",
  "potato",
  "tomato",
];

const GAME_DURATION = 30;
const HIT_ANIMATION_MS = 200;
const HINT_KEY_ACTIVE_MS = 140;
const KEYBOARD_GLOBAL_COOLDOWN_MS = 55;
const KEYBOARD_PER_HOLE_COOLDOWN_MS = 90;
const KEYBOARD_HAMMER_VISIBLE_MS = 180;
const TOUCH_HAMMER_VISIBLE_MS = 220;
const DIFFICULTY_PRESETS = {
  easy: { label: "Easy", moleMinTime: 750, moleMaxTime: 1300, spawnInterval: 900 },
  normal: { label: "Normal", moleMinTime: 450, moleMaxTime: 1000, spawnInterval: 620 },
  hard: { label: "Hard", moleMinTime: 260, moleMaxTime: 700, spawnInterval: 420 },
};
const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

const HOLE_POSITIONS = [
  { x: 20.9, y: 28.5, w: 20, h: 34 },
  { x: 12.2, y: 79.8, w: 19, h: 33 },
  { x: 34.2, y: 67.9, w: 20, h: 34 },
  { x: 56.7, y: 37.2, w: 20, h: 34 },
  { x: 87.2, y: 29.6, w: 20, h: 34 },
  { x: 72.2, y: 79.3, w: 20, h: 34 },
];

const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const difficultyEl = document.getElementById("difficulty");
const boardEl = document.getElementById("board");
const hammerAsset = `${ASSET_BASE}/nene_punch.png`;

const bestStorageKey = "whack-a-mole-best";

let score = 0;
let timeLeft = GAME_DURATION;
let running = false;
let currentHole = null;
let clockTimer = null;
let spawnTimer = null;
let hideTimer = null;
let spawnIdCounter = 0;
let activeDifficulty = DIFFICULTY_PRESETS.normal;
let assetsReady = false;
let assetsLoading = false;
let preloadPromise = null;
const hintFlashTimers = new Map();
const holeShortcutTimestamps = new Map();
let lastKeyboardShortcutAt = 0;
let hammerEl = null;
let hammerSwingTimer = null;
let hammerKeyboardHideTimer = null;
let hammerTouchHideTimer = null;
let pointerOverBoard = false;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickCharacter() {
  return CHARACTERS[rand(0, CHARACTERS.length - 1)];
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("good", "danger");
  if (type) {
    statusEl.classList.add(type);
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  timeEl.textContent = String(timeLeft);
}

function getBestScore() {
  return Number(localStorage.getItem(bestStorageKey) || 0);
}

function setBestScore(value) {
  localStorage.setItem(bestStorageKey, String(value));
  bestEl.textContent = String(value);
}

function getSelectedDifficulty() {
  const selectedKey = difficultyEl?.value || "normal";
  return DIFFICULTY_PRESETS[selectedKey] || DIFFICULTY_PRESETS.normal;
}

function getAllGameAssetPaths() {
  const paths = [`${ASSET_BASE}/background_with_hole.png`, hammerAsset];

  for (const character of CHARACTERS) {
    paths.push(`${ASSET_BASE}/totem_${character}.png`);
    paths.push(`${ASSET_BASE}/totem_${character}_hit.png`);
  }

  return paths;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
}

function ensureHammerElement() {
  if (hammerEl) {
    return hammerEl;
  }

  hammerEl = document.createElement("img");
  hammerEl.className = "hammer";
  hammerEl.src = hammerAsset;
  hammerEl.alt = "";
  hammerEl.setAttribute("aria-hidden", "true");
  boardEl.appendChild(hammerEl);
  return hammerEl;
}

function setHammerPositionFromEvent(event) {
  if (!hammerEl) {
    return;
  }

  const rect = boardEl.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  hammerEl.style.left = `${x}px`;
  hammerEl.style.top = `${y}px`;
}

function setHammerPosition(x, y) {
  if (!hammerEl) {
    return;
  }

  hammerEl.style.left = `${x}px`;
  hammerEl.style.top = `${y}px`;
}

function swingHammer() {
  if (!hammerEl) {
    return;
  }

  hammerEl.classList.add("swing");
  clearTimeout(hammerSwingTimer);
  hammerSwingTimer = window.setTimeout(() => {
    hammerEl.classList.remove("swing");
  }, 90);
}

function swingHammerAtHole(holeNumber) {
  ensureHammerElement();

  const button = boardEl.querySelector(`.mole-btn[data-hole-number="${holeNumber}"]`);
  if (!button) {
    return;
  }

  const boardRect = boardEl.getBoundingClientRect();
  const targetRect = button.getBoundingClientRect();
  const x = targetRect.left - boardRect.left + targetRect.width * 0.52;
  const y = targetRect.top - boardRect.top + targetRect.height * 0.45;

  setHammerPosition(x, y);
  boardEl.classList.add("show-hammer");
  swingHammer();

  clearTimeout(hammerKeyboardHideTimer);
  hammerKeyboardHideTimer = window.setTimeout(() => {
    if (!pointerOverBoard) {
      boardEl.classList.remove("show-hammer");
    }
  }, KEYBOARD_HAMMER_VISIBLE_MS);
}

function setupHammerControls() {
  ensureHammerElement();

  boardEl.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    pointerOverBoard = true;
    clearTimeout(hammerKeyboardHideTimer);
    boardEl.classList.add("show-hammer");
    setHammerPositionFromEvent(event);
  });

  boardEl.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    pointerOverBoard = true;
    clearTimeout(hammerKeyboardHideTimer);
    boardEl.classList.add("show-hammer");
    setHammerPositionFromEvent(event);
  });

  boardEl.addEventListener("pointerleave", () => {
    pointerOverBoard = false;
    boardEl.classList.remove("show-hammer");
    if (hammerEl) {
      hammerEl.classList.remove("swing");
    }
  });

  boardEl.addEventListener("pointerdown", (event) => {
    setHammerPositionFromEvent(event);
    boardEl.classList.add("show-hammer");
    swingHammer();

    if (event.pointerType === "touch") {
      clearTimeout(hammerTouchHideTimer);
      hammerTouchHideTimer = window.setTimeout(() => {
        if (!pointerOverBoard) {
          boardEl.classList.remove("show-hammer");
        }
      }, TOUCH_HAMMER_VISIBLE_MS);
    }
  });
}

function preloadGameAssets() {
  if (assetsReady) {
    return Promise.resolve(true);
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  const assetPaths = getAllGameAssetPaths();
  let loadedCount = 0;

  assetsLoading = true;
  startBtn.disabled = true;
  setStatus(`Loading images... ${loadedCount}/${assetPaths.length}`);

  preloadPromise = Promise.all(
    assetPaths.map((src) =>
      loadImage(src).then(() => {
        loadedCount += 1;
        setStatus(`Loading images... ${loadedCount}/${assetPaths.length}`);
      }),
    ),
  )
    .then(() => {
      assetsReady = true;
      assetsLoading = false;
      startBtn.disabled = false;
      setStatus("Images ready! Press Start and bonk the totems!", "good");
      return true;
    })
    .catch((error) => {
      assetsReady = false;
      assetsLoading = false;
      startBtn.disabled = true;
      setStatus("Failed to load game images. Please refresh and try again.", "danger");
      console.error(error);
      return false;
    });

  return preloadPromise;
}

function getHoleNumberFromKeyEvent(event) {
  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key);
  }

  if (/^Digit[1-9]$/.test(event.code)) {
    return Number(event.code.replace("Digit", ""));
  }

  if (/^Numpad[1-9]$/.test(event.code)) {
    return Number(event.code.replace("Numpad", ""));
  }

  return null;
}

function highlightHoleHint(holeNumber) {
  const hint = boardEl.querySelector(`.hole-hint[data-hole-number="${holeNumber}"]`);
  if (!hint) {
    return;
  }

  const prevTimer = hintFlashTimers.get(hint);
  if (prevTimer) {
    clearTimeout(prevTimer);
  }

  hint.classList.add("key-active");
  const timerId = window.setTimeout(() => {
    hint.classList.remove("key-active");
    hintFlashTimers.delete(hint);
  }, HINT_KEY_ACTIVE_MS);

  hintFlashTimers.set(hint, timerId);
}

function canTriggerHoleShortcut(holeNumber) {
  const now = performance.now();
  const lastForHole = holeShortcutTimestamps.get(holeNumber) || 0;

  if (now - lastKeyboardShortcutAt < KEYBOARD_GLOBAL_COOLDOWN_MS) {
    return false;
  }

  if (now - lastForHole < KEYBOARD_PER_HOLE_COOLDOWN_MS) {
    return false;
  }

  lastKeyboardShortcutAt = now;
  holeShortcutTimestamps.set(holeNumber, now);
  return true;
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const interactiveTags = ["INPUT", "TEXTAREA", "SELECT", "OPTION"];
  return target.isContentEditable || interactiveTags.includes(target.tagName);
}

function cycleDifficulty(step) {
  const currentKey = difficultyEl.value || "normal";
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentKey);
  const safeIndex = currentIndex >= 0 ? currentIndex : 1;
  const nextIndex = (safeIndex + step + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length;
  difficultyEl.value = DIFFICULTY_ORDER[nextIndex];
  activeDifficulty = getSelectedDifficulty();
  if (assetsReady) {
    setStatus(`Difficulty set to ${activeDifficulty.label}. Press Start and bonk the totems!`);
  } else {
    setStatus(`Difficulty: ${activeDifficulty.label}. Loading images...`);
  }
}

function handleGameKeydown(event) {
  if (event.repeat || isTypingTarget(event.target)) {
    return;
  }

  if (!running && (event.code === "Space" || event.code === "Enter" || event.code === "NumpadEnter")) {
    event.preventDefault();
    startGame();
    return;
  }

  if (!running && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    cycleDifficulty(event.key === "ArrowUp" ? -1 : 1);
    return;
  }

  if (running && event.key === "Escape") {
    event.preventDefault();
    stopGame({ message: `Game stopped. Final score: ${score}. Press Start to play again!` });
    return;
  }

  if (!running) {
    return;
  }

  const holeNumber = getHoleNumberFromKeyEvent(event);
  if (!holeNumber || holeNumber > HOLE_POSITIONS.length) {
    return;
  }

  const button = boardEl.querySelector(`.mole-btn[data-hole-number="${holeNumber}"]`);
  if (!button) {
    return;
  }

  if (!canTriggerHoleShortcut(holeNumber)) {
    return;
  }

  highlightHoleHint(holeNumber);
  swingHammerAtHole(holeNumber);
  event.preventDefault();
  button.click();
}

function hideCurrentMole() {
  if (!currentHole) {
    return;
  }

  const { button, mole } = currentHole;
  const lastSpawnId = button.dataset.spawnId;

  button.classList.remove("hit");
  button.classList.remove("active");
  button.dataset.isUp = "false";

  window.setTimeout(() => {
    if (button.dataset.isUp === "false" && button.dataset.spawnId === lastSpawnId) {
      mole.removeAttribute("src");
    }
  }, 170);

  currentHole = null;
}

function buildBoard() {
  boardEl.innerHTML = "";

  for (let i = 0; i < HOLE_POSITIONS.length; i += 1) {
    const pos = HOLE_POSITIONS[i];
    const hole = document.createElement("div");
    hole.className = "hole-slot";
    hole.style.setProperty("--x", `${pos.x}%`);
    hole.style.setProperty("--y", `${pos.y}%`);
    hole.style.setProperty("--w", `${pos.w}%`);
    hole.style.setProperty("--h", `${pos.h}%`);
    hole.style.zIndex = String(Math.round(pos.y * 10));

    const button = document.createElement("button");
    button.className = "mole-btn";
    button.type = "button";
    button.dataset.holeNumber = String(i + 1);
    button.dataset.isUp = "false";
    button.setAttribute("aria-label", `Hole ${i + 1} (key ${i + 1})`);

    const hint = document.createElement("span");
    hint.className = "hole-hint";
    hint.dataset.holeNumber = String(i + 1);
    hint.textContent = String(i + 1);
    hint.setAttribute("aria-hidden", "true");

    const mole = document.createElement("img");
    mole.className = "mole";
    mole.alt = "Totem";

    button.appendChild(mole);

    button.addEventListener("click", () => {
      if (!running || button.dataset.isUp !== "true") {
        return;
      }

      score += 1;
      updateHud();

      const char = button.dataset.char;
      mole.src = `${ASSET_BASE}/totem_${char}_hit.png`;
      button.dataset.isUp = "false";
      const lastSpawnId = button.dataset.spawnId;
      button.classList.add("hit");

      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (button.dataset.isUp === "false" && button.dataset.spawnId === lastSpawnId) {
          button.classList.remove("hit");
          hideCurrentMole();
        }
      }, HIT_ANIMATION_MS);

      setStatus("Nice hit! Keep going!", "good");
    });

    hole.append(hint, button);
    boardEl.appendChild(hole);
  }

  ensureHammerElement();
}

function spawnMole() {
  hideCurrentMole();

  const buttons = [...boardEl.querySelectorAll(".mole-btn")];
  if (!buttons.length) {
    return;
  }

  const nextButton = buttons[rand(0, buttons.length - 1)];
  const mole = nextButton.querySelector(".mole");
  const character = pickCharacter();
  const spawnId = String((spawnIdCounter += 1));

  nextButton.dataset.char = character;
  nextButton.dataset.spawnId = spawnId;
  nextButton.dataset.isUp = "true";
  mole.src = `${ASSET_BASE}/totem_${character}.png`;
  mole.alt = `${character} totem`;

  nextButton.classList.add("active");
  currentHole = { button: nextButton, mole };

  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (nextButton.dataset.isUp === "true") {
      setStatus("Too slow! Bonk faster 👀", "danger");
    }
    hideCurrentMole();
  }, rand(activeDifficulty.moleMinTime, activeDifficulty.moleMaxTime));
}

function stopGame(options = {}) {
  const { message = "", statusType = "" } = options;

  running = false;
  clearInterval(clockTimer);
  clearInterval(spawnTimer);
  clearTimeout(hideTimer);
  hideCurrentMole();
  startBtn.disabled = !assetsReady;
  difficultyEl.disabled = false;

  const best = getBestScore();
  if (score > best) {
    setBestScore(score);
    setStatus(`Time's up! New best score: ${score} 🎉`, "good");
  } else if (message) {
    setStatus(message, statusType);
  } else {
    setStatus(`Time's up! Final score: ${score}. Try again!`);
  }
}

function startGame() {
  if (!assetsReady) {
    if (assetsLoading) {
      setStatus("Loading images... please wait.");
    } else {
      setStatus("Preparing game assets...", "danger");
      preloadGameAssets();
    }
    return;
  }

  score = 0;
  timeLeft = GAME_DURATION;
  running = true;
  holeShortcutTimestamps.clear();
  lastKeyboardShortcutAt = 0;
  startBtn.disabled = true;
  difficultyEl.disabled = true;
  activeDifficulty = getSelectedDifficulty();
  setStatus(`Game started (${activeDifficulty.label})! Whack every totem you can!`);

  updateHud();
  hideCurrentMole();
  spawnMole();

  clockTimer = window.setInterval(() => {
    timeLeft -= 1;
    updateHud();

    if (timeLeft <= 0) {
      stopGame();
    }
  }, 1000);

  spawnTimer = window.setInterval(() => {
    if (running) {
      spawnMole();
    }
  }, activeDifficulty.spawnInterval);
}

function init() {
  buildBoard();
  setupHammerControls();
  bestEl.textContent = String(getBestScore());
  activeDifficulty = getSelectedDifficulty();
  startBtn.disabled = true;
  updateHud();

  startBtn.addEventListener("click", () => {
    if (!running) {
      startGame();
    }
  });

  difficultyEl.addEventListener("change", () => {
    if (!running) {
      activeDifficulty = getSelectedDifficulty();
      if (assetsReady) {
        setStatus(`Difficulty set to ${activeDifficulty.label}. Press Start and bonk the totems!`);
      } else {
        setStatus(`Difficulty: ${activeDifficulty.label}. Loading images...`);
      }
    }
  });

  document.addEventListener("keydown", handleGameKeydown);
  preloadGameAssets();
}

init();
