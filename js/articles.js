import { lookupArticle } from "./articleLoader.js";

/**
 * Baut die Artikelliste auf Basis der aktuellen Auswahl
 */
export function renderArticleList(values) {
  const list = document.getElementById("articleItems");
  list.innerHTML = "";
  const items = [];

  // --- Grundtisch ---
  const grundKey = `${values.gestell}-${values.farbe}-${values.platte}-${values.breite}`;
  const grundNum = lookupArticle("grundtisch", grundKey);

  if (grundNum) items.push({ label: "Grundtisch", code: grundNum });

  // --- Seitenblenden ---
  if (values.seitenblende !== "ohne") {
    const farbe = (values.seitenfarbe === "gestell") ? values.farbe : values.seitenfarbe;
    const num = lookupArticle("seitenblende", farbe);

    if (num) {
      const qty = values.seitenblende === "links-rechts" ? 2 : 1;
      items.push({ label: `Seitenblende (${farbe}) x${qty}`, code: num });
    }
  }

  // --- Aufbau ---
  if (values.aufbau !== "ohne") {
    const num = lookupArticle("aufbau", values.aufbau);

    if (num) items.push({ label: `Aufbau ${values.aufbau}`, code: num });
  }

  // --- Böden ---
  if (values.bodenanzahl && values.bodenanzahl !== "0") {
    const key = `${values.farbe}-${values.breite}`;
    const num = lookupArticle("boden", key);

    if (num) {
      items.push({ label: `Boden (${values.farbe}) x${values.bodenanzahl}`, code: num });
    }
  }

  // --- Lochrasterplatten ---
  if (values.plattenanzahl && values.plattenanzahl !== "0") {
    const key = `${values.farbe}-${values.breite}`;
    const num = lookupArticle("platte", key);

    if (num) {
      items.push({ label: `Lochrasterplatte (${values.farbe}) x${values.plattenanzahl}`, code: num });
    }
  }
// --- Container ---
if (values.containerpos && values.containerpos !== "ohne") {
  const contFarbe = values.containerfarbe === "gestell" ? values.farbe : values.containerfarbe;
  const contKey = `${values.farbe}-${contFarbe}`;


  const num = lookupArticle("container", contKey);


  if (num) {
    let count = 0;
    if (values.containerpos === "links" || values.containerpos === "rechts") count = 1;
    if (values.containerpos === "links-rechts") count = 2;

    items.push({ label: `Container (${contFarbe}) x${count}`, code: num });
  }
}


// --- Laufschienen ---
if (values.laufschienenanzahl && values.laufschienenanzahl !== "0") {
  const key = values.breite; // Keys sind nur "750", "1500", "2000"
  
  const num = lookupArticle("laufschiene", key);


  if (num) {
    items.push({ label: `Laufschiene x${values.laufschienenanzahl}`, code: num });
  }
}

// --- Ablagebord ---
if (values.ablagebord && values.ablagebord !== "ohne") {
  const key = `${values.ablagebord}-${values.breite}`; // buche-1500 / weiss-2000
  const num = lookupArticle("ablagebord", key);
  console.log("Ablagebord:", key, "→", num);
  if (num) {
    const labelName = values.ablagebord === "weiss" ? "Weiß" : "Buche";
    items.push({ label: `Ablagebord (${labelName})`, code: num });
  }
}

  // --- Rendern (Listenelemente klickbar) ---
  const BASE = "https://www.schaefer-shop.de/product/search?query=";

  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "article-overlay__empty";
    empty.textContent = "Keine Artikeldaten verfügbar.";
    list.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const li = document.createElement("li");

    const a = document.createElement("a");
    a.className = "article-link";
    a.href = BASE + encodeURIComponent(item.code);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `<span class="article-link-header">${item.label}</span><span class="code">${item.code}</span>`;

    li.appendChild(a);
    list.appendChild(li);
  });
}
