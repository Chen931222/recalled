// Recalled? matcher. Pure function, no network, no model: runs the same in the page, in the bridge and in tests.
// Levels:
//   likely   — a UPC or model number from the recall notice matches exactly (brand agrees or wasn't given)
//   possible — same brand and the same kind of product, but nothing exact to pin it down
//   none     — nothing from this brand and kind in the sources searched
// It never says "safe": "none" only means none of the sources searched list it.

const LEGAL = /\b(inc|incorporated|llc|ltd|limited|co|corp|corporation|company|gmbh|srl|sa|bv|plc|usa|us|america|canada|international|intl|group|brands?|products?|enterprises?)\b/g;
const STOP = new Set(['the', 'and', 'with', 'for', 'of', 'to', 'in', 'due', 'risk', 'recalls', 'recall', 'recalled', 'hazard', 'hazards', 'sold', 'by', 'a', 'an', 'archived', 'pose', 'poses', 'from', 'at']);
const KIND = /\b(stroller|pram|crib|bassinet|cradle|car seat|booster|high ?chair|play ?yard|playpen|walker|swing|gate|bouncer|rocker|sleeper|carrier|sling|changing (?:table|pad)|bath (?:seat|tub)|pillow|teether|pacifier|rattle|monitor|toddler bed|bunk bed|dresser|chest|bib|sippy|bottle|warmer|sterilizer|activity (?:center|gym)|jumper|scooter|balance bike|tricycle|ride-on|mattress|lounger|seat)s?\b/gi;

export const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const normBrand = (s) => norm((s || '').split(/,\s*of\b/i)[0]).replace(LEGAL, ' ').replace(/\s+/g, ' ').trim().replace(/^the /, '');
export const normModel = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const kinds = (s) => [...new Set((norm(s).match(KIND) || []).map((k) => k.replace(/\s+/g, ' ').replace(/s$/, '')))];
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
// Words that say what kind of thing it is, or who it is for, not which product line.
const GENERIC = new Set(['baby', 'babies', 'infant', 'infants', 'kids', 'kid', 'children', 'child', 'toddler', 'toddlers', 'newborn', 'all', 'models', 'model', 'sizes', 'styles', 'colors', 'versions',
  'stroller', 'strollers', 'pram', 'crib', 'cribs', 'bassinet', 'cradle', 'car', 'seat', 'seats', 'booster', 'high', 'chair', 'chairs', 'play', 'yard', 'yards', 'playpen', 'walker', 'swing', 'swings',
  'gate', 'bouncer', 'rocker', 'rocking', 'sleeper', 'sleepers', 'carrier', 'carriers', 'sling', 'changing', 'table', 'pad', 'bath', 'tub', 'pillow', 'teether', 'pacifier', 'rattle', 'monitor', 'bed', 'beds',
  'bunk', 'dresser', 'chest', 'bib', 'sippy', 'bottle', 'warmer', 'sterilizer', 'activity', 'center', 'gym', 'jumper', 'scooter', 'bike', 'tricycle', 'mattress', 'lounger', 'loungers', 'toy', 'toys', 'set', 'sets']);
// "All models of Rock 'n Play Sleepers": the notice covers every unit of that product line.
const ALL = /\ball (?:models|sizes|styles|colors|versions)\b|\brecalls all\b/i;

/** Precompute once per record list. */
export function prepare(records) {
  return records.map((r) => {
    const text = [r.title, ...(r.products || []), ...(r.types || [])].join(' ');
    return {
      r,
      brands: [...new Set((r.brands || []).map(normBrand).filter(Boolean))],
      kinds: kinds(text),
      words: new Set(words(text)),
      models: new Set((r.models || []).map(normModel).filter((m) => m.length >= 3 && !/^\d+IN\d+$/.test(m))),
      upcs: new Set((r.upcs || []).filter((u) => u.length >= 8)),
      allModels: ALL.test([r.title, ...(r.products || [])].join(' ')),
    };
  });
}

/** Pull model-like tokens and UPCs out of free text. */
export function parseQuery(q) {
  const text = typeof q === 'string' ? q : [q.brand, q.product, q.model, q.upc].filter(Boolean).join(' ');
  const upcs = (text.match(/\b\d{12,14}\b/g) || []);
  const models = (text.match(/\b(?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9-]{2,}\b/g) || []).map(normModel).filter((m) => m.length >= 3 && !/^\d{4}$/.test(m) && !/^\d+IN\d+$/.test(m));
  if (typeof q === 'object' && q.model) models.unshift(normModel(q.model));
  return {
    brand: typeof q === 'object' && q.brand ? normBrand(q.brand) : '',
    kinds: kinds(text),
    words: new Set(words(text)),
    models: [...new Set(models)],
    upcs: [...new Set(upcs)],
  };
}

function brandHit(p, qb, qwords) {
  if (qb) return p.brands.some((b) => b && (b === qb || b.startsWith(qb + ' ') || qb.startsWith(b + ' ') || b.split(' ')[0] === qb.split(' ')[0]));
  // free text: a record brand's first word appears in the query
  return p.brands.some((b) => b && qwords.has(b.split(' ')[0]));
}

/** Returns { level, matches: [{ record, level, why }] } sorted best first. */
export function check(prepared, query, limit = 5) {
  const q = parseQuery(query);
  const out = [];
  for (const p of prepared) {
    const brand = brandHit(p, q.brand, q.words);
    const upc = q.upcs.find((u) => p.upcs.has(u));
    const model = q.models.find((m) => p.models.has(m));
    const kind = q.kinds.some((k) => p.kinds.includes(k));
    let overlap = 0;
    for (const w of q.words) if (p.words.has(w)) overlap++;
    let level = null;
    let why = '';
    let score = 0;
    // Product-line words both share: not the brand, not the kind of product.
    let line = 0;
    if (p.allModels && brand) {
      const brandWords = new Set(p.brands.join(' ').split(' '));
      for (const w of q.words) if (p.words.has(w) && !GENERIC.has(w) && !brandWords.has(w)) line++;
    }
    if (upc) { level = 'likely'; why = `UPC ${upc} is listed in the notice`; score = 100; }
    else if (model && (brand || !q.brand)) { level = 'likely'; why = `Model ${model} is listed in the notice`; score = 90 + (brand ? 5 : 0); }
    else if (line >= 1 && (kind || overlap >= 3)) { level = 'likely'; why = 'The notice covers all models of this product line'; score = 85 + line; }
    else if (brand && (kind || overlap >= 2)) {
      level = 'possible';
      why = !p.models.size ? 'Same brand and product; the notice does not list model numbers, so check its description' : q.models.length ? 'Same brand and product, but your model number is not one of those listed' : 'Same brand and product; compare your model number with the ones listed';
      score = 40 + overlap * 3 + (kind ? 10 : 0) + (p.models.size ? 0 : 5);
      if (q.models.length && p.models.size) score -= 15; // you gave a model and it isn't listed
    }
    if (level) out.push({ record: p.r, level, why, score });
  }
  out.sort((a, b) => b.score - a.score || (b.record.date || '').localeCompare(a.record.date || ''));
  const matches = out.slice(0, limit).map(({ score, ...m }) => m);
  return { level: matches[0]?.level || 'none', matches };
}
