import { parseOffset } from "./offsets.js";
import { applyAst31Logic, applyBodenPlattenLogic, applyContainerLogic, applyLaufschienenLogic, applyAblagebordLogic } from "./logic.js";
import { placeImage } from "./imageManager.js";
import { renderArticleList } from "./articles.js";
import { updateURL } from "./share.js";

export function updatePreview(configXML, images) {
  const values = {};
  document.querySelectorAll(".sidebar select").forEach(sel => values[sel.id] = sel.value);

  // --- Spezial-Logik für AST31-EL ---
  	applyAst31Logic(values);

  // --- Logik für Böden + Platten ---
  	applyBodenPlattenLogic(values);

  // --- Logik für Container ---
  	applyContainerLogic(values);
  // --- Logik für Laufschienen ---
	applyLaufschienenLogic(values);
  // --- Logik für Ablagebords ---
	applyAblagebordLogic(values);

  
  // --- Layer abarbeiten ---
  configXML.querySelectorAll("layers > layer").forEach(layerNode => {
    const id = layerNode.getAttribute("id");
    const folder = layerNode.getAttribute("folder");
    let key = layerNode.getAttribute("keyPattern");
	
    // console.log("Prüfe Layer:", id, "dependsOn:", layerNode.getAttribute("dependsOn"));

    // --- Sichtbarkeits-Bedingungen prüfen ---
    let visible = true;
    const depends = layerNode.getAttribute("dependsOn");
    if (depends) {
      const rules = depends.split(",");
      for (const rule of rules) {
        const [field, cond] = rule.split(":");
        if (!field || !cond) continue;
        const options = cond.replace("!", "").split("|");
        if (cond.startsWith("!")) {
          if (options.includes(values[field])) visible = false;
        } else {
          if (!options.includes(values[field])) visible = false;
        }
      }
    }
	
    //console.log("values:", values, "id:", id, "visible:", visible);
    
    // --- Sonderfall: Remapping Böden bei hoch+2 Platten ---
    let targetId = id; 
    if (values._bodenRemap && id.startsWith("boden")) {
      const remap = values._bodenRemap[values.bodenanzahl] || [];
      if (!remap.includes(id)) {
        if (id === "boden1" && values.bodenanzahl === "1") {
          targetId = "boden3";
        } else if (id === "boden1" && values.bodenanzahl === "2") {
          targetId = "boden3";
        } else if (id === "boden2" && values.bodenanzahl === "2") {
          targetId = "boden4";
        } else {
          images[id].style.display = "none";
          return;
        }
      }
    }

    if (!visible) {
      images[id].style.display = "none";
      return;
    }

    // --- Key bauen (mit Gestellfarbe-Fix für Seitenblenden & Container) ---
    Object.entries(values).forEach(([k,v]) => {
      let val = v;
      if ((k === "seitenfarbe" || k === "containerfarbe") && v === "gestell") {
        val = values.farbe;
      }
      key = key.replace(`{${k}}`, val);
    });

    // --- Offsets laden ---
    let cfg = null;
    const offsetGroup = layerNode.getAttribute("offsetGroup");
    if (offsetGroup) {
      if (targetId.startsWith("boden") || targetId.startsWith("platte")) {
        cfg = parseOffset(configXML, `offsets > ${offsetGroup} > item[id="${targetId}-${values.breite}"]`);
      } else if (targetId.startsWith("laufschiene")) {
        cfg = parseOffset(configXML, `offsets > ${offsetGroup} > item[id="${targetId}-${values.breite}"]`);
      } else if (targetId === "seitenLinks" || targetId === "seitenRechts" ||
                 targetId === "containerLinks" || targetId === "containerRechts") {
        const side = targetId.endsWith("Links") ? "left" : "right";
        cfg = parseOffset(configXML, `offsets > ${offsetGroup} > item[breite="${values.breite}"][side="${side}"]`);
      } else {
        cfg = parseOffset(configXML, `offsets > ${offsetGroup} > item[id="${key}"]`);
      }
    }

    // --- Bild anzeigen ---
    placeImage(images[id], `bilder/${folder}/${key}.png`, cfg);


    // Sonderfall: Container rechts → Bild spiegeln
	if (id === "containerRechts") {
  	images[id].style.transform += " scaleX(-1)";
	}
  });

  // --- Artikelliste aktualisieren ---
  renderArticleList(values);

  // --- Share-Link aktualisieren ---
  updateURL(values);
  

}
