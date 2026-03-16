<script lang="ts">
  import { getSearchState } from "../../lib/state/search.svelte";

  const search = getSearchState();

  const options: { value: "default" | "alpha" | "domain"; label: string }[] = [
    { value: "default", label: "Default" },
    { value: "alpha", label: "A → Z" },
    { value: "domain", label: "By domain" },
  ];

  function onChange(e: Event) {
    search.sortMode = (e.target as HTMLSelectElement).value as typeof search.sortMode;
  }
</script>

<select
  value={search.sortMode}
  onchange={onChange}
  class="cursor-pointer rounded-md border py-1.5 pl-2 pr-6 text-sm outline-none transition-colors focus:border-[var(--accent)]"
  style="background-color: var(--bg-tertiary); border-color: var(--border); color: var(--text-secondary);"
>
  {#each options as opt}
    <option value={opt.value}>{opt.label}</option>
  {/each}
</select>
