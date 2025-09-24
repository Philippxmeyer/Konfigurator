const CLICK_THRESHOLD = 10;
const CLICK_WINDOW = 3000; // ms
const OVERLAY_CLOSE_DELAY = 2000; // ms
const OVERLAY_ID = "diagnosticsOverlay";
const OVERLAY_TITLE_ID = "diagnosticsOverlayTitle";
const ENEMIES_PER_LEVEL = 15;
const LEVEL_TRANSITION_DELAY = 1.6; // seconds
const SPAWN_BASE_DELAY = 0.64;
const SPAWN_VARIANCE = 0.32;
const SPAWN_PROGRESS_ACCELERATION = 0.32;
const SPAWN_MIN_DELAY = 0.22;
const SPAWN_LEVEL_MULTIPLIER = 0.88;
const BASE_SCROLL_SPEED = 62;
const SCROLL_SPEED_VARIANCE = 42;
const LEVEL_SCROLL_SPEED_STEP = 8;
const LEVEL_AMPLITUDE_STEP = 6;
const LEVEL_FREQUENCY_STEP = 0.08;
const TOUCH_SWIPE_THRESHOLD = 14;
const TOUCH_TAP_MAX_MOVEMENT = 12;
const TOUCH_TAP_MAX_DURATION = 220;

const ENEMY_IMAGE_PATHS = [
  "bilder/icons/400039.png",
  "bilder/icons/403808.png",
  "bilder/icons/403809.png",
  "bilder/icons/403810.png",
  "bilder/icons/403818.png",
  "bilder/icons/403822.png",
  "bilder/icons/403834.png",
  "bilder/icons/403871.png",
  "bilder/icons/403872.png",
  "bilder/icons/403879.png",
  "bilder/icons/403880.png",
  "bilder/icons/403887.png",
  "bilder/icons/403888.png",
  "bilder/icons/403891.png",
  "bilder/icons/403892.png",
  "bilder/icons/404791.png",
  "bilder/icons/404792.png",
  "bilder/icons/404795.png",
];

const ENEMY_IMAGES = ENEMY_IMAGE_PATHS.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

let clickHistory = [];
let overlayElement;
let closeButton;
let canvasElement;
let gameController;
let lastFocusedElement = null;
let overlayOpenedAt = 0;

function setup() {
  const logo = document.querySelector("#logo-container img");
  if (!logo) return;

  overlayElement = createOverlay();
  canvasElement = overlayElement.querySelector("canvas");
  closeButton = overlayElement.querySelector("[data-overlay-close]");

  document.body.appendChild(overlayElement);

  logo.addEventListener("click", handleLogoClick, { passive: true });
  closeButton?.addEventListener("click", closeOverlay);
  overlayElement.addEventListener("click", event => {
    if (event.target === overlayElement) {
      const now = performance.now();
      if (now - overlayOpenedAt >= OVERLAY_CLOSE_DELAY) {
        closeOverlay();
      }
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && overlayElement.classList.contains("is-open")) {
      event.preventDefault();
      closeOverlay();
    }
  });
}

function handleLogoClick() {
  const now = Date.now();
  clickHistory.push(now);
  clickHistory = clickHistory.filter(timestamp => now - timestamp <= CLICK_WINDOW);

  if (clickHistory.length >= CLICK_THRESHOLD) {
    clickHistory = [];
    openOverlay();
  }
}

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "article-overlay diagnostics-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const dialog = document.createElement("div");
  dialog.className = "article-overlay__dialog diagnostics-overlay__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", OVERLAY_TITLE_ID);

  const header = document.createElement("header");
  header.className = "article-overlay__header diagnostics-overlay__header";

  const title = document.createElement("h2");
  title.id = OVERLAY_TITLE_ID;
  title.textContent = "System Monitor";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn btn--icon article-overlay__close";
  close.setAttribute("data-overlay-close", "");
  close.setAttribute("aria-label", "Fenster schließen");
  close.textContent = "✕";

  const body = document.createElement("div");
  body.className = "article-overlay__body diagnostics-overlay__body";

  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 640;
  canvas.className = "diagnostics-overlay__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Visualisierung des Systemmonitors");

  const instructions = document.createElement("p");
  instructions.className = "diagnostics-overlay__instructions";
  instructions.textContent =
    "Steuerung: ← → bewegen, Leertaste halten für Dauerfeuer, Enter startet neu (Level wechseln automatisch). Touch: Tippen schießt, horizontales Wischen steuert.";

  body.append(canvas, instructions);
  header.append(title, close);
  dialog.append(header, body);
  overlay.append(dialog);

  return overlay;
}

function openOverlay() {
  if (!overlayElement) return;
  if (overlayElement.classList.contains("is-open")) return;

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlayElement.classList.add("is-open");
  overlayElement.setAttribute("aria-hidden", "false");
  document.body.classList.add("overlay-open");
  overlayOpenedAt = performance.now();

  if (!gameController) {
    gameController = createDiagnosticsController(canvasElement);
  }
  gameController.start();

  if (closeButton instanceof HTMLElement) {
    closeButton.focus();
  }
}

function closeOverlay() {
  if (!overlayElement) return;
  if (!overlayElement.classList.contains("is-open")) return;

  overlayElement.classList.remove("is-open");
  overlayElement.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".article-overlay.is-open")) {
    document.body.classList.remove("overlay-open");
  }

  gameController?.stop();

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
  overlayOpenedAt = 0;
}

function createDiagnosticsController(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  canvas.style.touchAction = "none";

  const starLayers = [
    createStarLayer(26, 18, 30, "rgba(59, 130, 246, 0.2)"),
    createStarLayer(32, 28, 40, "rgba(248, 250, 252, 0.9)"),
    createStarLayer(18, 42, 60, "rgba(125, 211, 252, 0.6)"),
  ];
  const totalEnemies = ENEMIES_PER_LEVEL;

  const player = {
    x: width / 2,
    y: height - 40,
    width: 46,
    height: 18,
    speed: 320,
  };

  const bullets = [];
  const enemies = [];
  const keys = new Set();
  const enemyOrder = [];
  const touchState = {
    pointerId: null,
    initialX: 0,
    initialY: 0,
    startX: 0,
    startY: 0,
    startTime: 0,
    activeDirection: null,
    moved: false,
  };
  let level = 1;
  let defeatedCount = 0;
  let spawnTimer = 0;
  let nextEnemyIndex = 0;
  let lastTime = 0;
  let frame;
  let running = false;
  let status = "idle";
  let message = "";
  let messageAlpha = 0;
  let levelTransitionTimer = 0;

  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  canvas.addEventListener("pointerup", handlePointerUp, { passive: false });
  canvas.addEventListener("pointercancel", handlePointerCancel, { passive: false });
  canvas.addEventListener("pointerleave", handlePointerCancel, { passive: false });

  const keydownHandler = event => {
    if (!overlayElement?.classList.contains("is-open")) return;
    const key = normalizeKey(event.key);
    if (!key) return;

    if (status === "levelTransition" && key === "Enter") {
      event.preventDefault();
      initializeLevel(level + 1);
      return;
    }

    if (status !== "playing" && status !== "levelTransition" && (key === "Enter" || key === "Space")) {
      event.preventDefault();
      resetGame();
      return;
    }

    if (key === "ArrowLeft" || key === "ArrowRight" || key === "Space") {
      event.preventDefault();
      keys.add(key);
    }
  };

  const keyupHandler = event => {
    const key = normalizeKey(event.key);
    if (!key) return;
    keys.delete(key);
  };

  function resetGame() {
    initializeLevel(1);
  }

  function initializeLevel(newLevel) {
    level = newLevel;
    player.x = width / 2;
    player.y = height - 40;
    bullets.length = 0;
    enemies.length = 0;
    status = "playing";
    message = "";
    messageAlpha = 0;
    levelTransitionTimer = 0;
    keys.clear();
    enemyOrder.length = 0;
    enemyOrder.push(...generateEnemyBatch());
    defeatedCount = 0;
    spawnTimer = computeSpawnDelay(level, 0);
    nextEnemyIndex = 0;
  }

  function start() {
    resetTouchState();
    if (running) {
      resetGame();
      return;
    }
    resetGame();
    running = true;
    lastTime = performance.now();
    window.addEventListener("keydown", keydownHandler);
    window.addEventListener("keyup", keyupHandler);
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    status = "idle";
    window.removeEventListener("keydown", keydownHandler);
    window.removeEventListener("keyup", keyupHandler);
    if (typeof frame === "number") {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    keys.clear();
    resetTouchState();
    message = "";
    messageAlpha = 0;
    levelTransitionTimer = 0;
  }

  function loop(timestamp) {
    if (!running) return;
    const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    update(delta);
    draw();

    frame = requestAnimationFrame(loop);
  }

  function update(delta) {
    if (status === "playing") {
      const movingLeft = keys.has("ArrowLeft") || touchState.activeDirection === "ArrowLeft";
      const movingRight = keys.has("ArrowRight") || touchState.activeDirection === "ArrowRight";

      if (movingLeft) {
        player.x -= player.speed * delta;
      }
      if (movingRight) {
        player.x += player.speed * delta;
      }
      player.x = Math.max(player.width / 2 + 10, Math.min(width - player.width / 2 - 10, player.x));

      if (keys.has("Space")) {
        fireBullet();
      }

      bullets.forEach(bullet => {
        bullet.y -= bullet.speed * delta;
      });
      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        if (bullets[i].y + bullets[i].height < 0) {
          bullets.splice(i, 1);
        }
      }

      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        if (!enemy.alive) {
          enemies.splice(i, 1);
          continue;
        }
        updateEnemy(enemy, delta);
      }

      for (let b = bullets.length - 1; b >= 0; b -= 1) {
        const bullet = bullets[b];
        let hit = false;
        for (let i = 0; i < enemies.length; i += 1) {
          const enemy = enemies[i];
          if (isBulletColliding(bullet, enemy)) {
            enemy.alive = false;
            defeatedCount += 1;
            hit = true;
            break;
          }
        }
        if (hit) {
          bullets.splice(b, 1);
        }
      }

      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        if (!enemy.alive) {
          enemies.splice(i, 1);
          continue;
        }
        if (enemy.y - enemy.height / 2 > height) {
          status = "lost";
          message = `Anomalie auf Level ${level} erkannt – Enter für Neustart`;
          messageAlpha = 0;
        }
      }

      if (status === "playing") {
        spawnTimer -= delta;
        if (spawnTimer <= 0 && nextEnemyIndex < enemyOrder.length && enemies.length === 0) {
          const nextEnemyImage = enemyOrder[nextEnemyIndex];
          if (!nextEnemyImage.complete) {
            spawnTimer = 0.3;
          } else {
            enemies.push(createEnemy(nextEnemyImage, nextEnemyIndex, level));
            nextEnemyIndex += 1;
            const progressRatio = Math.min(nextEnemyIndex / totalEnemies, 1);
            spawnTimer = computeSpawnDelay(level, progressRatio);
          }
        }

        if (defeatedCount >= totalEnemies && enemies.length === 0) {
          status = "levelTransition";
          message = `Level ${level} stabilisiert – Stufe ${level + 1} wird vorbereitet`;
          messageAlpha = 0;
          levelTransitionTimer = LEVEL_TRANSITION_DELAY;
        }
      }
    } else if (status === "levelTransition") {
      levelTransitionTimer -= delta;
      if (levelTransitionTimer <= 0) {
        initializeLevel(level + 1);
      }
    }

    if (message) {
      messageAlpha = Math.min(messageAlpha + delta * 0.7, 1);
    } else {
      messageAlpha = 0;
    }

    starLayers.forEach(layer => {
      layer.stars.forEach(star => {
        const parallaxFactor =
          status === "playing" || status === "levelTransition" ? layer.parallax : layer.parallax * 0.6;
        star.y += star.speed * delta * parallaxFactor;
        star.x += Math.sin((star.y + star.speed) * star.driftFrequency) * star.driftStrength;
        star.twinklePhase += delta * star.twinkleSpeed;
        if (star.y > height) {
          star.y = -star.radius;
          star.x = Math.random() * width;
        }
      });
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#02040f");
    gradient.addColorStop(1, "#091834");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    starLayers.forEach(layer => {
      layer.stars.forEach(star => {
        const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
        const alpha = Math.min(1, Math.max(0.2, layer.baseAlpha + twinkle * 0.4));
        ctx.fillStyle = layer.color.replace("ALPHA", alpha.toFixed(3));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.save();
    ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Level ${level}`, 20, 26);
    ctx.fillText(`Analysefortschritt: ${Math.min(defeatedCount, totalEnemies)} / ${totalEnemies}`, 20, 46);
    ctx.restore();

    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    bullets.forEach(bullet => {
      ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height, bullet.width, bullet.height);
    });

    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      if (!enemy.image.complete) return;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.rotation);
      const drawWidth = enemy.width;
      const drawHeight = enemy.height;
      ctx.globalAlpha = Math.min(1, enemy.progress / 0.6);
      ctx.drawImage(enemy.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    });

    if (message) {
      ctx.save();
      ctx.globalAlpha = messageAlpha;
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(width / 2 - 180, height / 2 - 60, 360, 120);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.strokeRect(width / 2 - 180, height / 2 - 60, 360, 120);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "20px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(message, width / 2, height / 2 + 8);
      ctx.restore();
    }
  }

  function handlePointerDown(event) {
    if (!isTouchPointer(event)) return;
    if (!running) return;
    if (touchState.pointerId !== null && touchState.pointerId !== event.pointerId) return;

    event.preventDefault();
    releaseTouchMovement();
    touchState.pointerId = event.pointerId;
    touchState.initialX = event.clientX;
    touchState.initialY = event.clientY;
    touchState.startX = event.clientX;
    touchState.startY = event.clientY;
    touchState.startTime = performance.now();
    touchState.moved = false;

    if (typeof canvas.setPointerCapture === "function") {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        // Browsers may throw if pointer capture is not supported.
      }
    }
  }

  function handlePointerMove(event) {
    if (!isTouchPointer(event)) return;
    if (touchState.pointerId !== event.pointerId) return;

    event.preventDefault();

    const totalDeltaX = Math.abs(event.clientX - touchState.initialX);
    const totalDeltaY = Math.abs(event.clientY - touchState.initialY);
    if (!touchState.moved && (totalDeltaX > TOUCH_TAP_MAX_MOVEMENT || totalDeltaY > TOUCH_TAP_MAX_MOVEMENT)) {
      touchState.moved = true;
    }

    if (!running || status !== "playing") {
      return;
    }

    const directionalDelta = event.clientX - touchState.startX;
    if (Math.abs(directionalDelta) >= TOUCH_SWIPE_THRESHOLD) {
      const direction = directionalDelta < 0 ? "ArrowLeft" : "ArrowRight";
      if (touchState.activeDirection !== direction) {
        touchState.activeDirection = direction;
      }
      touchState.moved = true;
      touchState.startX = event.clientX;
    }
  }

  function handlePointerUp(event) {
    if (!isTouchPointer(event)) return;
    if (touchState.pointerId !== event.pointerId) return;

    event.preventDefault();

    const wasMoved = touchState.moved;
    const totalDeltaX = Math.abs(event.clientX - touchState.initialX);
    const totalDeltaY = Math.abs(event.clientY - touchState.initialY);
    const elapsed = performance.now() - touchState.startTime;
    const isTap =
      !wasMoved &&
      totalDeltaX <= TOUCH_TAP_MAX_MOVEMENT &&
      totalDeltaY <= TOUCH_TAP_MAX_MOVEMENT &&
      elapsed <= TOUCH_TAP_MAX_DURATION;

    resetTouchState();

    if (isTap && status === "playing") {
      fireBullet();
    }
  }

  function handlePointerCancel(event) {
    if (!isTouchPointer(event)) return;
    if (touchState.pointerId !== event.pointerId) return;

    event.preventDefault();
    resetTouchState();
  }

  function isTouchPointer(event) {
    return event.pointerType === "touch" || event.pointerType === "pen";
  }

  function releaseTouchMovement() {
    touchState.activeDirection = null;
  }

  function resetTouchState() {
    releaseTouchMovement();
    if (touchState.pointerId !== null && typeof canvas.releasePointerCapture === "function") {
      try {
        canvas.releasePointerCapture(touchState.pointerId);
      } catch (error) {
        // Ignore if the pointer is no longer capturable.
      }
    }
    touchState.pointerId = null;
    touchState.initialX = 0;
    touchState.initialY = 0;
    touchState.startX = 0;
    touchState.startY = 0;
    touchState.startTime = 0;
    touchState.moved = false;
  }

  function fireBullet() {
    bullets.push({
      x: player.x,
      y: player.y - player.height / 2,
      width: 4,
      height: 12,
      speed: 540,
    });
  }

  return { start, stop };

  function normalizeKey(key) {
    switch (key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "Enter":
        return key;
      case " ":
      case "Spacebar":
      case "Space":
        return "Space";
      default:
        return null;
    }
  }

  function generateEnemyBatch() {
    const result = [];
    let pool = [];
    while (result.length < ENEMIES_PER_LEVEL) {
      if (pool.length === 0) {
        pool = shuffleArray(ENEMY_IMAGES);
      }
      const next = pool.pop();
      if (next) {
        result.push(next);
      }
    }
    return result;
  }

  function computeSpawnDelay(currentLevel, progressRatio) {
    const normalizedProgress = Math.min(Math.max(progressRatio ?? 0, 0), 1);
    const levelFactor = Math.pow(SPAWN_LEVEL_MULTIPLIER, Math.max(0, currentLevel - 1));
    const randomizedDelay = (SPAWN_BASE_DELAY + Math.random() * SPAWN_VARIANCE) * levelFactor;
    const acceleratedDelay = randomizedDelay - normalizedProgress * SPAWN_PROGRESS_ACCELERATION;
    return Math.max(SPAWN_MIN_DELAY, acceleratedDelay);
  }

  function createStarLayer(count, baseSpeed, speedVariance, color) {
    const match = color.match(/rgba?\(([^,]+,[^,]+,[^,]+)(?:,([^\)]+))?\)/);
    const channels = match ? match[1] : "248, 250, 252";
    const alpha = match && match[2] !== undefined ? parseFloat(match[2]) : 0.35;
    const baseAlpha = Math.min(0.85, Math.max(0.12, Number.isFinite(alpha) ? alpha : 0.35));
    return {
      color: `rgba(${channels}, ALPHA)`,
      baseAlpha,
      parallax: 0.7 + Math.random() * 0.4,
      stars: Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.4,
        speed: baseSpeed + Math.random() * speedVariance,
        driftFrequency: 0.002 + Math.random() * 0.004,
        driftStrength: Math.random() * 12,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.6 + Math.random() * 1.2,
      })),
    };
  }

  function createEnemy(image, index, currentLevel) {
    const scale = 0.4 + Math.random() * 0.25;
    const baseWidth = (image.naturalWidth || 96) * scale;
    const baseHeight = (image.naturalHeight || 96) * scale;
    const baseX = width * (0.2 + Math.random() * 0.6);
    const baseY = -baseHeight - Math.random() * 120;
    const pathType = index % 3;
    const levelBoost = Math.max(0, currentLevel - 1);
    const enemy = {
      image,
      x: baseX,
      y: baseY,
      baseX,
      baseY,
      width: baseWidth,
      height: baseHeight,
      scale,
      alive: true,
      progress: 0,
      scrollSpeed: BASE_SCROLL_SPEED + Math.random() * SCROLL_SPEED_VARIANCE + levelBoost * LEVEL_SCROLL_SPEED_STEP,
      amplitude: 40 + Math.random() * 60 + levelBoost * LEVEL_AMPLITUDE_STEP,
      waveFrequency: 0.9 + Math.random() * 0.5 + levelBoost * LEVEL_FREQUENCY_STEP,
      waveOffset: Math.random() * Math.PI * 2,
      rotation: 0,
      pathType,
    };

    if (!image.complete) {
      image.addEventListener(
        "load",
        () => {
          enemy.width = (image.naturalWidth || 96) * enemy.scale;
          enemy.height = (image.naturalHeight || 96) * enemy.scale;
        },
        { once: true },
      );
    }

    return enemy;
  }

  function updateEnemy(enemy, delta) {
    enemy.progress += delta;
    const t = enemy.progress;
    const baseY = enemy.baseY + enemy.scrollSpeed * t * 1.1;

    switch (enemy.pathType) {
      case 0: {
        const horizontal = Math.sin(t * enemy.waveFrequency + enemy.waveOffset) * enemy.amplitude;
        const vertical = Math.cos(t * (enemy.waveFrequency * 0.6) + enemy.waveOffset) * 12;
        enemy.x = enemy.baseX + horizontal;
        enemy.y = baseY + vertical;
        break;
      }
      case 1: {
        const orbitRadius = enemy.amplitude + 50;
        enemy.x = width / 2 + Math.sin(t * (enemy.waveFrequency + 0.6) + enemy.waveOffset) * orbitRadius;
        enemy.y = baseY + Math.cos(t * (enemy.waveFrequency + 0.4) + enemy.waveOffset) * 24;
        break;
      }
      default: {
        const horizontal = Math.sin(t * (enemy.waveFrequency * 2.4) + enemy.waveOffset) * (enemy.amplitude + 80);
        const vertical = Math.sin(t * (enemy.waveFrequency * 1.7) + enemy.waveOffset * 1.3) * 18;
        enemy.x = enemy.baseX + horizontal;
        enemy.y = baseY + vertical;
        break;
      }
    }

    enemy.x = Math.max(enemy.width / 2 + 16, Math.min(width - enemy.width / 2 - 16, enemy.x));
    enemy.rotation = Math.sin(t * 1.8 + enemy.waveOffset) * 0.35;
  }

  function isBulletColliding(bullet, enemy) {
    const halfWidth = enemy.width / 2;
    const halfHeight = enemy.height / 2;
    return (
      bullet.x >= enemy.x - halfWidth &&
      bullet.x <= enemy.x + halfWidth &&
      bullet.y <= enemy.y + halfHeight &&
      bullet.y + bullet.height >= enemy.y - halfHeight
    );
  }

  function shuffleArray(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup();
}
