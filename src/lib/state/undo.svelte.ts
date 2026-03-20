import type { UndoCommand } from "../../types/undo";
import { undoLabel } from "../../types/undo";

const MAX_UNDO = 10;

let stack = $state<UndoCommand[]>([]);
let showToast = $state(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const canUndo = $derived(stack.length > 0);
const lastAction = $derived(stack.length > 0 ? undoLabel(stack[stack.length - 1]) : null);

function push(cmd: UndoCommand): void {
  stack = [...stack.slice(-(MAX_UNDO - 1)), cmd];
  showToast = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    showToast = false;
  }, 5000);
}

function pop(): UndoCommand | undefined {
  if (stack.length === 0) return undefined;
  const cmd = stack[stack.length - 1];
  stack = stack.slice(0, -1);
  showToast = false;
  if (toastTimer) clearTimeout(toastTimer);
  return cmd;
}

function dismissToast(): void {
  showToast = false;
  if (toastTimer) clearTimeout(toastTimer);
}

export function getUndoState() {
  return {
    get canUndo() { return canUndo; },
    get lastAction() { return lastAction; },
    get showToast() { return showToast; },
    push,
    pop,
    dismissToast,
  };
}
