# bartnick.eu

Statische Website, gehostet über GitHub Pages.

## Struktur

- `public/` — die gesamte Site (wird 1:1 als Pages-Root ausgeliefert)
  - `index.html` — Startseite
  - `ben/`, `lio/` — Lernapps der Kinder
  - `lumpi/` — Kartenspiel
  - `redact/`, `highlight/` — client-side Screenshot-Tools
  - `CNAME` — Custom Domain für GitHub Pages

## Deployment

Push auf `main` → der Workflow `.github/workflows/deploy.yml` lädt `public/`
als Artifact hoch und deployed es nach GitHub Pages. Kein Build-Schritt, reine
statische Dateien.
