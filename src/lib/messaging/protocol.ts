import type {
  BackgroundMessage,
  DashboardMessage,
  FullStatePayload,
} from "../../types/messages";

/**
 * Send a message from the dashboard to the background service worker.
 * Returns the response from the background handler.
 */
export async function sendToBackground<T = void>(
  message: DashboardMessage,
): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

/**
 * Send a state patch from the background to all connected dashboard tabs.
 * Uses chrome.runtime.sendMessage which reaches all extension pages.
 */
export function broadcastToUI(message: BackgroundMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // No listeners — dashboard not open. Expected.
  });
}

/**
 * Request full state from background. Convenience wrapper.
 */
export async function requestFullState(): Promise<FullStatePayload> {
  return sendToBackground<FullStatePayload>({ type: "GET_FULL_STATE" });
}
