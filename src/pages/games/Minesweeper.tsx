import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioManager } from '../../utils/AudioManager';
import './Minesweeper.css';

type DifficultyKey = 'easy' | 'medium' | 'hard';
type CellValue = number | 'M';

interface DifficultyConfig {
    rows: number;
    cols: number;
    mines: number;
    multiplier: number;
}

const difficulties: Record<DifficultyKey, DifficultyConfig> = {
    easy: { rows: 8, cols: 8, mines: 10, multiplier: 1 },
    medium: { rows: 10, cols: 10, mines: 20, multiplier: 1.6 },
    hard: { rows: 12, cols: 12, mines: 30, multiplier: 2.6 }
};

const INSTANT_WIN_UNLOCK_LOSSES = 5;

const Minesweeper: React.FC = () => {
    const navigate = useNavigate();

    const [difficulty, setDifficulty] = useState<DifficultyKey>('medium');
    const config = difficulties[difficulty];

    const [board, setBoard] = useState<CellValue[][]>([]);
    const [revealed, setRevealed] = useState<boolean[][]>([]);
    const [flagged, setFlagged] = useState<boolean[][]>([]);
    const [gameOver, setGameOver] = useState(false);
    const [gameLost, setGameLost] = useState(false);
    const [firstClick, setFirstClick] = useState(true);

    // Refs for touch-hold flag detection
    const holdTimerRef = useRef<number | null>(null);
    const touchMovedRef = useRef(false);
    const didFlagRef = useRef(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [flaggedCount, setFlaggedCount] = useState(0);

    const [lossCount, setLossCount] = useState(0);
    const [lossRecorded, setLossRecorded] = useState(false);
    const [showResultOverlay, setShowResultOverlay] = useState(false);
    const [lastScore, setLastScore] = useState(0);
    const [rewardCollected, setRewardCollected] = useState(false);
    const [showTutorial, setShowTutorial] = useState(true);

    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const initGame = useCallback(() => {
        const { rows, cols } = difficulties[difficulty];
        setBoard(Array(rows).fill(null).map(() => Array(cols).fill(0)));
        setRevealed(Array(rows).fill(null).map(() => Array(cols).fill(false)));
        setFlagged(Array(rows).fill(null).map(() => Array(cols).fill(false)));
        setGameOver(false);
        setGameLost(false);
        setFirstClick(true);
        setElapsedSeconds(0);
        setFlaggedCount(0);
        setLossRecorded(false);
        setShowResultOverlay(false);
        setRewardCollected(localStorage.getItem('game_minesweeper_finish') === 'true');

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        startTimeRef.current = null;
    }, [difficulty]);

    useEffect(() => {
        audioManager.initBgm('/assets/audio/BGM/bgm_minesweeper.mp3', { volume: 0.45 });
        initGame();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [initGame]);

    const placeMines = (initialRow: number, initialCol: number) => {
        const { rows, cols, mines } = difficulties[difficulty];
        const newBoard: CellValue[][] = Array(rows).fill(null).map(() => Array(cols).fill(0));

        let placed = 0;
        while (placed < mines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            if (newBoard[r][c] !== 'M' && (r !== initialRow || c !== initialCol)) {
                newBoard[r][c] = 'M';
                placed++;
            }
        }

        // Compute numbers
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (newBoard[r][c] !== 'M') {
                    let count = 0;
                    for (let rr = r - 1; rr <= r + 1; rr++) {
                        for (let cc = c - 1; cc <= c + 1; cc++) {
                            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && newBoard[rr][cc] === 'M') {
                                count++;
                            }
                        }
                    }
                    newBoard[r][c] = count;
                }
            }
        }
        return newBoard;
    };

    const startTimer = () => {
        startTimeRef.current = Date.now();
        timerRef.current = window.setInterval(() => {
            if (startTimeRef.current) {
                setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if (startTimeRef.current) {
            setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
    };

    const computeScore = () => {
        const { rows, cols, mines, multiplier } = difficulties[difficulty];
        const safeTiles = (rows * cols) - mines;
        const baseScore = (safeTiles * 12 + mines * 6) * multiplier;
        const timePenalty = elapsedSeconds * (1 + mines / 30);
        return Math.max(0, Math.round(baseScore - timePenalty));
    };

    const handleWin = () => {
        setGameOver(true);
        stopTimer();
        audioManager.playSfx('/assets/audio/SFX/minesweeper/sfx_open_chest.mp3', { volume: 0.9 });

        // Flag all mines
        setFlagged(prev => prev.map((row, r) => row.map((cell, c) => board[r][c] === 'M' || cell)));

        const score = computeScore();
        setLastScore(score);
        localStorage.setItem('game_minesweeper_score', String(score));

        // Slight delay to show overlay
        setTimeout(() => {
            setShowResultOverlay(true);
        }, 500);
    };

    const handleLoss = () => {
        setGameOver(true);
        setGameLost(true);
        stopTimer();
        audioManager.playSfx('/assets/audio/SFX/minesweeper/sfx_boom.mp3', { volume: 0.95 });

        if (!lossRecorded) {
            setLossCount(prev => prev + 1);
            setLossRecorded(true);
        }

        // Reveal all mines
        setRevealed(prev => prev.map((row, r) => row.map((cell, c) => board[r][c] === 'M' || cell)));
    };

    const checkWin = (currentRevealed: boolean[][], currentBoard: CellValue[][]) => {
        const { rows, cols, mines } = difficulties[difficulty];
        let revealedCount = 0;
        const totalSafe = (rows * cols) - mines;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (currentRevealed[r][c] && currentBoard[r][c] !== 'M') {
                    revealedCount++;
                }
            }
        }

        if (revealedCount === totalSafe) {
            return true;
        }
        return false;
    };

    const revealCell = (r: number, c: number) => {
        if (gameOver) return;
        if (!firstClick && (revealed[r][c] || flagged[r][c])) return;

        let currentBoard = board;
        if (firstClick) {
            setFirstClick(false);
            currentBoard = placeMines(r, c);
            setBoard(currentBoard);
            startTimer();
        }

        if (currentBoard[r][c] === 'M') {
            handleLoss();
            return;
        }

        audioManager.playSfx('/assets/audio/SFX/minesweeper/sfx_big_shovel.mp3', { volume: 0.65 });

        const newRevealed = [...revealed.map(row => [...row])];

        // DFS reveal
        const stack = [[r, c]];
        while (stack.length > 0) {
            const [cr, cc] = stack.pop()!;
            if (!newRevealed[cr][cc] && !flagged[cr][cc]) {
                newRevealed[cr][cc] = true;
                if (currentBoard[cr][cc] === 0) {
                    for (let nr = cr - 1; nr <= cr + 1; nr++) {
                        for (let nc = cc - 1; nc <= cc + 1; nc++) {
                            if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
                                if (!newRevealed[nr][nc] && !flagged[nr][nc]) {
                                    stack.push([nr, nc]);
                                }
                            }
                        }
                    }
                }
            }
        }

        setRevealed(newRevealed);
        if (checkWin(newRevealed, currentBoard)) {
            handleWin();
        }
    };

    const toggleFlag = (r: number, c: number, e?: React.MouseEvent | React.TouchEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (gameOver || revealed[r][c] || firstClick) return;

        const newFlagged = [...flagged.map(row => [...row])];
        newFlagged[r][c] = !newFlagged[r][c];
        setFlagged(newFlagged);

        let count = 0;
        newFlagged.forEach(row => row.forEach(f => f && count++));
        setFlaggedCount(count);
    };

    const handleRewardCollect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (rewardCollected) return;
        localStorage.setItem('game_minesweeper_finish', 'true');
        audioManager.playSfx('/assets/audio/SFX/sfx_combined_ingredients.mp3', { volume: 0.85 });
        setRewardCollected(true);
    };

    const forceWin = () => {
        // Reset game state first so forceWin works even from a game-over screen
        const { rows, cols } = difficulties[difficulty];
        let currentBoard = board;

        if (gameOver || firstClick) {
            setFirstClick(false);
            currentBoard = placeMines(0, 0);
            setBoard(currentBoard);
        }

        setGameOver(true);
        setGameLost(false);
        stopTimer();

        const newRevealed = Array(rows).fill(null).map(() => Array(cols).fill(false));
        const newFlagged = Array(rows).fill(null).map(() => Array(cols).fill(false));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (currentBoard[r][c] === 'M') {
                    newFlagged[r][c] = true;
                } else {
                    newRevealed[r][c] = true;
                }
            }
        }
        setRevealed(newRevealed);
        setFlagged(newFlagged);
        setElapsedSeconds(0);
        setShowResultOverlay(false);
        setLossRecorded(false);

        const score = computeScore();
        setLastScore(score);
        localStorage.setItem('game_minesweeper_score', String(score));

        audioManager.playSfx('/assets/audio/SFX/minesweeper/sfx_open_chest.mp3', { volume: 0.9 });

        setTimeout(() => {
            setShowResultOverlay(true);
        }, 500);
    };

    // Cell rendering
    const renderCell = (r: number, c: number) => {
        const isRev = revealed[r] && revealed[r][c];
        const isFlag = flagged[r] && flagged[r][c];
        const val = board[r] && board[r][c];
        let className = 'cell';

        if (isRev) {
            className += ' revealed';
            if (val === 'M') {
                className += ' mine';
                if (isFlag) className += ' mine-flagged';
            } else if (val !== 0) {
                className += ` safe num-${val}`;
            } else {
                className += ' safe empty-revealed';
            }
        } else if (isFlag) {
            className += ' flagged';
        }

        return (
            <div
                key={`${r}-${c}`}
                className={className}
                onClick={() => revealCell(r, c)}
                onContextMenu={(e) => toggleFlag(r, c, e)}
                onTouchStart={() => {
                    touchMovedRef.current = false;
                    didFlagRef.current = false;
                    holdTimerRef.current = window.setTimeout(() => {
                        didFlagRef.current = true;
                        toggleFlag(r, c);
                    }, 420);
                }}
                onTouchMove={() => {
                    touchMovedRef.current = true;
                    if (holdTimerRef.current) {
                        clearTimeout(holdTimerRef.current);
                        holdTimerRef.current = null;
                    }
                }}
                onTouchEnd={(e) => {
                    if (holdTimerRef.current) {
                        clearTimeout(holdTimerRef.current);
                        holdTimerRef.current = null;
                    }
                    if (didFlagRef.current || touchMovedRef.current) {
                        e.preventDefault();
                        return;
                    }
                    e.preventDefault();
                    revealCell(r, c);
                }}
            >
                {isRev && val !== 'M' && val !== 0 ? val : ''}
            </div>
        );
    };

    // Calculate cell size
    const [boardSize, setBoardSize] = useState({ width: 0, height: 0, cellSize: 0 });
    const boardAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateSize = () => {
            if (boardAreaRef.current) {
                const rect = boardAreaRef.current.getBoundingClientRect();
                const availableW = rect.width;
                const availableH = rect.height;
                const gap = 4;
                const cellW = (availableW - (config.cols - 1) * gap) / config.cols;
                const cellH = (availableH - (config.rows - 1) * gap) / config.rows;
                const size = Math.min(cellW, cellH);
                setBoardSize({
                    width: size * config.cols + gap * (config.cols - 1),
                    height: size * config.rows + gap * (config.rows - 1),
                    cellSize: size
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [config.rows, config.cols]);

    let statusText = '';
    if (gameLost) statusText = 'คนแพ้โดนหัวหอมกิน!';
    else if (gameOver) statusText = 'จบเกม!';

    return (
        <div className="minesweeper-body">
            <div className="container">
                <div className="scene" id="scene">
                    <div className="hud">
                        <h1>เกมล่าสมบัติ</h1>
                        <div className="game-info">
                            <div className="info-item">
                                <span className="label">กับดัก</span>
                                <span>{config.mines}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">ปักธง</span>
                                <span>{flaggedCount}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">เวลา</span>
                                <span>{elapsedSeconds}</span>
                            </div>
                        </div>
                    </div>

                    <div className="board-area" id="boardArea" ref={boardAreaRef}>
                        <div
                            className="game-board"
                            onContextMenu={(e) => e.preventDefault()}
                            style={{
                                gridTemplateColumns: `repeat(${config.cols}, ${boardSize.cellSize}px)`,
                                gridTemplateRows: `repeat(${config.rows}, ${boardSize.cellSize}px)`,
                                width: boardSize.width > 0 ? `${boardSize.width}px` : '100%',
                                height: boardSize.height > 0 ? `${boardSize.height}px` : '100%',
                                '--cell-size': `${boardSize.cellSize}px`
                            } as React.CSSProperties}
                        >
                            {[...Array(config.rows)].map((_, r) =>
                                [...Array(config.cols)].map((_, c) => renderCell(r, c))
                            )}
                        </div>
                    </div>

                    {statusText && (
                        <div className={`game-status ${gameLost ? 'loss' : 'win'}`}>{statusText}</div>
                    )}

                    {showTutorial && (
                        <div className="tutorial-overlay">
                            <div className="tutorial-card">
                                <h2>วิธีเล่น</h2>
                                <p>คลิกช่องเพื่อเปิด หลีกเลี่ยงกับดัก!</p>
                                <p>ตัวเลขบอกจำนวนกับดักรอบข้าง</p>
                                <p>คลิกขวาหรือแตะค้างเพื่อปักธง</p>
                                <p>เปิดช่องที่ปลอดภัยทั้งหมดเพื่อชนะ</p>
                                <button className="btn btn-primary" onClick={() => setShowTutorial(false)}>เริ่มเกม</button>
                            </div>
                        </div>
                    )}

                    <div className={`result-overlay ${showResultOverlay ? 'show' : ''}`} aria-hidden={!showResultOverlay} onClick={() => setShowResultOverlay(false)}>
                        <div className="result-card" onClick={e => e.stopPropagation()}>
                            <div className="result-title">ค้นพบวัตถุดิบ!</div>
                            <div className="result-score">คะแนน: {lastScore}</div>
                            <button
                                className={`prize-btn ${rewardCollected ? 'collected' : ''}`}
                                type="button"
                                onClick={handleRewardCollect}
                                disabled={rewardCollected}
                                aria-label="เก็บรางวัล"
                            >
                                <img src="/assets/cake-reward/sugar.png" alt="รางวัล" />
                                <span>{rewardCollected ? 'ได้รับวัตถุดิบแล้ว' : 'เก็บวัตถุดิบ'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="controls">
                    <button className="btn btn-primary" onClick={initGame}>เริ่มใหม่</button>

                    {lossCount >= INSTANT_WIN_UNLOCK_LOSSES && (
                        <button className="btn btn-secondary" onClick={forceWin}>ยอมยัง?</button>
                    )}

                    <button
                        className="btn btn-secondary back-link"
                        onClick={() => {
                            audioManager.playSfx('/assets/audio/SFX/sfx_next_page.mp3', { volume: 0.9 });
                            setTimeout(() => navigate('/game'), 120);
                        }}
                    >
                        กลับเมนูเกม
                    </button>
                    <div className="difficulty">
                        <label htmlFor="difficulty">ระดับความยาก:</label>
                        <select
                            id="difficulty"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as DifficultyKey)}
                        >
                            <option value="easy">ง่าย (8x8)</option>
                            <option value="medium">กลาง (10x10)</option>
                            <option value="hard">ยาก (12x12)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Minesweeper;
