# bartnick.eu

Statische Website, gehostet über GitHub Pages.

## Struktur

- `public/` — die gesamte Site (wird 1:1 als Pages-Root ausgeliefert)
  - `index.html` — Startseite
  - `ben/`, `lio/` — Lernapps der Kinder
  - `lumpi/` — Kartenspiel
  - `redact/`, `highlight/` — client-side Screenshot-Tools
  - `flip7/` — Monte-Carlo-Analyse zum Kartenspiel Flip 7 (Datenquelle: `sim/flip7_sim.py`)
  - `flug/` — Kalender-Generator für die Flugvorbereitung (`.ics` mit Anfahrt,
    Gepäckabgabe, Security, Boarding). Logik in `app.js`, Oberfläche in `ui.js`;
    beide ohne Abhängigkeiten. `app.js` ist auch in Node ladbar, für schnelle Checks:
    `node -e "const F=require('./public/flug/app.js'); console.log(F.computePlan({dp:'CGN',ar:'TFS',dd:'2026-09-12',dt:'13:10'},'x').events.map(e=>e.key))"`
  - `CNAME` — Custom Domain für GitHub Pages

## Deployment

Push auf `main` → der Workflow `.github/workflows/deploy.yml` lädt `public/`
als Artifact hoch und deployed es nach GitHub Pages. Kein Build-Schritt, reine
statische Dateien.

## Simulationen

- `sim/flip7_sim.py` — Monte Carlo + exakte Dynamische Programmierung für Flip 7.
  Erzeugt das JSON, das in `public/flip7/index.html` eingebettet ist:
  `python3 sim/flip7_sim.py results.json && python3 sim/flip7_sim.py results.json extras`
