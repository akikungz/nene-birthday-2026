/**
 * @typedef {Object} SpritePair
 * @property {string} normal - Default sprite image.
 * @property {string} hit - Sprite image shown after a hit.
 */

/**
 * @typedef {Object} SpawnPosition
 * @property {number} x
 * @property {number} y
 * @property {boolean} fromEdge
 */

/**
 * @typedef {Object} ScoreHistoryItem
 * @property {number} score
 * @property {string} date
 */

/** @type {SpritePair[]} */
const Images = [
    { normal: "../assets/shooting/tomato1.png", hit: "../assets/shooting/tomato2.png" },
    { normal: "../assets/shooting/eggplant1.png", hit: "../assets/shooting/eggplant2.png" },
    { normal: "../assets/shooting/potato1.png", hit: "../assets/shooting/potato2.png" },
    { normal: "../assets/shooting/onion1.png", hit: "../assets/shooting/onion2.png" }
];

/** @type {string[]} */
const baitImages = [
    "../assets/shooting/fish.png",
    "../assets/shooting/mama.png",
    "../assets/shooting/milk.png"
];

const gameArea = document.getElementById("gameArea");
const playZone = document.getElementById("playZone");
const startScreen = document.getElementById("startScreen");
const tutorialScreen = document.getElementById("tutorialScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreText = document.getElementById("finalScore");
const livesDisplay = document.getElementById("livesDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const timerDisplay = document.getElementById("timerDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const historyList = document.getElementById("historyList");
const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const prizeBtn = document.getElementById("prizeBtn");
const prizeBtnLabel = document.getElementById("prizeBtnLabel");
const backMenuBtn = document.querySelector(".back-menu-btn");

const gameName = "ShootingGame";
const TIME_LIMIT_SECONDS = 2 * 60 + 22;
const REWARD_THRESHOLD_SCORE = 22;
const rewardScoreStorageKey = "game_target_shooting_score";
const rewardFinishStorageKey = "game_target_shooting_finish";
const CURSOR_SOURCE = "../assets/shooting/cursor.png";
const CURSOR_SWING_MS = 90;
const BGM_TARGET_SHOOTING = "../assets/audio/BGM/bgm_target_shooting.mp3";
const SFX_SHOOT_AIR = "../assets/audio/SFX/target-shooting/sfx_shoot_air.mp3";
const SFX_SHOOT_CORRECT = "../assets/audio/SFX/target-shooting/sfx_shoot_correct.mp3";
const SFX_SHOOT_INCORRECT = "../assets/audio/SFX/target-shooting/sfx_shoot_incorrect.mp3";
const SFX_WIN_THE_GAME = "../assets/audio/SFX/sfx_win_the_game.mp3";
const SFX_NEXT_PAGE = "../assets/audio/SFX/sfx_next_page.mp3";
const SFX_COMBINED_INGREDIENTS = "../assets/audio/SFX/sfx_combined_ingredients.mp3";

if (window.GameAudio) {
    window.GameAudio.initBgm(BGM_TARGET_SHOOTING, { volume: 0.45 });
}

let highScore = parseInt(
    localStorage.getItem(`game_${gameName}_maxScore`)
) || 0;

highScoreDisplay.textContent = highScore;

let score = 0;
let lives = 5;
let waveTimeout;
let timerInterval;
let spawnCount = 1;
let nextLevelScore = 10;
let zeroStartTime = null;
let isPaused = false;
let isGameOver = false;
let gameStartTime = 0;
let timeLeft = TIME_LIMIT_SECONDS;
let lastResultWasPass = false;
let customCursorEl = null;
let cursorSwingTimer = null;
let cursorEventsBound = false;
let cursorMoveRaf = null;
let pendingCursorX = 0;
let pendingCursorY = 0;

/**
 * Ensure animated cursor element exists inside the play zone.
 * @returns {void}
 */
function ensureCustomCursorElement() {
    if (customCursorEl || !playZone) {
        return;
    }

    customCursorEl = document.createElement("img");
    customCursorEl.className = "shooting-cursor";
    customCursorEl.src = CURSOR_SOURCE;
    customCursorEl.alt = "";
    customCursorEl.setAttribute("aria-hidden", "true");
    playZone.appendChild(customCursorEl);
}

/**
 * Show custom cursor sprite.
 * @returns {void}
 */
function showCustomCursor() {
    if (!customCursorEl) {
        return;
    }

    customCursorEl.classList.add("show");
}

/**
 * Hide custom cursor sprite and swing state.
 * @returns {void}
 */
function hideCustomCursor() {
    if (!customCursorEl) {
        return;
    }

    customCursorEl.classList.remove("show", "swing");
}

/**
 * Position cursor element from mouse coordinates.
 * @param {MouseEvent} event
 */
function setCustomCursorPosition(event) {
    if (!customCursorEl || !playZone) {
        return;
    }

    const rect = playZone.getBoundingClientRect();
    pendingCursorX = event.clientX - rect.left;
    pendingCursorY = event.clientY - rect.top;

    if (cursorMoveRaf) {
        return;
    }

    cursorMoveRaf = requestAnimationFrame(() => {
        if (customCursorEl) {
            customCursorEl.style.left = `${pendingCursorX}px`;
            customCursorEl.style.top = `${pendingCursorY}px`;
        }
        cursorMoveRaf = null;
    });
}

/**
 * Trigger cursor swing animation for feedback on firing.
 * @returns {void}
 */
function swingCustomCursor() {
    if (!customCursorEl) {
        return;
    }

    customCursorEl.classList.add("swing");
    clearTimeout(cursorSwingTimer);
    cursorSwingTimer = setTimeout(() => {
        customCursorEl?.classList.remove("swing");
    }, CURSOR_SWING_MS);
}

/**
 * Bind pointer listeners required by the custom cursor system.
 * @returns {void}
 */
function bindCustomCursorEvents() {
    if (cursorEventsBound || !gameArea) {
        return;
    }

    cursorEventsBound = true;

    gameArea.addEventListener("pointerenter", (event) => {
        if (isGameOver) return;
        ensureCustomCursorElement();
        setCustomCursorPosition(event);
        showCustomCursor();
    });

    gameArea.addEventListener("pointermove", (event) => {
        if (isGameOver) return;
        ensureCustomCursorElement();
        setCustomCursorPosition(event);
        showCustomCursor();
    });

    gameArea.addEventListener("pointerleave", () => {
        hideCustomCursor();
    });

    gameArea.addEventListener("pointerdown", (event) => {
        if (isGameOver) return;
        ensureCustomCursorElement();
        setCustomCursorPosition(event);
        showCustomCursor();
        swingCustomCursor();
    });
}

if (gameArea) {
    gameArea.addEventListener("pointerdown", (event) => {
        if (isGameOver) return;
        const targetElement = event.target;
        if (targetElement instanceof HTMLElement && targetElement.closest(".target")) {
            return;
        }
        window.GameAudio?.playSfx(SFX_SHOOT_AIR, { volume: 0.55 });
    });
}

/**
 * Hide reward overlay card.
 * @returns {void}
 */
function hideRewardOverlay() {
    if (!resultOverlay) return;
    resultOverlay.classList.remove("show");
    resultOverlay.setAttribute("aria-hidden", "true");
}

/**
 * Show reward overlay details for current run.
 * @param {number} finalScore
 * @param {boolean} didPass
 * @returns {void}
 */
function showRewardOverlay(finalScore, didPass) {
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
 * Persist unlock as soon as score passes threshold (before game end).
 * @returns {void}
 */
function unlockRewardByScoreProgress() {
    if (score > REWARD_THRESHOLD_SCORE) {
        localStorage.setItem(rewardScoreStorageKey, String(score));
        localStorage.setItem(`game_${gameName}_finish`, "true");
    }
}

/**
 * Safely read score history from localStorage.
 * @returns {ScoreHistoryItem[]}
 */
function getScoreHistory() {
    try {
        const raw = localStorage.getItem(`game_${gameName}_history`);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Show tutorial screen before the game starts.
 * @returns {void}
 */
function showTutorial() {
    startScreen.style.display = "none";
    tutorialScreen.style.display = "flex";
}

/**
 * Continue from tutorial and start the game.
 * @returns {void}
 */
function beginGame() {
    tutorialScreen.style.display = "none";
    startGame();
}

/**
 * Reset game state and begin spawning waves.
 * @returns {void}
 */
function startGame() {
    bindCustomCursorEvents();
    ensureCustomCursorElement();
    gameArea.style.cursor = "none";
    zeroStartTime = null;
    isGameOver = false;
    isPaused = false;
    lastResultWasPass = false;

    score = 0;
    lives = 5;
    spawnCount = 1;
    timeLeft = TIME_LIMIT_SECONDS;
    gameStartTime = Date.now();

    clearTimeout(waveTimeout);
    clearInterval(timerInterval);

    updateHUD();

    gameArea.innerHTML = "";
    startScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    hideRewardOverlay();

    startTimer();
    requestAnimationFrame(() => {
        if (!isGameOver) {
            startWaveLoop();
        }
    });
}

/**
 * Refresh score and hearts in the HUD.
 * @returns {void}
 */
function updateHUD() {
    scoreDisplay.textContent = score;
    timerDisplay.textContent = formatTime(timeLeft);
    livesDisplay.innerHTML = "";

    for (let i = 0; i < lives; i++) {
        const heart = document.createElement("span");
        heart.textContent = "❤️";
        heart.setAttribute("aria-hidden", "true");
        heart.classList.add("heartIcon");
        livesDisplay.appendChild(heart);
    }
}

/**
 * Convert seconds into mm:ss format.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Start the game countdown timer.
 * @returns {void}
 */
function startTimer() {
    timerDisplay.textContent = formatTime(timeLeft);

    timerInterval = setInterval(() => {
        if (isGameOver || isPaused) {
            return;
        }

        timeLeft = Math.max(0, timeLeft - 1);
        timerDisplay.textContent = formatTime(timeLeft);

        if (timeLeft <= 0) {
            endGame(lives > 0 ? "pass" : "timeout");
        }
    }, 1000);
}

/**
 * Get a random spawn position, usually from screen edges.
 * @returns {SpawnPosition}
 */
function randomSpawnPosition() {
    const w = Math.max(gameArea.clientWidth, 120);
    const h = Math.max(gameArea.clientHeight, 120);

    const spawnFromEdge = Math.random() < 0.6;

    if (!spawnFromEdge) {
        return {
            x: Math.random() * (w - 60),
            y: Math.random() * (h - 60),
            fromEdge: false
        };
    }

    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch (side) {
        case 0: x = Math.random() * w; y = -60; break;
        case 1: x = w + 60; y = Math.random() * h; break;
        case 2: x = Math.random() * w; y = h + 60; break;
        case 3: x = -60; y = Math.random() * h; break;
    }

    return { x, y, fromEdge: true };
}

/**
 * Spawn one moving target (veggie or bait) and attach hit behavior.
 * @returns {void}
 */
function spawnTarget() {
    if (isGameOver) {
        return;
    }

    const target = document.createElement("div");
    const isBait = Math.random() < 0.25;

    target.className = "target";

    let selectedVeggie = null;

    if (isBait) {
        const randomBait = baitImages[Math.floor(Math.random() * baitImages.length)];
        target.style.backgroundImage = `url("${randomBait}")`;
    } else {
        selectedVeggie = Images[Math.floor(Math.random() * Images.length)];
        target.style.backgroundImage = `url("${selectedVeggie.normal}")`;
    }

    let pos = randomSpawnPosition();
    let x = pos.x;
    let y = pos.y;
    let vx, vy;

    if (pos.fromEdge) {

        const centerX = gameArea.clientWidth / 2;
        const centerY = gameArea.clientHeight / 2;

        const dx = centerX - x;
        const dy = centerY - y;

        const length = Math.sqrt(dx * dx + dy * dy);
        const speed = Math.random() * 3 + 2;

        vx = (dx / length) * speed;
        vy = (dy / length) * speed;

    } else {

        vx = (Math.random() * 4 - 2);
        vy = (Math.random() * 4 - 2);
    }

    target.style.transform = `translate(${x}px, ${y}px)`;
    gameArea.appendChild(target);

    const move = setInterval(() => {

        x += vx;
        y += vy;
        target.style.transform = `translate(${x}px, ${y}px)`;

        if (x < -100 || x > gameArea.clientWidth + 100 ||
            y < -100 || y > gameArea.clientHeight + 100) {

            clearInterval(move);
            target.remove();
        }

    }, 20);

    const onTargetHit = (event) => {
        event.preventDefault();

        if (target.dataset.hit === "true") return;
        target.dataset.hit = "true";

        clearInterval(move);
        target.style.pointerEvents = "none";

        if (isBait) {
            window.GameAudio?.playSfx(SFX_SHOOT_INCORRECT, { volume: 0.85 });
            lives--;
            updateHUD();

            target.style.opacity = "0.6";

            setTimeout(() => {
                target.remove();
            }, 150);

            if (lives <= 0) {
                endGame("fail");
            }
        } else {
            window.GameAudio?.playSfx(SFX_SHOOT_CORRECT, { volume: 0.8 });
            score += 1;
            spawnCount = Math.floor(score / 10) + 1;

            unlockRewardByScoreProgress();

            if (spawnCount > 3) {
                spawnCount = 0;
            }

            updateHUD();

            if (selectedVeggie) {
                target.style.backgroundImage = `url("${selectedVeggie.hit}")`;
            }

            setTimeout(() => {
                target.remove();
            }, 500);
        }
    };

    target.addEventListener("pointerdown", onTargetHit);
}

/**
 * Start recurring wave generation every 2 seconds.
 * @returns {void}
 */
function startWaveLoop() {
    if (isGameOver) {
        return;
    }

    if (!isPaused) {
        spawnWave();
    }

    waveTimeout = setTimeout(startWaveLoop, 2000);
}


/**
 * Spawn a wave based on current score progression.
 * @returns {void}
 */
function spawnWave() {
    let amount;

    if (spawnCount === 0) {

        if (!zeroStartTime) {
            zeroStartTime = Date.now();
        }

        const elapsed = (Date.now() - zeroStartTime) / 1000;

        if (elapsed >= 30) {
            amount = 4;
            zeroStartTime = null;
        } else {
            amount = 3;
        }
    } else {
        amount = spawnCount;
        zeroStartTime = null;
    }

    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            spawnTarget();
        }, i * 150);
    }
}

/**
 * Finalize run, persist score history, and show game-over UI.
 * @param {"pass" | "timeout" | "fail"} [reason="timeout"]
 * @returns {void}
 */
function endGame(reason = "timeout") {
    if (isGameOver) {
        return;
    }
    const didPass = reason === "pass";

    isGameOver = true;
    lastResultWasPass = didPass;
    localStorage.setItem(rewardScoreStorageKey, String(score));

    gameArea.style.cursor = "default";
    hideCustomCursor();
    clearTimeout(waveTimeout);
    clearInterval(timerInterval);
    timeLeft = 0;
    timerDisplay.textContent = formatTime(timeLeft);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem(`game_${gameName}_maxScore`, highScore);
        highScoreDisplay.textContent = highScore;
    }

    finalScoreText.textContent = score;
    gameOverScreen.style.display = "flex";

    const rewardUnlocked = score > REWARD_THRESHOLD_SCORE || didPass;
    if (rewardUnlocked) {
        window.GameAudio?.playSfx(SFX_WIN_THE_GAME, { volume: 0.9 });
        if (didPass) {
            localStorage.setItem(`game_${gameName}_finish`, "true");
        }
        showRewardOverlay(score, didPass);
    } else {
        hideRewardOverlay();
    }

    /** @type {ScoreHistoryItem[]} */
    let history = getScoreHistory();

    history.push({
        score: score,
        date: new Date().toLocaleString()
    });

    if (history.length > 10) {
        history.shift();
    }

    localStorage.setItem(
        `game_${gameName}_history`,
        JSON.stringify(history)
    );

    displayHistory();
}

if (resultOverlay) {
    resultOverlay.addEventListener("click", () => {
        hideRewardOverlay();
    });
}

if (prizeBtn) {
    prizeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!isGameOver) {
            return;
        }

        const rewardUnlocked = score > REWARD_THRESHOLD_SCORE || lastResultWasPass;
        if (!rewardUnlocked) {
            return;
        }

        const alreadyCollected = localStorage.getItem(rewardFinishStorageKey) === "true";
        if (alreadyCollected) {
            return;
        }

        localStorage.setItem(rewardFinishStorageKey, "true");
        localStorage.setItem(`game_${gameName}_finish`, "true");
        window.GameAudio?.playSfx(SFX_COMBINED_INGREDIENTS, { volume: 0.85 });
        prizeBtn.classList.add("collected");
        prizeBtn.disabled = true;
        if (prizeBtnLabel) {
            prizeBtnLabel.textContent = "เก็บรางวัลแล้ว";
        }
    });
}

if (backMenuBtn) {
    backMenuBtn.addEventListener("click", (event) => {
        const href = backMenuBtn.getAttribute("href");
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

/**
 * Render the latest score history into the game-over list.
 * @returns {void}
 */
function displayHistory() {
    /** @type {ScoreHistoryItem[]} */
    let history = getScoreHistory();

    historyList.innerHTML = "";

    history.slice().reverse().forEach(item => {

        const li = document.createElement("li");
        li.textContent = `${item.score} - ${item.date}`;
        historyList.appendChild(li);
    });
}

bindCustomCursorEvents();
