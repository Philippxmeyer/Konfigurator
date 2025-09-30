// uiBuilder.js

const sliderFieldIds = new Set([
  "breite",
  "bodenanzahl",
  "plattenanzahl",
  "laufschienenanzahl"
]);

const sliderControls = new Map();

function getOptions(control) {
  return Array.from(control.select.options);
}

function findNearestEnabledIndex(control, requestedIndex) {
  const options = getOptions(control);
  if (!options.length) return 0;

  let index = Math.min(Math.max(requestedIndex, 0), options.length - 1);
  if (!options[index]?.disabled) {
    return index;
  }

  const lastIndex = control.lastIndex ?? 0;
  const direction = index > lastIndex ? 1 : index < lastIndex ? -1 : 0;
  const searchDirections = direction === 0 ? [1, -1] : [direction, -direction];

  for (const dir of searchDirections) {
    let i = index;
    while (i >= 0 && i < options.length) {
      i += dir;
      if (i < 0 || i >= options.length) break;
      if (!options[i].disabled) {
        return i;
      }
    }
  }

  if (!options[lastIndex]?.disabled) {
    return lastIndex;
  }

  const fallback = options.findIndex(opt => !opt.disabled);
  return fallback === -1 ? index : fallback;
}

function updateSliderControl(control) {
  const options = getOptions(control);
  const maxIndex = Math.max(options.length - 1, 0);
  control.slider.max = String(maxIndex);

  let index = options.findIndex(opt => opt.value === control.select.value);
  if (index === -1) {
    index = findNearestEnabledIndex(control, control.lastIndex ?? 0);
    if (options[index]) {
      control.select.value = options[index].value;
    }
  }

  control.lastIndex = index;
  control.slider.value = String(index);

  const option = options[index];
  const valueText = option ? option.textContent : "";
  control.valueDisplay.textContent = valueText;
  control.slider.setAttribute("aria-valuetext", valueText);

  const progress = maxIndex === 0 ? 0 : (index / maxIndex) * 100;
  control.slider.style.setProperty("--slider-progress", `${progress}%`);

  const disableSlider = control.select.disabled || options.every(opt => opt.disabled);
  control.slider.disabled = disableSlider;
  control.wrapper.classList.toggle("is-disabled", disableSlider);

  control.ticks.forEach((tick, idx) => {
    const opt = options[idx];
    const isDisabledTick = disableSlider || opt?.disabled;
    tick.classList.toggle("is-disabled", Boolean(isDisabledTick));
    tick.classList.toggle("is-active", idx === index);
  });
}

export function syncSliderControls() {
  sliderControls.forEach(updateSliderControl);
}

function createSliderControl(id, select) {

  const wrapper = document.createElement("div");

  const valueDisplay = document.createElement("div");
  valueDisplay.className = "slider-field__value";
  valueDisplay.setAttribute("aria-live", "polite");
  wrapper.appendChild(valueDisplay);

  wrapper.className = "slider-field";

  const track = document.createElement("div");
  track.className = "slider-field__track";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = `${id}-slider`;
  slider.className = "slider-field__input";
  slider.min = "0";
  slider.step = "1";
  slider.value = "0";

  const ticks = document.createElement("div");
  ticks.className = "slider-field__ticks";

  const tickElements = [];
  const options = Array.from(select.options);
  const divisor = Math.max(options.length - 1, 1);
  options.forEach((_, idx) => {
    const tick = document.createElement("span");
    tick.className = "slider-field__tick";
    const percent = options.length === 1 ? 0 : (idx / divisor) * 100;
    tick.style.left = `${percent}%`;
    ticks.appendChild(tick);
    tickElements.push(tick);
  });

  track.appendChild(slider);
  track.appendChild(ticks);
  wrapper.appendChild(track);



  select.classList.add("slider-field__select");
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;
  wrapper.appendChild(select);

  const control = {
    id,
    select,
    slider,
    wrapper,
    valueDisplay,
    ticks: tickElements,
    lastIndex: 0
  };

  sliderControls.set(id, control);

  const handleSliderInput = event => {
    if (slider.disabled) return;
    const rawIndex = Number(event.target.value);
    const index = findNearestEnabledIndex(control, rawIndex);
    const optionsList = getOptions(control);
    const option = optionsList[index];
    control.slider.value = String(index);
    if (!option) {
      updateSliderControl(control);
      return;
    }

    if (control.select.value !== option.value) {
      control.select.value = option.value;
      control.lastIndex = index;
      control.select.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      control.lastIndex = index;
      updateSliderControl(control);
    }
  };

  slider.addEventListener("input", handleSliderInput);
  slider.addEventListener("change", handleSliderInput);

  updateSliderControl(control);

  return wrapper;
}

/**
 * Baut die Sidebar anhand des configXML.
 * Unterstützt <group> mit verschachtelten <section>-Elementen.
 */
export function buildSidebar(configXML, container, onChange) {
  container.innerHTML = "";
  sliderControls.clear();

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
        sel.dataset.label = label;
        sel.dataset.sectionTitle = secHeader.textContent;

        configXML.querySelectorAll(`options > ${optGroup} > wert`).forEach(optNode => {
          const opt = document.createElement("option");
          opt.value = optNode.getAttribute("id");
          opt.textContent = optNode.textContent;
          if (optNode.getAttribute("default") === "true") {
            opt.selected = true;
          }
          sel.appendChild(opt);
        });

        sel.dataset.previousValue = sel.value;

        const isSliderField = sliderFieldIds.has(id);

        const handleChange = () => {
          const previousValue = sel.dataset.previousValue ?? sel.value;
          if (isSliderField) {
            const control = sliderControls.get(id);
            if (control) {
              updateSliderControl(control);
            }
          }
          if (typeof onChange === "function") {
            onChange({ id, select: sel, previousValue });
          }
          sel.dataset.previousValue = sel.value;
        };

        sel.addEventListener("change", handleChange);

        if (isSliderField) {
          labelEl.htmlFor = `${id}-slider`;
          content.appendChild(labelEl);
          const sliderWrapper = createSliderControl(id, sel);
          content.appendChild(sliderWrapper);
        } else {
          labelEl.htmlFor = id;
          content.appendChild(labelEl);
          content.appendChild(sel);
        }
      });

      sec.appendChild(secHeader);
      sec.appendChild(content);
      group.appendChild(sec);
    });

    container.appendChild(group);
  });
}
