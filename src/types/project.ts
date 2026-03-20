export interface SavedTab {
  url: string;
  title: string;
  pinned: boolean;
  groupRef?: string;
}

export interface SavedWindow {
  sequence: number;
  tabs: SavedTab[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  windows: SavedWindow[];
  settings: {
    restoreSuspended: boolean;
  };
}
