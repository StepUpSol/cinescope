// Filter sidebar wiring: year slider (D3 brush), genre + MPAA chips, search.

import { d3 } from "./d3.js";
import { state, emit, resetAll } from "./state.js";
import { GENRE_ORDER, MPAA_ORDER, genreColor } from "./utils.js";

export function setupFilters() {
  // Year slider — uses a custom D3 brush
  const slider = d3.select("#year-slider");
  const w = slider.node().getBoundingClientRect().width || 232;
  const h = 30;
  const svg = slider.append("svg").attr("width", w).attr("height", h).style("overflow", "visible");

  const x = d3.scaleLinear().domain(state.yearExtent).range([0, w]);

  // Track
  svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", h/2).attr("y2", h/2)
    .attr("stroke", "var(--ink-3)").attr("stroke-width", 4).attr("stroke-linecap", "round");

  const brush = d3.brushX()
    .extent([[0, 0], [w, h]])
    .on("brush end", ({ selection }) => {
      if (!selection) return;
      const [a, b] = selection.map(x.invert).map(Math.round);
      if (a === state.yearMin && b === state.yearMax) return;
      state.yearMin = a; state.yearMax = b;
      d3.select("#year-min").text(a);
      d3.select("#year-max").text(b);
      emit();
    });
  const brushG = svg.append("g").attr("class", "brush").call(brush);
  brushG.call(brush.move, [x(state.yearMin), x(state.yearMax)]);

  // Hide brush overlay so only selection is interactive
  brushG.select(".overlay").attr("cursor", "crosshair");

  // Genre chips
  const gWrap = d3.select("#genre-chips");
  gWrap.selectAll(".chip").data(GENRE_ORDER).join("div")
    .attr("class", "chip")
    .text(d => d)
    .style("border-left", d => `3px solid ${genreColor(d)}`)
    .on("click", (evt, g) => {
      if (state.genres.has(g)) state.genres.delete(g);
      else state.genres.add(g);
      d3.select(evt.currentTarget).classed("active", state.genres.has(g));
      emit();
    });

  // MPAA chips
  const mWrap = d3.select("#mpaa-chips");
  mWrap.selectAll(".chip").data(MPAA_ORDER).join("div")
    .attr("class", "chip")
    .text(d => d)
    .on("click", (evt, m) => {
      if (state.mpaa.has(m)) state.mpaa.delete(m);
      else state.mpaa.add(m);
      d3.select(evt.currentTarget).classed("active", state.mpaa.has(m));
      emit();
    });

  // Search (debounced)
  let timer;
  d3.select("#search").on("input", function() {
    clearTimeout(timer);
    const v = this.value;
    timer = setTimeout(() => { state.search = v; emit(); }, 180);
  });

  // Reset
  d3.select("#reset").on("click", () => {
    resetAll();
    // Reset visual state
    brushG.call(brush.move, [x(state.yearMin), x(state.yearMax)]);
    d3.select("#year-min").text(state.yearMin);
    d3.select("#year-max").text(state.yearMax);
    gWrap.selectAll(".chip").classed("active", false);
    mWrap.selectAll(".chip").classed("active", false);
    d3.select("#search").property("value", "");
  });
}
