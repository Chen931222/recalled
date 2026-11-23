// Registers Hand-Me-Down Market's operations with the agent runtime. agent-manifest.json
// loads this module through "actions.module"; the names in "actions.agentTools" become
// website_* tools. The rules are in js/market-store.js, which the page's form uses too.
import { App } from "./js/app.js";
import { MarketStore } from "./js/market-store.js";

class SiteActions {
  /**
   * Register every site action.
   *
   * :param actions: The runtime registry facade with a register(definition) method.
   */
  static registerActions(actions) {
    actions.register(SiteActions.readStateAction());
    actions.register(SiteActions.fillDraftAction());
    actions.register(SiteActions.publishAction());
  }

  static readStateAction() {
    return {
      name: "get_market_state",
      description: "Read the listings (id, brand, product, model, UPC, condition, price), the seller's listing draft, its version, the conditions and price range allowed, the last listing published, and the Recalled? links (the site and the draft filled in). Call it before answering about listings or the draft, and again in each turn that needs it: the visitor can also use the page. Changes nothing.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: SiteActions.readState,
    };
  }

  static readState() {
    return App.page.getState();
  }

  static fillDraftAction() {
    return {
      name: "fill_listing_draft",
      description: "Call it only when the visitor asks to list an item or change the draft. Sets the given fields of the listing form on the page, keeping the others. Returns the draft and its new version, or ok false with a reason. Does not publish.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          brand: { type: "string", maxLength: MarketStore.MAX.brand, description: "Brand the seller gave." },
          product: { type: "string", maxLength: MarketStore.MAX.product, description: "What the item is, as the seller said." },
          model: { type: "string", maxLength: MarketStore.MAX.model, description: "Model number from the label, only if the seller gave it." },
          upc: { type: "string", maxLength: MarketStore.MAX.upc, description: "UPC digits, only if the seller gave them." },
          condition: { type: "string", enum: MarketStore.CONDITIONS, description: "Condition the seller chose." },
          price: { type: "integer", minimum: 0, maximum: 100000, description: "Asking price in whole dollars, as the seller said." },
        },
      },
      execute: SiteActions.fillDraft,
    };
  }

  static fillDraft(args) {
    return App.page.fillDraft(args);
  }

  static publishAction() {
    return {
      name: "publish_listing",
      description: "Publish the listing draft. In the turn you call it, first call website_get_market_state and wait for its result: this needs its current version, and results from earlier turns are not kept. The browser asks the visitor to confirm. The site refuses a stale expectedVersion or a draft missing brand, product, condition or price. Returns the new listing's id.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["expectedVersion"],
        properties: {
          expectedVersion: {
            type: "integer",
            minimum: 0,
            description: "The latest draft version in this turn: from website_get_market_state, or from a website_fill_listing_draft made after that read.",
          },
        },
      },
      execute: SiteActions.publish,
    };
  }

  static publish(args) {
    return App.page.publish(args);
  }
}

export const registerActions = SiteActions.registerActions;
