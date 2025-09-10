let configXML;
const preview = document.getElementById("preview");
const images = {}; // Layer-ID → <img>

function fadeIn(img, src) {
  img.classList.remove("show");
  img.src = src;
  img.onload = () => img.classList.add("show");
}

function placeImage(img, src, cfg) {
  if (!cfg) { img.style.display = "none"; return; }
  fadeIn(img, src);
  img.style.left = cfg.x + "px";
  img.style.top = cfg.y + "px";
  img.style.transform = `scale(${cfg.scaleX}, ${cfg.scaleY})`;
  img.style.transformOrigin = "top left";
  img.style.display = "block";
}

function updatePreview() {
  const values = {};
  document.querySelectorAll(".sidebar select").forEach(sel => values[sel.id] = sel.value);

  configXML.querySelectorAll("layers > layer").forEach(layerNode => {
    const id = layerNode.getAttribute("id");
    const folder = layerNode.getAttribute("folder");
    let key = layerNode.getAttribute("keyPattern");

    // Bedingungen
    const depends = layerNode.getAttribute("dependsOn");
    if (depends) {
      const [field, cond] = depends.split(":");
      if (cond.startsWith("!")) {
        if (values[field] === cond.substring(1)) { images[id].style.display = "none"; return; }
      } else if (values[field] !== cond) {
        images[id].style.display = "none"; return;
      }
    }

    // Key bauen
    Object.entries(values).forEach(([k,v]) => key = key.replace(`{${k}}`, v));

    // Offsets
    let cfg = null;
    if (id === "grundtisch") {
      cfg = parseOffset(`offsets > grundtische > item[id="${key}"]`);
    } else if (id === "aufbau") {
      cfg = parseOffset(`offsets > aufbau > item[id="${key}"]`);
    }

    placeImage(images[id], `bilder/${folder}/${key}.png`, cfg);
  });
}

function parseOffset(selector) {
  const node = configXML.querySelector(selector);
  if (!node) return null;
  return {
    x: +node.getAttribute("x"),
    y: +node.getAttribute("y"),
    scaleX: +node.getAttribute("scaleX"),
    scaleY: +node.getAttribute("scaleY")
  };
}

async function init() {
  const res = await fetch("config.xml");
  const text = await res.text();
  configXML = new DOMParser().parseFromString(text, "application/xml");

  // Sidebar
  const sidebar = document.getElementById("sidebar");
  configXML.querySelectorAll("sections > section").forEach(secNode => {
    const sec = document.createElement("div");
    sec.className = "section";
    sec.innerHTML = `<h2>${secNode.getAttribute("title")}</h2>`;
    const content = document.createElement("div");
    content.className = "content";

    secNode.querySelectorAll("field").forEach(fieldNode => {
      const id = fieldNode.getAttribute("id");
      const label = fieldNode.getAttribute("label");
      const optGroup = fieldNode.getAttribute("options");

      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      const sel = document.createElement("select");
      sel.id = id;

      configXML.querySelectorAll(`options > ${optGroup} > wert`).forEach(optNode => {
        const opt = document.createElement("option");
        opt.value = optNode.getAttribute("id");
        opt.textContent = optNode.textContent;
        sel.appendChild(opt);
      });

      sel.addEventListener("change", updatePreview);
      content.appendChild(labelEl);
      content.appendChild(sel);
    });

    sec.appendChild(content);
    sidebar.appendChild(sec);
  });

  // Layers
  configXML.querySelectorAll("layers > layer").forEach(layerNode => {
    const id = layerNode.getAttribute("id");
    const img = document.createElement("img");
    preview.appendChild(img);
    images[id] = img;
  });

  // Accordion
  document.querySelectorAll(".section h2").forEach(h => {
    h.addEventListener("click", () => h.parentElement.classList.toggle("collapsed"));
  });

  updatePreview();
}

init();
