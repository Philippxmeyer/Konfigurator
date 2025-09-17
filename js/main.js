// main.js
import { loadConfig } from "./configLoader.js";
import { buildSidebar } from "./uiBuilder.js";
import { decodeConfig } from "./share.js";
import { updatePreview } from "./preview.js";
import { loadArticles } from "./articleLoader.js";
import { initPreviewZoom } from "./zoom.js";

let configXML;
const images = {};
function setupOverlay(triggerId, overlayId) {
  const overlay = document.getElementById(overlayId);
  const trigger = document.getElementById(triggerId);
  if (!overlay || !trigger) return;

  const closeButton = overlay.querySelector("[data-overlay-close]");
  let lastFocusedElement = null;

  const openOverlay = () => {
    if (overlay.classList.contains("is-open")) return;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("overlay-open");
    trigger.setAttribute("aria-expanded", "true");
    if (closeButton instanceof HTMLElement) {
      closeButton.focus();
    }
  };

  const closeOverlay = () => {
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".article-overlay.is-open")) {
      document.body.classList.remove("overlay-open");
    }
    trigger.setAttribute("aria-expanded", "false");
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    } else {
      trigger.focus();
    }
    lastFocusedElement = null;
  };

  trigger.addEventListener("click", openOverlay);

  if (closeButton instanceof HTMLElement) {
    closeButton.addEventListener("click", closeOverlay);
  }

  overlay.addEventListener("click", (event) => {
    const target = event.target;
    if (target === overlay) {
      closeOverlay();
    }
    if (target instanceof HTMLElement && target.dataset.overlayClose !== undefined) {
      closeOverlay();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) {
      event.preventDefault();
      closeOverlay();
    }
  });
}

/**
 * Liest ?config=… aus der URL, decodiert die Werte und schreibt sie in die Selects.
 * Fehlende Felder werden ignoriert.
 */
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("config")) return;

  const values = decodeConfig(params.get("config"));
  if (!values) return;

  Object.entries(values).forEach(([id, val]) => {
    const sel = document.getElementById(id);
    if (sel) sel.value = val;
  });
}

async function init() {
  setupOverlay("articleListTrigger", "articleOverlay");
  setupOverlay("helpOverlayTrigger", "helpOverlay");

  // 1) Konfiguration & Artikelliste laden
  configXML = await loadConfig();
  await loadArticles();

  // 2) Sidebar bauen (setzt Defaults aus config.xml)
  const sidebarEl = document.getElementById("sidebar");
  buildSidebar(configXML, sidebarEl, () => updatePreview(configXML, images));

  // 3) Layer-Images vorbereiten – in #stage einhängen (Fallback: #preview)
  const stage = document.getElementById("stage") || document.getElementById("preview");
  configXML.querySelectorAll("layers > layer").forEach(layerNode => {
    const id = layerNode.getAttribute("id");
    const img = document.createElement("img");
    stage.appendChild(img);
    images[id] = img;
  });

  // 4) Zoom nur für den Preview-Bereich aktivieren (wenn #stage vorhanden)
  if (document.getElementById("stage")) {
    initPreviewZoom("preview", "stage");
  }

  // 5) Optional: Werte aus URL überschreiben
  loadFromURL();

  // 6) Erste Darstellung
  updatePreview(configXML, images);
}

init();
