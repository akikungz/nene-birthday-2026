import React, { useState, useEffect } from 'react';
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
    const [mergeLocked, setMergeLocked] = useState(false);

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
        };

        checkRewards();
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

        const sfx = audioManager.playSfx('/assets/audio/SFX/sfx_choose_game.mp3', { volume: 0.9 });

        const doNavigate = () => navigate(path);

        if (!sfx) {
            setTimeout(doNavigate, 150);
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
        setTimeout(finish, 2000); // 2s fallback
    };

    const allUnlocked = rewardsUnlocked.cards && rewardsUnlocked.minesweeper && rewardsUnlocked.shooting && rewardsUnlocked.mole;

    const handleRewardClick = () => {
        if (!allUnlocked) {
            setMergeLocked(false);
            // Trigger reflow
            setTimeout(() => setMergeLocked(true), 10);
            return;
        }

        if (isMerging || cakeMerged) return;

        setIsMerging(true);
        setTimeout(() => {
            setIsMerging(false);
            setCakeMerged(true);
            localStorage.setItem(REWARD_CAKE_MERGED_STORAGE_KEY, 'true');
        }, 900);
    };

    const getRewardContainerClass = () => {
        const classes = ['reward'];
        if (!allUnlocked && mergeLocked) classes.push('merge-locked');
        if (allUnlocked && !cakeMerged && !isMerging) classes.push('merge-ready');
        if (isMerging) classes.push('is-merging');
        if (cakeMerged) classes.push('is-merged');
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
        </>
    );
};

export default GameMenu;
