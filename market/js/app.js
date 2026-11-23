// Hand-Me-Down Market page: the listings, the listing form and its result.
// Rules live in market-store.js. This module reads the form, calls the store and draws
// what it returns. site-actions.js and site.js import App by this same URL, so the
// assistant and the form share one store.
import { MarketStore } from "./market-store.js";

export class MarketPage {
  /**
   * Recalled?'s page. The link in the page and the read action both use this one value.
   * It is Recalled? served on this machine; replace it with its https address when hosted.
   */
  static RECALLED = "http://127.0.0.1:8090/";

  /**
   * Find the page's elements, draw the listings and wire the form.
   *
   * :param doc: The document.
   */
  constructor(doc) {
    this.doc = doc;
    this.store = new MarketStore();
    this.form = doc.getElementById("listing-form");
    this.fields = {
      brand: doc.getElementById("f-brand"),
      product: doc.getElementById("f-product"),
      model: doc.getElementById("f-model"),
      upc: doc.getElementById("f-upc"),
      condition: doc.getElementById("f-condition"),
      price: doc.getElementById("f-price"),
    };
    this.error = doc.getElementById("listing-error");
    this.published = doc.getElementById("publish-result");
    this.list = doc.getElementById("listings");
    this.count = doc.getElementById("listing-count");
    this.recalledLink = doc.getElementById("recalled-link");
    this.recalledLink.href = MarketPage.RECALLED;
    this.lastPublished = null;
    this.drawListings();
    this.form.addEventListener("submit", this.onSubmit.bind(this));
    for (const [key, field] of Object.entries(this.fields)) {
      field.addEventListener("change", this.onFieldChange.bind(this, key, field));
    }
  }

  /**
   * Keep the draft in step with what the seller types, so the assistant reads the same.
   *
   * :param key: The draft field.
   * :param field: Its input.
   */
  onFieldChange(key, field) {
    const result = this.store.fillDraft({ [key]: field.value });
    field.setCustomValidity(result.ok ? "" : result.reason);
  }

  /**
   * The form's own Publish button: take every field, then publish.
   *
   * :param event: The submit event.
   */
  onSubmit(event) {
    event.preventDefault();
    const values = {};
    for (const [key, field] of Object.entries(this.fields)) {
      values[key] = field.value;
      field.setCustomValidity("");
    }
    const filled = this.store.fillDraft(values);
    if (!filled.ok) {
      this.showRefusal(filled);
      this.fields[filled.field]?.reportValidity();
      return;
    }
    const result = this.publish({ expectedVersion: this.store.version });
    if (!result.ok) {
      this.fields[result.field]?.reportValidity();
      return;
    }
    this.fields.brand.focus();
  }

  /**
   * Set draft fields and show them in the form. The seller can still change them.
   *
   * :param fields: Some of brand, product, model, upc, condition, price.
   * :return: {ok, draft, version} or a refusal that changes nothing.
   */
  fillDraft(fields) {
    const result = this.store.fillDraft(fields);
    if (!result.ok) {
      return result;
    }
    this.clearRefusal();
    this.drawDraft();
    return result;
  }

  /**
   * Publish the draft and show the new listing. Moves no focus.
   *
   * :param args: {expectedVersion}.
   * :return: {ok, listing, version} or a refusal that changes nothing.
   */
  publish(args) {
    const result = this.store.publish(args);
    if (!result.ok) {
      this.showRefusal(result);
      return result;
    }
    this.clearRefusal();
    this.lastPublished = result.listing;
    this.published.textContent = `Published ${result.listing.id}: ${result.listing.brand} ${result.listing.product}, ${result.listing.condition}, $${result.listing.price}.`;
    this.published.hidden = false;
    this.drawDraft();
    this.drawListings();
    return result;
  }

  /**
   * The dialog's read-only check: what would be published, or why not.
   *
   * :param args: {expectedVersion}.
   * :return: The store's check.
   */
  checkPublish(args) {
    return this.store.checkPublish(args);
  }

  /**
   * Show a refusal next to the form, with the field's own message.
   *
   * :param result: A refusal.
   */
  showRefusal(result) {
    this.error.textContent = result.reason;
    this.error.hidden = false;
    this.fields[result.field]?.setCustomValidity(result.reason);
  }

  /** Clear the last refusal, so an old error never sits next to a new result. */
  clearRefusal() {
    this.error.textContent = "";
    this.error.hidden = true;
    for (const field of Object.values(this.fields)) {
      field.setCustomValidity("");
    }
  }

  /** Put the draft's values in the form. */
  drawDraft() {
    const d = this.store.draft;
    for (const key of ["brand", "product", "model", "upc", "condition"]) {
      this.fields[key].value = d[key];
    }
    this.fields.price.value = d.price === null ? "" : String(d.price);
  }

  /** Draw every listing, newest first. */
  drawListings() {
    const items = this.store.listings.map(this.listingItem.bind(this));
    this.list.replaceChildren(...items);
    this.count.textContent = String(items.length);
  }

  /**
   * One listing card.
   *
   * :param l: A listing.
   * :return: The list item.
   */
  listingItem(l) {
    const d = this.doc;
    const li = d.createElement("li");
    li.className = "listing";
    const title = d.createElement("h3");
    title.textContent = `${l.brand} ${l.product}`;
    const meta = d.createElement("p");
    meta.className = "listing-meta";
    meta.textContent = [l.condition, l.model ? `Model ${l.model}` : "", l.id].filter(Boolean).join(" · ");
    const price = d.createElement("p");
    price.className = "price";
    price.textContent = `$${l.price}`;
    const check = d.createElement("a");
    check.href = this.recallCheckUrl(l);
    check.textContent = "Check on Recalled?";
    li.append(title, meta, price, check);
    return li;
  }

  /**
   * The Recalled? page with this item filled in.
   *
   * :param l: A listing or draft.
   * :return: The address.
   */
  recallCheckUrl(l) {
    const url = new URL(this.recalledLink.href);
    for (const key of ["brand", "product", "model", "upc"]) {
      if (l[key]) {
        url.searchParams.set(key, l[key]);
      }
    }
    return url.href;
  }

  /**
   * What the page shows, as plain data.
   *
   * :return: Listings, draft, version, choices, the last listing published and the partner's link.
   */
  getState() {
    return {
      listings: this.store.allListings(),
      draft: { ...this.store.draft },
      version: this.store.version,
      conditions: [...MarketStore.CONDITIONS],
      price: `whole dollars from $${MarketStore.PRICE.min} to $${MarketStore.PRICE.max}`,
      lastPublished: this.lastPublished ? { ...this.lastPublished } : null,
      demo: this.doc.getElementById("demo-note").textContent.trim(),
      recallCheck: {
        site: "Recalled?",
        link: this.recalledLink.href,
        draftLink: this.recallCheckUrl(this.store.draft),
      },
    };
  }
}

/** Keeps the one page object that the form, site.js and site-actions.js share. */
export class App {
  static page = new MarketPage(document);
}
