import { buildArticleItems } from "./articles.js";

// Reihenfolge der Felder festlegen
const fieldOrder = [
  "breite",
  "gestell",
  "farbe",
  "platte",
  "seitenblende",
  "seitenfarbe",
  "aufbau",
  "bodenanzahl",
  "plattenanzahl",
  "containerfarbe",
  "containerpos",
  "laufschienenanzahl",
  "ablagebord",
  "tableQuantity",
];

let lastConfigValues = {};
let lastConfigURL = "";

export function encodeConfig(values) {
  // Werte in fester Reihenfolge einsammeln
  const arr = fieldOrder.map(f => values[f] || "");
  const compact = arr.join("|");
  return LZString.compressToEncodedURIComponent(compact);
}

export function decodeConfig(str) {
  try {
    const compact = LZString.decompressFromEncodedURIComponent(str);
    if (!compact) return null;
    const arr = compact.split("|");
    const values = {};
    fieldOrder.forEach((f, i) => values[f] = arr[i] || "");
    return values;
  } catch (e) {
    console.error("Fehler beim Dekodieren der Config", e);
    return null;
  }
}

export function updateURL(values) {
  const params = new URLSearchParams(window.location.search);
  params.set("config", encodeConfig(values));
  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newURL);

  lastConfigValues = { ...values };
  lastConfigURL = window.location.origin + newURL;

  const shareRoot = document.getElementById("articleOverlayShare");
  if (!shareRoot) return;

  let requestBtn = shareRoot.querySelector("#requestBtn");
  if (!requestBtn) {
    shareRoot.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "Konfiguration anfragen";
    shareRoot.appendChild(heading);

    requestBtn = document.createElement("button");
    requestBtn.id = "requestBtn";
    requestBtn.type = "button";
    requestBtn.className = "btn";
    requestBtn.textContent = "Konfiguration anfragen";
    shareRoot.appendChild(requestBtn);
  }

  requestBtn.onclick = () => {
    const items = buildArticleItems(lastConfigValues);
    const tableQuantity = Math.max(1, Number.parseInt(lastConfigValues.tableQuantity ?? "1", 10) || 1);
    const subject = "Konfiguration anfragen";
    const body = buildEmailBody(items, lastConfigURL, tableQuantity);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body).replace(/%0A/g, "%0D%0A");
    const mailto = `mailto:test@123.de?subject=${encodedSubject}&body=${encodedBody}`;

    window.location.href = mailto;
  };
}

function buildEmailBody(items, configLink, tableQuantity = 1) {
  const introLines = [
    "<p>Hallo,</p>",
    "<p>bitte senden Sie mir ein Angebot für folgende Konfiguration:</p>",
    `<p>Menge: ${tableQuantity} ${tableQuantity === 1 ? "Tisch" : "Tische"}</p>`
  ];

  const table = formatItemsTable(items, tableQuantity);

  const outroLines = [
    `<p>Konfigurationslink: <a href="${configLink}">${configLink}</a></p>`,
    "<p>Vielen Dank!</p>"
  ];

  const bodyParts = [
    "<html>",
    "<body>",
    ...introLines,
    table,
    ...outroLines,
    "</body>",
    "</html>"
  ];

  return bodyParts.join("\n").trimEnd();
}

function formatItemsTable(items, multiplier = 1) {
  if (!items.length) {
    return "<p>Keine Artikeldaten verfügbar.</p>";
  }

  const tableRows = items.map(item => {
    const baseQuantity = item.quantity ?? 1;
    const quantity = baseQuantity * multiplier;
    return `    <tr>
      <td style="padding: 4px 8px; border: 1px solid #d0d0d0;">${item.label}</td>
      <td style="padding: 4px 8px; border: 1px solid #d0d0d0;">${item.code}</td>
      <td style="padding: 4px 8px; border: 1px solid #d0d0d0; text-align: right;">${quantity}</td>
    </tr>`;
  });

  return [
    "<table style=\"border-collapse: collapse; width: 100%; max-width: 480px;\">",
    "  <thead>",
    "    <tr>",
    "      <th style=\"text-align: left; padding: 4px 8px; border: 1px solid #d0d0d0;\">Artikel</th>",
    "      <th style=\"text-align: left; padding: 4px 8px; border: 1px solid #d0d0d0;\">Artikelnummer</th>",
    "      <th style=\"text-align: right; padding: 4px 8px; border: 1px solid #d0d0d0;\">Menge</th>",
    "    </tr>",
    "  </thead>",
    "  <tbody>",
    ...tableRows,
    "  </tbody>",
    "</table>"
  ].join("\n");
}
