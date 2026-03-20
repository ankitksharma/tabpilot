import { sendToBackground } from "../messaging/protocol";

export async function suspendTab(tabId: number): Promise<void> {
  await sendToBackground({ type: "DISCARD_TAB", tabId });
}

export async function suspendTabs(tabIds: number[]): Promise<void> {
  await sendToBackground({ type: "DISCARD_TABS", tabIds });
}

export async function suspendWindow(
  windowId: number,
  tabs: { id: number; active: boolean }[],
): Promise<void> {
  const toSuspend = tabs.filter((t) => !t.active).map((t) => t.id);
  if (toSuspend.length > 0) {
    await suspendTabs(toSuspend);
  }
}
