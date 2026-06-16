// 1 — Genre streamgraph: releases per year, stacked by genre.
// Uses wiggle offset for the classic stream look. Hover a band to read its year totals.

import { d3 } from "../d3.js";
import { state, filteredData, emit } from "../state.js";
import { GENRE_ORDER, genreColor, tt, fmtNum, widthOf } from "../utils.js";

export function streamGraph(selector) {
  const host = d3.select(selector);
  const margin = { top: 10, right: 20, bottom: 32, left: 20 };
  let svg, gX, gPaths, gLegend, width, height = 360;

  function build() {
    host.selectAll("*").remove();
    width = widthOf(host);
    svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height + 60}`);
    gX = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`);
    gPaths = svg.append("g");
    gLegend = svg.append("g").attr("class", "legend").attr("transform", `translate(0,${height + 10})`);
  }

  function render() {
    if (!svg) build();
    const data = filteredData();
    // Pivot: rows = year, columns = genre, value = count
    const years = d3.range(state.yearMin, state.yearMax + 1);
    const counts = new Map(years.map(y => [y, Object.fromEntries(GENRE_ORDER.map(g => [g, 0]))]));
    for (const d of data) {
      if (counts.has(d.year)) counts.get(d.year)[d.genre] += 1;
    }
    const stackData = years.map(y => ({ year: y, ...counts.get(y) }));
    // Hide genres with no presence in current view
    const activeGenres = GENRE_ORDER.filter(g => d3.sum(stackData, r => r[g]) > 0);

    const stack = d3.stack().keys(activeGenres)
      .offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const series = stack(stackData);

    const x = d3.scaleLinear()
      .domain([state.yearMin, state.yearMax])
      .range([margin.left, width - margin.right]);
    const y = d3.scaleLinear()
      .domain([d3.min(series, s => d3.min(s, d => d[0])), d3.max(series, s => d3.max(s, d => d[1]))])
      .range([height - margin.bottom, margin.top]);

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);

    // X axis
    gX.transition().duration(500).call(
      d3.axisBottom(x).tickFormat(d3.format("d")).ticks(Math.min(10, state.yearMax - state.yearMin))
    );

    // Bands
    const bands = gPaths.selectAll("path.band").data(series, s => s.key);
    bands.exit().remove();
    bands.enter().append("path")
        .attr("class", "band")
        .attr("fill", s => genreColor(s.key))
        .attr("opacity", 0.88)
      .merge(bands)
        .on("mousemove", (evt, s) => {
          gPaths.selectAll("path.band").transition().duration(120)
            .attr("opacity", d => d.key === s.key ? 1 : 0.2);
          const total = d3.sum(stackData, r => r[s.key]);
          const peakYear = d3.greatest(stackData, r => r[s.key]).year;
          tt.show(`
            <div class="tt-title">${s.key}</div>
            <div class="tt-row"><span>Films in view</span><span>${fmtNum(total)}</span></div>
            <div class="tt-row"><span>Peak year</span><span>${peakYear}</span></div>
            <div class="tt-row"><span>Peak count</span><span>${stackData.find(r => r.year === peakYear)[s.key]}</span></div>
          `, evt);
        })
        .on("mouseleave", () => { gPaths.selectAll("path.band").transition().duration(120).attr("opacity", 0.88); tt.hide(); })
        .on("click", (evt, s) => {
          if (state.genres.has(s.key)) state.genres.delete(s.key); else state.genres.add(s.key);
          emit();
        })
        .transition().duration(500)
        .attr("d", area);

    // Legend
    const legendItems = gLegend.selectAll("g").data(activeGenres, d => d);
    legendItems.exit().remove();
    const enter = legendItems.enter().append("g").style("cursor", "pointer")
      .on("click", (evt, g) => {
        if (state.genres.has(g)) state.genres.delete(g); else state.genres.add(g);
        emit();
      });
    enter.append("rect").attr("width", 10).attr("height", 10).attr("y", 4);
    enter.append("text").attr("x", 14).attr("y", 13).attr("font-size", 11).attr("fill", "var(--paper-dim)");
    const merged = enter.merge(legendItems);
    merged.select("rect").attr("fill", d => genreColor(d));
    merged.select("text").text(d => d)
      .attr("fill", d => state.genres.size === 0 || state.genres.has(d) ? "var(--paper)" : "var(--paper-faint)");
    // Layout in rows
    let xOff = 0, yOff = 0;
    merged.attr("transform", function(d) {
      const w = this.querySelector("text").getComputedTextLength() + 22;
      if (xOff + w > width) { xOff = 0; yOff += 18; }
      const t = `translate(${xOff},${yOff})`;
      xOff += w + 10;
      return t;
    });

    // Caption
    const totalFilms = data.length;
    const topGenre = activeGenres.length
      ? d3.greatest(activeGenres, g => d3.sum(stackData, r => r[g]))
      : null;
    d3.select("#cap-stream").html(topGenre
      ? `<strong>${topGenre}</strong> dominates this window with ${fmtNum(d3.sum(stackData, r => r[topGenre]))} releases, ${(d3.sum(stackData, r => r[topGenre])/totalFilms*100).toFixed(0)}% of the ${fmtNum(totalFilms)} films in view. Click any band or legend entry to drill in.`
      : "No films match the current filters.");
  }

  return { render };
}
