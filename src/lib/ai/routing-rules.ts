import type { RoutingRule } from "../../types/ai";
import type { TabInfo } from "../../types/tab";

const STORAGE_KEY = "tabpilot_routing_rules";

export async function loadRules(): Promise<RoutingRule[]> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    return result[STORAGE_KEY] ?? [];
  } catch {
    return [];
  }
}

export async function saveRules(rules: RoutingRule[]): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: rules });
}

export function matchTab(
  tab: TabInfo,
  rules: RoutingRule[],
): RoutingRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const matched = matchRule(tab, rule);
    if (matched) return rule;
  }
  return null;
}

function matchRule(tab: TabInfo, rule: RoutingRule): boolean {
  const target = `${tab.title} ${tab.url}`.toLowerCase();
  switch (rule.patternType) {
    case "domain": {
      try {
        const domain = new URL(tab.url).hostname.toLowerCase();
        return domain.includes(rule.pattern.toLowerCase());
      } catch {
        return false;
      }
    }
    case "keyword":
      return target.includes(rule.pattern.toLowerCase());
    case "regex": {
      try {
        const re = new RegExp(rule.pattern, "i");
        return re.test(tab.title) || re.test(tab.url);
      } catch {
        return false;
      }
    }
  }
}
