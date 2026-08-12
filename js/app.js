import { CONFIG, VIEW_MODE_KEY } from "./config.js";
import {
  PROJECTS,
  GALLERIES,
  getCoverPath,
  getMobileCoverPath,
  getScrubPaths,
  isVideoPath,
  getMobileVideoPath,
} from "./projects.js";

console.log("Application initializing...");

/**
 * Tab mood set (sad → happy). Used for title wave + single favicon cycle.
 */
const TAB_MOOD_LEVELS = ["😔", "🙁", "🙂", "😄"];

const TAB_SLOT_COUNT = 5;
const TAB_EMOJI_INTERVAL_MS = 260;
let tabMoodFrame = 0;
let tabMoodFrames = [];
let tabFaviconMood = 0;
let tabMoodTimer = null;
let tabTitleFlip = false;
let tabFaviconIsDefault = false;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Parallel diagonal wave — rise then fall (no all-sad snap).
 * L→R up, L→R down, R→L up, R→L down, loop.
 */
function buildTabMoodFrames(levels) {
  const max = levels.length - 1;
  const frames = [];
  let prev = "";

  const push = (state) => {
    const next = state.map((lv) => levels[lv]).join("");
    if (next === prev) return;
    frames.push(next);
    prev = next;
  };

  const riseLeft = (t) => {
    const state = [];
    for (let i = 0; i < TAB_SLOT_COUNT; i++) {
      state.push(clamp(t - i, 0, max));
    }
    return state;
  };

  const riseRight = (t) => {
    const state = [];
    for (let i = 0; i < TAB_SLOT_COUNT; i++) {
      state.push(clamp(t - (TAB_SLOT_COUNT - 1 - i), 0, max));
    }
    return state;
  };

  const steps = TAB_SLOT_COUNT + max;

  // L→R rise
  for (let t = 0; t <= steps; t++) push(riseLeft(t));
  // L→R fall (left leads back down)
  for (let t = 1; t <= steps; t++) {
    push(riseLeft(steps - t));
  }

  // R→L rise
  for (let t = 1; t <= steps; t++) push(riseRight(t));
  // R→L fall (right leads back down)
  for (let t = 1; t <= steps; t++) {
    push(riseRight(steps - t));
  }

  return frames;
}

function emojiToFaviconHref(emoji) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, size, size);
  ctx.font = `48px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 1);
  return canvas.toDataURL("image/png");
}

function ensureTabFaviconLink() {
  let link = document.getElementById("favicon");
  if (link) return link;
  link = document.createElement("link");
  link.id = "favicon";
  link.rel = "icon";
  link.type = "image/png";
  document.head.appendChild(link);
  return link;
}

function setTabFaviconEmoji(emoji) {
  const href = emojiToFaviconHref(emoji);
  if (!href) return;
  tabFaviconIsDefault = false;
  const link = ensureTabFaviconLink();
  link.type = "image/png";
  link.href = href;
}

function setTabFaviconBrowserDefault() {
  if (tabFaviconIsDefault) return;
  const link = document.getElementById("favicon");
  if (link) link.remove();
  tabFaviconIsDefault = true;
}

function rebuildTabMoodFrames() {
  tabMoodFrames = buildTabMoodFrames(TAB_MOOD_LEVELS);
  tabMoodFrame = 0;
}

/** Browsers often ignore identical title sets — flip ZWSP so every tick applies. */
function setTabTitle(text) {
  tabTitleFlip = !tabTitleFlip;
  document.title = tabTitleFlip ? text : `${text}\u200B`;
}

function updateEmojiTabTitle() {
  if (!tabMoodFrames.length) rebuildTabMoodFrames();

  if (window.innerWidth < 800) {
    const mood = TAB_MOOD_LEVELS[tabFaviconMood % TAB_MOOD_LEVELS.length];
    setTabFaviconEmoji(mood);
    setTabTitle(mood);
    tabFaviconMood = (tabFaviconMood + 1) % TAB_MOOD_LEVELS.length;
    return;
  }

  setTabFaviconBrowserDefault();
  const len = tabMoodFrames.length;
  if (!len) return;
  // Explicit wrap so the wave clearly restarts
  if (tabMoodFrame >= len) tabMoodFrame = 0;
  setTabTitle(tabMoodFrames[tabMoodFrame]);
  tabMoodFrame += 1;
  if (tabMoodFrame >= len) tabMoodFrame = 0;
}

function scheduleTabMoodTick() {
  if (tabMoodTimer) clearTimeout(tabMoodTimer);
  tabMoodTimer = setTimeout(() => {
    updateEmojiTabTitle();
    scheduleTabMoodTick();
  }, TAB_EMOJI_INTERVAL_MS);
}

function startEmojiTabTitle() {
  rebuildTabMoodFrames();
  updateEmojiTabTitle();
  scheduleTabMoodTick();
  window.addEventListener("resize", () => {
    // Don't advance on resize — just refresh favicon mode
    if (window.innerWidth < 800) {
      tabFaviconIsDefault = false;
    }
  });
}

startEmojiTabTitle();

if (navigator.userAgent.includes("Instagram")) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.zIndex = "99999999";
  overlay.style.background =
    "radial-gradient(circle at top right, rgba(0, 123, 255, 0.4) 0%, transparent 40%), white";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = '"Programme", sans-serif';
  overlay.style.fontSize = "1rem";
  overlay.innerText = "please open website on external browser :)";
  document.body.appendChild(overlay);
}

try {
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
} catch (e) {}

const shadowObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.shadowRoot) {
          injectShadowStyles(node.shadowRoot);
        }
        if (
          node.nodeType === 1 &&
          node.tagName.toLowerCase() === "model-viewer"
        ) {
          if (node.shadowRoot) injectShadowStyles(node.shadowRoot);
        }
      });
    }
  });
});

shadowObserver.observe(document.body, { childList: true, subtree: true });

setInterval(() => {
  document.querySelectorAll("*").forEach((el) => {
    if (el.shadowRoot) injectShadowStyles(el.shadowRoot);
  });
}, 500);

function injectShadowStyles(shadowRoot) {
  if (shadowRoot.querySelector("style[data-cursor-fix]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-cursor-fix", "true");
  style.textContent = `
    :host, :host *, * { cursor: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjbQg61aAAAADUlEQVQYV2P4//8/IwAI/QL/+TZZdwAAAABJRU5ErkJggg=='), none !important; caret-color: transparent !important; }
    a, button, input, canvas, div, .container { cursor: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjbQg61aAAAADUlEQVQYV2P4//8/IwAI/QL/+TZZdwAAAABJRU5ErkJggg=='), none !important; }
  `;
  shadowRoot.appendChild(style);
}

document.querySelectorAll("*").forEach((el) => {
  if (el.shadowRoot) injectShadowStyles(el.shadowRoot);
});

["mouseover", "mousedown", "mouseup", "click", "focus"].forEach((evt) => {
  document.addEventListener(
    evt,
    (e) => {
      if (e.target && e.target.style) {
        e.target.style.cursor = "none";
      }
      if (evt === "mouseup" || evt === "click") {
        if (
          document.activeElement &&
          document.activeElement !== document.body
        ) {
          document.activeElement.blur();
        }
      }
    },
    { capture: true, passive: false },
  );
});

document.addEventListener("dragstart", (e) => e.preventDefault());
document.addEventListener("selectstart", (e) => e.preventDefault());
document.addEventListener("contextmenu", (e) => e.preventDefault());

const savedViewMode = localStorage.getItem(VIEW_MODE_KEY);
const initialViewMode = "trail";
if (savedViewMode && savedViewMode !== "trail") {
  localStorage.setItem(VIEW_MODE_KEY, "trail");
}

const state = {
  lastX: 0,
  lastY: 0,
  count: 0,
  hasMoved: false,
  isZoomed: false,
  zoomedElement: null,
  currentGalleryIndex: 0,
  currentSlideIndex: 0,
  isAnimating: false,
  aboutActive: false,
  collisionEdges: {
    top: false,
    bottom: false,
    left: false,
    right: false,
  },
  isMobile: false,
  isLoading: true,
  isMuted: true,
  soundUnlocked: false,
  hasEntered: false,
  viewMode: initialViewMode,
  currentMobileScale: 1,
  anchorEdge: null,
  currentScale: 1,
  currentTx: 0,
  currentTy: 0,
  slideRequestId: 0,
  clickAlt: false,
};

let touchMoved = false;
let touchStartTime = 0;

const HOVER_POOL_SIZE = 10;
const hoverPool = [];
let hoverPoolIndex = 0;

for (let i = 0; i < HOVER_POOL_SIZE; i++) {
  const a = new Audio("sounds/click.mp3");
  a.preload = "auto";
  a.volume = 1.0;
  hoverPool.push(a);
}

const soundOn = new Audio("sounds/on.mp3");
soundOn.preload = "auto";
const soundOff = new Audio("sounds/off.mp3");
soundOff.preload = "auto";
const zoomSound = new Audio("sounds/zoom.mp3");
zoomSound.preload = "auto";
const skipSound = new Audio("sounds/skip.mp3");
skipSound.preload = "auto";
const blingSound = new Audio("sounds/bling.mp3");
blingSound.preload = "auto";
blingSound.volume = 1.0;

const NOTIFY_POOL_SIZE = 3;
const notifyPool = [];
let notifyPoolIndex = 0;
for (let i = 0; i < NOTIFY_POOL_SIZE; i++) {
  const a = new Audio("sounds/notification.mp3");
  a.preload = "auto";
  a.volume = 0.18;
  notifyPool.push(a);
}

const canvas = document.getElementById("canvas");
const aboutPage = document.getElementById("about-page");
const backdrop = document.getElementById("backdrop");
const helperText = document.getElementById("helper-text");
const navCenter = document.getElementById("nav-center");
const navHome = document.getElementById("nav-home");
const navAbout = document.getElementById("nav-about");
const navSound = document.getElementById("nav-sound");
const navScale = document.getElementById("nav-scale");
const scaleHintGlow = document.getElementById("scale-hint-glow");
const SCALE_HINT_DELAY_MS = 4000;
const SCALE_CURSOR_NEAR_PX = 72;
const SCALE_SAD_EMOJIS = ["😔", "🙁", "😢", "😞", "😟", "😕"];
const SCALE_HAPPY_EMOJIS = ["😄", "🙂", "😊", "😁", "🤩", "✨"];
let scaleHintTimeout = null;
let scaleHintFromRight = false;
let scaleEmojiTimeout = null;
/** Once the user clicks scale this zoom, never re-hint */
let scaleHintDismissed = false;
const navViewMode = document.getElementById("nav-view-mode");
const navShuffle = document.getElementById("nav-shuffle");
const footerText = document.getElementById("footer-text");
const footerEl = document.querySelector("footer");
const customCursor = document.getElementById("custom-cursor");
const swipeHintEl = document.getElementById("swipe-hint");
const gridView = document.getElementById("grid-view");
const welcomeScreen = document.getElementById("welcome-screen");

function updateCustomCursor(cx, cy, rotation = 0) {
  if (!customCursor || state.isMobile) return;
  customCursor.style.left = cx + "px";
  customCursor.style.top = cy + "px";
  customCursor.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
}

function activateWelcomeCursor() {
  if (!state.isMobile && customCursor && welcomeScreen) {
    customCursor.classList.add("cursor-active");
  }
}

const WELCOME_PLUS_MIN_DIST = 18;
const WELCOME_DRAW_EMOJIS = ["😔", "🙁", "🙂", "😄", "😊", "✨"];
let welcomePlusLastX = null;
let welcomePlusLastY = null;
let welcomeStampCount = 0;

function stampWelcomePlus(cx, cy) {
  if (!welcomeScreen || state.hasEntered || state.isMobile) return;
  if (welcomePlusLastX != null) {
    const dist = Math.hypot(cx - welcomePlusLastX, cy - welcomePlusLastY);
    if (dist < WELCOME_PLUS_MIN_DIST) return;

    // Longer draw → more likely to drop an emoji between pluses
    const chance = Math.min(0.55, 0.04 + welcomeStampCount * 0.012);
    if (Math.random() < chance) {
      const t = 0.35 + Math.random() * 0.3;
      const ex = welcomePlusLastX + (cx - welcomePlusLastX) * t;
      const ey = welcomePlusLastY + (cy - welcomePlusLastY) * t;
      const emoji = document.createElement("span");
      emoji.className = "welcome-plus-mark welcome-draw-emoji";
      emoji.textContent =
        WELCOME_DRAW_EMOJIS[
          Math.floor(Math.random() * WELCOME_DRAW_EMOJIS.length)
        ];
      emoji.style.left = `${ex}px`;
      emoji.style.top = `${ey}px`;
      welcomeScreen.appendChild(emoji);
    }
  }
  welcomePlusLastX = cx;
  welcomePlusLastY = cy;
  welcomeStampCount += 1;
  const mark = document.createElement("span");
  mark.className = "welcome-plus-mark";
  mark.textContent = "+";
  mark.style.left = `${cx}px`;
  mark.style.top = `${cy}px`;
  welcomeScreen.appendChild(mark);
}

function getProjectByBoxId(boxId) {
  return PROJECTS[boxId - 1] || null;
}

function getProjectByGalleryIndex(galleryIndex) {
  return PROJECTS[galleryIndex] || null;
}

function updateHelperText() {
  if (!helperText) return;
  if (state.viewMode === "grid") {
    helperText.style.opacity = "0";
    return;
  }
  if (!state.hasMoved && state.hasEntered) {
    helperText.style.opacity = "1";
    helperText.querySelector("p").innerText = state.isMobile
      ? "tap a project to expand :)"
      : "move mouse to drop images. click to expand & slide:)";
  }
}

function setSoundMuted(muted) {
  state.isMuted = muted;
  if (navSound) navSound.innerText = muted ? "unmute" : "mute";
  if (!muted) state.soundUnlocked = true;
  document.querySelectorAll("video").forEach((video) => {
    applyVideoSound(video);
  });
}

/** Keep video playback in sync with mute UI (especially on mobile). */
function applyVideoSound(video) {
  if (!video) return;
  // Trail hover previews stay silent always
  if (video.classList.contains("trail-hover-video")) {
    video.muted = true;
    video.volume = 0;
    return;
  }
  if (state.isMuted) {
    video.muted = true;
    return;
  }
  video.muted = false;
  video.play().catch(() => {
    // iOS blocked unmuted play — keep picture, ask for one unmute tap
    video.muted = true;
    video.play().catch(() => {});
    if (!state.isMuted && state.isMobile) {
      state.isMuted = true;
      if (navSound) navSound.innerText = "unmute";
    }
  });
}

function enableSound() {
  setSoundMuted(false);
  soundOn.currentTime = 0;
  soundOn
    .play()
    .then(() => {
      soundOn.pause();
      soundOn.currentTime = 0;
    })
    .catch(() => {});
}

function enterSite() {
  if (state.hasEntered) return;
  state.hasEntered = true;
  // Mobile: stay muted so videos can autoplay; user taps "unmute" for sound
  if (state.isMobile) {
    setSoundMuted(true);
  } else {
    enableSound();
  }

  if (welcomeScreen) {
    welcomeScreen.classList.add("welcome-dismissed");
    setTimeout(() => welcomeScreen.remove(), 600);
  }

  if (customCursor) customCursor.classList.add("cursor-active");
  updateHelperText();
  // Phone + desktop: trail only for now
  applyViewMode("trail", { persist: false });
}

if (welcomeScreen) {
  welcomeScreen.addEventListener("click", enterSite);
}

function applyViewMode(mode, { persist = true } = {}) {
  state.viewMode = mode;
  document.body.classList.remove("view-trail", "view-grid");
  document.body.classList.add(mode === "grid" ? "view-grid" : "view-trail");

  if (navViewMode) {
    navViewMode.innerText = mode === "grid" ? "trail" : "grid";
    navViewMode.dataset.activeMode = mode;
  }

  if (mode === "grid") {
    resetTrail({ respawn: false });
    renderGrid();
    if (gridView) gridView.classList.add("active");
    if (helperText) helperText.style.opacity = "0";
  } else {
    if (gridView) gridView.classList.remove("active");
    resetTrail({ respawn: true });
    updateHelperText();
  }

  if (persist) {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }
}

function toggleViewMode() {
  // Grid mode disabled for now — trail only
  return;
}

function renderGrid() {
  if (!gridView) return;
  gridView.innerHTML = "";

  PROJECTS.forEach((project, galleryIndex) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "grid-tile";
    tile.dataset.galleryIndex = String(galleryIndex);
    tile.dataset.boxId = String(galleryIndex + 1);

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "grid-tile-media";

    if (project.blankCover) {
      mediaWrap.classList.add("grid-tile-blank");
    } else {
      const cover = document.createElement("img");
      cover.className = "grid-tile-cover";
      cover.alt = project.name;
      const coverPath = getCoverPath(project);
      cover.src = isVideoPath(coverPath)
        ? getMobileCoverPath(project)
        : coverPath;
      cover.draggable = false;
      mediaWrap.appendChild(cover);
    }

    const label = document.createElement("span");
    label.className = "grid-tile-label";
    label.textContent = project.name;

    tile.appendChild(mediaWrap);
    tile.appendChild(label);

    tile.addEventListener("mouseenter", () => {
      if (!state.isZoomed && navCenter) {
        navCenter.innerText = project.name;
      }
      playHoverSound();
    });

    tile.addEventListener("mouseleave", () => {
      if (!state.isZoomed) resetInfo();
    });

    tile.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!state.hasEntered || state.isLoading || state.isZoomed) return;
      openGridProject(galleryIndex, tile);
    });

    gridView.appendChild(tile);
  });
}

function openGridProject(galleryIndex, tileEl) {
  const rect = tileEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const boxId = galleryIndex + 1;

  const container = createProjectBox(galleryIndex, x, y, boxId);
  container.classList.add("from-grid");

  if (!state.isMuted && !state.isMobile) {
    zoomSound.currentTime = 0;
    zoomSound.play().catch(() => {});
  }

  canvas.appendChild(container);
  zoomIn(container, { expandToMax: true });
}

const checkMobile = () => {
  const wasMobile = state.isMobile;
  state.isMobile = window.innerWidth < 800;
  if (state.isMobile) {
    document.body.classList.add("is-mobile");
  } else {
    document.body.classList.remove("is-mobile");
  }
  if (wasMobile !== state.isMobile) {
    updateHelperText();
    if (state.aboutActive) configureAboutModel();
    if (
      state.isMobile &&
      state.hasEntered &&
      state.viewMode === "trail" &&
      !state.isZoomed &&
      !state.aboutActive
    ) {
      spawnMobileProjects();
    }
    if (state.viewMode === "grid") renderGrid();
  }
};
checkMobile();
activateWelcomeCursor();
window.addEventListener("resize", checkMobile);

function preloadAllCovers() {
  let loadedCount = 0;
  const total = GALLERIES.length;
  const dots = document.querySelectorAll(".loading-rect");
  let finished = false;

  function finishLoading() {
    if (finished) return;
    finished = true;
    const screen = document.getElementById("loading-screen");
    if (screen) {
      screen.style.opacity = "0";
      setTimeout(() => screen.remove(), 500);
    }
    state.isLoading = false;
  }

  function updateLoader() {
    loadedCount++;
    const ratio = loadedCount / total;
    const dotsToFill = Math.ceil(ratio * 4);
    dots.forEach((dot, idx) => {
      if (idx < dotsToFill) dot.classList.add("filled");
    });
    if (loadedCount >= total) finishLoading();
  }

  // Mobile: skip heavy cover preload — thumbnails load after enter, staggered
  if (state.isMobile) {
    setTimeout(finishLoading, 400);
    return;
  }

  setTimeout(finishLoading, 3000);

  GALLERIES.forEach((gallery) => {
    const src = gallery[0];
    if (!src) {
      updateLoader();
      return;
    }
    const img = new Image();
    img.onload = updateLoader;
    img.onerror = updateLoader;
    img.src = src;
  });
}
preloadAllCovers();

let lastHoverTime = 0;
let trailDrawActive = false;
let trailDrawTimeout = null;

function playHoverSound() {
  if (state.isMobile) return;
  if (state.isMuted) return;
  // Don't fire hover sounds while the trail is being drawn
  if (trailDrawActive) return;
  const now = Date.now();
  const delta = now - lastHoverTime;
  lastHoverTime = now;
  const sound = hoverPool[hoverPoolIndex];
  hoverPoolIndex = (hoverPoolIndex + 1) % HOVER_POOL_SIZE;
  sound.pause();
  sound.currentTime = 0;
  if (delta < 200) {
    sound.playbackRate = 1 + Math.max(0, (200 - delta) / 200);
  } else {
    sound.playbackRate = 1;
  }
  sound.play().catch(() => {});
}

function playPlaceSound() {
  if (state.isMobile) return;
  if (state.isMuted) return;
  const now = Date.now();
  const delta = now - lastHoverTime;
  lastHoverTime = now;
  const sound = hoverPool[hoverPoolIndex];
  hoverPoolIndex = (hoverPoolIndex + 1) % HOVER_POOL_SIZE;
  sound.pause();
  sound.currentTime = 0;
  if (delta < 200) {
    sound.playbackRate = 1 + Math.max(0, (200 - delta) / 200);
  } else {
    sound.playbackRate = 1;
  }
  sound.play().catch(() => {});
}

function markTrailDrawing() {
  trailDrawActive = true;
  stopAllHoverScrubs();
  clearTimeout(trailDrawTimeout);
  trailDrawTimeout = setTimeout(() => {
    trailDrawActive = false;
  }, 450);
}

function playToggleSound(e) {
  if (state.isMobile) return;
  if (state.isMuted) return;
  const el = e.currentTarget;
  const currentState = el.dataset.soundState || "off";
  if (currentState === "on") {
    soundOff.currentTime = 0;
    soundOff.play().catch(() => {});
    el.dataset.soundState = "off";
  } else {
    soundOn.currentTime = 0;
    soundOn.play().catch(() => {});
    el.dataset.soundState = "on";
  }
}

navSound.addEventListener("click", () => {
  const nextMuted = !state.isMuted;
  setSoundMuted(nextMuted);
  if (!nextMuted) {
    soundOn.currentTime = 0;
    soundOn
      .play()
      .then(() => {
        soundOn.pause();
        soundOn.currentTime = 0;
      })
      .catch(() => {});
  } else {
    soundOff.currentTime = 0;
    soundOff.play().catch(() => {});
  }
});

navHome.addEventListener("mouseenter", playHoverSound);
navCenter.addEventListener("mouseenter", playHoverSound);
navAbout.addEventListener("mouseenter", playHoverSound);
navSound.addEventListener("mouseenter", playHoverSound);
navScale.addEventListener("mouseenter", () => {
  playHoverSound();
  startScaleHoverSprinkle();
});
navScale.addEventListener("mouseleave", stopScaleHoverSprinkle);
if (navViewMode) navViewMode.addEventListener("mouseenter", playHoverSound);
if (navShuffle) navShuffle.addEventListener("mouseenter", playHoverSound);

navHome.addEventListener("click", playToggleSound);
navAbout.addEventListener("click", playToggleSound);
navScale.addEventListener("click", playToggleSound);
if (navViewMode) navViewMode.addEventListener("click", playToggleSound);
if (navShuffle) {
  navShuffle.addEventListener("click", playToggleSound);
  navShuffle.addEventListener("click", () => {
    if (!state.hasEntered || !state.isMobile) return;
    if (state.isZoomed || state.aboutActive) return;
    if (state.viewMode !== "trail") return;
    shuffleMobileProjects();
  });
}

if (navViewMode) {
  navViewMode.addEventListener("click", () => {
    toggleViewMode();
  });
}

const modelViewer = document.querySelector("model-viewer");

const ABOUT_ORBIT_THETA = "180deg";
const ABOUT_ORBIT_PHI = "75deg";
// Closer camera = scan appears larger in frame (scale alone was fighting updateFraming)
const ABOUT_ORBIT_RADIUS_MOBILE = "55%";
const ABOUT_ORBIT_RADIUS_DESKTOP = "64%";
const ABOUT_SCALE_MOBILE = "1.6128 1.6128 1.6128";
const ABOUT_SCALE_DESKTOP = "1.6128 1.6128 1.6128";
/** Look-at nudged right so framing sits a bit left of center */
const ABOUT_CAMERA_TARGET = "0.24m auto auto";

function configureAboutModel() {
  if (!modelViewer) return;
  modelViewer.setAttribute("camera-controls", "");
  modelViewer.setAttribute("touch-action", "none");
  modelViewer.cameraTarget = ABOUT_CAMERA_TARGET;
  if (state.isMobile) {
    modelViewer.scale = ABOUT_SCALE_MOBILE;
    modelViewer.cameraOrbit = `${ABOUT_ORBIT_THETA} ${ABOUT_ORBIT_PHI} ${ABOUT_ORBIT_RADIUS_MOBILE}`;
    modelViewer.fieldOfView = "30deg";
  } else {
    modelViewer.scale = ABOUT_SCALE_DESKTOP;
    modelViewer.cameraOrbit = `${ABOUT_ORBIT_THETA} ${ABOUT_ORBIT_PHI} ${ABOUT_ORBIT_RADIUS_DESKTOP}`;
    modelViewer.fieldOfView = "30deg";
  }
  // Don't call updateFraming() — it pulls the camera back and cancels “bigger” sizing
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

if (modelViewer) {
  modelViewer.addEventListener("load", () => {
    configureAboutModel();
  });
  configureAboutModel();
}

function updateAboutScrollSpin() {
  if (!state.isMobile || !aboutPage || !modelViewer) return;
  try {
    const orbit = modelViewer.getCameraOrbit();
    if (!orbit) return;
    // Start facing 180°, scroll only yaws from there
    const yaw = Math.PI - aboutPage.scrollTop * 0.004;
    const phi = Number.isFinite(orbit.phi)
      ? `${orbit.phi}rad`
      : ABOUT_ORBIT_PHI;
    const radius =
      Number.isFinite(orbit.radius) && orbit.radius > 0
        ? `${orbit.radius}m`
        : ABOUT_ORBIT_RADIUS_MOBILE;
    modelViewer.cameraOrbit = `${yaw}rad ${phi} ${radius}`;
  } catch (err) {}
}

aboutPage.addEventListener("scroll", updateAboutScrollSpin, {
  passive: true,
});

const updateInfo = (boxId) => {
  const project = getProjectByBoxId(boxId);
  if (!project) return;
  if (navCenter) navCenter.innerText = project.name;
  if (footerText) footerText.innerHTML = project.caption;
};

const resetInfo = () => {
  if (navCenter)
    navCenter.innerHTML =
      '<a href="mailto:ggg@gigergrafik.ch" target="_blank">@<span class="domain-text">gigergrafik.ch</span></a>';
  if (footerText) footerText.innerText = "";
};

let swipeTimer = null;

function startSwipeHintTimer() {
  if (!state.isMobile || !state.isZoomed) return;
  if (state.currentSlideIndex !== 0) return;
  const cover = GALLERIES[state.currentGalleryIndex]?.[0];
  // No swipe hint on video covers
  if (isVideoPath(cover)) return;
  clearTimeout(swipeTimer);
  swipeTimer = setTimeout(() => {
    if (state.isZoomed && state.currentSlideIndex === 0) {
      const stillCover = GALLERIES[state.currentGalleryIndex]?.[0];
      if (isVideoPath(stillCover)) return;
      swipeHintEl.classList.add("visible");
    }
  }, 3000);
}

function hideSwipeHint() {
  clearTimeout(swipeTimer);
  swipeHintEl.classList.remove("visible");
}

const resetTrail = ({ respawn = true } = {}) => {
  clearShuffleGhosts();
  const allImages = document.querySelectorAll(".trail-image");
  allImages.forEach((img) => img.remove());
  state.count = 0;
  state.hasMoved = false;
  state.lastX = 0;
  state.lastY = 0;

  if (
    respawn &&
    state.isMobile &&
    state.viewMode === "trail" &&
    state.hasEntered &&
    !state.isZoomed &&
    !state.aboutActive
  ) {
    spawnMobileProjects();
  } else {
    updateHelperText();
  }
};

function getMobileLayoutBounds() {
  const boxW = CONFIG.mobileBoxWidth;
  const boxH = CONFIG.mobileBoxHeight;
  const footerRect = footerEl.getBoundingClientRect();
  return {
    boxW,
    boxH,
    minX: boxW / 2 + 10,
    maxX: Math.max(boxW / 2 + 11, window.innerWidth - boxW / 2 - 10),
    minY: CONFIG.navZoneHeight + boxH / 2,
    maxY: Math.max(
      CONFIG.navZoneHeight + boxH / 2 + 1,
      footerRect.top - boxH / 2 - 10,
    ),
  };
}

function generateMobilePositions(count) {
  const { boxW, boxH, minX, maxX, minY, maxY } = getMobileLayoutBounds();
  const placed = [];
  const minGap = Math.min(boxW, boxH) * 0.85;

  for (let i = 0; i < count; i++) {
    let x = minX + Math.random() * (maxX - minX);
    let y = minY + Math.random() * (maxY - minY);
    let tries = 0;

    while (tries < 50) {
      const overlaps = placed.some(
        (p) => Math.hypot(p.x - x, p.y - y) < minGap,
      );
      if (!overlaps) break;
      x = minX + Math.random() * (maxX - minX);
      y = minY + Math.random() * (maxY - minY);
      tries++;
    }

    placed.push({ x, y });
  }

  return placed;
}

function restoreProjectThumbnail(element) {
  if (!element) return;
  const galleryIndex = parseInt(element.dataset.galleryIndex, 10);
  const gallery = GALLERIES[galleryIndex];
  if (!gallery?.length) return;

  // Cancel any in-flight slide loads from the previous open
  state.slideRequestId = (state.slideRequestId || 0) + 1;
  element.dataset.slideIndex = "0";
  unloadBoxMedia(element);
  element.querySelectorAll(".slide-image, .embed-shell").forEach((node) => {
    node.remove();
  });
  element.classList.remove("embed-project", "loading-active");

  const project = getProjectByGalleryIndex(galleryIndex);
  const coverSrc =
    state.isMobile && project
      ? getMobileCoverPath(project)
      : gallery[0];
  if (coverSrc) {
    loadMedia(
      coverSrc,
      element,
      () => {},
      () => {
        // If -sm missing, fall back to full cover
        if (state.isMobile && project && coverSrc !== gallery[0]) {
          loadMedia(gallery[0], element, () => {}, () => {}, "slide-image", {
            allowVideo: isVideoPath(gallery[0]),
            objectFit: project?.id === "glbviewer" ? "fill" : undefined,
          });
        }
      },
      "slide-image",
      {
        allowVideo: !state.isMobile && isVideoPath(coverSrc),
        objectFit: project?.id === "glbviewer" ? "fill" : undefined,
      },
    );
  }
}

function clearShuffleGhosts() {
  document.querySelectorAll(".shuffle-ghost").forEach((el) => el.remove());
}

function shuffleMobileProjects() {
  if (!state.isMobile || state.viewMode !== "trail") return;
  if (!state.hasEntered || state.isZoomed || state.aboutActive) return;

  clearShuffleGhosts();

  const boxes = Array.from(document.querySelectorAll(".trail-image"));
  if (boxes.length === 0) {
    spawnMobileProjects();
    return;
  }

  const positions = generateMobilePositions(boxes.length);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  boxes.forEach((box) => box.classList.add("shuffling"));

  requestAnimationFrame(() => {
    boxes.forEach((box, i) => {
      const pos = positions[i];
      box.style.left = `${pos.x}px`;
      box.style.top = `${pos.y}px`;
      box.dataset.originX = String(pos.x);
      box.dataset.originY = String(pos.y);
    });
  });

  setTimeout(() => {
    boxes.forEach((box) => box.classList.remove("shuffling"));
  }, 950);

  state.hasMoved = true;
  if (helperText) helperText.style.opacity = "0";
}

function spawnMobileProjects() {
  if (!state.isMobile || state.viewMode !== "trail") return;
  if (!state.hasEntered || state.isZoomed || state.aboutActive) return;

  document.querySelectorAll(".trail-image").forEach((img) => {
    unloadBoxMedia(img);
    img.remove();
  });
  state.count = 0;
  thumbLoadQueue = [];
  thumbLoadActive = 0;

  const total = Math.min(PROJECTS.length, CONFIG.maxImages);
  const positions = generateMobilePositions(total);

  for (let i = 0; i < total; i++) {
    const { x, y } = positions[i];
    state.count++;
    const galleryIndex = i % PROJECTS.length;
    const container = createProjectBox(galleryIndex, x, y, i + 1, {
      deferMedia: true,
    });
    container.dataset.originX = String(x);
    container.dataset.originY = String(y);
    canvas.appendChild(container);
    enqueueThumbLoad(container, galleryIndex);
  }

  state.hasMoved = true;
  if (helperText) helperText.style.opacity = "0";
}

let thumbLoadQueue = [];
let thumbLoadActive = 0;

function enqueueThumbLoad(container, galleryIndex) {
  thumbLoadQueue.push({ container, galleryIndex });
  pumpThumbQueue();
}

function pumpThumbQueue() {
  const limit = CONFIG.mobileThumbConcurrency || 2;
  while (thumbLoadActive < limit && thumbLoadQueue.length > 0) {
    const job = thumbLoadQueue.shift();
    if (!job?.container?.isConnected) continue;
    thumbLoadActive++;
    loadBoxThumbnail(job.container, job.galleryIndex, () => {
      thumbLoadActive--;
      pumpThumbQueue();
    });
  }
}

function loadBoxThumbnail(container, galleryIndex, done) {
  const project = getProjectByGalleryIndex(galleryIndex);
  const fullSrc = GALLERIES[galleryIndex]?.[0];
  const src =
    state.isMobile && project ? getMobileCoverPath(project) : fullSrc;
  if (!src) {
    done?.();
    return;
  }
  loadMedia(
    src,
    container,
    () => done?.(),
    () => {
      if (state.isMobile && fullSrc && src !== fullSrc) {
        loadMedia(
          fullSrc,
          container,
          () => done?.(),
          () => {
            container.style.backgroundColor = "#e5e7eb";
            done?.();
          },
          "slide-image",
          { allowVideo: false },
        );
        return;
      }
      container.style.backgroundColor = "#e5e7eb";
      done?.();
    },
    "slide-image",
    { allowVideo: false },
  );
}

function unloadBoxMedia(container) {
  if (!container) return;
  container.querySelectorAll("video").forEach((video) => {
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch (err) {}
    video.remove();
  });
  container.querySelectorAll("img.slide-image").forEach((img) => {
    img.removeAttribute("src");
    img.remove();
  });
}

function unloadFadedTrailMedia() {
  document.querySelectorAll(".trail-image.faded").forEach((el) => {
    unloadBoxMedia(el);
  });
}

function reloadVisibleThumbnails() {
  if (!state.isMobile) return;
  document.querySelectorAll(".trail-image").forEach((el) => {
    if (el.classList.contains("zoomed")) return;
    if (el.querySelector(".slide-image")) return;
    const galleryIndex = parseInt(el.dataset.galleryIndex, 10);
    if (Number.isNaN(galleryIndex)) return;
    enqueueThumbLoad(el, galleryIndex);
  });
}

const preloadNeighbors = (galleryIdx, currentSlideIdx) => {
  if (state.isMobile) return;
  const gallery = GALLERIES[galleryIdx];
  const nextIdx = (currentSlideIdx + 1) % gallery.length;
  const prevIdx = (currentSlideIdx - 1 + gallery.length) % gallery.length;
  new Image().src = gallery[nextIdx];
  new Image().src = gallery[prevIdx];
};

function loadMedia(
  src,
  container,
  onSuccess,
  onError,
  className = "slide-image",
  options = {},
) {
  const { allowVideo = true, objectFit } = options;
  const projectId = container?.dataset?.projectId;
  const fit =
    objectFit ||
    (projectId === "glbviewer" ? "fill" : null);

  const mountVideo = (videoSrc, onVidError) => {
    const primarySrc =
      state.isMobile && !/-mobile\./i.test(videoSrc)
        ? getMobileVideoPath(videoSrc)
        : videoSrc;
    const fallbackSrc =
      primarySrc !== videoSrc ? videoSrc : null;

    const createAndPlay = (src, onFail) => {
      const vid = document.createElement("video");
      vid.className = className;
      vid.muted = true;
      vid.loop = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.preload = state.isMobile ? "metadata" : "auto";
      if (fit === "fill") {
        vid.style.objectFit = "fill";
        vid.style.height = "100%";
        vid.style.top = "0";
        vid.style.backgroundColor = "transparent";
      } else if (
        fit === "cover" ||
        className.includes("fill") ||
        /fill(-mobile)?\.mp4$/i.test(src)
      ) {
        vid.style.objectFit = "cover";
        vid.style.height = "100%";
        vid.style.top = "0";
      }

      vid.onloadeddata = () => {
        container.appendChild(vid);
        vid.muted = true;
        vid
          .play()
          .then(() => {
            applyVideoSound(vid);
          })
          .catch(() => {});
        if (onSuccess) onSuccess(vid);
      };

      vid.onerror = () => {
        if (onFail) onFail();
        else if (onVidError) onVidError();
        else if (onError) onError();
      };

      vid.src = src;
    };

    createAndPlay(primarySrc, () => {
      if (fallbackSrc) {
        createAndPlay(fallbackSrc, () => {
          if (onVidError) onVidError();
          else if (onError) onError();
        });
      } else if (onVidError) {
        onVidError();
      } else if (onError) {
        onError();
      }
    });
  };

  if (isVideoPath(src)) {
    if (!allowVideo) {
      if (onError) onError();
      return;
    }
    mountVideo(src);
    return;
  }

  const img = new Image();
  img.className = className;
  img.decoding = "async";

  img.onload = () => {
    container.appendChild(img);
    if (onSuccess) onSuccess(img);
  };

  img.onerror = () => {
    if (!allowVideo) {
      if (onError) onError();
      return;
    }

    const basePath = src.substring(0, src.lastIndexOf("."));
    mountVideo(basePath + "fill.mp4", () => {
      mountVideo(basePath + ".mp4", () => {
        const vidRot = document.createElement("video");
        vidRot.className = className + " rotate-90";
        vidRot.muted = true;
        vidRot.loop = true;
        vidRot.autoplay = true;
        vidRot.playsInline = true;
        vidRot.preload = state.isMobile ? "metadata" : "auto";

        vidRot.onloadeddata = () => {
          container.appendChild(vidRot);
          vidRot.muted = true;
          vidRot
            .play()
            .then(() => {
              applyVideoSound(vidRot);
            })
            .catch(() => {});
          if (onSuccess) onSuccess(vidRot);
        };

        vidRot.onerror = () => {
          if (onError) onError();
        };

        vidRot.src = basePath + "-90.mp4";
      });
    });
  };

  img.src = src;
}

navAbout.addEventListener("click", () => {
  resetInfo();
  if (state.isZoomed) {
    state.isZoomed = false;
    state.zoomedElement = null;
    document.body.classList.remove("zoomed-active");
    navScale.style.display = "none";
  }
  canvas.classList.add("hidden-canvas");
  if (gridView) gridView.classList.remove("active");
  state.aboutActive = true;
  document.body.classList.add("about-active");
  navAbout.style.visibility = "hidden";
  navHome.classList.add("g-mode");
  setTimeout(() => {
    aboutPage.classList.add("active");
    aboutPage.scrollTop = 0;
    configureAboutModel();
    setTimeout(() => (aboutPage.style.opacity = "1"), 10);
  }, 400);
});

navHome.addEventListener("click", (e) => {
  playToggleSound(e);
  navHome.classList.remove("g-mode");
  if (state.aboutActive) {
    state.aboutActive = false;
    aboutPage.style.opacity = "0";
    setTimeout(() => {
      aboutPage.classList.remove("active");
      canvas.classList.remove("hidden-canvas");
      navAbout.style.visibility = "visible";
      document.body.classList.remove("about-active");
      if (state.viewMode === "grid" && gridView) {
        gridView.classList.add("active");
      } else if (state.isMobile) {
        if (!document.querySelector(".trail-image")) {
          spawnMobileProjects();
        }
      } else {
        resetTrail();
      }
      state.isZoomed = false;
      document.body.classList.remove("zoomed-active");
      navScale.style.display = "none";
      window.scrollTo(0, 0);
    }, 400);
  } else if (state.isZoomed) {
    zoomOut();
    setTimeout(() => {
      if (state.viewMode === "trail" && !state.isMobile) resetTrail();
      window.scrollTo(0, 0);
    }, 550);
  } else if (state.viewMode === "trail") {
    if (!state.isMobile) resetTrail();
    window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, 0);
  }
});

navScale.addEventListener("click", () => {
  if (!state.zoomedElement || state.isMobile) return;
  scaleHintDismissed = true;
  clearScaleHint();
  fireScaleEmojiPop(SCALE_HAPPY_EMOJIS, 6 + Math.floor(Math.random() * 4));
  applyScaleStep(state.zoomedElement);
});

function canScaleFurther(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const footerRect = footerEl.getBoundingClientRect();
  const limitBottom = footerRect.top - 4;
  const fillsH =
    Math.abs(rect.top) < 2 && Math.abs(rect.bottom - limitBottom) < 2;
  const fillsW =
    Math.abs(rect.left) < 2 && Math.abs(rect.right - window.innerWidth) < 2;
  if (fillsH || fillsW) return false;
  const room = Math.max(
    rect.top,
    limitBottom - rect.bottom,
    rect.left,
    window.innerWidth - rect.right,
  );
  return room > 6;
}

function clearScaleHint() {
  if (scaleHintTimeout) {
    clearTimeout(scaleHintTimeout);
    scaleHintTimeout = null;
  }
  if (scaleEmojiTimeout) {
    clearTimeout(scaleEmojiTimeout);
    scaleEmojiTimeout = null;
  }
  stopScaleHoverSprinkle();
  if (scaleHintGlow) scaleHintGlow.classList.remove("visible");
  document.querySelectorAll(".scale-emoji-pop").forEach((el) => el.remove());
  scaleHintFromRight = false;
}

function resetScaleHintSession() {
  clearScaleHint();
  scaleHintDismissed = false;
}

function positionScaleHintGlow() {
  if (!scaleHintGlow || !navScale) return;
  const rect = navScale.getBoundingClientRect();
  scaleHintGlow.style.left = `${rect.left + rect.width / 2}px`;
  scaleHintGlow.style.top = `${rect.top + rect.height / 2}px`;
}

function isNearScaleButton(cx, cy) {
  if (!navScale || navScale.style.display === "none") return false;
  const rect = navScale.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const pad = SCALE_CURSOR_NEAR_PX;
  return (
    cx >= rect.left - pad &&
    cx <= rect.right + pad &&
    cy >= rect.top - pad &&
    cy <= rect.bottom + pad
  );
}

/**
 * @param {string[]} [emojis]
 * @param {{ x?: number, y?: number, dx?: number, dy?: number, rot?: number }} [opts]
 */
function spawnScaleEmoji(emojis = SCALE_SAD_EMOJIS, opts = {}) {
  let ox = opts.x;
  let oy = opts.y;
  if (ox == null || oy == null) {
    if (!navScale || navScale.style.display === "none") return;
    const rect = navScale.getBoundingClientRect();
    ox = rect.left + rect.width / 2;
    oy = rect.top + rect.height / 2;
  }

  const dx = opts.dx != null ? opts.dx : (Math.random() - 0.5) * 160;
  const dy = opts.dy != null ? opts.dy : 48 + Math.random() * 110;
  const rot = opts.rot != null ? opts.rot : (Math.random() - 0.5) * 56;

  const el = document.createElement("span");
  el.className = "scale-emoji-pop";
  el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  el.style.left = `${ox}px`;
  el.style.top = `${oy}px`;
  el.style.setProperty("--dx", `${dx}px`);
  el.style.setProperty("--dy", `${dy}px`);
  el.style.setProperty("--rot", `${rot}deg`);
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

/** One-shot pop from the scale button (happy on scale click). */
function fireScaleEmojiPop(emojis, count) {
  let delay = 0;
  for (let i = 0; i < count; i++) {
    delay += 20 + Math.random() * 35;
    setTimeout(() => spawnScaleEmoji(emojis), delay);
  }
}

const TRAIL_BURST_EMOJIS = [...SCALE_SAD_EMOJIS, ...SCALE_HAPPY_EMOJIS];
/** @type {{ el: HTMLElement, x: number, y: number, vx: number, vy: number, rot: number, vr: number, r: number, born: number, maxLife: number }[]} */
const trailBurstParticles = [];
let trailBurstRaf = null;
let trailBurstLastTs = 0;
let trailBurstGen = 0;

function getTrailObstacleRects() {
  return Array.from(
    document.querySelectorAll(".trail-image:not(.zoomed)"),
  )
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      };
    })
    .filter((r) => r.right > r.left + 2 && r.bottom > r.top + 2);
}

/** Circle vs trail-box AABB — push out + bounce. Returns true if bounced. */
function collideParticleWithTrailBoxes(p, boxes, bounce) {
  let hit = false;
  for (let b = 0; b < boxes.length; b++) {
    const box = boxes[b];
    const nearestX = Math.max(box.left, Math.min(p.x, box.right));
    const nearestY = Math.max(box.top, Math.min(p.y, box.bottom));
    let dx = p.x - nearestX;
    let dy = p.y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= p.r * p.r) continue;

    if (distSq < 0.0001) {
      const dl = p.x - box.left;
      const dr = box.right - p.x;
      const dt = p.y - box.top;
      const db = box.bottom - p.y;
      const m = Math.min(dl, dr, dt, db);
      if (m === dl) {
        p.x = box.left - p.r;
        p.vx = -Math.abs(p.vx) * bounce;
      } else if (m === dr) {
        p.x = box.right + p.r;
        p.vx = Math.abs(p.vx) * bounce;
      } else if (m === dt) {
        p.y = box.top - p.r;
        p.vy = -Math.abs(p.vy) * bounce;
      } else {
        p.y = box.bottom + p.r;
        p.vy = Math.abs(p.vy) * bounce;
      }
      hit = true;
      continue;
    }

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = p.r - dist;
    p.x += nx * overlap;
    p.y += ny * overlap;
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) {
      p.vx -= (1 + bounce) * vn * nx;
      p.vy -= (1 + bounce) * vn * ny;
      hit = true;
    }
  }
  return hit;
}

/** Real notification sample — pooled + rate-limited (high-velocity bounces only). */
let bounceSoundsThisFrame = 0;
let lastGlobalBounceSoundAt = 0;
const BOUNCE_SOUNDS_PER_FRAME = 2;

function playSoftBounceBling(impact = 1) {
  if (state.isMobile || state.isMuted) return;
  if (bounceSoundsThisFrame >= BOUNCE_SOUNDS_PER_FRAME) return;
  const now = performance.now();
  if (now - lastGlobalBounceSoundAt < 40) return;
  lastGlobalBounceSoundAt = now;
  bounceSoundsThisFrame += 1;

  const sound = notifyPool[notifyPoolIndex];
  notifyPoolIndex = (notifyPoolIndex + 1) % NOTIFY_POOL_SIZE;
  sound.pause();
  sound.currentTime = 0;
  sound.volume = Math.min(0.28, 0.12 + impact * 0.015);
  sound.play().catch(() => {});
}

function maybePlayBounceSound(p, now) {
  if (now - (p.lastBounceSoundAt || 0) < 90) return;
  const speed = Math.hypot(p.vx, p.vy);
  // Only somewhat firm hits — crawl/settle still quiet
  if (speed < 1.1) return;
  p.lastBounceSoundAt = now;
  playSoftBounceBling(speed);
}

function spawnTrailBurstParticle(cx, cy, emojis, gen) {
  if (gen !== trailBurstGen) return;
  const el = document.createElement("span");
  el.className = "trail-emoji-burst";
  el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  el.style.left = `${cx}px`;
  el.style.top = `${cy}px`;
  document.body.appendChild(el);

  // Collision radius from the glyph’s actual rendered pixels
  const bounds = el.getBoundingClientRect();
  const fontPx = parseFloat(getComputedStyle(el).fontSize) || 18;
  const r = Math.max(
    1,
    Math.max(bounds.width, bounds.height, fontPx) / 2,
  );

  const angle = Math.random() * Math.PI * 2;
  const speed = 4.2 + Math.random() * 8.5;
  // ~half die early (4–7s); rest linger longer (~8–12s)
  const maxLife =
    Math.random() < 0.5
      ? 4000 + Math.random() * 3000
      : 8000 + Math.random() * 4000;
  trailBurstParticles.push({
    el,
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    born: performance.now(),
    maxLife,
    lastBounceSoundAt: 0,
  });
  startTrailBurstLoop();
}

/** Empty-trail click: radial burst with edge + trail-box bounce. */
function fireTrailEmojiBurst(cx, cy) {
  if (!state.isMobile && !state.isMuted) {
    blingSound.pause();
    blingSound.currentTime = 0;
    blingSound.play().catch(() => {});
  }
  const gen = trailBurstGen;
  const count = 12 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    setTimeout(
      () => spawnTrailBurstParticle(cx, cy, TRAIL_BURST_EMOJIS, gen),
      i * 12,
    );
  }
}

function clearTrailBurstParticles() {
  trailBurstGen += 1;
  for (const p of trailBurstParticles) {
    p.el.remove();
  }
  trailBurstParticles.length = 0;
  if (trailBurstRaf) {
    cancelAnimationFrame(trailBurstRaf);
    trailBurstRaf = null;
  }
}

function startTrailBurstLoop() {
  if (trailBurstRaf) return;
  trailBurstLastTs = performance.now();

  const tick = (now) => {
    const dt = Math.min(32, now - trailBurstLastTs) / 16.67;
    trailBurstLastTs = now;
    bounceSoundsThisFrame = 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const bounce = 0.78;
    const friction = Math.pow(0.985, dt);
    const boxes = getTrailObstacleRects();

    for (let i = trailBurstParticles.length - 1; i >= 0; i--) {
      const p = trailBurstParticles[i];
      const age = now - p.born;
      p.vy += 0.15 * dt;
      p.vx *= friction;
      p.vy *= friction;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let bounced = collideParticleWithTrailBoxes(p, boxes, bounce);

      if (p.x < p.r) {
        p.x = p.r;
        p.vx = Math.abs(p.vx) * bounce;
        bounced = true;
      } else if (p.x > w - p.r) {
        p.x = w - p.r;
        p.vx = -Math.abs(p.vx) * bounce;
        bounced = true;
      }
      if (p.y < p.r) {
        p.y = p.r;
        p.vy = Math.abs(p.vy) * bounce;
        bounced = true;
      } else if (p.y > h - p.r) {
        p.y = h - p.r;
        p.vy = -Math.abs(p.vy) * bounce;
        bounced = true;
      }

      if (bounced) maybePlayBounceSound(p, now);

      if (age >= p.maxLife) {
        p.el.remove();
        trailBurstParticles.splice(i, 1);
        continue;
      }

      const snapOff = age > p.maxLife - 50;
      p.el.style.left = `${p.x}px`;
      p.el.style.top = `${p.y}px`;
      p.el.style.opacity = snapOff ? "0" : "1";
      p.el.style.transform = `translate(-50%, -50%) scale(${snapOff ? 0.92 : 1})`;
    }

    if (trailBurstParticles.length) {
      trailBurstRaf = requestAnimationFrame(tick);
    } else {
      trailBurstRaf = null;
    }
  };

  trailBurstRaf = requestAnimationFrame(tick);
}

let scaleHoverSprinkleTimer = null;

function stopScaleHoverSprinkle() {
  if (scaleHoverSprinkleTimer) {
    clearTimeout(scaleHoverSprinkleTimer);
    scaleHoverSprinkleTimer = null;
  }
}

function startScaleHoverSprinkle() {
  if (state.isMobile || !state.isZoomed || !state.zoomedElement) return;
  stopScaleHoverSprinkle();
  const tick = () => {
    if (
      state.isMobile ||
      !state.isZoomed ||
      !navScale ||
      navScale.style.display === "none"
    ) {
      stopScaleHoverSprinkle();
      return;
    }
    spawnScaleEmoji(SCALE_SAD_EMOJIS);
    scaleHoverSprinkleTimer = setTimeout(tick, 160 + Math.random() * 200);
  };
  tick();
}

function fireScaleEmojiBurst() {
  if (
    scaleHintDismissed ||
    !state.isZoomed ||
    !state.zoomedElement ||
    !canScaleFurther(state.zoomedElement)
  ) {
    clearScaleHint();
    return false;
  }
  // Light sad sprinkle: 1–3, staggered
  const count = 1 + Math.floor(Math.random() * 3);
  let delay = 0;
  for (let i = 0; i < count; i++) {
    delay += 90 + Math.random() * 220;
    setTimeout(() => {
      if (scaleHintDismissed || !state.isZoomed) return;
      spawnScaleEmoji(SCALE_SAD_EMOJIS);
    }, delay);
  }
  return true;
}

function scheduleNextScaleBurst() {
  if (scaleHintDismissed || !state.isZoomed) return;
  // Still sprinkly / not constant, just a bit more often
  const gap =
    Math.random() < 0.22
      ? 500 + Math.random() * 900
      : 2200 + Math.random() * 3200;
  scaleEmojiTimeout = setTimeout(() => {
    scaleEmojiTimeout = null;
    if (!fireScaleEmojiBurst()) return;
    scheduleNextScaleBurst();
  }, gap);
}

function startScaleEmojiBurst() {
  if (scaleEmojiTimeout) return;
  if (!fireScaleEmojiBurst()) return;
  scheduleNextScaleBurst();
}

function triggerScaleHint(fromRight = false) {
  if (state.isMobile || !state.zoomedElement) return;
  if (scaleHintDismissed) return;
  if (!canScaleFurther(state.zoomedElement)) {
    clearScaleHint();
    return;
  }
  if (!fromRight) return;
  scaleHintFromRight = true;

  if (scaleEmojiTimeout) return;
  if (scaleHintTimeout) return;

  scaleHintTimeout = setTimeout(() => {
    scaleHintTimeout = null;
    if (scaleHintDismissed) return;
    if (!state.isZoomed || !state.zoomedElement || state.isMobile) return;
    if (!canScaleFurther(state.zoomedElement)) return;
    if (!scaleHintFromRight) return;
    startScaleEmojiBurst();
  }, SCALE_HINT_DELAY_MS);
}

function applyScaleStep(el) {
  const rect = el.getBoundingClientRect();
  const footerRect = footerEl.getBoundingClientRect();
  const limitBottom = footerRect.top - 4;
  const limitRight = window.innerWidth;

  const isTop = Math.abs(rect.top) < 2;
  const isBottom = Math.abs(rect.bottom - limitBottom) < 2;
  const isLeft = Math.abs(rect.left) < 2;
  const isRight = Math.abs(rect.right - limitRight) < 2;

  if ((isTop && isBottom) || (isLeft && isRight)) {
    if (isTop && isBottom && isLeft && isRight) return false;
    if (isTop && isBottom) return false;
    if (isLeft && isRight) return false;
  }

  let anchor = state.anchorEdge;
  if (isTop && isLeft) anchor = "top-left";
  else if (isTop && isRight) anchor = "top-right";
  else if (isBottom && isLeft) anchor = "bottom-left";
  else if (isBottom && isRight) anchor = "bottom-right";
  else if (isTop) anchor = "top";
  else if (isBottom) anchor = "bottom";
  else if (isLeft) anchor = "left";
  else if (isRight) anchor = "right";
  state.anchorEdge = anchor;

  let ratios = [];
  const currentW = rect.width;
  const currentH = rect.height;
  const spaceTop = rect.top;
  const spaceBottom = limitBottom - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = limitRight - rect.right;

  if (anchor === "top") {
    if (spaceBottom > 1)
      ratios.push({ r: (currentH + spaceBottom) / currentH, type: "h" });
    const sideSpace = Math.min(spaceLeft, spaceRight);
    if (sideSpace > 1)
      ratios.push({
        r: (currentW + 2 * sideSpace) / currentW,
        type: "w_sym",
      });
  } else if (anchor === "bottom") {
    if (spaceTop > 1)
      ratios.push({ r: (currentH + spaceTop) / currentH, type: "h" });
    const sideSpace = Math.min(spaceLeft, spaceRight);
    if (sideSpace > 1)
      ratios.push({
        r: (currentW + 2 * sideSpace) / currentW,
        type: "w_sym",
      });
  } else if (anchor === "left") {
    if (spaceRight > 1)
      ratios.push({ r: (currentW + spaceRight) / currentW, type: "w" });
    const vertSpace = Math.min(spaceTop, spaceBottom);
    if (vertSpace > 1)
      ratios.push({
        r: (currentH + 2 * vertSpace) / currentH,
        type: "h_sym",
      });
  } else if (anchor === "right") {
    if (spaceLeft > 1)
      ratios.push({ r: (currentW + spaceLeft) / currentW, type: "w" });
    const vertSpace = Math.min(spaceTop, spaceBottom);
    if (vertSpace > 1)
      ratios.push({
        r: (currentH + 2 * vertSpace) / currentH,
        type: "h_sym",
      });
  } else if (anchor === "top-left") {
    if (spaceBottom > 1)
      ratios.push({ r: (currentH + spaceBottom) / currentH, type: "h" });
    if (spaceRight > 1)
      ratios.push({ r: (currentW + spaceRight) / currentW, type: "w" });
  } else if (anchor === "top-right") {
    if (spaceBottom > 1)
      ratios.push({ r: (currentH + spaceBottom) / currentH, type: "h" });
    if (spaceLeft > 1)
      ratios.push({ r: (currentW + spaceLeft) / currentW, type: "w" });
  } else if (anchor === "bottom-left") {
    if (spaceTop > 1)
      ratios.push({ r: (currentH + spaceTop) / currentH, type: "h" });
    if (spaceRight > 1)
      ratios.push({ r: (currentW + spaceRight) / currentW, type: "w" });
  } else if (anchor === "bottom-right") {
    if (spaceTop > 1)
      ratios.push({ r: (currentH + spaceTop) / currentH, type: "h" });
    if (spaceLeft > 1)
      ratios.push({ r: (currentW + spaceLeft) / currentW, type: "w" });
  }

  ratios = ratios.filter((item) => item.r > 1.005);
  ratios.sort((a, b) => a.r - b.r);

  if (ratios.length === 0) {
    if (state.initialScale) {
      state.currentScale = state.initialScale;
      state.currentTx = 0;
      state.currentTy = 0;
      el.style.setProperty("--target-scale", state.initialScale);
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--ty", "0px");
    }
    return false;
  }

  const best = ratios[0];
  const growthFactor = best.r;
  const nextScale = state.currentScale * growthFactor;
  state.currentScale = nextScale;

  let dX = 0;
  let dY = 0;
  const rawGrowthW = currentW * (growthFactor - 1);
  const rawGrowthH = currentH * (growthFactor - 1);

  if (anchor === "top") dY = rawGrowthH / 2;
  else if (anchor === "bottom") dY = -rawGrowthH / 2;
  else if (anchor === "left") dX = rawGrowthW / 2;
  else if (anchor === "right") dX = -rawGrowthW / 2;
  else if (anchor === "top-left") {
    dX = rawGrowthW / 2;
    dY = rawGrowthH / 2;
  } else if (anchor === "top-right") {
    dX = -rawGrowthW / 2;
    dY = rawGrowthH / 2;
  } else if (anchor === "bottom-left") {
    dX = rawGrowthW / 2;
    dY = -rawGrowthH / 2;
  } else if (anchor === "bottom-right") {
    dX = -rawGrowthW / 2;
    dY = -rawGrowthH / 2;
  }

  state.currentTx += dX;
  state.currentTy += dY;
  el.style.setProperty("--target-scale", nextScale);
  el.style.setProperty("--tx", state.currentTx + "px");
  el.style.setProperty("--ty", state.currentTy + "px");
  refreshLoaderScale(el);
  if (!canScaleFurther(el)) clearScaleHint();
  return true;
}

function expandToMaxFit(el, onComplete) {
  if (state.isMobile) {
    onComplete?.();
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      let safety = 0;
      while (applyScaleStep(el) && safety < 24) {
        safety++;
      }
      if (onComplete) {
        setTimeout(onComplete, 550);
      }
    });
  });
}

function mountEmbed(element, project) {
  if (!project?.embedUrl) return;
  element.classList.add("embed-project");
  element.querySelectorAll(".slide-image, .embed-shell").forEach((node) => {
    node.remove();
  });

  const shell = document.createElement("div");
  shell.className = "embed-shell";

  const iframe = document.createElement("iframe");
  iframe.className = "project-embed";
  iframe.src = project.embedUrl;
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("loading", "eager");
  iframe.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
  );
  iframe.title = project.name;

  shell.appendChild(iframe);
  element.appendChild(shell);
}

function unmountEmbed(element) {
  if (!element) return;
  element.querySelector(".embed-shell")?.remove();
  element.classList.remove("embed-project");
}

function isEmbedProject(galleryIndex) {
  return getProjectByGalleryIndex(galleryIndex)?.type === "embed";
}

function refreshLoaderScale(element) {
  const loader = element.querySelector(".slide-loader");
  if (loader) {
    let scaleVal = parseFloat(
      element.style.getPropertyValue("--target-scale"),
    );
    if (!scaleVal || isNaN(scaleVal)) scaleVal = 1;
    loader.style.transform = `translate(-50%, -50%) scale(${1 / scaleVal})`;
  }
}

document.addEventListener("mousemove", (e) => {
  if (state.isMobile) return;

  const cx = e.clientX;
  const cy = e.clientY;

  if (!state.hasEntered) {
    customCursor.innerHTML = "+";
    updateCustomCursor(cx, cy, 0);
    stampWelcomePlus(cx, cy);
    return;
  }

  if (state.isLoading) return;
  customCursor.style.left = cx + "px";
  customCursor.style.top = cy + "px";

  let rotation = 0;
  const isOverModel = e.target.tagName.toLowerCase() === "model-viewer";
  const nearScale = isNearScaleButton(cx, cy);

  if (nearScale) {
    // Near scale: normal + so the button is easy to hit
    customCursor.innerHTML = "+";
    rotation = 0;
  } else if (state.isZoomed && state.zoomedElement) {
    const rect = state.zoomedElement.getBoundingClientRect();
    const embedOpen = isEmbedProject(state.currentGalleryIndex);
    const overImage =
      !embedOpen &&
      cx >= rect.left &&
      cx <= rect.right &&
      cy >= rect.top &&
      cy <= rect.bottom;
    const onLeftHalf = overImage && cx - rect.left < rect.width / 2;

    if (onLeftHalf) {
      customCursor.innerHTML = "&larr;";
      rotation = 0;
    } else if (overImage) {
      customCursor.innerHTML = "&rarr;";
      rotation = 0;
    } else {
      customCursor.innerHTML = "+";
      rotation = 45;
    }
  } else if (isOverModel) {
    customCursor.innerHTML = "+";
    rotation = 0;
  } else {
    customCursor.innerHTML = "+";
  }

  customCursor.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  handleTrailLogic(cx, cy);
});

document.addEventListener(
  "touchmove",
  (e) => {
    if (!state.hasEntered) return;
    if (!state.isMobile) return;
    if (state.aboutActive) return;

    if (state.viewMode === "grid" && e.target.closest("#grid-view")) {
      return;
    }

    if (!e.target.closest("model-viewer")) {
      e.preventDefault();
    }

    if (e.target.closest("model-viewer") || state.isZoomed) return;
    if (state.isLoading) return;

    // Mobile trail mode uses auto-spawn — no drag drawing
    if (state.viewMode === "trail") {
      const touch = e.touches[0];
      const dist = Math.hypot(
        touch.clientX - state.lastX,
        touch.clientY - state.lastY,
      );
      if (dist > 18) touchMoved = true;
      return;
    }
  },
  { passive: false },
);

document.addEventListener(
  "touchstart",
  (e) => {
    if (!state.hasEntered) return;
    if (state.aboutActive) return;
    if (e.target.closest("model-viewer") || state.isZoomed) return;
    if (!state.isMobile) return;
    touchMoved = false;
    touchStartTime = Date.now();
    const touch = e.touches[0];
    state.lastX = touch.clientX;
    state.lastY = touch.clientY;
  },
  { passive: true },
);

function handleTrailLogic(cx, cy) {
  if (!state.hasEntered) return;
  if (state.isMobile) return;
  if (state.viewMode !== "trail") return;
  if (cy < CONFIG.navZoneHeight) return;
  if (state.isZoomed || canvas.classList.contains("hidden-canvas")) return;
  if (!state.hasMoved) {
    helperText.style.opacity = "0";
    state.hasMoved = true;
  }
  const dist = Math.hypot(cx - state.lastX, cy - state.lastY);
  const limit = CONFIG.minDist;
  if (dist > limit) {
    createBox(cx, cy);
    state.lastX = cx;
    state.lastY = cy;
  }
}

canvas.addEventListener("click", (e) => {
  if (!state.hasEntered) return;
  if (state.isMobile && touchMoved) {
    touchMoved = false;
    // Still allow taps on project boxes after a small finger slip
    const target = e.target.closest(".trail-image");
    if (!target || state.isZoomed) return;
    zoomIn(target);
    e.stopPropagation();
    return;
  }

  const target = e.target.closest(".trail-image");
  if (target && !state.isZoomed) {
    zoomIn(target);
    e.stopPropagation();
    return;
  }
  // Trail laid out, click empty space → radial emoji burst (stays in viewport)
  if (
    !state.isMobile &&
    !state.isZoomed &&
    state.viewMode === "trail" &&
    !target &&
    document.querySelector(".trail-image")
  ) {
    fireTrailEmojiBurst(e.clientX, e.clientY);
    return;
  }
  if (
    state.isZoomed &&
    target &&
    target.classList.contains("zoomed") &&
    !state.isMobile &&
    !isEmbedProject(state.currentGalleryIndex)
  ) {
    handleSlideshowClick(e, target);
    e.stopPropagation();
  }
});

backdrop.addEventListener("click", zoomOut);
backdrop.addEventListener(
  "touchstart",
  (e) => {
    if (state.isZoomed) {
      e.preventDefault();
      zoomOut();
    }
  },
  { passive: false },
);

/** @type {Map<number, { urls: string[], images: HTMLImageElement[], loading: boolean }>} */
const scrubCache = new Map();

function isVideoTrailProject(project) {
  return (
    project?.id === "experimente" ||
    project?.id === "tat" ||
    project?.id === "glbviewer"
  );
}

/** First loop video for ARCHIVE / TAT trail tiles */
function getFirstFillVideoPath(project) {
  if (!project?.folder) return null;
  return `bilder/${project.folder}/1fill.mp4`;
}

function preloadScrubFrames(galleryIndex) {
  const project = getProjectByGalleryIndex(galleryIndex);
  if (isVideoTrailProject(project)) return Promise.resolve([]);

  let entry = scrubCache.get(galleryIndex);
  if (entry?.images.length) return Promise.resolve(entry.images);
  if (entry?.loading) {
    return new Promise((resolve) => {
      const wait = () => {
        const e = scrubCache.get(galleryIndex);
        if (e && !e.loading) resolve(e.images);
        else requestAnimationFrame(wait);
      };
      wait();
    });
  }

  const urls = getScrubPaths(project);
  entry = { urls, images: [], loading: true };
  scrubCache.set(galleryIndex, entry);

  if (!urls.length) {
    entry.loading = false;
    return Promise.resolve([]);
  }

  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        }),
    ),
  ).then((loaded) => {
    entry.images = loaded.filter(Boolean);
    entry.loading = false;
    return entry.images;
  });
}

function stopHoverScrub(container) {
  if (!container) return;
  if (container._scrubRaf) {
    cancelAnimationFrame(container._scrubRaf);
    container._scrubRaf = 0;
  }
  container._scrubActive = false;
  const overlay = container.querySelector(".scrub-overlay");
  if (overlay) overlay.remove();
}

function stopHoverTrailVideo(container) {
  if (!container) return;
  container.querySelectorAll("video.trail-hover-video").forEach((video) => {
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch (err) {}
    video.remove();
  });
}

/** ARCHIVE / TAT: play first fill video on hover (always muted — no audio overlay) */
function startHoverTrailVideo(container, project) {
  if (!container || !project || state.isMobile || state.isZoomed) return;
  if (trailDrawActive) return;
  stopHoverTrailVideo(container);

  const mobileSrc = getMobileVideoPath(getFirstFillVideoPath(project));
  const fullSrc = getFirstFillVideoPath(project);
  const vid = document.createElement("video");
  vid.className = "slide-image trail-hover-video scrub-overlay";
  vid.muted = true;
  vid.defaultMuted = true;
  vid.volume = 0;
  vid.loop = true;
  vid.autoplay = true;
  vid.playsInline = true;
  vid.preload = "auto";
  vid.setAttribute("muted", "");
  if (project.id === "glbviewer") {
    vid.style.objectFit = "fill";
    vid.style.height = "100%";
    vid.style.top = "0";
    vid.style.backgroundColor = "transparent";
  } else {
    vid.style.objectFit = "cover";
    vid.style.height = "100%";
    vid.style.top = "0";
  }
  vid.src = mobileSrc;
  vid.onerror = () => {
    if (fullSrc && !vid.dataset.triedFull) {
      vid.dataset.triedFull = "1";
      vid.src = fullSrc;
      vid.play().catch(() => {});
    } else {
      vid.remove();
    }
  };
  container.appendChild(vid);
  vid.play().catch(() => {});
}

function startHoverScrub(container) {
  if (!container || state.isMobile || state.isZoomed || state.aboutActive) {
    return;
  }
  if (trailDrawActive) return;
  const galleryIndex = parseInt(container.dataset.galleryIndex, 10);
  if (Number.isNaN(galleryIndex)) return;
  const project = getProjectByGalleryIndex(galleryIndex);
  if (isVideoTrailProject(project)) return;

  const scrubMs =
    project?.id === "entwicklung" || project?.id === "prepress"
      ? 140
      : CONFIG.scrubIntervalMs;

  stopHoverScrub(container);
  container._scrubActive = true;
  // Warm cache as soon as hover starts
  preloadScrubFrames(galleryIndex).then((frames) => {
    if (!container._scrubActive || state.isZoomed || trailDrawActive) return;
    if (!frames || frames.length < 2) return;
    if (!container.isConnected || !container.matches(":hover")) {
      stopHoverScrub(container);
      return;
    }

    let overlay = container.querySelector(".scrub-overlay");
    if (!overlay) {
      overlay = document.createElement("img");
      overlay.className = "slide-image scrub-overlay";
      overlay.draggable = false;
      overlay.alt = "";
      container.appendChild(overlay);
    }

    let frameIdx = 0;
    let lastTs = 0;
    const step = (ts) => {
      if (!container._scrubActive || state.isZoomed || trailDrawActive) {
        if (trailDrawActive) stopHoverScrub(container);
        return;
      }
      if (!lastTs) lastTs = ts;
      if (ts - lastTs >= scrubMs) {
        lastTs = ts;
        overlay.src = frames[frameIdx % frames.length].src;
        frameIdx++;
      }
      container._scrubRaf = requestAnimationFrame(step);
    };
    // Show first frame immediately
    overlay.src = frames[0].src;
    frameIdx = 1;
    container._scrubRaf = requestAnimationFrame(step);
  });
}

function stopAllHoverScrubs() {
  document.querySelectorAll(".trail-image").forEach((el) => {
    stopHoverScrub(el);
    stopHoverTrailVideo(el);
  });
}

function createProjectBox(galleryIndex, x, y, boxId, options = {}) {
  const { deferMedia = false } = options;
  const container = document.createElement("div");
  container.className = "trail-image";
  container.addEventListener("mouseenter", () => {
    if (!isVideoTrailProject(getProjectByGalleryIndex(galleryIndex))) {
      playHoverSound();
    }
  });

  const width = state.isMobile ? CONFIG.mobileBoxWidth : CONFIG.boxWidth;
  const height = state.isMobile ? CONFIG.mobileBoxHeight : CONFIG.boxHeight;
  container.style.width = width + "px";
  container.style.height = height + "px";
  container.style.setProperty(
    "--idle-scale",
    state.isMobile ? CONFIG.mobileScale : 1,
  );

  container.dataset.galleryIndex = galleryIndex;
  container.dataset.slideIndex = 0;
  container.dataset.boxId = boxId;

  const project = getProjectByGalleryIndex(galleryIndex);
  if (project?.id) container.dataset.projectId = project.id;

  // Light still on trail; ARCHIVE/TAT play video only on hover
  const mediaSrc = project
    ? getMobileCoverPath(project)
    : GALLERIES[galleryIndex]?.[0] || null;

  if (!deferMedia) {
    if (mediaSrc) {
      loadMedia(
        mediaSrc,
        container,
        () => {},
        () => {
          const fallback = GALLERIES[galleryIndex]?.[0];
          if (fallback && fallback !== mediaSrc && !isVideoPath(fallback)) {
            loadMedia(
              fallback,
              container,
              () => {},
              () => {
                container.style.backgroundColor = "#e5e7eb";
                container.style.border = "1px solid #9ca3af";
              },
              "slide-image",
              { allowVideo: false },
            );
            return;
          }
          container.style.backgroundColor = "#e5e7eb";
          container.style.border = "1px solid #9ca3af";
        },
        "slide-image",
        {
          allowVideo: false,
          objectFit: project?.id === "glbviewer" ? "fill" : undefined,
        },
      );
    } else if (project?.blankCover) {
      const blank = document.createElement("div");
      blank.className = "slide-image embed-cover-blank";
      container.appendChild(blank);
    }
  } else if (project?.blankCover && !mediaSrc) {
    const blank = document.createElement("div");
    blank.className = "slide-image embed-cover-blank";
    container.appendChild(blank);
  }

  container.style.left = `${x}px`;
  container.style.top = `${y}px`;

  container.addEventListener("mouseenter", () => {
    if (!state.isZoomed && project) {
      navCenter.innerText = project.name;
    }
    if (state.isZoomed || state.isMobile || trailDrawActive) return;
    if (isVideoTrailProject(project)) {
      startHoverTrailVideo(container, project);
    } else {
      startHoverScrub(container);
    }
  });
  container.addEventListener("mouseleave", () => {
    stopHoverScrub(container);
    stopHoverTrailVideo(container);
    if (!state.isZoomed) resetInfo();
  });

  container.addEventListener("click", () => {
    if (!state.isMuted && !state.isMobile && !state.isZoomed) {
      zoomSound.currentTime = 0;
      zoomSound.play().catch(() => {});
    }
  });

  return container;
}

function createBox(x, y) {
  if (state.count >= CONFIG.maxImages) return;
  state.count++;
  const galleryIndex = (state.count - 1) % GALLERIES.length;
  const container = createProjectBox(galleryIndex, x, y, state.count);
  canvas.appendChild(container);
  markTrailDrawing();
  playPlaceSound();
}

function zoomIn(element, options = {}) {
  const { expandToMax = false } = options;
  clearTrailBurstParticles();
  stopAllHoverScrubs();
  state.isZoomed = true;
  state.zoomedElement = element;
  state.currentGalleryIndex = parseInt(element.dataset.galleryIndex, 10);
  // Always start from the cover — same order every open
  state.currentSlideIndex = 0;
  element.dataset.slideIndex = "0";
  state.slideRequestId = (state.slideRequestId || 0) + 1;
  const openReqId = state.slideRequestId;
  const project = getProjectByGalleryIndex(state.currentGalleryIndex);
  const isEmbed = project?.type === "embed";
  const boxId = parseInt(element.dataset.boxId, 10);
  updateInfo(boxId);

  if (!isEmbed) {
    const gallery = GALLERIES[state.currentGalleryIndex];
    // Reload cover so reopen never keeps a leftover mid-gallery frame
    if (gallery[0]) {
      const coverIsVideo = isVideoPath(gallery[0]);
      loadMedia(
        gallery[0],
        element,
        (newEl) => {
          if (openReqId !== state.slideRequestId) {
            if (newEl.tagName === "VIDEO") {
              try {
                newEl.pause();
                newEl.removeAttribute("src");
                newEl.load();
              } catch (err) {}
            }
            newEl.remove();
            return;
          }
          element.querySelectorAll(".slide-image").forEach((el) => {
            if (el === newEl) return;
            if (el.tagName === "VIDEO") {
              try {
                el.pause();
                el.removeAttribute("src");
                el.load();
              } catch (err) {}
            }
            el.remove();
          });
        },
        () => {},
        "slide-image",
        {
          allowVideo: coverIsVideo || !state.isMobile,
          objectFit: project?.id === "glbviewer" ? "fill" : undefined,
        },
      );
    }
    preloadNeighbors(state.currentGalleryIndex, state.currentSlideIndex);
  }
  document.body.classList.add("zoomed-active");

  if (gridView) gridView.classList.remove("active");

  clearShuffleGhosts();
  document.querySelectorAll(".trail-image").forEach((sib) => {
    if (sib !== element) sib.classList.add("faded");
  });
  if (state.isMobile) unloadFadedTrailMedia();

  if (state.isMobile) {
    const originX = parseFloat(element.style.left);
    const originY = parseFloat(element.style.top);
    element.dataset.originX = String(originX);
    element.dataset.originY = String(originY);

    const vpW = window.innerWidth;
    const currentW =
      parseFloat(element.style.width) || CONFIG.mobileBoxWidth;
    const scale = (vpW / currentW) * 1.005;
    state.currentMobileScale = scale;

    const applyMobileOpen = () => {
      const newCenterX = vpW / 2;
      let newCenterY = originY;
      const scaledH =
        (parseFloat(element.style.height) || CONFIG.mobileBoxHeight) * scale;
      const halfH = scaledH / 2;
      const footerRect = footerEl.getBoundingClientRect();
      const limitBottom = footerRect.top - 2.5;

      if (newCenterY + halfH > limitBottom) newCenterY = limitBottom - halfH;
      if (newCenterY - halfH < 0) newCenterY = halfH;

      element.style.left = newCenterX + "px";
      element.style.top = newCenterY + "px";
      element.style.setProperty("--target-scale", scale);
      element.classList.add("zoomed");

      if (isEmbed) {
        setTimeout(() => mountEmbed(element, project), 550);
      } else {
        swipeHintEl.style.left = newCenterX + "px";
        swipeHintEl.style.top = newCenterY + "px";
        addSwipeListener(element);
        startSwipeHintTimer();
      }
    };

    // Let footer caption layout settle, then open flush to the text
    requestAnimationFrame(() => requestAnimationFrame(applyMobileOpen));
    return;
  }

  const canvasW = canvas.offsetWidth;
  const footerRect = footerEl.getBoundingClientRect();
  const limitBottom = footerRect.top - 3;
  const currentW = parseFloat(element.style.width);
  const currentH = parseFloat(element.style.height);
  const centerX = parseFloat(element.style.left);
  const centerY = parseFloat(element.style.top);

  const finalScale = Math.min(
    centerY / (currentH / 2),
    (limitBottom - centerY) / (currentH / 2),
    centerX / (currentW / 2),
    (canvasW - centerX) / (currentW / 2),
  );

  state.currentScale = finalScale;
  state.initialScale = finalScale;
  state.currentTx = 0;
  state.currentTy = 0;

  const distTop = centerY / (currentH / 2);
  const distBottom = (limitBottom - centerY) / (currentH / 2);
  const distLeft = centerX / (currentW / 2);
  const distRight = (canvasW - centerX) / (currentW / 2);

  let anchor = "";
  if (Math.abs(finalScale - distTop) < 0.01) anchor = "top";
  else if (Math.abs(finalScale - distBottom) < 0.01) anchor = "bottom";
  else if (Math.abs(finalScale - distLeft) < 0.01) anchor = "left";
  else if (Math.abs(finalScale - distRight) < 0.01) anchor = "right";
  state.anchorEdge = anchor;

  element.style.setProperty("--target-scale", finalScale);
  element.style.setProperty("--tx", "0px");
  element.style.setProperty("--ty", "0px");
  element.classList.add("zoomed");

  if (isEmbed) {
    expandToMaxFit(element, () => mountEmbed(element, project));
    return;
  }

  if (expandToMax) {
    expandToMaxFit(element);
  }

  navScale.style.display = "block";
  resetScaleHintSession();
}

function addSwipeListener(element) {
  // Prevent stacking listeners when opening the same project again
  if (element.dataset.swipeBound === "1") return;
  element.dataset.swipeBound = "1";

  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchMove = (e) => {
    if (!state.zoomedElement) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    element.removeEventListener("touchmove", handleTouchMove);
    element.removeEventListener("touchend", handleTouchEnd);
    if (!state.isZoomed || state.zoomedElement !== element) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX < -50) changeSlide(1);
    else if (deltaX > 50) changeSlide(-1);
    startSwipeHintTimer();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length > 1) return;
    if (!state.isZoomed || state.zoomedElement !== element) return;
    hideSwipeHint();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    element.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    element.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });
  };

  element.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });
}

function handleSlideshowClick(e, element) {
  const rect = element.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  if (clickX > rect.width / 2) changeSlide(1);
  else changeSlide(-1);
}

function changeSlide(direction, isAutoSkip = false) {
  if (!state.zoomedElement) return;
  if (isEmbedProject(state.currentGalleryIndex)) return;
  const elementRef = state.zoomedElement;
  const gallery = GALLERIES[state.currentGalleryIndex];
  let nextIdx = state.currentSlideIndex + direction;
  if (nextIdx >= gallery.length) nextIdx = 0;
  if (nextIdx < 0) nextIdx = gallery.length - 1;

  state.currentSlideIndex = nextIdx;
  elementRef.dataset.slideIndex = String(nextIdx);
  state.slideRequestId = (state.slideRequestId || 0) + 1;
  const reqId = state.slideRequestId;

  if (!state.isMuted && !state.isMobile && !isAutoSkip) {
    skipSound.currentTime = 0;
    skipSound.play().catch(() => {});
  }

  if (!isAutoSkip && !state.isMobile) {
    triggerScaleHint(direction === 1);
  }

  if (!isAutoSkip) {
    if (state.loaderTimeout) clearTimeout(state.loaderTimeout);
    const existingLoader = state.zoomedElement.querySelector(".slide-loader");
    if (existingLoader) existingLoader.remove();
    state.loaderTimeout = setTimeout(() => {
      if (reqId === state.slideRequestId) {
        const loader = document.createElement("div");
        loader.className = "slide-loader";
        loader.innerHTML = `
          <div class="loading-rect"></div>
          <div class="loading-rect"></div>
          <div class="loading-rect"></div>
          <div class="loading-rect"></div>
        `;
        state.zoomedElement.appendChild(loader);
        state.zoomedElement.classList.add("loading-active");
        refreshLoaderScale(state.zoomedElement);
      }
    }, 300);
  }

  loadMedia(
    gallery[nextIdx],
    state.zoomedElement,
    (newEl) => {
      if (reqId !== state.slideRequestId || state.zoomedElement !== elementRef) {
        if (newEl.tagName === "VIDEO") {
          try {
            newEl.pause();
            newEl.removeAttribute("src");
            newEl.load();
          } catch (err) {}
        }
        newEl.remove();
        return;
      }
      if (state.loaderTimeout) clearTimeout(state.loaderTimeout);
      const loader = state.zoomedElement.querySelector(".slide-loader");
      if (loader) loader.remove();
      state.zoomedElement.classList.remove("loading-active");
      state.zoomedElement.querySelectorAll(".slide-image").forEach((el) => {
        if (el === newEl) return;
        if (el.tagName === "VIDEO") {
          try {
            el.pause();
            el.removeAttribute("src");
            el.load();
          } catch (err) {}
        }
        el.remove();
      });
      preloadNeighbors(state.currentGalleryIndex, nextIdx);
    },
    () => {
      // Only auto-skip missing slides while still on this open project
      if (
        reqId === state.slideRequestId &&
        state.zoomedElement === elementRef
      ) {
        changeSlide(direction, true);
      }
    },
  );
}

function zoomOut() {
  if (!state.isMobile && !state.isMuted) {
    const s = new Audio("sounds/swoosh.mp3");
    s.volume = 1.0;
    s.playbackRate = 1.8;
    s.play().catch(() => {});
  }

  hideSwipeHint();
  const wasMobileTrail =
    state.isMobile && state.viewMode === "trail" && !state.aboutActive;
  state.isZoomed = false;
  state.zoomedElement = null;
  state.currentSlideIndex = 0;
  state.slideRequestId = (state.slideRequestId || 0) + 1;
  resetInfo();
  navScale.style.display = "none";
  resetScaleHintSession();
  document.body.classList.remove("zoomed-active");

  const zoomedEl = document.querySelector(".trail-image.zoomed");

  if (wasMobileTrail && zoomedEl) {
    unmountEmbed(zoomedEl);
    restoreProjectThumbnail(zoomedEl);

    const originX = parseFloat(zoomedEl.dataset.originX);
    const originY = parseFloat(zoomedEl.dataset.originY);

    zoomedEl.classList.remove("loading-active");
    zoomedEl.classList.remove("zoomed");
    zoomedEl.style.removeProperty("--tx");
    zoomedEl.style.removeProperty("--ty");
    zoomedEl.style.removeProperty("--target-scale");

    if (!Number.isNaN(originX) && !Number.isNaN(originY)) {
      zoomedEl.style.left = `${originX}px`;
      zoomedEl.style.top = `${originY}px`;
    }

    // Keep siblings hidden until the open project has returned, then reveal
    setTimeout(() => {
      document.querySelectorAll(".trail-image.faded").forEach((el) => {
        el.classList.remove("faded");
      });
      reloadVisibleThumbnails();
    }, 550);
    return;
  }

  if (zoomedEl) {
    unmountEmbed(zoomedEl);
    zoomedEl.classList.remove("loading-active");
    zoomedEl.classList.remove("zoomed");
    zoomedEl.style.removeProperty("--tx");
    zoomedEl.style.removeProperty("--ty");
    setTimeout(() => {
      if (zoomedEl) zoomedEl.style.removeProperty("--target-scale");
    }, 500);
  }

  document
    .querySelectorAll(".trail-image.faded")
    .forEach((el) => el.remove());

  setTimeout(() => {
    if (zoomedEl) zoomedEl.remove();
    document.querySelectorAll(".trail-image").forEach((img) => img.remove());

    if (state.viewMode === "grid") {
      if (gridView) gridView.classList.add("active");
      if (helperText) helperText.style.opacity = "0";
    } else if (state.isMobile) {
      spawnMobileProjects();
    } else {
      state.count = 0;
      state.hasMoved = false;
      state.lastX = 0;
      state.lastY = 0;
      updateHelperText();
    }
  }, 550);
}

document.body.classList.add(
  state.viewMode === "grid" ? "view-grid" : "view-trail",
);
if (navViewMode) {
  navViewMode.innerText = state.viewMode === "grid" ? "trail" : "grid";
  navViewMode.dataset.activeMode = state.viewMode;
}
