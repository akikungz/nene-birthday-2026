/* ================================
   Memory Card Game - JavaScript
   ================================ */

/**
 * @typedef {Object} CardData
 * @property {string} name - Card identifier used for matching.
 * @property {string} image - Image path shown on the back side.
 */

/**
 * @typedef {Object} OpenedCard
 * @property {HTMLDivElement} element - DOM element of the opened card.
 * @property {number} index - Position in the shuffled game card list.
 * @property {string} name - Card identifier used for matching.
 */

// ข้อมูลไพ่ 10 คู่ พร้อมเส้นทางรูปสัตว์
/** @type {CardData[]} */
const CARDS_DATA = [
    { name: 'อาหาร1', image: '../assets/match-the-cards/onigiri.png' },
    { name: 'อาหาร2', image: '../assets/match-the-cards/hotdog.png' },
    { name: 'อาหาร3', image: '../assets/match-the-cards/sandwich.png' },
    { name: 'อาหาร4', image: '../assets/match-the-cards/taiyaki.png' },
    { name: 'อาหาร5', image: '../assets/match-the-cards/ice-cream.png' },
    { name: 'อาหาร6', image: '../assets/match-the-cards/shrimp-tempura.png' },
    { name: 'อาหาร7', image: '../assets/match-the-cards/takoyaki.png' },
    { name: 'อาหาร8', image: '../assets/match-the-cards/squid.png' },
    { name: 'อาหาร9', image: '../assets/match-the-cards/roasted-sweet-potato.png' },
    { name: 'อาหาร10', image: '../assets/match-the-cards/mochi.png' }
];

// ตัวแปรสำหรับเก็บสถานะเกม
/** @type {CardData[]} รายการไพ่ทั้งหมด (20 ใบ) */
let gameCards = [];
/** @type {OpenedCard[]} ไพ่ที่เปิดอยู่ในตอนนี้ */
let openedCards = [];
/** @type {HTMLDivElement[]} ไพ่ที่จับคู่สำเร็จแล้ว */
let matchedCards = [];
let isChecking = false;       // ตัวแปรตรวจสอบว่ากำลังตรวจสอบคู่ไพ่หรือไม่
let gameWon = false;          // ตัวแปรระบุว่าชนะเกมหรือไม่
let roundsCompleted = 0; // จำนวนรอบที่เล่น (เก็บใน localStorage)
const roundsStorageKey = 'game_match_the_cards_rounds_completed';
const rewardScoreStorageKey = 'game_match_the_cards_score';
const rewardFinishStorageKey = 'game_match_the_cards_finish';
const BGM_MATCH_THE_CARDS = '../assets/audio/BGM/bgm_match_the_cards.mp3';
const SFX_MATCH_CORRECT = '../assets/audio/SFX/Picture_Match/sfx_picture_match_correct.mp3';
const SFX_NEXT_PAGE = '../assets/audio/SFX/sfx_next_page.mp3';
const SFX_COMBINED_INGREDIENTS = '../assets/audio/SFX/sfx_combined_ingredients.mp3';
const SFX_WIN_THE_GAME = '../assets/audio/SFX/sfx_win_the_game.mp3';
let lastRoundScore = 0;
let lastRewardEligible = false;

/**
 * Read persisted round count for this minigame.
 * @returns {number}
 */
function getRoundsCompleted() {
    const stored = Number.parseInt(localStorage.getItem(roundsStorageKey) || '0', 10);
    if (Number.isNaN(stored) || stored < 0) {
        return 0;
    }

    return stored;
}

/**
 * Persist round count for this minigame.
 * @param {number} rounds
 * @returns {void}
 */
function setRoundsCompleted(rounds) {
    const safeRounds = Math.max(0, Math.floor(rounds));
    roundsCompleted = safeRounds;
    localStorage.setItem(roundsStorageKey, String(safeRounds));
}

/**
 * Read reward collected flag from localStorage.
 * @returns {boolean}
 */
function isRewardCollected() {
    return localStorage.getItem(rewardFinishStorageKey) === 'true';
}

/**
 * Persist reward collected flag.
 * @returns {void}
 */
function setRewardCollected() {
    localStorage.setItem(rewardFinishStorageKey, 'true');
}

roundsCompleted = getRoundsCompleted();

if (window.GameAudio) {
    window.GameAudio.initBgm(BGM_MATCH_THE_CARDS, { volume: 0.45 });
}

/* ================================
   ฟังก์ชันเริ่มต้นเกม (Initialize Game)
   ================================ */

/**
 * Initialize a new round and refresh all game UI state.
 * @returns {void}
 */
function initGame() {
    // รีเซ็ตตัวแปร
    gameCards = [];
    openedCards = [];
    matchedCards = [];
    isChecking = false;
    gameWon = false;

    // สร้างไพ่ 2 ชุด (10 คู่)
    const cardsPair = [...CARDS_DATA, ...CARDS_DATA];

    // สุ่มลำดับไพ่
    gameCards = shuffleCards(cardsPair);

    // สร้าง UI ของไพ่
    renderCards();

    // รีเซ็ตผลลัพธ์รอบก่อนหน้า
    resetRoundResultUI();

    lastRewardEligible = false;

    // อัปเดต UI ของหลอดความคืบหน้า
    updateProgressUI();
}

/* ================================
   ฟังก์ชันสุ่มไพ่ (Shuffle Cards)
   ================================ */

/**
 * Shuffle cards using Fisher-Yates algorithm.
 * @param {CardData[]} cards
 * @returns {CardData[]}
 */
function shuffleCards(cards) {
    // ใช้ Fisher-Yates Shuffle Algorithm
    const shuffled = [...cards];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));

        // สลับ
        [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
    }

    return shuffled;
}

/* ================================
   ฟังก์ชันสร้าง UI ของไพ่ (Render Cards)
   ================================ */

/**
 * Render all cards into the grid container.
 * @returns {void}
 */
function renderCards() {
    const cardsGrid = document.getElementById('cardsGrid');

    // ล้างไพ่เก่า
    cardsGrid.innerHTML = '';

    // สร้างไพ่ทั้งหมด
    gameCards.forEach((cardData, index) => {
        const card = createCardElement(cardData, index);
        cardsGrid.appendChild(card);
    });
}

/* ================================
   ฟังก์ชันสร้างองค์ประกอบไพ่ (Create Card Element)
   ================================ */

/**
 * Create a single card DOM element.
 * @param {CardData} cardData
 * @param {number} index
 * @returns {HTMLDivElement}
 */
function createCardElement(cardData, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;
    card.dataset.name = cardData.name;

    // สร้าง HTML ของไพ่
    card.innerHTML = `
        <div class="card-front">?</div>
        <div class="card-back">
            <img src="${cardData.image}" alt="${cardData.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23ccc%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22%3E❓%3C/text%3E%3C/svg%3E'">
        </div>
    `;

    // เพิ่ม Event Listener ให้ไพ่
    card.addEventListener('click', () => handleCardClick(card, index));

    return card;
}

/* ================================
   ฟังก์ชันจัดการการคลิกไพ่ (Handle Card Click)
   ================================ */

/**
 * Handle user click on a card and trigger matching flow.
 * @param {HTMLDivElement} cardElement
 * @param {number} index
 * @returns {void}
 */
function handleCardClick(cardElement, index) {
    // ป้องกันการคลิกซ้ำขณะตรวจสอบ
    if (isChecking) return;

    // ป้องกันการเปิดไพ่ที่เปิดอยู่แล้ว
    if (cardElement.classList.contains('flipped')) return;

    // ป้องกันการเปิดไพ่ที่จับคู่แล้ว
    if (cardElement.classList.contains('matched')) return;

    // ป้องกันการเปิดมากกว่า 2 ใบพร้อมกัน
    if (openedCards.length >= 2) return;

    // เปิดไพ่
    cardElement.classList.add('flipped');
    openedCards.push({
        element: cardElement,
        index: index,
        name: cardElement.dataset.name
    });

    // ถ้าเปิดครบ 2 ใบให้ตรวจสอบว่าตรงกันหรือไม่
    if (openedCards.length === 2) {
        isChecking = true;
        checkMatch();
    }
}

/* ================================
   ฟังก์ชันตรวจสอบคู่ไพ่ (Check Match)
   ================================ */

/**
 * Compare the two opened cards and apply match or unflip behavior.
 * @returns {void}
 */
function checkMatch() {
    const [card1, card2] = openedCards;

    // ตรวจสอบว่าไพ่ทั้ง 2 ตรงกันหรือไม่
    const isMatch = card1.name === card2.name;

    if (isMatch) {
        // ไพ่ตรงกัน - ค้างไว้
        handleMatchedCards(card1.element, card2.element);
    } else {
        // ไพ่ไม่ตรง - ปิดกลับในอีก 1 วินาที
        setTimeout(() => {
            unflipCards(card1.element, card2.element);
        }, 1000);
    }
}

/* ================================
   ฟังก์ชันจัดการไพ่ที่จับคู่ (Handle Matched Cards)
   ================================ */

/**
 * Mark two cards as matched and check for round completion.
 * @param {HTMLDivElement} card1
 * @param {HTMLDivElement} card2
 * @returns {void}
 */
function handleMatchedCards(card1, card2) {
    // เพิ่ม class matched
    card1.classList.add('matched');
    card2.classList.add('matched');

    // เก็บไพ่ที่จับคู่
    matchedCards.push(card1, card2);
    window.GameAudio?.playSfx(SFX_MATCH_CORRECT, { volume: 0.8 });

    // รีเซ็ต
    openedCards = [];
    isChecking = false;

    // ตรวจสอบว่าชนะเกมหรือไม่
    if (matchedCards.length === gameCards.length) {
        gameWon = true;
        setTimeout(() => {
            handleRoundCompletion();
        }, 500);
    }
}

/* ================================
   ฟังก์ชันจัดการสิ้นสุดรอบการเล่น (Round Completion)
   เพิ่มรอบที่เล่น และตรวจสอบว่าได้รางวัลพิเศษหรือยัง
   ================================ */
/**
 * Process the end of a successful round and control reward states.
 * @returns {void}
 */
function handleRoundCompletion() {
    // เพิ่มจำนวนรอบ
    setRoundsCompleted(getRoundsCompleted() + 1);

    // อัปเดต UI ของหลอด
    updateProgressUI();

    lastRoundScore = matchedCards.length * 2;
    localStorage.setItem(rewardScoreStorageKey, String(lastRoundScore));
    lastRewardEligible = roundsCompleted >= 3;

    const rewardMessage = document.getElementById('rewardMessage');
    const btnPlayAgain = document.getElementById('btnPlayAgain');

    // แสดงปุ่มเล่นใหม่ในหน้าเกมหลัก
    if (btnPlayAgain) btnPlayAgain.style.display = 'block';

    // ถ้าถึง 3 รอบ ให้เล่นอนิเมชันหลอดเต็ม และแสดงรางวัลพิเศษในหน้าเกมหลัก
    if (roundsCompleted >= 3) {
        window.GameAudio?.playSfx(SFX_WIN_THE_GAME, { volume: 0.85 });
        const fill = document.getElementById('progressFill');
        if (fill) {
            // เพิ่มคลาสเพื่อเล่นอนิเมชัน
            fill.classList.add('filled');
        }

        if (rewardMessage) {
            rewardMessage.innerHTML = `
                <div class="reward-icon"><img src="../assets/cake-reward/flaver.png" alt="Reward"></div>
                <h2 style="color: #ffffff;">ยินดีด้วย! เล่นครบ 3 รอบ ได้รางวัลพิเศษ!</h2>
            `;
            rewardMessage.style.display = '';
        }

        // ครบรอบแล้ว รีเซ็ตรอบสะสมสำหรับรางวัลรอบถัดไป
        setRoundsCompleted(0);
        updateProgressUI();

        // เอา class อนิเมชันออกหลังเล่นจบ
        setTimeout(() => {
            if (fill) fill.classList.remove('filled');
        }, 900);
    } else {
        // ปกติ: แสดงข้อความจบรอบ และให้เล่นใหม่จากหน้าเกมหลัก
        if (rewardMessage) {
            rewardMessage.innerHTML = '<h2 style="color: #ffffff;">จบรอบแล้ว! กด Play Again เพื่อเล่นรอบถัดไป</h2>';
            rewardMessage.style.display = '';
        }
    }

    updateRewardClaimButton();
}

/**
 * Update progress bar and text from stored round count.
 * @returns {void}
 */
function updateProgressUI() {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    const current = getRoundsCompleted();
    const percent = Math.min(100, (current / 3) * 100);

    if (fill) fill.style.width = percent + '%';
    if (text) text.textContent = `เล่น ${current}/3 รอบ มีรางวัลให้นะ`;
}

/* ================================
   ฟังก์ชันปิดไพ่ (Unflip Cards)
   ================================ */

/**
 * Flip two unmatched cards back to front side.
 * @param {HTMLDivElement} card1
 * @param {HTMLDivElement} card2
 * @returns {void}
 */
function unflipCards(card1, card2) {
    // เอาออก class flipped เพื่อปิดไพ่
    card1.classList.remove('flipped');
    card2.classList.remove('flipped');

    // รีเซ็ต
    openedCards = [];
    isChecking = false;
}

/**
 * Reset result/actions area in the main UI.
 * @returns {void}
 */
function resetRoundResultUI() {
    const rewardMessage = document.getElementById('rewardMessage');
    const btnPlayAgain = document.getElementById('btnPlayAgain');
    const btnCollectReward = document.getElementById('btnCollectReward');

    if (rewardMessage) {
        rewardMessage.style.display = 'none';
        rewardMessage.innerHTML = '';
    }

    if (btnPlayAgain) {
        btnPlayAgain.style.display = 'none';
    }

    if (btnCollectReward) {
        btnCollectReward.style.display = 'none';
        btnCollectReward.disabled = true;
        btnCollectReward.classList.remove('collected');
        btnCollectReward.textContent = 'Collect Reward';
    }
}

/**
 * Update reward claim button state from eligibility and localStorage status.
 * @returns {void}
 */
function updateRewardClaimButton() {
    const btnCollectReward = document.getElementById('btnCollectReward');
    if (!btnCollectReward) return;

    if (!lastRewardEligible) {
        btnCollectReward.style.display = 'none';
        btnCollectReward.disabled = true;
        btnCollectReward.classList.remove('collected');
        return;
    }

    btnCollectReward.style.display = 'block';
    const alreadyCollected = isRewardCollected();
    if (alreadyCollected) {
        btnCollectReward.classList.add('collected');
        btnCollectReward.textContent = 'Reward already collected';
        btnCollectReward.disabled = true;
    } else {
        btnCollectReward.classList.remove('collected');
        btnCollectReward.textContent = 'Collect Reward';
        btnCollectReward.disabled = false;
    }
}

/* ================================
   ฟังก์ชันเล่นใหม่ (Play Again)
   ================================ */

/**
 * Restart game after closing popup.
 * @returns {void}
 */
function playAgain() {
    // รีเซ็ตผลลัพธ์ในหน้าเกมหลัก
    resetRoundResultUI();

    // เริ่มเกมใหม่
    setTimeout(() => {
        initGame();
    }, 300);
}

/* ================================
   Event Listeners สำหรับปุ่ม
   ================================ */

document.addEventListener('DOMContentLoaded', () => {
    const btnCollectReward = document.getElementById('btnCollectReward');
    if (btnCollectReward) {
        btnCollectReward.addEventListener('click', () => {
            if (!lastRewardEligible) return;
            const alreadyCollected = isRewardCollected();
            if (alreadyCollected) return;

            setRewardCollected();
            window.GameAudio?.playSfx(SFX_COMBINED_INGREDIENTS, { volume: 0.85 });
            btnCollectReward.classList.add('collected');
            btnCollectReward.textContent = 'Reward claimed';
            btnCollectReward.disabled = true;
        });
    }

    // ปุ่ม Play Again - เมื่อกดให้เล่นใหม่
    const btnPlayAgain = document.getElementById('btnPlayAgain');
    if (btnPlayAgain) btnPlayAgain.addEventListener('click', playAgain);

    const backMenuLink = document.querySelector('.back-menu-fixed');
    if (backMenuLink) {
        backMenuLink.addEventListener('click', (event) => {
            const href = backMenuLink.getAttribute('href');
            if (!href) return;
            event.preventDefault();
            window.GameAudio?.playSfx(SFX_NEXT_PAGE, { volume: 0.9 });
            setTimeout(() => {
                window.location.href = href;
            }, 120);
        });
    }

    // เริ่มเกม
    initGame();
});

/* ================================
   บันทึกเพิ่มเติม (Additional Notes)
   ================================
   
   1. gameCards: เก็บรายการไพ่ 20 ใบ พร้อมข้อมูล
   2. openedCards: เก็บไพ่ที่ผู้เล่นเปิดในปัจจุบัน (สูงสุด 2 ใบ)
   3. matchedCards: เก็บไพ่ที่จับคู่สำเร็จแล้ว
   4. isChecking: ป้องกันการคลิกซ้ำขณะตรวจสอบคู่
   5. gameWon: ตัวแปรเพื่อทราบว่าชนะเกมหรือไม่
   
   ลำดับการทำงาน:
   1. DOMContentLoaded -> initGame()
   2. ผู้เล่นคลิกไพ่ -> handleCardClick()
   3. ถ้าเปิดครบ 2 ใบ -> checkMatch()
   4. ถ้าตรงกัน -> handleMatchedCards() -> ตรวจหาผู้ชนะ
    5. ถ้าจับคู่ครบทั้งหมด -> handleRoundCompletion()
    6. แสดงข้อความผลลัพธ์ + ปุ่ม Play Again บนหน้าเกมหลัก
    7. ผู้เล่นกด Play Again -> resetRoundResultUI() -> initGame()
   
   ================================ */
