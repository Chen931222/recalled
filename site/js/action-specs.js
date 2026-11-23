// The reads Recalled? offers, defined once. site-actions.js registers them for the page's
// own assistant; bridge/bridge-actions.js shares the same three with every other agent
// site. No DOM here, so the bridge frame (which has no page) can load it.
import { Checker } from "./checker.js";

export class ActionSpecs {
  /** The input of check_recall. */
  static CHECK_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
      brand: { type: "string", maxLength: Checker.MAX.brand, description: "Brand or maker as the visitor or listing gives it, such as Graco." },
      product: { type: "string", maxLength: Checker.MAX.product, description: "What the product is, such as stroller, crib or car seat, with any product name." },
      model: { type: "string", maxLength: Checker.MAX.model, description: "Model number from the label, if given. Leave out if unknown; never guess one." },
      upc: { type: "string", maxLength: Checker.MAX.upc, description: "UPC digits from under the bar code, if given." },
    },
  };

  /**
   * The three public reads: check a product, read one notice, read what is searched.
   *
   * :return: Action definitions without availability.
   */
  static publicReads() {
    return [
      {
        name: "check_recall",
        description: "Check one product against official U.S. (CPSC) and Canadian (Health Canada) recall notices for baby and kids gear. Give the brand and product, plus the model number or UPC when known. Returns level likely, possible or none, what that level means, up to 5 matching notices (hazard, remedy, listed models, link) and what was searched; or ok false with a reason. Call it once per product asked about. Changes nothing.",
        effect: "read",
        inputSchema: ActionSpecs.CHECK_SCHEMA,
        execute: Checker.check,
      },
      {
        name: "get_recall_notice",
        description: "Read one recall notice in full by its id from a check_recall result: every listed model and UPC, the products, and how the notice says to identify recalled units. Call it when the visitor needs to compare details. Changes nothing.",
        effect: "read",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: { id: { type: "string", minLength: 3, maxLength: 40, description: "A notice id from a check_recall result, such as cpsc-25115." } },
        },
        execute: ActionSpecs.notice,
      },
      {
        name: "get_about",
        description: "Read what Recalled? searches (sources, licences, number of notices, newest notice date), what each result level means and what it cannot do. Call it before answering about coverage, freshness or limits. Changes nothing.",
        effect: "read",
        inputSchema: { type: "object", additionalProperties: false, properties: {} },
        execute: Checker.about,
      },
    ];
  }

  /**
   * :param args: {id}.
   * :return: The notice or a refusal.
   */
  static notice(args) {
    return Checker.notice(args.id);
  }
}
