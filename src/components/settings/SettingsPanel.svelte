<script lang="ts">
  import { getSettingsState } from "../../lib/state/settings.svelte";
  import type { AIConfig } from "../../types/ai";
  import { DEFAULT_AI_CONFIG } from "../../types/ai";
  import RoutingRulesEditor from "../ai/RoutingRulesEditor.svelte";

  const settingsState = getSettingsState();

  let aiConfig = $state<AIConfig>({ ...DEFAULT_AI_CONFIG });

  $effect(() => {
    settingsState.load();
    chrome.storage.local.get("tabpilot_ai_config").then((result) => {
      if (result.tabpilot_ai_config) {
        aiConfig = { ...DEFAULT_AI_CONFIG, ...result.tabpilot_ai_config };
      }
    });
  });

  async function saveAIConfig() {
    await chrome.storage.local.set({ tabpilot_ai_config: aiConfig });
  }

  function onProviderChange(e: Event) {
    aiConfig.provider = (e.target as HTMLSelectElement).value as AIConfig["provider"];
    // Set sensible default model for the selected provider
    if (aiConfig.provider === "openai") aiConfig.model = "gpt-4o-mini";
    else if (aiConfig.provider === "claude") aiConfig.model = "claude-haiku-4-5-20251001";
    else aiConfig.model = "";
    saveAIConfig();
  }

  function onApiKeyChange(e: Event) {
    aiConfig.apiKey = (e.target as HTMLInputElement).value;
    saveAIConfig();
  }

  function onModelChange(e: Event) {
    aiConfig.model = (e.target as HTMLSelectElement).value;
    saveAIConfig();
  }

  const OPENAI_MODELS = [
    { value: "gpt-4o-mini", label: "GPT-4o Mini (fast, cheap)" },
    { value: "gpt-4o", label: "GPT-4o (balanced)" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "o4-mini", label: "o4 Mini (reasoning)" },
  ];

  const CLAUDE_MODELS = [
    { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (fastest, $1/$5)" },
    { value: "claude-sonnet-4-6", label: "Sonnet 4.6 (fast, $3/$15)" },
    { value: "claude-opus-4-6", label: "Opus 4.6 (most capable, $5/$25)" },
    { value: "claude-sonnet-4-5-20250929", label: "Sonnet 4.5 (legacy)" },
  ];

  const models = $derived(
    aiConfig.provider === "openai" ? OPENAI_MODELS :
    aiConfig.provider === "claude" ? CLAUDE_MODELS : []
  );
</script>

<div class="flex flex-col gap-6">
  <h2 class="text-sm font-semibold" style="color: var(--text-primary);">
    Settings
  </h2>

  <!-- Theme -->
  <div class="flex flex-col gap-2">
    <h3 class="text-xs font-semibold uppercase" style="color: var(--text-muted);">
      Appearance
    </h3>
    <label class="flex items-center justify-between">
      <span class="text-sm" style="color: var(--text-secondary);">Column Density</span>
      <select
        value={settingsState.settings.columnDensity}
        onchange={(e) => settingsState.update({ columnDensity: (e.target as HTMLSelectElement).value as "compact" | "comfortable" })}
        class="rounded-md border px-2 py-1 text-xs outline-none"
        style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-secondary);"
      >
        <option value="comfortable">Comfortable</option>
        <option value="compact">Compact</option>
      </select>
    </label>
  </div>

  <!-- Suspension -->
  <div class="flex flex-col gap-2">
    <h3 class="text-xs font-semibold uppercase" style="color: var(--text-muted);">
      Auto-Suspend
    </h3>
    <label class="flex items-center justify-between">
      <span class="text-sm" style="color: var(--text-secondary);">Enable Auto-Suspend</span>
      <input
        type="checkbox"
        checked={settingsState.settings.autoSuspendEnabled}
        onchange={(e) => settingsState.update({ autoSuspendEnabled: (e.target as HTMLInputElement).checked })}
        class="accent-[var(--accent)]"
      />
    </label>
    {#if settingsState.settings.autoSuspendEnabled}
      <label class="flex items-center justify-between">
        <span class="text-sm" style="color: var(--text-secondary);">Inactive Threshold (min)</span>
        <input
          type="number"
          value={settingsState.settings.autoSuspendMinutes}
          min="5"
          max="720"
          onchange={(e) => settingsState.update({ autoSuspendMinutes: parseInt((e.target as HTMLInputElement).value) || 30 })}
          class="w-20 rounded-md border px-2 py-1 text-xs outline-none"
          style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-primary);"
        />
      </label>
    {/if}
  </div>

  <!-- AI Provider -->
  <div class="flex flex-col gap-2">
    <h3 class="text-xs font-semibold uppercase" style="color: var(--text-muted);">
      AI Provider
    </h3>
    <label class="flex items-center justify-between">
      <span class="text-sm" style="color: var(--text-secondary);">Provider</span>
      <select
        value={aiConfig.provider}
        onchange={onProviderChange}
        class="rounded-md border px-2 py-1 text-xs outline-none"
        style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-secondary);"
      >
        <option value="none">None</option>
        <option value="openai">OpenAI</option>
        <option value="claude">Claude</option>
        <option value="chrome-ai">Chrome Built-in AI</option>
      </select>
    </label>
    {#if aiConfig.provider !== "none" && aiConfig.provider !== "chrome-ai"}
      <label class="flex flex-col gap-1">
        <span class="text-sm" style="color: var(--text-secondary);">API Key</span>
        <input
          type="password"
          value={aiConfig.apiKey}
          oninput={onApiKeyChange}
          placeholder="sk-..."
          class="rounded-md border px-2 py-1.5 text-xs outline-none"
          style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-primary);"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm" style="color: var(--text-secondary);">Model</span>
        <select
          value={aiConfig.model}
          onchange={onModelChange}
          class="rounded-md border px-2 py-1.5 text-xs outline-none"
          style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-primary);"
        >
          {#each models as m}
            <option value={m.value}>{m.label}</option>
          {/each}
        </select>
      </label>
    {/if}
  </div>

  <!-- Routing Rules -->
  <RoutingRulesEditor />
</div>
