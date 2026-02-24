import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { audioManager } from '../utils/AudioManager';
import { head_project, research, art, programmer, video_editor, project_manager, key_map } from '../assets/credit';

import './MainMenu.css';

const creditSections = [
    { title: 'Head Project', data: head_project },
    { title: 'Research', data: research },
    { title: 'Art', data: art },
    { title: 'Programmer', data: programmer },
    { title: 'Video Editor', data: video_editor },
    { title: 'Project Manager', data: project_manager },
];

const MainMenu: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showCredit, setShowCredit] = useState(false);
    const [creditTab, setCreditTab] = useState<'video' | 'text'>('video');
    const [cakeUnlocked, setCakeUnlocked] = useState(false);

    const [bgmVolume, setBgmVolume] = useState(100);
    const [sfxVolume, setSfxVolume] = useState(100);

    useEffect(() => {
        document.title = 'Mikotomi Maneneko Festival - Main Menu';
        // Initial load simulation or actual asset loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);

        // Resume audio if returning strictly (AudioManager handles activation natively)
        audioManager.initBgm('/assets/audio/BGM/bgm_main_menu.mp3', { loop: true });

        const vols = audioManager.getVolumes();
        setBgmVolume(Math.round(vols.bgm * 100));
        setSfxVolume(Math.round(vols.sfx * 100));

        setCakeUnlocked(localStorage.getItem('game_menu_reward_cake_merged') === 'true');

        return () => clearTimeout(timer);
    }, []);

    const handleStartGame = () => {
        audioManager.playSfx('/assets/audio/SFX/sfx_choose_game.mp3');
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
                <button type="button" className="vanilla-btn" onClick={() => { audioManager.playSfx('/assets/audio/SFX/sfx_next_page.mp3'); setShowSettings(true); }}>ตั้งค่า</button>
                <button type="button" className="vanilla-btn" onClick={handleStartGame}>เริ่มเกม</button>
                <button type="button" className="vanilla-btn" onClick={() => { audioManager.playSfx('/assets/audio/SFX/sfx_next_page.mp3'); setShowCredit(true); }} disabled={!cakeUnlocked}>เครดิต</button>
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

                    <button type="button" className="vanilla-btn settings-reset-btn" onClick={() => {
                        if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดหรือ? (รางวัล, คะแนน, การตั้งค่า จะถูกลบทั้งหมด)')) {
                            localStorage.clear();
                            audioManager.setBgmVolume(1);
                            audioManager.setSfxVolume(1);
                            window.location.reload();
                        }
                    }}>รีเซ็ตข้อมูลทั้งหมด</button>
                    <button type="button" className="vanilla-btn settings-close-btn" onClick={() => setShowSettings(false)}>ปิด</button>
                </div>
            </div>

            {/* Credit Modal */}
            <div className={`credit-modal ${showCredit ? 'show' : ''}`} aria-hidden={!showCredit}>
                <div className="credit-card" role="dialog" aria-modal="true" aria-labelledby="creditTitle">
                    <h2 id="creditTitle">เครดิต</h2>

                    <div className="credit-tabs">
                        <button
                            className={`credit-tab-btn ${creditTab === 'video' ? 'active' : ''}`}
                            onClick={() => setCreditTab('video')}
                        >
                            วิดีโอเครดิต
                        </button>
                        <button
                            className={`credit-tab-btn ${creditTab === 'text' ? 'active' : ''}`}
                            onClick={() => setCreditTab('text')}
                        >
                            รายชื่อเครดิต
                        </button>
                    </div>

                    <div className="credit-content">
                        {creditTab === 'video' && (
                            <video
                                className="credit-video"
                                src="/assets/end_credits.mov"
                                controls
                                playsInline
                                preload="none"
                            />
                        )}

                        {creditTab === 'text' && (
                            <div className="credit-list">
                                {creditSections.map((section) => (
                                    <div key={section.title} className="credit-section">
                                        <h3 className="credit-section-title">{section.title}</h3>
                                        {Array.isArray(section.data) ? (
                                            <p className="credit-names">{section.data.join(', ')}</p>
                                        ) : (
                                            Object.entries(section.data).map(([roleKey, names]) => (
                                                <div key={roleKey} className="credit-role">
                                                    <span className="credit-role-label">{key_map[roleKey as keyof typeof key_map] || roleKey}</span>
                                                    <span className="credit-role-names">{(names as string[]).join(', ')}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="button" className="vanilla-btn credit-close-btn" onClick={() => setShowCredit(false)}>ปิด</button>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
