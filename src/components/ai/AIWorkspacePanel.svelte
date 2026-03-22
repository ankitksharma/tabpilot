<script lang="ts">
  import { getTabState } from "../../lib/state/tabs.svelte";
  import type { AIConfig, WorkspaceSuggestion } from "../../types/ai";
  import { DEFAULT_AI_CONFIG } from "../../types/ai";
  import { getDomain } from "../../lib/services/url-normalize";
  import { sendToBackground } from "../../lib/messaging/protocol";
  import { getSearchState } from "../../lib/state/search.svelte";

  const tabState = getTabState();
  const search = getSearchState();

  function filterSuggestion(suggestion: WorkspaceSuggestion) {
    search.setTabIdFilter(suggestion.tabIds, `AI: ${suggestion.name}`);
  }

  let config = $state<AIConfig>({ ...DEFAULT_AI_CONFIG });
  let suggestions = $state<WorkspaceSuggestion[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const SUGGESTIONS_KEY = "tabpilot_ai_suggestions";

  $effect(() => {
    chrome.storage.local.get(["tabpilot_ai_config", SUGGESTIONS_KEY]).then((result) => {
      if (result.tabpilot_ai_config) {
        config = { ...DEFAULT_AI_CONFIG, ...result.tabpilot_ai_config };
      }
      if (result[SUGGESTIONS_KEY]?.length) {
        suggestions = result[SUGGESTIONS_KEY];
      }
    });
  });

  function saveSuggestions(data: WorkspaceSuggestion[]) {
    suggestions = data;
    chrome.storage.local.set({ [SUGGESTIONS_KEY]: data });
  }

  async function generateSuggestions() {
    if (config.provider === "none") {
      error = "No AI provider configured. Set up in Settings.";
      return;
    }

    loading = true;
    error = null;
    try {
      const tabs = tabState.allTabs
        .filter((t) => t.url && !t.url.startsWith("chrome://"))
        .map((t) => ({
          id: t.id,
          title: t.title,
          domain: getDomain(t.url),
        }));

      // Route through background script — extension pages can't fetch external APIs (CSP)
      const result = await sendToBackground<
        { name: string; tabIds: number[]; confidence: number }[] | { __error: string }
      >({
        type: "AI_CLUSTER_TABS",
        tabs,
        config: { provider: config.provider, apiKey: config.apiKey, model: config.model },
      });

      if (!result) {
        error = "No response from background. Check extension logs.";
        return;
      }

      if ("__error" in result) {
        error = result.__error;
        return;
      }

      if (!Array.isArray(result) || result.length === 0) {
        error = "AI returned no suggestions. Try again.";
        return;
      }

      saveSuggestions(result.map((g) => ({
        name: g.name,
        tabIds: g.tabIds,
        confidence: g.confidence,
      })));
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to generate suggestions";
    } finally {
      loading = false;
    }
  }

  // Cycle through Chrome group colors for visual distinction
  const GROUP_COLORS: string[] = [
    "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange", "grey",
  ];

  async function applySuggestion(suggestion: WorkspaceSuggestion, colorIndex: number) {
    const color = suggestion.color ?? GROUP_COLORS[colorIndex % GROUP_COLORS.length];
    await sendToBackground({
      type: "GROUP_TABS",
      tabIds: suggestion.tabIds,
      title: suggestion.name,
      color,
    });
  }

  async function applyAll() {
    for (let i = 0; i < suggestions.length; i++) {
      await applySuggestion(suggestions[i], i);
    }
    saveSuggestions([]);
  }

  function getTabTitle(tabId: number): string {
    return tabState.allTabs.find((t) => t.id === tabId)?.title ?? "Unknown";
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold" style="color: var(--text-primary);">
      AI Workspaces
    </h2>
    <button
      onclick={generateSuggestions}
      disabled={loading || config.provider === "none"}
      class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40"
      style="background-color: var(--accent); color: white;"
    >
      {loading ? "Analyzing..." : "Suggest Groups"}
    </button>
  </div>

  {#if config.provider === "none"}
    <p class="py-4 text-center text-sm" style="color: var(--text-muted);">
      Configure an AI provider in Settings to use AI Workspaces.
    </p>
  {:else if error}
    <p class="py-2 text-sm" style="color: var(--danger);">
      {error}
    </p>
  {:else if suggestions.length === 0}
    <p class="py-4 text-center text-sm" style="color: var(--text-muted);">
      Click "Suggest Groups" to let AI organize your tabs.
    </p>
  {:else}
    <button
      onclick={applyAll}
      class="w-full rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
      style="background-color: var(--accent); color: white;"
    >
      Apply All ({suggestions.length} groups)
    </button>
    <div class="flex flex-col gap-2">
      {#each suggestions as suggestion, i}
        <div
          class="group/sg rounded-md border p-2"
          style="border-color: var(--border);"
        >
          <div class="mb-1 flex items-center justify-between">
            <span class="text-sm font-medium" style="color: var(--text-primary);">
              {suggestion.name}
            </span>
            <div class="flex items-center gap-1.5">
              <span
                class="rounded px-1.5 py-0.5 text-xs"
                style="background-color: var(--bg-tertiary); color: var(--text-muted);"
              >
                {Math.round(suggestion.confidence * 100)}%
              </span>
              <button
                onclick={() => filterSuggestion(suggestion)}
                class="rounded px-1.5 py-0.5 text-xs font-medium opacity-0 transition-opacity group-hover/sg:opacity-100"
                style="background-color: var(--bg-tertiary); color: var(--accent);"
                title="Show these tabs in dashboard"
              >
                Filter
              </button>
              <button
                onclick={() => applySuggestion(suggestion, i)}
                class="rounded px-1.5 py-0.5 text-xs font-medium opacity-0 transition-opacity group-hover/sg:opacity-100"
                style="background-color: var(--bg-tertiary); color: var(--accent);"
                title="Create this group"
              >
                Apply
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-0.5">
            {#each suggestion.tabIds.slice(0, 5) as tabId}
              <span class="truncate text-xs" style="color: var(--text-muted);">
                {getTabTitle(tabId)}
              </span>
            {/each}
            {#if suggestion.tabIds.length > 5}
              <span class="text-xs" style="color: var(--text-muted);">
                +{suggestion.tabIds.length - 5} more
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
