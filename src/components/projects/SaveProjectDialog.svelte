<script lang="ts">
  let { onSave, onCancel }: { onSave: (name: string) => void; onCancel: () => void } = $props();

  let name = $state("");

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center"
  style="background-color: rgba(0, 0, 0, 0.5);"
  onclick={onCancel}
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="w-96 rounded-xl border p-6"
    style="background-color: var(--bg-secondary); border-color: var(--border);"
    onclick={(e) => e.stopPropagation()}
  >
    <h3 class="mb-4 text-base font-semibold" style="color: var(--text-primary);">
      Save Project
    </h3>
    <form onsubmit={handleSubmit}>
      <input
        bind:value={name}
        placeholder="Project name..."
        class="mb-4 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-primary);"
      />
      <div class="flex justify-end gap-2">
        <button
          type="button"
          onclick={onCancel}
          class="rounded-md px-4 py-1.5 text-sm"
          style="color: var(--text-secondary);"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          class="rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          style="background-color: var(--accent); color: white;"
        >
          Save
        </button>
      </div>
    </form>
  </div>
</div>
