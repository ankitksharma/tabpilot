<script lang="ts">
  import { getProjectsState } from "../../lib/state/projects.svelte";
  import { getTabState } from "../../lib/state/tabs.svelte";
  import { sendToBackground } from "../../lib/messaging/protocol";
  import {
    exportProjectsJSON,
    downloadFile,
  } from "../../lib/services/export-import";
  import SaveProjectDialog from "./SaveProjectDialog.svelte";

  const projects = getProjectsState();
  const tabState = getTabState();

  let showSaveDialog = $state(false);
  let editingId = $state<string | null>(null);
  let editName = $state("");

  $effect(() => {
    projects.loadProjects();
  });

  function startRename(id: string, name: string) {
    editingId = id;
    editName = name;
  }

  async function saveRename() {
    if (editingId && editName.trim()) {
      await projects.renameProject(editingId, editName.trim());
    }
    editingId = null;
  }

  async function restoreProject(projectId: string) {
    const project = projects.projects.find((p) => p.id === projectId);
    if (!project) return;

    for (const win of project.windows) {
      const urls = win.tabs.map((t) => t.url);
      if (urls.length > 0) {
        await sendToBackground({ type: "REOPEN_WINDOW", urls });
      }
    }
  }

  function exportAll() {
    const json = exportProjectsJSON(projects.projects);
    downloadFile(json, "tabpilot-projects.json", "application/json");
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold" style="color: var(--text-primary);">
      Projects
    </h2>
    <div class="flex gap-2">
      <button
        onclick={() => (showSaveDialog = true)}
        class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
        style="background-color: var(--accent); color: white;"
      >
        Save Current
      </button>
      {#if projects.projects.length > 0}
        <button
          onclick={exportAll}
          class="rounded-md px-2.5 py-1 text-xs transition-colors"
          style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
        >
          Export
        </button>
      {/if}
    </div>
  </div>

  {#if projects.projects.length === 0}
    <p class="py-4 text-center text-sm" style="color: var(--text-muted);">
      No saved projects. Save your current windows to create one.
    </p>
  {:else}
    <div class="flex flex-col gap-1">
      {#each projects.projects as project (project.id)}
        <div
          class="flex items-center justify-between rounded-md px-3 py-2"
          style="background-color: var(--bg-tertiary);"
        >
          <div class="flex min-w-0 flex-1 flex-col">
            {#if editingId === project.id}
              <input
                bind:value={editName}
                onblur={saveRename}
                onkeydown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") editingId = null; }}
                class="rounded border px-1.5 py-0.5 text-sm outline-none"
                style="background-color: var(--bg-secondary); border-color: var(--border); color: var(--text-primary);"
              />
            {:else}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <span
                class="cursor-pointer truncate text-sm font-medium"
                style="color: var(--text-primary);"
                ondblclick={() => startRename(project.id, project.name)}
              >
                {project.name}
              </span>
            {/if}
            <span class="text-xs" style="color: var(--text-muted);">
              {project.windows.length} window{project.windows.length > 1 ? "s" : ""},
              {project.windows.reduce((a, w) => a + w.tabs.length, 0)} tabs
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              onclick={() => restoreProject(project.id)}
              class="rounded px-2 py-1 text-xs transition-colors"
              style="color: var(--accent);"
              title="Restore"
            >
              Open
            </button>
            <button
              onclick={() => projects.deleteProject(project.id)}
              class="rounded px-2 py-1 text-xs transition-colors"
              style="color: var(--danger);"
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showSaveDialog}
  <SaveProjectDialog
    onSave={async (name) => {
      await projects.saveProject(name, tabState.windows);
      showSaveDialog = false;
    }}
    onCancel={() => (showSaveDialog = false)}
  />
{/if}
