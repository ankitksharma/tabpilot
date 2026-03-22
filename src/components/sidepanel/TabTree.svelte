<script lang="ts">
  import type { TabInfo, TabGroupInfo } from "../../types/tab";
  import DomainGroup from "./DomainGroup.svelte";
  import SideTabItem from "./SideTabItem.svelte";

  let { tabs, tabGroups = [] }: { tabs: TabInfo[]; tabGroups?: TabGroupInfo[] } = $props();

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

  // Build groupId → TabGroupInfo lookup
  const groupMap = $derived.by((): Map<number, TabGroupInfo> => {
    const m = new Map<number, TabGroupInfo>();
    for (const g of tabGroups) m.set(g.id, g);
    return m;
  });

  const hasAnyGroup = $derived(tabs.some((t) => t.groupId > 0 && groupMap.has(t.groupId)));

  // Chrome tab group segments (consecutive tabs sharing the same groupId)
  interface Segment {
    kind: "group" | "ungrouped";
    groupId: number;
    groupInfo: TabGroupInfo | null;
    tabs: TabInfo[];
  }

  const segments = $derived.by((): Segment[] => {
    if (!hasAnyGroup) return [];
    const segs: Segment[] = [];
    let current: Segment | null = null;
    for (const tab of tabs) {
      const gid = tab.groupId > 0 ? tab.groupId : -1;
      if (!current || current.groupId !== gid) {
        const info = gid !== -1 ? (groupMap.get(gid) ?? null) : null;
        current = {
          kind: gid !== -1 && info ? "group" : "ungrouped",
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

  // Domain grouping fallback
  interface DomainGroupData {
    domain: string;
    tabs: TabInfo[];
    favicon: string;
  }

  const domainGroups = $derived.by((): DomainGroupData[] => {
    if (hasAnyGroup) return [];
    const map = new Map<string, TabInfo[]>();
    const favicons = new Map<string, string>();
    const firstSeen = new Map<string, number>();

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      let domain: string;
      try { domain = new URL(tab.url).hostname; } catch { domain = "other"; }

      const existing = map.get(domain);
      if (existing) { existing.push(tab); }
      else { map.set(domain, [tab]); firstSeen.set(domain, i); }

      if (tab.favIconUrl && !favicons.has(domain)) favicons.set(domain, tab.favIconUrl);
    }

    return [...map.entries()]
      .sort((a, b) => (firstSeen.get(a[0]) ?? 0) - (firstSeen.get(b[0]) ?? 0))
      .map(([domain, domainTabs]) => ({
        domain,
        tabs: domainTabs,
        favicon: favicons.get(domain) ?? "",
      }));
  });

  let collapsedGroups = $state(new Set<string>());

  function toggleGroup(key: string) {
    const next = new Set(collapsedGroups);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    collapsedGroups = next;
  }
</script>

<div class="flex flex-col py-1">
  {#if hasAnyGroup}
    <!-- Chrome tab groups -->
    {#each segments as seg, i (seg.groupId === -1 ? `ungrouped-${i}` : `group-${seg.groupId}`)}
      {#if seg.kind === "group" && seg.groupInfo}
        {@const key = `chrome:${seg.groupId}`}
        {@const color = GROUP_COLORS[seg.groupInfo.color] ?? 'var(--text-muted)'}
        <div
          class="mt-1 flex flex-col first:mt-0"
          style="border-left: 3px solid {color}; margin-left: 4px;"
        >
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors"
            style="color: var(--text-secondary);"
            onclick={() => toggleGroup(key)}
            role="button"
            tabindex="0"
          >
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5"
              class="shrink-0 transition-transform"
              style="transform: rotate({collapsedGroups.has(key) ? '0deg' : '90deg'});"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <div class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: {color};"></div>
            <span class="min-w-0 flex-1 truncate text-xs font-medium">
              {seg.groupInfo.title || "Unnamed group"}
            </span>
            <span
              class="shrink-0 rounded px-1 py-0.5 text-[10px]"
              style="background-color: var(--bg-tertiary); color: var(--text-muted);"
            >
              {seg.tabs.length}
            </span>
          </div>
          {#if !collapsedGroups.has(key)}
            {#each seg.tabs as tab (tab.id)}
              <SideTabItem {tab} indent={true} />
            {/each}
          {/if}
        </div>
      {:else}
        {#each seg.tabs as tab (tab.id)}
          <SideTabItem {tab} indent={false} />
        {/each}
      {/if}
    {/each}
  {:else}
    <!-- Domain grouping fallback -->
    {#each domainGroups as group (group.domain)}
      {#if group.tabs.length === 1}
        <SideTabItem tab={group.tabs[0]} indent={false} />
      {:else}
        <DomainGroup
          domain={group.domain}
          tabs={group.tabs}
          favicon={group.favicon}
        />
      {/if}
    {/each}
  {/if}

  {#if tabs.length === 0}
    <div class="px-3 py-6 text-center text-xs" style="color: var(--text-muted);">
      No tabs
    </div>
  {/if}
</div>
