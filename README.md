# 🛠️ AST31 Arbeitstisch-Konfigurator

Der AST31 Arbeitstisch-Konfigurator ist ein vollständig clientseitiges Tool, mit dem sich Varianten des Schäfer-Shop-Arbeitstisches AST31 zusammenstellen, visualisieren und teilen lassen. Alle UI-Bausteine, Berechnungen und Layer-Bilder werden aus strukturierten XML-Dateien geladen und ohne Build- oder Server-Infrastruktur direkt im Browser gerendert.

---

## Inhaltsverzeichnis
- [Überblick](#überblick)
- [Highlights](#highlights)
- [Technologie-Stack](#technologie-stack)
- [Schnellstart](#schnellstart)
- [Bedienung](#bedienung)
- [Datenquellen &amp; Anpassung](#datenquellen--anpassung)
  - [Konfigurations-XML (`config.xml`)](#konfigurations-xml-configxml)
  - [Artikeldaten (`article-list.xml`)](#artikeldaten-article-listxml)
  - [Bild- und Icon-Assets](#bild--und-icon-assets)
- [Projektstruktur](#projektstruktur)
- [Roadmap &amp; bekannte Themen](#roadmap--bekannte-themen)
- [Mitmachen](#mitmachen)
- [Lizenz](#lizenz)

---

## Überblick
- **Zielgruppe:** Vertrieb und Beratung, um vorkonfigurierte AST31-Varianten visuell aufzubereiten, inklusive Teilen-Link und Artikelliste.
- **Konzept:** XML-first. Gruppen, Sektionen, Formularelemente, Layer und Offsets werden vollständig aus den XML-Dateien gelesen.
- **Ausgabe:** Gestapelte PNG-Layer des konfigurierten Tisches, eine automatisch berechnete Artikelliste inkl. Preise sowie ein `mailto`-Button für Angebotsanfragen.

## Highlights
- **Dynamisch generierte Sidebar:** `config.xml` beschreibt Gruppen, Sektionen und Felder. `main.js` + `uiBuilder.js` erzeugen daraus Formulare mit Select- und Range-Slidern inklusive Keyboard-Fokusverwaltung.
- **Regelwerk für gültige Kombinationen:** `logic.js` sperrt unzulässige Kombinationen (z. B. AST31-EL erzwingt Weißaluminium, Aufbauten steuern Böden/Platten, Container sind bei 750 mm eingeschränkt). Der Nutzer wird gewarnt, wenn Folgeanpassungen nötig wären.
- **Layer-basierte Vorschau:** `preview.js` kombiniert PNG-Layer mit individuellen Offsets (`offsets.js`). Werte wie Gestellfarbe werden automatisch auf abhängige Layer (Seitenblenden, Container) übertragen.
- **Artikelliste mit Preisen:** `articles.js` generiert Links zu schaefer-shop.de, zeigt verfügbare Icons, Preise und Summen an und blendet einen POST-Formular-Button ein, um Artikel direkt in den Warenkorb zu legen.
- **Sharing & Angebotsanfrage:** Die aktuelle Konfiguration wird komprimiert (`lz-string`) und als `?config=`-Parameter geschrieben. Im Overlay erzeugt ein Button eine formatierte Angebots-Mail inklusive Artikeltabelle und Link.
- **Zoom & Highlights:** `zoom.js` erlaubt Zoomen/Pannen per Maus, Trackpad oder Touch. Layer tragen `data-highlight-section`, sodass Klicks im Vorschaubild die zugehörige Sektion in der Sidebar hervorheben.
- **Hilfebereich:** Ein separater Overlay-Dialog erklärt die empfohlene Vorgehensweise und lässt sich vollständig per Tastatur bedienen.

## Technologie-Stack
- **HTML/CSS** für Layout, Animationen und Overlays.
- **Vanilla JavaScript** (ES Modules) für UI-Aufbau, Geschäftslogik und Rendering.
- **XML** (`config.xml`, `article-list.xml`) als Datenquelle.
- **[lz-string](https://pieroxy.net/blog/pages/lz-string/index.html)** zur URL-Kodierung der Konfiguration.

## Schnellstart
1. Repository klonen:
   ```bash
   git clone https://github.com/<dein-account>/Konfigurator.git
   cd Konfigurator
   ```
2. Projekt im Browser öffnen:
   - Entweder `index.html` direkt öffnen (für eine schnelle lokale Vorschau), oder
   - Einen kleinen Static-Server starten, z. B. mit Python:
     ```bash
     python3 -m http.server 8000
     ```
     Anschließend `http://localhost:8000` aufrufen. Dies ist erforderlich, wenn der Browser `fetch`-Aufrufe (XML-Dateien) sonst blockiert.
3. Optional: Für die Veröffentlichung einfach auf GitHub Pages oder einen beliebigen statischen Hoster deployen.

## Bedienung
1. **Parameter wählen:** In der linken Sidebar der empfohlenen Reihenfolge folgen. Slider-Felder (Breite, Böden, Lochrasterplatten, Laufschienen) lassen sich per Drag oder Tastatur steuern.
2. **Automatische Validierung:** Bei unzulässigen Kombinationen werden abhängige Felder automatisch angepasst. Bestätigt der Nutzer die Änderung nicht, bleiben die bisherigen Werte erhalten.
3. **Vorschau interaktiv nutzen:** Der Tisch aktualisiert sich sofort. Maus-/Touch-Interaktionen erlauben Zoomen und Pannen; ein Klick in die Grafik markiert die zugehörige Sektion in der Sidebar.
4. **Artikelliste & Preise:** Über den Button **„Artikelliste“** erscheint ein Overlay mit allen Positionen, Artikelnummern, optionalen Icons, Summen und einem „In den Warenkorb“-Formular (POST an schaefer-shop.de).
5. **Angebot anfragen:** Im Overlay erzeugt der Button **„Konfiguration anfragen“** eine Mail mit Artikeltabelle und Konfigurationslink.
6. **Hilfe öffnen:** Das Fragezeichen zeigt eine Schritt-für-Schritt-Anleitung direkt im Tool an.

## Datenquellen & Anpassung

### Konfigurations-XML (`config.xml`)
- **Struktur:** `groups > group > section > field`. Jeder `field`-Knoten besitzt eine `id`, ein Label sowie den Options-Namespace.
- **Optionen:** Unter `options` definierte Werte (`<wert id="…">`). Attribute wie `default="true"` setzen Startwerte.
- **Layer:** `layers > layer` beschreibt PNG-Dateien mittels `folder` und `keyPattern`. Platzhalter (`{breite}`, `{farbe}` …) werden zur Laufzeit ersetzt. `dependsOn` akzeptiert mehrere Regeln und blendet Layer dynamisch aus.
- **Offsets:** `offsets > <gruppe> > item` liefert Koordinaten (`x`, `y`, `scaleX`, `scaleY`). Mit `offsetGroup` lassen sich Layer unterschiedlichen Lookup-Strategien zuordnen (z. B. `boden1-1500`).
- **Speziallogik:** Bestimmte Feld-IDs werden in `logic.js` erwartet (`breite`, `gestell`, `aufbau`, `bodenanzahl`, …). Neue Felder können ergänzt werden, solange ihre Abhängigkeiten dort berücksichtigt werden.

### Artikeldaten (`article-list.xml`)
- Enthält strukturierte Datensätze (`<grundtisch>`, `<seitenblende>`, …) mit `key`, `number` und optional `price`.
- `articles.js` nutzt die Kombination aus Feldwerten (z. B. `gestell-farbe-platte-breite`) als Lookup-Key, reichert die Artikelliste an und berechnet die Gesamtpreise.
- Fehlende Preise werden als „Preis auf Anfrage“ markiert, die Summenanzeige passt sich entsprechend an.

### Bild- und Icon-Assets
- Sämtliche Renderings liegen in `bilder/` und sind nach Layer-Gruppen organisiert (z. B. `grundtisch/`, `seitenblenden/`, `container/`). Dateinamen müssen mit den in `keyPattern` erzeugten Keys übereinstimmen.
- `bilder/icons/` enthält optionale Vorschaubilder für Artikellisten. Fehlt ein Icon, blendet `articles.js` den Platzhalter automatisch aus.
- Weitere Assets wie `favicon.png` und Logos liegen im Projektwurzelordner.

## Projektstruktur
```text
Konfigurator/
├── index.html          # Einstiegspunkt, bindet alle Module ein
├── style.css           # Styles, Layout, Overlays, Slider
├── js/
│   ├── main.js         # App-Lifecycle, Overlays, Event-Handling
│   ├── configLoader.js # Lädt config.xml
│   ├── uiBuilder.js    # Baut Sidebar inkl. Slider-Steuerung
│   ├── preview.js      # Layer-Rendering, Artikel-/URL-Updates
│   ├── logic.js        # Geschäftslogik & Validierungen
│   ├── imageManager.js # Fade-In-Animation & Bildplatzierung
│   ├── offsets.js      # Offset-Helper mit Debug-Ausgaben
│   ├── articles.js     # Artikelliste, Preise, Warenkorb-Formular
│   ├── articleLoader.js # Lädt article-list.xml
│   ├── share.js         # URL-Encoding & Angebots-Mail
│   ├── zoom.js          # Zoom-/Pan-Interaktionen
│   └── lz-string.min.js # Drittbibliothek für Komprimierung
├── config.xml          # Produktkonfiguration & Layer-Zuordnung
├── article-list.xml    # Artikeldaten mit Nummern & Preisen
├── bilder/             # PNG-Layer, Icons & Logos
├── script.js           # Legacy-Prototyp (nicht mehr eingebunden)
├── favicon.png
└── README.md
```

## Roadmap & bekannte Themen
- Offsets weiter kalibrieren, insbesondere für Seitenblenden und Container-Kombinationen.
- Zusätzliche Renderings für seltene Kombinationen (z. B. Aufbau hoch + mehrere Böden) bereitstellen.
- `logic.js` modularisieren, damit neue Produktlinien einfacher integrierbar sind.
- Optional: Reaktivierung des internen „System Monitor“-Overlays (`systemMonitor.js`) als Easter Egg.

## Mitmachen
Pull Requests sind willkommen! Bitte teste deine Änderungen in aktuellen Browsern und beschreibe Anpassungen an den XML-Dateien nachvollziehbar. Bei Fragen zur Struktur gerne ein Issue eröffnen.

## Lizenz
Dieses Projekt steht unter der GNU General Public License v3.0. Details siehe [`LICENSE`](LICENSE).
