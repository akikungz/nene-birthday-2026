const MENU_BGM = "./assets/audio/BGM/bgm_game_menu.mp3";
const SFX_CHOOSE_GAME = "./assets/audio/SFX/sfx_choose_game.mp3";
const SFX_REDIRECT_FALLBACK_MS = 2000;
const START_TARGET = "./game/index.html";

if (window.GameAudio) {
  window.GameAudio.initBgm(MENU_BGM, { volume: 0.45 });
}

let isRedirecting = false;

const menuButtons = document.querySelectorAll("[data-menu-action]");
const creditModal = document.getElementById("creditModal");
const settingsModal = document.getElementById("settingsModal");
const bgmVolumeSlider = document.getElementById("bgmVolumeSlider");
const sfxVolumeSlider = document.getElementById("sfxVolumeSlider");
const bgmVolumeValue = document.getElementById("bgmVolumeValue");
const sfxVolumeValue = document.getElementById("sfxVolumeValue");

/**
 * Play menu select SFX, then run callback when SFX ends (or fallback timeout).
 * @param {() => void} onDone
 * @returns {void}
 */
function playMenuSfx(onDone) {
  const sfx = window.GameAudio?.playSfx(SFX_CHOOSE_GAME, { volume: 0.9 });

  if (!sfx) {
    window.setTimeout(() => {
      onDone();
    }, 120);
    return;
  }

  let resolved = false;
  const finish = () => {
    if (resolved) return;
    resolved = true;
    onDone();
  };

  sfx.addEventListener("ended", finish, { once: true });
  sfx.addEventListener("error", finish, { once: true });

  window.setTimeout(() => {
    finish();
  }, SFX_REDIRECT_FALLBACK_MS);
}

/**
 * Play menu select SFX without waiting for completion.
 * @returns {void}
 */
function playMenuSfxImmediate() {
  window.GameAudio?.playSfx(SFX_CHOOSE_GAME, { volume: 0.9 });
}

/**
 * Show credits modal dialog.
 * @returns {void}
 */
function showCredit() {
  if (!creditModal) return;
  creditModal.classList.add("show");
  creditModal.setAttribute("aria-hidden", "false");
}

/**
 * Hide credits modal dialog.
 * @returns {void}
 */
function hideCredit() {
  if (!creditModal) return;
  creditModal.classList.remove("show");
  creditModal.setAttribute("aria-hidden", "true");
}

/**
 * Synchronize settings modal slider UI with global audio volume state.
 * @returns {void}
 */
function syncSettingsModalUi() {
  const volumes = window.GameAudio?.getVolumes?.() || { bgm: 1, sfx: 1 };
  const bgmPercent = Math.round((volumes.bgm || 0) * 100);
  const sfxPercent = Math.round((volumes.sfx || 0) * 100);

  if (bgmVolumeSlider) {
    bgmVolumeSlider.value = String(bgmPercent);
  }
  if (sfxVolumeSlider) {
    sfxVolumeSlider.value = String(sfxPercent);
  }
  if (bgmVolumeValue) {
    bgmVolumeValue.textContent = `${bgmPercent}%`;
  }
  if (sfxVolumeValue) {
    sfxVolumeValue.textContent = `${sfxPercent}%`;
  }
}

/**
 * Show settings modal and refresh its slider values.
 * @returns {void}
 */
function showSettings() {
  if (!settingsModal) return;
  hideCredit();
  syncSettingsModalUi();
  settingsModal.classList.add("show");
  settingsModal.setAttribute("aria-hidden", "false");
}

/**
 * Hide settings modal dialog.
 * @returns {void}
 */
function hideSettings() {
  if (!settingsModal) return;
  settingsModal.classList.remove("show");
  settingsModal.setAttribute("aria-hidden", "true");
}

if (bgmVolumeSlider) {
  bgmVolumeSlider.addEventListener("input", () => {
    const value = Number(bgmVolumeSlider.value) / 100;
    window.GameAudio?.setBgmVolume?.(value);
    if (bgmVolumeValue) {
      bgmVolumeValue.textContent = `${Math.round(value * 100)}%`;
    }
  });
}

if (sfxVolumeSlider) {
  sfxVolumeSlider.addEventListener("input", () => {
    const value = Number(sfxVolumeSlider.value) / 100;
    window.GameAudio?.setSfxVolume?.(value);
    if (sfxVolumeValue) {
      sfxVolumeValue.textContent = `${Math.round(value * 100)}%`;
    }
  });
}

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const action = button.dataset.menuAction;
    if (!action) {
      return;
    }

    if (action === "close-credit") {
      // playMenuSfxImmediate();
      hideCredit();
      return;
    }

    if (action === "close-settings") {
      // playMenuSfxImmediate();
      hideSettings();
      return;
    }

    if (isRedirecting) {
      return;
    }

    if (action === "start") {
      isRedirecting = true;
      playMenuSfx(() => {
        window.location.href = START_TARGET;
      });
      return;
    }

    if (action === "settings") {
      // playMenuSfxImmediate();
      showSettings();
      return;
    }

    if (action === "credit") {
      hideSettings();
      // playMenuSfxImmediate();
      showCredit();
    }
  });
});

if (creditModal) {
  creditModal.addEventListener("click", (event) => {
    if (event.target === creditModal) {
      hideCredit();
    }
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      hideSettings();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideCredit();
    hideSettings();
  }
});
