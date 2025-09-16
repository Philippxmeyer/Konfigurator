// zoom.js
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const WHEEL_STEP = 0.1;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function clientToStagePercent(stage, clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * 100;
  const y = ((clientY - r.top) / r.height) * 100;
  return { xPct: x, yPct: y };
}

export function initPreviewZoom(previewId = "preview", stageId = "stage") {
  const container = document.getElementById(previewId);
  const stage = document.getElementById(stageId);
  if (!container || !stage) return;

  const stageBaseWidth = stage.offsetWidth || 1;
  const stageBaseHeight = stage.offsetHeight || 1;
  let zoomLevel = 1;
  let baseScale = 1;

  const applyTransform = (originPct = null) => {
    if (originPct) {
      stage.style.transformOrigin = `${originPct.xPct}% ${originPct.yPct}%`;
    }
    const scale = baseScale * zoomLevel;
    stage.style.transform = `scale(${scale})`;
  };

  const updateBaseScale = () => {
    const availableWidth = container.clientWidth;
    const availableHeight = container.clientHeight;
    if (!availableWidth) return;

    const widthScale = availableWidth / stageBaseWidth;
    const heightScale = availableHeight ? availableHeight / stageBaseHeight : widthScale;
    const newBase = Math.min(1, widthScale, heightScale);

    baseScale = newBase > 0 ? newBase : 1;
    zoomLevel = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);

    applyTransform({ xPct: 50, yPct: 50 });
  };

  // --- Wheel: Zoom um Mauszeiger ---
  container.addEventListener(
    "wheel",
    (e) => {
      // nur reagieren, wenn Cursor wirklich über der Stage ist
      const path = e.composedPath ? e.composedPath() : [];
      const onStage = path.includes(stage) || stage.contains(e.target);
      if (!onStage) return;

      e.preventDefault();
      const originPct = clientToStagePercent(stage, e.clientX, e.clientY);

      const dir = Math.sign(e.deltaY); // +1 = runter
      const step = WHEEL_STEP * (e.ctrlKey ? 2 : 1);
      zoomLevel += dir > 0 ? -step : step;
      zoomLevel = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);

      applyTransform(originPct);
    },
    { passive: false }
  );

  // Doppelklick / -tipp = Reset
  container.addEventListener("dblclick", () => {
    zoomLevel = 1;
    applyTransform({ xPct: 50, yPct: 50 });
  });

  // --- Touch: Pinch-to-Zoom ---
  let pinchActive = false;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  const getTouchDistance = (t1, t2) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const getTouchCenter = (t1, t2) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  container.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        const path = e.composedPath ? e.composedPath() : [];
        const onStage = path.includes(stage) || stage.contains(e.target);
        if (!onStage) return;

        pinchActive = true;
        pinchStartDist = getTouchDistance(e.touches[0], e.touches[1]);
        pinchStartZoom = zoomLevel;

        const center = getTouchCenter(e.touches[0], e.touches[1]);
        const originPct = clientToStagePercent(stage, center.x, center.y);
        applyTransform(originPct);

        e.preventDefault();
      }
    },
    { passive: false }
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (pinchActive && e.touches.length === 2) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        if (pinchStartDist > 0) {
          const ratio = dist / pinchStartDist;
          zoomLevel = clamp(pinchStartZoom * ratio, MIN_ZOOM, MAX_ZOOM);

          const center = getTouchCenter(e.touches[0], e.touches[1]);
          const originPct = clientToStagePercent(stage, center.x, center.y);
          applyTransform(originPct);
        }
        e.preventDefault();
      }
    },
    { passive: false }
  );

  container.addEventListener("touchend", () => {
    if (pinchActive) {
      zoomLevel = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);
      applyTransform();
      // optional haptisches Feedback (falls vorhanden)
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        // navigator.vibrate(5);
      }
    }
    pinchActive = false;
  });

  window.addEventListener("resize", updateBaseScale);

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(updateBaseScale);
    observer.observe(container);
  }

  updateBaseScale();
}
