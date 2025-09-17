// main.js
import { loadConfig } from "./configLoader.js";
import { buildSidebar } from "./uiBuilder.js";
import { decodeConfig } from "./share.js";
import { updatePreview } from "./preview.js";
import { loadArticles } from "./articleLoader.js";
import { initPreviewZoom } from "./zoom.js";

let configXML;
const images = {};

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
