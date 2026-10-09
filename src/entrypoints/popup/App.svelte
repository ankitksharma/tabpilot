<script lang="ts">
  import type { OrganizeAction, OrganizeResult } from "../../lib/chrome/organize";

  // The window the popup was opened from; every action applies to its tab strip.
  let windowId = $state(-1);
  let tabCount = $state(0);
  let groupCount = $state(0);
  let busy = $state(false);
  let canUndo = $state(false);
  let status = $state("");

  const ACTIONS: { action: OrganizeAction; label: string; hint: string }[] = [
    { action: "group", label: "Group tabs by site", hint: "Loose tabs → Chrome tab groups (uses your rules)" },
    { action: "sort-title", label: "Sort A–Z", hint: "Order tabs and groups by title" },
    { action: "sort-domain", label: "Sort by site", hint: "Keep tabs from the same site together" },
    { action: "collapse", label: "Collapse other groups", hint: "Leave only the current tab's group open" },
  ];

  const DONE: Record<OrganizeAction, string> = {
    group: "Grouped",
    "sort-title": "Sorted",
    "sort-domain": "Sorted",
    collapse: "Collapsed",
  };

  const NOTHING_TO_DO: Record<OrganizeAction, string> = {
    group: "Nothing to group",
    "sort-title": "Already sorted",
    "sort-domain": "Already sorted",
    collapse: "Nothing to collapse",
  };

  async function refreshCounts() {
    const [tabs, groups] = await Promise.all([
      chrome.tabs.query({ windowId }),
      chrome.tabGroups.query({ windowId }),
    ]);
    tabCount = tabs.length;
    groupCount = groups.length;
  }

  $effect(() => {
    (async () => {
      windowId = (await chrome.windows.getCurrent()).id ?? -1;
      await refreshCounts();
      const r: { available?: boolean } = await chrome.runtime.sendMessage({
        type: "HAS_ORGANIZE_UNDO",
        windowId,
      });
      canUndo = !!r?.available;
    })();
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
      if (result.changed > 0) {
        canUndo = true;
        status = DONE[action];
      } else {
        status = NOTHING_TO_DO[action];
      }
      await refreshCounts();
    } catch (e) {
      status = e instanceof Error ? e.message : "Failed";
    } finally {
      busy = false;
    }
  }

  async function undo() {
    busy = true;
    try {
      await chrome.runtime.sendMessage({ type: "UNDO_ORGANIZE", windowId });
      canUndo = false;
      status = "Undone";
      await refreshCounts();
    } finally {
      busy = false;
    }
  }

  async function openDashboard() {
    await chrome.tabs.create({ url: chrome.runtime.getURL("/newtab.html") });
    window.close();
  }
</script>

<div class="flex flex-col">
  <header
    class="flex items-baseline justify-between border-b px-3 py-2.5"
    style="border-color: var(--border);"
  >
    <span class="text-sm font-semibold">TabPilot</span>
    <span class="text-[11px]" style="color: var(--text-muted);" data-testid="counts">
      {tabCount} tabs · {groupCount} groups
    </span>
  </header>

  <section class="flex flex-col gap-1 p-2">
    <div class="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide" style="color: var(--text-muted);">
      Organize this window
    </div>
    {#each ACTIONS as item (item.action)}
      <button
        class="popup-action"
        disabled={busy || windowId < 0}
        onclick={() => run(item.action)}
      >
        <span class="text-xs font-medium">{item.label}</span>
        <span class="text-[10px]" style="color: var(--text-muted);">{item.hint}</span>
      </button>
    {/each}
    <div class="flex min-h-6 items-center justify-between px-1 pt-1">
      <span class="text-[11px]" style="color: var(--text-muted);" data-testid="status">{status}</span>
      {#if canUndo}
        <button class="popup-link" disabled={busy} onclick={undo}>Undo</button>
      {/if}
    </div>
  </section>

  <footer class="border-t p-2" style="border-color: var(--border);">
    <button class="popup-action" onclick={openDashboard}>
      <span class="text-xs font-medium">Open dashboard</span>
      <span class="text-[10px]" style="color: var(--text-muted);">All windows, search, projects, duplicates</span>
    </button>
  </footer>
</div>

<style>
  .popup-action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    width: 100%;
    padding: 6px 10px;
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
  }
  .popup-action:hover:not(:disabled) {
    background-color: var(--bg-hover);
  }
  .popup-action:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .popup-link {
    font-size: 11px;
    color: var(--accent-hover);
    cursor: pointer;
  }
</style>
