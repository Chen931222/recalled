# Devpost text draft — Recalled?

Deployed 2026-11-23. Numbers verified 2026-11-23 from the repository; re-run `node tests/eval.mjs` before submitting.

## Tagline

Before you buy or list second-hand baby gear, check whether it was recalled. Any marketplace's assistant can ask it too.

## Inspiration

Recalls take new strollers, cribs and sleepers off store shelves. Used ones keep circulating through resale sites, and the person listing them rarely reads recall notices. Some notices say outright that selling the recalled product is illegal. The notices are public and free, but they are written for regulators, the model numbers are buried in paragraphs of text, and no resale site asks the question at the moment it matters: before the listing goes up.

## What it does

- **A check page that needs no AI.** Type a brand, a product, and the model number or UPC if you have it. Recalled? searches 3,339 baby and kids gear notices from the U.S. Consumer Product Safety Commission and Health Canada and answers **Likely recalled**, **Possible match** or **No match found**, with the hazard, what to do and a link to each official notice. It never says "safe".
- **An assistant** (an Open Agentic Web network, one agent, four read-only tools) that explains the notices in plain words and answers only from tool results.
- **A partner for other sites.** Its action bridge shares three reads with every site. The repository includes a second site on another origin, Hand-Me-Down Market, whose assistant asks Recalled? after a consent card before it publishes a listing.
- **A guide and a dataset for the community.** `docs/ADD-TO-YOUR-SITE.md` adds Recalled? to any agentic site in three edits; the merged index is rebuilt daily by a GitHub Action that only commits when the evaluation and all tests pass.

## How we built it

- `scripts/build_data.py` downloads both open datasets (CPSC Recalls API, U.S. government work; Health Canada Recalls and Safety Alerts, Open Government Licence – Canada) and keeps baby and kids gear. The CPSC API leaves its model field empty, so model numbers are read from each notice's text.
- `site/js/match.js` is a pure function: no network, no model. The same code runs in the page, in the bridge frame other sites call, and in the tests.
- The site was agentified with the official `agentify-website` skill and its runtime, unchanged. `build_network.mjs --check` passes with no warnings for both sites; `check_partner.mjs` confirms the market can call Recalled?.
- Two live checks with a real model (Claude Haiku 5.5): Recalled? alone 8/8, and the full partner flow 3/3. The market's assistant asked Recalled? after the consent card, did not publish the two recalled items, and kept a seller's email out of the request. About US$0.06 in all; every answer is saved in the repository.
- 39 Node tests with a scripted model, no key: the page and the assistant give the same answer; reads leave the page unchanged; refusals change nothing; the market's publish dialog shows the real listing; the market is offered Recalled? as a partner.

## Challenges we ran into

My first index had 1,138 notices and missed the 2019 Rock 'n Play recall (4.7 million sleepers, deaths reported) and the 2021 Boppy lounger recall (3.3 million). The filter wanted "infant" or "baby" in the description; those notices put it only in the hazard. I found it by checking famous recalls by hand. The fixed filter keeps 3,339 notices, and I added a test that fails if a recall like that goes missing again.

The second problem: "All models of Rock 'n Play Sleepers" lists no model numbers, so it only came back as a possible match. Notices that cover every model of a named product line are now "likely" when you name that line, and stay "possible" when you only name the kind of product.

## Accomplishments that we're proud of

Measured on the index, not claimed:

| Test | Result |
|---|---|
| Every notice of 1 million units or more, queried by brand and the first words of the product name | 61 of 62 in the top 5 |
| 50 queries with a listed model number, typed loosely | 50/50 likely |
| 25 queries for notices that list no model | 25/25 in the top 3 |
| 25 queries with a model the notice does not list | 25/25 not "likely" |
| 25 made-up brands | 25/25 "no match found" |

The last four sets are built from the notices themselves, not typed by real people, and I changed two test definitions after the first run (117/125). The README says exactly what changed.

## What we learned

"No match found" and "safe" are different answers, and the interface has to keep saying so. Most of the work was in the data, not the agent.

## What's next

- Notices from more countries where the licence allows it.
- A read-only MCP service so non-browser agents can ask too.
- Real listing text: pull brand and model out of a pasted listing before checking.

## Limits

U.S. and Canadian notices only; no photo or label reading; about seven in eight notices list no model number, so many answers are "possible match" and need a human to read the notice. The assistant runs on the visitor's key, and the LLM provider must allow CORS.

## Built with

JavaScript, Python, Open Agentic Web runtime and agentify-website skill, CPSC Recalls API, Health Canada open data, GitHub Actions.

## Links

- Site: https://chen931222.github.io/recalled/
- Demo partner site: https://hand-me-down-market-demo.vercel.app/
- Network URL: https://chen931222.github.io/recalled/recall_check
- Code: https://github.com/Chen931222/recalled

## Image gallery

Upload in this order from `contest/gallery/` (1500×1000, 3:2, captured 2026-11-23 from the deployed code with the check filled in from the address bar; no AI, no key):

1. `01-cover-likely-recalled.png`: the check page, model 87150 entered, "Likely recalled".
2. `02-model-listed.png`: the notice card: model 87150 is listed, hazard, what to do, official link.
3. `03-all-models-of-a-line.png`: Rock 'n Play: a notice with no model numbers that covers the whole product line.
4. `04-no-match-is-not-safe.png`: a made-up brand: "No match found", and why that is not "safe".
5. `05-partner-site.png`: Hand-Me-Down Market, a second site, with Recalled? listed as its partner network.
