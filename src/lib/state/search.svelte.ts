import type { TabInfo, WindowInfo } from "../../types/tab";

let query = $state("");
let sortMode = $state<"default" | "alpha" | "domain">("default");

function filterTabs(tabs: TabInfo[], q: string): TabInfo[] {
  if (!q.trim()) return tabs;
  const lower = q.toLowerCase();
  return tabs.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.url.toLowerCase().includes(lower),
  );
}

function sortTabs(tabs: TabInfo[], mode: typeof sortMode): TabInfo[] {
  if (mode === "default") return tabs;
  const sorted = [...tabs];
  if (mode === "alpha") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (mode === "domain") {
    sorted.sort((a, b) => {
      const da = getDomain(a.url);
      const db = getDomain(b.url);
      return da.localeCompare(db) || a.title.localeCompare(b.title);
    });
  }
  return sorted;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function filterAndSortWindows(windows: WindowInfo[]): WindowInfo[] {
  return windows
    .map((w) => ({
      ...w,
      tabs: sortTabs(filterTabs(w.tabs, query), sortMode),
    }))
    .filter((w) => w.tabs.length > 0 || !query.trim());
}

export function getSearchState() {
  return {
    get query() { return query; },
    set query(v: string) { query = v; },
    get sortMode() { return sortMode; },
    set sortMode(v: "default" | "alpha" | "domain") { sortMode = v; },
    filterAndSortWindows,
  };
}
