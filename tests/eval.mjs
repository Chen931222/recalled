// Measures the matcher on queries a seller would type, built from real notices, plus negatives.
// Positives (model): brand short name + product name + one listed model, typed loosely (lower case, hyphens dropped).
// Positives (no model): brand + product name, for notices that list no models.
// Negatives: same brand + product but a model the notice does not list (must not be "likely" for that notice);
//            brands that are not in the index at all (must be "none").
import { readFileSync, writeFileSync } from 'node:fs';
import { prepare, check, normBrand } from '../site/js/match.js';

const recs = JSON.parse(readFileSync(new URL('../site/data/recalls.json', import.meta.url), 'utf8'));
const P = prepare(recs);
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (xs, n) => [...xs].sort(() => rnd() - 0.5).slice(0, n);
const short = (b) => normBrand(b).split(' ').slice(0, 2).join(' ');

const withModel = recs.filter((r) => r.source === 'CPSC' && r.models.length && r.brands.length && r.products.length);
const noModel = recs.filter((r) => r.source === 'CPSC' && !r.models.length && r.brands.length && r.products.length);
const rows = [];

for (const r of pick(withModel, 50)) {
  const m = r.models[Math.floor(rnd() * r.models.length)];
  const typed = rnd() < 0.5 ? m.toLowerCase() : m.replace(/-/g, '');
  const q = `${short(r.brands[0])} ${r.products[0]} ${typed}`;
  const res = check(P, q);
  const top = res.matches[0];
  const sameNotice = top?.record.id === r.id;
  // Another notice that lists the same model is also a correct "likely" (expanded or repeated recalls).
  const sameModel = top && top.level === 'likely' && (top.record.models || []).map((x) => x.replace(/[^A-Z0-9]/gi, '').toUpperCase()).includes(m.replace(/[^A-Z0-9]/gi, '').toUpperCase());
  rows.push({ kind: 'pos-model', id: r.id, q, ok: top?.level === 'likely' && (sameNotice || sameModel), exact: sameNotice, got: top && `${top.level} ${top.record.id}` });
}
for (const r of pick(noModel, 25)) {
  const q = `${short(r.brands[0])} ${r.products[0]}`;
  const res = check(P, q);
  const hit = res.matches.findIndex((x) => x.record.id === r.id);
  rows.push({ kind: 'pos-nomodel', id: r.id, q, ok: hit >= 0 && hit < 3, got: hit >= 0 ? `rank ${hit + 1} ${res.matches[hit].level}` : 'not in top 5' });
}
for (const r of pick(withModel.filter((x) => !x.models.some((m) => x.products[0].toUpperCase().replace(/[^A-Z0-9]/g, '').includes(m.replace(/[^A-Z0-9]/g, '')))), 25)) {
  const q = `${short(r.brands[0])} ${r.products[0]} ZQ${Math.floor(rnd() * 9000 + 1000)}X`;
  const res = check(P, q);
  const bad = res.matches.find((x) => x.record.id === r.id && x.level === 'likely');
  rows.push({ kind: 'neg-model', id: r.id, q, ok: !bad, got: res.level });
}
const fake = ['Lumora', 'Pebblenest', 'Tavikko', 'Brindlewood Baby', 'Quillon', 'Mossberry', 'Zephyrine', 'Oakhollow', 'Kestrelle', 'Vantoria', 'Glimmerleaf', 'Corvalis', 'Wrenfield', 'Halvora', 'Sundrift', 'Pinewhistle', 'Marlowe Kids', 'Tessaline', 'Brightfern', 'Calloway Tots', 'Nimbleroot', 'Ashgrove', 'Ellowyn', 'Faircliff', 'Juniper Lane'];
const things = ['stroller', 'crib', 'high chair', 'play yard', 'baby carrier'];
fake.forEach((b, i) => {
  const q = `${b} ${things[i % things.length]} ${['A100', 'TX-22', 'M5', 'K900', 'S-3'][i % 5]}`;
  const res = check(P, { brand: b, product: things[i % things.length], model: ['A100', 'TX-22', 'M5', 'K900', 'S-3'][i % 5] });
  rows.push({ kind: 'neg-brand', id: '-', q, ok: res.level === 'none', got: res.level + (res.matches[0] ? ' ' + res.matches[0].record.id : '') });
});

// Big recalls: every notice whose units line says 1 million or more, chosen by that rule
// alone, not by hand. Query = the shortest brand on the notice + the first five words of
// its product name. Right if that notice is in the top 5. Added 2026-11-23 after spot
// checks found the Rock 'n Play and Boppy lounger notices missing from the index.
const unitsOf = (s) => {
  const m = /([\d.,]+)\s*million/i.exec(s || '');
  if (m) return parseFloat(m[1].replace(/,/g, '')) * 1e6;
  const n = /\b(\d{1,3}(?:,\d{3})+|\d{4,})\b/.exec(s || '');
  return n ? parseFloat(n[1].replace(/,/g, '')) : 0;
};
for (const r of recs.filter((x) => unitsOf(x.units) >= 1e6 && x.brands.length && x.products.length)) {
  const brand = [...r.brands].sort((a, b) => a.length - b.length)[0].split(/,\s*of\b/i)[0];
  const bw = new Set(normBrand(brand).split(' '));
  const product = r.products[0].replace(/^all models of\s+/i, '').split(/\s+/).filter((w) => !bw.has(w.toLowerCase().replace(/[^a-z0-9]/g, ''))).slice(0, 5).join(' ');
  const res = check(P, { brand, product });
  const hit = res.matches.findIndex((x) => x.record.id === r.id);
  rows.push({ kind: 'big', id: r.id, q: `${brand} | ${product}`, ok: hit >= 0, got: hit >= 0 ? `rank ${hit + 1} ${res.matches[hit].level}` : `${res.level}, not in top 5` });
}

const by = {};
for (const r of rows) { by[r.kind] ||= [0, 0]; by[r.kind][1]++; if (r.ok) by[r.kind][0]++; }
const lines = Object.entries(by).map(([k, [ok, n]]) => `${k.padEnd(12)} ${ok}/${n}`);
console.log(lines.join('\n'));
const fails = rows.filter((r) => !r.ok);
console.log(`\nfailures (${fails.length}):`);
for (const f of fails.slice(0, 25)) console.log(`- [${f.kind}] ${f.q}  →  ${f.got}  (want ${f.id})`);
writeFileSync(new URL('./eval-result.json', import.meta.url), JSON.stringify({ by, rows }, null, 1));

// Fail the run (and the daily data update) if any set drops below what it scored on 2026-11-23.
const FLOOR = { "pos-model": 50, "pos-nomodel": 24, "neg-model": 25, "neg-brand": 25, big: 60 };
for (const [k, min] of Object.entries(FLOOR)) if ((by[k]?.[0] ?? 0) < min) { console.error(`${k} fell below ${min}`); process.exitCode = 1; }
