import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioManager } from '../../utils/AudioManager';
import './MatchTheCards.css';

interface CardData {
    id: string; // Unique ID for React key
    name: string;
    image: string;
    isFlipped: boolean;
    isMatched: boolean;
}

const CARDS_DATA = [
    { name: 'อาหาร1', image: '/assets/match-the-cards/onigiri.png' },
    { name: 'อาหาร2', image: '/assets/match-the-cards/hotdog.png' },
    { name: 'อาหาร3', image: '/assets/match-the-cards/sandwich.png' },
    { name: 'อาหาร4', image: '/assets/match-the-cards/taiyaki.png' },
    { name: 'อาหาร5', image: '/assets/match-the-cards/ice-cream.png' },
    { name: 'อาหาร6', image: '/assets/match-the-cards/shrimp-tempura.png' },
    { name: 'อาหาร7', image: '/assets/match-the-cards/takoyaki.png' },
    { name: 'อาหาร8', image: '/assets/match-the-cards/squid.png' },
    { name: 'อาหาร9', image: '/assets/match-the-cards/roasted-sweet-potato.png' },
    { name: 'อาหาร10', image: '/assets/match-the-cards/mochi.png' }
];

const ROUNDS_STORAGE_KEY = 'game_match_the_cards_rounds_completed';
const REWARD_FINISH_KEY = 'game_match_the_cards_finish';
const REWARD_CAN_COLLECTED_KEY = 'game_match_the_cards_can_collected';

const MatchTheCards: React.FC = () => {
    const navigate = useNavigate();

    const [cards, setCards] = useState<CardData[]>([]);
    const [openedIndices, setOpenedIndices] = useState<number[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [roundsCompleted, setRoundsCompleted] = useState(0);
    const [gameWon, setGameWon] = useState(false);
    const [rewardEligible, setRewardEligible] = useState(false);
    const [rewardCollected, setRewardCollected] = useState(false);
    const [canCollect, setCanCollect] = useState(false);
    const [isFilling, setIsFilling] = useState(false);
    const [showTutorial, setShowTutorial] = useState(true);
    const roundCompletedRef = useRef(false);

    useEffect(() => {
        document.title = 'Mikotomi Maneneko Festival - Match The Cards';
        audioManager.initBgm('/assets/audio/BGM/bgm_match_the_cards.mp3', { volume: 0.45 });

        const storedRounds = parseInt(localStorage.getItem(ROUNDS_STORAGE_KEY) || '0', 10);
        setRoundsCompleted(isNaN(storedRounds) ? 0 : Math.max(0, storedRounds));

        const alreadyCollected = localStorage.getItem(REWARD_FINISH_KEY) === 'true';
        setRewardCollected(alreadyCollected);

        // Re-show reward overlay if player won but didn't collect
        if (!alreadyCollected && localStorage.getItem(REWARD_CAN_COLLECTED_KEY) === 'true') {
            setCanCollect(true);
        }

        initGame();
    }, []);

    // Detect win condition via useEffect to avoid StrictMode double-call
    useEffect(() => {
        if (cards.length > 0 && cards.every(c => c.isMatched) && !roundCompletedRef.current) {
            roundCompletedRef.current = true;
            handleRoundCompletion();
        }
    }, [cards]);

    const initGame = () => {
        const cardsPair = [...CARDS_DATA, ...CARDS_DATA];
        const shuffled = cardsPair
            .sort(() => Math.random() - 0.5)
            .map((card, index) => ({
                ...card,
                id: `card-${index}-${Math.random()}`,
                isFlipped: false,
                isMatched: false
            }));

        setCards(shuffled);
        setOpenedIndices([]);
        setIsChecking(false);
        setGameWon(false);
        setRewardEligible(false);
        setIsFilling(false);
        roundCompletedRef.current = false;
    };

    const handleCardClick = (index: number) => {
        if (showTutorial) return;
        if (isChecking) return;
        if (cards[index].isFlipped || cards[index].isMatched) return;
        if (openedIndices.length >= 2) return;

        const newCards = [...cards];
        newCards[index].isFlipped = true;
        setCards(newCards);

        const newOpened = [...openedIndices, index];
        setOpenedIndices(newOpened);

        if (newOpened.length === 2) {
            setIsChecking(true);
            checkMatch(newOpened[0], newOpened[1], newCards);
        }
    };

    const checkMatch = (index1: number, index2: number, currentCards: CardData[]) => {
        const card1 = currentCards[index1];
        const card2 = currentCards[index2];

        if (card1.name === card2.name) {
            setTimeout(() => {
                audioManager.playSfx('/assets/audio/SFX/Picture_Match/sfx_picture_match_correct.mp3', { volume: 0.8 });

                setCards(prev => {
                    const next = [...prev];
                    next[index1].isMatched = true;
                    next[index2].isMatched = true;
                    return next;
                });

                setOpenedIndices([]);
                setIsChecking(false);

            }, 300); // slight delay for visual
        } else {
            setTimeout(() => {
                setCards(prev => {
                    const next = [...prev];
                    next[index1].isFlipped = false;
                    next[index2].isFlipped = false;
                    return next;
                });
                setOpenedIndices([]);
                setIsChecking(false);
            }, 1000);
        }
    };

    const handleRoundCompletion = () => {
        setGameWon(true);

        setRoundsCompleted(prev => {
            const nextRounds = prev + 1;
            localStorage.setItem(ROUNDS_STORAGE_KEY, String(nextRounds));

            if (nextRounds >= 3) {
                audioManager.playSfx('/assets/audio/SFX/sfx_win_the_game.mp3', { volume: 0.85 });
                setIsFilling(true);
                setRewardEligible(true);
                localStorage.setItem(REWARD_CAN_COLLECTED_KEY, 'true');
                setTimeout(() => {
                    localStorage.setItem(ROUNDS_STORAGE_KEY, '0');
                    setRoundsCompleted(0);
                    setIsFilling(false);
                }, 900);
            }
            return nextRounds;
        });
    };

    const handleCollectReward = () => {
        if (!rewardEligible && !canCollect) return;
        if (rewardCollected) return;
        localStorage.setItem(REWARD_FINISH_KEY, 'true');
        localStorage.removeItem(REWARD_CAN_COLLECTED_KEY);
        setRewardCollected(true);
        setCanCollect(false);
        audioManager.playSfx('/assets/audio/SFX/sfx_combined_ingredients.mp3', { volume: 0.85 });
    };

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        audioManager.playSfx('/assets/audio/SFX/sfx_next_page.mp3', { volume: 0.9 });
        setTimeout(() => navigate('/game'), 120);
    };

    const percent = Math.min(100, (roundsCompleted / 3) * 100);

    return (
        <div className="match-cards-body">
            <a className="back-menu-fixed" href="/game" aria-label="กลับไปเมนูเกม" onClick={handleBack}>
                ← กลับเมนูเกม
            </a>
            {canCollect && !rewardCollected && (
                <button
                    className="collect-reward-fixed"
                    type="button"
                    onClick={() => { setGameWon(true); setRewardEligible(true); }}
                >
                    🎁 เก็บรางวัล
                </button>
            )}
            <div className="match-cards-container">
                <header className="match-cards-header">
                    <h1>เกมจับคู่อาหาร</h1>
                    <p className="subtitle">จับคู่อาหารให้ตรงกันทั้งหมด</p>
                </header>

                {showTutorial && (
                    <div className="tutorial-overlay">
                        <div className="tutorial-card">
                            <h2>วิธีเล่น</h2>
                            <p>คลิกการ์ดเพื่อเปิด เปิดทีละ 2 ใบ</p>
                            <p>จับคู่ถูก การ์ดจะหายไป</p>
                            <p>จับคู่ผิด การ์ดจะคว่ำกลับ</p>
                            <p>เล่นให้ครบ 3 รอบ เพื่อรับรางวัล</p>
                            <button className="btn-ok" onClick={() => setShowTutorial(false)}>เริ่มเกม</button>
                        </div>
                    </div>
                )}

                <main className="game-area">
                    <div className="cards-grid">
                        {cards.map((card, index) => (
                            <div
                                key={card.id}
                                className={`card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                                onClick={() => handleCardClick(index)}
                            >
                                <div className="card-front">?</div>
                                <div className="card-back">
                                    <img src={card.image} alt={card.name}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23ccc%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22%3E❓%3C/text%3E%3C/svg%3E';
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="round-progress">
                        <div className="progress-bar">
                            <div className={`progress-fill ${isFilling ? 'filled' : ''}`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="progress-text">เล่น {roundsCompleted}/3 รอบ มีรางวัลให้นะ</div>
                    </div>

                    {gameWon && (
                        <div className="result-overlay show">
                            <div className="result-card" onClick={e => e.stopPropagation()}>
                                <div className="result-title">{rewardEligible ? 'ยินดีด้วย! เล่นครบ 3 รอบ' : 'จบรอบแล้ว!'}</div>
                                <div className="result-score">รอบที่เล่น: {roundsCompleted}/3</div>
                                {rewardEligible && (
                                    <button
                                        className={`prize-btn ${rewardCollected ? 'collected' : ''}`}
                                        type="button"
                                        onClick={handleCollectReward}
                                        disabled={rewardCollected}
                                    >
                                        <img src="/assets/cake-reward/flaver.png" alt="รางวัล" />
                                        <span>{rewardCollected ? 'เก็บรางวัลไปแล้ว' : 'เก็บรางวัล'}</span>
                                    </button>
                                )}
                                <button className="btn-play-again" onClick={initGame}>เล่นอีกครั้ง</button>
                                <button className="btn-play-again" onClick={() => navigate('/game')}>กลับไปเมนูเกม</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MatchTheCards;
