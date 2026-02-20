const MENU_BGM = "../assets/audio/BGM/bgm_game_menu.mp3";
const SFX_CHOOSE_GAME = "../assets/audio/SFX/sfx_choose_game.mp3";
const SFX_REDIRECT_FALLBACK_MS = 2000;

if (window.GameAudio) {
  window.GameAudio.initBgm(MENU_BGM, { volume: 0.45 });
}

let isRedirecting = false;

/**
 * Navigate browser to the selected game URL.
 * @param {string} href
 * @returns {void}
 */
function navigateToGame(href) {
  window.location.href = href;
}

/**
 * Handle click behavior for one game link with delayed redirect after SFX.
 * @param {MouseEvent} event
 * @param {HTMLAnchorElement} link
 * @returns {void}
 */
function handleGameLinkClick(event, link) {
  if (isRedirecting) {
    event.preventDefault();
    return;
  }

  const href = link.getAttribute("href");
  if (!href) {
    return;
  }

  event.preventDefault();
  isRedirecting = true;

  const navigate = () => {
    navigateToGame(href);
  };

  const sfx = window.GameAudio?.playSfx(SFX_CHOOSE_GAME, { volume: 0.9 });

  if (!sfx) {
    window.setTimeout(navigate, 150);
    return;
  }

  let resolved = false;
  const finishAndNavigate = () => {
    if (resolved) return;
    resolved = true;
    navigate();
  };

  sfx.addEventListener("ended", finishAndNavigate, { once: true });
  sfx.addEventListener("error", finishAndNavigate, { once: true });

  window.setTimeout(() => {
    finishAndNavigate();
  }, SFX_REDIRECT_FALLBACK_MS);
}

const gameLinks = document.querySelectorAll(".asset-link");
gameLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    handleGameLinkClick(event, link);
  });
});

const backMainBtn = document.querySelector(".back-main-btn");
if (backMainBtn) {
  backMainBtn.addEventListener("click", (event) => {
    if (!(backMainBtn instanceof HTMLAnchorElement)) {
      return;
    }
    handleGameLinkClick(event, backMainBtn);
  });
}
