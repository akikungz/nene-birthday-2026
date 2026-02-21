/**
 * Difficulty profile values that control mole timing.
 * @typedef {Object} DifficultyPreset
 * @property {string} label
 * @property {number} moleMinTime
 * @property {number} moleMaxTime
 * @property {number} spawnInterval
 */

/**
 * Hole placement percentages on the board background.
 * @typedef {Object} HolePosition
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * Runtime reference to the currently visible mole.
 * @typedef {Object} CurrentHole
 * @property {HTMLButtonElement} button
 * @property {HTMLImageElement} mole
 */

/**
 * Optional override values when ending a game early.
 * @typedef {Object} StopGameOptions
 * @property {string} [message]
 * @property {"" | "good" | "danger"} [statusType]
 * @property {boolean} [passed]
 */

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

const DANGEROUS_CHARACTERS = new Set(["canon", "eve", "kris", "mei"]);
const VEGETABLE_CHARACTERS = new Set(["eggplant", "onion", "potato", "tomato"]);
const MAX_HEALTH = 5;

const GAME_DURATION = 142; // 2 Minutes and 22 Seconds is easter egg for Mikotomi Maneneko birthday date is 22nd February (22/02)
const REWARD_THRESHOLD_SCORE = 22;
const HIT_ANIMATION_MS = 200;
const HINT_KEY_ACTIVE_MS = 140;
const KEYBOARD_GLOBAL_COOLDOWN_MS = 55;
const KEYBOARD_PER_HOLE_COOLDOWN_MS = 90;
const KEYBOARD_HAMMER_VISIBLE_MS = 180;
const TOUCH_HAMMER_VISIBLE_MS = 220;

/** @type {Record<string, DifficultyPreset>} */
const DIFFICULTY_PRESETS = {
  easy: { label: "ง่าย", moleMinTime: 750, moleMaxTime: 1300, spawnInterval: 900 },
  normal: { label: "ปกติ", moleMinTime: 750, moleMaxTime: 1300, spawnInterval: 900 },
  hard: { label: "ยาก", moleMinTime: 260, moleMaxTime: 700, spawnInterval: 420 },
};
const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

/** @type {HolePosition[]} */
const HOLE_POSITIONS = [
  { x: 20.9, y: 28.5, w: 20, h: 34 },
  { x: 12.2, y: 79.8, w: 19, h: 33 },
  { x: 34.2, y: 67.9, w: 20, h: 34 },
  { x: 56.7, y: 37.2, w: 20, h: 34 },
  { x: 87.2, y: 29.6, w: 20, h: 34 },
  { x: 72.2, y: 79.3, w: 20, h: 34 },
];

const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const difficultyEl = document.getElementById("difficulty");
const boardEl = document.getElementById("board");
const hammerAsset = `${ASSET_BASE}/nene_punch.png`;
const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const prizeBtn = document.getElementById("prizeBtn");
const prizeBtnLabel = prizeBtn?.querySelector("span") || null;
const backMenuLink = document.querySelector(".back-link");

const BGM_WHACK_A_MOLE = "../assets/audio/BGM/bgm_whack_a_mole.mp3";
const SFX_WHACK_CORRECT = "../assets/audio/SFX/whack-a-mole/sfx_whack_correct.mp3";
const SFX_WHACK_INCORRECT = "../assets/audio/SFX/whack-a-mole/sfx_whack_incorrect.mp3";
const SFX_WIN_THE_GAME = "../assets/audio/SFX/sfx_win_the_game.mp3";
const SFX_NEXT_PAGE = "../assets/audio/SFX/sfx_next_page.mp3";
const SFX_COMBINED_INGREDIENTS = "../assets/audio/SFX/sfx_combined_ingredients.mp3";

if (window.GameAudio) {
  window.GameAudio.initBgm(BGM_WHACK_A_MOLE, { volume: 0.45 });
}

const bestStorageKey = "whack-a-mole-best";
const rewardScoreStorageKey = "game_whack_a_mole_score";
const rewardFinishStorageKey = "game_whack_a_mole_finish";

let score = 0;
let health = MAX_HEALTH;
let timeLeft = GAME_DURATION;
let running = false;
/** @type {CurrentHole | null} */
let currentHole = null;
let clockTimer = null;
let spawnTimer = null;
let hideTimer = null;
let spawnIdCounter = 0;
let activeDifficulty = DIFFICULTY_PRESETS.easy;
let assetsReady = false;
let assetsLoading = false;
let preloadPromise = null;
/** @type {Map<HTMLElement, number>} */
const hintFlashTimers = new Map();
/** @type {Map<number, number>} */
const holeShortcutTimestamps = new Map();
let lastKeyboardShortcutAt = 0;
let hammerEl = null;
let hammerSwingTimer = null;
let hammerKeyboardHideTimer = null;
let hammerTouchHideTimer = null;
let pointerOverBoard = false;
let lastFinalScore = 0;
let lastGamePassed = false;

/**
 * Returns a random integer in the inclusive range [min, max].
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Picks one character id from the available totem set.
 * @returns {string}
 */
function pickCharacter() {
  return CHARACTERS[rand(0, CHARACTERS.length - 1)];
}

/**
 * Updates status text and optional semantic color class.
 * @param {string} message
 * @param {"" | "good" | "danger"} [type=""]
 */
function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("good", "danger");
  if (type) {
    statusEl.classList.add(type);
  }
}

/**
 * Refresh score, health, and time values in the HUD.
 * @returns {void}
 */
function updateHud() {
  scoreEl.textContent = String(score);
  healthEl.textContent = formatHealth(health);
  timeEl.textContent = formatTime(timeLeft);
}

/**
 * Returns hearts in the format: filled + empty hearts.
 * @param {number} value
 * @returns {string}
 */
function formatHealth(value) {
  const safeValue = Math.max(0, Math.min(MAX_HEALTH, Math.floor(value)));
  return `${"❤️".repeat(safeValue)}${"🖤".repeat(MAX_HEALTH - safeValue)}`;
}

/**
 * Formats seconds to mm:ss for stopwatch display.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getBestScore() {
  return Number(localStorage.getItem(bestStorageKey) || 0);
}

/**
 * Persist a new best score and update HUD display.
 * @param {number} value
 * @returns {void}
 */
function setBestScore(value) {
  localStorage.setItem(bestStorageKey, String(value));
  bestEl.textContent = String(value);
}

/**
 * Hide reward overlay panel.
 * @returns {void}
 */
function hideRewardOverlay() {
  if (!resultOverlay) {
    return;
  }
  resultOverlay.classList.remove("show");
  resultOverlay.setAttribute("aria-hidden", "true");
}

/**
 * Show reward overlay panel with final score context.
 * @param {number} finalScore
 * @param {boolean} [didPass=false]
 * @returns {void}
 */
function showRewardOverlay(finalScore, didPass = false) {
  if (!resultOverlay || !resultTitle || !resultScore || !prizeBtn || !prizeBtnLabel) {
    return;
  }

  const alreadyCollected = localStorage.getItem(rewardFinishStorageKey) === "true";
  resultTitle.textContent = didPass ? "ผ่านด่าน! ปลดล็อกรางวัลแล้ว!" : "ปลดล็อกรางวัลแล้ว!";
  resultScore.textContent = `คะแนน: ${finalScore} (ต้องมากกว่า ${REWARD_THRESHOLD_SCORE} หรือผ่านด่าน)`;

  if (alreadyCollected) {
    prizeBtn.classList.add("collected");
    prizeBtn.disabled = true;
    prizeBtnLabel.textContent = "เก็บรางวัลไปแล้ว";
  } else {
    prizeBtn.classList.remove("collected");
    prizeBtn.disabled = false;
    prizeBtnLabel.textContent = "เก็บรางวัล";
  }

  resultOverlay.classList.add("show");
  resultOverlay.setAttribute("aria-hidden", "false");
}

/**
 * Resolve currently selected difficulty from UI.
 * @returns {DifficultyPreset}
 */
function getSelectedDifficulty() {
  const selectedKey = difficultyEl?.value || "normal";
  return DIFFICULTY_PRESETS[selectedKey] || DIFFICULTY_PRESETS.normal;
}

/**
 * Collect all image asset paths required by the game.
 * @returns {string[]}
 */
function getAllGameAssetPaths() {
  const paths = [`${ASSET_BASE}/background_with_hole.png`, hammerAsset];

  for (const character of CHARACTERS) {
    paths.push(`${ASSET_BASE}/totem_${character}.png`);
    paths.push(`${ASSET_BASE}/totem_${character}_hit.png`);
  }

  return paths;
}

/**
 * Preload helper for one image path.
 * @param {string} src
 * @returns {Promise<string>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
}

/**
 * Ensure hammer cursor element exists on the board.
 * @returns {HTMLImageElement}
 */
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

/**
 * Move hammer sprite to pointer location.
 * @param {PointerEvent} event
 * @returns {void}
 */
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

/**
 * Move hammer sprite to board-relative coordinates.
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function setHammerPosition(x, y) {
  if (!hammerEl) {
    return;
  }

  hammerEl.style.left = `${x}px`;
  hammerEl.style.top = `${y}px`;
}

/**
 * Trigger hammer swing animation.
 * @returns {void}
 */
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

/**
 * Swing hammer over a specific hole shortcut target.
 * @param {number} holeNumber
 * @returns {void}
 */
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

/**
 * Setup pointer-based hammer controls for desktop and touch.
 * @returns {void}
 */
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

/**
 * Preload all game images and update loading status text.
 * @returns {Promise<boolean>}
 */
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
  setStatus(`กำลังโหลดรูปภาพ... ${loadedCount}/${assetPaths.length}`);

  preloadPromise = Promise.all(
    assetPaths.map((src) =>
      loadImage(src).then(() => {
        loadedCount += 1;
        setStatus(`กำลังโหลดรูปภาพ... ${loadedCount}/${assetPaths.length}`);
      }),
    ),
  )
    .then(() => {
      assetsReady = true;
      assetsLoading = false;
      startBtn.disabled = false;
      setStatus("โหลดรูปเสร็จแล้ว! กดเริ่มเกมแล้วตีโทเท็มได้เลย!", "good");
      return true;
    })
    .catch((error) => {
      assetsReady = false;
      assetsLoading = false;
      startBtn.disabled = true;
      setStatus("โหลดรูปเกมไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่", "danger");
      console.error(error);
      return false;
    });

  return preloadPromise;
}

/**
 * Converts keyboard event into a hole number when possible.
 * Supports top-row digits and numpad digits.
 * @param {KeyboardEvent} event
 * @returns {number | null}
 */
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

/**
 * Flash a brief visual hint for a keyboard-selected hole.
 * @param {number} holeNumber
 * @returns {void}
 */
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

/**
 * Anti-spam guard for keyboard shortcuts.
 * Applies both global and per-hole cooldown windows.
 * @param {number} holeNumber
 * @returns {boolean}
 */
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

/**
 * Determine whether keyboard event target is a typing field.
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const interactiveTags = ["INPUT", "TEXTAREA", "SELECT", "OPTION"];
  return target.isContentEditable || interactiveTags.includes(target.tagName);
}

/**
 * Cycles difficulty select value by one step and updates status.
 * @param {number} step
 */
function cycleDifficulty(step) {
  if (!difficultyEl) {
    return;
  }

  const currentKey = difficultyEl.value || "normal";
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentKey);
  const safeIndex = currentIndex >= 0 ? currentIndex : 1;
  const nextIndex = (safeIndex + step + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length;
  difficultyEl.value = DIFFICULTY_ORDER[nextIndex];
  activeDifficulty = getSelectedDifficulty();
  if (assetsReady) {
    setStatus(`ตั้งค่าความยากเป็น ${activeDifficulty.label} แล้ว กดเริ่มเกมได้เลย!`);
  } else {
    setStatus(`ระดับความยาก: ${activeDifficulty.label} กำลังโหลดรูปภาพ...`);
  }
}

/**
 * Handle keyboard shortcuts for start/stop, difficulty, and hole hits.
 * @param {KeyboardEvent} event
 * @returns {void}
 */
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
    stopGame({ message: `หยุดเกมแล้ว คะแนนสุดท้าย: ${score} กดเริ่มเกมเพื่อเล่นอีกครั้ง!` });
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

/**
 * Hide currently active mole and clear active-hole references.
 * @returns {void}
 */
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

/**
 * Build all hole DOM nodes and hit handlers.
 * @returns {void}
 */
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
    button.setAttribute("aria-label", `หลุมที่ ${i + 1} (ปุ่ม ${i + 1})`);

    const hint = document.createElement("span");
    hint.className = "hole-hint";
    hint.dataset.holeNumber = String(i + 1);
    hint.textContent = String(i + 1);
    hint.setAttribute("aria-hidden", "true");

    const mole = document.createElement("img");
    mole.className = "mole";
    mole.alt = "โทเท็ม";

    button.appendChild(mole);

    button.addEventListener("click", () => {
      if (!running || button.dataset.isUp !== "true") {
        return;
      }

      const char = button.dataset.char;

      if (DANGEROUS_CHARACTERS.has(char)) {
        window.GameAudio?.playSfx(SFX_WHACK_INCORRECT, { volume: 0.85 });
        health -= 1;
        setStatus(`โอ๊ย! ${char} โดนผิดเป้าลด -1❤️`, "danger");
      } else if (VEGETABLE_CHARACTERS.has(char)) {
        window.GameAudio?.playSfx(SFX_WHACK_CORRECT, { volume: 0.8 });
        score += 1;
        setStatus(`เยี่ยม! ตี ${char} ได้ +1 คะแนน`, "good");
      } else {
        setStatus("โดนเป้า!", "good");
      }

      updateHud();

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

      if (health <= 0) {
        stopGame({ message: `พลังชีวิตหมดแล้ว! คะแนนสุดท้าย: ${score} ลองอีกครั้งนะ!`, statusType: "danger" });
      }
    });

    hole.append(hint, button);
    boardEl.appendChild(hole);
  }

  ensureHammerElement();
}

/**
 * Spawn a mole into a random hole.
 * @returns {void}
 */
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
      setStatus("ช้าไปหน่อย! ตีให้ไวขึ้น 👀", "danger");
    }
    hideCurrentMole();
  }, rand(activeDifficulty.moleMinTime, activeDifficulty.moleMaxTime));
}

/**
 * Stops all game loops and optionally overrides end-game message.
 * @param {StopGameOptions} [options={}]
 */
function stopGame(options = {}) {
  const { message = "", statusType = "", passed = false } = options;

  running = false;
  clearInterval(clockTimer);
  clearInterval(spawnTimer);
  clearTimeout(hideTimer);
  hideCurrentMole();
  startBtn.disabled = !assetsReady;
  if (difficultyEl) {
    difficultyEl.disabled = false;
  }
  lastFinalScore = score;
  lastGamePassed = Boolean(passed);
  localStorage.setItem(rewardScoreStorageKey, String(lastFinalScore));

  const best = getBestScore();
  if (score > best) {
    setBestScore(score);
    setStatus(`หมดเวลา! ทำสถิติสูงสุดใหม่: ${score} 🎉`, "good");
  } else if (message) {
    setStatus(message, statusType);
  } else {
    setStatus(`หมดเวลา! คะแนนสุดท้าย: ${score} ลองอีกครั้งนะ!`);
  }

  if (lastFinalScore > REWARD_THRESHOLD_SCORE || lastGamePassed) {
    window.GameAudio?.playSfx(SFX_WIN_THE_GAME, { volume: 0.9 });
    showRewardOverlay(lastFinalScore, lastGamePassed);
  } else {
    hideRewardOverlay();
  }
}

/**
 * Start a new game round when assets are ready.
 * @returns {void}
 */
function startGame() {
  if (!assetsReady) {
    if (assetsLoading) {
      setStatus("กำลังโหลดรูปภาพ... กรุณารอสักครู่");
    } else {
      setStatus("กำลังเตรียมไฟล์เกม...", "danger");
      preloadGameAssets();
    }
    return;
  }

  score = 0;
  health = MAX_HEALTH;
  timeLeft = GAME_DURATION;
  running = true;
  lastGamePassed = false;
  hideRewardOverlay();
  holeShortcutTimestamps.clear();
  lastKeyboardShortcutAt = 0;
  startBtn.disabled = true;
  if (difficultyEl) {
    difficultyEl.disabled = true;
  }
  activeDifficulty = getSelectedDifficulty();
  setStatus(`เริ่มเกมแล้ว (${activeDifficulty.label})! ตีโทเท็มให้ได้มากที่สุด!`);

  updateHud();
  hideCurrentMole();
  spawnMole();

  clockTimer = window.setInterval(() => {
    timeLeft -= 1;
    updateHud();

    if (timeLeft <= 0) {
      stopGame({ passed: health > 0 });
    }
  }, 1000);

  spawnTimer = window.setInterval(() => {
    if (running) {
      spawnMole();
    }
  }, activeDifficulty.spawnInterval);
}

/**
 * Initialize game UI, controls, and preload workflow.
 * @returns {void}
 */
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

  if (difficultyEl) {
    difficultyEl.addEventListener("change", () => {
      if (!running) {
        activeDifficulty = getSelectedDifficulty();
        if (assetsReady) {
          setStatus(`ตั้งค่าความยากเป็น ${activeDifficulty.label} แล้ว กดเริ่มเกมได้เลย!`);
        } else {
          setStatus(`ระดับความยาก: ${activeDifficulty.label} กำลังโหลดรูปภาพ...`);
        }
      }
    });
  }

  document.addEventListener("keydown", handleGameKeydown);

  if (resultOverlay) {
    resultOverlay.addEventListener("click", () => {
      hideRewardOverlay();
    });
  }

  if (prizeBtn) {
    prizeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (running || (lastFinalScore <= REWARD_THRESHOLD_SCORE && !lastGamePassed)) {
        return;
      }

      const alreadyCollected = localStorage.getItem(rewardFinishStorageKey) === "true";
      if (alreadyCollected) {
        return;
      }

      localStorage.setItem(rewardFinishStorageKey, "true");
      window.GameAudio?.playSfx(SFX_COMBINED_INGREDIENTS, { volume: 0.85 });
      prizeBtn.classList.add("collected");
      prizeBtn.disabled = true;
      if (prizeBtnLabel) {
        prizeBtnLabel.textContent = "เก็บรางวัลแล้ว";
      }
    });
  }

  preloadGameAssets();
}

if (backMenuLink) {
  backMenuLink.addEventListener("click", (event) => {
    const href = backMenuLink.getAttribute("href");
    if (!href) {
      return;
    }

    event.preventDefault();
    window.GameAudio?.playSfx(SFX_NEXT_PAGE, { volume: 0.9 });
    window.setTimeout(() => {
      window.location.href = href;
    }, 120);
  });
}

init();
