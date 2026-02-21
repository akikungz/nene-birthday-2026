import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioManager } from '../utils/AudioManager';
import './MainMenu.css';

const MainMenu: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showCredit, setShowCredit] = useState(false);

    const [bgmVolume, setBgmVolume] = useState(100);
    const [sfxVolume, setSfxVolume] = useState(100);

    useEffect(() => {
        // Initial load simulation or actual asset loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);

        // Resume audio if returning strictly (AudioManager handles activation natively)
        audioManager.initBgm('/assets/bgm_main_menu.mp3', { loop: true }); // Need to verify correct BGM path if it existed.

        const vols = audioManager.getVolumes();
        setBgmVolume(Math.round(vols.bgm * 100));
        setSfxVolume(Math.round(vols.sfx * 100));

        return () => clearTimeout(timer);
    }, []);

    const handleStartGame = () => {
        audioManager.playSfx('/assets/sfx_click.mp3'); // Example sfx
        navigate('/game');
    };

    const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setBgmVolume(val);
        audioManager.setBgmVolume(val / 100);
    };

    const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setSfxVolume(val);
        audioManager.setSfxVolume(val / 100);
    };

    return (
        <div className={`game-menu-container ${loading ? 'menu-loading' : ''}`}>
            {loading && (
                <div className="menu-loading-stage" aria-live="polite" aria-label="กำลังโหลดเมนูหลัก">
                    <div className="menu-loading-spinner" aria-hidden="true"></div>
                    <p className="menu-loading-text">กำลังโหลดฉากเทศกาล...</p>
                </div>
            )}

            <video
                className="menu-bg-video"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label="พื้นหลังเมนูหลักแบบเคลื่อนไหว"
            >
                <source src="/assets/main_menu_background_animated.mp4" type="video/mp4" />
            </video>

            <header className="menu-title" aria-label="ชื่อเกม">
                <p className="menu-title-small">Mikotomi Maneneko</p>
                <h1 className="menu-title-main">Matsuri</h1>
            </header>

            <div className="main-menu-actions" aria-label="เมนูหลัก">
                <button type="button" className="vanilla-btn" onClick={() => { audioManager.playSfx('/assets/sfx_click.mp3'); setShowSettings(true); }}>ตั้งค่า</button>
                <button type="button" className="vanilla-btn" onClick={handleStartGame}>เริ่มเกม</button>
                <button type="button" className="vanilla-btn" onClick={() => { audioManager.playSfx('/assets/sfx_click.mp3'); setShowCredit(true); }}>เครดิต</button>
            </div>

            {/* Settings Modal */}
            <div className={`settings-modal ${showSettings ? 'show' : ''}`} aria-hidden={!showSettings}>
                <div className="settings-card" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                    <h2 id="settingsTitle">ตั้งค่า</h2>

                    <label className="settings-row" htmlFor="bgmVolumeSlider">
                        <span>ระดับเสียงเพลงพื้นหลัง</span>
                        <strong>{bgmVolume}%</strong>
                    </label>
                    <input
                        id="bgmVolumeSlider"
                        className="settings-slider"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={bgmVolume}
                        onChange={handleBgmChange}
                        aria-label="ระดับเสียงเพลงพื้นหลัง"
                    />

                    <label className="settings-row" htmlFor="sfxVolumeSlider">
                        <span>ระดับเสียงเอฟเฟกต์</span>
                        <strong>{sfxVolume}%</strong>
                    </label>
                    <input
                        id="sfxVolumeSlider"
                        className="settings-slider"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={sfxVolume}
                        onChange={handleSfxChange}
                        aria-label="ระดับเสียงเอฟเฟกต์"
                    />

                    <button type="button" className="vanilla-btn settings-close-btn" onClick={() => setShowSettings(false)}>ปิด</button>
                </div>
            </div>

            {/* Credit Modal */}
            <div className={`credit-modal ${showCredit ? 'show' : ''}`} aria-hidden={!showCredit}>
                <div className="credit-card" role="dialog" aria-modal="true" aria-labelledby="creditTitle">
                    <h2 id="creditTitle">เครดิต</h2>
                    <p>🎉 คอลเลกชันเกมวันเกิด Mikotomi Maneneko</p>
                    <p>สร้างด้วยความรักเพื่อฉลองวันเกิดของเนเนะ</p>
                    <button type="button" className="vanilla-btn credit-close-btn" onClick={() => setShowCredit(false)}>ปิด</button>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
