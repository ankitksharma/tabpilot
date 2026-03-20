<script lang="ts">
  import { getUndoState } from "../../lib/state/undo.svelte";
  import { executeUndo } from "../../lib/services/undo";

  const undoState = getUndoState();

  async function handleUndo() {
    const cmd = undoState.pop();
    if (cmd) {
      await executeUndo(cmd);
    }
  }
</script>

{#if undoState.showToast && undoState.lastAction}
  <div
    class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl"
    style="background-color: var(--bg-secondary); border-color: var(--border);"
  >
    <span class="text-sm" style="color: var(--text-secondary);">
      {undoState.lastAction}
    </span>
    <button
      onclick={handleUndo}
      class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
      style="background-color: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent);"
    >
      Undo
    </button>
    <button
      onclick={() => undoState.dismissToast()}
      class="p-0.5"
      style="color: var(--text-muted);"
      aria-label="Dismiss"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </div>
{/if}
