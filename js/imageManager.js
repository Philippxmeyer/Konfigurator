export function fadeIn(img, src) {
  if (img.src.endsWith(src)) return;
  const oldImg = img.cloneNode();
  oldImg.src = img.src;
  oldImg.style.position = "absolute";
  oldImg.style.left = img.style.left;
  oldImg.style.top = img.style.top;
  oldImg.style.transform = img.style.transform;
  oldImg.style.transformOrigin = img.style.transformOrigin;
  oldImg.classList.add("show");
  img.parentElement.appendChild(oldImg);

  img.classList.remove("show");
  img.src = src;
  img.onload = () => {
    img.classList.add("show");
    oldImg.classList.remove("show");
    setTimeout(() => oldImg.remove(), 400);
  };
}

export function placeImage(img, src, cfg, stageScale = 1) {
  if (!cfg) {
    img.style.display = "none";
    return;
  }

  const effectiveScale = Number.isFinite(stageScale) && stageScale > 0 ? stageScale : 1;
  const scaledX = (cfg.x ?? 0) * effectiveScale;
  const scaledY = (cfg.y ?? 0) * effectiveScale;
  const scaledScaleX = (cfg.scaleX ?? 1) * effectiveScale;
  const scaledScaleY = (cfg.scaleY ?? 1) * effectiveScale;

  fadeIn(img, src);
  img.style.left = `${scaledX}px`;
  img.style.top = `${scaledY}px`;
  img.style.transform = `scale(${scaledScaleX}, ${scaledScaleY})`;
  img.style.transformOrigin = "top left";
  img.style.display = "block";
}
