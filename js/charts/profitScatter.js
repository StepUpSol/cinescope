// 2 — Profit Galaxy: log(budget) vs log(worldwide). Brush to cross-filter.

import { d3 } from "../d3.js";
import { state, filteredData, emit } from "../state.js";
import { genreColor, tt, fmtMoney, fmtX, widthOf } from "../utils.js";

export function profitScatter(selector) {
  const host = d3.select(selector);
  const margin = { top: 20, right: 30, bottom: 50, left: 70 };
  let svg, gDots, gX, gY, gDiag, gBrush, width, height = 460, brush;

  function build() {
    host.selectAll("*").remove();
    width = widthOf(host);
    svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    // axes & gridlines
    svg.append("g").attr("class", "grid-y");
    svg.append("g").attr("class", "grid-x");
    gDiag = svg.append("g");
    gDots = svg.append("g");
    gX = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`);
    gY = svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`);
    // axis titles
    svg.append("text").attr("class", "axis-title")
      .attr("x", width / 2).attr("y", height - 8).attr("text-anchor", "middle")
      .text("Production budget (log scale)");
    svg.append("text").attr("class", "axis-title")
      .attr("transform", `translate(16,${height/2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .text("Worldwide gross (log scale)");
    gBrush = svg.append("g").attr("class", "brush");
  }

  function render() {
    if (!svg) build();
    const all = filteredData().filter(d => d.log_budget != null && d.log_ww != null);

    const x = d3.scaleLog().domain([1e4, 5e8]).range([margin.left, width - margin.right]).nice();
    const y = d3.scaleLog().domain([1e3, 5e9]).range([height - margin.bottom, margin.top]).nice();

    gX.transition().duration(400).call(
      d3.axisBottom(x).ticks(8, "$~s").tickSize(-(height - margin.top - margin.bottom))
    );
    gY.transition().duration(400).call(
      d3.axisLeft(y).ticks(8, "$~s").tickSize(-(width - margin.left - margin.right))
    );
    svg.selectAll(".axis .tick line").attr("class", "gridline");
    svg.selectAll(".axis .domain").attr("stroke", "var(--grid-strong)");

    // Diagonal break-even line (budget == ww)
    const diagData = d3.range(4, 9.7, 0.1).map(p => ({ b: 10 ** p, w: 10 ** p }));
    const diagLine = d3.line().x(d => x(d.b)).y(d => y(d.w));
    const diag = gDiag.selectAll("path.diag").data([diagData]);
    diag.enter().append("path").attr("class", "diag")
      .attr("fill", "none").attr("stroke", "var(--paper-dim)")
      .attr("stroke-dasharray", "4 4").attr("stroke-width", 1)
      .merge(diag).attr("d", diagLine);
    // Label
    gDiag.selectAll("text.diag-lbl").data([0]).join("text").attr("class", "diag-lbl")
      .attr("x", x(2e8)).attr("y", y(2.5e8) - 6)
      .attr("fill", "var(--paper-dim)").attr("font-size", 10).attr("font-style", "italic")
      .attr("text-anchor", "end").text("break-even line");

    // Dots — size by votes, color by genre
    const r = d3.scaleSqrt().domain([0, d3.max(all, d => d.votes) || 1]).range([2, 9]);
    const dots = gDots.selectAll("circle").data(all, d => d.title + d.year);
    dots.exit().transition().duration(300).attr("r", 0).remove();
    dots.enter().append("circle")
        .attr("cx", d => x(d.budget))
        .attr("cy", d => y(d.ww_gross))
        .attr("r", 0)
        .attr("fill", d => genreColor(d.genre))
        .attr("opacity", 0.55)
        .attr("stroke", "rgba(0,0,0,0.4)").attr("stroke-width", 0.5)
        .on("mousemove", (evt, d) => {
          tt.show(`
            <div class="tt-title">${d.title} <span style="color:var(--paper-dim);font-weight:400">(${d.year})</span></div>
            <div class="tt-row"><span>Director</span><span>${d.director || "—"}</span></div>
            <div class="tt-row"><span>Genre</span><span>${d.genre}</span></div>
            <div class="tt-row"><span>Budget</span><span>${fmtMoney(d.budget)}</span></div>
            <div class="tt-row"><span>Worldwide</span><span>${fmtMoney(d.ww_gross)}</span></div>
            <div class="tt-row"><span>ROI</span><span>${fmtX(d.roi)}</span></div>
            <div class="tt-row"><span>IMDb</span><span>${d.imdb ?? "—"}</span></div>
          `, evt);
        })
        .on("mouseleave", () => tt.hide())
      .merge(dots)
      .transition().duration(400)
        .attr("cx", d => x(d.budget))
        .attr("cy", d => y(d.ww_gross))
        .attr("r", d => r(d.votes || 0))
        .attr("fill", d => genreColor(d.genre));

    // Brush
    brush = d3.brush()
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .on("end", brushed);
    gBrush.call(brush);

    function brushed({ selection }) {
      if (!selection) {
        if (state.scatterBrush) { state.scatterBrush = null; emit(); }
        return;
      }
      const [[x0, y0], [x1, y1]] = selection;
      // convert pixel → data → log10
      state.scatterBrush = [
        Math.log10(x.invert(x0)), Math.log10(x.invert(x1)),
        Math.log10(y.invert(y1)), Math.log10(y.invert(y0)),
      ];
      emit();
    }

    // Caption
    const profitable = all.filter(d => d.roi > 1).length;
    const ratio = all.length ? (profitable / all.length * 100).toFixed(0) : 0;
    const medROI = all.length ? d3.median(all, d => d.roi) : 0;
    d3.select("#cap-scatter").html(
      `Of ${all.length} films above with full financials, <strong>${ratio}%</strong> recouped their budget. Median ROI: <strong>${medROI ? medROI.toFixed(2) + "×" : "—"}</strong>. Dots above the diagonal made money, below lost it.`
    );
  }

  return { render };
}
