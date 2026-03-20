import type { Settings } from "../../types/settings";
import { DEFAULT_SETTINGS } from "../../types/settings";

let settings = $state<Settings>({ ...DEFAULT_SETTINGS });
let loaded = $state(false);

const STORAGE_KEY = "tabpilot_settings";

async function load(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
    }
  } catch {
    // Use defaults
  }
  loaded = true;
}

async function update(partial: Partial<Settings>): Promise<void> {
  settings = { ...settings, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

async function reset(): Promise<void> {
  settings = { ...DEFAULT_SETTINGS };
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

export function getSettingsState() {
  return {
    get settings() { return settings; },
    get loaded() { return loaded; },
    load,
    update,
    reset,
  };
}
