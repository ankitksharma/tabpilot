<script lang="ts">
  import type { TabInfo } from "../../types/tab";
  import DomainGroup from "./DomainGroup.svelte";
  import SideTabItem from "./SideTabItem.svelte";

  let { tabs }: { tabs: TabInfo[] } = $props();

  interface DomainGroupData {
    domain: string;
    tabs: TabInfo[];
    favicon: string;
  }

  const grouped = $derived.by((): DomainGroupData[] => {
    const map = new Map<string, TabInfo[]>();
    const favicons = new Map<string, string>();
    const firstSeen = new Map<string, number>();

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      let domain: string;
      try {
        domain = new URL(tab.url).hostname;
      } catch {
        domain = "other";
      }

      const existing = map.get(domain);
      if (existing) {
        existing.push(tab);
      } else {
        map.set(domain, [tab]);
        firstSeen.set(domain, i);
      }

      if (tab.favIconUrl && !favicons.has(domain)) {
        favicons.set(domain, tab.favIconUrl);
      }
    }

    // Stable sort: preserve order of first appearance in the tab strip
    return [...map.entries()]
      .sort((a, b) => (firstSeen.get(a[0]) ?? 0) - (firstSeen.get(b[0]) ?? 0))
      .map(([domain, domainTabs]) => ({
        domain,
        tabs: domainTabs,
        favicon: favicons.get(domain) ?? "",
      }));
  });
</script>

<div class="flex flex-col py-1">
  {#each grouped as group (group.domain)}
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

  {#if tabs.length === 0}
    <div class="px-3 py-6 text-center text-xs" style="color: var(--text-muted);">
      No tabs
    </div>
  {/if}
</div>
