(function () {
  const userActivatedEvents = ["pointerdown", "keydown", "touchstart"];
  const STORAGE_BGM_VOLUME_KEY = "game_audio_bgm_volume";
  const STORAGE_SFX_VOLUME_KEY = "game_audio_sfx_volume";
  const SETTINGS_STYLE_ID = "game-audio-settings-style";

  let bgmAudio = null;
  let bgmSrc = "";
  let bgmBaseVolume = 1;
  let bgmVolumeSetting = 0.5;
  let sfxVolumeSetting = 1;
  let activated = false;
  let settingsRoot = null;
  let bgmSlider = null;
  let sfxSlider = null;
  let bgmValueLabel = null;
  let sfxValueLabel = null;

  function clamp01(value) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return 0;
    }
    return Math.min(1, Math.max(0, number));
  }

  function loadVolumeSetting(storageKey, fallback) {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null || raw === "") {
      return fallback;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return clamp01(parsed);
  }

  function saveVolumeSetting(storageKey, value) {
    window.localStorage.setItem(storageKey, String(clamp01(value)));
  }

  function getEffectiveBgmVolume() {
    return clamp01(bgmBaseVolume * bgmVolumeSetting);
  }

  function getEffectiveSfxVolume(baseVolume = 1) {
    return clamp01(clamp01(baseVolume) * sfxVolumeSetting);
  }

  function applyBgmVolume() {
    if (!bgmAudio) {
      return;
    }
    bgmAudio.volume = getEffectiveBgmVolume();
  }

  function syncSettingsUi() {
    const bgmPercent = Math.round(bgmVolumeSetting * 100);
    const sfxPercent = Math.round(sfxVolumeSetting * 100);

    if (bgmSlider) {
      bgmSlider.value = String(bgmPercent);
    }
    if (sfxSlider) {
      sfxSlider.value = String(sfxPercent);
    }
    if (bgmValueLabel) {
      bgmValueLabel.textContent = `${bgmPercent}%`;
    }
    if (sfxValueLabel) {
      sfxValueLabel.textContent = `${sfxPercent}%`;
    }
  }

  function setBgmVolume(value) {
    bgmVolumeSetting = clamp01(value);
    saveVolumeSetting(STORAGE_BGM_VOLUME_KEY, bgmVolumeSetting);
    applyBgmVolume();
    syncSettingsUi();
  }

  function setSfxVolume(value) {
    sfxVolumeSetting = clamp01(value);
    saveVolumeSetting(STORAGE_SFX_VOLUME_KEY, sfxVolumeSetting);
    syncSettingsUi();
  }

  function getVolumes() {
    return {
      bgm: bgmVolumeSetting,
      sfx: sfxVolumeSetting,
    };
  }

  function ensureSettingsStyle() {
    if (document.getElementById(SETTINGS_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = SETTINGS_STYLE_ID;
    style.textContent = `
      .audio-settings-root {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 9999;
        font-family: inherit;
      }

      .audio-settings-toggle {
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        background: rgba(26, 26, 26, 0.88);
        color: #fff;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
      }

      .audio-settings-panel {
        position: absolute;
        right: 0;
        bottom: 56px;
        width: 220px;
        max-width: calc(100vw - 24px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(12, 12, 12, 0.93);
        color: #fff;
        padding: 12px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
        opacity: 0;
        visibility: hidden;
        transform: translateY(8px);
        transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
      }

      .audio-settings-root.open .audio-settings-panel {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .audio-settings-title {
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 700;
      }

      .audio-settings-row {
        display: grid;
        grid-template-columns: 1fr auto;
        column-gap: 10px;
        row-gap: 6px;
        align-items: center;
        margin-bottom: 10px;
      }

      .audio-settings-row:last-child {
        margin-bottom: 0;
      }

      .audio-settings-label,
      .audio-settings-value {
        font-size: 12px;
      }

      .audio-settings-value {
        font-weight: 700;
      }

      .audio-settings-slider {
        grid-column: 1 / span 2;
        width: 100%;
      }
    `;

    document.head.appendChild(style);
  }

  function closeSettingsPanel() {
    if (!settingsRoot) {
      return;
    }
    settingsRoot.classList.remove("open");
  }

  function openSettingsPanel() {
    if (!settingsRoot) {
      return;
    }
    settingsRoot.classList.add("open");
  }

  function ensureSettingsUi() {
    if (settingsRoot || !document.body) {
      return;
    }

    ensureSettingsStyle();

    settingsRoot = document.createElement("div");
    settingsRoot.className = "audio-settings-root";
    settingsRoot.innerHTML = `
      <button type="button" class="audio-settings-toggle" aria-label="Audio settings" title="Audio settings">🔊</button>
      <div class="audio-settings-panel" role="dialog" aria-label="Audio settings">
        <h3 class="audio-settings-title">Audio Settings</h3>
        <div class="audio-settings-row">
          <span class="audio-settings-label">BGM Volume</span>
          <span class="audio-settings-value" data-audio-value="bgm">50%</span>
          <input class="audio-settings-slider" data-audio-slider="bgm" type="range" min="0" max="100" step="1" value="50" aria-label="BGM volume">
        </div>
        <div class="audio-settings-row">
          <span class="audio-settings-label">SFX Volume</span>
          <span class="audio-settings-value" data-audio-value="sfx">100%</span>
          <input class="audio-settings-slider" data-audio-slider="sfx" type="range" min="0" max="100" step="1" value="100" aria-label="SFX volume">
        </div>
      </div>
    `;

    document.body.appendChild(settingsRoot);

    const toggle = settingsRoot.querySelector(".audio-settings-toggle");
    bgmSlider = settingsRoot.querySelector('[data-audio-slider="bgm"]');
    sfxSlider = settingsRoot.querySelector('[data-audio-slider="sfx"]');
    bgmValueLabel = settingsRoot.querySelector('[data-audio-value="bgm"]');
    sfxValueLabel = settingsRoot.querySelector('[data-audio-value="sfx"]');

    toggle?.addEventListener("click", () => {
      if (settingsRoot.classList.contains("open")) {
        closeSettingsPanel();
      } else {
        openSettingsPanel();
      }
    });

    bgmSlider?.addEventListener("input", () => {
      const value = Number(bgmSlider.value) / 100;
      setBgmVolume(value);
    });

    sfxSlider?.addEventListener("input", () => {
      const value = Number(sfxSlider.value) / 100;
      setSfxVolume(value);
    });

    document.addEventListener("click", (event) => {
      if (!settingsRoot || !settingsRoot.classList.contains("open")) {
        return;
      }

      if (!(event.target instanceof Node)) {
        return;
      }

      if (!settingsRoot.contains(event.target)) {
        closeSettingsPanel();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSettingsPanel();
      }
    });

    syncSettingsUi();
  }

  function markActivated() {
    if (activated) {
      return;
    }
    activated = true;
    tryPlayBgm();
  }

  function bindActivationEvents() {
    userActivatedEvents.forEach((eventName) => {
      document.addEventListener(eventName, markActivated, { once: true, passive: true });
    });
  }

  function tryPlayBgm() {
    if (!bgmAudio || !bgmSrc) {
      return;
    }

    applyBgmVolume();
    if (!activated) {
      return;
    }

    const playPromise = bgmAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Browser autoplay policy may block until user interaction.
      });
    }
  }

  function initBgm(src, options = {}) {
    if (!src) {
      return;
    }

    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio = null;
    }

    bgmSrc = src;
    bgmBaseVolume = typeof options.volume === "number" ? clamp01(options.volume) : 1;

    bgmAudio = new Audio(src);
    bgmAudio.loop = options.loop !== false;
    bgmAudio.preload = "auto";
    applyBgmVolume();

    bindActivationEvents();
    tryPlayBgm();
  }

  function stopBgm() {
    if (!bgmAudio) {
      return;
    }
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  }

  function playSfx(src, options = {}) {
    if (!src) {
      return null;
    }

    const audio = new Audio(src);
    audio.preload = "auto";
    const baseVolume = typeof options.volume === "number" ? options.volume : 0.9;
    audio.volume = getEffectiveSfxVolume(baseVolume);

    if (typeof options.playbackRate === "number") {
      audio.playbackRate = options.playbackRate;
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Ignore blocked or interrupted SFX plays.
      });
    }

    return audio;
  }

  document.addEventListener("visibilitychange", () => {
    if (!bgmAudio) {
      return;
    }

    if (document.hidden) {
      bgmAudio.pause();
    } else {
      tryPlayBgm();
    }
  });

  bgmVolumeSetting = loadVolumeSetting(STORAGE_BGM_VOLUME_KEY, 1);
  sfxVolumeSetting = loadVolumeSetting(STORAGE_SFX_VOLUME_KEY, 1);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureSettingsUi, { once: true });
  } else {
    ensureSettingsUi();
  }

  window.GameAudio = {
    initBgm,
    stopBgm,
    playSfx,
    setBgmVolume,
    setSfxVolume,
    getVolumes,
    openSettings: openSettingsPanel,
    closeSettings: closeSettingsPanel,
  };
})();
