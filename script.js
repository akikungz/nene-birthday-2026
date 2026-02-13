/* ================================
   Memory Card Game - JavaScript
   ================================ */

// ข้อมูลไพ่ 10 คู่ พร้อมเส้นทางรูปสัตว์
const CARDS_DATA = [
    { name: 'อาหาร1', image: '../Omatsuri Asset 1-5/ข้าวปั้น.png' },
    { name: 'อาหาร2', image: '../Omatsuri Asset 1-5/ฮอทด็อก.png' },
    { name: 'อาหาร3', image: '../Omatsuri Asset 1-5/แซนวิช.png' },
    { name: 'อาหาร4', image: '../Omatsuri Asset 1-5/ไทยากิ.png' },
    { name: 'อาหาร5', image: '../Omatsuri Asset 1-5/ไอศกรีม.png' },
    { name: 'อาหาร6', image: '../Omatsuri Asset 6-10/กุ้งเทมปุระ.png' },
    { name: 'อาหาร7', image: '../Omatsuri Asset 6-10/ทาโกะยากิ.png' },
    { name: 'อาหาร8', image: '../Omatsuri Asset 6-10/ปลาหมึก.png' },
    { name: 'อาหาร9', image: '../Omatsuri Asset 6-10/มันเผา.png' },
    { name: 'อาหาร10', image: '../Omatsuri Asset 6-10/โมจิ.png' }
];

// ตัวแปรสำหรับเก็บสถานะเกม
let gameCards = [];           // รายการไพ่ทั้งหมด (20 ใบ)
let openedCards = [];         // ไพ่ที่เปิดอยู่ในตอนนี้
let matchedCards = [];        // ไพ่ที่จับคู่สำเร็จแล้ว
let isChecking = false;       // ตัวแปรตรวจสอบว่ากำลังตรวจสอบคู่ไพ่หรือไม่
let gameWon = false;          // ตัวแปรระบุว่าชนะเกมหรือไม่
let roundsCompleted = parseInt(localStorage.getItem('roundsCompleted')) || 0; // จำนวนรอบที่เล่น (เก็บใน localStorage)
let milestonePending = false; // true ถ้ากำลังรอรางวัลพิเศษจากการเล่นครบ 3 รอบ
// URL สำหรับกลับเมนู (แก้ค่าตามโครงสร้างโปรเจกต์ของคุณ)
const BACK_TO_MENU_URL = '../index.html';

/* ================================
   ฟังก์ชันเริ่มต้นเกม (Initialize Game)
   ================================ */

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

    // ซ่อน Reward Popup ถ้ายังเปิดอยู่
    hideRewardPopup();

    // อัปเดต UI ของหลอดความคืบหน้า
    updateProgressUI();
}

/* ================================
   ฟังก์ชันสุ่มไพ่ (Shuffle Cards)
   ================================ */

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

function handleMatchedCards(card1, card2) {
    // เพิ่ม class matched
    card1.classList.add('matched');
    card2.classList.add('matched');

    // เก็บไพ่ที่จับคู่
    matchedCards.push(card1, card2);

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
function handleRoundCompletion() {
    // เพิ่มจำนวนรอบ
    roundsCompleted = (parseInt(localStorage.getItem('roundsCompleted')) || 0) + 1;
    localStorage.setItem('roundsCompleted', roundsCompleted);

    // อัปเดต UI ของหลอด
    updateProgressUI();

    // ถ้าถึง 3 รอบ ให้เล่นอนิเมชันหลอดเต็ม แล้วแสดง floating reward (มอบรางวัลพิเศษ)
    if (roundsCompleted >= 3) {
        const fill = document.getElementById('progressFill');
        if (fill) {
            // เพิ่มคลาสเพื่อเล่นอนิเมชัน
            fill.classList.add('filled');
        }

        // กำหนดข้อความรางวัลพิเศษไว้ล่วงหน้า และตั้งสถานะ milestone
        const rewardMessage = document.getElementById('rewardMessage');
        if (rewardMessage) {
            rewardMessage.innerHTML = `
                <div class="reward-icon"><img src="../แป้ง.png" alt="Reward"></div>
                <h2>ยินดีด้วย! เล่นครบ 3 รอบ ได้รางวัลพิเศษ!</h2>
            `;
        }
        milestonePending = true;

        // รอให้อินิเมชันเล่นก่อนแสดง floating reward
        setTimeout(() => {
            showFloatingReward();
        }, 700);
    } else {
        // ปกติ: ซ่อนข้อความรางวัล และแสดงเฉพาะปุ่ม Play Again ในป็อปอัพ
        const rewardMessage = document.getElementById('rewardMessage');
        if (rewardMessage) {
            rewardMessage.style.display = 'none';
            rewardMessage.innerHTML = '';
        }

        // แสดง popup และปุ่ม Play Again ให้กดได้เลย
        showRewardPopup();
        const btnPlayAgain = document.getElementById('btnPlayAgain');
        if (btnPlayAgain) btnPlayAgain.style.display = 'block';
    }
}

function updateProgressUI() {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    const current = parseInt(localStorage.getItem('roundsCompleted')) || 0;
    const percent = Math.min(100, (current / 3) * 100);

    if (fill) fill.style.width = percent + '%';
    if (text) text.textContent = `เล่น ${current}/3 รอบ มีรางวัลให้นะ`;
}

function showMilestoneReward() {
    const rewardMessage = document.getElementById('rewardMessage');
    if (rewardMessage) {
        rewardMessage.innerHTML = `
            <div class="reward-icon"><img src="../แป้ง.png" alt="Reward"></div>
            <h2>ยินดีด้วย! เล่นครบ 3 รอบ ได้รางวัลพิเศษ!</h2>
        `;
    }
    showRewardPopup();
}

/* ================================
   ฟังก์ชันปิดไพ่ (Unflip Cards)
   ================================ */

function unflipCards(card1, card2) {
    // เอาออก class flipped เพื่อปิดไพ่
    card1.classList.remove('flipped');
    card2.classList.remove('flipped');

    // รีเซ็ต
    openedCards = [];
    isChecking = false;
}

/* ================================
   ฟังก์ชันแสดง Floating Reward (Show Floating Reward)
   ================================ */

function showFloatingReward() {
    const floatingReward = document.getElementById('floatingReward');
    
    // สุ่มตำแหน่ง
    const randomX = Math.random() * (window.innerWidth - 120);
    const randomY = Math.random() * (window.innerHeight - 120);
    
    floatingReward.style.left = randomX + 'px';
    floatingReward.style.top = randomY + 'px';
    
    // แสดง reward
    floatingReward.classList.add('show');
    
    // เพิ่ม event listener สำหรับการคลิก
    floatingReward.onclick = handleRewardClick;
}

function handleRewardClick() {
    const floatingReward = document.getElementById('floatingReward');
    
    // เพิ่ม animation ซุมเข้ากลาง
    floatingReward.classList.add('clicked');
    
    // รอให้ animation จบแล้วแสดง popup
    setTimeout(() => {
        floatingReward.classList.remove('show', 'clicked');
        floatingReward.style.left = '0';
        floatingReward.style.top = '0';
        floatingReward.onclick = null;
        // ตั้งข้อความรางวัลให้เป็นข้อความสั้นหลังการคลิกไอคอน
        const rewardMessage = document.getElementById('rewardMessage');
        if (rewardMessage) {
            rewardMessage.innerHTML = `
                <div class="reward-icon"><img src="../แป้ง.png" alt="Reward"></div>
                <h2>ยินดีด้วย! คุณได้รางวัล</h2>
            `;
            rewardMessage.style.display = '';
        }

        showRewardPopup();
    }, 800);
}

/* ================================
   ฟังก์ชันแสดง Reward Popup (Show Reward Popup)
   ================================ */

function showRewardPopup() {
    const overlay = document.getElementById('overlay');
    const rewardPopup = document.getElementById('rewardPopup');

    // แสดง overlay และ popup
    overlay.classList.add('active');
    rewardPopup.classList.add('active');

    // ถ้ารางวัลนี้มาจาก milestone (เล่นครบ 3 รอบ) ให้รีเซ็ตตัวนับหลังจากแสดง popup
    if (milestonePending) {
        roundsCompleted = 0;
        localStorage.setItem('roundsCompleted', roundsCompleted);
        updateProgressUI();

        // เอา class อนิเมชันออก
        const fill = document.getElementById('progressFill');
        if (fill) fill.classList.remove('filled');

        milestonePending = false;
    }
}

/* ================================
   ฟังก์ชันซ่อน Reward Popup (Hide Reward Popup)
   ================================ */

function hideRewardPopup() {
    const overlay = document.getElementById('overlay');
    const rewardPopup = document.getElementById('rewardPopup');
    const btnPlayAgain = document.getElementById('btnPlayAgain');
    const floatingReward = document.getElementById('floatingReward');

    // ซ่อน
    overlay.classList.remove('active');
    rewardPopup.classList.remove('active');
    
    // รีเซ็ต floating reward
    floatingReward.classList.remove('show', 'clicked');
    floatingReward.style.left = '0';
    floatingReward.style.top = '0';
    floatingReward.onclick = null;

    // ซ่อนปุ่ม Play Again
    btnPlayAgain.style.display = 'none';
}

/* ================================
   ฟังก์ชันเล่นใหม่ (Play Again)
   ================================ */

function playAgain() {
    // ซ่อน Reward Popup
    hideRewardPopup();

    // เริ่มเกมใหม่
    setTimeout(() => {
        initGame();
    }, 300);
}

/* ================================
   Event Listeners สำหรับปุ่ม
   ================================ */

document.addEventListener('DOMContentLoaded', () => {
    // ปุ่ม Play Again - เมื่อกดให้เล่นใหม่
    const btnPlayAgain = document.getElementById('btnPlayAgain');
    if (btnPlayAgain) btnPlayAgain.addEventListener('click', playAgain);

    // ปุ่ม Back to Menu - เมื่อกดให้กลับไปยังเมนูหลัก
    const btnBackToMenu = document.getElementById('btnBackToMenu');
    if (btnBackToMenu) btnBackToMenu.addEventListener('click', () => {
        // ถ้ามี URL ตั้งไว้ ให้ไปหน้าเมนู
        if (BACK_TO_MENU_URL) {
            window.location.href = BACK_TO_MENU_URL;
        }
    });

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
   5. ถ้าจับคู่ครบทั้งหมด -> showRewardPopup()
   6. ผู้เล่นกด OK -> ซ่อนข้อความ แสดงปุ่ม Play Again
   7. ผู้เล่นกด Play Again -> hideRewardPopup() -> initGame()
   
   ================================ */
