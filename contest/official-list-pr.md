# PR to cognizant-ai-labs/agentic-web: add Recalled? to docs/agentic_websites.md

Sent 2026-11-23 with the owner's OK: https://github.com/cognizant-ai-labs/agentic-web/pull/73

Row to append to the table:

|https://chen931222.github.io/recalled/|Recalled?| Before you buy or list second-hand baby gear, check it against 3,339 U.S. CPSC and Health Canada recall notices: likely recalled, possible match or no match found (never "safe"), with the hazard, what to do and the official link. The check needs no AI key; the assistant answers only from the notices. Callable by peers: its bridge shares three reads with every site, and a demo resale site on a second origin asks it after a consent card before publishing a listing.| Chen931222 | [Link](https://chen931222.github.io/recalled/recall_check.network.json) |

PR title: Add Recalled? to agentic websites

PR body:
Adds Recalled? (https://chen931222.github.io/recalled/), which checks second-hand baby and kids gear against U.S. CPSC and Health Canada recall notices. Network: https://chen931222.github.io/recalled/recall_check. Its bridge shares check_recall, get_recall_notice and get_about with every origin; the demo partner https://hand-me-down-market-demo.vercel.app/ calls it after a consent card. `check_partner.mjs` passes from the partner's origin. Code: https://github.com/Chen931222/recalled
