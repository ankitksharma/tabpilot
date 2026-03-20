import type { WindowInfo } from "../../types/tab";
import type { Project } from "../../types/project";

interface ExportData {
  version: 1;
  exportedAt: number;
  windows: {
    id: number;
    tabs: { url: string; title: string; pinned: boolean }[];
  }[];
}

interface ProjectExportData {
  version: 1;
  exportedAt: number;
  projects: Project[];
}

export function exportWindowsJSON(windows: WindowInfo[]): string {
  const data: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    windows: windows.map((w) => ({
      id: w.id,
      tabs: w.tabs.map((t) => ({
        url: t.url,
        title: t.title,
        pinned: t.pinned,
      })),
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function exportWindowsCSV(windows: WindowInfo[]): string {
  const lines = ["window_id,tab_index,title,url,pinned"];
  for (const w of windows) {
    for (const t of w.tabs) {
      const title = t.title.replace(/"/g, '""');
      const url = t.url.replace(/"/g, '""');
      lines.push(`${w.id},${t.index},"${title}","${url}",${t.pinned}`);
    }
  }
  return lines.join("\n");
}

export function exportProjectsJSON(projects: Project[]): string {
  const data: ProjectExportData = {
    version: 1,
    exportedAt: Date.now(),
    projects,
  };
  return JSON.stringify(data, null, 2);
}

export function parseImportJSON(json: string): ExportData | null {
  try {
    const data = JSON.parse(json);
    if (data.version === 1 && Array.isArray(data.windows)) {
      return data as ExportData;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseProjectImportJSON(json: string): Project[] | null {
  try {
    const data = JSON.parse(json);
    if (data.version === 1 && Array.isArray(data.projects)) {
      return data.projects;
    }
    return null;
  } catch {
    return null;
  }
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
