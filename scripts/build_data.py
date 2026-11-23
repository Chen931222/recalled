"""Build the baby & kids gear recall index from official open data.

Sources (both free, no key):
- U.S. CPSC Recalls API (saferproducts.gov), U.S. government work.
- Health Canada Recalls and Safety Alerts (open.canada.ca), Open Government Licence - Canada.

Usage:  python scripts/build_data.py [--offline]
  --offline uses data/raw/*.json already downloaded.
Output: site/data/recalls.json (records) and site/data/meta.json (counts, sources, build time).
No images are copied: CPSC photos can belong to firms, so the site links to the official notice instead.
"""

from __future__ import annotations

import datetime as dt
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "site" / "data"
CPSC_URL = "https://www.saferproducts.gov/RestWebServices/Recall?format=json"
HC_URL = "https://recalls-rappels.canada.ca/sites/default/files/opendata-donneesouvertes/HCRSAMOpenData.json"
UA = {"User-Agent": "recalled-open-data-builder/0.1"}

# What counts as baby & kids gear. Matched on CPSC product type / name / title.
GEAR = re.compile(
    r"\b(strollers?|prams?|cribs?|bassinets?|cradles?|car seats?|booster seats?|high ?chairs?|play ?yards?|playpens?|"
    r"baby walkers?|walkers?|infant swings?|swings?|baby gates?|safety gates?|bouncers?|rockers?|sleepers?|"
    r"infant (?:seats?|loungers?|bedding|carriers?)|baby carriers?|carriers?|slings?|changing (?:tables?|pads?)|"
    r"bath (?:seats?|tubs?)|nursing pillows?|teethers?|pacifiers?|rattles?|baby monitors?|toddler beds?|bunk beds?|"
    r"dressers?|chests? of drawers|bibs?|sippy cups?|baby bottles?|bottle warmers?|sterilizers?|activity (?:centers?|gyms?)|"
    r"jumpers?|kick scooters?|balance bikes?|tricycles?|ride-on|loungers?|baby gyms?|play ?mats?|toddler towers?|"
    r"learning towers?|potty|potties|bed rails?|soothers?|gliders?)\b",
    re.I,
)
KIDS = re.compile(r"\b(baby|babies|infants?|toddlers?|children'?s|child|kids'?|juvenile|nursery|newborns?)\b", re.I)
# Named for a child but not gear: packaging and grown-up products whose hazard is that a
# child might swallow them (baby oil, medicine, lighters). Left out.
NOT_GEAR = re.compile(
    r"\b(poison(?:ing)?|child[- ]resistant|packaging|oils?|lotions?|medic(?:ine|ation)s?|drugs?|"
    r"supplements?|vitamins?|cosmetics?|lighters?|batteries)\b",
    re.I,
)
HC_CATS = ("Infant products", "Child Car Seat", "Booster Seat", "Toys and games")

MODEL_RE = re.compile(
    r"model (?:numbers?|nos?\.?|#)\s*(?:are|is|include|includes|:)?\s*([^.;]{1,400})", re.I
)
TOKEN_RE = re.compile(r"\b(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{2,}\b", re.I)
DATECODE_RE = re.compile(r"[^.]*\b(date codes?|manufactur(?:ed|e) dates?|production dates?|lot (?:numbers?|codes?)|batch)\b[^.]*\.", re.I)


def fetch(url: str, dest: Path) -> list:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        dest.write_bytes(r.read())
    return json.loads(dest.read_text(encoding="utf-8"))


def clean(s: str | None) -> str:
    s = html.unescape(s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def models_from(text: str) -> list[str]:
    out: list[str] = []
    for m in MODEL_RE.finditer(text):
        for tok in TOKEN_RE.findall(m.group(1)):
            t = tok.upper().strip("-")
            if len(t) >= 3 and not re.fullmatch(r"\d{4}", t) and not re.fullmatch(r"\d+-?IN-?\d+", t) and t not in out:  # skip bare years
                out.append(t)
    return out[:40]


def brand_from_title(title: str) -> str:
    m = re.match(r"(.+?)\s+(?:Recalls|Announces|Expands)\b", title)
    return m.group(1).strip() if m else ""


def cpsc_records(rows: list) -> list[dict]:
    out = []
    for r in rows:
        prods = r.get("Products") or []
        hay = " ".join([r.get("Title") or ""] + [f"{p.get('Name') or ''} {p.get('Type') or ''}" for p in prods])
        # Gear named in the title or product, for a child anywhere in the notice (the 2019
        # Rock 'n Play notice never says "infant" in its description, only in its hazards),
        # or a product the title itself calls a baby's, toddler's or child's.
        everything = " ".join([hay, r.get("Description") or ""] + [str(v) for k in ("Hazards", "Injuries") for h in (r.get(k) or []) for v in h.values() if isinstance(v, str)])
        gear = GEAR.search(hay) and (KIDS.search(everything) or re.search(r"crib|stroller|car seat|bassinet|play ?yard|high ?chair|baby|sleeper", hay, re.I))
        named = KIDS.search(hay) and not NOT_GEAR.search(hay)
        if not (gear or named):
            continue
        desc = clean(r.get("Description"))
        firms = [clean(f.get("Name")) for key in ("Manufacturers", "Importers", "Distributors") for f in (r.get(key) or []) if f.get("Name")]
        title = clean(r.get("Title"))
        out.append({
            "id": f"cpsc-{r.get('RecallNumber') or r.get('RecallID')}",
            "source": "CPSC",
            "country": "US",
            "date": (r.get("RecallDate") or "")[:10],
            "title": title,
            "brands": sorted({b for b in firms + [brand_from_title(title)] if b}),
            "products": [clean(p.get("Name")) for p in prods if p.get("Name")],
            "types": sorted({clean(p.get("Type")) for p in prods if p.get("Type")}),
            "models": models_from(desc),
            "upcs": [re.sub(r"\D", "", u.get("UPC") or "") for u in (r.get("ProductUPCs") or []) if u.get("UPC")],
            "identifiers": [clean(m.group(0)) for m in DATECODE_RE.finditer(desc)][:3],
            "hazard": "; ".join(clean(h.get("Name")) for h in (r.get("Hazards") or []) if h.get("Name")),
            "remedy": "; ".join(clean(h.get("Name")) for h in (r.get("Remedies") or []) if h.get("Name")),
            "units": "; ".join(clean(p.get("NumberOfUnits")) for p in prods if p.get("NumberOfUnits")),
            "description": desc[:500],
            "url": r.get("URL") or "",
        })
    return out


def hc_records(rows: list) -> list[dict]:
    out = []
    for r in rows:
        cat = r.get("Category") or ""
        title = clean(r.get("Title"))
        product = clean(r.get("Product"))
        text = f"{title} {product}"
        if NOT_GEAR.search(text):
            continue
        if not (any(c in cat for c in HC_CATS) or KIDS.search(text) or (GEAR.search(text) and KIDS.search(f"{text} {cat} {r.get('Issue') or ''}"))):
            continue
        if (r.get("Organization") or "") not in ("Consumer product safety", "TC"):
            continue
        m = re.search(r"recalled by (.+)$", product) or re.search(r"Recall - \d+ - (.+)$", title)
        out.append({
            "id": f"hc-{r.get('NID')}",
            "source": "Health Canada",
            "country": "CA",
            "date": (r.get("Last updated") or "")[:10],
            "title": title,
            "brands": [m.group(1).strip()] if m else [],
            "products": [product] if product else [],
            "types": [cat] if cat else [],
            "models": [],
            "upcs": [],
            "identifiers": [],
            "hazard": clean(r.get("Issue")),
            "remedy": "",
            "units": "",
            "description": clean(r.get("What you should do"))[:400],
            "url": r.get("URL") or "",
        })
    return out


def main() -> None:
    offline = "--offline" in sys.argv
    cpsc = json.loads((RAW / "cpsc_all.json").read_text(encoding="utf-8")) if offline else fetch(CPSC_URL, RAW / "cpsc_all.json")
    hc = json.loads((RAW / "hc.json").read_text(encoding="utf-8")) if offline else fetch(HC_URL, RAW / "hc.json")
    recs = cpsc_records(cpsc) + hc_records(hc)
    recs.sort(key=lambda r: r["date"], reverse=True)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "recalls.json").write_text(json.dumps(recs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    meta = {
        "built": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "counts": {"CPSC": sum(r["source"] == "CPSC" for r in recs), "Health Canada": sum(r["source"] == "Health Canada" for r in recs)},
        "with_model_numbers": sum(bool(r["models"]) for r in recs),
        "with_upcs": sum(bool(r["upcs"]) for r in recs),
        "newest": recs[0]["date"] if recs else None,
        "sources": [
            {"name": "U.S. Consumer Product Safety Commission, Recalls API", "url": "https://www.saferproducts.gov/RestWebServices/", "license": "U.S. government work (public domain)"},
            {"name": "Health Canada, Recalls and Safety Alerts", "url": "https://open.canada.ca/data/en/dataset/d38de914-c94c-429b-8ab1-8776c31643e3", "license": "Open Government Licence - Canada"},
        ],
    }
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(meta["counts"]), "models:", meta["with_model_numbers"], "upcs:", meta["with_upcs"], "size KB:", round((OUT / "recalls.json").stat().st_size / 1024))


if __name__ == "__main__":
    main()
