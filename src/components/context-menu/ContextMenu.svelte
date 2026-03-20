<script lang="ts">
  import { getContextMenuState } from "../../lib/state/ui.svelte";
  import { sendToBackground } from "../../lib/messaging/protocol";

  const ctx = getContextMenuState();

  let menuEl = $state<HTMLDivElement>();

  $effect(() => {
    if (!ctx.isOpen) return;

    function handleClick(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        ctx.closeContextMenu();
      }
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        ctx.closeContextMenu();
      }
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  const menuPosition = $derived.by(() => {
    const x = ctx.position.x;
    const y = ctx.position.y;
    const maxX = globalThis.innerWidth - 200;
    const maxY = globalThis.innerHeight - 280;
    return {
      left: `${Math.min(x, maxX)}px`,
      top: `${Math.min(y, maxY)}px`,
    };
  });

  function action(fn: () => void) {
    return () => {
      fn();
      ctx.closeContextMenu();
    };
  }

  const closeTab = $derived(
    action(() => {
      if (!ctx.targetTab) return;
      sendToBackground({ type: "CLOSE_TAB", tabId: ctx.targetTab.id });
    }),
  );

  const togglePin = $derived(
    action(() => {
      if (!ctx.targetTab) return;
      sendToBackground({
        type: "PIN_TAB",
        tabId: ctx.targetTab.id,
        pinned: !ctx.targetTab.pinned,
      });
    }),
  );

  const toggleMute = $derived(
    action(() => {
      if (!ctx.targetTab) return;
      sendToBackground({
        type: "MUTE_TAB",
        tabId: ctx.targetTab.id,
        muted: !ctx.targetTab.mutedInfo.muted,
      });
    }),
  );

  const suspendTab = $derived(
    action(() => {
      if (!ctx.targetTab) return;
      sendToBackground({ type: "DISCARD_TAB", tabId: ctx.targetTab.id });
    }),
  );

  const moveToNewWindow = $derived(
    action(() => {
      if (!ctx.targetTab) return;
      sendToBackground({
        type: "CREATE_WINDOW",
        tabIds: [ctx.targetTab.id],
      });
    }),
  );
</script>

{#if ctx.isOpen && ctx.targetTab}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={menuEl}
    class="fixed z-[9999] min-w-[180px] rounded-lg border py-1 shadow-xl"
    style="left: {menuPosition.left}; top: {menuPosition.top}; background-color: var(--bg-secondary); border-color: var(--border);"
  >
    <button class="context-menu-item" onclick={closeTab}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
      Close tab
    </button>

    <button class="context-menu-item" onclick={togglePin}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      </svg>
      {ctx.targetTab.pinned ? "Unpin tab" : "Pin tab"}
    </button>

    <button class="context-menu-item" onclick={toggleMute}>
      {#if ctx.targetTab.mutedInfo.muted}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
        </svg>
        Unmute tab
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
        </svg>
        Mute tab
      {/if}
    </button>

    {#if !ctx.targetTab.discarded}
      <div class="my-1 border-t" style="border-color: var(--border);"></div>
      <button class="context-menu-item" onclick={suspendTab}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        Suspend tab
      </button>
    {/if}

    <div class="my-1 border-t" style="border-color: var(--border);"></div>
    <button class="context-menu-item" onclick={moveToNewWindow}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
      Move to new window
    </button>
  </div>
{/if}

<style>
  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.1s;
  }

  .context-menu-item:hover {
    background-color: var(--bg-hover);
  }
</style>
