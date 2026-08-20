# bartnick.eu

Statische Website, gehostet über GitHub Pages.

## Struktur

- `public/` — die gesamte Site (wird 1:1 als Pages-Root ausgeliefert)
  - `index.html` — Startseite
  - `ben/`, `lio/` — Lernapps der Kinder
  - `lumpi/` — Kartenspiel
  - `redact/`, `highlight/` — client-side Screenshot-Tools
  - `flip7/` — Monte-Carlo-Analyse zum Kartenspiel Flip 7 (Datenquelle: `sim/flip7_sim.py`)
  - `CNAME` — Custom Domain für GitHub Pages

## Deployment

Push auf `main` → der Workflow `.github/workflows/deploy.yml` lädt `public/`
als Artifact hoch und deployed es nach GitHub Pages. Kein Build-Schritt, reine
statische Dateien.

## Simulationen

- `sim/flip7_sim.py` — Monte Carlo + exakte Dynamische Programmierung für Flip 7.
  Erzeugt das JSON, das in `public/flip7/index.html` eingebettet ist:
  `python3 sim/flip7_sim.py results.json && python3 sim/flip7_sim.py results.json extras`
