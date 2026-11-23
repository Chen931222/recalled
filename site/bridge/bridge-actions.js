// The reads Recalled? shares with other agent sites, through its action bridge. The build
// names this file in bridge/agent-manifest.json. A caller loads the bridge in a hidden
// frame on this site's origin, which has no page, so nothing here touches the DOM.
//
// All three reads return public facts from official notices, the same as the page shows,
// so they are shared with every site ("*"): a marketplace, a parenting forum or a
// second-hand shop can let its visitors check an item before they buy or list it.
import { ActionSpecs } from "../js/action-specs.js";

class BridgeActions {
  /** Every site may call these reads. They show only public recall notices. */
  static CALLERS = ["*"];

  /**
   * Register the shared reads with the bridge's registry.
   *
   * :param actions: The runtime registry facade with a register(definition) method.
   */
  static registerActions(actions) {
    for (const definition of ActionSpecs.publicReads()) {
      actions.register({ ...definition, availability: "bridge", callerOrigins: BridgeActions.CALLERS });
    }
  }
}

export const registerActions = BridgeActions.registerActions;
