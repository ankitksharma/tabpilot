import type { AIConfig } from "../../types/ai";

export interface AIProviderInterface {
  clusterTabs(
    tabs: { id: number; title: string; domain: string }[],
  ): Promise<{ name: string; tabIds: number[]; confidence: number }[]>;
}

export function createProvider(config: AIConfig): AIProviderInterface | null {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config);
    case "claude":
      return new ClaudeProvider(config);
    case "chrome-ai":
      return new ChromeAIProvider();
    default:
      return null;
  }
}

const SYSTEM_PROMPT = `You are a tab organizer. Given a list of browser tabs (id, title, domain), group them into logical workspaces. Return JSON array of groups: [{"name": "Group Name", "tabIds": [1,2,3], "confidence": 0.9}]. Be concise with group names. Confidence 0-1.`;

function buildUserPrompt(
  tabs: { id: number; title: string; domain: string }[],
): string {
  const tabList = tabs
    .map((t) => `${t.id}: "${t.title}" (${t.domain})`)
    .join("\n");
  return `Group these ${tabs.length} tabs:\n${tabList}`;
}

function parseResponse(
  text: string,
): { name: string; tabIds: number[]; confidence: number }[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

class OpenAIProvider implements AIProviderInterface {
  constructor(private config: AIConfig) {}

  async clusterTabs(
    tabs: { id: number; title: string; domain: string }[],
  ) {
    if (!this.config.apiKey) throw new Error("OpenAI API key is not set");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(tabs) },
        ],
        temperature: 0,
        max_tokens: 2000,
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(`OpenAI: ${data.error.message ?? JSON.stringify(data.error)}`);
    }
    const content = data.choices?.[0]?.message?.content ?? "";
    const groups = parseResponse(content);
    if (groups.length === 0 && content) {
      throw new Error(`Failed to parse OpenAI response: ${content.slice(0, 200)}`);
    }
    return groups;
  }
}

class ClaudeProvider implements AIProviderInterface {
  constructor(private config: AIConfig) {}

  async clusterTabs(
    tabs: { id: number; title: string; domain: string }[],
  ) {
    if (!this.config.apiKey) throw new Error("Claude API key is not set");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: this.config.model || "claude-haiku-4-5",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildUserPrompt(tabs) },
        ],
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(`Claude: ${data.error.message ?? JSON.stringify(data.error)}`);
    }
    const text = data.content?.[0]?.text ?? "";
    const groups = parseResponse(text);
    if (groups.length === 0 && text) {
      throw new Error(`Failed to parse Claude response: ${text.slice(0, 200)}`);
    }
    return groups;
  }
}

// JSON schema passed to the Prompt API so the on-device model returns parseable output.
const GROUPS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      tabIds: { type: "array", items: { type: "integer" } },
      confidence: { type: "number" },
    },
    required: ["name", "tabIds", "confidence"],
  },
};

// Chrome built-in AI (Prompt API, global `LanguageModel`, Chrome 138+). Must run in
// an extension page, not the service worker.
class ChromeAIProvider implements AIProviderInterface {
  async clusterTabs(
    tabs: { id: number; title: string; domain: string }[],
  ) {
    const LanguageModel = (globalThis as any).LanguageModel;
    if (!LanguageModel) {
      throw new Error("Chrome Built-in AI is not available in this browser (requires Chrome 138+ on a supported device).");
    }
    const availability: string = await LanguageModel.availability();
    if (availability === "unavailable") {
      throw new Error("Chrome Built-in AI is unavailable on this device. Check chrome://on-device-internals.");
    }
    // "downloadable"/"downloading": create() starts or waits for the model download.
    const session = await LanguageModel.create({
      initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
    });
    try {
      const result: string = await session.prompt(buildUserPrompt(tabs), {
        responseConstraint: GROUPS_SCHEMA,
      });
      const groups = parseResponse(result);
      if (groups.length === 0 && result) {
        throw new Error(`Failed to parse Chrome AI response: ${result.slice(0, 200)}`);
      }
      return groups;
    } finally {
      session.destroy();
    }
  }
}
