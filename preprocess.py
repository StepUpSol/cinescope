"""
CineScope dataset preprocessing.

Reads the raw Vega movies dataset, cleans, normalizes, computes derived
fields (Year, Decade, ROI, log-budget/gross), and writes data/movies_clean.json
for the front-end. Also writes data/preprocessing_report.json summarizing
the cleaning steps so the report can cite real numbers.
"""

import json, math, statistics
from collections import Counter, defaultdict
from datetime import datetime

SRC = "data/movies.json"
OUT = "data/movies_clean.json"
REPORT = "data/preprocessing_report.json"

def parse_year(s):
    if not s: return None
    for fmt in ("%b %d %Y", "%Y-%m-%d", "%d-%b-%y"):
        try:
            return datetime.strptime(s, fmt).year
        except Exception:
            pass
    return None

raw = json.load(open(SRC))
n_in = len(raw)

# Step 1: track missingness on every column for the report
missing = Counter()
for row in raw:
    for k, v in row.items():
        if v is None or v == "":
            missing[k] += 1

# Step 2: clean + derive
clean = []
dropped_no_year = 0
dropped_no_genre = 0
for row in raw:
    year = parse_year(row.get("Release Date"))
    if year is None or year < 1915 or year > 2015:
        dropped_no_year += 1
        continue
    genre = row.get("Major Genre")
    if not genre:
        dropped_no_genre += 1
        continue

    budget = row.get("Production Budget")
    ww = row.get("Worldwide Gross")
    us = row.get("US Gross")
    runtime = row.get("Running Time min")
    rt = row.get("Rotten Tomatoes Rating")
    imdb = row.get("IMDB Rating")
    votes = row.get("IMDB Votes")
    director = row.get("Director")
    mpaa = row.get("MPAA Rating") or "Not Rated"

    roi = None
    profit = None
    if budget and ww and budget > 0:
        roi = ww / budget
        profit = ww - budget

    clean.append({
        "title": row["Title"],
        "year": year,
        "decade": (year // 10) * 10,
        "genre": genre,
        "creative_type": row.get("Creative Type"),
        "source": row.get("Source"),
        "director": director,
        "distributor": row.get("Distributor"),
        "mpaa": mpaa,
        "runtime": runtime,
        "budget": budget,
        "ww_gross": ww,
        "us_gross": us,
        "profit": profit,
        "roi": roi,
        "log_budget": math.log10(budget) if budget and budget > 0 else None,
        "log_ww": math.log10(ww) if ww and ww > 0 else None,
        "rt": rt,
        "imdb": imdb,
        "votes": votes,
    })

# Step 3: summary stats for the design report
genres = Counter(r["genre"] for r in clean)
decades = Counter(r["decade"] for r in clean)
mpaa_dist = Counter(r["mpaa"] for r in clean)

financed = [r for r in clean if r["roi"] is not None]
median_roi = statistics.median(r["roi"] for r in financed)
profitable_pct = sum(1 for r in financed if r["roi"] > 1) / len(financed) * 100

report = {
    "rows_in": n_in,
    "rows_out": len(clean),
    "dropped_invalid_year": dropped_no_year,
    "dropped_missing_genre": dropped_no_genre,
    "field_missingness_pct": {k: round(100*v/n_in, 1) for k, v in missing.most_common()},
    "genre_distribution": dict(genres.most_common()),
    "decade_distribution": dict(sorted(decades.items())),
    "mpaa_distribution": dict(mpaa_dist.most_common()),
    "rows_with_financials": len(financed),
    "median_roi": round(median_roi, 2),
    "profitable_pct": round(profitable_pct, 1),
    "year_range": [min(r["year"] for r in clean), max(r["year"] for r in clean)],
}

json.dump(clean, open(OUT, "w"))
json.dump(report, open(REPORT, "w"), indent=2)
print(f"wrote {OUT}: {len(clean)} rows")
print(json.dumps(report, indent=2)[:2000])
