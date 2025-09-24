const CLICK_THRESHOLD = 10;
const CLICK_WINDOW = 3000; // ms
const OVERLAY_ID = "diagnosticsOverlay";
const OVERLAY_TITLE_ID = "diagnosticsOverlayTitle";

let clickHistory = [];
let overlayElement;
let closeButton;
let canvasElement;
let gameController;
let lastFocusedElement = null;

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
      closeOverlay();
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
  canvas.width = 640;
  canvas.height = 480;
  canvas.className = "diagnostics-overlay__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Visualisierung des Systemmonitors");

  const instructions = document.createElement("p");
  instructions.className = "diagnostics-overlay__instructions";
  instructions.textContent = "Steuerung: ← → bewegen, Leertaste feuert. Enter startet neu.";

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
}

function createDiagnosticsController(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const stars = Array.from({ length: 40 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.5,
    speed: 20 + Math.random() * 30,
  }));

  const player = {
    x: width / 2,
    y: height - 40,
    width: 46,
    height: 18,
    speed: 320,
    cooldown: 0,
  };

  const bullets = [];
  const enemies = [];
  const keys = new Set();

  const enemyGrid = { rows: 4, cols: 8 };
  let enemyDirection = 1;
  let enemySpeed = 60;
  let lastTime = 0;
  let frame;
  let running = false;
  let status = "idle";
  let message = "";
  let messageAlpha = 0;

  const keydownHandler = event => {
    if (!overlayElement?.classList.contains("is-open")) return;
    const key = normalizeKey(event.key);
    if (!key) return;

    if (status !== "playing" && (key === "Enter" || key === "Space")) {
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
    player.x = width / 2;
    player.cooldown = 0;
    bullets.length = 0;
    enemies.length = 0;
    enemyDirection = 1;
    enemySpeed = 60;
    status = "playing";
    message = "";
    messageAlpha = 0;
    keys.clear();

    const offsetX = 70;
    const offsetY = 70;
    const spacingX = 60;
    const spacingY = 40;
    for (let row = 0; row < enemyGrid.rows; row += 1) {
      for (let col = 0; col < enemyGrid.cols; col += 1) {
        enemies.push({
          x: offsetX + col * spacingX,
          y: offsetY + row * spacingY,
          width: 32,
          height: 24,
          alive: true,
        });
      }
    }
  }

  function start() {
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
      if (keys.has("ArrowLeft")) {
        player.x -= player.speed * delta;
      }
      if (keys.has("ArrowRight")) {
        player.x += player.speed * delta;
      }
      player.x = Math.max(player.width / 2 + 10, Math.min(width - player.width / 2 - 10, player.x));

      player.cooldown -= delta;
      if (keys.has("Space") && player.cooldown <= 0) {
        bullets.push({
          x: player.x,
          y: player.y - player.height / 2,
          width: 4,
          height: 12,
          speed: 520,
        });
        player.cooldown = 0.3;
      }

      bullets.forEach(bullet => {
        bullet.y -= bullet.speed * delta;
      });
      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        if (bullets[i].y + bullets[i].height < 0) {
          bullets.splice(i, 1);
        }
      }

      let stepDown = false;
      const aliveEnemies = enemies.filter(enemy => enemy.alive);
      const speedBoost = Math.max(0, (enemyGrid.rows * enemyGrid.cols - aliveEnemies.length) * 2);
      enemySpeed = 60 + speedBoost;

      aliveEnemies.forEach(enemy => {
        enemy.x += enemyDirection * enemySpeed * delta;
        if (enemy.x <= 30 || enemy.x + enemy.width >= width - 30) {
          stepDown = true;
        }
      });

      if (stepDown) {
        enemyDirection *= -1;
        aliveEnemies.forEach(enemy => {
          enemy.y += 24;
        });
      }

      for (let b = bullets.length - 1; b >= 0; b -= 1) {
        const bullet = bullets[b];
        for (let i = 0; i < enemies.length; i += 1) {
          const enemy = enemies[i];
          if (!enemy.alive) continue;
          if (
            bullet.x >= enemy.x &&
            bullet.x <= enemy.x + enemy.width &&
            bullet.y <= enemy.y + enemy.height &&
            bullet.y + bullet.height >= enemy.y
          ) {
            enemy.alive = false;
            bullets.splice(b, 1);
            break;
          }
        }
      }

      if (aliveEnemies.length === 0) {
        status = "won";
        message = "System stabilisiert – Enter für neue Messung";
        messageAlpha = 0;
      }

      aliveEnemies.forEach(enemy => {
        if (enemy.y + enemy.height >= player.y - 10) {
          status = "lost";
          message = "Anomalie erkannt – Enter für neuen Scan";
          messageAlpha = 0;
        }
      });
    }

    if (message) {
      messageAlpha = Math.min(messageAlpha + delta * 0.7, 1);
    } else {
      messageAlpha = 0;
    }

    stars.forEach(star => {
      star.y += star.speed * delta * (status === "playing" ? 1 : 0.5);
      if (star.y > height) {
        star.y = -star.size;
        star.x = Math.random() * width;
        star.speed = 20 + Math.random() * 30;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#02040f");
    gradient.addColorStop(1, "#091834");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

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

    ctx.fillStyle = "#facc15";
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      ctx.beginPath();
      ctx.rect(enemy.x, enemy.y, enemy.width, enemy.height);
      ctx.fill();
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(enemy.x + 6, enemy.y + 6, enemy.width - 12, enemy.height - 12);
      ctx.fillStyle = "#facc15";
    });

    if (status === "won" || status === "lost") {
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup();
}
