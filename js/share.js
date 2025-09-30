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
  "ablagebord"    
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
    const subject = "Konfiguration anfragen";
    const body = buildEmailBody(items, lastConfigURL);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body).replace(/%0A/g, "%0D%0A");
    const mailto = `mailto:test@123.de?subject=${encodedSubject}&body=${encodedBody}`;

    window.location.href = mailto;
  };
}

function buildEmailBody(items, configLink) {
  const introLines = [
    "Hallo,",
    "",
    "bitte senden Sie mir ein Angebot für folgende Konfiguration:",
    ""
  ];

  const table = formatItemsTable(items);

  const outroLines = [
    "",
    `Konfigurationslink: ${configLink}`,
    "",
    "Vielen Dank!"
  ];

  return [...introLines, table, ...outroLines].join("\n").trimEnd();
}

function formatItemsTable(items) {
  if (!items.length) {
    return "Keine Artikeldaten verfügbar.";
  }

  const columns = [
    {
      header: "Artikel",
      getter: item => item.label
    },
    {
      header: "Artikelnummer",
      getter: item => item.code
    },
    {
      header: "Menge",
      getter: item => String(item.quantity ?? 1)
    }
  ];

  const rows = items.map(item => columns.map(col => col.getter(item)));

  const colWidths = columns.map((col, index) => {
    const cellLengths = rows.map(row => row[index].length);
    return Math.max(col.header.length, ...cellLengths);
  });

  const formatRow = row => row.map((cell, index) => cell.padEnd(colWidths[index])).join(" | ");

  const headerLine = formatRow(columns.map(col => col.header));
  const separatorLine = colWidths.map(width => "-".repeat(width)).join("-+-");
  const dataLines = rows.map(formatRow);

  return [headerLine, separatorLine, ...dataLines].join("\n");
}
