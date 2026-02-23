import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioManager } from '../../utils/AudioManager';
import './TargetShooting.css';

interface Target {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    isBait: boolean;
    image: string;
    hitImage?: string;
    isHit: boolean;
}

const Images = [
    { normal: "/assets/shooting/tomato1.png", hit: "/assets/shooting/tomato2.png" },
    { normal: "/assets/shooting/eggplant1.png", hit: "/assets/shooting/eggplant2.png" },
    { normal: "/assets/shooting/potato1.png", hit: "/assets/shooting/potato2.png" },
    { normal: "/assets/shooting/onion1.png", hit: "/assets/shooting/onion2.png" }
];

const baitImages = [
    "/assets/shooting/fish.png",
    "/assets/shooting/mama.png",
    "/assets/shooting/milk.png"
];

const TIME_LIMIT_SECONDS = 2 * 60 + 22; // 142 seconds
const REWARD_THRESHOLD_SCORE = 22;
const rewardScoreStorageKey = "game_target_shooting_score";
const REWARD_CAN_COLLECTED_KEY = 'game_target_shooting_can_collected';

const TargetShooting: React.FC = () => {
    const navigate = useNavigate();

    const [gameState, setGameState] = useState<'start' | 'tutorial' | 'playing' | 'gameover'>('start');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(5);
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
    const [highScore, setHighScore] = useState(0);

    const [targets, setTargets] = useState<Target[]>([]);
    const [showResultOverlay, setShowResultOverlay] = useState(false);
    const [rewardCollected, setRewardCollected] = useState(false);
    const [canCollect, setCanCollect] = useState(false);
    const [history, setHistory] = useState<{ score: number, date: string }[]>([]);

    // Cursor state
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [cursorVisible, setCursorVisible] = useState(false);
    const [cursorSwing, setCursorSwing] = useState(false);

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);
    const waveTimerRef = useRef<number | null>(null);
    const renderFrameRef = useRef<number | null>(null);

    const scoreRef = useRef(0);
    const spawnCountRef = useRef(1);
    const zeroStartTimeRef = useRef<number | null>(null);

    useEffect(() => {
        audioManager.initBgm('/assets/audio/BGM/bgm_target_shooting.mp3', { volume: 0.45 });

        setHighScore(parseInt(localStorage.getItem('game_ShootingGame_maxScore') || '0', 10));

        const alreadyCollected = localStorage.getItem('game_target_shooting_finish') === 'true';
        setRewardCollected(alreadyCollected);

        // Mark as can-collect if player qualified but didn't collect
        if (!alreadyCollected && localStorage.getItem(REWARD_CAN_COLLECTED_KEY) === 'true') {
            setCanCollect(true);
        }

        try {
            const raw = localStorage.getItem('game_ShootingGame_history');
            if (raw) setHistory(JSON.parse(raw));
        } catch {
            setHistory([]);
        }

        return () => {
            stopAllTimers();
        };
    }, []);

    const stopAllTimers = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
        if (renderFrameRef.current) cancelAnimationFrame(renderFrameRef.current);
        timerRef.current = null;
        waveTimerRef.current = null;
        renderFrameRef.current = null;
    }, []);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const spawnTarget = useCallback(() => {
        if (!gameAreaRef.current) return;

        const w = Math.max(gameAreaRef.current.clientWidth, 120);
        const h = Math.max(gameAreaRef.current.clientHeight, 120);
        const spawnFromEdge = Math.random() < 0.6;

        let x = 0, y = 0, vx = 0, vy = 0;

        if (!spawnFromEdge) {
            x = Math.random() * (w - 60);
            y = Math.random() * (h - 60);
            vx = Math.random() * 4 - 2;
            vy = Math.random() * 4 - 2;
        } else {
            const side = Math.floor(Math.random() * 4);
            switch (side) {
                case 0: x = Math.random() * w; y = -60; break;
                case 1: x = w + 60; y = Math.random() * h; break;
                case 2: x = Math.random() * w; y = h + 60; break;
                case 3: x = -60; y = Math.random() * h; break;
            }
            const centerX = w / 2;
            const centerY = h / 2;
            const dx = centerX - x;
            const dy = centerY - y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const speed = Math.random() * 3 + 2;
            vx = (dx / length) * speed;
            vy = (dy / length) * speed;
        }

        const isBait = Math.random() < 0.25;
        let image = '', hitImage = '';

        if (isBait) {
            image = baitImages[Math.floor(Math.random() * baitImages.length)];
        } else {
            const veggie = Images[Math.floor(Math.random() * Images.length)];
            image = veggie.normal;
            hitImage = veggie.hit;
        }

        const newTarget: Target = {
            id: `target-${Date.now()}-${Math.random()}`,
            x, y, vx, vy, isBait, image, hitImage, isHit: false
        };

        setTargets(prev => [...prev, newTarget]);
    }, []);

    const spawnWave = useCallback(() => {
        let amount = 0;

        if (spawnCountRef.current === 0) {
            if (!zeroStartTimeRef.current) zeroStartTimeRef.current = Date.now();
            const elapsed = (Date.now() - zeroStartTimeRef.current) / 1000;
            if (elapsed >= 30) {
                amount = 4;
                zeroStartTimeRef.current = null;
            } else {
                amount = 3;
            }
        } else {
            amount = spawnCountRef.current;
            zeroStartTimeRef.current = null;
        }

        for (let i = 0; i < amount; i++) {
            setTimeout(() => spawnTarget(), i * 150);
        }
    }, [spawnTarget]);

    const scheduleNextWave = useCallback(() => {
        spawnWave();
        waveTimerRef.current = window.setTimeout(scheduleNextWave, 2000);
    }, [spawnWave]);

    const updatePositions = useCallback(() => {
        if (!gameAreaRef.current) return;
        const w = gameAreaRef.current.clientWidth;
        const h = gameAreaRef.current.clientHeight;

        setTargets(prev =>
            prev
                .map(t => {
                    if (t.isHit) return t; // Don't move hit targets
                    return { ...t, x: t.x + t.vx, y: t.y + t.vy };
                })
                .filter(t => {
                    if (t.isHit) return true; // keep briefly
                    return !(t.x < -100 || t.x > w + 100 || t.y < -100 || t.y > h + 100);
                })
        );

        renderFrameRef.current = requestAnimationFrame(updatePositions);
    }, []);

    const endGame = useCallback((reason: 'pass' | 'fail' | 'timeout') => {
        stopAllTimers();
        setGameState('gameover');
        setTargets([]);

        const finalScore = scoreRef.current;
        if (finalScore > highScore) {
            setHighScore(finalScore);
            localStorage.setItem('game_ShootingGame_maxScore', String(finalScore));
        }

        const didPass = reason === 'pass';
        localStorage.setItem(rewardScoreStorageKey, String(finalScore));

        const newHistory = [{ score: finalScore, date: new Date().toLocaleString() }, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('game_ShootingGame_history', JSON.stringify(newHistory));

        if (finalScore > REWARD_THRESHOLD_SCORE || didPass) {
            audioManager.playSfx('/assets/audio/SFX/sfx_win_the_game.mp3', { volume: 0.9 });
            if (didPass) localStorage.setItem(REWARD_CAN_COLLECTED_KEY, 'true');
            setShowResultOverlay(true);
        }
    }, [highScore, history, stopAllTimers]);

    const beginGame = () => {
        setGameState('playing');
        setScore(0);
        setLives(5);
        setTimeLeft(TIME_LIMIT_SECONDS);
        setTargets([]);
        setShowResultOverlay(false);

        scoreRef.current = 0;
        spawnCountRef.current = 1;
        zeroStartTimeRef.current = null;

        stopAllTimers();

        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame(lives > 0 ? 'pass' : 'timeout');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        scheduleNextWave();
        renderFrameRef.current = requestAnimationFrame(updatePositions);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (gameState !== 'playing') return;

        // Swing cursor
        setCursorSwing(true);
        setTimeout(() => setCursorSwing(false), 90);

        const isTarget = (e.target as HTMLElement).closest('.target');
        if (!isTarget) {
            audioManager.playSfx('/assets/audio/SFX/target-shooting/sfx_shoot_air.mp3', { volume: 0.55 });
        }
    };

    const handleTargetClick = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (gameState !== 'playing') return;

        const targetIndex = targets.findIndex(t => t.id === id);
        if (targetIndex === -1 || targets[targetIndex].isHit) return;

        const target = targets[targetIndex];
        setTargets(prev => {
            const next = [...prev];
            next[targetIndex].isHit = true;
            return next;
        });

        if (target.isBait) {
            audioManager.playSfx('/assets/audio/SFX/target-shooting/sfx_shoot_incorrect.mp3', { volume: 0.85 });
            setLives(prev => {
                const next = prev - 1;
                if (next <= 0) setTimeout(() => endGame('fail'), 0);
                return next;
            });

            setTimeout(() => {
                setTargets(prev => prev.filter(t => t.id !== id));
            }, 150);
        } else {
            audioManager.playSfx('/assets/audio/SFX/target-shooting/sfx_shoot_correct.mp3', { volume: 0.8 });
            setScore(prev => {
                const next = prev + 1;
                scoreRef.current = next;

                if (next > REWARD_THRESHOLD_SCORE) {
                    localStorage.setItem(rewardScoreStorageKey, String(next));
                    localStorage.setItem(REWARD_CAN_COLLECTED_KEY, 'true');
                }

                spawnCountRef.current = Math.floor(next / 10) + 1;
                if (spawnCountRef.current > 3) spawnCountRef.current = 0;

                return next;
            });

            setTimeout(() => {
                setTargets(prev => prev.filter(t => t.id !== id));
            }, 500);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (gameState !== 'playing') return;
        if (gameAreaRef.current) {
            const rect = gameAreaRef.current.getBoundingClientRect();
            setCursorPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setCursorVisible(true);
        }
    };

    const handleRewardCollect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (rewardCollected) return;
        localStorage.setItem('game_target_shooting_finish', 'true');
        localStorage.removeItem(REWARD_CAN_COLLECTED_KEY);
        setRewardCollected(true);
        setCanCollect(false);
        audioManager.playSfx('/assets/audio/SFX/sfx_combined_ingredients.mp3', { volume: 0.85 });
    };

    return (
        <div className="target-shooting-body">
            <div id="gameWrapper">
                <div className="shooting-header">
                    <a href="/game" className="back-menu-btn" aria-label="กลับไปเมนูเกม" onClick={(e) => {
                        e.preventDefault();
                        audioManager.playSfx('/assets/audio/SFX/sfx_next_page.mp3', { volume: 0.9 });
                        setTimeout(() => navigate('/game'), 120);
                    }}>← กลับเมนูเกม</a>
                    <h1>ยิงเป้า 🎯</h1>

                    <div style={{ flexGrow: 1 }}></div>

                    <div id="scoreHUD">
                        <div className="row">
                            <span className="label">คะแนน</span>
                            <span className="value">{score}</span>
                        </div>
                        <div className="row">
                            <span className="label">เวลา</span>
                            <span className="value">{formatTime(timeLeft)}</span>
                        </div>
                        <div className="row">
                            <span className="label">คะแนนสูงสุด</span>
                            <span className="value">{highScore}</span>
                        </div>
                        <div className="row">
                            <span className="label">ชีวิต</span>
                            <span className="value lives-value">
                                {[...Array(Math.max(0, lives))].map((_, i) => (
                                    <span key={i} className="heartIcon" aria-hidden="true">❤️</span>
                                ))}
                            </span>
                        </div>
                    </div>
                </div>

                <div id="playZone"
                    ref={gameAreaRef}
                    onPointerEnter={() => setCursorVisible(true)}
                    onPointerMove={handlePointerMove}
                    onPointerLeave={() => setCursorVisible(false)}
                    onPointerDown={handlePointerDown}
                    style={{ cursor: gameState === 'playing' ? 'none' : 'default' }}
                >
                    <div id="gameArea">
                        {targets.map(t => (
                            <div
                                key={t.id}
                                className="target"
                                style={{
                                    transform: `translate(${t.x}px, ${t.y}px)`,
                                    backgroundImage: `url("${t.isHit && !t.isBait ? t.hitImage : t.image}")`,
                                    opacity: t.isHit && t.isBait ? 0.6 : 1,
                                    pointerEvents: t.isHit ? 'none' : 'auto'
                                }}
                                onPointerDown={(e) => handleTargetClick(e, t.id)}
                            />
                        ))}
                    </div>

                    <img
                        src="/assets/shooting/cursor.png"
                        alt="cursor"
                        className={`shooting-cursor ${cursorVisible && gameState === 'playing' ? 'show' : ''} ${cursorSwing ? 'swing' : ''}`}
                        style={{ left: cursorPos.x, top: cursorPos.y }}
                        aria-hidden="true"
                    />

                    {gameState === 'start' && (
                        <div className="screen">
                            <div className="screen-card" onPointerDown={e => e.stopPropagation()}>
                                <h2>เกมยิงเป้า</h2>
                                <button onClick={() => setGameState('tutorial')}>เริ่มเกม</button>
                                {canCollect && !rewardCollected && (
                                    <button onClick={() => setShowResultOverlay(true)}>🎁 เก็บรางวัล</button>
                                )}
                            </div>
                        </div>
                    )}

                    {gameState === 'tutorial' && (
                        <div className="screen">
                            <div className="screen-card" onPointerDown={e => e.stopPropagation()}>
                                <h2>วิธีเล่น</h2>
                                <p>ยิงผักเพื่อรับคะแนน</p>
                                <p>ยิงอย่างอื่นเสียหัวใจ</p>
                                <p>หมดใจ = เกมจบนะจ๊ะ</p>
                                <button onClick={beginGame}>เริ่ม!</button>
                            </div>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="screen">
                            <div className="screen-card" onPointerDown={e => e.stopPropagation()}>
                                <h2>เกมจบแล้ว</h2>
                                <h3>คะแนน: <span id="finalScore">{score}</span></h3>

                                <h3>ประวัติการเล่น</h3>
                                <ul id="historyList">
                                    {history.map((h, i) => <li key={i}>{h.score} - {h.date}</li>)}
                                </ul>

                                <button onClick={beginGame}>เล่นอีกครั้ง</button>
                                {canCollect && !rewardCollected && (
                                    <button onClick={() => setShowResultOverlay(true)}>🎁 เก็บรางวัล</button>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        className={`result-overlay ${showResultOverlay ? 'show' : ''}`}
                        aria-hidden={!showResultOverlay}
                        onClick={() => setShowResultOverlay(false)}
                    >
                        <div className="result-card" onClick={e => e.stopPropagation()}>
                            <div className="result-title">ปลดล็อกรางวัลแล้ว!</div>
                            <div className="result-score">คะแนน: {score} (ต้องมากกว่า {REWARD_THRESHOLD_SCORE} หรือผ่านด่าน)</div>
                            <button
                                className={`prize-btn ${rewardCollected ? 'collected' : ''}`}
                                type="button"
                                onClick={handleRewardCollect}
                                disabled={rewardCollected}
                            >
                                <img src="/assets/cake-reward/milk.png" alt="รางวัล" />
                                <span>{rewardCollected ? 'เก็บรางวัลไปแล้ว' : 'เก็บรางวัล'}</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TargetShooting;
