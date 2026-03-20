<script lang="ts">
  import type { WindowInfo } from "../../types/tab";
  import { sendToBackground } from "../../lib/messaging/protocol";

  let { window, index }: { window: WindowInfo; index: number } = $props();

  function closeWindow() {
    sendToBackground({ type: "CLOSE_WINDOW", windowId: window.id });
  }
</script>

<div
  class="flex items-center justify-between border-b px-3 py-2"
  style="border-color: var(--border);"
>
  <div class="flex items-center gap-2">
    <span class="text-sm font-medium" style="color: var(--text-primary);">
      Window {index + 1}
    </span>
    <span
      class="rounded px-1.5 py-0.5 text-xs"
      style="background-color: var(--bg-tertiary); color: var(--text-muted);"
    >
      {window.tabs.length}
    </span>
    {#if window.focused}
      <span
        class="rounded px-1.5 py-0.5 text-xs"
        style="background-color: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--accent);"
      >
        focused
      </span>
    {/if}
  </div>
  <button
    onclick={closeWindow}
    class="rounded p-1 transition-colors hover:opacity-80"
    style="color: var(--text-muted);"
    title="Close window"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  </button>
</div>
