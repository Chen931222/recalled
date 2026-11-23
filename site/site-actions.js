// Registers Recalled?'s operations with the agent runtime. agent-manifest.json loads this
// module through "actions.module"; the names in "actions.agentTools" become website_* tools.
// Every action only reads: none changes the page, so none needs a dialog.
// The rules are in js/checker.js, which the page's own form uses too.
import { App } from "./js/app.js";
import { ActionSpecs } from "./js/action-specs.js";

class SiteActions {
  /**
   * Register the three public reads and the read of this page's own result.
   *
   * :param actions: The runtime registry facade with a register(definition) method.
   */
  static registerActions(actions) {
    for (const definition of ActionSpecs.publicReads()) {
      actions.register(definition);
    }
    actions.register({
      name: "get_page_result",
      description: "Read the check the visitor last ran with this page's own form, and its result, or null if none. Call it when the visitor asks about the result on the page. Changes nothing.",
      effect: "read",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
      execute: SiteActions.pageResult,
    });
  }

  /** :return: What the page shows now. */
  static pageResult() {
    return App.page.getState();
  }
}

export const registerActions = SiteActions.registerActions;
