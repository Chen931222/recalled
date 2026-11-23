# Recalled?

Before you buy or list second-hand baby gear, check whether it was recalled. Any marketplace's assistant can ask it too.

A static website plus an [Open Agentic Web](https://github.com/cognizant-ai-labs/agentic-web) agent network. The check itself needs no AI and no key. The assistant runs in the visitor's browser on their own LLM key.

## What it searches

| Source | Notices kept | Licence |
|---|---|---|
| U.S. CPSC Recalls API | 854 | U.S. government work |
| Health Canada Recalls and Safety Alerts | 284 | Open Government Licence – Canada |

Only baby and kids gear: strollers, cribs, bassinets, car seats, high chairs, play yards, carriers, baby toys and similar. 1,138 notices; 295 list model numbers, 15 list UPCs (index built 2026-11-23, newest notice 2026-11-19).

The CPSC API leaves its model field empty, so model numbers are read out of each notice's description. About three in four list none. For those, the best answer is a possible match that you confirm by reading the notice.

## Answers

- **Likely recalled**: a model number or UPC you gave is listed in a notice.
- **Possible match**: same brand and kind of product, nothing exact.
- **No match found**: none of the notices searched list it. Not the same as safe.

## Measured

`node tests/eval.mjs`: 125 synthetic queries built from the notices.

| Set | Result |
|---|---|
| Brand + product + a listed model, typed loosely | 50/50 likely, on the right notice or one listing the same model |
| Brand + product, notice lists no model | 25/25 in the top 3 |
| Same brand + product, model not in the notice | 25/25 not "likely" for that notice |
| Brands not in any notice | 25/25 "none" |

Limits of this measurement: the queries are built from the notices, not typed by real people. The first run scored 117/125. I then changed the matcher (14-digit codes count as UPCs; "2-in-1" is not a model) and also changed two test definitions after seeing the failures (a match to another notice listing the same model counts as right; negatives skip notices whose product name contains a model). Treat 125/125 as "fits its own test set", not as accuracy on real listings.

## Agent network

- Network URL: the site folder, then `recall_check` (for example `http://localhost:8090/recall_check`).
- One agent, `recall_checker`, with four read tools: `check_recall`, `get_recall_notice`, `get_about`, `get_page_result`. Nothing can be bought, changed or sent, so no action needs a confirmation dialog.
- The bridge shares `check_recall`, `get_recall_notice` and `get_about` with every site (`callerOrigins: ["*"]`): they return only public notices. A partner adds `http://<host>` to `allowed_peers` and the network URL to its agent's `tools`.
- The assistant answers only from tool results, never says a product is safe, and gives the official notice link for every match.

## Run it

```shell
python scripts/build_data.py              # download both sources and rebuild site/data (or --offline)
git clone --depth 1 https://github.com/cognizant-ai-labs/agentic-web vendor/agentic-web
node vendor/agentic-web/skills/agentify-website/scripts/build_network.mjs site/recall_check.hocon --manifest site/agent-manifest.json --check
node --test "site/tests/*.test.mjs"       # 16 tests, scripted model, no key
node tests/eval.mjs                       # matcher evaluation
node vendor/agentic-web/skills/agentify-website/scripts/serve_site.mjs site --port 8090
```

When hosted, serve `site/` over HTTPS. Send `Access-Control-Allow-Origin: *` on `agent-manifest.json`, `recall_check.network.json`, `links.json`, `agent-mcp.json`, `.well-known/*` and `bridge/*`, and do not block framing of `bridge/action-bridge.html` (see the skill's `references/bundle_and_hosting.md`).

## Limits

- U.S. and Canadian notices only; no EU, UK, Australian or Taiwanese data.
- No photo or label reading.
- Static hosting with the skill's patched copy of the nsdeploy runtime (`site/runtime/`, Apache 2.0, unchanged).
- The network file, including its instructions, is public.
- The LLM provider the visitor picks must allow CORS.

Not affiliated with CPSC or Health Canada.
