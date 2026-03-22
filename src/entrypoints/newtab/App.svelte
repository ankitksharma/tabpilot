<script lang="ts">
  import Dashboard from "../../components/dashboard/Dashboard.svelte";
  import Toolbar from "../../components/toolbar/Toolbar.svelte";
  import ContextMenu from "../../components/context-menu/ContextMenu.svelte";
  import BulkActionBar from "../../components/selection/BulkActionBar.svelte";
  import UndoToast from "../../components/common/UndoToast.svelte";
  import Sidebar from "../../components/layout/Sidebar.svelte";
  import ProjectPanel from "../../components/projects/ProjectPanel.svelte";
  import DuplicatePanel from "../../components/duplicates/DuplicatePanel.svelte";
  import AIWorkspacePanel from "../../components/ai/AIWorkspacePanel.svelte";
  import { getTabState } from "../../lib/state/tabs.svelte";
  import { initKeyboard, registerBinding } from "../../lib/services/keyboard";
  import { getSelectionState } from "../../lib/state/selection.svelte";
  import { getUndoState } from "../../lib/state/undo.svelte";
  import { executeUndo } from "../../lib/services/undo";
  import {
    exportWindowsJSON,
    exportWindowsCSV,
    downloadFile,
  } from "../../lib/services/export-import";
  import type { BackgroundMessage } from "../../types/messages";

  const tabState = getTabState();
  const selection = getSelectionState();
  const undoState = getUndoState();

  let sidebarOpen = $state(false);

  type TopTab = "tabs" | "projects" | "duplicates" | "ai";
  let activeTab = $state<TopTab>("tabs");

  const topTabs: { id: TopTab; label: string }[] = [
    { id: "tabs", label: "Tabs" },
    { id: "projects", label: "Projects" },
    { id: "duplicates", label: "Dupes" },
    { id: "ai", label: "AI" },
  ];

  $effect(() => {
    tabState.loadFullState();

    const BG_MESSAGE_TYPES = new Set([
      "FULL_STATE", "TAB_UPDATED", "TAB_REMOVED", "TAB_MOVED",
      "TAB_ATTACHED", "TAB_DETACHED", "WINDOW_REMOVED", "WINDOW_CREATED",
      "TAB_GROUP_UPDATED", "TAB_GROUP_REMOVED",
    ]);

    const listener = (message: BackgroundMessage) => {
      if (!message || typeof message !== "object" || !("type" in message)) return;
      if (!BG_MESSAGE_TYPES.has(message.type)) return;
      tabState.handleBackgroundMessage(message);
    };

    chrome.runtime.onMessage.addListener(listener);

    const cleanupKeyboard = initKeyboard();

    const unbindEscape = registerBinding({
      key: "Escape",
      handler: () => {
        if (selection.count > 0) selection.clearSelection();
      },
      description: "Clear selection",
    });

    const unbindUndo = registerBinding({
      key: "z",
      ctrl: true,
      handler: async () => {
        const cmd = undoState.pop();
        if (cmd) await executeUndo(cmd);
      },
      description: "Undo last action",
    });

    const unbindSlash = registerBinding({
      key: "/",
      handler: () => {
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Search tabs..."]');
        input?.focus();
      },
      description: "Focus search",
    });

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      cleanupKeyboard();
      unbindEscape();
      unbindUndo();
      unbindSlash();
    };
  });

  let exportFormat = $state<"json" | "csv">("json");

  function doExport() {
    if (exportFormat === "json") {
      const json = exportWindowsJSON(tabState.windows);
      downloadFile(json, "tabpilot-tabs.json", "application/json");
    } else {
      const csv = exportWindowsCSV(tabState.windows);
      downloadFile(csv, "tabpilot-tabs.csv", "text/csv");
    }
  }
</script>

<div class="flex min-h-screen flex-col">
  <header
    class="sticky top-0 z-30 flex items-center justify-between border-b px-6 py-3"
    style="background-color: var(--bg-secondary); border-color: var(--border);"
  >
    <div class="flex items-center gap-3">
      <h1 class="text-lg font-semibold" style="color: var(--text-primary);">
        TabPilot
      </h1>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-medium"
        style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
      >
        {tabState.tabCount} tabs &middot; {tabState.windowCount} windows
      </span>
    </div>

    <div class="flex items-center gap-3">
      <Toolbar />
      <div class="h-4 w-px" style="background-color: var(--border);"></div>
      <div class="flex items-center overflow-hidden rounded-md border" style="border-color: var(--border);">
        <select
          bind:value={exportFormat}
          class="cursor-pointer border-none py-1 pl-2 pr-6 text-xs outline-none"
          style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
        <button
          onclick={doExport}
          class="flex items-center gap-1 border-l px-2.5 py-1 text-xs transition-colors hover:brightness-110"
          style="border-color: var(--border); color: var(--text-secondary); background-color: var(--bg-tertiary);"
          title="Export tabs as {exportFormat.toUpperCase()}"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>
      <button
        onclick={() => (sidebarOpen = !sidebarOpen)}
        class="rounded-md p-1.5 transition-colors"
        style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
        title="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
    </div>
  </header>

  <!-- Top tabs -->
  <div
    class="sticky top-[53px] z-20 flex border-b px-6"
    style="background-color: var(--bg-secondary); border-color: var(--border);"
  >
    {#each topTabs as t}
      <button
        onclick={() => (activeTab = t.id)}
        class="px-4 py-2 text-sm font-medium transition-colors"
        style="color: {activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)'}; border-bottom: 2px solid {activeTab === t.id ? 'var(--accent)' : 'transparent'};"
      >
        {t.label}
      </button>
    {/each}
  </div>

  <main class="flex-1 p-6">
    {#if activeTab === "tabs"}
      {#if tabState.loading}
        <div
          class="flex items-center justify-center py-20"
          style="color: var(--text-muted);"
        >
          Loading tabs...
        </div>
      {:else if tabState.error}
        <div
          class="flex items-center justify-center py-20"
          style="color: var(--danger);"
        >
          {tabState.error}
        </div>
      {:else}
        <Dashboard windows={tabState.windows} />
      {/if}
    {:else if activeTab === "projects"}
      <div class="mx-auto max-w-2xl">
        <ProjectPanel />
      </div>
    {:else if activeTab === "duplicates"}
      <div class="mx-auto max-w-2xl">
        <DuplicatePanel />
      </div>
    {:else if activeTab === "ai"}
      <div class="mx-auto max-w-2xl">
        <AIWorkspacePanel />
      </div>
    {/if}
  </main>
</div>

<ContextMenu />
<BulkActionBar />
<UndoToast />
<Sidebar isOpen={sidebarOpen} onClose={() => (sidebarOpen = false)} />
