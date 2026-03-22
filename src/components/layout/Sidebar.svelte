<script lang="ts">
  import SettingsPanel from "../settings/SettingsPanel.svelte";

  let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40"
    style="background-color: rgba(0, 0, 0, 0.3);"
    onclick={onClose}
    role="presentation"
  ></div>

  <aside
    class="fixed right-0 top-0 z-40 flex h-full w-96 flex-col border-l"
    style="background-color: var(--bg-primary); border-color: var(--border);"
  >
    <div
      class="flex items-center justify-between border-b px-4 py-3"
      style="border-color: var(--border);"
    >
      <h2 class="text-sm font-semibold" style="color: var(--text-primary);">
        Settings
      </h2>
      <button
        onclick={onClose}
        class="rounded p-1"
        style="color: var(--text-muted);"
        aria-label="Close settings"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <SettingsPanel />
    </div>
  </aside>
{/if}
