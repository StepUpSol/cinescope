// 6 — Runtime ridgeline. KDE per genre, stacked vertically.

import { d3 } from "../d3.js";
import { state, filteredData } from "../state.js";
import { GENRE_ORDER, genreColor, tt, fmtNum, kde, epanechnikov, widthOf } from "../utils.js";

export function runtimeRidge(selector) {
  const host = d3.select(selector);
  const margin = { top: 20, right: 30, bottom: 40, left: 160 };
  let svg, gRidges, gX, gY, width, height = 500;

  function build() {
    host.selectAll("*").remove();
    width = widthOf(host);
    svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    gRidges = svg.append("g");
    gX = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`);
    gY = svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`);
    svg.append("text").attr("class", "axis-title")
      .attr("x", (margin.left + width - margin.right)/2).attr("y", height - 8)
      .attr("text-anchor", "middle").text("Runtime (minutes)");
  }

  function render() {
    if (!svg) build();
    const data = filteredData().filter(d => d.runtime && d.runtime >= 50 && d.runtime <= 250);
    // Per genre series
    const genres = GENRE_ORDER.filter(g => data.some(d => d.genre === g && d.runtime));

    const x = d3.scaleLinear().domain([55, 200]).range([margin.left, width - margin.right]);
    const y = d3.scaleBand().domain(genres).range([margin.top, height - margin.bottom]).padding(0.15);

    gX.call(d3.axisBottom(x).ticks(8).tickFormat(d => d + "m").tickSize(-(height - margin.top - margin.bottom)));
    svg.selectAll(".axis .tick line").attr("class", "gridline");
    gY.call(d3.axisLeft(y).tickSize(0));
    svg.selectAll(".axis .domain").attr("stroke", "var(--grid)");

    // KDE per genre
    const xs = d3.range(55, 200, 2);
    const estimator = kde(epanechnikov(8), xs);
    const ridges = genres.map(g => {
      const vals = data.filter(d => d.genre === g).map(d => d.runtime);
      return { genre: g, density: estimator(vals), n: vals.length, median: d3.median(vals) };
    });
    // Normalize density per ridge so they're comparable in shape, then scale to band height
    const ridgeHeight = y.bandwidth() * 1.8;
    for (const r of ridges) {
      const maxD = d3.max(r.density, d => d[1]) || 1;
      r.density = r.density.map(([xv, d]) => [xv, d / maxD]);
    }

    const area = d3.area()
      .x(d => x(d[0]))
      .y0(0).y1(d => -d[1] * ridgeHeight)
      .curve(d3.curveBasis);

    const rows = gRidges.selectAll("g.ridge").data(ridges, d => d.genre);
    rows.exit().remove();
    const enter = rows.enter().append("g").attr("class", "ridge")
      .attr("transform", d => `translate(0,${y(d.genre) + y.bandwidth()})`);
    enter.append("path");
    enter.append("line").attr("class", "med");

    const merged = enter.merge(rows);
    merged.transition().duration(400).attr("transform", d => `translate(0,${y(d.genre) + y.bandwidth()})`);

    merged.select("path")
      .attr("fill", d => genreColor(d.genre))
      .attr("opacity", 0.7)
      .attr("stroke", d => genreColor(d.genre))
      .attr("stroke-width", 1.2)
      .transition().duration(400)
      .attr("d", d => area(d.density));

    merged.select("line.med")
      .attr("x1", d => x(d.median)).attr("x2", d => x(d.median))
      .attr("y1", 0).attr("y2", -ridgeHeight * 0.95)
      .attr("stroke", "var(--paper)").attr("stroke-dasharray", "2 2").attr("opacity", 0.6);

    // Median label
    const lbl = gRidges.selectAll("text.med-lbl").data(ridges, d => d.genre);
    lbl.exit().remove();
    lbl.enter().append("text").attr("class", "med-lbl")
        .attr("font-size", 10).attr("fill", "var(--paper-dim)").attr("text-anchor", "middle")
      .merge(lbl)
        .attr("x", d => x(d.median))
        .attr("y", d => y(d.genre) + y.bandwidth() - ridgeHeight * 0.95 - 4)
        .text(d => `${Math.round(d.median)}m · n=${d.n}`);

    // Hover
    merged.on("mousemove", (evt, d) => {
      tt.show(`
        <div class="tt-title">${d.genre}</div>
        <div class="tt-row"><span>Films with runtime</span><span>${fmtNum(d.n)}</span></div>
        <div class="tt-row"><span>Median runtime</span><span>${Math.round(d.median)} min</span></div>
      `, evt);
    }).on("mouseleave", () => tt.hide());

    // Caption: shortest & longest median
    if (ridges.length) {
      const sh = d3.least(ridges, r => r.median);
      const lo = d3.greatest(ridges, r => r.median);
      d3.select("#cap-runtime").html(
        `Tightest tail: <strong>${sh.genre}</strong> at a median of ${Math.round(sh.median)} minutes. Longest legs: <strong>${lo.genre}</strong> at ${Math.round(lo.median)} minutes. The vertical dashes mark each genre's median.`
      );
    }
  }

  return { render };
}
