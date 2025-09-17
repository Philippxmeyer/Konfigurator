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

  const shareRoot = document.getElementById("articleOverlayShare");
  if (!shareRoot) return;

  if (!shareRoot.querySelector("#shareInput")) {
    shareRoot.innerHTML = `
      <h3>Konfiguration teilen</h3>
      <div class="share-container">
        <input type="text" id="shareInput" readonly>
        <button id="copyBtn" class="btn btn--icon" type="button" title="Kopieren">📋</button>
      </div>
    `;

    const copyBtn = shareRoot.querySelector("#copyBtn");
    copyBtn.addEventListener("click", async () => {
      const input = shareRoot.querySelector("#shareInput");
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(input.value);
        } else {
          document.execCommand("copy");
        }
      } catch (err) {
        document.execCommand("copy");
      }

      const oldText = copyBtn.textContent;
      copyBtn.textContent = "✅";
      copyBtn.focus();
      setTimeout(() => {
        copyBtn.textContent = oldText;
      }, 1000);
    });
  }

  shareRoot.querySelector("#shareInput").value = window.location.origin + newURL;
}
