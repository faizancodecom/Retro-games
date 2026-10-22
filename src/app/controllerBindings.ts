export type BindingAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'action'
  | 'confirm'
  | 'alt1'
  | 'alt2'
  | 'accelerate'
  | 'brake';

export const BINDING_LABELS: Record<BindingAction, string> = {
  up: 'Move Up',
  down: 'Move Down',
  left: 'Move Left',
  right: 'Move Right',
  action: 'Fire / Jump (Space)',
  confirm: 'Start / OK (Enter)',
  alt1: 'Alt B (X key)',
  alt2: 'Alt Y (R key)',
  accelerate: 'Gas / Sprint (R1 / RB)',
  brake: 'Brake / Reverse (L1 / LB)',
};

export interface ControllerBindings {
  /** Gamepad button index per action; -1 = use stick for directions only. */
  buttons: Record<BindingAction, number>;
  /** Keyboard key string sent to games (ArrowUp, " ", etc.). */
  keys: Record<BindingAction, string>;
  useStick: boolean;
  deadzone: number;
}

export const DEFAULT_BINDINGS: ControllerBindings = {
  buttons: {
    up: 12,
    down: 13,
    left: 14,
    right: 15,
    action: 0,
    confirm: 9,
    alt1: 1,
    alt2: 3,
    accelerate: 5,
    brake: 4,
  },
  keys: {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    action: ' ',
    confirm: 'Enter',
    alt1: 'x',
    alt2: 'r',
    accelerate: 'ArrowUp',
    brake: 'ArrowDown',
  },
  useStick: true,
  deadzone: 0.38,
};

const STORAGE_KEY = 'retro-arcade-pad-bindings';

export function loadBindings(): ControllerBindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BINDINGS, buttons: { ...DEFAULT_BINDINGS.buttons }, keys: { ...DEFAULT_BINDINGS.keys } };
    const parsed = JSON.parse(raw) as Partial<ControllerBindings>;
    return {
      useStick: parsed.useStick ?? DEFAULT_BINDINGS.useStick,
      deadzone: typeof parsed.deadzone === 'number' ? parsed.deadzone : DEFAULT_BINDINGS.deadzone,
      buttons: { ...DEFAULT_BINDINGS.buttons, ...parsed.buttons },
      keys: { ...DEFAULT_BINDINGS.keys, ...parsed.keys },
    };
  } catch {
    return { ...DEFAULT_BINDINGS, buttons: { ...DEFAULT_BINDINGS.buttons }, keys: { ...DEFAULT_BINDINGS.keys } };
  }
}

export function saveBindings(b: ControllerBindings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
}

export function resetBindings(): ControllerBindings {
  const b = {
    ...DEFAULT_BINDINGS,
    buttons: { ...DEFAULT_BINDINGS.buttons },
    keys: { ...DEFAULT_BINDINGS.keys },
  };
  saveBindings(b);
  return b;
}

/** Normalize keyboard event key for storage. */
export function keyFromEvent(e: KeyboardEvent): string {
  if (e.key === ' ') return ' ';
  if (e.key.length === 1) return e.key.toLowerCase();
  return e.key;
}

export function formatKeyLabel(key: string): string {
  if (key === ' ') return 'SPACE';
  if (key === 'Enter') return 'ENTER';
  if (key.startsWith('Arrow')) return key.replace('Arrow', '').toUpperCase();
  return key.toUpperCase();
}
