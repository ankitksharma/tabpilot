<script lang="ts">
  import type { TabInfo, TabGroupInfo, WindowInfo } from "../../types/tab";
  import WindowHeader from "./WindowHeader.svelte";
  import TabCard from "./TabCard.svelte";
  import { sortableAction } from "../../lib/services/sortable";
  import { getSearchState } from "../../lib/state/search.svelte";
  import { getTabState } from "../../lib/state/tabs.svelte";
  import { sendToBackground } from "../../lib/messaging/protocol";

  let { window, index }: { window: WindowInfo; index: number } = $props();

  const search = getSearchState();
  const tabState = getTabState();

  // Chrome tab group color → CSS color mapping
  const GROUP_COLORS: Record<string, string> = {
    grey: "#5f6368",
    blue: "#1a73e8",
    red: "#d93025",
    yellow: "#f9ab00",
    green: "#1e8e3e",
    pink: "#d01884",
    purple: "#a142f4",
    cyan: "#007b83",
    orange: "#e8710a",
  };

  function getDomain(url: string): string {
    try { return new URL(url).hostname; } catch { return url; }
  }

  // --- Collapse state ---
  // Keyed by Chrome groupId or domain string
  let collapsedSet = $state(new Set<string>());

  function toggleCollapsed(key: string) {
    const next = new Set(collapsedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    collapsedSet = next;
  }

  function isCollapsed(key: string): boolean {
    return collapsedSet.has(key);
  }

  // --- Close all tabs in a group ---
  function closeGroupTabs(tabs: TabInfo[]) {
    sendToBackground({ type: "CLOSE_TABS", tabIds: tabs.map((t) => t.id) });
  }

  // Build a groupId → TabGroupInfo lookup for this window
  const groupMap = $derived.by((): Map<number, TabGroupInfo> => {
    const m = new Map<number, TabGroupInfo>();
    for (const g of tabState.tabGroups) {
      if (g.windowId === window.id) m.set(g.id, g);
    }
    return m;
  });

  // Segments: consecutive runs of tabs sharing the same groupId (or ungrouped)
  interface Segment {
    kind: "group" | "ungrouped";
    groupId: number; // -1 for ungrouped
    groupInfo: TabGroupInfo | null;
    tabs: TabInfo[];
  }

  const segments = $derived.by((): Segment[] => {
    if (search.sortMode === "domain") return [];
    const segs: Segment[] = [];
    let current: Segment | null = null;
    const NONE = -1; // chrome.tabGroups.TAB_GROUP_ID_NONE
    for (const tab of window.tabs) {
      const gid = tab.groupId > 0 ? tab.groupId : NONE;
      if (!current || current.groupId !== gid) {
        const info = gid !== NONE ? (groupMap.get(gid) ?? null) : null;
        current = {
          kind: gid !== NONE && info ? "group" : "ungrouped",
          groupId: gid,
          groupInfo: info,
          tabs: [],
        };
        segs.push(current);
      }
      current.tabs.push(tab);
    }
    return segs;
  });

  // Domain groups for "domain" sort mode
  interface DomainGroup {
    domain: string;
    favicon: string;
    tabs: TabInfo[];
  }

  const domainGroups = $derived.by((): DomainGroup[] => {
    if (search.sortMode !== "domain") return [];
    const groups: DomainGroup[] = [];
    let current: DomainGroup | null = null;
    for (const tab of window.tabs) {
      const d = getDomain(tab.url);
      if (!current || current.domain !== d) {
        current = { domain: d, favicon: tab.favIconUrl, tabs: [] };
        groups.push(current);
      }
      current.tabs.push(tab);
    }
    return groups;
  });

  const hasAnyGroup = $derived(segments.some((s) => s.kind === "group"));
</script>

<div
  class="flex flex-col rounded-lg border"
  style="background-color: var(--bg-secondary); border-color: var(--border);"
>
  <WindowHeader {window} {index} />
  <div
    class="flex flex-1 flex-col gap-0.5 p-2"
    data-window-id={window.id}
    use:sortableAction={{ windowId: window.id }}
  >
    {#if search.sortMode === "domain" && domainGroups.length > 0}
      <!-- Domain grouping -->
      {#each domainGroups as group (group.domain)}
        <div
          class="mt-2 flex flex-col rounded-md first:mt-0"
          style="border-left: 3px solid var(--text-muted); margin-left: 2px;"
        >
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            class="group/hdr flex cursor-pointer items-center gap-2 px-2 py-1 transition-colors hover:bg-[var(--bg-hover)]"
            style="color: var(--text-muted);"
            onclick={() => toggleCollapsed(`domain:${group.domain}`)}
            role="button"
            tabindex="0"
          >
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5"
              class="shrink-0 transition-transform"
              style="transform: rotate({isCollapsed(`domain:${group.domain}`) ? '0deg' : '90deg'});"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <div class="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              {#if group.favicon}
                <img
                  src={group.favicon}
                  alt=""
                  class="h-3.5 w-3.5 rounded-sm"
                  onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              {:else}
                <div class="h-2.5 w-2.5 rounded-full" style="background-color: var(--text-muted);"></div>
              {/if}
            </div>
            <span class="min-w-0 flex-1 truncate text-xs font-medium">{group.domain}</span>
            <span
              class="shrink-0 rounded px-1 py-0.5 text-[10px]"
              style="background-color: var(--bg-tertiary); color: var(--text-muted);"
            >
              {group.tabs.length}
            </span>
            <button
              onclick={(e) => { e.stopPropagation(); closeGroupTabs(group.tabs); }}
              class="shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover/hdr:opacity-100"
              style="color: var(--text-muted);"
              title="Close all {group.domain} tabs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          {#if !isCollapsed(`domain:${group.domain}`)}
            <div class="flex flex-col gap-0.5 pb-0.5">
              {#each group.tabs as tab (tab.id)}
                <TabCard {tab} />
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {:else if hasAnyGroup}
      <!-- Chrome tab group segments -->
      {#each segments as seg, i (seg.groupId === -1 ? `ungrouped-${i}` : `group-${seg.groupId}`)}
        {#if seg.kind === "group" && seg.groupInfo}
          {@const groupKey = `chrome:${seg.groupId}`}
          {@const color = GROUP_COLORS[seg.groupInfo.color] ?? 'var(--text-muted)'}
          <div
            class="mt-2 flex flex-col rounded-md first:mt-0"
            style="border-left: 3px solid {color}; margin-left: 2px;"
          >
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div
              class="group/hdr flex cursor-pointer items-center gap-2 px-2 py-1 transition-colors hover:bg-[var(--bg-hover)]"
              style="color: var(--text-secondary);"
              onclick={() => toggleCollapsed(groupKey)}
              role="button"
              tabindex="0"
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5"
                class="shrink-0 transition-transform"
                style="transform: rotate({isCollapsed(groupKey) ? '0deg' : '90deg'});"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <div
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                style="background-color: {color};"
              ></div>
              <span class="min-w-0 flex-1 truncate text-xs font-medium">
                {seg.groupInfo.title || "Unnamed group"}
              </span>
              <span
                class="shrink-0 rounded px-1 py-0.5 text-[10px]"
                style="background-color: var(--bg-tertiary); color: var(--text-muted);"
              >
                {seg.tabs.length}
              </span>
              <button
                onclick={(e) => { e.stopPropagation(); closeGroupTabs(seg.tabs); }}
                class="shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover/hdr:opacity-100"
                style="color: var(--text-muted);"
                title="Close all tabs in group"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {#if !isCollapsed(groupKey)}
              <div class="flex flex-col gap-0.5 pb-0.5">
                {#each seg.tabs as tab (tab.id)}
                  <TabCard {tab} />
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          {#each seg.tabs as tab (tab.id)}
            <TabCard {tab} />
          {/each}
        {/if}
      {/each}
    {:else}
      <!-- Flat list (no groups) -->
      {#each window.tabs as tab (tab.id)}
        <TabCard {tab} />
      {/each}
    {/if}

    {#if window.tabs.length === 0}
      <div
        class="py-8 text-center text-sm"
        style="color: var(--text-muted);"
      >
        No tabs
      </div>
    {/if}
  </div>
</div>
