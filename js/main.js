// main.js
import { loadConfig } from "./configLoader.js";
import { buildSidebar } from "./uiBuilder.js";
import { decodeConfig } from "./share.js";
import { updatePreview } from "./preview.js";
import { loadArticles } from "./articleLoader.js";
import { initPreviewZoom } from "./zoom.js";
import { formatCurrency } from "./articles.js";
import "./systemMonitor.js";

let configXML;
const images = {};
let lastKnownValues = {};
const sectionHighlightTimeouts = new WeakMap();
let lastArticleResult = null;

const MIN_TABLE_QUANTITY = 1;
const MAX_TABLE_QUANTITY = 99;
let tableQuantity = 1;

let quantityRoot;
let quantityCountEl;
let quantityTotalEl;
let quantityDecrementBtn;
let quantityIncrementBtn;

function getSidebarSelects() {
  return document.querySelectorAll(".sidebar select");
}

function collectSidebarValues() {
  const values = {};
  getSidebarSelects().forEach(sel => {
    values[sel.id] = sel.value;
  });
  return values;
}

function clampTableQuantity(value) {
  const numeric = Number.isFinite(value) ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(numeric)) return MIN_TABLE_QUANTITY;
  return Math.min(MAX_TABLE_QUANTITY, Math.max(MIN_TABLE_QUANTITY, numeric));
}

function updateQuantityButtons() {
  if (!quantityDecrementBtn || !quantityIncrementBtn) return;
  quantityDecrementBtn.disabled = tableQuantity <= MIN_TABLE_QUANTITY;
  quantityIncrementBtn.disabled = tableQuantity >= MAX_TABLE_QUANTITY;
}

function updateQuantitySummary(articleResult) {
  if (!quantityCountEl || !quantityTotalEl) return;

  quantityCountEl.textContent = String(tableQuantity);

  const hasItems = Boolean(articleResult?.hasItems);
  if (!hasItems) {
    quantityTotalEl.textContent = "Gesamt: –";
    quantityTotalEl.classList.remove("article-overlay__quantity-total--missing");
    return;
  }

  if (articleResult?.hasMissingPrice) {
    quantityTotalEl.textContent = "Gesamt: Preis auf Anfrage";
    quantityTotalEl.classList.add("article-overlay__quantity-total--missing");
    return;
  }

  const total = articleResult?.aggregatedTotal;
  if (typeof total === "number") {
    quantityTotalEl.textContent = `Gesamt: ${formatCurrency(total)}`;
    quantityTotalEl.classList.remove("article-overlay__quantity-total--missing");
  } else if (articleResult?.priceSummary && typeof articleResult.priceSummary.total === "number") {
    const aggregated = articleResult.priceSummary.total * tableQuantity;
    quantityTotalEl.textContent = `Gesamt: ${formatCurrency(aggregated)}`;
    quantityTotalEl.classList.remove("article-overlay__quantity-total--missing");
  } else {
    quantityTotalEl.textContent = "Gesamt: –";
    quantityTotalEl.classList.remove("article-overlay__quantity-total--missing");
  }
}

function refreshPreview() {
  if (!configXML) return null;
  const result = updatePreview(configXML, images, { tableQuantity });
  lastArticleResult = result?.articleResult ?? null;
  updateQuantitySummary(lastArticleResult);
  return result;
}

function setTableQuantity(newQuantity, { triggerPreview = true } = {}) {
  const clamped = clampTableQuantity(newQuantity);
  if (clamped === tableQuantity) {
    updateQuantityButtons();
    updateQuantitySummary(lastArticleResult);
    return;
  }
  tableQuantity = clamped;
  updateQuantityButtons();
  updateQuantitySummary(lastArticleResult);
  if (triggerPreview) {
    refreshPreview();
  }
}

function handleQuantityStep(delta) {
  setTableQuantity(tableQuantity + delta);
}

function setupQuantityControl() {
  quantityRoot = document.getElementById("articleOverlayQuantity");
  if (!quantityRoot) return;

  quantityRoot.innerHTML = `
    <span class="article-overlay__quantity-label" id="articleOverlayQuantityLabel">Menge</span>
    <div class="article-overlay__quantity-controls" role="group" aria-labelledby="articleOverlayQuantityLabel">
      <button type="button" class="article-overlay__quantity-step article-overlay__quantity-step--decrement" aria-label="Menge verringern">
        <span aria-hidden="true">−</span>
      </button>
      <div class="article-overlay__quantity-value" role="status" aria-live="polite">
        <span class="article-overlay__quantity-count">1</span>
        <span class="article-overlay__quantity-total">Gesamt: –</span>
      </div>
      <button type="button" class="article-overlay__quantity-step article-overlay__quantity-step--increment" aria-label="Menge erhöhen">
        <span aria-hidden="true">+</span>
      </button>
    </div>
  `;

  quantityCountEl = quantityRoot.querySelector(".article-overlay__quantity-count");
  quantityTotalEl = quantityRoot.querySelector(".article-overlay__quantity-total");
  quantityDecrementBtn = quantityRoot.querySelector(".article-overlay__quantity-step--decrement");
  quantityIncrementBtn = quantityRoot.querySelector(".article-overlay__quantity-step--increment");

  quantityDecrementBtn?.addEventListener("click", () => handleQuantityStep(-1));
  quantityIncrementBtn?.addEventListener("click", () => handleQuantityStep(1));

  quantityRoot.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      handleQuantityStep(-1);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      handleQuantityStep(1);
    }
  });

  updateQuantityButtons();
  updateQuantitySummary(lastArticleResult);
}

function ensureSectionIsVisible(section) {
  if (!section) return;
  const group = section.closest(".group");
  if (group) {
    const container = group.parentElement;
    if (container) {
      container.querySelectorAll(".group").forEach(otherGroup => {
        if (otherGroup !== group) {
          otherGroup.classList.add("collapsed");
        }
      });
    }
    group.classList.remove("collapsed");
  }
  section.classList.remove("collapsed");
}

function highlightSection(sectionId) {
  if (!sectionId) return;
  const section = document.querySelector(`.section[data-section-id="${sectionId}"]`);
  if (!section) return;

  ensureSectionIsVisible(section);

  if (sectionHighlightTimeouts.has(section)) {
    clearTimeout(sectionHighlightTimeouts.get(section));
  }

  section.classList.remove("section--highlight");
  // Force reflow so that re-adding the class restarts the animation.
  void section.offsetWidth;
  section.classList.add("section--highlight");

  const timeoutId = window.setTimeout(() => {
    section.classList.remove("section--highlight");
    sectionHighlightTimeouts.delete(section);
  }, 1200);

  sectionHighlightTimeouts.set(section, timeoutId);
}

function getSectionIdForLayer(layerId) {
  if (!layerId) return null;
  if (layerId === "grundtisch") return "grundtisch";
  if (layerId.startsWith("seiten")) return "seitenblenden";
  if (layerId === "saeulen") return "aufbau";
  if (layerId.startsWith("platte")) return "platten";
  if (layerId.startsWith("boden")) return "boeden";
  if (layerId.startsWith("laufschiene")) return "laufschienen";
  if (layerId.startsWith("container")) return "container";
  if (layerId === "ablagebord") return "ablagebord";
  return null;
}

function resolveHighlightTarget(event) {
  if (!(event instanceof Event)) return null;

  const directTarget = event.target instanceof HTMLElement
    ? event.target.closest("[data-highlight-section]")
    : null;
  if (directTarget) {
    return directTarget;
  }

  const hasCoordinates = "clientX" in event && typeof event.clientX === "number"
    && "clientY" in event && typeof event.clientY === "number";
  if (!hasCoordinates) {
    return null;
  }

  const inputLayer = document.getElementById("inputLayer");
  if (!inputLayer) {
    return null;
  }

  const previousPointerEvents = inputLayer.style.pointerEvents;
  inputLayer.style.pointerEvents = "none";
  const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
  inputLayer.style.pointerEvents = previousPointerEvents;
  if (elementBelow instanceof HTMLElement) {
    return elementBelow.closest("[data-highlight-section]");
  }

  return null;
}

function handleHighlightTrigger(event) {
  if (event.type === "pointerup" && typeof PointerEvent !== "undefined"
    && event instanceof PointerEvent && event.pointerType === "mouse") {
    return;
  }

  const highlightTarget = resolveHighlightTarget(event);
  if (!highlightTarget) return;

  const sectionId = highlightTarget.dataset.highlightSection;
  if (sectionId) {
    highlightSection(sectionId);
  }
}

function updatePreviousValueDatasets() {
  getSidebarSelects().forEach(sel => {
    sel.dataset.previousValue = sel.value;
  });
}

function getOptionText(select, value) {
  if (!select) return value;
  const option = Array.from(select.options).find(opt => opt.value === value);
  return option ? option.textContent.trim() : value;
}

function formatAdjustmentMessage(select, oldLabel, newLabel) {
  const sectionTitle = select?.dataset.sectionTitle?.trim();
  const fieldLabel = select?.dataset.label?.trim();
  const baseName = sectionTitle || fieldLabel || select?.id || "";

  const normalizedNew = (newLabel || "").toLowerCase();
  const removalKeywords = ["ohne", "keine", "kein", "keiner"];
  if (removalKeywords.some(keyword => normalizedNew === keyword || normalizedNew.startsWith(`${keyword} `))) {
    return `- ${baseName} wird entfernt`;
  }

  const numberPattern = /(-?\d+(?:[\.,]\d+)?)/;
  const oldMatch = oldLabel?.match(numberPattern);
  const newMatch = newLabel?.match(numberPattern);
  if (oldMatch && newMatch) {
    const oldNumber = Number(oldMatch[1].replace(",", "."));
    const newNumber = Number(newMatch[1].replace(",", "."));
    if (!Number.isNaN(oldNumber) && !Number.isNaN(newNumber)) {
      if (newNumber < oldNumber) {
        return `- ${baseName} wird auf ${newLabel} reduziert`;
      }
      if (newNumber > oldNumber) {
        return `- ${baseName} wird auf ${newLabel} erhöht`;
      }
    }
  }

  if (baseName) {
    return `- ${baseName} wird auf ${newLabel} geändert`;
  }

  return `- ${oldLabel} → ${newLabel}`;
}

function applySidebarValues(values) {
  Object.entries(values).forEach(([id, value]) => {
    const select = document.getElementById(id);
    if (select) {
      select.value = value;
    }
  });
}

function handleSidebarChange({ id, previousValue }) {
  if (!configXML) return;

  const beforeValues = { ...lastKnownValues };
  refreshPreview();

  const newValues = collectSidebarValues();

  const hadValuesBefore = Object.keys(beforeValues).length > 0;
  if (hadValuesBefore) {
    const adjustments = Object.keys(newValues)
      .filter(key => key !== id && beforeValues[key] !== undefined && beforeValues[key] !== newValues[key])
      .map(key => ({
        id: key,
        oldValue: beforeValues[key],
        newValue: newValues[key]
      }));

    if (adjustments.length > 0) {
      const adjustmentText = adjustments.map(({ id: fieldId, oldValue, newValue }) => {
        const select = document.getElementById(fieldId);
        const oldLabel = getOptionText(select, oldValue);
        const newLabel = getOptionText(select, newValue);
        return formatAdjustmentMessage(select, oldLabel, newLabel);
      }).join("\n");

      const message = `Warnung: Die aktuelle Änderung führt zu einer ungültigen Konfiguration.\n` +
        `Daher würden folgende Werte angepasst:\n\n${adjustmentText}\n\n` +
        "Möchten Sie die Änderung trotzdem übernehmen?";

      if (!window.confirm(message)) {
        applySidebarValues(beforeValues);
        const select = document.getElementById(id);
        if (select) {
          select.value = previousValue;
        }
        refreshPreview();
        lastKnownValues = collectSidebarValues();
        updatePreviousValueDatasets();
        return;
      }
    }
  }

  lastKnownValues = newValues;
  updatePreviousValueDatasets();
}

[
  "click",
  "pointerup"
].forEach(eventName => {
  document.addEventListener(eventName, handleHighlightTrigger);
});
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

  let quantityFromConfig = null;
  Object.entries(values).forEach(([id, val]) => {
    if (id === "tableQuantity") {
      const parsed = Number.parseInt(val, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        quantityFromConfig = parsed;
      }
      return;
    }
    const sel = document.getElementById(id);
    if (sel) sel.value = val;
  });

  if (quantityFromConfig !== null) {
    setTableQuantity(quantityFromConfig, { triggerPreview: false });
  }
}

async function init() {
  setupOverlay("articleListTrigger", "articleOverlay");
  setupOverlay("helpOverlayTrigger", "helpOverlay");

  // 1) Konfiguration & Artikelliste laden
  configXML = await loadConfig();
  await loadArticles();

  // 2) Sidebar bauen (setzt Defaults aus config.xml)
  const sidebarEl = document.getElementById("sidebar");
  buildSidebar(configXML, sidebarEl, handleSidebarChange);

  setupQuantityControl();

  // 3) Layer-Images vorbereiten – in #stage einhängen (Fallback: #preview)
  const stage = document.getElementById("stage") || document.getElementById("preview");
  configXML.querySelectorAll("layers > layer").forEach(layerNode => {
    const id = layerNode.getAttribute("id");
    const img = document.createElement("img");
    img.dataset.layerId = id ?? "";
    const sectionId = getSectionIdForLayer(id ?? "");
    if (sectionId) {
      img.dataset.highlightSection = sectionId;
    }
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
  refreshPreview();
  lastKnownValues = collectSidebarValues();
  updatePreviousValueDatasets();
}

init();
