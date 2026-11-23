# Recalled? — demo video script (under 2:00)

Rules: shows the project running in a browser; narrated by the entrant, not AI; YouTube public; no third-party trademarks shown as branding, no copyrighted music. Brand names inside official recall notices appear as data, read from the notices.

Read at a normal pace: about 270 words, roughly 1:50. Short sentences on purpose. Lines in [brackets] are what is on screen.

---

**0:00 – 0:15 — The problem**

[Recalled? home page, masthead.]

Every year, strollers, cribs and baby sleepers get recalled. The new ones come off the shelves. The used ones don't. They end up on resale sites, and the person selling usually has no idea.

**0:15 – 0:40 — Check without any AI**

[Type "Fisher-Price", "Rock n Play Sleeper". Press Check. The red LIKELY RECALLED appears.]

Recalled? checks an item against official recall notices from the U.S. Consumer Product Safety Commission and Health Canada. Three thousand three hundred notices, rebuilt every day. This check needs no AI and no key.

[Scroll to the first notice: hazard, what to do, link.]

It answers likely, possible, or no match found. It never says "safe". No match only means none of these notices list it.

**0:40 – 1:00 — Ask in your own words**

[Scroll to Ask Recalled?. Type: "I'm selling a Pearhead learning set, model 87150. Is it recalled?" The answer appears with the hazard and the notice link.]

The assistant is an open agentic web network. It runs in my browser, on my own key, and it can only answer from tool results: the level, the hazard, what to do, and the official link.

**1:00 – 1:40 — Another site asks it**

[Switch to Hand-Me-Down Market, a second site on another origin. Type: "List my Pearhead infant learning set, model 87150, like new, twelve dollars." The consent card appears: "Recalled?", its host, the request.]

This is a different website: a demo resale page. Before a listing goes up, its assistant asks Recalled?. I see exactly what will be sent, and nothing leaves until I allow it.

[Allow. The market's assistant reports likely recalled and does not publish.]

Recalled? says likely recalled, so the listing is not published. Any marketplace can add this with three edits. The guide is in the repository.

**1:40 – 1:55 — What I measured, and what it can't do**

[README "Measured" table.]

I tested it on every recall of a million units or more: sixty-one of sixty-two found in the top five. My first version missed two huge recalls, so I wrote that down too. It only covers the U.S. and Canada, and it can't read photos.

**1:55** — Recalled? Check before you buy, or sell.

---

## Recording checklist (AI prepares, you record)

- [ ] Both sites deployed, or both running locally (`serve_site.mjs` on 127.0.0.1:8090 and localhost:8091).
- [ ] Your own LLM key entered by you in ⚙ AI model settings on both sites, with a low spending limit. Delete the saved setup and close the tabs after recording.
- [ ] Do one full rehearsal run first; the model's wording changes between runs, so record the run whose answer cites the notice link.
- [ ] Browser zoom 125%, window 1280×800, no bookmarks bar, no other tabs.
- [ ] Narration recorded separately or live; AI only cuts and syncs, never generates the voice.
