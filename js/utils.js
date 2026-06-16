import { d3 } from "./d3.js";

// Stable categorical palette for the 12 genres. Hand-tuned for the dark theme.
export const GENRE_ORDER = [
  "Drama", "Comedy", "Action", "Adventure", "Thriller/Suspense",
  "Horror", "Romantic Comedy", "Musical", "Documentary",
  "Western", "Black Comedy", "Concert/Performance",
];
const GENRE_COLORS = [
  "#f0a04b", // ember (drama)
  "#ffd166", // mustard (comedy)
  "#ef476f", // rose (action)
  "#06d6a0", // mint (adventure)
  "#9d4edd", // violet (thriller)
  "#7a1d3f", // wine (horror)
  "#ffafcc", // pink (romcom)
  "#4cc9f0", // sky (musical)
  "#a8dadc", // pale teal (doc)
  "#bc6c25", // sienna (western)
  "#5e548e", // indigo (blackcom)
  "#778da9", // slate (concert)
];
export const genreColor = d3.scaleOrdinal().domain(GENRE_ORDER).range(GENRE_COLORS).unknown("#666");

export const MPAA_ORDER = ["G", "PG", "PG-13", "R", "NC-17", "Not Rated"];

export const fmtMoney = v => {
  if (v == null || isNaN(v)) return "—";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "k";
  return "$" + v;
};
export const fmtNum = d3.format(",");
export const fmtPct = d3.format(".0%");
export const fmtX = v => v == null ? "—" : v.toFixed(1) + "×";

// Tooltip singleton
const ttEl = () => document.getElementById("tooltip");
export const tt = {
  show(html, evt) {
    const el = ttEl();
    el.innerHTML = html;
    el.classList.add("visible");
    this.move(evt);
  },
  move(evt) {
    const el = ttEl();
    const pad = 14;
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8)  x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    el.style.left = x + "px";
    el.style.top  = y + "px";
  },
  hide() { ttEl().classList.remove("visible"); },
};

// Helper: width of a container
export const widthOf = sel => sel.node().getBoundingClientRect().width;

// Kernel-density estimator for ridgeline
export function kde(kernel, X) {
  return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
}
export function epanechnikov(k) {
  return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
}
