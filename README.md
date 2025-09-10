# 🛠️ Arbeitstisch-Konfigurator 3000™

Willkommen im vermutlich **weltweit einzigen** Arbeitstisch-Konfigurator,
bei dem nicht nur Tabellen, sondern auch echte Bilder ineinander geschoben werden.  
(Nein, es gibt keine Drag&Drop-Magie. Das hier ist die ehrliche Handwerksversion 💪)

---

## 🎯 Features

- **XML first!**  
  Alle Optionen, Layer und Offsets werden aus einer `config.xml` geladen.  
  Wenn du irgendwann statt Arbeitstischen Einhörner konfigurieren willst → einfach XML tauschen.

- **Dynamische Sidebar**  
  HTML ist faul. Alles in der Sidebar baut sich automatisch aus der XML auf.  
  Du musst nie wieder `<option>`s tippen wie ein Praktikant.  

- **Bilder-Overlays**  
  Kein 3D, kein WebGL, kein Metaverse.  
  Einfach PNGs übereinander wie in Photoshop 1999 – und trotzdem sexy.  

- **Eyecandy™**  
  Smooth-Fades und ein Akkordeon-Menü. Weil Konfigurieren ohne Animationen einfach traurig ist.  

---

## 📂 Projektstruktur

arbeitstisch-konfigurator/
├── index.html # Einstiegspunkt, minimalistisch wie ein IKEA-Regal
├── style.css # Macht das Ganze hübsch
├── script.js # Bringt Leben rein
├── config.xml # Herzstück mit allen Optionen, Offsets & Layern
├── bilder/ # Deine Assets, sortiert nach Ordnern
│ ├── grundtisch/
│ ├── seitenblenden/
│ └── aufbau/
└── README.md # Genau das, was du gerade liest

yaml
Code kopieren

---

## 🚀 Wie starten?

1. Repo klonen:
   ```bash
   git clone https://github.com/deinuser/arbeitstisch-konfigurator.git
   cd arbeitstisch-konfigurator
Öffne index.html im Browser.
(Ja, so einfach. Kein NPM, keine 4000 Dependencies, kein Webpack-Albtraum.)

Wenn du cool wirken willst: GitHub Pages aktivieren.
Dann läuft dein Konfigurator unter
https://deinuser.github.io/arbeitstisch-konfigurator/
(und alle halten dich für einen echten Web-Guru).

## 📝 ToDos
 Seitenblenden-Offsets für alle Breiten feintunen (Pixel-Feilschen ist Kunst).

 Bilder für „Aufbau hoch“ rendern.

 XML mal so umbauen, dass man auch Schränke oder Kaffeemaschinen konfigurieren kann.

 Konami-Code einbauen (↑ ↑ ↓ ↓ ← → ← → B A → Easter Egg?).

## 🤝 Contributing
Pull Requests sind willkommen!
Wenn du Codex bist: Willkommen im Projekt, mach’s bitte nicht kaputt.

## 🐛 Bugs?
Es gibt keine Bugs, nur „ungeplante Features“.
Wenn dir doch einer auffällt → Issue aufmachen und tief seufzen.

Viel Spaß beim Konfigurieren! 🎉
