import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioManager } from '../../utils/AudioManager';
import './WhackAMole.css';

const ASSET_BASE = "/assets/whack-a-mole";

const CHARACTERS = [
    "canon", "eggplant", "eve", "kris", "mei", "onion", "potato", "tomato"
];
const DANGEROUS_CHARACTERS = new Set(["canon", "eve", "kris", "mei"]);
const VEGETABLE_CHARACTERS = new Set(["eggplant", "onion", "potato", "tomato"]);

const HOLE_POSITIONS = [
    { x: 20.9, y: 28.5, w: 20, h: 34 },
    { x: 12.2, y: 79.8, w: 19, h: 33 },
    { x: 34.2, y: 67.9, w: 20, h: 34 },
    { x: 56.7, y: 37.2, w: 20, h: 34 },
    { x: 87.2, y: 29.6, w: 20, h: 34 },
    { x: 72.2, y: 79.3, w: 20, h: 34 },
];

const MAX_HEALTH = 5;
const GAME_DURATION = 142;
const REWARD_THRESHOLD_SCORE = 22;

const DIFFICULTY_PRESETS = {
    easy: { label: "ง่าย", moleMinTime: 750, moleMaxTime: 1300, spawnInterval: 900 },
    normal: { label: "ปกติ", moleMinTime: 750, moleMaxTime: 1300, spawnInterval: 900 },
    hard: { label: "ยาก", moleMinTime: 260, moleMaxTime: 700, spawnInterval: 420 },
};

interface ActiveMole {
    holeIndex: number;
    character: string;
    spawnId: number;
    isHit: boolean;
}

const WhackAMole: React.FC = () => {
    const navigate = useNavigate();

    const [gameState, setGameState] = useState<'loading' | 'ready' | 'playing' | 'gameover'>('loading');
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(MAX_HEALTH);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [bestScore, setBestScore] = useState(0);
    const [statusMessage, setStatusMessage] = useState("กำลังโหลดรูปภาพ...");
    const [statusType, setStatusType] = useState<'' | 'good' | 'danger'>('');
    const [activeMole, setActiveMole] = useState<ActiveMole | null>(null);

    const [showResultOverlay, setShowResultOverlay] = useState(false);
    const [rewardCollected, setRewardCollected] = useState(false);

    // Hammer state
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [cursorVisible, setCursorVisible] = useState(false);
    const [hammerSwing, setHammerSwing] = useState(false);
    const [activeHint, setActiveHint] = useState<number | null>(null);

    const gameAreaRef = useRef<HTMLElement>(null);
    const clockTimerRef = useRef<number | null>(null);
    const spawnTimerRef = useRef<number | null>(null);
    const hideTimerRef = useRef<number | null>(null);
    const spawnIdCounter = useRef(0);
    const activeDifficultyRef = useRef(DIFFICULTY_PRESETS.normal);

    useEffect(() => {
        audioManager.initBgm('/assets/audio/BGM/bgm_whack_a_mole.mp3', { volume: 0.45 });

        setBestScore(Number(localStorage.getItem('whack-a-mole-best') || 0));
        setRewardCollected(localStorage.getItem('game_whack_a_mole_finish') === 'true');

        preloadAssets();

        return () => {
            stopAllTimers();
        };
    }, []);

    const stopAllTimers = useCallback(() => {
        if (clockTimerRef.current) clearInterval(clockTimerRef.current);
        if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        clockTimerRef.current = null;
        spawnTimerRef.current = null;
        hideTimerRef.current = null;
    }, []);

    const preloadAssets = async () => {
        const paths = [`${ASSET_BASE}/background_with_hole.png`, `${ASSET_BASE}/nene_punch.png`];
        for (const char of CHARACTERS) {
            paths.push(`${ASSET_BASE}/totem_${char}.png`);
            paths.push(`${ASSET_BASE}/totem_${char}_hit.png`);
        }

        try {
            await Promise.all(paths.map(src => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(src);
                img.onerror = () => reject();
                img.src = src;
            })));
            setGameState('ready');
            setStatus("โหลดรูปเสร็จแล้ว! กดเริ่มเกมแล้วตีโทเท็มได้เลย!", "good");
        } catch {
            setStatus("โหลดรูปเกมไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่", "danger");
        }
    };

    const setStatus = (msg: string, type: '' | 'good' | 'danger' = '') => {
        setStatusMessage(msg);
        setStatusType(type);
    };

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(Math.max(0, totalSeconds) / 60);
        const s = Math.max(0, totalSeconds) % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const hideCurrentMole = () => {
        setActiveMole(null);
    };

    const spawnMole = () => {
        hideCurrentMole();

        const nextHole = rand(0, HOLE_POSITIONS.length - 1);
        const character = CHARACTERS[rand(0, CHARACTERS.length - 1)];
        const spawnId = ++spawnIdCounter.current;

        setActiveMole({
            holeIndex: nextHole,
            character,
            spawnId,
            isHit: false
        });

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => {
            setActiveMole(current => {
                if (current && current.spawnId === spawnId && !current.isHit) {
                    setStatus("ช้าไปหน่อย! ตีให้ไวขึ้น 👀", "danger");
                    return null; // hide
                }
                return current;
            });
        }, rand(activeDifficultyRef.current.moleMinTime, activeDifficultyRef.current.moleMaxTime));
    };

    const stopGame = useCallback((options: { message?: string, statusType?: '' | 'good' | 'danger', passed?: boolean } = {}) => {
        stopAllTimers();
        setGameState('gameover');
        hideCurrentMole();

        setScore(currentScore => {
            const finalScore = currentScore;
            localStorage.setItem('game_whack_a_mole_score', String(finalScore));

            setBestScore(prevBest => {
                if (finalScore > prevBest) {
                    localStorage.setItem('whack-a-mole-best', String(finalScore));
                    setStatus(`หมดเวลา! ทำสถิติสูงสุดใหม่: ${finalScore} 🎉`, "good");
                    return finalScore;
                } else if (options.message) {
                    setStatus(options.message, options.statusType);
                } else {
                    setStatus(`หมดเวลา! คะแนนสุดท้าย: ${finalScore} ลองอีกครั้งนะ!`);
                }
                return prevBest;
            });

            if (finalScore > REWARD_THRESHOLD_SCORE || options.passed) {
                audioManager.playSfx('/assets/audio/SFX/sfx_win_the_game.mp3', { volume: 0.9 });
                setShowResultOverlay(true);
            } else {
                setShowResultOverlay(false);
            }

            return finalScore;
        });
    }, [stopAllTimers]);

    const startGame = () => {
        if (gameState === 'loading') return;

        setScore(0);
        setHealth(MAX_HEALTH);
        setTimeLeft(GAME_DURATION);
        setGameState('playing');
        setShowResultOverlay(false);
        setStatus(`เริ่มเกมแล้ว! ตีโทเท็มให้ได้มากที่สุด!`);

        stopAllTimers();
        spawnMole();

        clockTimerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopGame({ passed: true }); // Need to pass Health, actually managed by state, so just use current health > 0 but we know that since game didn't end early
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        spawnTimerRef.current = window.setInterval(() => {
            spawnMole();
        }, activeDifficultyRef.current.spawnInterval);
    };

    const handleMoleClick = (index: number, e?: React.MouseEvent | React.PointerEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
            // Only do programmatic hit via pointer if it's playing
        }

        if (gameState !== 'playing' || !activeMole || activeMole.holeIndex !== index || activeMole.isHit) return;

        const char = activeMole.character;
        let newHealth = health;

        if (DANGEROUS_CHARACTERS.has(char)) {
            audioManager.playSfx('/assets/audio/SFX/whack-a-mole/sfx_whack_incorrect.mp3', { volume: 0.85 });
            newHealth -= 1;
            setHealth(newHealth);
            setStatus(`โอ๊ย! ${char} โดนผิดเป้าลด -1❤️`, "danger");

            if (newHealth <= 0) {
                setTimeout(() => stopGame({ message: `พลังชีวิตหมดแล้ว! ลองอีกครั้งนะ!`, statusType: "danger" }), 0);
            }
        } else if (VEGETABLE_CHARACTERS.has(char)) {
            audioManager.playSfx('/assets/audio/SFX/whack-a-mole/sfx_whack_correct.mp3', { volume: 0.8 });
            setScore(s => s + 1);
            setStatus(`เยี่ยม! ตี ${char} ได้ +1 คะแนน`, "good");
        } else {
            setStatus("โดนเป้า!", "good");
        }

        const currentSpawnId = activeMole.spawnId;
        setActiveMole(prev => prev ? { ...prev, isHit: true } : null);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => {
            setActiveMole(current => {
                if (current && current.spawnId === currentSpawnId) return null;
                return current;
            });
        }, 200);
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (gameState !== 'playing' && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                startGame();
                return;
            }

            if (gameState === 'playing' && e.key === 'Escape') {
                e.preventDefault();
                stopGame({ message: `หยุดเกมแล้ว` });
                return;
            }

            if (gameState === 'playing') {
                let holeNum = -1;
                if (/^[1-6]$/.test(e.key)) holeNum = Number(e.key);
                else if (/^Digit[1-6]$/.test(e.code)) holeNum = Number(e.code.replace('Digit', ''));
                else if (/^Numpad[1-6]$/.test(e.code)) holeNum = Number(e.code.replace('Numpad', ''));

                if (holeNum >= 1 && holeNum <= 6) {
                    e.preventDefault();
                    const index = holeNum - 1;

                    setActiveHint(index);
                    setTimeout(() => setActiveHint(null), 140);

                    setHammerSwing(true);
                    setTimeout(() => setHammerSwing(false), 90);

                    if (gameAreaRef.current) {
                        const pos = HOLE_POSITIONS[index];
                        const w = gameAreaRef.current.clientWidth;
                        const h = gameAreaRef.current.clientHeight;
                        setCursorPos({
                            x: (pos.x / 100) * w,
                            y: (pos.y / 100) * h
                        });
                        setCursorVisible(true);
                        setTimeout(() => setCursorVisible(false), 180);
                    }

                    handleMoleClick(index);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, activeMole, handleMoleClick, stopGame]);

    const handlePointerEnter = (e: React.PointerEvent) => {
        if (e.pointerType !== 'touch') {
            setCursorVisible(true);
            updateHammerPos(e);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (e.pointerType !== 'touch') {
            setCursorVisible(true);
            updateHammerPos(e);
        }
    };

    const handlePointerLeave = () => {
        setCursorVisible(false);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setCursorVisible(true);
        updateHammerPos(e);
        setHammerSwing(true);
        setTimeout(() => setHammerSwing(false), 90);

        if (e.pointerType === 'touch') {
            setTimeout(() => setCursorVisible(false), 220);
        }
    };

    const updateHammerPos = (e: React.PointerEvent) => {
        if (gameAreaRef.current) {
            const rect = gameAreaRef.current.getBoundingClientRect();
            setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    const handleRewardCollect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (rewardCollected) return;
        localStorage.setItem('game_whack_a_mole_finish', 'true');
        setRewardCollected(true);
        audioManager.playSfx('/assets/audio/SFX/sfx_combined_ingredients.mp3', { volume: 0.85 });
    };

    return (
        <div className="whack-a-mole-body">
            <main className="game">
                <div className="header">
                    <h1>ตีตัวตุ่น 🪵</h1>
                    <div className="hud">
                        <div className="chip">คะแนน: <strong>{score}</strong></div>
                        <div className="chip">พลังชีวิต: <strong>
                            {'❤️'.repeat(Math.max(0, health))}{'🖤'.repeat(MAX_HEALTH - Math.max(0, health))}
                        </strong></div>
                        <div className="chip">เวลา: <strong>{formatTime(timeLeft)}</strong></div>
                        <div className="chip">สถิติสูงสุด: <strong>{bestScore}</strong></div>
                    </div>
                </div>

                <div className="controls">
                    <div className="controls-left">
                        <a className="btn back-link" href="/game" aria-label="กลับไปเมนูเกม" onClick={(e) => {
                            e.preventDefault();
                            audioManager.playSfx('/assets/audio/SFX/sfx_next_page.mp3', { volume: 0.9 });
                            setTimeout(() => navigate('/game'), 120);
                        }}>← กลับเมนูเกม</a>
                        <button className="btn" id="startBtn" type="button" onClick={startGame} disabled={gameState === 'loading' || gameState === 'playing'}>
                            เริ่มเกม
                        </button>
                    </div>
                    <div className={`status ${statusType}`} id="status">{statusMessage}</div>
                </div>

                <section
                    className={`board ${cursorVisible ? 'show-hammer' : ''}`}
                    id="board"
                    aria-label="กระดานเกมตีตัวตุ่น"
                    ref={gameAreaRef}
                    onPointerEnter={handlePointerEnter}
                    onPointerMove={handlePointerMove}
                    onPointerLeave={handlePointerLeave}
                    onPointerDown={handlePointerDown}
                >
                    {HOLE_POSITIONS.map((pos, i) => (
                        <div
                            key={i}
                            className="hole-slot"
                            style={{
                                '--x': `${pos.x}%`, '--y': `${pos.y}%`, '--w': `${pos.w}%`, '--h': `${pos.h}%`, zIndex: Math.round(pos.y * 10)
                            } as React.CSSProperties}
                        >
                            <span className={`hole-hint ${activeHint === i ? 'key-active' : ''}`} aria-hidden="true">{i + 1}</span>
                            <button
                                className={`mole-btn ${activeMole?.holeIndex === i ? 'active' : ''} ${activeMole?.holeIndex === i && activeMole.isHit ? 'hit' : ''}`}
                                type="button"
                                aria-label={`หลุมที่ ${i + 1} (ปุ่ม ${i + 1})`}
                                onClick={(e) => handleMoleClick(i, e as any)}
                            >
                                {activeMole?.holeIndex === i && (
                                    <img
                                        className="mole"
                                        alt="โทเท็ม"
                                        src={activeMole.isHit ? `${ASSET_BASE}/totem_${activeMole.character}_hit.png` : `${ASSET_BASE}/totem_${activeMole.character}.png`}
                                    />
                                )}
                            </button>
                        </div>
                    ))}

                    <img
                        className={`hammer ${hammerSwing ? 'swing' : ''}`}
                        src={`${ASSET_BASE}/nene_punch.png`}
                        alt=""
                        aria-hidden="true"
                        style={{ left: cursorPos.x, top: cursorPos.y }}
                    />
                </section>

                <div className={`result-overlay ${showResultOverlay ? 'show' : ''}`} aria-hidden={!showResultOverlay} onClick={() => setShowResultOverlay(false)}>
                    <div className="result-card" onClick={e => e.stopPropagation()}>
                        <div className="result-title">ปลดล็อกรางวัลแล้ว!</div>
                        <div className="result-score">คะแนน: {score}</div>
                        <button
                            className={`prize-btn ${rewardCollected ? 'collected' : ''}`}
                            type="button"
                            onClick={handleRewardCollect}
                            disabled={rewardCollected}
                        >
                            <img src="/assets/cake-reward/egg.png" alt="รางวัล" />
                            <span>{rewardCollected ? 'เก็บรางวัลไปแล้ว' : 'เก็บรางวัล'}</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default WhackAMole;
