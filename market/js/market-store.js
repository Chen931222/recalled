// Hand-Me-Down Market: a demo resale site for second-hand baby and kids gear.
// The listings below are made up for the demo. The brands and products are real things
// people resell; nothing here is a real seller or a real offer.
// This module has no DOM: the page (js/app.js), the actions (site-actions.js) and the
// tests share these rules. A real site would keep listings on its server; this demo
// keeps them in the tab.

export class MarketStore {
  /** The conditions a seller can pick, in the order the form shows them. */
  static CONDITIONS = ["Like new", "Good", "Fair"];

  /** Longest value each field takes, the same as the form's maxlength. */
  static MAX = { brand: 60, product: 100, model: 40, upc: 20 };

  /** Lowest and highest asking price, in whole dollars. */
  static PRICE = { min: 1, max: 2000 };

  /** The demo's listings when a tab opens. */
  static SEED = [
    { id: "L-101", brand: "Pearhead", product: "Infant Learning Toy Set", model: "87150", upc: "", condition: "Like new", price: 12 },
    { id: "L-102", brand: "Graco", product: "Modes Element stroller", model: "", upc: "", condition: "Good", price: 85 },
    { id: "L-103", brand: "Joovy", product: "Nook high chair", model: "", upc: "", condition: "Good", price: 40 },
    { id: "L-104", brand: "Fisher-Price", product: "Rock 'n Play Sleeper", model: "", upc: "", condition: "Fair", price: 20 },
    { id: "L-105", brand: "UPPAbaby", product: "Vista stroller", model: "", upc: "", condition: "Like new", price: 420 },
    { id: "L-106", brand: "Stokke", product: "Tripp Trapp high chair", model: "", upc: "", condition: "Good", price: 150 },
  ];

  /**
   * Start a fresh store, as a fresh tab does.
   */
  constructor() {
    this.listings = MarketStore.SEED.map((l) => ({ ...l }));
    this.draft = MarketStore.emptyDraft();
    this.version = 0;
    this.nextNumber = 107;
  }

  /** :return: A draft with every field empty. */
  static emptyDraft() {
    return { brand: "", product: "", model: "", upc: "", condition: "", price: null };
  }

  /**
   * Check draft fields without changing anything. Any field left out keeps its value.
   *
   * :param fields: Some of brand, product, model, upc, condition, price.
   * :return: {ok: true, draft} with the merged draft, or {ok: false, reason, field}.
   */
  mergeDraft(fields) {
    const next = { ...this.draft };
    for (const key of ["brand", "product", "model", "upc"]) {
      if (fields[key] === undefined) {
        continue;
      }
      const value = String(fields[key]).trim().replace(/\s+/g, " ");
      if (value.length > MarketStore.MAX[key]) {
        return { ok: false, field: key, reason: `The ${key === "upc" ? "UPC" : key} can be at most ${MarketStore.MAX[key]} characters.` };
      }
      next[key] = value;
    }
    if (fields.condition !== undefined && fields.condition !== "") {
      if (!MarketStore.CONDITIONS.includes(fields.condition)) {
        return { ok: false, field: "condition", reason: `Condition is one of ${MarketStore.CONDITIONS.join(", ")}.` };
      }
      next.condition = fields.condition;
    }
    if (fields.price !== undefined && fields.price !== null && fields.price !== "") {
      const price = Number(fields.price);
      if (!Number.isInteger(price) || price < MarketStore.PRICE.min || price > MarketStore.PRICE.max) {
        return { ok: false, field: "price", reason: `The price is whole dollars from $${MarketStore.PRICE.min} to $${MarketStore.PRICE.max}.` };
      }
      next.price = price;
    }
    if (next.upc && !/^\d{8,14}$/.test(next.upc.replace(/[\s-]/g, ""))) {
      return { ok: false, field: "upc", reason: "A UPC is 8 to 14 digits, from under the bar code." };
    }
    return { ok: true, draft: next };
  }

  /**
   * Change the listing draft. The seller can change it again before publishing.
   *
   * :param fields: Some of brand, product, model, upc, condition, price.
   * :return: {ok: true, draft, version} or a refusal that changes nothing.
   */
  fillDraft(fields) {
    const merged = this.mergeDraft(fields);
    if (!merged.ok) {
      return merged;
    }
    this.draft = merged.draft;
    this.version += 1;
    return { ok: true, draft: { ...this.draft }, version: this.version };
  }

  /**
   * The read-only check publish() runs first, and the confirmation dialog runs too.
   *
   * :param args: {expectedVersion}.
   * :return: {ok: true, listing} with the listing that would be published, or a refusal.
   */
  checkPublish(args) {
    if (args.expectedVersion !== this.version) {
      return { ok: false, field: "expectedVersion", reason: "The draft changed since it was read. Read it again before publishing." };
    }
    const d = this.draft;
    if (!d.brand) {
      return { ok: false, field: "brand", reason: "Add the brand." };
    }
    if (!d.product) {
      return { ok: false, field: "product", reason: "Add what the item is." };
    }
    if (!d.condition) {
      return { ok: false, field: "condition", reason: "Pick the condition." };
    }
    if (d.price === null) {
      return { ok: false, field: "price", reason: "Add the asking price." };
    }
    return { ok: true, listing: { id: `L-${this.nextNumber}`, ...d, upc: d.upc.replace(/[\s-]/g, "") } };
  }

  /**
   * Publish the draft as a listing. In this demo it stays in the tab.
   *
   * :param args: {expectedVersion}.
   * :return: {ok: true, listing, version} or a refusal that changes nothing.
   */
  publish(args) {
    const check = this.checkPublish(args);
    if (!check.ok) {
      return check;
    }
    this.listings.unshift(check.listing);
    this.nextNumber += 1;
    this.draft = MarketStore.emptyDraft();
    this.version += 1;
    return { ok: true, listing: { ...check.listing }, version: this.version };
  }

  /** :return: Copies of the listings, newest first. */
  allListings() {
    return this.listings.map((l) => ({ ...l }));
  }

  /** :return: The ids of the listings. */
  listingIds() {
    return this.listings.map((l) => l.id);
  }
}
