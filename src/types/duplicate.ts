export type DetectionMode = "exact" | "canonical" | "title";

export interface DuplicateCluster {
  id: string;
  canonicalKey: string;
  tabIds: number[];
  mode: DetectionMode;
}
