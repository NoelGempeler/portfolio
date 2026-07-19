import { CONFIG, VIEW_MODE_KEY } from "./config.js";
import { PROJECTS, GALLERIES, getCoverPath } from "./projects.js";

console.log("Application initializing...");

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
const initialViewMode = savedViewMode === "grid" ? "grid" : "trail";

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
  hasEntered: false,
  viewMode: initialViewMode,
  currentMobileScale: 1,
  anchorEdge: null,
  currentScale: 1,
  currentTx: 0,
  currentTy: 0,
  slideRequestId: 0,
  isMuted: true,
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

const canvas = document.getElementById("canvas");
const aboutPage = document.getElementById("about-page");
const backdrop = document.getElementById("backdrop");
const helperText = document.getElementById("helper-text");
const navCenter = document.getElementById("nav-center");
const navHome = document.getElementById("nav-home");
const navAbout = document.getElementById("nav-about");
const navSound = document.getElementById("nav-sound");
const navScale = document.getElementById("nav-scale");
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
  document.querySelectorAll("video").forEach((video) => {
    video.muted = muted;
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
  enableSound();

  if (welcomeScreen) {
    welcomeScreen.classList.add("welcome-dismissed");
    setTimeout(() => welcomeScreen.remove(), 600);
  }

  if (customCursor) customCursor.classList.add("cursor-active");
  updateHelperText();
  // Phone: always land in trail with a fresh random layout (no drag needed)
  if (state.isMobile) {
    applyViewMode("trail", { persist: false });
  } else {
    applyViewMode(state.viewMode, { persist: false });
  }
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
  if (!state.hasEntered || state.isZoomed || state.aboutActive) return;
  const nextMode = state.viewMode === "trail" ? "grid" : "trail";
  applyViewMode(nextMode);
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
      cover.src = getCoverPath(project);
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

  setTimeout(finishLoading, 3000);

        GALLERIES.forEach((gallery) => {
          const src = gallery[0];
          if (!src) {
            updateLoader();
            return;
          }
    const img = new Image();
    img.onload = updateLoader;
    img.onerror = () => {
      const vid = document.createElement("video");
      vid.onloadeddata = updateLoader;
      vid.onerror = updateLoader;
      vid.src = src.replace(".webp", ".mp4");
    };
    img.src = src;
  });
}
preloadAllCovers();

let lastHoverTime = 0;
function playHoverSound() {
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
navScale.addEventListener("mouseenter", playHoverSound);
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

const onProgress = (event) => {
  const progressBar = event.target.querySelector(".progress-bar");
  const updatingBar = event.target.querySelector(".update-bar");
  if (updatingBar) {
    updatingBar.style.width = `${event.detail.totalProgress * 100}%`;
  }
  if (event.detail.totalProgress === 1) {
    if (progressBar) progressBar.classList.add("hide");
    event.target.removeEventListener("progress", onProgress);
  } else {
    if (progressBar) progressBar.classList.remove("hide");
  }
};
const modelViewer = document.querySelector("model-viewer");
if (modelViewer) {
  modelViewer.addEventListener("progress", onProgress);
}

aboutPage.addEventListener("scroll", () => {
  if (state.isMobile && modelViewer) {
    try {
      const scrollTop = aboutPage.scrollTop;
      const rotation = -scrollTop * 0.005;
      const orbit = modelViewer.getCameraOrbit();
      if (orbit) {
        modelViewer.cameraOrbit = `${rotation}rad ${orbit.phi}rad ${orbit.radius}m`;
      }
    } catch (err) {}
  }
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
  clearTimeout(swipeTimer);
  swipeTimer = setTimeout(() => {
    if (state.isZoomed && state.currentSlideIndex === 0) {
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

  element.dataset.slideIndex = "0";
  element.querySelectorAll(".slide-image, .embed-shell").forEach((node) => {
    node.remove();
  });
  element.classList.remove("embed-project", "loading-active");

  const coverSrc = gallery[0];
  if (coverSrc) {
    loadMedia(coverSrc, element, () => {}, () => {});
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

  document.querySelectorAll(".trail-image").forEach((img) => img.remove());
  state.count = 0;

  const total = Math.min(PROJECTS.length, CONFIG.maxImages);
  const positions = generateMobilePositions(total);

  for (let i = 0; i < total; i++) {
    const { x, y } = positions[i];
    state.count++;
    const galleryIndex = i % PROJECTS.length;
    const container = createProjectBox(galleryIndex, x, y, i + 1);
    container.dataset.originX = String(x);
    container.dataset.originY = String(y);
    canvas.appendChild(container);
  }

  state.hasMoved = true;
  if (helperText) helperText.style.opacity = "0";
}

const preloadNeighbors = (galleryIdx, currentSlideIdx) => {
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
) {
  const img = new Image();
  img.className = className;

  img.onload = () => {
    container.appendChild(img);
    if (onSuccess) onSuccess(img);
  };

  img.onerror = () => {
    const vidFill = document.createElement("video");
    vidFill.className = className;
    vidFill.muted = true;
    vidFill.loop = true;
    vidFill.autoplay = true;
    vidFill.playsInline = true;
    vidFill.style.objectFit = "cover";
    vidFill.style.height = "100%";
    vidFill.style.top = "0";

    vidFill.onloadeddata = () => {
      container.appendChild(vidFill);
      vidFill
        .play()
        .then(() => {
          if (!state.isMuted && !state.isMobile) vidFill.muted = false;
        })
        .catch(() => {});
      if (onSuccess) onSuccess(vidFill);
    };

    vidFill.onerror = () => {
      const vid = document.createElement("video");
      vid.className = className;
      vid.muted = true;
      vid.loop = true;
      vid.autoplay = true;
      vid.playsInline = true;

      vid.onloadeddata = () => {
        container.appendChild(vid);
        vid
          .play()
          .then(() => {
            if (!state.isMuted && !state.isMobile) vid.muted = false;
          })
          .catch(() => {});
        if (onSuccess) onSuccess(vid);
      };

      vid.onerror = () => {
        const vidRot = document.createElement("video");
        vidRot.className = className + " rotate-90";
        vidRot.muted = true;
        vidRot.loop = true;
        vidRot.autoplay = true;
        vidRot.playsInline = true;

        vidRot.onloadeddata = () => {
          container.appendChild(vidRot);
          vidRot
            .play()
            .then(() => {
              if (!state.isMuted && !state.isMobile) vidRot.muted = false;
            })
            .catch(() => {});
          if (onSuccess) onSuccess(vidRot);
        };

        vidRot.onerror = () => {
          if (onError) onError();
        };

        const basePath = src.substring(0, src.lastIndexOf("."));
        vidRot.src = basePath + "-90.mp4";
      };

      const basePath = src.substring(0, src.lastIndexOf("."));
      vid.src = basePath + ".mp4";
    };

    const basePath = src.substring(0, src.lastIndexOf("."));
    vidFill.src = basePath + "fill.mp4";
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
  navScale.classList.remove("flicker-anim");
  applyScaleStep(state.zoomedElement);
});

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
    return;
  }

  if (state.isLoading) return;
  customCursor.style.left = cx + "px";
  customCursor.style.top = cy + "px";

  let rotation = 0;
  const isOverModel = e.target.tagName.toLowerCase() === "model-viewer";

  if (state.isZoomed && state.zoomedElement) {
    const rect = state.zoomedElement.getBoundingClientRect();
    const embedOpen = isEmbedProject(state.currentGalleryIndex);
    if (
      !embedOpen &&
      cx >= rect.left &&
      cx <= rect.right &&
      cy >= rect.top &&
      cy <= rect.bottom
    ) {
      const relX = cx - rect.left;
      customCursor.innerHTML = relX < rect.width / 2 ? "&larr;" : "&rarr;";
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

function createProjectBox(galleryIndex, x, y, boxId) {
  const container = document.createElement("div");
  container.className = "trail-image";
  container.addEventListener("mouseenter", playHoverSound);

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

  const mediaSrc = GALLERIES[galleryIndex][0];

  if (mediaSrc) {
    loadMedia(
      mediaSrc,
      container,
      () => {},
      () => {
        container.style.backgroundColor = "#e5e7eb";
        container.style.border = "1px solid #9ca3af";
      },
    );
  } else if (project?.blankCover) {
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
  });
  container.addEventListener("mouseleave", () => {
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
}

function zoomIn(element, options = {}) {
  const { expandToMax = false } = options;
  state.isZoomed = true;
  state.zoomedElement = element;
  state.currentGalleryIndex = parseInt(element.dataset.galleryIndex);
  state.currentSlideIndex = parseInt(element.dataset.slideIndex);
  const project = getProjectByGalleryIndex(state.currentGalleryIndex);
  const isEmbed = project?.type === "embed";
  const boxId = parseInt(element.dataset.boxId);
  updateInfo(boxId);

  if (!isEmbed) {
    const gallery = GALLERIES[state.currentGalleryIndex];
    if (project?.id === "glbviewer" && gallery.length > 1) {
      state.currentSlideIndex = 1;
      element.dataset.slideIndex = 1;
      loadMedia(
        gallery[1],
        element,
        (newEl) => {
          element.querySelectorAll(".slide-image").forEach((el) => {
            if (el !== newEl) el.remove();
          });
        },
        () => {},
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
  navScale.classList.remove("flicker-anim");
}

function addSwipeListener(element) {
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
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX < -50) changeSlide(1);
    else if (deltaX > 50) changeSlide(-1);
    startSwipeHintTimer();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length > 1) return;
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
  const gallery = GALLERIES[state.currentGalleryIndex];
  let nextIdx = state.currentSlideIndex + direction;
  if (nextIdx >= gallery.length) nextIdx = 0;
  if (nextIdx < 0) nextIdx = gallery.length - 1;

  state.currentSlideIndex = nextIdx;
  state.zoomedElement.dataset.slideIndex = nextIdx;
  state.slideRequestId = (state.slideRequestId || 0) + 1;
  const reqId = state.slideRequestId;

  if (!state.isMuted && !state.isMobile && !isAutoSkip) {
    skipSound.currentTime = 0;
    skipSound.play().catch(() => {});
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
      if (reqId !== state.slideRequestId) {
        newEl.remove();
        return;
      }
      if (state.loaderTimeout) clearTimeout(state.loaderTimeout);
      const loader = state.zoomedElement.querySelector(".slide-loader");
      if (loader) loader.remove();
      state.zoomedElement.classList.remove("loading-active");
      state.zoomedElement.querySelectorAll(".slide-image").forEach((el) => {
        if (el !== newEl) el.remove();
      });
      preloadNeighbors(state.currentGalleryIndex, nextIdx);
    },
    () => {
      if (reqId === state.slideRequestId) changeSlide(direction, true);
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
  resetInfo();
  navScale.style.display = "none";
  navScale.classList.remove("flicker-anim");
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
