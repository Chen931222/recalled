// Recalled? business rules: what a check takes, what it refuses, and what each answer says.
// No DOM here. The page (js/app.js), the page's actions (site-actions.js), the bridge that
// other agent sites call (bridge/bridge-actions.js) and the tests all use this one class,
// so a visitor's form, their assistant and another site's assistant get the same answer.
import { RECORDS, META } from "./recall-data.js";
import { prepare, check, normBrand } from "./match.js";

const PREPARED = prepare(RECORDS);
const BY_ID = new Map(RECORDS.map((r) => [r.id, r]));

export class Checker {
  /** Longest value each field takes, the same as the form's maxlength. */
  static MAX = { brand: 80, product: 120, model: 40, upc: 20 };

  /** What each level means, word for word the same on the page and for the agents. */
  static LEVELS = {
    likely: "Likely recalled: a model number or UPC you gave is listed in an official recall notice.",
    possible: "Possible match: same brand and kind of product as a recall notice, but nothing you gave pins it to the recalled units. Compare the model numbers, date codes or description in the notice.",
    none: "No match found in the notices searched. This does not mean the product is safe: it may be listed in a country or year this index does not cover, or under details you did not give.",
  };

  /** What the index does not cover. The agents read this list instead of guessing. */
  static LIMITS = [
    "Only U.S. (CPSC) and Canadian (Health Canada) recall notices, and only baby and kids gear.",
    "Notices from other countries, including the EU, the UK, Australia and Taiwan, are not searched.",
    "It cannot read photos or labels: type the brand, model number or UPC.",
    "Many notices list no model numbers; then the best answer is a possible match to check by hand.",
    "It does not judge whether a product is safe, and it gives no medical or legal advice.",
    "It does not buy, sell, list or contact anyone, and it keeps no account or history.",
  ];

  /**
   * The sources searched and how fresh they are.
   *
   * :return: Plain data for a result's "searched" field.
   */
  static searched() {
    return {
      sources: META.sources.map((s) => s.name),
      notices: RECORDS.length,
      newestNotice: META.newest,
      indexBuilt: (META.built || "").slice(0, 10),
    };
  }

  /**
   * Check the input without searching. Returns the cleaned query or a refusal.
   *
   * :param args: {brand, product, model, upc}, each optional.
   * :return: {ok: true, query} or {ok: false, reason, field}.
   */
  static validate(args) {
    const q = {};
    for (const key of ["brand", "product", "model", "upc"]) {
      const value = typeof args?.[key] === "string" ? args[key].trim().replace(/\s+/g, " ") : "";
      if (value.length > Checker.MAX[key]) {
        return { ok: false, field: key, reason: `The ${key === "upc" ? "UPC" : key} is longer than ${Checker.MAX[key]} characters.` };
      }
      q[key] = value;
    }
    if (q.upc) {
      const digits = q.upc.replace(/[\s-]/g, "");
      if (!/^\d{8,14}$/.test(digits)) {
        return { ok: false, field: "upc", reason: "A UPC is 8 to 14 digits, from under the bar code." };
      }
      q.upc = digits;
    }
    if (!q.brand && !q.model && !q.upc) {
      return {
        ok: false,
        field: "brand",
        reason: q.product
          ? "Add the brand, a model number or the UPC: a product name alone matches too many notices."
          : "Type the brand and product, a model number or the UPC.",
      };
    }
    return { ok: true, query: q };
  }

  /**
   * Search the index for one product.
   *
   * :param args: {brand, product, model, upc}, each optional.
   * :return: {ok: true, level, meaning, query, matches, searched} or a refusal.
   */
  static check(args) {
    const valid = Checker.validate(args);
    if (!valid.ok) {
      return valid;
    }
    const q = valid.query;
    const found = check(PREPARED, { brand: q.brand, product: q.product, model: q.model, upc: q.upc }, 5);
    return {
      ok: true,
      level: found.level,
      meaning: Checker.LEVELS[found.level],
      query: q,
      matches: found.matches.map((m) => Checker.summary(m.record, m.level, m.why)),
      searched: Checker.searched(),
    };
  }

  /**
   * One match, short enough that five fit easily in a tool result.
   *
   * :param r: The record.
   * :param level: "likely" or "possible".
   * :param why: Why it matched.
   * :return: Plain data.
   */
  static summary(r, level, why) {
    return {
      id: r.id,
      level,
      why,
      source: r.source,
      country: r.country,
      date: r.date,
      title: r.title,
      brand: Checker.brandName(r),
      product: r.products[0] || "",
      hazard: r.hazard,
      remedy: r.remedy,
      units: r.units,
      listedModels: r.models.slice(0, 12),
      moreModels: Math.max(0, r.models.length - 12),
      upcs: r.upcs.slice(0, 5),
      identifiers: r.identifiers,
      url: r.url,
    };
  }

  /**
   * The shortest brand name of a record: "Pearhead", not "Pearhead, of Brooklyn, New York".
   *
   * :param r: The record.
   * :return: The name, or "" when the notice names no firm.
   */
  static brandName(r) {
    const names = [...(r.brands || [])].filter(Boolean).sort((a, b) => a.length - b.length);
    const seen = new Set();
    const out = [];
    for (const n of names) {
      const key = normBrand(n);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(n.split(/,\s*of\b/i)[0]);
      }
    }
    return out.slice(0, 2).join(" / ");
  }

  /**
   * One full notice by id, with its description.
   *
   * :param id: An id from a check result, such as "cpsc-25115".
   * :return: The record or a refusal.
   */
  static notice(id) {
    const r = BY_ID.get(String(id || "").trim());
    if (!r) {
      return { ok: false, field: "id", reason: "No notice has that id. Use an id from a check result." };
    }
    const { level, why, ...base } = Checker.summary(r, null, null);
    return { ok: true, ...base, listedModels: r.models, moreModels: 0, upcs: r.upcs, products: r.products, description: r.description };
  }

  /**
   * What the site searches, what its answers mean and what it cannot do.
   *
   * :return: Plain data.
   */
  static about() {
    return {
      searched: Checker.searched(),
      counts: META.counts,
      noticesWithModelNumbers: META.with_model_numbers,
      noticesWithUpcs: META.with_upcs,
      sources: META.sources,
      levels: Checker.LEVELS,
      limits: Checker.LIMITS,
    };
  }
}
