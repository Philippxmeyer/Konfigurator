// uiBuilder.js
import { updatePreview } from "./preview.js";

/**
 * Baut die Sidebar anhand des configXML.
 * Unterstützt <group> mit verschachtelten <section>-Elementen.
 */
export function buildSidebar(configXML, container, onChange) {
  container.innerHTML = "";

  configXML.querySelectorAll("groups > group").forEach(groupNode => {
    const group = document.createElement("div");
    group.className = "group";

    const groupHeader = document.createElement("h1");
    groupHeader.textContent = groupNode.getAttribute("title");

    // Standard: nur Tisch offen
    if (groupNode.getAttribute("id") !== "tisch") {
      group.classList.add("collapsed");
    }

    // Accordion-Logik: nur eine Gruppe gleichzeitig offen
    groupHeader.addEventListener("click", () => {
      // alle Gruppen schließen
      container.querySelectorAll(".group").forEach(g => g.classList.add("collapsed"));
      // aktuelle öffnen
      group.classList.remove("collapsed");
    });

    group.appendChild(groupHeader);

    // Untersektionen
    groupNode.querySelectorAll("section").forEach(secNode => {
      const sec = document.createElement("div");
      sec.className = "section";

      const secHeader = document.createElement("h2");
      secHeader.textContent = secNode.getAttribute("title");

      // Start: alle Untersektionen offen
      sec.classList.remove("collapsed");

      secHeader.addEventListener("click", () => {
        sec.classList.toggle("collapsed");
      });

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
          if (optNode.getAttribute("default") === "true") {
            opt.selected = true;
          }
          sel.appendChild(opt);
        });

        sel.addEventListener("change", onChange);
        content.appendChild(labelEl);
        content.appendChild(sel);
      });

      sec.appendChild(secHeader);
      sec.appendChild(content);
      group.appendChild(sec);
    });

    container.appendChild(group);
  });
}
