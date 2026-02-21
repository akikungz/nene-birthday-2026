import React, { useState, useEffect } from 'react';
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

const MatchTheCards: React.FC = () => {
    const navigate = useNavigate();

    const [cards, setCards] = useState<CardData[]>([]);
    const [openedIndices, setOpenedIndices] = useState<number[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [roundsCompleted, setRoundsCompleted] = useState(0);
    const [gameWon, setGameWon] = useState(false);
    const [rewardEligible, setRewardEligible] = useState(false);
    const [rewardCollected, setRewardCollected] = useState(false);
    const [isFilling, setIsFilling] = useState(false);

    useEffect(() => {
        audioManager.initBgm('/assets/audio/BGM/bgm_match_the_cards.mp3', { volume: 0.45 });

        const storedRounds = parseInt(localStorage.getItem(ROUNDS_STORAGE_KEY) || '0', 10);
        setRoundsCompleted(isNaN(storedRounds) ? 0 : Math.max(0, storedRounds));

        setRewardCollected(localStorage.getItem(REWARD_FINISH_KEY) === 'true');

        initGame();
    }, []);

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
    };

    const handleCardClick = (index: number) => {
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

                // Check win condition
                setCards(latestCards => {
                    if (latestCards.every(c => c.isMatched)) {
                        handleRoundCompletion();
                        return latestCards; // Actually we handle win in state
                    }
                    return latestCards;
                });

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
        if (!rewardEligible || rewardCollected) return;
        localStorage.setItem(REWARD_FINISH_KEY, 'true');
        setRewardCollected(true);
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
            <div className="match-cards-container">
                <header className="match-cards-header">
                    <h1>เกมจับคู่อาหาร</h1>
                    <p className="subtitle">จับคู่อาหารให้ตรงกันทั้งหมด</p>
                </header>

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
                        <div className="game-result" aria-live="polite">
                            <div className="reward-message">
                                {rewardEligible ? (
                                    <>
                                        <div className="reward-icon"><img src="/assets/cake-reward/flaver.png" alt="Reward" /></div>
                                        <h2 style={{ color: '#ffffff' }}>ยินดีด้วย! เล่นครบ 3 รอบ ได้รางวัลพิเศษ!</h2>
                                    </>
                                ) : (
                                    <h2 style={{ color: '#ffffff' }}>จบรอบแล้ว! กด Play Again เพื่อเล่นรอบถัดไป</h2>
                                )}
                            </div>
                            <div className="game-actions">
                                <button className="btn-play-again" onClick={initGame} style={{ display: 'block' }}>เล่นอีกครั้ง</button>
                                {rewardEligible && (
                                    <button
                                        className={`btn-ok ${rewardCollected ? 'collected' : ''}`}
                                        onClick={handleCollectReward}
                                        disabled={rewardCollected}
                                    >
                                        {rewardCollected ? 'เก็บรางวัลไปแล้ว' : 'เก็บรางวัล'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MatchTheCards;
