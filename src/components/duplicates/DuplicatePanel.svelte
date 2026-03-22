<script lang="ts">
  import { getDuplicatesState } from "../../lib/state/duplicates.svelte";
  import { getTabState } from "../../lib/state/tabs.svelte";
  import { sendToBackground } from "../../lib/messaging/protocol";
  import { getUndoState } from "../../lib/state/undo.svelte";
  import { getSearchState } from "../../lib/state/search.svelte";
  import type { DetectionMode } from "../../types/duplicate";

  const dupes = getDuplicatesState();
  const tabState = getTabState();
  const undo = getUndoState();
  const search = getSearchState();

  function filterCluster(cluster: { id: string; tabIds: number[] }) {
    const title = getTabTitle(cluster.tabIds[0]);
    search.setTabIdFilter(cluster.tabIds, `Dupes: ${title}`);
  }

  const modes: { value: DetectionMode; label: string }[] = [
    { value: "exact", label: "Exact URL" },
    { value: "canonical", label: "Canonical URL" },
    { value: "title", label: "Title Similarity" },
  ];

  function scan() {
    dupes.scan(tabState.allTabs);
  }

  function changeMode(e: Event) {
    dupes.mode = (e.target as HTMLSelectElement).value as DetectionMode;
  }

  async function closeDuplicates(clusterId: string) {
    const cluster = dupes.clusters.find((c) => c.id === clusterId);
    if (!cluster) return;
    // Keep the first tab, close the rest
    const toClose = cluster.tabIds.slice(1);
    const tabs = toClose.map((id) => tabState.allTabs.find((t) => t.id === id)).filter(Boolean);
    undo.push({
      type: "REOPEN_TABS",
      tabs: tabs.map((t) => ({
        url: t!.url,
        windowId: t!.windowId,
        index: t!.index,
        pinned: t!.pinned,
      })),
    });
    await sendToBackground({ type: "CLOSE_TABS", tabIds: toClose });
  }

  async function closeAllDuplicates() {
    const allToClose: number[] = [];
    const allTabs: { url: string; windowId: number; index: number; pinned: boolean }[] = [];
    for (const cluster of dupes.clusters) {
      for (const id of cluster.tabIds.slice(1)) {
        allToClose.push(id);
        const tab = tabState.allTabs.find((t) => t.id === id);
        if (tab) {
          allTabs.push({ url: tab.url, windowId: tab.windowId, index: tab.index, pinned: tab.pinned });
        }
      }
    }
    if (allToClose.length > 0) {
      undo.push({ type: "REOPEN_TABS", tabs: allTabs });
      await sendToBackground({ type: "CLOSE_TABS", tabIds: allToClose });
    }
  }

  function getTabTitle(tabId: number): string {
    return tabState.allTabs.find((t) => t.id === tabId)?.title ?? "Unknown";
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold" style="color: var(--text-primary);">
      Duplicates
    </h2>
    <div class="flex items-center gap-2">
      <select
        value={dupes.mode}
        onchange={changeMode}
        class="rounded-md border px-2 py-1 text-xs outline-none"
        style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-secondary);"
      >
        {#each modes as m}
          <option value={m.value}>{m.label}</option>
        {/each}
      </select>
      <button
        onclick={scan}
        class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
        style="background-color: var(--accent); color: white;"
      >
        Scan
      </button>
    </div>
  </div>

  {#if dupes.clusterCount === 0}
    <p class="py-4 text-center text-sm" style="color: var(--text-muted);">
      {dupes.scanning ? "Scanning..." : "No duplicates found. Click Scan to check."}
    </p>
  {:else}
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs" style="color: var(--text-muted);">
        {dupes.clusterCount} group{dupes.clusterCount > 1 ? "s" : ""}, {dupes.duplicateCount} duplicate{dupes.duplicateCount > 1 ? "s" : ""}
      </span>
      <button
        onclick={closeAllDuplicates}
        class="rounded-md px-2.5 py-1 text-xs transition-colors"
        style="background-color: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger);"
      >
        Close All Dupes
      </button>
    </div>

    <div class="flex flex-col gap-2">
      {#each dupes.clusters as cluster (cluster.id)}
        <div
          class="rounded-md border p-2"
          style="border-color: var(--border);"
        >
          <div class="mb-1 flex items-center justify-between">
            <span class="truncate text-xs font-medium" style="color: var(--text-secondary);">
              {cluster.tabIds.length} tabs
            </span>
            <div class="flex items-center gap-2">
              <button
                onclick={() => filterCluster(cluster)}
                class="text-xs transition-colors"
                style="color: var(--accent);"
                title="Show these tabs in dashboard"
              >
                Filter
              </button>
              <button
                onclick={() => closeDuplicates(cluster.id)}
                class="text-xs transition-colors"
                style="color: var(--danger);"
              >
                Close dupes
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-0.5">
            {#each cluster.tabIds as tabId, i}
              <span
                class="truncate text-xs"
                style="color: {i === 0 ? 'var(--text-primary)' : 'var(--text-muted)'};"
              >
                {i === 0 ? "Keep: " : "Dupe: "}{getTabTitle(tabId)}
              </span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
