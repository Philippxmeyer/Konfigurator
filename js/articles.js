import { lookupArticle } from "./articleLoader.js";

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const labelOverrides = {
  weiss: "Weiß",
  weissaluminium: "Weißaluminium",
  lichtgrau: "Lichtgrau",
  blau: "Blau",
  anthrazit: "Anthrazit",
  niedrig: "Niedrig",
  hoch: "Hoch",
  buche: "Buche",
  weissbuche: "Weißbuche",
};

function normalizeLabel(value) {
  if (!value) return "";
  if (labelOverrides[value]) return labelOverrides[value];
  return value
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelWithQuantity(baseLabel, quantity) {
  return quantity > 1 ? `${baseLabel} x${quantity}` : baseLabel;
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "–";
  }
  return currencyFormatter.format(value);
}

export function calculatePriceSummary(items) {
  let total = 0;
  let hasMissing = false;

  items.forEach(item => {
    if (item.unitPrice === null || item.unitPrice === undefined) {
      hasMissing = true;
      return;
    }

    const quantity = item.quantity ?? 1;
    total += item.unitPrice * quantity;
  });

  return { total, hasMissing };
}

export function buildArticleItems(values) {
  const items = [];
  const addArticle = (label, article, quantity = 1) => {
    if (!article || !article.number) return;
    items.push({
      label,
      code: article.number,
      quantity,
      unitPrice: article.price ?? null,
    });
  };

  const grundKey = `${values.gestell}-${values.farbe}-${values.platte}-${values.breite}`;
  addArticle("Grundtisch", lookupArticle("grundtisch", grundKey));

  if (values.seitenblende !== "ohne") {
    const farbe = values.seitenfarbe === "gestell" ? values.farbe : values.seitenfarbe;
    const qty = values.seitenblende === "links-rechts" ? 2 : 1;
    const article = lookupArticle("seitenblende", farbe);
    const label = labelWithQuantity(`Seitenblende (${normalizeLabel(farbe)})`, qty);
    addArticle(label, article, qty);
  }

  if (values.aufbau !== "ohne") {
    const label = `Aufbau ${normalizeLabel(values.aufbau)}`;
    addArticle(label, lookupArticle("aufbau", values.aufbau));
  }

  if (values.bodenanzahl && values.bodenanzahl !== "0") {
    const key = `${values.farbe}-${values.breite}`;
    const qty = parseInt(values.bodenanzahl, 10);
    if (qty > 0) {
      const label = labelWithQuantity(`Boden (${normalizeLabel(values.farbe)})`, qty);
      addArticle(label, lookupArticle("boden", key), qty);
    }
  }

  if (values.plattenanzahl && values.plattenanzahl !== "0") {
    const key = `${values.farbe}-${values.breite}`;
    const qty = parseInt(values.plattenanzahl, 10);
    if (qty > 0) {
      const label = labelWithQuantity(`Lochrasterplatte (${normalizeLabel(values.farbe)})`, qty);
      addArticle(label, lookupArticle("platte", key), qty);
    }
  }

  if (values.containerpos && values.containerpos !== "ohne") {
    const contFarbe = values.containerfarbe === "gestell" ? values.farbe : values.containerfarbe;
    const contKey = `${values.farbe}-${contFarbe}`;

    let count = 0;
    if (values.containerpos === "links" || values.containerpos === "rechts") count = 1;
    if (values.containerpos === "links-rechts") count = 2;

    if (count > 0) {
      const label = labelWithQuantity(`Container (${normalizeLabel(contFarbe)})`, count);
      addArticle(label, lookupArticle("container", contKey), count);
    }
  }

  if (values.laufschienenanzahl && values.laufschienenanzahl !== "0") {
    const qty = parseInt(values.laufschienenanzahl, 10);
    if (qty > 0) {
      const label = labelWithQuantity(`Laufschiene (${values.breite} mm)`, qty);
      addArticle(label, lookupArticle("laufschiene", values.breite), qty);
    }
  }

  if (values.ablagebord && values.ablagebord !== "ohne") {
    const key = `${values.ablagebord}-${values.breite}`; // buche-1500 / weiss-2000
    const article = lookupArticle("ablagebord", key);
    const labelName = values.ablagebord === "weiss" ? "Weiß" : "Buche";
    addArticle(`Ablagebord (${labelName})`, article);
  }

  return items;
}

export function renderArticleList(values, tableQuantity = 1) {
  const list = document.getElementById("articleItems");
  const actionsRoot = document.getElementById("articleOverlayActions");
  if (!list) {
    return {
      items: [],
      priceSummary: { total: 0, hasMissing: false },
      hasItems: false,
      aggregatedTotal: null,
      hasMissingPrice: false,
    };
  }
  if (actionsRoot) {
    actionsRoot.innerHTML = "";
    actionsRoot.hidden = true;
  }
  list.innerHTML = "";

  const sidebarTotal = document.getElementById("sidebarTotal");
  const overlaySummary = document.getElementById("articleOverlaySummary");
  const overlayTotal = document.getElementById("articleOverlayTotal");

  const items = buildArticleItems(values);
  const priceSummary = calculatePriceSummary(items);
  const hasItems = items.length > 0;
  const numericQuantity = Number.parseInt(tableQuantity, 10);
  const sanitizedQuantity = Number.isFinite(numericQuantity) && numericQuantity > 0 ? numericQuantity : 1;
  const aggregatedTotal = !priceSummary.hasMissing && hasItems
    ? priceSummary.total * sanitizedQuantity
    : null;

  const totalText = !hasItems
    ? "–"
    : priceSummary.hasMissing
      ? "Preis auf Anfrage"
      : formatCurrency(priceSummary.total);

  if (sidebarTotal) {
    sidebarTotal.textContent = totalText;
    sidebarTotal.classList.toggle("sidebar-summary__value--missing", priceSummary.hasMissing);
    sidebarTotal.dataset.totalValue = priceSummary.hasMissing || !hasItems ? "" : priceSummary.total.toFixed(2);
    sidebarTotal.dataset.tableQuantity = String(sanitizedQuantity);
  }

  if (overlayTotal) {
    overlayTotal.textContent = totalText;
    overlayTotal.classList.toggle("article-overlay__total--missing", priceSummary.hasMissing);
    overlayTotal.dataset.totalValue = priceSummary.hasMissing || !hasItems ? "" : priceSummary.total.toFixed(2);
    overlayTotal.dataset.tableQuantity = String(sanitizedQuantity);
  }

  if (overlaySummary) {
    overlaySummary.hidden = !hasItems;
  }

  if (!hasItems) {
    const empty = document.createElement("li");
    empty.className = "article-overlay__empty";
    empty.textContent = "Keine Artikeldaten verfügbar.";
    list.appendChild(empty);
    return {
      items,
      priceSummary,
      hasItems,
      aggregatedTotal: null,
      hasMissingPrice: priceSummary.hasMissing,
    };
  }

  // --- Rendern (Listenelemente klickbar) ---
  const BASE = "https://www.schaefer-shop.de/product/search?query=";

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

    const quantity = item.quantity ?? 1;
    const price = document.createElement("span");
    price.className = "article-link__price";

    if (item.unitPrice === null || item.unitPrice === undefined) {
      price.textContent = "Preis auf Anfrage";
      price.classList.add("article-link__price--missing");
    } else if (quantity > 1) {
      const total = item.unitPrice * quantity;
      price.textContent = `${formatCurrency(item.unitPrice)} × ${quantity} = ${formatCurrency(total)}`;
    } else {
      price.textContent = formatCurrency(item.unitPrice);
    }

    content.appendChild(header);
    content.appendChild(code);
    content.appendChild(price);

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
      const baseQuantity = item.quantity ?? 1;
      const effectiveQuantity = baseQuantity * sanitizedQuantity;
      appendHiddenInput("articleId", item.code);
      appendHiddenInput("quantity", String(effectiveQuantity));
    });

    appendHiddenInput("submit", "");

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "btn";
    submitBtn.id = "submitBtn";
    submitBtn.formTarget = "_blank";
    if (aggregatedTotal !== null && sanitizedQuantity > 1) {
      submitBtn.textContent = `In den Warenkorb legen (Gesamt: ${formatCurrency(aggregatedTotal)})`;
    } else {
      submitBtn.textContent = "In den Warenkorb legen";
    }
    form.appendChild(submitBtn);

    actionsRoot.appendChild(form);
    actionsRoot.hidden = false;
  }

  return {
    items,
    priceSummary,
    hasItems,
    aggregatedTotal,
    hasMissingPrice: priceSummary.hasMissing,
  };
}
