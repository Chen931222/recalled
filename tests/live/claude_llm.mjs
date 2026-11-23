// Stands in for the browser runtime's LLM client in Node, so the real network, the real
// instructions and the real site actions run against a real model. It translates the
// runtime's OpenAI-style request (system, user, assistant tool_calls, tool) into one Claude
// Messages API call, and the reply back into {content, toolCalls}.
// The key comes from ANTHROPIC_API_KEY in the environment; nothing is typed into a page.
import { createRequire } from "node:module";

// The SDK is not a dependency of this repository. Point SDK_DIR at any folder whose
// node_modules has @anthropic-ai/sdk.
const require = createRequire(`${process.env.SDK_DIR || process.cwd()}/`);
const Anthropic = require("@anthropic-ai/sdk").default ?? require("@anthropic-ai/sdk");

export class ClaudeLLM {
  /**
   * :param model: A Claude model id.
   */
  constructor(model) {
    this.client = new Anthropic();
    this.model = model;
    // The runtime keeps only text and tool calls. Keep each reply's full content, keyed by
    // its first tool call id, so the next request replays it unchanged (thinking blocks too).
    this.raw = new Map();
    this.usage = { input: 0, output: 0, calls: 0 };
  }

  /**
   * :param request: The runtime's request, with messages and tools.
   * :return: {content, toolCalls} as the runtime expects.
   */
  async chat(request) {
    const system = [];
    const messages = [];
    for (const m of request.messages) {
      if (m.role === "system") {
        system.push(m.content);
      } else if (m.role === "user") {
        messages.push({ role: "user", content: m.content });
      } else if (m.role === "assistant") {
        const calls = m.tool_calls || [];
        if (calls.length && this.raw.has(calls[0].id)) {
          messages.push({ role: "assistant", content: this.raw.get(calls[0].id) });
          continue;
        }
        const content = [];
        if (m.content) content.push({ type: "text", text: m.content });
        for (const c of calls) {
          content.push({ type: "tool_use", id: c.id, name: c.function.name, input: JSON.parse(c.function.arguments || "{}") });
        }
        messages.push({ role: "assistant", content });
      } else if (m.role === "tool") {
        const block = { type: "tool_result", tool_use_id: m.tool_call_id, content: String(m.content) };
        const last = messages.at(-1);
        if (last && last.role === "user" && Array.isArray(last.content) && last.content.every((b) => b.type === "tool_result")) {
          last.content.push(block);
        } else {
          messages.push({ role: "user", content: [block] });
        }
      }
    }
    const tools = (request.tools || []).map((t) => ({
      name: t.function.name,
      description: t.function.description || "",
      input_schema: t.function.parameters || { type: "object", properties: {} },
    }));
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: system.join("\n\n"),
      messages,
      tools,
    });
    this.usage.input += response.usage.input_tokens;
    this.usage.output += response.usage.output_tokens;
    this.usage.calls += 1;
    if (response.stop_reason === "refusal") {
      throw new Error("The model refused.");
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const uses = response.content.filter((b) => b.type === "tool_use");
    const toolCalls = uses.map((u) => ({ id: u.id, type: "function", function: { name: u.name, arguments: JSON.stringify(u.input) } }));
    if (toolCalls.length) {
      this.raw.set(toolCalls[0].id, response.content);
    }
    return { content: text, toolCalls };
  }
}
