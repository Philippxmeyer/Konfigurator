// --- AST31-EL Einschränkungen ---
export function applyAst31Logic(values) {
  if (values.gestell === "ast31-el") {
    values.farbe = "weissaluminium";
    const farbeSel = document.getElementById("farbe");
    farbeSel.value = "weissaluminium";
    farbeSel.disabled = true;

    values.seitenblende = "ohne";
    const seitenSel = document.getElementById("seitenblende");
    seitenSel.value = "ohne";
    seitenSel.disabled = true;

    const seitenfarbeSel = document.getElementById("seitenfarbe");
    seitenfarbeSel.value = "gestell";
    seitenfarbeSel.disabled = true;
  } else {
    document.getElementById("farbe").disabled = false;
    document.getElementById("seitenblende").disabled = false;
    document.getElementById("seitenfarbe").disabled = (values.seitenblende === "ohne");
  }
}

// --- Böden/Platten Logik ---
export function applyBodenPlattenLogic(values) {
  const bodenSel = document.getElementById("bodenanzahl");
  const plattenSel = document.getElementById("plattenanzahl");

  if (!bodenSel || !plattenSel) return;

  if (values.aufbau === "ohne") {
    bodenSel.value = "0";
    bodenSel.disabled = true;
    plattenSel.value = "0";
    plattenSel.disabled = true;

  } else if (values.aufbau === "niedrig") {
    plattenSel.disabled = false;

    if (values.plattenanzahl === "1") {
      bodenSel.disabled = false;
      [...bodenSel.options].forEach(opt => {
        if (["3", "4"].includes(opt.value)) {
          opt.disabled = true;
          if (["3","4"].includes(bodenSel.value)) bodenSel.value = "2";
        } else {
          opt.disabled = false;
        }
      });

    } else if (values.plattenanzahl === "2") {
      bodenSel.value = "0";
      bodenSel.disabled = true;

    } else {
      bodenSel.disabled = false;
      [...bodenSel.options].forEach(opt => {
        if (["3", "4"].includes(opt.value)) {
          opt.disabled = true;
          if (["3","4"].includes(bodenSel.value)) bodenSel.value = "2";
        } else {
          opt.disabled = false;
        }
      });
    }

  } else if (values.aufbau === "hoch") {
    plattenSel.disabled = false;

    if (values.plattenanzahl === "1") {
      bodenSel.disabled = false;
      [...bodenSel.options].forEach(opt => opt.disabled = false);

    } else if (values.plattenanzahl === "2") {
      bodenSel.disabled = false;
      [...bodenSel.options].forEach(opt => {
        if (["3", "4"].includes(opt.value)) {
          opt.disabled = true;
          if (["3","4"].includes(bodenSel.value)) bodenSel.value = "2";
        } else {
          opt.disabled = false;
        }
      });

      values._bodenRemap = {
        "1": ["boden3"],
        "2": ["boden3", "boden4"],
        "0": []
      };

    } else if (values.plattenanzahl === "3") {
      bodenSel.value = "0";
      bodenSel.disabled = true;

    } else {
      bodenSel.disabled = false;
      [...bodenSel.options].forEach(opt => opt.disabled = false);
    }
  }

  values.bodenanzahl = bodenSel.value;
  values.plattenanzahl = plattenSel.value;
}

// --- Container Logik ---
export function applyContainerLogic(values) {
  const contSel = document.getElementById("containerpos");
  if (!contSel) return;

  // 750er: nur links ODER rechts
  if (values.breite === "750") {
    [...contSel.options].forEach(opt => {
      if (opt.value === "links-rechts") {
        opt.disabled = true;
        if (contSel.value === "links-rechts") contSel.value = "ohne";
      } else {
        opt.disabled = false;
      }
    });
  } else {
    // 1500/2000: links, rechts, links-rechts erlaubt
    [...contSel.options].forEach(opt => opt.disabled = false);
  }

  values.containerpos = contSel.value;
}

// --- Logik für Laufschienen ---
export function applyLaufschienenLogic(values) {
  const laufSel = document.getElementById("laufschienenanzahl");
  if (!laufSel) return;

  if (values.aufbau !== "hoch") {
    laufSel.value = "0";
    laufSel.disabled = true;
  } else {
    laufSel.disabled = false;
  }

  values.laufschienenanzahl = laufSel.value;
}

export function applyAblagebordLogic(values) {
  const sel = document.getElementById("ablagebord");
  if (!sel) return;

  // Nur mit AST31 erlaubt – bei AST31-EL deaktivieren
  if (values.gestell === "ast31-el") {
    sel.value = "ohne";
    sel.disabled = true;
    values.ablagebord = "ohne";
  } else {
    sel.disabled = false;
  }

  values.ablagebord = sel.value;
}
