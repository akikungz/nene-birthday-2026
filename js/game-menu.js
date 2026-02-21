const MENU_BGM = "../assets/audio/BGM/bgm_game_menu.mp3";
const SFX_CHOOSE_GAME = "../assets/audio/SFX/sfx_choose_game.mp3";
const SFX_REDIRECT_FALLBACK_MS = 2000;
const REWARD_CAKE_MERGED_STORAGE_KEY = "game_menu_reward_cake_merged";
const REWARD_MERGE_MS = 900;

if (window.GameAudio) {
  window.GameAudio.initBgm(MENU_BGM, { volume: 0.45 });
}

let isRedirecting = false;

/** @returns {HTMLElement | null} */
function getRewardContainer() {
  const reward = document.querySelector(".reward");
  return reward instanceof HTMLElement ? reward : null;
}

/**
 * @returns {HTMLElement[]}
 */
function getRewardItems() {
  return [...document.querySelectorAll(".reward-item")].filter(
    (item) => item instanceof HTMLElement,
  );
}

/**
 * Parse comma-separated storage keys from one reward item element.
 * @param {Element} item
 * @returns {string[]}
 */
function getRewardKeys(item) {
  const raw = item.getAttribute("data-reward-keys") || "";
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

/**
 * Check whether a reward should be considered unlocked.
 * @param {string[]} keys
 * @returns {boolean}
 */
function isRewardUnlocked(keys) {
  return keys.some((key) => localStorage.getItem(key) === "true");
}

/**
 * @returns {boolean}
 */
function areAllRewardsUnlocked() {
  const rewardItems = getRewardItems();
  if (!rewardItems.length) {
    return false;
  }

  return rewardItems.every((item) => isRewardUnlocked(getRewardKeys(item)));
}

/**
 * @returns {boolean}
 */
function isCakeMergedStored() {
  return localStorage.getItem(REWARD_CAKE_MERGED_STORAGE_KEY) === "true";
}

/**
 * @returns {void}
 */
function setCakeMergedStored() {
  localStorage.setItem(REWARD_CAKE_MERGED_STORAGE_KEY, "true");
}

/**
 * @returns {void}
 */
function clearCakeMergedStored() {
  localStorage.removeItem(REWARD_CAKE_MERGED_STORAGE_KEY);
}

/**
 * Update all reward items in the game menu based on minigame progress flags.
 * @returns {void}
 */
function syncRewardUnlockState() {
  const rewardItems = getRewardItems();
  const rewardContainer = getRewardContainer();

  rewardItems.forEach((item) => {
    const keys = getRewardKeys(item);
    const unlocked = isRewardUnlocked(keys);

    item.classList.toggle("locked", !unlocked);
    item.classList.toggle("unlocked", unlocked);
    item.setAttribute("aria-label", unlocked ? "Reward unlocked" : "Reward locked");
  });

  if (!rewardContainer) {
    return;
  }

  const allUnlocked = areAllRewardsUnlocked();
  if (!allUnlocked) {
    clearCakeMergedStored();
    rewardContainer.classList.remove("is-merging", "is-merged", "merge-ready");
    rewardContainer.setAttribute("aria-disabled", "true");
    rewardContainer.setAttribute("title", "Unlock all rewards to merge into a cake");
    return;
  }

  const merged = isCakeMergedStored();
  rewardContainer.classList.toggle("is-merged", merged);
  rewardContainer.classList.remove("is-merging");
  rewardContainer.classList.toggle("merge-ready", !merged);
  rewardContainer.setAttribute("aria-disabled", merged ? "true" : "false");
  rewardContainer.setAttribute(
    "title",
    merged ? "Cake completed!" : "All rewards unlocked! Click to merge into a cake",
  );
}

/**
 * @returns {void}
 */
function triggerRewardMerge() {
  const rewardContainer = getRewardContainer();
  if (!rewardContainer) {
    return;
  }

  if (!areAllRewardsUnlocked()) {
    rewardContainer.classList.remove("merge-locked");
    void rewardContainer.offsetWidth;
    rewardContainer.classList.add("merge-locked");
    return;
  }

  if (rewardContainer.classList.contains("is-merging") || rewardContainer.classList.contains("is-merged")) {
    return;
  }

  rewardContainer.classList.remove("merge-ready");
  rewardContainer.classList.add("is-merging");

  window.setTimeout(() => {
    rewardContainer.classList.remove("is-merging");
    rewardContainer.classList.add("is-merged");
    setCakeMergedStored();
    syncRewardUnlockState();
  }, REWARD_MERGE_MS);
}

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

const rewardContainer = getRewardContainer();
if (rewardContainer) {
  rewardContainer.addEventListener("click", () => {
    triggerRewardMerge();
  });

  rewardContainer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    triggerRewardMerge();
  });
}

window.addEventListener("storage", () => {
  syncRewardUnlockState();
});

window.addEventListener("pageshow", () => {
  syncRewardUnlockState();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncRewardUnlockState();
  }
});

syncRewardUnlockState();
