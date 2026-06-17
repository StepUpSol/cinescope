# CineScope — Three Decades of Cinema, Decoded

> Interactive D3.js visualization of 2,913 films covering 1928–2015. Six coordinated, cross-filtering visualizations: streamgraph, log-log profit scatter, critics-vs-audience quadrant, profitability heatmap, director leaderboard, and a runtime ridgeline.

**Lab Terminal Project · DSC327 Data Visualization Techniques · BDS 6 · COMSATS University Islamabad**

**Team:**
- Muhammad Umar — FA23-BDS-031
- Muhammad Ali Arshad — FA23-BDS-024

**Live demo:** https://stepupsol.github.io/cinescope/

---

## What it does

CineScope is a coordinated multiple-view dashboard. Every chart reads from the same filter state, so a click anywhere narrows the rest. Filters available:

- **Year range** — D3 brush slider (1928 → 2015)
- **Genre chips** — 12 majors, multi-select
- **MPAA rating** — G, PG, PG-13, R, NC-17, Not Rated
- **Title or director search** — debounced text input
- **Cross-filter from charts** — brush the scatter, click a quadrant, click a heatmap cell, click a director bar, or click a genre band/legend

The sidebar runs a live **insights panel** that recomputes talking points (median ROI, top grosser, best multiple, critic-audience gap) for whatever is in view.

## The six visualizations

1. **The Genre Tides** — Streamgraph of annual releases per genre, wiggle offset, inside-out order.
2. **The Profit Galaxy** — Production budget vs worldwide gross on log-log scales, with a break-even diagonal. Dots sized by IMDb votes, colored by genre. Brushable.
3. **Critics vs Crowd** — RT% × IMDb scatter with four named quadrants (Universal Hits, Critic Darlings, Crowd-Pleasers, Universally Panned). Click a quadrant to filter.
4. **Profitability Heatmap** — Median ROI per genre × decade with a diverging color scale centered on break-even. Click a cell to zoom.
5. **Director Leaderboard** — Top 15 directors by aggregate worldwide gross. Each bar decomposes into individual films on hover. Click to lock.
6. **Runtime DNA** — Ridgeline plot (KDE) of runtime distributions per genre, with median markers.

## Tech

- **D3.js v7** loaded from CDN. No build step.
- **Vanilla ES modules** for chart code. One module per chart.
- **Python 3** for the one-time data preprocessing pass.
- **Dark cinematic theme** in plain CSS (no framework). Fraunces serif for display, Inter for UI.

## Run locally

```bash
# 1) Clone
git clone https://github.com/StepUpSol/cinescope.git
cd cinescope

# 2) (Optional) Regenerate the cleaned dataset from the raw source
python3 preprocess.py

# 3) Serve. The app needs a server because ES modules and JSON fetch
# require http:// not file://. Any static server works.
python3 -m http.server 8000

# 4) Open http://localhost:8000
```

## Data

The raw dataset is the well-known Vega Movies sample (3,201 films, 16 fields). It is included as `data/movies.json`. The preprocessing script (`preprocess.py`) cleans it to 2,913 films with derived fields (year, decade, ROI, profit, log-budget, log-gross) and writes `data/movies_clean.json`, which is what the front-end loads. A summary of the cleaning pass is written to `data/preprocessing_report.json` and surfaced in `DESIGN.md`.

## File layout

```
cinescope/
├── index.html              # single-page entry
├── css/style.css           # dark theme
├── js/
│   ├── main.js             # entry: load data, wire filters, mount charts
│   ├── state.js            # global reactive state + dispatch
│   ├── filters.js          # year brush, chips, search
│   ├── insights.js         # auto-computed insight bullets
│   ├── utils.js            # color scales, formatters, tooltip, KDE
│   ├── d3.js               # global d3 re-export shim
│   └── charts/
│       ├── streamGraph.js
│       ├── profitScatter.js
│       ├── criticAudience.js
│       ├── heatmap.js
│       ├── directorBar.js
│       └── runtimeRidge.js
├── data/
│   ├── movies.json                  # raw (1.4 MB)
│   ├── movies_clean.json            # cleaned (front-end loads this)
│   └── preprocessing_report.json    # missingness, distributions, year range
├── preprocess.py
├── DESIGN.md               # design rationale + EDA report
└── README.md
```

## Hosting

Deployed via GitHub Pages from the `main` branch. The `.nojekyll` file ensures Pages serves the `js/` and `data/` directories without filtering.

## Credits

- Dataset: Vega sample data, originating from The Numbers + IMDb + Rotten Tomatoes
- Charts: D3.js (Mike Bostock and contributors)
- Fonts: Fraunces (Undercase Type) and Inter (Rasmus Andersson)
