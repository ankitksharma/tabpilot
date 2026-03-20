import type { Project, SavedWindow } from "../../types/project";
import type { WindowInfo } from "../../types/tab";

let projects = $state<Project[]>([]);
let loading = $state(false);

const STORAGE_KEY = "tabpilot_projects";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function loadProjects(): Promise<void> {
  loading = true;
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    projects = result[STORAGE_KEY] ?? [];
  } catch {
    projects = [];
  } finally {
    loading = false;
  }
}

async function persist(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: projects });
}

async function saveProject(
  name: string,
  windows: WindowInfo[],
  restoreSuspended = true,
): Promise<Project> {
  const now = Date.now();
  const savedWindows: SavedWindow[] = windows.map((w, i) => ({
    sequence: i,
    tabs: w.tabs.map((t) => ({
      url: t.url,
      title: t.title,
      pinned: t.pinned,
    })),
  }));

  const project: Project = {
    id: generateId(),
    name,
    createdAt: now,
    modifiedAt: now,
    windows: savedWindows,
    settings: { restoreSuspended },
  };

  projects = [...projects, project];
  await persist();
  return project;
}

async function deleteProject(id: string): Promise<void> {
  projects = projects.filter((p) => p.id !== id);
  await persist();
}

async function renameProject(id: string, name: string): Promise<void> {
  projects = projects.map((p) =>
    p.id === id ? { ...p, name, modifiedAt: Date.now() } : p,
  );
  await persist();
}

export function getProjectsState() {
  return {
    get projects() { return projects; },
    get loading() { return loading; },
    loadProjects,
    saveProject,
    deleteProject,
    renameProject,
  };
}
