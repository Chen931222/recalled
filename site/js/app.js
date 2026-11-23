// The Recalled? page: the check form, the result panel, and the data line.
// The rules live in checker.js. This module only reads the form, calls the checker and
// draws what it returns. site-actions.js imports App by this same URL, so the assistant
// reads the same page object the form uses.
import { Checker } from "./checker.js";

const LEVEL_WORDS = {
  likely: "Likely recalled",
  possible: "Possible match",
  none: "No match found",
};

export class RecallPage {
  /**
   * Find the page's elements and wire the form.
   *
   * :param doc: The document.
   */
  constructor(doc) {
    this.doc = doc;
    this.form = doc.getElementById("check-form");
    this.fields = {
      brand: doc.getElementById("q-brand"),
      product: doc.getElementById("q-product"),
      model: doc.getElementById("q-model"),
      upc: doc.getElementById("q-upc"),
    };
    this.error = doc.getElementById("check-error");
    this.panel = doc.getElementById("result");
    this.levelEl = doc.getElementById("result-level");
    this.meaningEl = doc.getElementById("result-meaning");
    this.listEl = doc.getElementById("result-list");
    this.searchedEl = doc.getElementById("result-searched");
    this.last = null;
    this.drawDataLine();
    this.form.addEventListener("submit", this.onSubmit.bind(this));
    for (const field of Object.values(this.fields)) {
      field.addEventListener("input", RecallPage.clearValidity.bind(null, field));
    }
  }

  /**
   * Clear a field's message as the visitor types.
   *
   * :param field: The input.
   */
  static clearValidity(field) {
    field.setCustomValidity("");
  }

  /** Fill the line that says what is searched and how fresh it is. */
  drawDataLine() {
    const s = Checker.searched();
    this.doc.getElementById("data-count").textContent = s.notices.toLocaleString("en-US");
    this.doc.getElementById("data-newest").textContent = RecallPage.longDate(s.newestNotice);
    this.doc.getElementById("data-built").textContent = RecallPage.longDate(s.indexBuilt);
    // The network URL is this folder, then the network name (references/linking.md).
    this.doc.getElementById("network-url").textContent = new URL("recall_check", this.doc.URL).href;
  }

  /**
   * "2026-11-19" as "19 Nov 2026".
   *
   * :param iso: A date.
   * :return: The date for people.
   */
  static longDate(iso) {
    const [y, m, d] = String(iso || "").split("-").map(Number);
    if (!y || !m || !d) {
      return "unknown";
    }
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d} ${months[m - 1]} ${y}`;
  }

  /**
   * The form's own submit: check, then move focus to the answer or the field to fix.
   *
   * :param event: The submit event.
   */
  onSubmit(event) {
    event.preventDefault();
    const values = {};
    for (const [key, field] of Object.entries(this.fields)) {
      values[key] = field.value;
    }
    const result = this.run(values);
    if (!result.ok) {
      const field = this.fields[result.field] || this.fields.brand;
      field.setCustomValidity(result.reason);
      field.reportValidity();
      return;
    }
    this.levelEl.focus();
  }

  /**
   * Check a product and show the answer in the result panel. Moves no focus.
   *
   * :param args: {brand, product, model, upc}.
   * :return: The checker's result, or its refusal.
   */
  run(args) {
    const result = Checker.check(args);
    if (!result.ok) {
      this.error.textContent = result.reason;
      this.error.hidden = false;
      return result;
    }
    this.error.textContent = "";
    this.error.hidden = true;
    this.last = result;
    this.draw(result);
    return result;
  }

  /**
   * Draw one result in the panel.
   *
   * :param result: A successful check.
   */
  draw(result) {
    this.panel.hidden = false;
    this.panel.dataset.level = result.level;
    this.levelEl.textContent = LEVEL_WORDS[result.level];
    // The heading already says the level, so the page shows the sentence after it.
    const sentence = result.meaning.replace(/^[^:]+:\s*/, "");
    this.meaningEl.textContent = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    const items = result.matches.map(this.matchItem.bind(this));
    this.listEl.replaceChildren(...items);
    this.listEl.hidden = items.length === 0;
    const s = result.searched;
    this.searchedEl.textContent = `Searched ${s.notices.toLocaleString("en-US")} notices from ${s.sources.join(" and ")}. Newest notice ${RecallPage.longDate(s.newestNotice)}.`;
  }

  /**
   * One match as a list item: what, when, why it matched, hazard, remedy and the link.
   *
   * :param m: A match from the checker.
   * :return: The list item.
   */
  matchItem(m) {
    const d = this.doc;
    const li = d.createElement("li");
    li.className = `match match-${m.level}`;
    const meta = d.createElement("p");
    meta.className = "match-meta";
    meta.textContent = `${LEVEL_WORDS[m.level]} · ${m.source} · ${RecallPage.longDate(m.date)}`;
    const title = d.createElement("h3");
    title.textContent = m.title;
    const why = d.createElement("p");
    why.className = "match-why";
    why.textContent = m.why;
    li.append(meta, title, why);
    const facts = d.createElement("dl");
    const rows = [
      ["Hazard", m.hazard],
      ["What to do", m.remedy],
      ["Units", m.units],
      ["Models listed", m.listedModels.length ? m.listedModels.join(", ") + (m.moreModels ? ` and ${m.moreModels} more` : "") : "None listed in the notice"],
      ["Also check", m.identifiers.join(" ")],
    ];
    for (const [label, value] of rows) {
      if (!value) {
        continue;
      }
      const dt = d.createElement("dt");
      dt.textContent = label;
      const dd = d.createElement("dd");
      dd.textContent = value;
      facts.append(dt, dd);
    }
    li.append(facts);
    if (m.url) {
      const link = d.createElement("a");
      link.href = m.url;
      link.textContent = "Read the official notice";
      link.rel = "noopener";
      li.append(link);
    }
    return li;
  }

  /**
   * What the page shows now, as plain data.
   *
   * :return: The last check on the page, or null, and what the index searches.
   */
  getState() {
    return {
      lastCheckOnPage: this.last ? JSON.parse(JSON.stringify(this.last)) : null,
      searched: Checker.searched(),
    };
  }
}

/** Keeps the one page object that the form, site.js and site-actions.js share. */
export class App {
  static page = new RecallPage(document);
}
