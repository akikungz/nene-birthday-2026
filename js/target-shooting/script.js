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
const startScreen = document.getElementById("startScreen");
const tutorialScreen = document.getElementById("tutorialScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreText = document.getElementById("finalScore");
const livesDisplay = document.getElementById("livesDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const timerDisplay = document.getElementById("timerDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const historyList = document.getElementById("historyList");

const gameName = "ShootingGame";
const TIME_LIMIT_SECONDS = 2 * 60 + 22;

let highScore = parseInt(
    localStorage.getItem(`game_${gameName}_maxScore`)
) || 0;

highScoreDisplay.textContent = highScore;

let MILK = false; //asset

let score = 0;
let lives = 3;
let waveTimeout;
let timerInterval;
let spawnCount = 1;
let nextLevelScore = 10;
let zeroStartTime = null;
let isPaused = false;
let isGameOver = false;
let gameStartTime = 0;
let timeLeft = TIME_LIMIT_SECONDS;

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

/** Show tutorial screen before the game starts. */
function showTutorial() {
    startScreen.style.display = "none";
    tutorialScreen.style.display = "flex";
}

/** Continue from tutorial and start the game. */
function beginGame() {
    tutorialScreen.style.display = "none";
    startGame();
}

/** Reset game state and begin spawning waves. */
function startGame() {
    gameArea.style.cursor = 'url("../assets/shooting/cursor2.png") 32 32, auto';
    zeroStartTime = null;
    isGameOver = false;

    score = 0;
    lives = 3;
    timeLeft = TIME_LIMIT_SECONDS;
    gameStartTime = Date.now();

    clearTimeout(waveTimeout);
    clearInterval(timerInterval);

    updateHUD();

    gameArea.innerHTML = "";
    startScreen.style.display = "none";
    gameOverScreen.style.display = "none";

    startTimer();
    startWaveLoop();
}

/** Refresh score and hearts in the HUD. */
function updateHUD() {
    scoreDisplay.textContent = score;
    timerDisplay.textContent = formatTime(timeLeft);
    livesDisplay.innerHTML = "";

    for (let i = 0; i < lives; i++) {
        const heart = document.createElement("img");
        heart.src = "../assets/shooting/heart.png";
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

/** Start the game countdown timer. */
function startTimer() {
    timerDisplay.textContent = formatTime(timeLeft);

    timerInterval = setInterval(() => {
        if (isGameOver || isPaused) {
            return;
        }

        timeLeft = Math.max(0, timeLeft - 1);
        timerDisplay.textContent = formatTime(timeLeft);

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

/**
 * Get a random spawn position, usually from screen edges.
 * @returns {SpawnPosition}
 */
function randomSpawnPosition() {
    const w = gameArea.clientWidth;
    const h = gameArea.clientHeight;

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

/** Spawn one moving target (veggie or bait) and attach hit behavior. */
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

    target.onclick = () => {
        if (target.dataset.hit === "true") return;
        target.dataset.hit = "true";

        clearInterval(move);
        target.style.pointerEvents = "none";

        if (isBait) {
            lives--;
            updateHUD();

            target.style.opacity = "0.6";

            setTimeout(() => {
                target.remove();
            }, 150);

            if (lives <= 0) {
                endGame();
            }
        } else {
            score += 1;
            spawnCount = Math.floor(score / 10) + 1;

            if (score >= 50 && !MILK) {
                MILK = true;
                showMilkReward();
            }

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
}

/** Start recurring wave generation every 2 seconds. */
function startWaveLoop() {
    if (isGameOver) {
        return;
    }

    if (!isPaused) {
        spawnWave();
    }

    waveTimeout = setTimeout(startWaveLoop, 2000);
}


/** Spawn a wave based on current score progression. */
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

/** Show reward animation when the milk asset is unlocked. */
function showMilkReward() {
    isPaused = true;

    const flash = document.createElement("div");
    flash.style.position = "absolute";
    flash.style.top = "0";
    flash.style.left = "0";
    flash.style.width = "100%";
    flash.style.height = "100%";
    flash.style.background = "white";
    flash.style.opacity = "0";
    flash.style.transition = "0.4s ease";
    flash.style.zIndex = "998";

    gameArea.appendChild(flash);

    setTimeout(() => {
        flash.style.opacity = "0.9";
    }, 50);

    setTimeout(() => {
        flash.style.opacity = "0";
    }, 500);

    const milkImg = document.createElement("img");
    milkImg.src = "../assets/milk.png";
    milkImg.style.position = "absolute";
    milkImg.style.width = "300px";
    milkImg.style.left = "50%";
    milkImg.style.top = "45%";
    milkImg.style.transform = "translate(-50%, -50%) scale(0)";
    milkImg.style.transition = "0.8s ease";
    milkImg.style.zIndex = "999";
    milkImg.style.filter = "drop-shadow(0 0 25px gold)";

    gameArea.appendChild(milkImg);

    const text = document.createElement("div");
    text.textContent = "Asset Unlocked!";
    text.style.position = "absolute";
    text.style.left = "50%";
    text.style.top = "65%";
    text.style.transform = "translate(-50%, -50%) scale(0)";
    text.style.fontSize = "48px";
    text.style.fontWeight = "bold";
    text.style.color = "gold";
    text.style.textShadow = "0 0 20px white, 0 0 40px gold";
    text.style.transition = "0.8s ease";
    text.style.zIndex = "999";

    gameArea.appendChild(text);

    setTimeout(() => {
        milkImg.style.transform = "translate(-50%, -50%) scale(1.4)";
        text.style.transform = "translate(-50%, -50%) scale(1)";
    }, 600);

    setTimeout(() => {
        milkImg.style.transform = "translate(-50%, -50%) scale(1.2)";
    }, 1400);

    setTimeout(() => {
        milkImg.style.transform = "translate(-50%, -50%) scale(0)";
        text.style.transform = "translate(-50%, -50%) scale(0)";
    }, 3200);

    setTimeout(() => {
        milkImg.remove();
        text.remove();
        flash.remove();
        isPaused = false;
    }, 4000);
}

/** Finalize run, persist score history, and show game-over UI. */
function endGame() {
    if (isGameOver) {
        return;
    }

    isGameOver = true;
    localStorage.setItem(`game_${gameName}_finish`, "true");

    gameArea.style.cursor = "default";
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

/** Render the latest score history into the game-over list. */
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
