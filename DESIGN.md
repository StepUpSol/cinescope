# CineScope — Design Documentation

> The report deliverable for the Lab Terminal Project, DSC327. Covers dataset, preprocessing, EDA, visualization choices and their justification, interaction techniques, and the challenges that shaped the final design.

**Authors:** Muhammad Umar (FA23-BDS-031), Muhammad Asharib Khan (FA23-BDS-025)
**Course:** DSC327 — Data Visualization Techniques · BDS 6 · COMSATS Islamabad

---

## 1. Dataset Overview

**Source:** Vega Movies sample dataset (a public dataset assembled from The Numbers, IMDb, and Rotten Tomatoes). It is widely used in visualization teaching because it crosses three otherwise-separate domains — box office economics, critical reception, and audience reception — in a single table.

**Size:** 3,201 rows × 16 columns.

**Columns and what they mean:**

| Column | Type | Description |
|---|---|---|
| Title | string | Film title |
| US Gross | number | US theatrical gross (USD) |
| Worldwide Gross | number | Global theatrical gross (USD) |
| US DVD Sales | number | US home video sales (USD) |
| Production Budget | number | Reported production cost (USD) |
| Release Date | string | Release date, e.g. "Jun 12 1998" |
| MPAA Rating | string | G, PG, PG-13, R, NC-17, or Not Rated |
| Running Time min | number | Minutes |
| Distributor | string | Theatrical distributor |
| Source | string | Original source material (Original Screenplay, Novel, etc.) |
| Major Genre | string | 12 categories |
| Creative Type | string | Tone (Contemporary Fiction, Fantasy, etc.) |
| Director | string | Director name |
| Rotten Tomatoes Rating | number | Critic score, 0–100 |
| IMDB Rating | number | Audience score, 0–10 |
| IMDB Votes | number | Number of audience votes |

**Why this dataset:** every group in the cohort needed a distinct dataset. Cinema was chosen because (a) it gives genuinely multivariate data — money, critics, audience, time, runtime, genre — that no single chart type can fully express, and (b) the audience for the viva already has intuitions about it ("Avatar should be the top grosser, right?") so the visualizations can be evaluated against domain knowledge in the room.

## 2. Data Preprocessing

The pipeline is in `preprocess.py`. It is deliberately conservative: each transformation is logged so the cleaning is auditable.

### 2.1 Missingness audit

A pre-cleaning sweep counted nulls per column (output: `data/preprocessing_report.json`). Key numbers:

| Field | % missing |
|---|---:|
| US DVD Sales | 82.4 |
| Running Time | 62.2 |
| Director | 41.6 |
| Rotten Tomatoes Rating | 27.5 |
| MPAA Rating | 18.9 |
| Major Genre | 8.6 |
| IMDb Rating | 6.7 |
| Worldwide Gross | 0.2 |
| Production Budget | 0.0 |

This drove two decisions: (a) `US DVD Sales` is dropped entirely because four in five rows have no value; and (b) each chart guards against the nulls relevant to it (the runtime ridgeline only uses films with non-null runtime, the critic/audience quadrant only films with both scores, etc.) rather than dropping rows globally.

### 2.2 Row filtering

| Step | Rows lost | Why |
|---|---:|---|
| Drop unparseable / out-of-range release dates | 21 | Two date formats coexisted ("Jun 12 1998" and "1998-06-12"); a small number were unparseable or clearly wrong (pre-1915 or future) |
| Drop rows with no Major Genre | 267 | Genre is a primary visual encoding in five of six charts; imputing would be misleading |
| **Final** | **2,913 rows kept (91.0%)** | |

### 2.3 Derived fields

Three derived fields make the rest of the application possible:

```python
year       = int(parse(Release Date).year)
decade     = (year // 10) * 10
roi        = Worldwide Gross / Production Budget        # if both > 0
profit     = Worldwide Gross - Production Budget
log_budget = log10(Production Budget)                   # for log-log scatter
log_ww     = log10(Worldwide Gross)
```

`log_budget` and `log_ww` are precomputed so the scatter brush can store its selection in log-space cheaply.

### 2.4 Type normalization

- All numeric columns coerced from JSON nulls to JavaScript `null` (not 0) so charts can distinguish "no data" from "zero dollars."
- `MPAA Rating` nulls were re-labeled `"Not Rated"` rather than dropped, because that is the meaningful interpretation — these films exist, they were simply never submitted to the MPAA.

## 3. Exploratory Data Analysis

EDA was the bridge between knowing what columns exist and knowing what stories the data can tell. Six findings from EDA shaped the final visualization choices.

### 3.1 The time axis is heavily skewed toward the 2000s

| Decade | Films |
|---|---:|
| 1920s | 1 |
| 1930s | 4 |
| 1940s | 2 |
| 1950s | 13 |
| 1960s | 32 |
| 1970s | 56 |
| 1980s | 237 |
| 1990s | 729 |
| **2000s** | **1,758** |
| 2010s | 81 |

> **Design consequence:** the year slider defaults to **1980–2015** rather than to the full extent. Any visualization that defaults to 1920–2015 would be visually dominated by a single decade and would mislead the viewer. The 1980-onwards window keeps every chart populated.

### 3.2 Genre distribution is long-tailed

Twelve genres, but two of them — Drama (784) and Comedy (674) — account for **half** of the corpus. Five small genres each have fewer than 50 films: Musical (49), Documentary (43), Western (36), Black Comedy (36), Concert/Performance (5).

> **Design consequence:** the streamgraph uses `stackOrderInsideOut` so small genres sit at the edges and don't get lost in the middle. The heatmap dims cells with n < 5.

### 3.3 ROI is right-skewed; medians beat means

The mean ROI across all financed films is **6.9×**, dragged up by extreme outliers (Paranormal Activity famously turned $15,000 into $193M, an ROI of ~12,876×). The **median** is **1.86×**. Sixty-seven percent of films recoup their budget.

> **Design consequence:** the heatmap, the insights panel, and the scatter caption all use **median, not mean**. The Profit Galaxy uses a **log-log scale** so a $15k indie and a $300M blockbuster can both fit on the same canvas without one collapsing the axis.

### 3.4 Critics and audiences agree more than the discourse suggests

A simple correlation between Rotten Tomatoes and IMDb in the dataset is **r ≈ 0.7** — strong but not perfect. The interesting films are the ones in the off-diagonal quadrants. EDA showed:

| Quadrant | Definition | Share |
|---|---|---:|
| Universal Hits | RT ≥ 60 AND IMDb ≥ 7 | ~26% |
| Critic Darlings | RT ≥ 60 AND IMDb < 7 | ~18% |
| Crowd-Pleasers | RT < 60 AND IMDb ≥ 7 | ~3% |
| Universally Panned | RT < 60 AND IMDb < 7 | ~53% |

The thresholds (60% / 7.0) were chosen because RT itself uses 60% as the "Fresh" threshold and IMDb 7.0 is the audience-consensus inflection point in this corpus. The fact that the **Crowd-Pleasers** quadrant is the smallest is itself a finding: when critics hate something, audiences almost always agree. The reverse — Critic Darlings — is six times more common.

> **Design consequence:** the quadrant labels are not decoration; each quadrant is independently clickable as a filter, because telling the four categories apart is one of the most interesting things the dataset supports.

### 3.5 Runtime is genre-specific

Comedies cluster tightly around 95 minutes. Documentaries average about 105 but with a long left tail. Dramas spread the widest. Westerns and epics drift past two hours. A single histogram of all runtimes would average these signatures away.

> **Design consequence:** a **ridgeline plot** (stacked KDEs) preserves every genre's distribution shape rather than collapsing to one summary number. Medians are marked with dashed lines so the comparison is also numeric, not just visual.

### 3.6 A handful of directors dominate

Spielberg, Cameron, Zemeckis, and Jackson each aggregate billions in worldwide gross across the kept rows. A flat top-N table would be one option, but it would lose the **composition** — Spielberg's billions are spread across 19 films of many genres; Cameron's are concentrated in three.

> **Design consequence:** the leaderboard uses **stacked bars** where each segment is a single film, colored by genre. Hovering a segment surfaces the film. The chart shows ranking and composition simultaneously.

## 4. Choice of Visualizations and Justification

The six visualizations were chosen as a **coordinated multiple view** system. Each one answers a question the others can't. The mapping from question to encoding:

| # | Question | Chart | Why this chart |
|--:|---|---|---|
| 1 | How has each genre's volume changed over time? | **Streamgraph** | Time on x and genre on color is the natural mapping for "tides." Wiggle offset removes the visual bias of a fixed baseline, which is appropriate when the question is *share over time*, not *exact counts*. |
| 2 | Does budget predict box office? Which films broke that pattern? | **Log-log scatter** with break-even diagonal | Budget and gross both span six orders of magnitude. Linear scales would collapse 80% of the data into a corner. Log-log gives every film visual weight. The diagonal makes profitability instantly readable — a Mackinlay-friendly use of *position* for the most important channel. |
| 3 | When do critics and audiences disagree? | **Quadrant scatter** | Two continuous variables, both ordinal, both bounded. The reference lines at 60% / 7.0 turn an undifferentiated point cloud into four named groups, which is what the question is really asking about. |
| 4 | Which genre × decade combinations actually made money? | **Heatmap** with diverging color | The cross-tab of two categorical variables is exactly what a heatmap is for. Median ROI is bounded around 1.0 (break-even), so a **diverging** scale centered on 1.0 carries the meaning directly: orange = bad, teal = good. Numeric labels inside cells give precision on top of color. |
| 5 | Who are the biggest directors, and how do they get there? | **Stacked horizontal bars** | Bars rank cleanly. The stacking turns each bar into a film-level decomposition. Color = genre ties this chart visually to the streamgraph. |
| 6 | What does the shape of each genre's typical runtime look like? | **Ridgeline (KDE)** | A grouped histogram would hide the multi-modal nature of e.g. Drama. KDEs preserve distribution shape. Stacking ridges saves vertical space and lets the eye compare shapes across genres at a glance. |

**The principles of graphical integrity** (Tufte) that guided every choice:

- **Position is the most accurate channel**, so the *most important* variable in each chart gets the x or y axis (gross in chart 2, RT/IMDb in chart 3, ROI in chart 4, gross in chart 5, runtime in chart 6).
- **Color is reserved for the categorical "anchor"** — genre — and a single diverging scale for ROI. We do not encode three categories on top of each other with hue, lightness, and pattern.
- **Aspect ratios** are wider than tall on continuous-x charts (1, 2, 6) and taller for the categorical ranking (5). This is the Banking-to-45° heuristic.
- **No chartjunk**: gridlines are dashed at low opacity. The only decorative elements are the quadrant labels — and they are functional, not decorative.

## 5. Interaction Techniques

The deliverable explicitly required filtering, zooming, tooltips, and dynamic updates. Each is implemented as follows.

### 5.1 Filtering (six independent vectors, all chained)

A single global state object (`js/state.js`) holds the filter vector. Any chart can mutate it; all charts re-render. The vectors are:

1. **Year range** — a D3 brush on a 1928–2015 axis
2. **Genre set** — chip toggles in the sidebar AND clickable bands in the streamgraph
3. **MPAA set** — chip toggles
4. **Free-text search** — title or director, 180 ms debounced
5. **Selected director** — locked by clicking a bar in chart 5
6. **Selected quadrant** — locked by clicking a quadrant in chart 3
7. **Brushed scatter region** — rectangular selection on chart 2

This is more than "filtering" in the rubric's narrow sense — it's **brushing and linking** across coordinated views (Becker & Cleveland, 1987). Every chart is both a producer and a consumer of filter state.

### 5.2 Zooming

The scatter (chart 2) supports rectangular brush-to-filter. Pulling a rectangle around, for example, "$10M–$100M budgets that grossed under $30M" instantly narrows every other chart to those films — the heatmap, the ridgeline, and the director leaderboard all recompute. This is **semantic zoom by selection** rather than canvas-zoom, which is more informative because it teaches the user to ask questions across the whole dashboard.

The year brush is a one-dimensional version of the same idea.

### 5.3 Tooltips

A single shared tooltip element (`#tooltip`) is repositioned by every chart. Tooltips include:

- The film title and year on hover
- Domain-specific rows (budget, gross, ROI, RT, IMDb, votes) — different fields for different charts
- For the heatmap, a verdict ("very profitable", "disaster") that humanizes the number
- For the streamgraph, peak year and peak count for the hovered genre

Tooltips reposition themselves to stay on-screen at the edges.

### 5.4 Dynamic updates

Every chart implements `render()`, which is a full re-render against current filtered data using D3's **enter/update/exit** pattern with 300–500 ms transitions. There is no "redraw flash." The director leaderboard reorders smoothly when filters change; the heatmap cells recolor in place; the ridgeline morphs.

A `dispatch` event bus (`js/state.js`) calls `render()` on all six charts when state changes, plus the auto-insights panel and the four hero stats.

### 5.5 Responsive layout

A debounced `resize` listener tears down and rebuilds all charts at the new container width. Below 980px, the sidebar collapses above the charts and the hero stats reflow to a 2-column grid.

## 6. Auto-Insights Panel

A subtle but high-value piece of the design: the sidebar shows live, computed sentences describing the current filter slice. Examples that appear automatically:

- "Median ROI is 2.0×, with 70% of films breaking even."
- "Action leads volume with 401 of 401 films." (after selecting genre = Action)
- "Top grosser: Avatar (2009) at $2.77B."
- "Best multiple: Saw turned $1.2M into $103.1M (85.9×)."
- "Audiences rate this slice 1.04 pts higher than critics on a 10-pt scale."

Justification: visualizations excel at distribution and pattern; numbers excel at exact magnitudes. Pairing them is more useful than either alone, and it removes the need for the viewer to mentally compute medians while exploring.

## 7. Challenges Encountered and Solutions

### 7.1 Six-orders-of-magnitude financial data

A linear scatter of budget vs gross would collapse 80% of the corpus into the bottom-left corner. **Solution:** log-log axes with formatted tick labels ($10k, $1M, $1B). The break-even diagonal becomes a 45° line, which is geometrically and semantically meaningful — anything above it made money.

### 7.2 The 2000s dominate the corpus

A naive default of "show everything" would make the 1980s, 1990s, and 2010s look empty by comparison. **Solution:** default the year slider to 1980–2015 and dim heatmap cells with n < 5. The full extent (1928–2015) is still one drag away.

### 7.3 ROI outliers break color scales

Paranormal Activity at ~13,000× ROI is real, but if it lives on a linear color scale, every other cell becomes the same color. **Solution:** median (not mean) inside heatmap cells, plus a custom diverging interpolator (`["#e07a5f", "#5a3a3a", "#1a2230", "#2d8a8a", "#4ecdc4"]`) clamped at 6× so the visual signal is preserved for the 99% of cases below that.

### 7.4 Genre order matters in stacked charts

D3's default order in a streamgraph puts genres in input order, which made the chart look chaotic. **Solution:** `d3.stackOrderInsideOut` places the largest series in the middle and progressively smaller series outward, which gives the streamgraph its characteristic flowing shape.

### 7.5 KDE bandwidth selection for the ridgeline

Too narrow and the ridges look like fences; too wide and Drama's bimodality disappears. **Solution:** Epanechnikov kernel with bandwidth 8, chosen by trial against the known signature of Documentaries (short, left-skewed) and Westerns (long, right-tailed). Each ridge's density is normalized to its own max so small-n genres (Musical, Concert) get the same visual weight as Drama.

### 7.6 Cross-filtering without performance death

With seven filter vectors and six charts re-rendering on every change, a naive implementation locks up the browser. **Solution:** (a) precompute `log_budget`, `log_ww`, `decade` once in `preprocess.py`; (b) debounce the text search (180 ms); (c) use D3's enter/update/exit so unchanged elements are not re-created; (d) keep the cleaned JSON to ~700 KB so the initial load is single-digit MB.

### 7.7 Coordinated state without a framework

The deliverable specifies D3 specifically — no React, no Vue. **Solution:** a single mutable `state` object plus a `d3.dispatch("change")` bus. Every chart subscribes; every interaction emits. This is roughly 20 lines of code in `js/state.js` and replaces what would be a Redux store in a typical SPA.

### 7.8 Dark theme legibility

Dark themes look cinematic but ruin contrast on small text and faint gridlines. **Solution:** the palette in `:root` was tuned against WCAG AA contrast — paper text on ink-1 background is 11.5:1, axis text on the same background is 5.8:1. Genre colors were hand-picked to be distinguishable both from each other and from the background (avoiding pure white and pure black).

## 8. What this project demonstrates (CLO 5)

CLO 5 is **"develop a web-based system using interactive visualization techniques and libraries."** The six charts and seven filter vectors satisfy each clause:

- **Web-based** — pure HTML/CSS/ES-modules, deployable to GitHub Pages with no build step
- **System** — coordinated views, not isolated charts, with a shared state bus
- **Interactive** — brushing, linking, hovering, clicking, searching, all chained
- **Techniques** — streamgraph (Byron & Wattenberg), ridgeline (Wilke), heatmap, log-log scatter, quadrant labeling
- **Libraries** — D3.js v7 (scales, brushes, axes, areas, stacks, KDEs, dispatches)

The project is up on GitHub Pages at the URL in the README. The codebase is six chart modules totaling roughly 800 lines of JavaScript plus a 120-line state/utils layer — small enough to maintain, large enough to demonstrate that visualization design is a discipline, not a one-liner.
