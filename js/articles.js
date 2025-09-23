import { lookupArticle } from "./articleLoader.js";

/**
 * Baut die Artikelliste auf Basis der aktuellen Auswahl
 */
export function renderArticleList(values) {
  const list = document.getElementById("articleItems");
  if (!list) return;
  const actionsRoot = document.getElementById("articleOverlayActions");
  if (actionsRoot) {
    actionsRoot.innerHTML = "";
    actionsRoot.hidden = true;
  }
  list.innerHTML = "";
  const items = [];

  // --- Grundtisch ---
  const grundKey = `${values.gestell}-${values.farbe}-${values.platte}-${values.breite}`;
  const grundNum = lookupArticle("grundtisch", grundKey);

  if (grundNum) items.push({ label: "Grundtisch", code: grundNum, quantity: 1 });

  // --- Seitenblenden ---
  if (values.seitenblende !== "ohne") {
    const farbe = (values.seitenfarbe === "gestell") ? values.farbe : values.seitenfarbe;
    const num = lookupArticle("seitenblende", farbe);

    if (num) {
      const qty = values.seitenblende === "links-rechts" ? 2 : 1;
      items.push({ label: `Seitenblende (${farbe}) x${qty}`, code: num, quantity: qty });
    }
  }

  // --- Aufbau ---
  if (values.aufbau !== "ohne") {
    const num = lookupArticle("aufbau", values.aufbau);

    if (num) items.push({ label: `Aufbau ${values.aufbau}`, code: num, quantity: 1 });
  }

  // --- Böden ---
  if (values.bodenanzahl && values.bodenanzahl !== "0") {
    const key = `${values.farbe}-${values.breite}`;
    const num = lookupArticle("boden", key);

    if (num) {
      const qty = parseInt(values.bodenanzahl, 10);
      if (qty > 0) {
        items.push({ label: `Boden (${values.farbe}) x${values.bodenanzahl}`, code: num, quantity: qty });
      }
    }
  }

  // --- Lochrasterplatten ---
  if (values.plattenanzahl && values.plattenanzahl !== "0") {
    const key = `${values.farbe}-${values.breite}`;
    const num = lookupArticle("platte", key);

    if (num) {
      const qty = parseInt(values.plattenanzahl, 10);
      if (qty > 0) {
        items.push({ label: `Lochrasterplatte (${values.farbe}) x${values.plattenanzahl}`, code: num, quantity: qty });
      }
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

      if (count > 0) {
        items.push({ label: `Container (${contFarbe}) x${count}`, code: num, quantity: count });
      }
    }
  }

  // --- Laufschienen ---
  if (values.laufschienenanzahl && values.laufschienenanzahl !== "0") {
    const key = values.breite; // Keys sind nur "750", "1500", "2000"

    const num = lookupArticle("laufschiene", key);

    if (num) {
      const qty = parseInt(values.laufschienenanzahl, 10);
      if (qty > 0) {
        items.push({ label: `Laufschiene x${values.laufschienenanzahl}`, code: num, quantity: qty });
      }
    }
  }

  // --- Ablagebord ---
  if (values.ablagebord && values.ablagebord !== "ohne") {
    const key = `${values.ablagebord}-${values.breite}`; // buche-1500 / weiss-2000
    const num = lookupArticle("ablagebord", key);
    console.log("Ablagebord:", key, "→", num);
    if (num) {
      const labelName = values.ablagebord === "weiss" ? "Weiß" : "Buche";
      items.push({ label: `Ablagebord (${labelName})`, code: num, quantity: 1 });
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

    const thumb = document.createElement("span");
    thumb.className = "article-link__thumb";

    const image = document.createElement("img");
    image.className = "article-link__image";
    image.src = `bilder/icons/${item.code}.png`;
    image.alt = `${item.label} (${item.code})`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      thumb.classList.add("article-link__thumb--hidden");
    });

    thumb.appendChild(image);

    const content = document.createElement("span");
    content.className = "article-link__content";

    const header = document.createElement("span");
    header.className = "article-link-header";
    header.textContent = item.label;

    const code = document.createElement("span");
    code.className = "code";
    code.textContent = item.code;

    content.appendChild(header);
    content.appendChild(code);

    a.appendChild(thumb);
    a.appendChild(content);

    li.appendChild(a);
    list.appendChild(li);
  });

  if (actionsRoot) {
    const form = document.createElement("form");
    form.className = "article-overlay__form";
    form.action = "https://www.schaefer-shop.de/order/cart";
    form.method = "POST";

    const appendHiddenInput = (name, value) => {
      if (value === undefined || value === null) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    items.forEach(item => {
      appendHiddenInput("articleId", item.code);
      appendHiddenInput("quantity", String(item.quantity ?? 1));
    });

    appendHiddenInput("submit", "");

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "btn";
    submitBtn.id = "submitBtn";
    submitBtn.target = "_blank";
    submitBtn.textContent = "In den Warenkorb legen";
    form.appendChild(submitBtn);

    actionsRoot.appendChild(form);
    actionsRoot.hidden = false;
  }
}
