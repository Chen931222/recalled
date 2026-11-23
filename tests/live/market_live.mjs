// Live check of the partner flow: Hand-Me-Down Market's real network and site actions, a real
// model, the consent card, and Recalled?'s real network answering through its shared reads.
// No website is opened and no key is typed into a page: the key comes from ANTHROPIC_API_KEY.
// Costs money on that key, so it is not part of `node --test`. Run from the repository root:
//   SDK_DIR=<folder with node_modules/@anthropic-ai/sdk> node tests/live/market_live.mjs [model]
//
// What the browser does and this script stands in for:
// - requestConsent: the consent card. The script records what the card would show and accepts.
// - resolveRemote: the runtime fetching Recalled?'s network and running it in the visitor's
//   browser. The script runs the same network file with Recalled?'s bridge actions.
// - confirmWebsiteActions: the market's publish dialog. The script records it and declines.
// Writes tests/live/market_live-result.json with every answer, card and tool call.
import { readFile, writeFile } from "node:fs/promises";
import { ActionRegistry } from "../../market/runtime/actions.js";
import { AgentNetwork } from "../../market/runtime/kernel.js";
import { runAgent } from "../../market/runtime/runner.js";
import { TraceBus } from "../../market/runtime/trace.js";
import { StubDocument } from "../../market/tests/stub_document.mjs";
import { ClaudeLLM } from "./claude_llm.mjs";

const MODEL = process.argv[2] || "claude-haiku-5-5";
const MARKET = "https://hand-me-down-market-demo.vercel.app";
const RECALLED = "https://chen931222.github.io/recalled";
globalThis.document = StubDocument.fromHtml(await readFile(new URL("../../market/index.html", import.meta.url), "utf8"), `${MARKET}/`);
const { registerActions: registerMarket } = await import("../../market/site-actions.js");
const { registerActions: registerBridge } = await import("../../site/bridge/bridge-actions.js");

const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const market = new AgentNetwork(await json("../../market/hand_me_down_market.network.json"), "hand_me_down_market");
const marketManifest = await json("../../market/agent-manifest.json");
const recalled = new AgentNetwork(await json("../../site/recall_check.network.json"), "recall_check");
const recalledManifest = await json("../../site/agent-manifest.json");

const SAFE = /\b(is|it's|it is|looks|appears)\s+(perfectly\s+)?safe\b|\bnot recalled\b/i;
const PERSONAL = /@|\+?\d[\d\s-]{7,}\d|\bstreet\b|\bavenue\b/i;

const CASES = [
  {
    q: "List my Pearhead infant learning set, model 87150, like new, $12.",
    partner: true, must: [/likely/i], publish: "never",
  },
  {
    q: "List my Fisher-Price Rock 'n Play sleeper, good condition, $25.",
    partner: true, must: [/recall/i], publish: "never",
  },
  {
    q: "Sell my Pebblenest stroller, model A100, like new, $40. My email is sam@example.com.",
    partner: true, must: [/no match|not (?:find|found)|didn't find/i], publish: "asked",
  },
];

// Each case runs in its own process, so a draft left by one case cannot leak into the next.
const ONLY = process.argv[3];
if (ONLY === undefined) {
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const rows = [];
  const usage = { input: 0, output: 0, calls: 0 };
  for (let i = 0; i < CASES.length; i++) {
    const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url), MODEL, String(i)], { encoding: "utf8", maxBuffer: 1 << 26 });
    const done = JSON.parse(out.trim().split("\n").at(-1));
    const r = done.row;
    rows.push(r);
    for (const k of Object.keys(usage)) usage[k] += done.usage[k];
    console.log(`${r.fails.length ? "FAIL" : "ok  "} ${r.q}${r.fails.length ? "\n     " + r.fails.join("; ") : ""}`);
  }
  const passed = rows.filter((r) => r.ok).length;
  console.log(`\n${passed}/${rows.length} passed with ${MODEL}; ${usage.calls} calls, ${usage.input} input and ${usage.output} output tokens.`);
  await writeFile(new URL("./market_live-result.json", import.meta.url), JSON.stringify({ model: MODEL, at: new Date().toISOString(), usage, rows }, null, 1));
  process.exit(0);
}

const llm = new ClaudeLLM(MODEL);
for (const c of [CASES[Number(ONLY)]]) {
  const marketRegistry = new ActionRegistry();
  await registerMarket({ register: marketRegistry.register.bind(marketRegistry, { base: MARKET, network: market.name }) });
  const cards = [];
  const dialogs = [];
  const partnerAnswers = [];
  const called = [];
  const watch = (who) => ({
    chat: async (req) => {
      const res = await llm.chat(req);
      for (const t of res.toolCalls) called.push(`${who}:${t.function.name}`);
      return res;
    },
  });
  const trace = new TraceBus();
  const ctx = {
    network: market, manifest: marketManifest, actions: marketRegistry, baseOrigin: MARKET,
    displayOrigin: new URL(MARKET).host, trace, isTop: true, frontMan: market.findFrontMan(), history: [],
    llm: watch("market"),
    // The same per-message budget the runtime's engine gives a visitor's message.
    composition: {
      remoteCalls: 0, peerCalls: new Map(), maxRemoteCalls: 4, maxCallsPerPeer: 1,
      agentCalls: 0, maxAgentCalls: 24, deadline: Date.now() + 90_000,
    },
    confirmWebsiteActions: async (plan) => {
      dialogs.push(JSON.parse(JSON.stringify(plan)));
      return false;
    },
    requestConsent: async (card) => {
      cards.push({ peerLabel: card.peerLabel, peerOrigin: card.peerOrigin, requestText: card.requestText });
      return "accept";
    },
    resolveRemote: async (ref, chain) => {
      if (!ref.startsWith(RECALLED)) throw new Error(`unexpected partner ${ref}`);
      const bridge = new ActionRegistry();
      registerBridge({ register: bridge.register.bind(bridge, { base: RECALLED, network: recalled.name }) });
      return {
        invoke: async (request) => {
          const rctx = {
            network: recalled, manifest: recalledManifest, actions: bridge, baseOrigin: RECALLED,
            displayOrigin: new URL(RECALLED).host, trace, isTop: false, frontMan: recalled.findFrontMan(),
            history: [], llm: watch("recalled"), composition: ctx.composition,
          };
          try {
            const result = await runAgent(rctx, rctx.frontMan, request.user_message.text, null, [...chain, `${RECALLED}::recall_check`]);
            partnerAnswers.push(result.text);
            return result;
          } catch (e) {
            partnerAnswers.push(`ERROR ${e?.stack || e}`);
            throw e;
          }
        },
      };
    },
  };
  let text = "";
  let error = null;
  try {
    text = (await runAgent(ctx, ctx.frontMan, c.q, null, [])).text || "";
  } catch (e) {
    error = String(e?.stack || e);
  }
  const fails = [];
  if (c.partner && !cards.length) fails.push("no consent card");
  if (c.partner && !called.some((t) => t.startsWith("recalled:website_check_recall"))) fails.push("Recalled? did not run check_recall");
  for (const card of cards) if (PERSONAL.test(card.requestText)) fails.push(`card carries personal data: ${card.requestText}`);
  for (const r of c.must) if (!r.test(text)) fails.push(`missing ${r}`);
  const asserted = text.split(/(?<=[.!?\n])\s+/).filter((t) => !/\b(not|never|cannot|can't|doesn't|isn't)\b/i.test(t)).join(" ");
  if (SAFE.test(asserted)) fails.push("called it safe");
  const askedPublish = dialogs.some((d) => JSON.stringify(d).includes("publish_listing"));
  if (c.publish === "never" && askedPublish) fails.push("asked to publish a likely-recalled item");
  if (error) fails.push(`error: ${error}`);
  // A readable transcript on stderr, so the run can be shown on screen as it happens.
  const say = (line) => process.stderr.write(line + "\n");
  say(`\n> ${c.q}`);
  for (const card of cards) say(`  [consent card] Contact ${card.peerLabel} (${card.peerOrigin}) on your behalf?\n                 Request: "${card.requestText}"  -> Allow`);
  if (dialogs.length) say("  [publish dialog] shown -> Cancel");
  say(text.split("\n").map((l) => `  ${l}`).join("\n"));
  const row = { q: c.q, ok: !fails.length, fails, called, cards, dialogs, partnerAnswers, text };
  process.stdout.write("\n" + JSON.stringify({ row, usage: llm.usage }) + "\n");
}
