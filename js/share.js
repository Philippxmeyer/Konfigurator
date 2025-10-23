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

const ENCODING_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const ENCODING_BASE = ENCODING_ALPHABET.length;
const CHARACTER_LOOKUP = new Map(Array.from(ENCODING_ALPHABET).map((char, index) => [char, index]));

const FIELD_ENCODINGS = {
  breite: ["750", "1500", "2000"],
  gestell: ["ast31", "ast31-el"],
  farbe: ["weissaluminium", "lichtgrau"],
  platte: ["weiss", "buche"],
  seitenblende: ["ohne", "links", "rechts", "links-rechts"],
  seitenfarbe: ["gestell", "blau", "anthrazit"],
  aufbau: ["ohne", "niedrig", "hoch"],
  bodenanzahl: ["0", "1", "2", "3", "4"],
  plattenanzahl: ["0", "1", "2", "3"],
  containerfarbe: ["gestell", "blau", "anthrazit"],
  containerpos: ["ohne", "links", "rechts", "links-rechts"],
  laufschienenanzahl: ["0", "1", "2"],
  ablagebord: ["ohne", "buche", "weiss"],
  tableQuantity: { type: "range", min: 1, max: 99 },
};

const FIELD_BASES = Object.fromEntries(fieldOrder.map(field => {
  const encoding = FIELD_ENCODINGS[field];
  if (Array.isArray(encoding)) {
    return [field, encoding.length];
  }
  if (encoding?.type === "range") {
    return [field, encoding.max - encoding.min + 1];
  }
  return [field, 1];
}));

let lastConfigValues = {};
let lastConfigURL = "";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function encodeFieldIndex(field, rawValue) {
  const encoding = FIELD_ENCODINGS[field];
  if (Array.isArray(encoding)) {
    const idx = encoding.indexOf(rawValue);
    return idx >= 0 ? idx : 0;
  }
  if (encoding?.type === "range") {
    const parsed = Number.parseInt(String(rawValue ?? ""), 10);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    const clamped = clamp(parsed, encoding.min, encoding.max);
    return clamped - encoding.min;
  }
  return 0;
}

function decodeFieldValue(field, index) {
  const encoding = FIELD_ENCODINGS[field];
  if (Array.isArray(encoding)) {
    return encoding[index] ?? encoding[0] ?? "";
  }
  if (encoding?.type === "range") {
    const value = encoding.min + index;
    return String(clamp(value, encoding.min, encoding.max));
  }
  return "";
}

function encodeNumber(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return ENCODING_ALPHABET[0];
  }

  let remaining = value;
  let encoded = "";
  while (remaining > 0) {
    const digit = remaining % ENCODING_BASE;
    encoded = ENCODING_ALPHABET[digit] + encoded;
    remaining = Math.floor(remaining / ENCODING_BASE);
  }
  return encoded;
}

function decodeNumber(str) {
  if (!str || typeof str !== "string") return null;
  let value = 0;
  for (const char of str) {
    const digit = CHARACTER_LOOKUP.get(char);
    if (digit === undefined) {
      return null;
    }
    value = value * ENCODING_BASE + digit;
  }
  return value;
}

function tryDecodeTableEncodedConfig(str) {
  if (!str || typeof str !== "string") {
    return null;
  }
  if (!/^[0-9A-Za-z_-]+$/.test(str)) {
    return null;
  }

  const numericValue = decodeNumber(str);
  if (numericValue === null) {
    return null;
  }

  const values = {};
  let remaining = numericValue;

  fieldOrder.forEach(field => {
    const base = FIELD_BASES[field] ?? 1;
    const index = remaining % base;
    remaining = Math.floor(remaining / base);
    values[field] = decodeFieldValue(field, index);
  });

  if (remaining !== 0) {
    return null;
  }

  return values;
}

function decodeLegacyConfig(str) {
  try {
    const compact = LZString.decompressFromEncodedURIComponent(str);
    if (!compact) return null;
    const arr = compact.split("|");
    const values = {};
    fieldOrder.forEach((field, index) => {
      values[field] = arr[index] || "";
    });
    return values;
  } catch (error) {
    console.error("Fehler beim Dekodieren der Config", error);
    return null;
  }
}

export function encodeConfig(values) {
  let numericValue = 0;
  let multiplier = 1;

  fieldOrder.forEach(field => {
    const base = FIELD_BASES[field] ?? 1;
    const index = encodeFieldIndex(field, values[field]);
    numericValue += index * multiplier;
    multiplier *= base;
  });

  return encodeNumber(numericValue);
}

export function decodeConfig(str) {
  const tableDecoded = tryDecodeTableEncodedConfig(str);
  if (tableDecoded) {
    return tableDecoded;
  }
  return decodeLegacyConfig(str);
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

    // const heading = document.createElement("h3");
    // heading.textContent = "Konfiguration anfragen";
    // shareRoot.appendChild(heading);

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
