// zoom.js
let zoomLevel = 1;
let pan = { x: 0, y: 0 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const WHEEL_STEP = 0.1;
const PAN_THRESHOLD = 1;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function initPreviewZoom(previewId = "preview", stageId = "stage") {
  const container = document.getElementById(previewId);
  const stage = document.getElementById(stageId);
  if (!container || !stage) return;

  stage.style.transformOrigin = "0 0";

  const pointerPan = {
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    type: null,
    touchId: null,
  };

  const metrics = {
    containerWidth: 0,
    containerHeight: 0,
    offsetX: 0,
    offsetY: 0,
    stageWidth: stage.offsetWidth,
    stageHeight: stage.offsetHeight,
  };

  let pinchActive = false;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchLastCenter = null;

  const updateMetrics = () => {
    const containerRect = container.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    metrics.containerWidth = containerRect.width;
    metrics.containerHeight = containerRect.height;
    metrics.stageWidth = stage.offsetWidth;
    metrics.stageHeight = stage.offsetHeight;
    metrics.offsetX = stageRect.left - containerRect.left - pan.x;
    metrics.offsetY = stageRect.top - containerRect.top - pan.y;
  };

  const applyTransform = () => {
    stage.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomLevel})`;
  };

  const clampPan = () => {
    const scaledWidth = metrics.stageWidth * zoomLevel;
    const scaledHeight = metrics.stageHeight * zoomLevel;

    let nextX = pan.x;
    if (scaledWidth <= metrics.containerWidth) {
      const desiredLeft = (metrics.containerWidth - scaledWidth) / 2 - metrics.offsetX;
      if (nextX !== desiredLeft) {
        nextX = desiredLeft;
      }
    } else {
      const minX = metrics.containerWidth - scaledWidth - metrics.offsetX;
      const maxX = -metrics.offsetX;
      nextX = clamp(nextX, minX, maxX);
    }

    let nextY = pan.y;
    if (scaledHeight <= metrics.containerHeight) {
      const desiredTop = -metrics.offsetY;
      if (nextY !== desiredTop) {
        nextY = desiredTop;
      }
    } else {
      const minY = metrics.containerHeight - scaledHeight - metrics.offsetY;
      const maxY = -metrics.offsetY;
      nextY = clamp(nextY, minY, maxY);
    }

    const changed = nextX !== pan.x || nextY !== pan.y;
    if (changed) {
      pan.x = nextX;
      pan.y = nextY;
    }
    return changed;
  };

  const refreshTransform = () => {
    applyTransform();
    updateMetrics();
    if (clampPan()) {
      applyTransform();
      updateMetrics();
    }

    const canPan = zoomLevel > PAN_THRESHOLD;
    container.classList.toggle("is-grabbable", canPan);
    if ((!pointerPan.active && !pinchActive) || !canPan) {
      container.classList.remove("is-grabbing");
    }
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

  const getStagePoint = (clientX, clientY) => {
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoomLevel,
      y: (clientY - rect.top) / zoomLevel,
    };
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
    refreshTransform();
  };

  const endPan = () => {
    if (!pointerPan.active) return;
    pointerPan.active = false;
    pointerPan.type = null;
    pointerPan.touchId = null;
    container.classList.remove("is-grabbing");
    refreshTransform();
  };

  const adjustZoomAtPoint = (targetZoom, clientX, clientY) => {
    const clamped = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
    const prevZoom = zoomLevel;
    if (clamped === prevZoom) {
      refreshTransform();
      return;
    }

    const stagePoint = getStagePoint(clientX, clientY);
    zoomLevel = clamped;
    pan.x += stagePoint.x * (prevZoom - zoomLevel);
    pan.y += stagePoint.y * (prevZoom - zoomLevel);
    refreshTransform();
  };

  const findTouchById = (touchList, id) => {
    for (let i = 0; i < touchList.length; i += 1) {
      if (touchList[i].identifier === id) return touchList[i];
    }
    return null;
  };

  const finishPinch = () => {
    pinchActive = false;
    pinchStartDist = 0;
    pinchLastCenter = null;
    zoomLevel = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);
    refreshTransform();
  };

  container.addEventListener(
    "wheel",
    (e) => {
      if (!isPointOverStage(e.clientX, e.clientY)) return;
      e.preventDefault();
      const direction = Math.sign(e.deltaY);
      const step = WHEEL_STEP * (e.ctrlKey ? 2 : 1);
      const nextZoom = zoomLevel + (direction > 0 ? -step : step);
      adjustZoomAtPoint(nextZoom, e.clientX, e.clientY);
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
    pinchActive = false;
    pinchStartDist = 0;
    pinchLastCenter = null;
    container.classList.remove("is-grabbing");
    refreshTransform();
  });

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
        const [t1, t2] = [e.touches[0], e.touches[1]];
        if (
          !isPointOverStage(t1.clientX, t1.clientY) &&
          !isPointOverStage(t2.clientX, t2.clientY)
        ) {
          return;
        }

        const center = getTouchCenter(t1, t2);

        if (pointerPan.active && pointerPan.type === "touch") {
          endPan();
        }

        pinchActive = true;
        pinchStartDist = getTouchDistance(t1, t2);
        pinchStartZoom = zoomLevel;
        pinchLastCenter = center;
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
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const center = getTouchCenter(t1, t2);
        const stagePoint = getStagePoint(center.x, center.y);

        if (pinchLastCenter) {
          pan.x += center.x - pinchLastCenter.x;
          pan.y += center.y - pinchLastCenter.y;
        }
        pinchLastCenter = center;

        if (pinchStartDist > 0) {
          const ratio = getTouchDistance(t1, t2) / pinchStartDist;
          const nextZoom = pinchStartZoom * ratio;
          const prevZoom = zoomLevel;
          zoomLevel = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
          pan.x += stagePoint.x * (prevZoom - zoomLevel);
          pan.y += stagePoint.y * (prevZoom - zoomLevel);
        }
        refreshTransform();
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

  container.addEventListener("touchend", (e) => {
    if (pinchActive && e.touches.length < 2) {
      finishPinch();
      if (e.touches.length === 1 && zoomLevel > PAN_THRESHOLD) {
        const remaining = e.touches[0];
        if (isPointOverStage(remaining.clientX, remaining.clientY)) {
          beginPan("touch", remaining.clientX, remaining.clientY, remaining.identifier);
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

  window.addEventListener("resize", () => {
    refreshTransform();
  });

  refreshTransform();
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
