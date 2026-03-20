<script lang="ts">
  import Sortable from "sortablejs";
  import { sendToBackground } from "../../lib/messaging/protocol";

  let dropZoneEl: HTMLDivElement;
  let dragging = $state(false);
  let hovering = $state(false);

  // Listen for global sortable drag start/end to show/hide the edge zone
  $effect(() => {
    function onDragStart() { dragging = true; }
    function onDragEnd() { dragging = false; hovering = false; }

    document.addEventListener("sortable-drag-start", onDragStart);
    document.addEventListener("sortable-drag-end", onDragEnd);

    return () => {
      document.removeEventListener("sortable-drag-start", onDragStart);
      document.removeEventListener("sortable-drag-end", onDragEnd);
    };
  });

  $effect(() => {
    if (!dropZoneEl) return;

    const instance = Sortable.create(dropZoneEl, {
      group: {
        name: "tabpilot-tabs",
        put: true,
        pull: false,
      },
      onAdd(evt) {
        const tabId = Number(evt.item.dataset.tabId);
        if (!tabId || isNaN(tabId)) return;
        sendToBackground({ type: "CREATE_WINDOW", tabIds: [tabId] });
        evt.item.remove();
      },
    });

    return () => instance.destroy();
  });
</script>

<div
  class="fixed right-0 top-0 z-40 flex h-full items-center justify-center transition-all duration-300"
  style="
    width: {dragging ? (hovering ? '120px' : '48px') : '0px'};
    opacity: {dragging ? 1 : 0};
    pointer-events: {dragging ? 'auto' : 'none'};
    background: {hovering ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-primary))' : 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 6%, var(--bg-primary)))'};
    border-left: {dragging ? (hovering ? '2px solid var(--accent)' : '2px dashed var(--border)') : 'none'};
  "
  bind:this={dropZoneEl}
  data-window-id="new"
  role="region"
  aria-label="Drop tab here to open in new window"
  onmouseenter={() => { if (dragging) hovering = true; }}
  onmouseleave={() => { hovering = false; }}
  ondragenter={() => { hovering = true; }}
  ondragleave={() => { hovering = false; }}
  ondrop={() => { hovering = false; }}
>
  {#if dragging}
    <div
      class="flex flex-col items-center gap-2 transition-all duration-200"
      style="color: {hovering ? 'var(--accent)' : 'var(--text-muted)'}; transform: scale({hovering ? 1.1 : 1});"
    >
      <svg
        width={hovering ? 28 : 20}
        height={hovering ? 28 : 20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="transition-all duration-200"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {#if hovering}
        <span class="whitespace-nowrap text-xs font-medium">New window</span>
      {/if}
    </div>
  {/if}
</div>
