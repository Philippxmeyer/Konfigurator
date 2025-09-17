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

export function placeImage(img, src, cfg) {
  if (!cfg) {
    img.style.display = "none";
    return;
  }
  fadeIn(img, src);
  img.style.left = cfg.x + "px";
  img.style.top = cfg.y + "px";
  img.style.transform = `scale(${cfg.scaleX}, ${cfg.scaleY})`;
  img.style.transformOrigin = "top left";
  img.style.display = "block";
}

export function parseOffset(configXML, selector) {
  const node = configXML.querySelector(selector);
  if (!node) return null;
  return {
    x: +node.getAttribute("x"),
    y: +node.getAttribute("y"),
    scaleX: +node.getAttribute("scaleX"),
    scaleY: +node.getAttribute("scaleY")
  };
}
