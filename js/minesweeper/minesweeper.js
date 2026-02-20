/**
 * @typedef {number | 'M'} CellValue
 * Represents a board cell value: 0-8 for adjacent mine count, or 'M' for mine.
 */

/** @typedef {CellValue[][]} BoardGrid */
/** @typedef {boolean[][]} BooleanGrid */

/**
 * @typedef {Object} DifficultyConfig
 * @property {number} rows
 * @property {number} cols
 * @property {number} mines
 * @property {number} multiplier
 */

/**
 * Main Minesweeper game state and game logic.
 */
class Minesweeper {
    /**
     * @param {number} [rows=10]
     * @param {number} [cols=10]
     * @param {number} [mines=40]
     */
    constructor(rows = 10, cols = 10, mines = 40) {
        this.rows = rows;
        this.cols = cols;
        this.mines = mines;
        /** @type {BoardGrid} */
        this.board = [];
        /** @type {BooleanGrid} */
        this.revealed = [];
        /** @type {BooleanGrid} */
        this.flagged = [];
        this.gameOver = false;
        this.gameLost = false;
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedSeconds = 0;
        this.firstClick = true;

        this.initGame();
    }

    /**
     * Reset board state, timers, and gameplay flags for a fresh run.
     * @returns {void}
     */
    initGame() {
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.gameOver = false;
        this.gameLost = false;
        this.firstClick = true;
        this.elapsedSeconds = 0;
        this.startTime = null;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = null;
    }

    /**
     * Randomly place mines and compute adjacent mine counts.
     * @returns {void}
     */
    placeMines() {
        let placed = 0;
        while (placed < this.mines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);

            if (this.board[row][col] !== 'M') {
                this.board[row][col] = 'M';
                placed++;
            }
        }


        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] !== 'M') {
                    this.board[r][c] = this.countAdjacentMines(r, c);
                }
            }
        }
    }

    /**
     * @param {number} row
     * @param {number} col
     * @returns {number}
     */
    countAdjacentMines(row, col) {
        let count = 0;
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    if (this.board[r][c] === 'M') count++;
                }
            }
        }
        return count;
    }

    /**
     * Reveal a tile and flood-fill empty neighbors.
     * @param {number} row
     * @param {number} col
     * @returns {void}
     */
    reveal(row, col) {
        if (this.gameOver) {
            return;
        }

        if (!this.firstClick) {
            if (this.revealed[row][col] || this.flagged[row][col]) {
                return;
            }
        }


        if (this.firstClick) {
            this.firstClick = false;

            if (this.board[row][col] === 'M') {

                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.cols; c++) {
                        if (this.board[r][c] === 'M' && (r !== row || c !== col)) {
                            this.board[row][col] = 0;
                            break;
                        }
                    }
                }
            }
            this.placeMines();
            this.startTimer();
        }

        if (this.revealed[row][col] || this.flagged[row][col]) {
            return;
        }

        this.revealed[row][col] = true;

        if (this.board[row][col] === 'M') {
            this.gameLost = true;
            this.gameOver = true;
            this.revealAllMines();
            this.stopTimer();
            return;
        }

        if (this.board[row][col] === 0) {

            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                        if (!this.revealed[r][c] && !this.flagged[r][c]) {
                            this.reveal(r, c);
                        }
                    }
                }
            }
        }

        this.checkWin();
    }

    /**
     * Toggle flag marker on a covered cell.
     * @param {number} row
     * @param {number} col
     * @returns {void}
     */
    toggleFlag(row, col) {
        if (this.revealed[row][col] || this.gameOver || this.firstClick) {
            return;
        }

        this.flagged[row][col] = !this.flagged[row][col];
    }

    /**
     * Reveal all mine cells, typically on loss.
     * @returns {void}
     */
    revealAllMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === 'M') {
                    this.revealed[r][c] = true;
                }
            }
        }
    }

    /**
     * Check whether all safe cells are revealed and end game if won.
     * @returns {void}
     */
    checkWin() {
        let revealedCount = 0;
        const totalSafe = this.rows * this.cols - this.mines;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.revealed[r][c] && this.board[r][c] !== 'M') {
                    revealedCount++;
                }
            }
        }

        if (revealedCount === totalSafe) {
            this.gameOver = true;
            this.flagAllMines();
            this.stopTimer();
        }
    }

    /**
     * Mark all mines as flagged after a successful completion.
     * @returns {void}
     */
    flagAllMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === 'M') {
                    this.flagged[r][c] = true;
                }
            }
        }
    }

    /**
     * Start elapsed-time counter for active round.
     * @returns {void}
     */
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.elapsedSeconds = elapsed;
            document.getElementById('timer').textContent = elapsed;
        }, 100);
    }

    /**
     * Stop elapsed-time counter and preserve final elapsed value.
     * @returns {void}
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = null;
        if (this.startTime) {
            this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('timer').textContent = this.elapsedSeconds;
        }
    }

    /**
     * Count currently flagged cells.
     * @returns {number}
     */
    getFlaggedCount() {
        let count = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.flagged[r][c]) count++;
            }
        }
        return count;
    }
}

let game;

/** @type {Record<string, DifficultyConfig>} */
const difficulties = {
    easy: { rows: 8, cols: 8, mines: 10, multiplier: 1 },
    medium: { rows: 10, cols: 10, mines: 40, multiplier: 1.6 },
    hard: { rows: 12, cols: 12, mines: 99, multiplier: 2.6 }
};

const boardElement = document.getElementById('gameBoard');
const boardArea = document.getElementById('boardArea');
const statusElement = document.getElementById('gameStatus');
const mineCountElement = document.getElementById('mineCount');
const flagCountElement = document.getElementById('flagCount');
const timerElement = document.getElementById('timer');
const resultOverlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultScore = document.getElementById('resultScore');
const prizeBtn = document.getElementById('prizeBtn');
const prizeBtnLabel = prizeBtn.querySelector('span');
const newGameBtn = document.getElementById('newGameBtn');
const backLink = document.querySelector('.back-link');

const BGM_MINESWEEPER = '../assets/audio/BGM/bgm_minesweeper.mp3';
const SFX_BIG_SHOVEL = '../assets/audio/SFX/minesweeper/sfx_big_shovel.mp3';
const SFX_BOOM = '../assets/audio/SFX/minesweeper/sfx_boom.mp3';
const SFX_OPEN_CHEST = '../assets/audio/SFX/minesweeper/sfx_open_chest.mp3';
const SFX_NEXT_PAGE = '../assets/audio/SFX/sfx_next_page.mp3';
const SFX_COMBINED_INGREDIENTS = '../assets/audio/SFX/sfx_combined_ingredients.mp3';

if (window.GameAudio) {
    window.GameAudio.initBgm(BGM_MINESWEEPER, { volume: 0.45 });
}

const instantWinUnlockLosses = 5;
let lossCount = 0;

let instantWinBtn = document.getElementById('instantWinBtn');
if (!instantWinBtn && newGameBtn) {
    instantWinBtn = document.createElement('button');
    instantWinBtn.id = 'instantWinBtn';
    instantWinBtn.className = 'btn btn-secondary';
    instantWinBtn.type = 'button';
    instantWinBtn.textContent = 'ยอมยัง?';
    newGameBtn.insertAdjacentElement('afterend', instantWinBtn);
}
if (instantWinBtn) {
    instantWinBtn.style.display = 'none';
    instantWinBtn.disabled = true;
}

let lastScore = 0;
const TOUCH_FLAG_HOLD_MS = 420;
let suppressClickUntil = 0;
let hasPlayedLoseSfx = false;
let hasPlayedWinSfx = false;

/**
 * Get a valid difficulty config from the selected dropdown value.
 * Falls back to `medium` when value is unknown.
 * @param {string} difficultyKey
 * @returns {DifficultyConfig}
 */
function getDifficultyConfig(difficultyKey) {
    return difficulties[difficultyKey] || difficulties.medium;
}

/**
 * Toggle visibility and enabled state of the instant-win helper button.
 * @returns {void}
 */
function updateInstantWinButtonVisibility() {
    if (!instantWinBtn) return;
    const shouldShow = lossCount >= instantWinUnlockLosses;
    instantWinBtn.style.display = shouldShow ? '' : 'none';
    instantWinBtn.disabled = !shouldShow;
}

/**
 * Register a loss only once per finished losing game.
 * @returns {void}
 */
function registerLoss() {
    if (!game || !game.gameLost) return;
    if (game.lossRecorded) return;
    game.lossRecorded = true;
    lossCount += 1;
    updateInstantWinButtonVisibility();
}

/**
 * Initialize game state from selected difficulty and refresh board UI.
 * @returns {void}
 */
function initializeGame() {
    if (game && game.timerInterval) {
        clearInterval(game.timerInterval);
        game.timerInterval = null;
    }
    const difficulty = document.getElementById('difficulty').value;
    const { rows, cols, mines, multiplier } = getDifficultyConfig(difficulty);

    game = new Minesweeper(rows, cols, mines);
    game.difficultyKey = difficulty;
    game.difficultyMultiplier = multiplier;
    game.lossRecorded = false;
    mineCountElement.textContent = mines;
    timerElement.textContent = '0';
    flagCountElement.textContent = '0';
    statusElement.textContent = '';
    statusElement.classList.remove('win', 'loss');
    resetResultOverlay();
    hasPlayedLoseSfx = false;
    hasPlayedWinSfx = false;

    renderBoard();
    updateInstantWinButtonVisibility();
}

/**
 * Compute score based on board complexity and completion time.
 * @param {number} elapsedSeconds
 * @returns {number}
 */
function computeScore(elapsedSeconds) {
    const totalTiles = game.rows * game.cols;
    const safeTiles = totalTiles - game.mines;
    const difficultyBoost = game.difficultyMultiplier || 1;
    const baseScore = (safeTiles * 12 + game.mines * 6) * difficultyBoost;
    const timePenalty = elapsedSeconds * (1 + game.mines / 30);
    return Math.max(0, Math.round(baseScore - timePenalty));
}

/**
 * Force a win state for unlocked helper action.
 * @returns {void}
 */
function forceWin() {
    if (!game || game.gameOver) return;
    if (game.firstClick) {
        game.firstClick = false;
        game.placeMines();
    }
    for (let r = 0; r < game.rows; r++) {
        for (let c = 0; c < game.cols; c++) {
            if (game.board[r][c] === 'M') {
                game.flagged[r][c] = true;
            } else {
                game.revealed[r][c] = true;
            }
        }
    }
    game.gameOver = true;
    game.gameLost = false;
    game.stopTimer();
    renderBoard();
    updateGameStatus();
}

/**
 * Size CSS grid cells to fit available board area.
 * @returns {void}
 */
function sizeBoardToArea() {
    const rect = boardArea.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const styles = getComputedStyle(boardElement);
    const gap = parseFloat(styles.gap) || 0;
    const paddingX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const paddingY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
    const availableWidth = rect.width - paddingX - gap * (game.cols - 1);
    const availableHeight = rect.height - paddingY - gap * (game.rows - 1);
    const cellWidth = availableWidth / game.cols;
    const cellHeight = availableHeight / game.rows;
    boardElement.style.gridTemplateColumns = `repeat(${game.cols}, ${cellWidth}px)`;
    boardElement.style.gridTemplateRows = `repeat(${game.rows}, ${cellHeight}px)`;
    boardElement.style.width = `${rect.width}px`;
    boardElement.style.height = `${rect.height}px`;
    boardElement.style.setProperty('--cell-size', `${Math.min(cellWidth, cellHeight)}px`);
}

/**
 * Reset reward/result overlay to default hidden state.
 * @returns {void}
 */
function resetResultOverlay() {
    resultOverlay.classList.remove('show');
    resultOverlay.setAttribute('aria-hidden', 'true');
    resultTitle.textContent = 'เจอสมบัติแล้ว!';
    resultScore.textContent = 'คะแนน: 0';
    prizeBtn.classList.remove('collected');
    prizeBtnLabel.textContent = 'กดเพื่อเก็บวัตถุดิบ';
    prizeBtn.disabled = false;
}

/**
 * Reveal a cell and refresh UI.
 * @param {number} row
 * @param {number} col
 */
function revealCellAt(row, col) {
    if (!game || game.gameOver) return;
    const wasRevealed = game.revealed[row][col];
    const wasFlagged = game.flagged[row][col];
    game.reveal(row, col);
    if (!wasRevealed && !wasFlagged) {
        if (game.gameLost) {
            hasPlayedLoseSfx = true;
            window.GameAudio?.playSfx(SFX_BOOM, { volume: 0.95 });
        } else {
            window.GameAudio?.playSfx(SFX_BIG_SHOVEL, { volume: 0.65 });
        }
    }
    renderBoard();
    updateGameStatus();
}

/**
 * Toggle flag on a cell and refresh UI.
 * @param {number} row
 * @param {number} col
 */
function toggleFlagAt(row, col) {
    if (!game || game.gameOver) return;
    game.toggleFlag(row, col);
    renderBoard();
}

/**
 * Render all board cells and attach click/touch interactions.
 * @returns {void}
 */
function renderBoard() {
    boardElement.innerHTML = '';

    for (let r = 0; r < game.rows; r++) {
        for (let c = 0; c < game.cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            if (game.revealed[r][c]) {
                cell.classList.add('revealed');
                if (game.board[r][c] === 'M') {
                    cell.classList.add('mine');
                    // Keep a visual flag marker when this bomb chest was flagged.
                    if (game.flagged[r][c]) {
                        cell.classList.add('mine-flagged');
                    }
                    cell.textContent = '';
                } else if (game.board[r][c] > 0) {
                    cell.classList.add('safe');
                    cell.classList.add(`num-${game.board[r][c]}`);
                    cell.textContent = game.board[r][c];
                } else {
                    cell.classList.add('safe');
                    cell.classList.add('empty-revealed');
                }
            } else if (game.flagged[r][c]) {
                cell.classList.add('flagged');
            }

            cell.addEventListener('click', () => {
                if (Date.now() < suppressClickUntil) return;
                revealCellAt(r, c);
            });

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (Date.now() < suppressClickUntil) return;
                toggleFlagAt(r, c);
            });

            let touchHoldTimer = null;
            let touchMoved = false;
            let longPressTriggered = false;
            let startX = 0;
            let startY = 0;

            cell.addEventListener('touchstart', (e) => {
                if (!game || game.gameOver) return;
                if (e.touches.length !== 1) return;

                longPressTriggered = false;
                touchMoved = false;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;

                touchHoldTimer = setTimeout(() => {
                    longPressTriggered = true;
                    suppressClickUntil = Date.now() + 700;
                    toggleFlagAt(r, c);
                }, TOUCH_FLAG_HOLD_MS);
            }, { passive: true });

            cell.addEventListener('touchmove', (e) => {
                if (!touchHoldTimer || e.touches.length !== 1) return;
                const dx = Math.abs(e.touches[0].clientX - startX);
                const dy = Math.abs(e.touches[0].clientY - startY);
                if (dx > 10 || dy > 10) {
                    touchMoved = true;
                    clearTimeout(touchHoldTimer);
                    touchHoldTimer = null;
                }
            }, { passive: true });

            cell.addEventListener('touchend', (e) => {
                if (touchHoldTimer) {
                    clearTimeout(touchHoldTimer);
                    touchHoldTimer = null;
                }

                if (longPressTriggered || touchMoved) {
                    e.preventDefault();
                    return;
                }

                e.preventDefault();
                suppressClickUntil = Date.now() + 500;
                revealCellAt(r, c);
            }, { passive: false });

            cell.addEventListener('touchcancel', () => {
                if (touchHoldTimer) {
                    clearTimeout(touchHoldTimer);
                    touchHoldTimer = null;
                }
                touchMoved = false;
                longPressTriggered = false;
            }, { passive: true });

            boardElement.appendChild(cell);
        }
    }

    sizeBoardToArea();
    updateFlagCount();
}

/**
 * Update flag counter display from current game state.
 * @returns {void}
 */
function updateFlagCount() {
    flagCountElement.textContent = game.getFlaggedCount();
}

/**
 * Update game status text/overlay based on win-loss state transitions.
 * @returns {void}
 */
function updateGameStatus() {
    if (game.gameLost) {
        statusElement.textContent = 'คนแพ้โดนหัวหอมกิน!';
        statusElement.classList.add('loss');
        statusElement.classList.remove('win');
        resultOverlay.classList.remove('show');
        resultOverlay.setAttribute('aria-hidden', 'true');
        game.stopTimer();
        if (!hasPlayedLoseSfx) {
            hasPlayedLoseSfx = true;
            window.GameAudio?.playSfx(SFX_BOOM, { volume: 0.95 });
        }
        registerLoss();
    } else if (game.gameOver && !game.gameLost) {
        statusElement.textContent = 'จบเกม!';
        statusElement.classList.add('win');
        statusElement.classList.remove('loss');
        lastScore = computeScore(game.elapsedSeconds);
        resultScore.textContent = `Score: ${lastScore}`;
        localStorage.setItem('game_minesweeper_score', String(lastScore));
        const alreadyCollected = localStorage.getItem('game_minesweeper_finish') === 'true';
        if (alreadyCollected) {
            prizeBtn.classList.add('collected');
            prizeBtnLabel.textContent = 'ได้รับวัตถุดิบแล้ว';
            prizeBtn.disabled = true;
        } else {
            prizeBtn.classList.remove('collected');
            prizeBtnLabel.textContent = 'ได้รับวัตถุดิบแล้ว';
            prizeBtn.disabled = false;
        }
        resultOverlay.classList.add('show');
        resultOverlay.setAttribute('aria-hidden', 'false');
        if (!hasPlayedWinSfx) {
            hasPlayedWinSfx = true;
            window.GameAudio?.playSfx(SFX_OPEN_CHEST, { volume: 0.9 });
        }
    } else {
        statusElement.textContent = '';
        statusElement.classList.remove('win', 'loss');
        resultOverlay.classList.remove('show');
        resultOverlay.setAttribute('aria-hidden', 'true');
    }
}

newGameBtn.addEventListener('click', () => {
    initializeGame();
});

document.getElementById('difficulty').addEventListener('change', () => {
    initializeGame();
});

if (instantWinBtn) {
    instantWinBtn.addEventListener('click', () => {
        initializeGame();
        forceWin();
    });
}

resultOverlay.addEventListener('click', () => {
    if (!resultOverlay.classList.contains('show')) return;
    resultOverlay.classList.remove('show');
    resultOverlay.setAttribute('aria-hidden', 'true');
});

prizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const alreadyCollected = localStorage.getItem('game_minesweeper_finish') === 'true';
    if (alreadyCollected) return;
    if (!game || !game.gameOver || game.gameLost) return;
    localStorage.setItem('game_minesweeper_finish', 'true');
    window.GameAudio?.playSfx(SFX_COMBINED_INGREDIENTS, { volume: 0.85 });
    prizeBtn.classList.add('collected');
    prizeBtnLabel.textContent = 'เก็บวัตถุดิบสำเร็จ';
    prizeBtn.disabled = true;
});

if (backLink) {
    backLink.addEventListener('click', (e) => {
        const href = backLink.getAttribute('href');
        if (!href) return;
        e.preventDefault();
        window.GameAudio?.playSfx(SFX_NEXT_PAGE, { volume: 0.9 });
        setTimeout(() => {
            window.location.href = href;
        }, 120);
    });
}

window.addEventListener('resize', () => {
    if (game) sizeBoardToArea();
});

initializeGame();
