export interface Settings {
  theme: "dark" | "light" | "system";
  columnDensity: "compact" | "comfortable";
  autoSuspendMinutes: number; // 0 = disabled
  autoSuspendEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  columnDensity: "comfortable",
  autoSuspendMinutes: 30,
  autoSuspendEnabled: false,
};
