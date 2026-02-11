class Minesweeper {
    constructor(rows = 10, cols = 10, mines = 40) {
        this.rows = rows;
        this.cols = cols;
        this.mines = mines;
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.gameLost = false;
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedSeconds = 0;
        this.firstClick = true;

        this.initGame();
    }

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

    toggleFlag(row, col) {
        if (this.revealed[row][col] || this.gameOver || this.firstClick) {
            return;
        }

        this.flagged[row][col] = !this.flagged[row][col];
    }

    revealAllMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === 'M') {
                    this.revealed[r][c] = true;
                }
            }
        }
    }

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

    flagAllMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === 'M') {
                    this.flagged[r][c] = true;
                }
            }
        }
    }

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

const instantWinUnlockLosses = 3;
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

function updateInstantWinButtonVisibility() {
    if (!instantWinBtn) return;
    const shouldShow = lossCount >= instantWinUnlockLosses;
    instantWinBtn.style.display = shouldShow ? '' : 'none';
    instantWinBtn.disabled = !shouldShow;
}

function registerLoss() {
    if (!game || !game.gameLost) return;
    if (game.lossRecorded) return;
    game.lossRecorded = true;
    lossCount += 1;
    updateInstantWinButtonVisibility();
}

function initializeGame() {
    if (game && game.timerInterval) {
        clearInterval(game.timerInterval);
        game.timerInterval = null;
    }
    const difficulty = document.getElementById('difficulty').value;
    const { rows, cols, mines, multiplier } = difficulties[difficulty];

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

    renderBoard();
    updateInstantWinButtonVisibility();
}

function computeScore(elapsedSeconds) {
    const totalTiles = game.rows * game.cols;
    const safeTiles = totalTiles - game.mines;
    const difficultyBoost = game.difficultyMultiplier || 1;
    const baseScore = (safeTiles * 12 + game.mines * 6) * difficultyBoost;
    const timePenalty = elapsedSeconds * (1 + game.mines / 30);
    return Math.max(0, Math.round(baseScore - timePenalty));
}

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

function resetResultOverlay() {
    resultOverlay.classList.remove('show');
    resultOverlay.setAttribute('aria-hidden', 'true');
    resultTitle.textContent = 'เจอสมบัติแล้ว!';
    resultScore.textContent = 'คะแนน: 0';
    prizeBtn.classList.remove('collected');
    prizeBtnLabel.textContent = 'กดเพื่อเก็บวัตถุดิบ';
    prizeBtn.disabled = false;
}

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
                if (!game.gameOver) {
                    game.reveal(r, c);
                    renderBoard();
                    updateGameStatus();
                }
            });

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!game.gameOver) {
                    game.toggleFlag(r, c);
                    renderBoard();
                }
            });

            boardElement.appendChild(cell);
        }
    }

    sizeBoardToArea();
    updateFlagCount();
}

function updateFlagCount() {
    flagCountElement.textContent = game.getFlaggedCount();
}

function updateGameStatus() {
    if (game.gameLost) {
        statusElement.textContent = 'คนแพ้โดนหัวหอมกิน!';
        statusElement.classList.add('loss');
        statusElement.classList.remove('win');
        resultOverlay.classList.remove('show');
        resultOverlay.setAttribute('aria-hidden', 'true');
        game.stopTimer();
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
    prizeBtn.classList.add('collected');
    prizeBtnLabel.textContent = 'เก็บวัตถุดิบสำเร็จ';
    prizeBtn.disabled = true;
});

window.addEventListener('resize', () => {
    if (game) sizeBoardToArea();
});

initializeGame();
