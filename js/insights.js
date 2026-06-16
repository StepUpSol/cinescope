// Auto-insights — compute talking points for the active filter state.

import { d3 } from "./d3.js";
import { filteredData, state } from "./state.js";
import { fmtMoney, fmtX, fmtNum } from "./utils.js";

export function renderInsights() {
  const data = filteredData();
  const ul = document.getElementById("auto-insights");
  ul.innerHTML = "";

  if (!data.length) {
    ul.innerHTML = `<li><em>No films match this filter combo. Loosen something.</em></li>`;
    updateHeroStats(data);
    return;
  }

  const items = [];
  const fin = data.filter(d => d.roi != null);
  if (fin.length) {
    const med = d3.median(fin, d => d.roi);
    const profitable = fin.filter(d => d.roi > 1).length / fin.length;
    items.push(`Median ROI is <strong>${fmtX(med)}</strong>, with <strong>${(profitable*100).toFixed(0)}%</strong> of films breaking even.`);
  }

  // Top genre by count
  const byGenre = d3.rollup(data, v => v.length, d => d.genre);
  const topG = d3.greatest(byGenre, ([, c]) => c);
  if (topG) items.push(`<strong>${topG[0]}</strong> leads volume with ${fmtNum(topG[1])} of ${fmtNum(data.length)} films.`);

  // Highest grossing
  const top = d3.greatest(data, d => d.ww_gross || 0);
  if (top && top.ww_gross) items.push(`Top grosser: <strong>${top.title}</strong> (${top.year}) at ${fmtMoney(top.ww_gross)}.`);

  // Best ROI
  const roiTop = d3.greatest(fin.filter(d => d.budget > 1e6), d => d.roi);
  if (roiTop) items.push(`Best multiple: <strong>${roiTop.title}</strong> turned ${fmtMoney(roiTop.budget)} into ${fmtMoney(roiTop.ww_gross)} (${fmtX(roiTop.roi)}).`);

  // Critic-audience gap
  const rated = data.filter(d => d.rt != null && d.imdb != null);
  if (rated.length > 10) {
    const gap = d3.mean(rated, d => d.rt/10 - d.imdb);
    items.push(gap > 0
      ? `Critics rate this slice <strong>${gap.toFixed(2)} pts higher</strong> than audiences on a 10-pt scale.`
      : `Audiences rate this slice <strong>${(-gap).toFixed(2)} pts higher</strong> than critics on a 10-pt scale.`);
  }

  // Director note
  if (state.selectedDirector) {
    items.push(`Locked to <strong>${state.selectedDirector}</strong>. Clear via the leaderboard or the reset button.`);
  }

  ul.innerHTML = items.map(t => `<li>${t}</li>`).join("");
  updateHeroStats(data);
}

function updateHeroStats(data) {
  const $ = id => document.getElementById(id);
  $("stat-films").textContent = fmtNum(data.length);
  const fin = data.filter(d => d.roi != null);
  $("stat-roi").textContent   = fin.length ? fmtX(d3.median(fin, d => d.roi)) : "—";
  $("stat-profitable").textContent = fin.length
    ? (fin.filter(d => d.roi > 1).length / fin.length * 100).toFixed(0) + "%"
    : "—";
  const totGross = d3.sum(data, d => d.ww_gross || 0);
  $("stat-gross").textContent = totGross ? fmtMoney(totGross) : "—";
}
