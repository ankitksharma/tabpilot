type KeyHandler = (e: KeyboardEvent) => void;

interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: KeyHandler;
  description: string;
}

const bindings: KeyBinding[] = [];
let active = false;

function matches(e: KeyboardEvent, binding: KeyBinding): boolean {
  if (e.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  if (binding.ctrl && !e.ctrlKey) return false;
  if (binding.shift && !e.shiftKey) return false;
  if (binding.alt && !e.altKey) return false;
  if (binding.meta && !e.metaKey) return false;
  return true;
}

function handleKeyDown(e: KeyboardEvent): void {
  // Don't handle if user is typing in an input
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  for (const binding of bindings) {
    if (matches(e, binding)) {
      e.preventDefault();
      binding.handler(e);
      return;
    }
  }
}

export function registerBinding(binding: KeyBinding): () => void {
  bindings.push(binding);
  return () => {
    const idx = bindings.indexOf(binding);
    if (idx >= 0) bindings.splice(idx, 1);
  };
}

export function initKeyboard(): () => void {
  if (active) return () => {};
  active = true;
  document.addEventListener("keydown", handleKeyDown);
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    active = false;
  };
}

export function getBindings(): KeyBinding[] {
  return [...bindings];
}
