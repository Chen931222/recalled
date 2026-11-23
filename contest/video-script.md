# Recalled? — demo video script (under 2:00)

Rules: shows the project running in a browser; narrated by the entrant, not AI; YouTube public; no third-party trademarks shown as branding, no copyrighted music. Brand names inside official recall notices appear as data, read from the notices.

Read at a normal pace: about 250 words, roughly 1:45. Short sentences on purpose. Lines in [brackets] are what is on screen.

---

**0:00 – 0:15 — The problem**

[Recalled? home page, masthead.]

Every year, strollers, cribs and baby sleepers get recalled. The new ones come off the shelves. The used ones don't. They end up on resale sites, and the person selling usually has no idea.

**0:15 – 0:40 — Check without any AI**

[Type "Fisher-Price", "Rock n Play Sleeper". Press Check. The red LIKELY RECALLED appears.]

Recalled? checks an item against official recall notices from the U.S. Consumer Product Safety Commission and Health Canada. Three thousand three hundred notices, rebuilt every day. This check needs no AI and no key.

[Scroll to the first notice: hazard, what to do, link.]

It answers likely, possible, or no match found. It never says "safe". No match only means none of these notices list it.

**0:40 – 1:00 — The assistant, and a second site**

[Scroll to Ask Recalled?. Then switch to Hand-Me-Down Market, a second site on another origin; point at "Recalled? partner network" in its assistant panel. Do not open the settings or type a key on camera.]

The assistant is an open agentic web network. It runs in the visitor's browser, on the visitor's own key, and answers only from tool results. This is a different website, a demo resale page. Before a listing goes up, its assistant asks Recalled?.

**1:00 – 1:40 — The real run**

[Terminal at the repository root. Run `node tests/live/market_live.mjs`. The transcript prints each request, the consent card and the answer.]

Here both networks run on a real model. The market's assistant fills in the draft, then asks Recalled?. The consent card shows exactly what is sent: the brand, the product and the model number. Nothing else. In the third listing I typed my email; it never reaches the card.

[Point at the Pearhead answer: "likely recalled … I did not publish it", with the CPSC link.]

Recalled? says likely recalled, so the listing is not published. Any marketplace can add this with three edits. The guide is in the repository.

**1:40 – 1:55 — What I measured, and what it can't do**

[README "Measured" table.]

I tested it on every recall of a million units or more: sixty-one of sixty-two found in the top five. My first version missed two huge recalls, so I wrote that down too. It only covers the U.S. and Canada, and it can't read photos.

**1:55** — Recalled? Check before you buy, or sell.

---

## Recording checklist (AI prepares, you record)

- [ ] No key is typed into any website. The terminal run reads the key from the `ANTHROPIC_API_KEY` user environment variable that is already set; one run costs about US$0.04 (measured 2026-11-23: 12 model calls, 49,802 input and 4,853 output tokens on Haiku 5.5).
- [ ] The terminal command, from `G:\Projects\recalled` in PowerShell: set `$env:ANTHROPIC_API_KEY` from the user variable and `$env:SDK_DIR = 'G:/Projects/bookshelf'`, then `node tests/live/market_live.mjs`. The AI gives you the one-line version before recording.
- [ ] Do one rehearsal run first; the model's wording changes between runs, so record a run where all three end "ok".
- [ ] Browser zoom 125%, window 1280×800, no bookmarks bar, no other tabs. Terminal font large enough to read at 1080p.
- [ ] Narration recorded separately or live; AI only cuts and syncs, never generates the voice.

Rules check (verified 2026-11-23 from the Devpost rules): under two minutes; "should include footage that shows the Project running in a web browser" (0:00–1:00 and 1:40 are in the browser); "should include the Entrant explaining the Project"; public on YouTube.
