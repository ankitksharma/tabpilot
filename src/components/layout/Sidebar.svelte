<script lang="ts">
  import ProjectPanel from "../projects/ProjectPanel.svelte";
  import DuplicatePanel from "../duplicates/DuplicatePanel.svelte";
  import AIWorkspacePanel from "../ai/AIWorkspacePanel.svelte";
  import SettingsPanel from "../settings/SettingsPanel.svelte";

  let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();

  type Panel = "projects" | "duplicates" | "ai" | "settings";
  let activePanel = $state<Panel>("projects");

  const panels: { id: Panel; label: string }[] = [
    { id: "projects", label: "Projects" },
    { id: "duplicates", label: "Dupes" },
    { id: "ai", label: "AI" },
    { id: "settings", label: "Settings" },
  ];
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40"
    style="background-color: rgba(0, 0, 0, 0.3);"
    onclick={onClose}
  ></div>

  <aside
    class="fixed right-0 top-0 z-40 flex h-full w-96 flex-col border-l"
    style="background-color: var(--bg-primary); border-color: var(--border);"
  >
    <!-- Tabs -->
    <div
      class="flex items-center border-b"
      style="border-color: var(--border);"
    >
      {#each panels as panel}
        <button
          onclick={() => (activePanel = panel.id)}
          class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors"
          style="color: {activePanel === panel.id ? 'var(--accent)' : 'var(--text-muted)'}; border-bottom: 2px solid {activePanel === panel.id ? 'var(--accent)' : 'transparent'};"
        >
          {panel.label}
        </button>
      {/each}
      <button
        onclick={onClose}
        class="px-3 py-2.5"
        style="color: var(--text-muted);"
        aria-label="Close sidebar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Panel content -->
    <div class="flex-1 overflow-y-auto p-4">
      {#if activePanel === "projects"}
        <ProjectPanel />
      {:else if activePanel === "duplicates"}
        <DuplicatePanel />
      {:else if activePanel === "ai"}
        <AIWorkspacePanel />
      {:else if activePanel === "settings"}
        <SettingsPanel />
      {/if}
    </div>
  </aside>
{/if}
