import {
  type BindingAction,
  BINDING_LABELS,
  formatKeyLabel,
  keyFromEvent,
  loadBindings,
  resetBindings,
  saveBindings,
} from '../app/controllerBindings';
import {
  getPadStatus,
  reloadBindings,
  requestPadTest,
  subscribePadStatus,
} from '../app/gamepad';
import { showControllerConnectAnimation } from './controllerAnimation';

const ACTIONS: BindingAction[] = [
  'up', 'down', 'left', 'right', 'action', 'confirm', 'alt1', 'alt2', 'accelerate', 'brake',
];

let overlayEl: HTMLElement | null = null;
let bindings = loadBindings();
let listenAction: BindingAction | null = null;
let listenKind: 'key' | 'button' | null = null;
let unsubStatus: (() => void) | null = null;
let panelCleanup: (() => void) | null = null;

function closePanel(): void {
  listenAction = null;
  listenKind = null;
  panelCleanup?.();
  panelCleanup = null;
  unsubStatus?.();
  unsubStatus = null;
  overlayEl?.remove();
  overlayEl = null;
}

function renderStatus(host: HTMLElement): void {
  const s = getPadStatus();
  host.innerHTML = s.connected
    ? `<p class="pad-status-on">${s.count} controller${s.count > 1 ? 's' : ''} connected</p><ul class="pad-status-list">${s.names.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`
    : '<p class="pad-status-off">No controller detected. Plug in USB / Bluetooth pad and press any button.</p>';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bindRow(
  table: HTMLElement,
  action: BindingAction,
  onChange: () => void
): void {
  const tr = document.createElement('tr');
  const label = document.createElement('td');
  label.textContent = BINDING_LABELS[action];
  label.className = 'bind-label';

  const keyTd = document.createElement('td');
  const keyBtn = document.createElement('button');
  keyBtn.type = 'button';
  keyBtn.className = 'btn-retro bind-key-btn';
  const refreshKey = () => {
    keyBtn.textContent = formatKeyLabel(bindings.keys[action]);
    keyBtn.classList.toggle('bind-listening', listenAction === action && listenKind === 'key');
  };
  refreshKey();
  keyBtn.onclick = () => {
    listenAction = action;
    listenKind = 'key';
    onChange();
  };
  keyTd.appendChild(keyBtn);

  const padTd = document.createElement('td');
  const padBtn = document.createElement('button');
  padBtn.type = 'button';
  padBtn.className = 'btn-retro bind-pad-btn';
  const refreshPad = () => {
    const idx = bindings.buttons[action];
    padBtn.textContent = idx < 0 ? '—' : `BTN ${idx}`;
    padBtn.classList.toggle('bind-listening', listenAction === action && listenKind === 'button');
  };
  refreshPad();
  padBtn.onclick = () => {
    listenAction = action;
    listenKind = 'button';
    onChange();
  };
  padTd.appendChild(padBtn);

  tr.append(label, keyTd, padTd);
  table.appendChild(tr);

  tr.dataset.action = action;
}

export function openControllerPanel(): void {
  closePanel();
  bindings = loadBindings();

  overlayEl = document.createElement('div');
  overlayEl.className = 'controller-panel-overlay';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-label', 'Controller settings');

  const panel = document.createElement('div');
  panel.className = 'controller-panel';

  const title = document.createElement('h2');
  title.textContent = 'CONTROLLER & KEYS';

  const statusHost = document.createElement('div');
  statusHost.className = 'pad-status-block';
  renderStatus(statusHost);

  const testBtn = document.createElement('button');
  testBtn.type = 'button';
  testBtn.className = 'btn-retro';
  testBtn.textContent = 'TEST CONNECTION';
  testBtn.onclick = () => {
    const s = getPadStatus();
    if (s.connected && s.names[0]) showControllerConnectAnimation(s.names[0]);
    else requestPadTest();
    renderStatus(statusHost);
  };

  const stickRow = document.createElement('label');
  stickRow.className = 'pad-stick-toggle';
  const stickCb = document.createElement('input');
  stickCb.type = 'checkbox';
  stickCb.checked = bindings.useStick;
  stickCb.onchange = () => {
    bindings.useStick = stickCb.checked;
    saveBindings(bindings);
    reloadBindings();
  };
  stickRow.append(stickCb, document.createTextNode(' Left stick = move / steer (all games)'));

  const deadLabel = document.createElement('label');
  deadLabel.className = 'pad-deadzone';
  deadLabel.textContent = 'Stick dead zone: ';
  const deadRange = document.createElement('input');
  deadRange.type = 'range';
  deadRange.min = '0.15';
  deadRange.max = '0.75';
  deadRange.step = '0.01';
  deadRange.value = String(bindings.deadzone);
  const deadVal = document.createElement('span');
  deadVal.textContent = bindings.deadzone.toFixed(2);
  deadRange.oninput = () => {
    bindings.deadzone = parseFloat(deadRange.value);
    deadVal.textContent = bindings.deadzone.toFixed(2);
    saveBindings(bindings);
    reloadBindings();
  };
  deadLabel.append(deadRange, deadVal);

  const hint = document.createElement('p');
  hint.className = 'bind-hint';
  hint.textContent =
    'Works in Tetris, Chess, Pac-Man, racers (R1 gas), puzzles & more. Rebind below:';

  const table = document.createElement('table');
  table.className = 'bind-table';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Action</th><th>Keyboard</th><th>Gamepad</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  const refreshListenUi = () => {
    hint.textContent = listenAction
      ? `Listening for ${listenKind === 'key' ? 'keyboard' : 'gamepad button'} — ${BINDING_LABELS[listenAction]}…`
      : 'Click a key or BTN cell, then press keyboard or controller button to rebind.';
    tbody.querySelectorAll('.bind-listening').forEach((el) => el.classList.remove('bind-listening'));
    if (listenAction && listenKind) {
      const row = tbody.querySelector(`tr[data-action="${listenAction}"]`);
      row?.querySelector(listenKind === 'key' ? '.bind-key-btn' : '.bind-pad-btn')?.classList.add('bind-listening');
    }
  };

  for (const a of ACTIONS) bindRow(tbody, a, refreshListenUi);
  table.appendChild(tbody);

  const actions = document.createElement('div');
  actions.className = 'controller-panel-actions';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn-retro';
  resetBtn.textContent = 'RESET DEFAULTS';
  resetBtn.onclick = () => {
    bindings = resetBindings();
    reloadBindings();
    stickCb.checked = bindings.useStick;
    deadRange.value = String(bindings.deadzone);
    deadVal.textContent = bindings.deadzone.toFixed(2);
    tbody.innerHTML = '';
    for (const a of ACTIONS) bindRow(tbody, a, refreshListenUi);
    refreshListenUi();
  };

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-retro';
  closeBtn.textContent = 'CLOSE';
  closeBtn.onclick = () => closePanel();

  actions.append(resetBtn, closeBtn);

  panel.append(title, statusHost, testBtn, stickRow, deadLabel, hint, table, actions);
  overlayEl.appendChild(panel);
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closePanel();
  });

  unsubStatus = subscribePadStatus(() => renderStatus(statusHost));

  const onKey = (e: KeyboardEvent) => {
    if (!listenAction || listenKind !== 'key') return;
    e.preventDefault();
    e.stopPropagation();
    bindings.keys[listenAction] = keyFromEvent(e);
    saveBindings(bindings);
    reloadBindings();
    listenAction = null;
    listenKind = null;
    tbody.innerHTML = '';
    for (const a of ACTIONS) bindRow(tbody, a, refreshListenUi);
    refreshListenUi();
  };

  const onPadCapture = (): void => {
    if (!listenAction || listenKind !== 'button') return;
    const pads = navigator.getGamepads();
    for (const gp of pads) {
      if (!gp?.connected) continue;
      for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i]?.pressed) {
          bindings.buttons[listenAction!] = i;
          saveBindings(bindings);
          reloadBindings();
          listenAction = null;
          listenKind = null;
          tbody.innerHTML = '';
          for (const a of ACTIONS) bindRow(tbody, a, refreshListenUi);
          refreshListenUi();
          return;
        }
      }
    }
  };

  window.addEventListener('keydown', onKey, true);
  const capRaf = () => {
    onPadCapture();
    if (overlayEl) requestAnimationFrame(capRaf);
  };
  requestAnimationFrame(capRaf);

  panelCleanup = () => window.removeEventListener('keydown', onKey, true);
}

export function updatePadHeaderButton(btn: HTMLButtonElement): void {
  const s = getPadStatus();
  btn.textContent = s.connected ? `PAD \u25CF ${s.count}` : 'PAD';
  btn.classList.toggle('btn-pad-on', s.connected);
  btn.title = s.connected ? s.names.join(', ') : 'Controller & key bindings';
}
