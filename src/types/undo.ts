export type UndoCommand =
  | {
      type: "REOPEN_TABS";
      tabs: { url: string; windowId: number; index: number; pinned: boolean }[];
    }
  | {
      type: "REOPEN_WINDOW";
      tabs: { url: string; index: number; pinned: boolean }[];
    }
  | {
      type: "UNMOVE_TABS";
      moves: { tabId: number; windowId: number; index: number }[];
    }
  | {
      type: "UNMUTE_TABS";
      tabs: { tabId: number; muted: boolean }[];
    };

export function undoLabel(cmd: UndoCommand): string {
  switch (cmd.type) {
    case "REOPEN_TABS":
      return `Closed ${cmd.tabs.length} tab${cmd.tabs.length > 1 ? "s" : ""}`;
    case "REOPEN_WINDOW":
      return `Closed window (${cmd.tabs.length} tabs)`;
    case "UNMOVE_TABS":
      return `Moved ${cmd.moves.length} tab${cmd.moves.length > 1 ? "s" : ""}`;
    case "UNMUTE_TABS":
      return `Changed mute on ${cmd.tabs.length} tab${cmd.tabs.length > 1 ? "s" : ""}`;
  }
}
