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

  let linkBox = document.getElementById("share-link");
  if (!linkBox) {
    linkBox = document.createElement("div");
    linkBox.id = "share-link";
    linkBox.className = "section";
    linkBox.innerHTML = `
      <h2>Teilen</h2>
      <div class="content">
        <div class="share-container">
          <input type="text" id="shareInput" readonly>
          <button id="copyBtn" title="Kopieren">📋</button>
        </div>
      </div>
    `;
    document.getElementById("article-list").appendChild(linkBox);

    // Copy-Logik
    linkBox.querySelector("#copyBtn").addEventListener("click", () => {
      const input = document.getElementById("shareInput");
      input.select();
      document.execCommand("copy");
      // kleines Feedback
      const oldText = linkBox.querySelector("#copyBtn").textContent;
      linkBox.querySelector("#copyBtn").textContent = "✅";
      setTimeout(() => {
        linkBox.querySelector("#copyBtn").textContent = oldText;
      }, 1000);
    });
  }

  // URL ins Input schreiben
  linkBox.querySelector("#shareInput").value = window.location.origin + newURL;
}
