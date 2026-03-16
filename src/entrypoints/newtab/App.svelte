<script lang="ts">
  import Dashboard from "../../components/dashboard/Dashboard.svelte";
  import Toolbar from "../../components/toolbar/Toolbar.svelte";
  import { getTabState } from "../../lib/state/tabs.svelte";
  import type { BackgroundMessage } from "../../types/messages";

  const tabState = getTabState();

  $effect(() => {
    tabState.loadFullState();

    const listener = (message: BackgroundMessage) => {
      if (message && typeof message === "object" && "type" in message) {
        tabState.handleBackgroundMessage(message);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  });
</script>

<div class="flex min-h-screen flex-col">
  <header
    class="sticky top-0 z-50 flex items-center justify-between border-b px-6 py-3"
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
    <Toolbar />
  </header>

  <main class="flex-1 p-6">
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
  </main>
</div>
