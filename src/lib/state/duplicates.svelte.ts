import type { TabInfo } from "../../types/tab";
import type { DuplicateCluster, DetectionMode } from "../../types/duplicate";

const STORAGE_KEY = "tabpilot_dupe_clusters";

let clusters = $state<DuplicateCluster[]>([]);
let mode = $state<DetectionMode>("exact");
let scanning = $state(false);

// Load persisted clusters on init
chrome.storage.local.get(STORAGE_KEY).then((result) => {
  if (result[STORAGE_KEY]?.length) {
    clusters = result[STORAGE_KEY];
  }
});

function persistClusters(data: DuplicateCluster[]) {
  clusters = data;
  chrome.storage.local.set({ [STORAGE_KEY]: data });
}

const duplicateTabIds = $derived(
  new Set(clusters.flatMap((c) => c.tabIds.slice(1))),
);
const clusterCount = $derived(clusters.length);
const duplicateCount = $derived(duplicateTabIds.size);

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const stripParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "gclid", "fbclid", "ref", "source", "mc_cid", "mc_eid",
    ];
    stripParams.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= la; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lb; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return 1 - matrix[la][lb] / Math.max(la, lb);
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function scanExact(tabs: TabInfo[]): DuplicateCluster[] {
  const groups = new Map<string, number[]>();
  for (const tab of tabs) {
    if (!tab.url || tab.url === "chrome://newtab/") continue;
    const key = tab.url;
    const existing = groups.get(key);
    if (existing) {
      existing.push(tab.id);
    } else {
      groups.set(key, [tab.id]);
    }
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, tabIds]) => ({
      id: generateId(),
      canonicalKey: key,
      tabIds,
      mode: "exact" as DetectionMode,
    }));
}

function scanCanonical(tabs: TabInfo[]): DuplicateCluster[] {
  const groups = new Map<string, number[]>();
  for (const tab of tabs) {
    if (!tab.url || tab.url === "chrome://newtab/") continue;
    const key = normalizeUrl(tab.url);
    const existing = groups.get(key);
    if (existing) {
      existing.push(tab.id);
    } else {
      groups.set(key, [tab.id]);
    }
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, tabIds]) => ({
      id: generateId(),
      canonicalKey: key,
      tabIds,
      mode: "canonical" as DetectionMode,
    }));
}

function scanTitleSimilarity(tabs: TabInfo[]): DuplicateCluster[] {
  const result: DuplicateCluster[] = [];
  const assigned = new Set<number>();

  // Pre-filter: group by domain to reduce O(n^2) comparisons
  const byDomain = new Map<string, TabInfo[]>();
  for (const tab of tabs) {
    if (!tab.url || tab.url === "chrome://newtab/") continue;
    const domain = getDomain(tab.url);
    const group = byDomain.get(domain);
    if (group) {
      group.push(tab);
    } else {
      byDomain.set(domain, [tab]);
    }
  }

  for (const [, domainTabs] of byDomain) {
    for (let i = 0; i < domainTabs.length; i++) {
      if (assigned.has(domainTabs[i].id)) continue;
      const cluster: number[] = [domainTabs[i].id];
      for (let j = i + 1; j < domainTabs.length; j++) {
        if (assigned.has(domainTabs[j].id)) continue;
        const sim = levenshteinSimilarity(
          domainTabs[i].title.toLowerCase(),
          domainTabs[j].title.toLowerCase(),
        );
        if (sim > 0.9) {
          cluster.push(domainTabs[j].id);
          assigned.add(domainTabs[j].id);
        }
      }
      if (cluster.length > 1) {
        assigned.add(domainTabs[i].id);
        result.push({
          id: generateId(),
          canonicalKey: domainTabs[i].title,
          tabIds: cluster,
          mode: "title",
        });
      }
    }
  }
  return result;
}

function scan(tabs: TabInfo[]): void {
  scanning = true;
  let result: DuplicateCluster[];
  switch (mode) {
    case "exact":
      result = scanExact(tabs);
      break;
    case "canonical":
      result = scanCanonical(tabs);
      break;
    case "title":
      result = scanTitleSimilarity(tabs);
      break;
  }
  persistClusters(result);
  scanning = false;
}

function isDuplicate(tabId: number): boolean {
  return duplicateTabIds.has(tabId);
}

function getClusterForTab(tabId: number): DuplicateCluster | undefined {
  return clusters.find((c) => c.tabIds.includes(tabId));
}

function clear(): void {
  persistClusters([]);
}

export function getDuplicatesState() {
  return {
    get clusters() { return clusters; },
    get mode() { return mode; },
    set mode(v: DetectionMode) { mode = v; },
    get scanning() { return scanning; },
    get clusterCount() { return clusterCount; },
    get duplicateCount() { return duplicateCount; },
    scan,
    isDuplicate,
    getClusterForTab,
    clear,
  };
}
