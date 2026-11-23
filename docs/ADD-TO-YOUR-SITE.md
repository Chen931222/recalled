# Add Recalled? to your site

For anyone who runs a marketplace, a resale group, a parenting forum or a second-hand shop and already has an [Open Agentic Web](https://github.com/cognizant-ai-labs/agentic-web) assistant. Your assistant can ask Recalled? whether an item was recalled before a listing goes up or a buyer pays.

Nothing to install, no key, no account. The call runs in your visitor's browser, on the visitor's own LLM key, after they agree on a consent card.

## Three edits

`<recalled>` below is the folder Recalled? is served from, for example `https://example.org/recalled`.

1. **Manifest** (`agent-manifest.json`): add Recalled?'s origin to `allowed_peers` and keep `peer_policy.mode` `"closed"`.

   ```json
   "allowed_peers": ["https://example.org"]
   ```

2. **Network** (`<your network>.hocon`): put the network URL in the calling agent's `tools`, and give the consent card a label.

   ```hocon
   "link_labels": {
       "<recalled>/recall_check": "Recalled?"
   },
   ...
   "tools": ["<recalled>/recall_check"]
   ```

3. **Instructions**: one "How to work" line, and the standard `{partner_rules}` from the skill's `templates/network.hocon`.

   ```text
   - For a recall check, ask recall_check in one short line with the brand, the product and the model number or UPC if known, such as "Recall check: Pearhead Infant Learning Toy Set, model 87150". If it says likely recalled, do not publish the listing. Never call an item safe.
   ```

   The tool name comes from the URL's path: `https://example.org/recalled/recall_check` becomes `recalled_recall_check`. The build prints it.

Then rebuild and check the call from your origin:

```shell
node SKILL_DIR/scripts/build_network.mjs <your network>.hocon --manifest agent-manifest.json --check
node SKILL_DIR/scripts/check_partner.mjs <recalled>/recall_check --origin https://your-site.example
```

`market/` in this repository is a working example: `market/hand_me_down_market.hocon`, `market/agent-manifest.json`, and the test `testRecalledIsThePartner` in `market/tests/agentified.test.mjs`.

## What your assistant can get back

Recalled?'s bridge shares three reads with every site (`callerOrigins: ["*"]`). They return only facts from public notices.

| Read | Input | Returns |
|---|---|---|
| `check_recall` | `brand`, `product`, `model`, `upc` (all optional, at least a brand, model or UPC) | `level` (`likely`, `possible`, `none`), what that level means, up to 5 notices (title, date, source, hazard, what to do, listed models, link) and what was searched |
| `get_recall_notice` | `id` from a check | the whole notice: every listed model and UPC, products, and how the notice says to identify recalled units |
| `get_about` | none | sources, licences, counts, newest notice date, what each level means, what Recalled? cannot do |

`none` never means safe. It means none of the U.S. CPSC and Health Canada notices in the index list the item.

## Without an assistant

Link straight to the check page with the item filled in. It needs no AI:

```text
<recalled>/?brand=Graco&product=Quattro%20Tour%20stroller&model=7Q00ABC
```

## What a request contains, and what it costs

- The consent card shows "Recalled?", its host and the first 140 characters of your assistant's request. The request should hold only the brand, product and model or UPC. The runtime does not filter it, so never put a seller's name, email, phone number or address in it.
- Recalled?'s network then runs in the visitor's browser on the visitor's key, at most once per visitor message. It costs more than the card's token estimate.

## Use the data directly

`site/data/recalls.json` is the merged index, rebuilt daily by `.github/workflows/update-data.yml` from:

- U.S. Consumer Product Safety Commission Recalls API (U.S. government work), and
- Health Canada Recalls and Safety Alerts (Open Government Licence – Canada).

Each record: `id, source, country, date, title, brands, products, types, models, upcs, identifiers, hazard, remedy, units, description, url`. Model numbers are read out of each notice's text, because the CPSC API leaves its model field empty. No images are copied. The matcher is `site/js/match.js`, a pure function with no network and no model, so you can run the same check on your server.
