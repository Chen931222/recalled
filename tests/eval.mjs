// Measures the matcher on queries a seller would type, built from real notices, plus negatives.
// Positives (model): brand short name + product name + one listed model, typed loosely (lower case, hyphens dropped).
// Positives (no model): brand + product name, for notices that list no models.
// Negatives: same brand + product but a model the notice does not list (must not be "likely" for that notice);
//            brands that are not in the index at all (must be "none").
import { readFileSync, writeFileSync } from 'node:fs';
import { prepare, check, normBrand } from '../site/match.js';

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

const by = {};
for (const r of rows) { by[r.kind] ||= [0, 0]; by[r.kind][1]++; if (r.ok) by[r.kind][0]++; }
const lines = Object.entries(by).map(([k, [ok, n]]) => `${k.padEnd(12)} ${ok}/${n}`);
console.log(lines.join('\n'));
const fails = rows.filter((r) => !r.ok);
console.log(`\nfailures (${fails.length}):`);
for (const f of fails.slice(0, 25)) console.log(`- [${f.kind}] ${f.q}  →  ${f.got}  (want ${f.id})`);
writeFileSync(new URL('./eval-result.json', import.meta.url), JSON.stringify({ by, rows }, null, 1));
