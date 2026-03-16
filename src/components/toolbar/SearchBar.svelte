<script lang="ts">
  import { getSearchState } from "../../lib/state/search.svelte";

  const search = getSearchState();

  let inputValue = $state(search.query);
  let debounceTimer: ReturnType<typeof setTimeout>;

  function onInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    inputValue = value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      search.query = value;
    }, 150);
  }

  function clear() {
    inputValue = "";
    search.query = "";
  }
</script>

<div class="relative">
  <svg
    class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--text-muted)"
    stroke-width="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
  <input
    type="text"
    placeholder="Search tabs..."
    value={inputValue}
    oninput={onInput}
    class="w-56 rounded-md border py-1.5 pl-8 pr-8 text-sm outline-none transition-colors focus:border-[var(--accent)]"
    style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-primary);"
  />
  {#if inputValue}
    <button
      onclick={clear}
      class="absolute right-2 top-1/2 -translate-y-1/2"
      style="color: var(--text-muted);"
      aria-label="Clear search"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>
