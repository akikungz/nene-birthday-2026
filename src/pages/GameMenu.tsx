import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioManager } from '../utils/AudioManager';
import './GameMenu.css';

const REWARD_CAKE_MERGED_STORAGE_KEY = 'game_menu_reward_cake_merged';

const GameMenu: React.FC = () => {
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [loading, setLoading] = useState(false);

    const [rewardsUnlocked, setRewardsUnlocked] = useState({
        cards: false,
        minesweeper: false,
        shooting: false,
        mole: false,
    });

    const [cakeMerged, setCakeMerged] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
    const [mergeLocked, setMergeLocked] = useState(false);
    const [showCG, setShowCG] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [videoFading, setVideoFading] = useState(false);
    const [videoVolume, setVideoVolume] = useState(1);
    const [isPlaying, setIsPlaying] = useState(true);
    const [hasWatchedCredits, setHasWatchedCredits] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasPausedRef = useRef(false);

    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.currentTime >= 66 && !hasPausedRef.current) {
            hasPausedRef.current = true;
            video.pause();
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                }
            }, 2000);
        }
    }, []);

    const handleVideoEnd = useCallback(() => {
        if (videoFading) return;
        setVideoFading(true);
        setShowCG(true);
        localStorage.setItem('game_menu_watched_credits', 'true');
        setHasWatchedCredits(true);
        setTimeout(() => {
            setShowVideo(false);
            setVideoFading(false);
            hasPausedRef.current = false;
        }, 800);
    }, [videoFading]);

    useEffect(() => {
        audioManager.initBgm('/assets/audio/BGM/bgm_game_menu.mp3', { volume: 0.45 });

        // Sync reward states
        const checkRewards = () => {
            const cardsObj = localStorage.getItem('game_match_the_cards_finish') === 'true';
            const minesweeperObj = localStorage.getItem('game_minesweeper_finish') === 'true';
            const shootingObj = localStorage.getItem('game_target_shooting_finish') === 'true' ||
                localStorage.getItem('game_ShootingGame_finish') === 'true';
            const moleObj = localStorage.getItem('game_whack_a_mole_finish') === 'true';

            setRewardsUnlocked({
                cards: cardsObj,
                minesweeper: minesweeperObj,
                shooting: shootingObj,
                mole: moleObj
            });

            const merged = localStorage.getItem(REWARD_CAKE_MERGED_STORAGE_KEY) === 'true';
            setCakeMerged(merged);

            const watched = localStorage.getItem('game_menu_watched_credits') === 'true';
            setHasWatchedCredits(watched);
        };

        checkRewards();
        setVideoVolume(audioManager.getVolumes().bgm);
        window.addEventListener('storage', checkRewards);
        window.addEventListener('pageshow', checkRewards);

        const handleVisibility = () => {
            if (!document.hidden) checkRewards();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('storage', checkRewards);
            window.removeEventListener('pageshow', checkRewards);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    const handleNavigate = (path: string) => {
        if (isRedirecting) return;
        setIsRedirecting(true);
        setLoading(true);

        const sfx = audioManager.playSfx('/assets/audio/SFX/sfx_choose_game.mp3', { volume: path != "/" ? 0.9 : 0 });

        const doNavigate = () => navigate(path);

        if (!sfx) {
            setTimeout(doNavigate, path != "/" ? 150 : 0);
            return;
        }

        let resolved = false;
        const finish = () => {
            if (resolved) return;
            resolved = true;
            doNavigate();
        };

        sfx.addEventListener('ended', finish, { once: true });
        sfx.addEventListener('error', finish, { once: true });
        setTimeout(finish, path != "/" ? 2000 : 0); // 2s fallback
    };

    const allUnlocked = rewardsUnlocked.cards && rewardsUnlocked.minesweeper && rewardsUnlocked.shooting && rewardsUnlocked.mole;

    const handleRewardClick = () => {
        if (!allUnlocked) {
            setMergeLocked(false);
            // Trigger reflow
            setTimeout(() => setMergeLocked(true), 10);
            return;
        }

        if (isMerging || isBouncing) return;

        if (cakeMerged) {
            setIsBouncing(true);
            setTimeout(() => {
                setIsBouncing(false);
                setShowVideo(true);
            }, 600); // Wait for bounce animation to finish
            return;
        }

        setIsMerging(true);
        setTimeout(() => {
            setIsMerging(false);
            setCakeMerged(true);
            localStorage.setItem(REWARD_CAKE_MERGED_STORAGE_KEY, 'true');
        }, 900);
    };

    const handleVideoVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setVideoVolume(val);
        if (videoRef.current) {
            videoRef.current.volume = val;
        }
    };

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play().catch(console.error);
            }
            setIsPlaying(!isPlaying);
        }
    };

    const getRewardContainerClass = () => {
        const classes = ['reward'];
        if (!allUnlocked && mergeLocked) classes.push('merge-locked');
        if (allUnlocked && !cakeMerged && !isMerging) classes.push('merge-ready');
        if (isMerging) classes.push('is-merging');
        if (cakeMerged) classes.push('is-merged');
        if (isBouncing) classes.push('is-bouncing');
        return classes.join(' ');
    };

    return (
        <>
            <div className="game-menu-container">
                <button
                    className="back-main-btn"
                    aria-label="กลับไปเมนูหลัก"
                    onClick={() => handleNavigate('/')}
                >
                    ← เมนูหลัก
                </button>

                <img src="/assets/game_menu/tree_props.png" alt="ต้นไม้ตกแต่ง" className="asset trees-overlay" />
                <img src="/assets/game_menu/tower.png" alt="ซุ้มกลาง" className="asset tower" />

                <div className="asset-link target-shooting" onClick={() => handleNavigate('/games/target-shooting')}>
                    <img src="/assets/game_menu/target_shooting.png" alt="เล่นเกมยิงเป้า" className="asset interactive" />
                </div>

                <div className="asset-link whack-a-mole" onClick={() => handleNavigate('/games/whack-a-mole')}>
                    <img src="/assets/game_menu/whack_a_mole.png" alt="เล่นเกมตีตัวตุ่น" className="asset interactive" />
                </div>

                <div className="asset-link minesweeper" onClick={() => handleNavigate('/games/minesweeper')}>
                    <img src="/assets/game_menu/minesweeper.png" alt="เล่นเกมกวาดทุ่นระเบิด" className="asset interactive" />
                </div>

                <div className="asset-link match-cards" onClick={() => handleNavigate('/games/match-the-cards')}>
                    <img src="/assets/game_menu/match_the_cards.png" alt="เล่นเกมจับคู่การ์ด" className="asset interactive" />
                </div>

                <img src="/assets/game_menu/nene_center.png" alt="ตัวละครเนเนะ" className="asset character" />

                <div
                    className={getRewardContainerClass()}
                    role="button"
                    tabIndex={0}
                    aria-label="รวมวัตถุดิบให้เป็นเค้ก"
                    onClick={handleRewardClick}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRewardClick();
                        }
                    }}
                    title={cakeMerged ? "ทำเค้กเสร็จแล้ว!" : allUnlocked ? "ปลดล็อกรางวัลครบแล้ว! คลิกเพื่อรวมเป็นเค้ก" : "ปลดล็อกรางวัลให้ครบก่อนจึงจะรวมเป็นเค้กได้"}
                    aria-disabled={!allUnlocked || cakeMerged}
                >
                    <div className={`reward-item ${rewardsUnlocked.cards ? 'unlocked' : 'locked'}`} title="รางวัลแป้งเค้ก">
                        <img src="/assets/cake-reward/flaver.png" alt="แป้งเค้ก" className="reward-icon" />
                    </div>
                    <div className={`reward-item ${rewardsUnlocked.minesweeper ? 'unlocked' : 'locked'}`} title="รางวัลน้ำตาล">
                        <img src="/assets/cake-reward/sugar.png" alt="น้ำตาล" className="reward-icon" />
                    </div>
                    <div className={`reward-item ${rewardsUnlocked.shooting ? 'unlocked' : 'locked'}`} title="รางวัลนม">
                        <img src="/assets/cake-reward/milk.png" alt="นม" className="reward-icon" />
                    </div>
                    <div className={`reward-item ${rewardsUnlocked.mole ? 'unlocked' : 'locked'}`} title="รางวัลไข่">
                        <img src="/assets/cake-reward/egg.png" alt="ไข่" className="reward-icon" />
                    </div>

                    <img src="/assets/cake-reward/cake.png" alt="เค้กวันเกิดที่ทำเสร็จแล้ว" className="reward-cake" aria-hidden="true" />
                </div>
            </div>

            <div className={`loading-overlay ${loading ? 'show' : ''}`} aria-hidden={!loading}>
                <div className="loading-card" role="status" aria-live="polite">
                    <span className="loading-spinner" aria-hidden="true"></span>
                    <p className="loading-text">กำลังโหลดเกม...</p>
                </div>
            </div>

            {showVideo && (
                <div className={`video-overlay show ${videoFading ? 'fading' : ''}`} onClick={handleVideoEnd}>
                    <video
                        ref={videoRef}
                        className="end-credits-video"
                        src="/assets/end_credits.mov"
                        autoPlay
                        playsInline
                        // controls
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnd}
                        onClick={(e) => e.stopPropagation()}
                        onLoadedMetadata={(e) => {
                            (e.target as HTMLVideoElement).volume = videoVolume;
                        }}
                    />
                    <div className="custom-video-controls" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="video-play-btn"
                            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                            aria-label={isPlaying ? "หยุดชั่วคราว" : "เล่น"}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        <div className="video-volume-control">
                            <span className="volume-icon">{videoVolume === 0 ? '🔇' : '🔊'}</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={videoVolume}
                                onChange={handleVideoVolumeChange}
                                className="video-volume-slider"
                                aria-label="ระดับเสียงวิดีโอ"
                            />
                        </div>
                        <button
                            className={`video-skip-btn ${!hasWatchedCredits ? 'disabled' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (hasWatchedCredits) handleVideoEnd();
                            }}
                            disabled={!hasWatchedCredits}
                            style={{ cursor: !hasWatchedCredits ? 'not-allowed' : 'pointer' }}
                            title={!hasWatchedCredits ? "คุณต้องดูให้จบก่อนในครั้งแรก" : "ข้าม"}
                        >
                            ข้าม ▸
                        </button>
                    </div>
                </div>
            )}

            <div className={`cg-popup-overlay ${showCG ? 'show' : ''}`} onClick={() => setShowCG(false)} aria-hidden={!showCG}>
                <div className="cg-popup-content" onClick={(e) => e.stopPropagation()}>
                    <button className="cg-close-btn" onClick={() => setShowCG(false)} aria-label="Close CG">✕</button>
                    <img src="/assets/Unlocked_CG.png" alt="Unlocked CG" className="cg-image" />
                </div>
            </div>
        </>
    );
};

export default GameMenu;
