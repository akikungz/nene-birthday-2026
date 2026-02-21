# 🎂 Nene Birthday 2026

A birthday celebration web game for **Nene** — featuring 4 fun mini-games where you collect cake ingredients and assemble a birthday cake!

Built with React + TypeScript + Vite.

## 🎮 How to Play

### Getting Started

1. Open the app and wait for assets to preload
2. From the **Main Menu**, navigate to the **Game Menu**
3. Play all 4 mini-games to collect ingredients
4. Once all ingredients are collected, click the reward area to merge them into a birthday cake 🎂
5. Enjoy the unlocked CG illustration!

### Mini-Games

#### 🃏 Match The Cards (เกมจับคู่อาหาร)

- Flip cards by clicking to reveal food items
- Match 2 identical cards to clear them
- Clear all pairs to complete a round
- **Goal**: Complete **3 rounds** → earn the **Cake Flour** 🌾

#### 💎 Minesweeper (เกมล่าสมบัติ)

- Click cells to dig — avoid the traps (mines)!
- Right-click or long-press to place a flag
- Numbers show how many adjacent traps exist
- 3 difficulty levels: Easy (8×8), Medium (10×10), Hard (12×12)
- **Goal**: **Win any game** → earn the **Sugar** 🧂
- 💡 After 5 losses, a mercy "instant win" button appears

#### 🎯 Target Shooting (ยิงเป้า)

- Click/tap on vegetables (tomato, eggplant, potato, onion) to score
- Avoid bait items (fish, milk, mama) — they cost a life ❤️
- You have 5 lives and 2 minutes 22 seconds
- **Goal**: Score **> 22 points** or survive the timer → earn the **Milk** 🥛

#### 🪵 Whack A Mole (ตีตัวตุ่น)

- Click/tap on **vegetable totems** popping out of holes to score
- **Don't** hit dangerous characters — they cost a life ❤️
- Keyboard shortcut: press 1–6 to hit the corresponding hole
- You have 5 lives and 2 minutes 22 seconds
- **Goal**: Score **> 22 points** or survive the timer → earn the **Egg** 🥚

### 🎂 Assembling the Cake

After collecting all 4 ingredients (Flour, Sugar, Milk, Egg), return to the **Game Menu** and click the reward area in the center. The ingredients will merge into a birthday cake, and a special **CG illustration** will be unlocked!

## 🛠️ Development

### Prerequisites

- Node.js (v18+)
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** for dev server & bundling
- **React Router** for page navigation
- Vanilla CSS for styling
