// zoom.js
let zoomLevel = 1;
let pan = { x: 0, y: 0 };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const WHEEL_STEP = 0.1;

// Ab diesem Zoom darf gepannt werden (0 = immer)
const PAN_THRESHOLD = 0;

const DEFAULT_TRANSFORM_ORIGIN = { xPct: 50, yPct: 50 };

const DEFAULT_VIEW_CONFIG = {
  zoom: 1,
  panXFactor: 0.3,
  panY: 100,
};

const COMPACT_VIEW_CONFIG = {
  zoom: 0.6,
  panXFactor: 0,
  panY: 90,
};

const VIEW_PRESETS = {
  default: {
    initial: { ...DEFAULT_VIEW_CONFIG },
    reset: { ...DEFAULT_VIEW_CONFIG },
  },
  compact: {
    initial: { ...COMPACT_VIEW_CONFIG },
    reset: { ...COMPACT_VIEW_CONFIG },
  },
};

const RESPONSIVE_BREAKPOINT = "(max-width: 1024px)";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function applyTransform(stage, zoom, originPct = null) {
  if (originPct) {
    stage.style.transformOrigin = `${originPct.xPct}% ${originPct.yPct}%`;
  }
  stage.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
}

function clientToStagePercent(stage, clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * 100;
  const y = ((clientY - r.top) / r.height) * 100;
  return { xPct: x, yPct: y };
}

function getTouchDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
}

function getTouchCenter(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export function initPreviewZoom(previewId = "preview", stageId = "stage") {
  const container = document.getElementById(previewId);
  const stage = document.getElementById(stageId);
  if (!container || !stage) return;

  const pointerPan = {
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    type: null,
    touchId: null,
  };

  const responsiveMediaQuery =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(RESPONSIVE_BREAKPOINT)
      : null;

  const getPresetKey = () =>
    responsiveMediaQuery && responsiveMediaQuery.matches ? "compact" : "default";

  let activePresetKey = getPresetKey();

  const fallbackView = VIEW_PRESETS.default.initial;

  const getActivePreset = () =>
    VIEW_PRESETS[activePresetKey] ?? VIEW_PRESETS.default;

  const resetPointerState = () => {
    pointerPan.active = false;
    pointerPan.type = null;
    pointerPan.touchId = null;
    container.classList.remove("is-grabbing");
  };

  const isPointOverStage = (clientX, clientY) => {
    const rect = stage.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  const findTouchById = (touchList, id) => {
    for (let i = 0; i < touchList.length; i += 1) {
      const touch = touchList[i];
      if (touch.identifier === id) return touch;
    }
    return null;
  };

  const updateTransform = (originPct = null) => {
    applyTransform(stage, zoomLevel, originPct);
    const canPan = zoomLevel > PAN_THRESHOLD;
    container.classList.toggle("is-grabbable", canPan);
    if (!pointerPan.active && !canPan) {
      container.classList.remove("is-grabbing");
    }
  };

  const beginPan = (type, x, y, touchId = null) => {
    pointerPan.active = true;
    pointerPan.type = type;
    pointerPan.touchId = touchId;
    pointerPan.startX = x;
    pointerPan.startY = y;
    pointerPan.baseX = pan.x;
    pointerPan.baseY = pan.y;
    container.classList.add("is-grabbing");
  };

  const updatePan = (x, y) => {
    if (!pointerPan.active) return;
    pan.x = pointerPan.baseX + (x - pointerPan.startX);
    pan.y = pointerPan.baseY + (y - pointerPan.startY);
    updateTransform();
  };

  const endPan = () => {
    if (!pointerPan.active) return;
    resetPointerState();
    updateTransform();
  };

  const applyViewFromPreset = (viewConfig, origin = DEFAULT_TRANSFORM_ORIGIN) => {
    const view = viewConfig ?? fallbackView;
    const stageWidth = stage.offsetWidth;
    const zoomValue =
      typeof view.zoom === "number" ? view.zoom : fallbackView.zoom;
    const panXFactor =
      typeof view.panXFactor === "number"
        ? view.panXFactor
        : fallbackView.panXFactor;
    const panX =
      typeof view.panX === "number"
        ? view.panX
        : stageWidth * panXFactor;
    const panYValue =
      typeof view.panY === "number" ? view.panY : fallbackView.panY;

    zoomLevel = clamp(zoomValue, MIN_ZOOM, MAX_ZOOM);
    pan.x = panX;
    pan.y = panYValue;

    resetPointerState();
    updateTransform(origin);
  };

  const applyInitialView = (origin = DEFAULT_TRANSFORM_ORIGIN) => {
    const preset = getActivePreset();
    applyViewFromPreset(preset.initial, origin);
  };

  const applyResetView = (origin = DEFAULT_TRANSFORM_ORIGIN) => {
    const preset = getActivePreset();
    applyViewFromPreset(preset.reset, origin);
  };

  const syncPresetFromBreakpoint = () => {
    const nextKey = getPresetKey();
    if (nextKey !== activePresetKey) {
      activePresetKey = nextKey;
      applyInitialView();
    }
  };

  if (responsiveMediaQuery) {
    if (typeof responsiveMediaQuery.addEventListener === "function") {
      responsiveMediaQuery.addEventListener("change", syncPresetFromBreakpoint);
    } else if (typeof responsiveMediaQuery.addListener === "function") {
      responsiveMediaQuery.addListener(syncPresetFromBreakpoint);
    }
  }

  // --- Initiales Ansichtspreset anwenden ---
  requestAnimationFrame(() => {
    activePresetKey = getPresetKey();
    applyInitialView();
  });

  // --- Mauswheel Zoom ---
  container.addEventListener(
    "wheel",
    (e) => {
      if (!isPointOverStage(e.clientX, e.clientY)) return;

      e.preventDefault();
      const originPct = clientToStagePercent(stage, e.clientX, e.clientY);

      const dir = Math.sign(e.deltaY);
      const step = WHEEL_STEP * (e.ctrlKey ? 2 : 1);
      zoomLevel += dir > 0 ? -step : step;
      zoomLevel = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);

      updateTransform(originPct);
    },
    { passive: false }
  );

  // --- Doppelklick: Ansicht zurücksetzen ---
  container.addEventListener("dblclick", () => {
    applyResetView();
  });

  // --- Maus-Panning ---
  container.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (zoomLevel <= PAN_THRESHOLD) return;
    if (!isPointOverStage(e.clientX, e.clientY)) return;

    e.preventDefault();
    beginPan("mouse", e.clientX, e.clientY);
  });

  window.addEventListener("mousemove", (e) => {
    if (pointerPan.active && pointerPan.type === "mouse") {
      e.preventDefault();
      updatePan(e.clientX, e.clientY);
    }
  });

  window.addEventListener("mouseup", () => {
    if (pointerPan.active && pointerPan.type === "mouse") {
      endPan();
    }
  });

  // --- Touch: Pinch & Pan ---
  let pinchActive = false;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  container.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        if (
          !isPointOverStage(t1.clientX, t1.clientY) ||
          !isPointOverStage(t2.clientX, t2.clientY)
        ) {
          return;
        }

        if (pointerPan.active && pointerPan.type === "touch") {
          endPan();
        }

        pinchActive = true;
        pinchStartDist = getTouchDistance(t1, t2);
        pinchStartZoom = zoomLevel;

        const center = getTouchCenter(t1, t2);
        const originPct = clientToStagePercent(stage, center.x, center.y);
        updateTransform(originPct);
        e.preventDefault();
        return;
      }

      if (pinchActive) return;

      if (e.touches.length === 1 && zoomLevel > PAN_THRESHOLD) {
        const touch = e.touches[0];
        if (!isPointOverStage(touch.clientX, touch.clientY)) return;

        beginPan("touch", touch.clientX, touch.clientY, touch.identifier);
        e.preventDefault();
      }
    },
    { passive: false }
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (pinchActive && e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = getTouchDistance(t1, t2);
        if (pinchStartDist > 0) {
          const ratio = dist / pinchStartDist;
          zoomLevel = clamp(pinchStartZoom * ratio, MIN_ZOOM, MAX_ZOOM);

          const center = getTouchCenter(t1, t2);
          const originPct = clientToStagePercent(stage, center.x, center.y);
          updateTransform(originPct);
        }
        e.preventDefault();
        return;
      }

      if (!pinchActive && pointerPan.active && pointerPan.type === "touch") {
        const touch = findTouchById(e.touches, pointerPan.touchId);
        if (!touch) return;

        updatePan(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    },
    { passive: false }
  );

  const finishPinch = () => {
    pinchActive = false;
    zoomLevel = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);
    updateTransform();
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      // navigator.vibrate(5);
    }
  };

  container.addEventListener("touchend", (e) => {
    if (pinchActive && e.touches.length < 2) {
      finishPinch();
      if (e.touches.length === 1 && zoomLevel > PAN_THRESHOLD) {
        const remaining = e.touches[0];
        if (isPointOverStage(remaining.clientX, remaining.clientY)) {
          beginPan(
            "touch",
            remaining.clientX,
            remaining.clientY,
            remaining.identifier
          );
        }
      }
    }

    if (!pinchActive && pointerPan.active && pointerPan.type === "touch") {
      const stillActive = findTouchById(e.touches, pointerPan.touchId);
      if (!stillActive) {
        endPan();
      }
    }
  });

  container.addEventListener("touchcancel", () => {
    if (pinchActive) {
      finishPinch();
    }
    if (pointerPan.active && pointerPan.type === "touch") {
      endPan();
    }
  });

  // Initiale Ausrichtung (Transform-Origin zentriert)
  updateTransform(DEFAULT_TRANSFORM_ORIGIN);
}
