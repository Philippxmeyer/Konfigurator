const CLICK_THRESHOLD = 10;
const CLICK_WINDOW = 3000; // ms
const OVERLAY_CLOSE_DELAY = 2000; // ms
const OVERLAY_ID = "diagnosticsOverlay";
const OVERLAY_TITLE_ID = "diagnosticsOverlayTitle";
const PROCESSES_PER_LEVEL = 15;
const LEVEL_HANDOVER_DELAY = 1.6; // seconds
const REFRESH_BASE_DELAY = 0.64;
const REFRESH_VARIANCE = 0.32;
const REFRESH_PROGRESS_ACCELERATION = 0.32;
const REFRESH_MIN_DELAY = 0.22;
const REFRESH_LEVEL_MULTIPLIER = 0.88;
const BASE_SCROLL_SPEED = 62;
const SCROLL_SPEED_VARIANCE = 42;
const LEVEL_SCROLL_SPEED_STEP = 8;
const LEVEL_LATERAL_STEP = 6;
const LEVEL_FREQUENCY_STEP = 0.08;
const TOUCH_SWIPE_THRESHOLD = 14;
const TOUCH_TAP_MAX_MOVEMENT = 12;
const TOUCH_TAP_MAX_DURATION = 220;

const PROCESS_IMAGE_PATHS = [
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

const PROCESS_IMAGES = PROCESS_IMAGE_PATHS.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

let clickHistory = [];
let overlayElement;
let closeButton;
let canvasElement;
let diagController;
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
    "Bedienung: ← → justieren den Cursor, Leertaste sendet kontinuierlich Pakete, Enter initialisiert die Analyse neu (Stufen wechseln automatisch). Touch: Tippen dispatcht Pakete, horizontales Wischen verschiebt den Cursor.";

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

  if (!diagController) {
    diagController = createDiagnosticsController(canvasElement);
  }
  diagController.start();

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

  diagController?.stop();

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
  const totalProcesses = PROCESSES_PER_LEVEL;

  const cursor = {
    x: width / 2,
    y: height - 40,
    width: 46,
    height: 18,
    speed: 320,
  };

  const packets = [];
  const processes = [];
  const keys = new Set();
  const processOrder = [];
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
  let analyzedCount = 0;
  let refreshTimer = 0;
  let nextProcessIndex = 0;
  let lastTime = 0;
  let frame;
  let running = false;
  let scanState = "idle";
  let statusMsg = "";
  let statusMsgAlpha = 0;
  let handoverTimer = 0;

  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  canvas.addEventListener("pointerup", handlePointerUp, { passive: false });
  canvas.addEventListener("pointercancel", handlePointerCancel, { passive: false });
  canvas.addEventListener("pointerleave", handlePointerCancel, { passive: false });

  const keydownHandler = event => {
    if (!overlayElement?.classList.contains("is-open")) return;
    const key = normalizeKey(event.key);
    if (!key) return;

    if (scanState === "handover" && key === "Enter") {
      event.preventDefault();
      initializeStage(level + 1);
      return;
    }

    if (scanState !== "scanning" && scanState !== "handover" && (key === "Enter" || key === "Space")) {
      event.preventDefault();
      resetScan();
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

  function resetScan() {
    initializeStage(1);
  }

  function initializeStage(newLevel) {
    level = newLevel;
    cursor.x = width / 2;
    cursor.y = height - 40;
    packets.length = 0;
    processes.length = 0;
    scanState = "scanning";
    statusMsg = "";
    statusMsgAlpha = 0;
    handoverTimer = 0;
    keys.clear();
    processOrder.length = 0;
    processOrder.push(...generateProcessBatch());
    analyzedCount = 0;
    refreshTimer = computeRefreshDelay(level, 0);
    nextProcessIndex = 0;
  }

  function start() {
    resetTouchState();
    if (running) {
      resetScan();
      return;
    }
    resetScan();
    running = true;
    lastTime = performance.now();
    window.addEventListener("keydown", keydownHandler);
    window.addEventListener("keyup", keyupHandler);
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    scanState = "idle";
    window.removeEventListener("keydown", keydownHandler);
    window.removeEventListener("keyup", keyupHandler);
    if (typeof frame === "number") {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    keys.clear();
    resetTouchState();
    statusMsg = "";
    statusMsgAlpha = 0;
    handoverTimer = 0;
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
    if (scanState === "scanning") {
      const movingLeft = keys.has("ArrowLeft") || touchState.activeDirection === "ArrowLeft";
      const movingRight = keys.has("ArrowRight") || touchState.activeDirection === "ArrowRight";

      if (movingLeft) {
        cursor.x -= cursor.speed * delta;
      }
      if (movingRight) {
        cursor.x += cursor.speed * delta;
      }
      cursor.x = Math.max(cursor.width / 2 + 10, Math.min(width - cursor.width / 2 - 10, cursor.x));

      if (keys.has("Space")) {
        emitPacket();
      }

      packets.forEach(packet => {
        packet.y -= packet.speed * delta;
      });
      for (let i = packets.length - 1; i >= 0; i -= 1) {
        if (packets[i].y + packets[i].height < 0) {
          packets.splice(i, 1);
        }
      }

      for (let i = processes.length - 1; i >= 0; i -= 1) {
        const proc = processes[i];
        if (!proc.active) {
          processes.splice(i, 1);
          continue;
        }
        updateProcess(proc, delta);
      }

      for (let b = packets.length - 1; b >= 0; b -= 1) {
        const packet = packets[b];
        let hit = false;
        for (let i = 0; i < processes.length; i += 1) {
          const proc = processes[i];
          if (isPacketColliding(packet, proc)) {
            proc.active = false;
            analyzedCount += 1;
            hit = true;
            break;
          }
        }
        if (hit) {
          packets.splice(b, 1);
        }
      }

      for (let i = processes.length - 1; i >= 0; i -= 1) {
        const proc = processes[i];
        if (!proc.active) {
          processes.splice(i, 1);
          continue;
        }
        if (proc.y - proc.height / 2 > height) {
          scanState = "anomaly";
          statusMsg = `Anomalie in Analyse-Stufe ${level} erkannt – Enter initialisiert neu`;
          statusMsgAlpha = 0;
        }
      }

      if (scanState === "scanning") {
        refreshTimer -= delta;
        if (refreshTimer <= 0 && nextProcessIndex < processOrder.length && processes.length === 0) {
          const nextProcessImage = processOrder[nextProcessIndex];
          if (!nextProcessImage.complete) {
            refreshTimer = 0.3;
          } else {
            processes.push(createProcess(nextProcessImage, nextProcessIndex, level));
            nextProcessIndex += 1;
            const progressRatio = Math.min(nextProcessIndex / totalProcesses, 1);
            refreshTimer = computeRefreshDelay(level, progressRatio);
          }
        }

        if (analyzedCount >= totalProcesses && processes.length === 0) {
          scanState = "handover";
          statusMsg = `Analyse-Stufe ${level} stabilisiert – Stufe ${level + 1} wird vorbereitet`;
          statusMsgAlpha = 0;
          handoverTimer = LEVEL_HANDOVER_DELAY;
        }
      }
    } else if (scanState === "handover") {
      handoverTimer -= delta;
      if (handoverTimer <= 0) {
        initializeStage(level + 1);
      }
    }

    if (statusMsg) {
      statusMsgAlpha = Math.min(statusMsgAlpha + delta * 0.7, 1);
    } else {
      statusMsgAlpha = 0;
    }

    starLayers.forEach(layer => {
      layer.stars.forEach(star => {
        const parallaxFactor =
          scanState === "scanning" || scanState === "handover" ? layer.parallax : layer.parallax * 0.6;
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
    ctx.fillText(`Analyse-Stufe ${level}`, 20, 26);
    ctx.fillText(`Analysefortschritt: ${Math.min(analyzedCount, totalProcesses)} / ${totalProcesses}`, 20, 46);
    ctx.restore();

    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.moveTo(cursor.x, cursor.y - cursor.height / 2);
    ctx.lineTo(cursor.x - cursor.width / 2, cursor.y + cursor.height / 2);
    ctx.lineTo(cursor.x + cursor.width / 2, cursor.y + cursor.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    packets.forEach(packet => {
      ctx.fillRect(packet.x - packet.width / 2, packet.y - packet.height, packet.width, packet.height);
    });

    processes.forEach(proc => {
      if (!proc.active) return;
      if (!proc.image.complete) return;
      ctx.save();
      ctx.translate(proc.x, proc.y);
      ctx.rotate(proc.rotation);
      const drawWidth = proc.width;
      const drawHeight = proc.height;
      ctx.globalAlpha = Math.min(1, proc.progress / 0.6);
      ctx.drawImage(proc.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    });

    if (statusMsg) {
      ctx.save();
      ctx.globalAlpha = statusMsgAlpha;
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(width / 2 - 180, height / 2 - 60, 360, 120);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.strokeRect(width / 2 - 180, height / 2 - 60, 360, 120);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "20px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(statusMsg, width / 2, height / 2 + 8);
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

    if (!running || scanState !== "scanning") {
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

    if (isTap && scanState === "scanning") {
      emitPacket();
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

  function emitPacket() {
    packets.push({
      x: cursor.x,
      y: cursor.y - cursor.height / 2,
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

  function generateProcessBatch() {
    const result = [];
    let pool = [];
    while (result.length < PROCESSES_PER_LEVEL) {
      if (pool.length === 0) {
        pool = shuffleArray(PROCESS_IMAGES);
      }
      const next = pool.pop();
      if (next) {
        result.push(next);
      }
    }
    return result;
  }

  function computeRefreshDelay(currentLevel, progressRatio) {
    const normalizedProgress = Math.min(Math.max(progressRatio ?? 0, 0), 1);
    const levelFactor = Math.pow(REFRESH_LEVEL_MULTIPLIER, Math.max(0, currentLevel - 1));
    const randomizedDelay = (REFRESH_BASE_DELAY + Math.random() * REFRESH_VARIANCE) * levelFactor;
    const acceleratedDelay = randomizedDelay - normalizedProgress * REFRESH_PROGRESS_ACCELERATION;
    return Math.max(REFRESH_MIN_DELAY, acceleratedDelay);
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

  function createProcess(image, index, currentLevel) {
    const scale = 0.4 + Math.random() * 0.25;
    const baseWidth = (image.naturalWidth || 96) * scale;
    const baseHeight = (image.naturalHeight || 96) * scale;
    const baseX = width * (0.2 + Math.random() * 0.6);
    const baseY = -baseHeight - Math.random() * 120;
    const pathType = index % 3;
    const levelBoost = Math.max(0, currentLevel - 1);
    const lateralLimit = width * 0.2;
    const lateralSeed = 28 + Math.random() * 42 + levelBoost * LEVEL_LATERAL_STEP;
    const lateralRange = Math.min(lateralLimit, lateralSeed);
    const proc = {
      image,
      x: baseX,
      y: baseY,
      baseX,
      baseY,
      width: baseWidth,
      height: baseHeight,
      scale,
      active: true,
      progress: 0,
      scrollSpeed: BASE_SCROLL_SPEED + Math.random() * SCROLL_SPEED_VARIANCE + levelBoost * LEVEL_SCROLL_SPEED_STEP,
      lateralRange,
      waveFrequency: 0.9 + Math.random() * 0.5 + levelBoost * LEVEL_FREQUENCY_STEP,
      waveOffset: Math.random() * Math.PI * 2,
      rotation: 0,
      pathType,
    };

    if (!image.complete) {
      image.addEventListener(
        "load",
        () => {
          proc.width = (image.naturalWidth || 96) * proc.scale;
          proc.height = (image.naturalHeight || 96) * proc.scale;
        },
        { once: true },
      );
    }

    return proc;
  }

  function updateProcess(proc, delta) {
    proc.progress += delta;
    const t = proc.progress;
    const baseY = proc.baseY + proc.scrollSpeed * t * 1.1;
    const lateralLimit = width * 0.2;
    let targetX = proc.baseX;
    let targetY = baseY;

    switch (proc.pathType) {
      case 0: {
        const lateral = Math.sin(t * proc.waveFrequency + proc.waveOffset) * proc.lateralRange;
        const vertical = Math.cos(t * (proc.waveFrequency * 0.6) + proc.waveOffset) * 12;
        targetX = proc.baseX + lateral;
        targetY = baseY + vertical;
        break;
      }
      case 1: {
        const orbitRadius = Math.min(lateralLimit, proc.lateralRange * 0.9 + width * 0.04);
        targetX = width / 2 + Math.sin(t * (proc.waveFrequency + 0.6) + proc.waveOffset) * orbitRadius;
        targetY = baseY + Math.cos(t * (proc.waveFrequency + 0.4) + proc.waveOffset) * 24;
        break;
      }
      default: {
        const compositeRange = Math.min(lateralLimit, proc.lateralRange * 1.15 + width * 0.02);
        const lateral = Math.sin(t * (proc.waveFrequency * 2.1) + proc.waveOffset) * compositeRange;
        const vertical = Math.sin(t * (proc.waveFrequency * 1.6) + proc.waveOffset * 1.3) * 18;
        targetX = proc.baseX + lateral;
        targetY = baseY + vertical;
        break;
      }
    }

    const originX = proc.pathType === 1 ? width / 2 : proc.baseX;
    const clampLeft = originX - lateralLimit;
    const clampRight = originX + lateralLimit;
    let clampedX = Math.max(clampLeft, Math.min(clampRight, targetX));
    const screenLeft = proc.width / 2 + 16;
    const screenRight = width - proc.width / 2 - 16;
    clampedX = Math.max(screenLeft, Math.min(screenRight, clampedX));

    proc.x = clampedX;
    proc.y = targetY;
    proc.rotation = Math.sin(t * 1.6 + proc.waveOffset) * 0.24;
  }

  function isPacketColliding(packet, proc) {
    const halfWidth = proc.width / 2;
    const halfHeight = proc.height / 2;
    return (
      packet.x >= proc.x - halfWidth &&
      packet.x <= proc.x + halfWidth &&
      packet.y <= proc.y + halfHeight &&
      packet.y + packet.height >= proc.y - halfHeight
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
