import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import GameMenu from './pages/GameMenu';
import MatchTheCards from './pages/games/MatchTheCards';
import Minesweeper from './pages/games/Minesweeper';
import TargetShooting from './pages/games/TargetShooting';
import WhackAMole from './pages/games/WhackAMole';
import { triggerBackgroundPreload } from './utils/preloadAssets';

function App() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    triggerBackgroundPreload((p) => {
      setProgress(p);
    }).then(() => {
      setTimeout(() => setLoading(false), 300);
    });
  }, []);

  if (loading) {
    return (
      <div className="global-loading-screen">
        <div className="global-loading-spinner"></div>
        <p className="global-loading-text">กำลังเตรียมข้อมูลให้พร้อมเล่น... {progress}%</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game" element={<GameMenu />} />
        <Route path="/games/match-the-cards" element={<MatchTheCards />} />
        <Route path="/games/minesweeper" element={<Minesweeper />} />
        <Route path="/games/target-shooting" element={<TargetShooting />} />
        <Route path="/games/whack-a-mole" element={<WhackAMole />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
