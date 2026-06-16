// CineScope — entry point.

import { d3 } from "./d3.js";
import { state, on, emit } from "./state.js";
import { setupFilters } from "./filters.js";
import { renderInsights } from "./insights.js";

import { streamGraph }     from "./charts/streamGraph.js";
import { profitScatter }   from "./charts/profitScatter.js";
import { criticAudience }  from "./charts/criticAudience.js";
import { heatmap }         from "./charts/heatmap.js";
import { directorBar }     from "./charts/directorBar.js";
import { runtimeRidge }    from "./charts/runtimeRidge.js";

const HOSTS = [
  "#chart-stream","#chart-scatter","#chart-quadrant",
  "#chart-heatmap","#chart-directors","#chart-runtime",
];

async function boot() {
  // Loading placeholders
  HOSTS.forEach(h => d3.select(h).html(`<div class="loading">Loading films…</div>`));

  let data;
  try {
    data = await d3.json("data/movies_clean.json");
  } catch (e) {
    HOSTS.forEach(h => d3.select(h).html(`<div class="loading">Failed to load data. ${e.message}</div>`));
    return;
  }

  state.raw = data;
  state.yearExtent = d3.extent(data, d => d.year);

  setupFilters();

  // Instantiate charts
  const charts = [
    streamGraph("#chart-stream"),
    profitScatter("#chart-scatter"),
    criticAudience("#chart-quadrant"),
    heatmap("#chart-heatmap"),
    directorBar("#chart-directors"),
    runtimeRidge("#chart-runtime"),
  ];

  const renderAll = () => {
    charts.forEach(c => c.render());
    renderInsights();
  };

  on("change", renderAll);
  emit();

  // Re-render on resize (debounced)
  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      // Force rebuild by clearing hosts
      HOSTS.forEach(h => d3.select(h).selectAll("svg").remove());
      // Recreate charts since their internal SVG refs are gone
      charts[0] = streamGraph("#chart-stream");
      charts[1] = profitScatter("#chart-scatter");
      charts[2] = criticAudience("#chart-quadrant");
      charts[3] = heatmap("#chart-heatmap");
      charts[4] = directorBar("#chart-directors");
      charts[5] = runtimeRidge("#chart-runtime");
      renderAll();
    }, 200);
  });
}

boot();
