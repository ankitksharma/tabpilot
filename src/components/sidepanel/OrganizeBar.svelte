<script lang="ts">
  import type { OrganizeAction, OrganizeResult } from "../../lib/chrome/organize";

  let { windowId }: { windowId: number } = $props();

  let busy = $state(false);
  let canUndo = $state(false);
  let status = $state("");

  const NOTHING_TO_DO: Record<OrganizeAction, string> = {
    group: "Nothing to group",
    "sort-title": "Already sorted",
    "sort-domain": "Already sorted",
    collapse: "Nothing to collapse",
  };

  $effect(() => {
    if (windowId < 0) return;
    chrome.runtime
      .sendMessage({ type: "HAS_ORGANIZE_UNDO", windowId })
      .then((r: { available?: boolean }) => { canUndo = !!r?.available; })
      .catch(() => {});
  });

  async function run(action: OrganizeAction) {
    busy = true;
    status = "";
    try {
      const result: OrganizeResult & { __error?: string } = await chrome.runtime.sendMessage({
        type: "ORGANIZE_WINDOW",
        windowId,
        action,
      });
      if (result?.__error) throw new Error(result.__error);
      if (result.changed > 0) canUndo = true;
      else status = NOTHING_TO_DO[action];
    } catch (e) {
      status = e instanceof Error ? e.message : "Failed";
    } finally {
      busy = false;
    }
  }

  async function undo() {
    busy = true;
    status = "";
    try {
      await chrome.runtime.sendMessage({ type: "UNDO_ORGANIZE", windowId });
      canUndo = false;
    } finally {
      busy = false;
    }
  }

  function onSort(e: Event) {
    const select = e.currentTarget as HTMLSelectElement;
    const action = select.value as OrganizeAction;
    select.value = "";
    if (action) run(action);
  }
</script>

<div
  class="flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
  style="border-color: var(--border); background-color: var(--bg-secondary);"
>
  <button
    class="organize-btn"
    disabled={busy || windowId < 0}
    onclick={() => run("group")}
    title="Put ungrouped tabs into Chrome tab groups by site or routing rule"
  >Group</button>
  <select
    class="organize-btn"
    disabled={busy || windowId < 0}
    onchange={onSort}
    title="Sort the tab strip"
    aria-label="Sort tabs"
  >
    <option value="">Sort</option>
    <option value="sort-title">A–Z</option>
    <option value="sort-domain">By site</option>
  </select>
  <button
    class="organize-btn"
    disabled={busy || windowId < 0}
    onclick={() => run("collapse")}
    title="Collapse every tab group except the one with the active tab"
  >Collapse</button>
  {#if canUndo}
    <button class="organize-btn" disabled={busy} onclick={undo} title="Undo the last organize action">
      Undo
    </button>
  {/if}
  {#if status}
    <span class="ml-auto text-[10px]" style="color: var(--text-muted);">{status}</span>
  {/if}
</div>

<style>
  .organize-btn {
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    color: var(--text-secondary);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border);
    cursor: pointer;
  }
  .organize-btn:hover:not(:disabled) {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }
  .organize-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
