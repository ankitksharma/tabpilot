<script lang="ts">
  import type { RoutingRule } from "../../types/ai";
  import { loadRules, saveRules } from "../../lib/ai/routing-rules";

  let rules = $state<RoutingRule[]>([]);
  let newPattern = $state("");
  let newPatternType = $state<"domain" | "keyword" | "regex">("domain");
  let newGroupName = $state("");

  $effect(() => {
    loadRules().then((r) => { rules = r; });
  });

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  async function addRule() {
    if (!newPattern.trim() || !newGroupName.trim()) return;
    const rule: RoutingRule = {
      id: generateId(),
      name: `${newPatternType}: ${newPattern}`,
      pattern: newPattern.trim(),
      patternType: newPatternType,
      groupName: newGroupName.trim(),
      enabled: true,
    };
    rules = [...rules, rule];
    await saveRules(rules);
    newPattern = "";
    newGroupName = "";
  }

  async function removeRule(id: string) {
    rules = rules.filter((r) => r.id !== id);
    await saveRules(rules);
  }

  async function toggleRule(id: string) {
    rules = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r,
    );
    await saveRules(rules);
  }
</script>

<div class="flex flex-col gap-3">
  <h3 class="text-xs font-semibold uppercase" style="color: var(--text-muted);">
    Routing Rules
  </h3>

  <div class="flex flex-col gap-2">
    <div class="flex gap-2">
      <select
        bind:value={newPatternType}
        class="rounded-md border px-2 py-1 text-xs outline-none"
        style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-secondary);"
      >
        <option value="domain">Domain</option>
        <option value="keyword">Keyword</option>
        <option value="regex">Regex</option>
      </select>
      <input
        bind:value={newPattern}
        placeholder="Pattern..."
        class="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs outline-none"
        style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-primary);"
      />
      <input
        bind:value={newGroupName}
        placeholder="Group name..."
        class="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs outline-none"
        style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-primary);"
      />
      <button
        onclick={addRule}
        disabled={!newPattern.trim() || !newGroupName.trim()}
        class="rounded-md px-2 py-1 text-xs font-medium disabled:opacity-40"
        style="background-color: var(--accent); color: white;"
      >
        Add
      </button>
    </div>

    {#if rules.length === 0}
      <p class="py-2 text-center text-xs" style="color: var(--text-muted);">
        No routing rules. Add rules to auto-group tabs by domain, keyword, or regex.
      </p>
    {:else}
      {#each rules as rule (rule.id)}
        <div
          class="flex items-center justify-between rounded-md px-2 py-1.5"
          style="background-color: var(--bg-tertiary); opacity: {rule.enabled ? 1 : 0.5};"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span
              class="rounded px-1 py-0.5 text-xs"
              style="background-color: var(--bg-secondary); color: var(--text-muted);"
            >
              {rule.patternType}
            </span>
            <span class="truncate text-xs" style="color: var(--text-primary);">
              {rule.pattern}
            </span>
            <span class="text-xs" style="color: var(--text-muted);">→</span>
            <span class="truncate text-xs font-medium" style="color: var(--accent);">
              {rule.groupName}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              onclick={() => toggleRule(rule.id)}
              class="rounded px-1.5 py-0.5 text-xs"
              style="color: var(--text-muted);"
            >
              {rule.enabled ? "Disable" : "Enable"}
            </button>
            <button
              onclick={() => removeRule(rule.id)}
              class="rounded px-1.5 py-0.5 text-xs"
              style="color: var(--danger);"
            >
              Remove
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
