// 3 — Critics vs Crowd quadrant. RT% on x, IMDb on y. Click a quadrant to filter.

import { d3 } from "../d3.js";
import { state, filteredData, emit } from "../state.js";
import { genreColor, tt, fmtNum, widthOf } from "../utils.js";

const QUADRANTS = {
  TR: { label: "Universal Hits",     desc: "loved by critics AND audiences" },
  TL: { label: "Critic Darlings",    desc: "critics love it, crowd shrugs" },
  BR: { label: "Crowd-Pleasers",     desc: "crowd love it, critics shrug" },
  BL: { label: "Universally Panned", desc: "nobody liked it" },
};

export function criticAudience(selector) {
  const host = d3.select(selector);
  const margin = { top: 40, right: 30, bottom: 50, left: 60 };
  let svg, gQuad, gDots, gX, gY, gLabels, width, height = 460;

  function build() {
    host.selectAll("*").remove();
    width = widthOf(host);
    svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    gQuad = svg.append("g");      // background quadrants
    gDots = svg.append("g");
    gX = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`);
    gY = svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`);
    gLabels = svg.append("g");

    svg.append("text").attr("class", "axis-title")
      .attr("x", width / 2).attr("y", height - 8).attr("text-anchor", "middle")
      .text("Rotten Tomatoes (critics)  →");
    svg.append("text").attr("class", "axis-title")
      .attr("transform", `translate(14,${height/2}) rotate(-90)`).attr("text-anchor", "middle")
      .text("IMDb rating (audience)  →");
  }

  function render() {
    if (!svg) build();
    const data = filteredData().filter(d => d.rt != null && d.imdb != null);

    const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([2, 10]).range([height - margin.bottom, margin.top]);

    gX.call(d3.axisBottom(x).tickFormat(d => d + "%").tickSize(-(height - margin.top - margin.bottom)));
    gY.call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)));
    svg.selectAll(".axis .tick line").attr("class", "gridline");

    // Quadrant backgrounds
    const qX = 60, qY = 7;
    const rects = [
      { key: "TR", x: x(qX), y: margin.top,                w: x(100) - x(qX), h: y(qY) - margin.top,            fill: "rgba(78,205,196,0.05)" },
      { key: "TL", x: margin.left, y: margin.top,           w: x(qX) - margin.left, h: y(qY) - margin.top,        fill: "rgba(240,160,75,0.05)" },
      { key: "BR", x: x(qX), y: y(qY),                       w: x(100) - x(qX), h: (height - margin.bottom) - y(qY), fill: "rgba(255,209,102,0.04)" },
      { key: "BL", x: margin.left, y: y(qY),                 w: x(qX) - margin.left, h: (height - margin.bottom) - y(qY), fill: "rgba(224,122,95,0.06)" },
    ];
    const q = gQuad.selectAll("rect").data(rects, d => d.key);
    q.join("rect")
      .attr("x", d => d.x).attr("y", d => d.y).attr("width", d => d.w).attr("height", d => d.h)
      .attr("fill", d => d.fill)
      .attr("stroke", d => state.quadrant === d.key ? "var(--ember)" : "none")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", (evt, d) => {
        state.quadrant = state.quadrant === d.key ? null : d.key;
        emit();
      });

    // Crosshair lines
    gQuad.selectAll("line.cross").data([0]).join("line").attr("class", "cross")
      .attr("x1", x(qX)).attr("x2", x(qX)).attr("y1", margin.top).attr("y2", height - margin.bottom)
      .attr("stroke", "var(--grid-strong)").attr("stroke-dasharray", "3 3");
    gQuad.selectAll("line.cross2").data([0]).join("line").attr("class", "cross2")
      .attr("x1", margin.left).attr("x2", width - margin.right).attr("y1", y(qY)).attr("y2", y(qY))
      .attr("stroke", "var(--grid-strong)").attr("stroke-dasharray", "3 3");

    // Labels per quadrant
    const labelPos = {
      TR: [x(100) - 8, margin.top + 16, "end"],
      TL: [margin.left + 8, margin.top + 16, "start"],
      BR: [x(100) - 8, height - margin.bottom - 8, "end"],
      BL: [margin.left + 8, height - margin.bottom - 8, "start"],
    };
    const labels = gLabels.selectAll("text").data(Object.keys(QUADRANTS));
    labels.join("text")
      .attr("x", k => labelPos[k][0])
      .attr("y", k => labelPos[k][1])
      .attr("text-anchor", k => labelPos[k][2])
      .attr("font-family", "Fraunces, serif").attr("font-size", 14).attr("font-style", "italic")
      .attr("fill", k => state.quadrant === k ? "var(--ember)" : "var(--paper-dim)")
      .text(k => QUADRANTS[k].label);

    // Dots
    const dots = gDots.selectAll("circle").data(data, d => d.title + d.year);
    dots.exit().remove();
    dots.enter().append("circle")
        .attr("r", 3.5).attr("opacity", 0.55).attr("stroke", "rgba(0,0,0,0.4)").attr("stroke-width", 0.4)
      .merge(dots)
        .attr("cx", d => x(d.rt))
        .attr("cy", d => y(d.imdb))
        .attr("fill", d => genreColor(d.genre))
        .on("mousemove", (evt, d) => {
          tt.show(`
            <div class="tt-title">${d.title} <span style="color:var(--paper-dim);font-weight:400">(${d.year})</span></div>
            <div class="tt-row"><span>Director</span><span>${d.director || "—"}</span></div>
            <div class="tt-row"><span>Critics</span><span>${d.rt}%</span></div>
            <div class="tt-row"><span>Audience</span><span>${d.imdb} / 10</span></div>
            <div class="tt-row"><span>Votes</span><span>${fmtNum(d.votes || 0)}</span></div>
          `, evt);
        })
        .on("mouseleave", () => tt.hide());

    // Caption with quadrant counts
    const counts = { TR:0, TL:0, BR:0, BL:0 };
    for (const d of data) {
      const k = (d.rt >= qX ? "T" : "B") + (d.imdb >= qY ? "R" : "L");
      counts[k]++;
    }
    const tot = data.length || 1;
    d3.select("#cap-quadrant").html(
      `<strong>Universal Hits</strong>: ${counts.TR} (${(counts.TR/tot*100).toFixed(0)}%) · ` +
      `<strong>Critic Darlings</strong>: ${counts.TL} (${(counts.TL/tot*100).toFixed(0)}%) · ` +
      `<strong>Crowd-Pleasers</strong>: ${counts.BR} (${(counts.BR/tot*100).toFixed(0)}%) · ` +
      `<strong>Panned</strong>: ${counts.BL} (${(counts.BL/tot*100).toFixed(0)}%). ` +
      `Splits at RT ${qX}% / IMDb ${qY}. ${state.quadrant ? "Currently filtering to " + QUADRANTS[state.quadrant].label + "." : "Click any quadrant to filter."}`
    );
  }

  return { render };
}
