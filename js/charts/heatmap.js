// 4 — Profitability heatmap: median ROI by Genre × Decade. Diverging color.

import { d3 } from "../d3.js";
import { state, filteredData, emit } from "../state.js";
import { GENRE_ORDER, tt, fmtX, fmtNum, widthOf } from "../utils.js";

export function heatmap(selector) {
  const host = d3.select(selector);
  const margin = { top: 20, right: 100, bottom: 30, left: 160 };
  let svg, gCells, gX, gY, gLegend, width, height = 360;

  function build() {
    host.selectAll("*").remove();
    width = widthOf(host);
    svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    gCells = svg.append("g");
    gX = svg.append("g").attr("class", "axis");
    gY = svg.append("g").attr("class", "axis");
    gLegend = svg.append("g");
  }

  function render() {
    if (!svg) build();
    const data = filteredData().filter(d => d.roi != null);
    const decades = d3.range(Math.floor(state.yearMin / 10) * 10, Math.ceil((state.yearMax + 1) / 10) * 10, 10);
    const genres = GENRE_ORDER.filter(g => data.some(d => d.genre === g));

    const x = d3.scaleBand().domain(decades).range([margin.left, width - margin.right]).padding(0.05);
    const y = d3.scaleBand().domain(genres).range([margin.top, height - margin.bottom]).padding(0.05);

    // Compute median ROI + count per cell
    const cells = [];
    for (const g of genres) for (const dec of decades) {
      const rows = data.filter(d => d.genre === g && d.decade === dec);
      cells.push({
        g, dec,
        n: rows.length,
        med: rows.length ? d3.median(rows, r => r.roi) : null,
      });
    }

    // Diverging color around break-even (ROI = 1). log1p for stability.
    const color = d3.scaleDiverging(t => d3.interpolateRgb("#e07a5f", "#0a0d12")(1 - t))
      .domain([0, 1, 6])
      .interpolator(d3.interpolateRgbBasis(["#e07a5f", "#5a3a3a", "#1a2230", "#2d8a8a", "#4ecdc4"]));

    // Cells
    const sel = gCells.selectAll("rect.cell").data(cells, d => d.g + d.dec);
    sel.exit().remove();
    sel.enter().append("rect").attr("class", "cell")
        .attr("rx", 3)
      .merge(sel)
        .attr("x", d => x(d.dec))
        .attr("y", d => y(d.g))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => d.med == null ? "rgba(255,255,255,0.04)" : color(d.med))
        .attr("stroke", "var(--ink-1)").attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mousemove", (evt, d) => {
          tt.show(`
            <div class="tt-title">${d.g} · ${d.dec}s</div>
            <div class="tt-row"><span>Films</span><span>${fmtNum(d.n)}</span></div>
            <div class="tt-row"><span>Median ROI</span><span>${d.med == null ? "—" : fmtX(d.med)}</span></div>
            <div class="tt-row"><span>Verdict</span><span>${d.med == null ? "no data" : d.med > 2 ? "very profitable" : d.med > 1 ? "profitable" : d.med > 0.5 ? "underwater" : "disaster"}</span></div>
          `, evt);
        })
        .on("mouseleave", () => tt.hide())
        .on("click", (evt, d) => {
          // Cell click: narrow year + toggle genre
          state.yearMin = d.dec;
          state.yearMax = d.dec + 9;
          state.genres.clear();
          state.genres.add(d.g);
          emit();
        });

    // Cell numeric labels (only big enough cells)
    const labels = gCells.selectAll("text.lbl").data(cells.filter(d => d.med != null), d => d.g + d.dec);
    labels.exit().remove();
    labels.enter().append("text").attr("class", "lbl")
        .attr("font-size", 10).attr("text-anchor", "middle").attr("pointer-events", "none")
      .merge(labels)
        .attr("x", d => x(d.dec) + x.bandwidth() / 2)
        .attr("y", d => y(d.g) + y.bandwidth() / 2 + 3)
        .attr("fill", d => d.med > 2.5 || d.med < 0.7 ? "rgba(0,0,0,0.7)" : "var(--paper)")
        .text(d => fmtX(d.med));

    // Axes
    gX.attr("transform", `translate(0,${margin.top})`).call(
      d3.axisTop(x).tickFormat(d => d + "s").tickSize(0)
    ).select(".domain").remove();
    gY.attr("transform", `translate(${margin.left},0)`).call(
      d3.axisLeft(y).tickSize(0)
    ).select(".domain").remove();
    svg.selectAll(".axis text").attr("fill", "var(--paper-dim)");

    // Legend (color bar)
    const lx = width - margin.right + 20;
    gLegend.selectAll("*").remove();
    const lgScale = d3.scaleLinear().domain([0, 6]).range([height - margin.bottom, margin.top]);
    const stops = d3.range(0, 6.05, 0.25);
    const defs = gLegend.append("defs");
    const grad = defs.append("linearGradient").attr("id", "lg-roi")
      .attr("x1", "0%").attr("x2", "0%").attr("y1", "100%").attr("y2", "0%");
    stops.forEach(s => grad.append("stop").attr("offset", (s/6*100) + "%").attr("stop-color", color(s)));
    gLegend.append("rect").attr("x", lx).attr("y", margin.top)
      .attr("width", 14).attr("height", height - margin.bottom - margin.top)
      .attr("fill", "url(#lg-roi)").attr("rx", 3);
    const lgAxis = d3.axisRight(lgScale).tickValues([0, 1, 2, 3, 4, 6]).tickFormat(d => d + "×");
    gLegend.append("g").attr("transform", `translate(${lx + 14},0)`).call(lgAxis)
      .selectAll("text").attr("fill", "var(--paper-dim)").attr("font-size", 10);
    gLegend.selectAll(".domain, .tick line").attr("stroke", "var(--grid)");
    gLegend.append("text").attr("class", "axis-title")
      .attr("transform", `translate(${lx + 60},${(height)/2}) rotate(-90)`)
      .attr("text-anchor", "middle").text("Median ROI");

    // Caption
    const best = d3.greatest(cells.filter(c => c.n >= 5), c => c.med);
    const worst = d3.least(cells.filter(c => c.n >= 5), c => c.med);
    d3.select("#cap-heatmap").html(
      best && worst ?
      `Best cell: <strong>${best.g}</strong> in the ${best.dec}s at ${fmtX(best.med)} (n=${best.n}). Worst: <strong>${worst.g}</strong> in the ${worst.dec}s at ${fmtX(worst.med)} (n=${worst.n}). Cells with fewer than 5 films are dimmed.`
      : `Not enough films for a heatmap at this zoom.`
    );
  }

  return { render };
}
