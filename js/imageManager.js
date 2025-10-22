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
  img.style.removeProperty("transform");
  img.style.setProperty("--offset-x", `${cfg.x}px`);
  img.style.setProperty("--offset-y", `${cfg.y}px`);
  img.style.setProperty("--scale-x", cfg.scaleX);
  img.style.setProperty("--scale-y", cfg.scaleY);
  img.style.setProperty("--flip-x", "1");
  img.style.setProperty("--flip-y", "1");
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
