// Global reactive state for cross-chart coordination.
// All charts read filteredData() and subscribe to "change".

import { d3 } from "./d3.js";

export const state = {
  raw: [],                       // all 2913 cleaned films
  yearMin: 1980,                 // brushable range
  yearMax: 2015,
  yearExtent: [1928, 2015],
  genres: new Set(),             // active genres (empty = all)
  mpaa: new Set(),               // active MPAA (empty = all)
  search: "",
  selectedDirector: null,        // bar-chart click filter
  scatterBrush: null,            // [budget0, budget1, ww0, ww1] in log10 space
  quadrant: null,                // "TR" | "TL" | "BR" | "BL"
};

export const dispatch = d3.dispatch("change");
export const on = (name, fn) => dispatch.on(name, fn);
export const emit = () => dispatch.call("change");

export function filteredData() {
  const q = state.search.trim().toLowerCase();
  return state.raw.filter(d => {
    if (d.year < state.yearMin || d.year > state.yearMax) return false;
    if (state.genres.size && !state.genres.has(d.genre)) return false;
    if (state.mpaa.size && !state.mpaa.has(d.mpaa)) return false;
    if (state.selectedDirector && d.director !== state.selectedDirector) return false;
    if (q) {
      const inT = d.title && d.title.toLowerCase().includes(q);
      const inD = d.director && d.director.toLowerCase().includes(q);
      if (!inT && !inD) return false;
    }
    if (state.scatterBrush && d.log_budget != null && d.log_ww != null) {
      const [bx0, bx1, by0, by1] = state.scatterBrush;
      if (d.log_budget < bx0 || d.log_budget > bx1) return false;
      if (d.log_ww < by0 || d.log_ww > by1) return false;
    }
    if (state.quadrant && d.rt != null && d.imdb != null) {
      const critic = d.rt >= 60;
      const audience = d.imdb >= 7;
      const q = (critic ? "T" : "B") + (audience ? "R" : "L");
      if (q !== state.quadrant) return false;
    }
    return true;
  });
}

export function resetAll() {
  state.yearMin = state.yearExtent[0];
  state.yearMax = state.yearExtent[1];
  state.genres.clear();
  state.mpaa.clear();
  state.search = "";
  state.selectedDirector = null;
  state.scatterBrush = null;
  state.quadrant = null;
  emit();
}
