// 5 — Director leaderboard. Top 15 by aggregate worldwide gross, stacked films.

import { d3 } from "../d3.js";
import { state, filteredData, emit } from "../state.js";
import { genreColor, tt, fmtMoney, fmtNum, widthOf } from "../utils.js";

export function directorBar(selector) {
  const host = d3.select(selector);
  const margin = { top: 10, right: 30, bottom: 30, left: 200 };
  let svg, gBars, gX, gY, width, height = 460;

  function build() {
    host.selectAll("*").remove();
    width = widthOf(host);
    svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    gBars = svg.append("g");
    gX = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`);
    gY = svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`);
    svg.append("text").attr("class", "axis-title")
      .attr("x", (margin.left + width - margin.right) / 2).attr("y", height - 6)
      .attr("text-anchor", "middle").text("Aggregate worldwide gross →");
  }

  function render() {
    if (!svg) build();
    const data = filteredData().filter(d => d.director && d.ww_gross);
    // Aggregate
    const byDir = d3.rollups(
      data,
      v => ({ total: d3.sum(v, d => d.ww_gross), films: v.sort((a,b) => b.ww_gross - a.ww_gross) }),
      d => d.director
    ).map(([dir, o]) => ({ director: dir, total: o.total, films: o.films, n: o.films.length }))
     .sort((a,b) => b.total - a.total)
     .slice(0, 15);

    const y = d3.scaleBand().domain(byDir.map(d => d.director)).range([margin.top, height - margin.bottom]).padding(0.18);
    const x = d3.scaleLinear().domain([0, d3.max(byDir, d => d.total) || 1]).range([margin.left, width - margin.right]).nice();

    gX.transition().duration(400).call(d3.axisBottom(x).ticks(6, "$.2s").tickSize(-(height - margin.top - margin.bottom)));
    gY.transition().duration(400).call(d3.axisLeft(y).tickSize(0));
    svg.selectAll(".axis .tick line").attr("class", "gridline");
    svg.selectAll(".axis .domain").attr("stroke", "var(--grid)");

    // Stacked segments per film
    const rows = gBars.selectAll("g.row").data(byDir, d => d.director);
    rows.exit().remove();
    const enter = rows.enter().append("g").attr("class", "row")
      .attr("transform", d => `translate(0,${y(d.director)})`)
      .style("cursor", "pointer")
      .on("click", (evt, d) => {
        state.selectedDirector = state.selectedDirector === d.director ? null : d.director;
        emit();
      });
    const merged = enter.merge(rows).transition().duration(400)
      .attr("transform", d => `translate(0,${y(d.director)})`);

    rows.merge(enter).each(function(d) {
      const g = d3.select(this);
      let acc = margin.left;
      const segs = g.selectAll("rect").data(d.films, f => f.title + f.year);
      segs.exit().remove();
      const segsE = segs.enter().append("rect").attr("y", 0).attr("height", y.bandwidth()).attr("fill", "#444");
      segsE.merge(segs)
        .on("mousemove", (evt, f) => {
          tt.show(`
            <div class="tt-title">${f.title} <span style="color:var(--paper-dim);font-weight:400">(${f.year})</span></div>
            <div class="tt-row"><span>Director</span><span>${f.director}</span></div>
            <div class="tt-row"><span>Genre</span><span>${f.genre}</span></div>
            <div class="tt-row"><span>Worldwide</span><span>${fmtMoney(f.ww_gross)}</span></div>
            <div class="tt-row"><span>IMDb</span><span>${f.imdb ?? "—"}</span></div>
          `, evt);
        })
        .on("mouseleave", () => tt.hide())
        .transition().duration(400)
        .attr("x", f => { const start = acc; acc += (x(f.ww_gross) - x(0)); return start; })
        .attr("width", f => x(f.ww_gross) - x(0))
        .attr("height", y.bandwidth())
        .attr("fill", f => genreColor(f.genre))
        .attr("opacity", state.selectedDirector && state.selectedDirector !== d.director ? 0.25 : 0.9);

      // Total label at end
      const lbl = g.selectAll("text.total").data([d]);
      lbl.enter().append("text").attr("class", "total")
        .merge(lbl)
        .attr("x", x(d.total) + 6).attr("y", y.bandwidth() / 2 + 4)
        .attr("font-size", 11).attr("fill", "var(--paper-dim)")
        .attr("font-variant-numeric", "tabular-nums")
        .text(`${fmtMoney(d.total)} · ${d.n} film${d.n>1?"s":""}`);
    });

    gY.selectAll(".tick text")
      .attr("font-weight", d => state.selectedDirector === d ? 600 : 400)
      .attr("fill", d => state.selectedDirector === d ? "var(--ember)" : "var(--paper-dim)");

    // Caption
    if (byDir.length) {
      d3.select("#cap-directors").html(
        `<strong>${byDir[0].director}</strong> leads this view with ${fmtMoney(byDir[0].total)} across ${byDir[0].n} films. ${state.selectedDirector ? "Currently filtering to <strong>" + state.selectedDirector + "</strong>. Click again to clear." : "Click any bar to lock every chart to that director."}`
      );
    } else {
      d3.select("#cap-directors").html("No films with director attribution in this slice.");
    }
  }

  return { render };
}
