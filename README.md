# 🛠️ Arbeitstisch-Konfigurator 3000™

Der Arbeitstisch-Konfigurator 3000™ ist ein vollständig clientseitiger Produktkonfigurator für modulare Arbeitstische. Alle Auswahlmöglichkeiten, Berechnungen und Layer-Bilder werden aus strukturierten XML-Dateien geladen und ohne zusätzliche Build- oder Server-Infrastruktur im Browser gerendert.

---

## Inhaltsverzeichnis
- [Überblick](#überblick)
- [Highlights](#highlights)
- [Technologie-Stack](#technologie-stack)
- [Schnellstart](#schnellstart)
- [Bedienung](#bedienung)
- [Konfiguration anpassen](#konfiguration-anpassen)
  - [Konfigurations-XML (`config.xml`)](#konfigurations-xml-configxml)
  - [Artikelnummern (`article-list.xml`)](#artikelnummern-article-listxml)
  - [Bild-Assets](#bild-assets)
- [Projektstruktur](#projektstruktur)
- [Roadmap & bekannte Themen](#roadmap--bekannte-themen)
- [Mitmachen](#mitmachen)
- [Lizenz](#lizenz)

---

## Überblick
- **Zielgruppe:** Vertrieb & Marketing, um Varianten eines Arbeitstischsystems schnell visualisieren und teilen zu können.
- **Ansatz:** XML-first. Sämtliche UI-Elemente werden dynamisch aus der Konfiguration erzeugt, wodurch sich neue Produktlinien ohne Codeänderungen integrieren lassen.
- **Ausgabe:** Eine gestapelte Vorschau aus PNG-Layern sowie eine Artikelliste mit Artikelnummern und einer Teilen-Funktion.

## Highlights
- **Dynamische Sidebar:** Gruppen, Sektionen und Auswahlfelder entstehen vollständig aus der `config.xml`. HTML muss nicht angepasst werden.
- **Layer-basierte Darstellung:** Jedes Produktmerkmal blendet eigene PNGs ein, die über Offsets exakt positioniert werden.
- **Artikelliste & Sharing:** Ein Overlay zeigt die aktuell gewählten Artikelnummern, erstellt einen kompakten Teilen-Link und bietet eine Kopierfunktion.
- **Zoom & Barrierefreiheit:** Der Vorschaubereich lässt sich zoomen, Overlay und Buttons sind per Tastatur steuerbar.
- **Zero-Dependencies:** Kein Build-Step, kein Framework. Eine statische Auslieferung genügt (z. B. GitHub Pages).

## Technologie-Stack
- **HTML/CSS** für die Oberfläche und Animationen.
- **Vanilla JavaScript** (ES Modules) für Logik, Rendering und Teilen-Funktion.
- **XML** als Datenquelle für Produktgruppen, Optionen, Offsets und Artikelnummern.

## Schnellstart
1. Repository klonen:
   ```bash
   git clone https://github.com/deinuser/arbeitstisch-konfigurator.git
   cd arbeitstisch-konfigurator
   ```
2. Projekt im Browser öffnen:
   - Entweder `index.html` direkt öffnen (für lokale Vorschau), oder
   - Einen kleinen Static-Server starten, z. B. mit Python:
     ```bash
     python3 -m http.server 8000
     ```
     und anschließend `http://localhost:8000` aufrufen. Dies ist notwendig, wenn `fetch`-Aufrufe (z. B. für die Artikel-Liste) vom Browser blockiert werden.
3. Optional: Für die Veröffentlichung einfach auf GitHub Pages oder jeden beliebigen statischen Hoster deployen.

## Bedienung
1. Auf der linken Seite Parameter (Breite, Gestell, Aufbau, …) auswählen. Standardwerte kommen aus der `config.xml`.
2. Die Vorschau rechts aktualisiert sich sofort und stapelt die passenden PNG-Layer.
3. Über den Button **„Artikelliste & Teilen“** öffnet sich ein Overlay mit:
   - allen ausgewählten Komponenten inkl. Artikelnummer,
   - einem generierten Teilen-Link (`?config=…`), der per Klick in die Zwischenablage kopiert wird.
4. Der Zoom im Vorschaubereich lässt sich per Mausrad oder Touch-Gesten bedienen (sofern unterstützt).

## Konfiguration anpassen

### Konfigurations-XML (`config.xml`)
- **`<groups>`**: Definiert Sidebar-Gruppen und deren Sections.
- **`<options>`**: Hinterlegt die auswählbaren Werte (`<wert>`) inklusive optionaler Defaults.
- **`<layers>`**: Ordnet den Optionen Bildpfade, Layer-Reihenfolge und Offsets zu.
- **`<overlays>` / `<offsets>`** (siehe Datei): Regeln, welche Layer ein- oder ausgeblendet werden und wie sie verschoben werden.

Änderungen an den IDs wirken sich direkt auf die erzeugten `<select>`-Felder aus. Neue Produkte werden in `config.xml` ergänzt, ohne dass am JavaScript-Code gearbeitet werden muss.

### Artikelnummern (`article-list.xml`)
- Enthält Artikelnummern für Breiten, Platten, Aufbauten usw.
- Die `lookupArticle`-Funktion weist jeder Auswahl im Overlay die passende Nummer zu.
- Struktur: `<articles><breite key="750" number="…" /> …</articles>` – Keys müssen mit den Option-IDs in `config.xml` übereinstimmen.

### Bild-Assets
- Alle Renderings liegen im Ordner `bilder/` und sind nach Layern gruppiert (z. B. `grundtisch/`, `seitenblenden/`, `aufbau/`).
- PNGs sollten transparente Hintergründe haben und exakt zur im `layers`-Abschnitt beschriebenen Größe passen.
- Neue Layer erfordern:
  1. Eintragen in `config.xml` (`<layer id="…" folder="…" file="…" />`).
  2. Ablegen der Bilddateien im passenden Unterordner.
  3. Optionales Justieren von Offsets in `offsets.js`, wenn spezielle Verschiebungen nötig sind.

## Projektstruktur
```text
arbeitstisch-konfigurator/
├── index.html          # Einstiegspunkt, bindet alle Module ein
├── style.css           # Styles & Animationen
├── js/                 # ES-Module für Logik, UI und Preview
│   ├── main.js         # Initialisierung & App-Lifecycle
│   ├── configLoader.js # Lädt und cached config.xml
│   ├── uiBuilder.js    # Erzeugt Sidebar & Formularfelder
│   ├── preview.js      # Aktualisiert Layer-Bilder
│   ├── offsets.js      # Berechnet Verschiebungen einzelner Layer
│   ├── share.js        # Teilen-Link erzeugen & URL aktualisieren
│   ├── articleLoader.js# Artikelnummern aus article-list.xml laden
│   └── ...             # Weitere Module (Zoom, Business-Logik, …)
├── config.xml          # Produktkonfiguration & Layer-Zuordnung
├── article-list.xml    # Artikeldatenbank für das Overlay
├── bilder/             # Sämtliche PNG-Layer
├── favicon.png
└── README.md
```

## Roadmap & bekannte Themen
- Offsets der Seitenblenden für alle Breiten weiter verfeinern.
- Zusätzliche Renderings für „Aufbau hoch“ ergänzen.
- `config.xml` für weitere Produktfamilien (z. B. Schränke, Kaffeemaschinen) generalisieren.
- Bonus-Idee: Ein optionales Easter-Egg via Konami-Code 🎮

## Mitmachen
Pull Requests sind willkommen! Bitte achte auf verständliche Commits und teste deine Änderungen in allen gängigen Browsern. Wenn du Fragen zur Struktur hast, melde dich gern über Issues.

## Lizenz
Dieses Projekt steht unter der MIT-Lizenz. Details siehe [`LICENSE`](LICENSE).
