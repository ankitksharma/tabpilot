import type { UndoCommand } from "../../types/undo";
import { sendToBackground } from "../messaging/protocol";

export async function executeUndo(cmd: UndoCommand): Promise<void> {
  switch (cmd.type) {
    case "REOPEN_TABS":
      await sendToBackground({
        type: "REOPEN_TABS",
        tabs: cmd.tabs.map((t) => ({ url: t.url, windowId: t.windowId })),
      });
      break;

    case "REOPEN_WINDOW": {
      const urls = cmd.tabs.map((t) => t.url);
      await sendToBackground({ type: "REOPEN_WINDOW", urls });
      break;
    }

    case "UNMOVE_TABS":
      for (const move of cmd.moves) {
        await sendToBackground({
          type: "MOVE_TAB",
          tabId: move.tabId,
          windowId: move.windowId,
          index: move.index,
        });
      }
      break;

    case "UNMUTE_TABS":
      await sendToBackground({
        type: "MUTE_TABS",
        tabs: cmd.tabs,
      });
      break;
  }
}
