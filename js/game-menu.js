const MENU_BGM = "../assets/audio/BGM/bgm_game_menu.mp3";
const SFX_CHOOSE_GAME = "../assets/audio/SFX/sfx_choose_game.mp3";
const SFX_REDIRECT_FALLBACK_MS = 2000;

if (window.GameAudio) {
  window.GameAudio.initBgm(MENU_BGM, { volume: 0.45 });
}

let isRedirecting = false;

const gameLinks = document.querySelectorAll(".asset-link");
gameLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
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
      window.location.href = href;
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
  });
});
