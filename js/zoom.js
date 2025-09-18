// zoom.js
let zoomLevel = 1;
let pan = { x: 0, y: 0 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const WHEEL_STEP = 0.1;
const PAN_THRESHOLD = 1.01;

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

  const clampPan = () => {
    const containerRect = container.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    let changed = false;
    let nextX = pan.x;
    let nextY = pan.y;

    if (stageRect.width <= containerRect.width) {
      if (nextX !== 0) {
        nextX = 0;
        changed = true;
      }
    } else {
      if (stageRect.left > containerRect.left) {
        nextX -= stageRect.left - containerRect.left;
        changed = true;
      }
      if (stageRect.right < containerRect.right) {
        nextX += containerRect.right - stageRect.right;
        changed = true;
      }
    }

    if (stageRect.height <= containerRect.height) {
      if (nextY !== 0) {
        nextY = 0;
        changed = true;
      }
    } else {
      if (stageRect.top > containerRect.top) {
        nextY -= stageRect.top - containerRect.top;
        changed = true;
      }
      if (stageRect.bottom < containerRect.bottom) {
        nextY += containerRect.bottom - stageRect.bottom;
        changed = true;
      }
    }

    if (changed) {
      pan.x = nextX;
      pan.y = nextY;
    }
    return changed;
  };

  const updateTransform = (originPct = null) => {
    applyTransform(stage, zoomLevel, originPct);
    //if (clampPan()) {
    //  applyTransform(stage, zoomLevel);
    //}
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
    pointerPan.active = false;
    pointerPan.type = null;
    pointerPan.touchId = null;
    container.classList.remove("is-grabbing");
    updateTransform();
  };

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

  container.addEventListener("dblclick", () => {
    zoomLevel = 1;
    pan.x = 0;
    pan.y = 0;
    pointerPan.active = false;
    pointerPan.type = null;
    pointerPan.touchId = null;
    container.classList.remove("is-grabbing");
    updateTransform({ xPct: 50, yPct: 50 });
  });

  let pinchActive = false;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

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

  updateTransform({ xPct: 50, yPct: 50 });
}
