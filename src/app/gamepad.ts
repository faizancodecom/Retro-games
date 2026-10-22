import {
  loadBindings,
  type BindingAction,
  type ControllerBindings,
} from './controllerBindings';

type PadListener = (name: string, index: number) => void;
type StatusListener = () => void;

const held = new Map<number, Set<string>>();
let rafId = 0;
let onConnectCb: PadListener | null = null;
let onDisconnectCb: (() => void) | null = null;
const statusListeners = new Set<StatusListener>();

let bindings: ControllerBindings = loadBindings();

export interface PadMoveState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  fire: boolean;
}

const EMPTY_PAD: PadMoveState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  accelerate: false,
  brake: false,
  strafeLeft: false,
  strafeRight: false,
  turnLeft: false,
  turnRight: false,
  fire: false,
};

const KEY_CODES: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Enter: 'Enter',
};

function fireKey(key: string, type: 'keydown' | 'keyup'): void {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      key,
      code: KEY_CODES[key] ?? (key.length === 1 ? `Key${key.toUpperCase()}` : key),
      bubbles: true,
    })
  );
}

function setHeld(index: number, key: string, down: boolean): void {
  let set = held.get(index);
  if (!set) {
    set = new Set();
    held.set(index, set);
  }
  if (down && !set.has(key)) {
    set.add(key);
    fireKey(key, 'keydown');
  } else if (!down && set.has(key)) {
    set.delete(key);
    fireKey(key, 'keyup');
  }
}

function keyFor(action: BindingAction): string {
  return bindings.keys[action];
}

function btnPressed(gp: Gamepad, idx: number): boolean {
  return idx >= 0 && (gp.buttons[idx]?.pressed ?? false);
}

function notifyStatus(): void {
  statusListeners.forEach((fn) => fn());
}

export function getBindings(): ControllerBindings {
  return bindings;
}

export function reloadBindings(): void {
  bindings = loadBindings();
}

export function subscribePadStatus(fn: StatusListener): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export function getPadStatus(): { connected: boolean; count: number; names: string[] } {
  const pads = Array.from(navigator.getGamepads()).filter((g): g is Gamepad => !!g?.connected);
  return {
    connected: pads.length > 0,
    count: pads.length,
    names: pads.map((p) => p.id || 'Gamepad'),
  };
}

export function requestPadTest(): void {
  const pads = navigator.getGamepads();
  for (const gp of pads) {
    if (gp?.connected) {
      onConnectCb?.(gp.id, gp.index);
      notifyStatus();
      return;
    }
  }
  const toast = document.createElement('div');
  toast.className = 'pad-toast';
  toast.textContent = 'No controller — plug in USB/BT pad & press any button';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/** Right stick horizontal — for 3D look (raw axis, apply dt in engine). */
export function readGamepadLook(): number {
  const gp = navigator.getGamepads()[0];
  if (!gp) return 0;
  const dz = bindings.deadzone * 0.65;
  const ax = gp.axes[2] ?? 0;
  if (Math.abs(ax) < dz) return 0;
  return ax;
}

/** Live pad state for 3D / racing (plus keyboard via synthesized keys). */
export function readGamepadMove(): PadMoveState {
  const gp = navigator.getGamepads()[0];
  if (!gp?.connected) return { ...EMPTY_PAD };
  bindings = loadBindings();
  const dz = bindings.deadzone;
  const ax = gp.axes[0] ?? 0;
  const ay = gp.axes[1] ?? 0;

  const accelBtn = bindings.buttons.accelerate;
  const brakeBtn = bindings.buttons.brake;
  const forward =
    (bindings.useStick && ay < -dz) ||
    btnPressed(gp, accelBtn) ||
    btnPressed(gp, bindings.buttons.up);
  const back =
    (bindings.useStick && ay > dz) ||
    btnPressed(gp, brakeBtn) ||
    btnPressed(gp, bindings.buttons.down);

  return {
    forward,
    back,
    left: (bindings.useStick && ax < -dz) || btnPressed(gp, bindings.buttons.left),
    right: (bindings.useStick && ax > dz) || btnPressed(gp, bindings.buttons.right),
    accelerate: btnPressed(gp, accelBtn),
    brake: btnPressed(gp, brakeBtn),
    strafeLeft: bindings.useStick && ax < -dz,
    strafeRight: bindings.useStick && ax > dz,
    turnLeft: btnPressed(gp, bindings.buttons.left),
    turnRight: btnPressed(gp, bindings.buttons.right),
    fire:
      btnPressed(gp, bindings.buttons.action) ||
      btnPressed(gp, 7) ||
      btnPressed(gp, bindings.buttons.alt2),
  };
}

function mapStick(index: number, gp: Gamepad): void {
  if (!bindings.useStick) return;
  const dz = bindings.deadzone;
  const ax = gp.axes[0] ?? 0;
  const ay = gp.axes[1] ?? 0;
  setHeld(index, keyFor('left'), ax < -dz);
  setHeld(index, keyFor('right'), ax > dz);
  setHeld(index, keyFor('up'), ay < -dz);
  setHeld(index, keyFor('down'), ay > dz);
}

function mapDirectionButtons(index: number, gp: Gamepad): void {
  const dirs: BindingAction[] = ['up', 'down', 'left', 'right'];
  for (const d of dirs) {
    const b = bindings.buttons[d];
    if (b >= 0) setHeld(index, keyFor(d), gp.buttons[b]?.pressed ?? false);
  }
}

function mapActionButtons(index: number, gp: Gamepad): void {
  const acts: BindingAction[] = ['action', 'confirm', 'alt1', 'alt2', 'accelerate', 'brake'];
  for (const a of acts) {
    const b = bindings.buttons[a];
    if (b < 0) continue;
    let down = gp.buttons[b]?.pressed ?? false;
    if (a === 'confirm' && !down && bindings.buttons.confirm === 9) {
      down = gp.buttons[7]?.pressed ?? false;
    }
    setHeld(index, keyFor(a), down);
  }
}

function poll(): void {
  const pads = navigator.getGamepads();
  for (let i = 0; i < pads.length; i++) {
    const gp = pads[i];
    if (!gp?.connected) continue;
    mapStick(i, gp);
    mapDirectionButtons(i, gp);
    mapActionButtons(i, gp);
  }
  rafId = requestAnimationFrame(poll);
}

function anyConnected(): boolean {
  return Array.from(navigator.getGamepads()).some((g) => g?.connected);
}

export function initGamepad(
  onConnect: PadListener,
  onDisconnect?: () => void
): void {
  onConnectCb = onConnect;
  onDisconnectCb = onDisconnect ?? null;

  window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    if (!rafId) rafId = requestAnimationFrame(poll);
    reloadBindings();
    notifyStatus();
    onConnectCb?.(e.gamepad.id, e.gamepad.index);
  });

  window.addEventListener('gamepaddisconnected', () => {
    notifyStatus();
    if (!anyConnected()) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      held.forEach((set, idx) => {
        set.forEach((key) => fireKey(key, 'keyup'));
        held.delete(idx);
      });
      onDisconnectCb?.();
    }
  });

  if (anyConnected() && !rafId) rafId = requestAnimationFrame(poll);
  notifyStatus();
}

export function stopGamepadPoll(): void {
  cancelAnimationFrame(rafId);
  rafId = 0;
}
