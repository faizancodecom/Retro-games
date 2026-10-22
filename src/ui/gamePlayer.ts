import type { GameDefinition } from '../types';
import type { GameEngine } from '../types';
import { loadEngine } from '../engines/loader';
import { navigateHome } from '../app/router';
import { getHighScore, setHighScore, isMuted, setMuted, MAX_LEVEL } from '../app/storage';
import {
  getPlayLevel,
  getUnlockedLevel,
  setPlayLevel,
  completeLevel,
} from '../app/levelProgress';
import { getLevelConfig } from '../engines/levelConfig';

/** All games use 20-level progression (unlock on clear). */
const SUPPORTS_LEVELS = true;
const HELP: Record<string, string> = {
  flappy: 'SPACE / TAP — flap. Pass pipes to reach the level goal. Beat the goal to unlock the next level.',
  maze: 'ARROWS — move. Eat dots. Power pellets let you eat ghosts.',
  pacman: 'ARROWS / WASD — move. Eat all dots. Grab power pellets to chomp ghosts. Avoid them otherwise!',
  wanted: 'UP / R1 (RB) — accelerate, DOWN / L1 — brake, stick or D-pad — steer. Gamepad supported! Ram police at speed to wreck them.',
  tictactoe: 'D-pad cursor + A to place. M — CPU / 2-player. R — reset.',
  blackjack: 'D-pad UP/DOWN — bet. A — deal / stand. X (B) — hit. Y — stand. Touch buttons also work.',
  uno: 'Menu: D-pad — 2/3/4 players. A — confirm. D — draw pile. Touch cards when glowing.',
  racecareer: '20 career races! R1 gas, L1 brake, stick steer. Pick a track (arrows + SPACE). Win 1st to unlock next. X = upgrade shop.',
  chess: 'D-pad — green cursor. A / SPACE — select & move. Touch or mouse also works. M — CPU / 2-player. R — reset.',
  gallery: 'TAP / CLICK the flying targets to shoot them. R — reload (auto-reloads when empty). Build combos, don\'t let 3 escape!',
  zombie: 'ARROWS / WASD or D-pad — move. Hold SPACE / FIRE to shoot the nearest zombie. Keys 1/2/3 or tap a slot to switch weapon. Grab ammo & health, survive the waves!',
  asteroids: 'LEFT/RIGHT — rotate, UP — thrust, SPACE / FIRE — shoot. Big rocks split into smaller ones. Screen wraps around!',
  frogger: 'ARROWS / D-pad — hop. Cross the road dodging cars, ride the logs over the river, and reach a green slot up top.',
  whack: 'D-pad — aim at holes. A / SPACE — whack. Chain moles for combo. Avoid bombs!',
  story: 'ARROWS / D-pad — walk. SPACE / TAP / A — talk to NPCs & advance dialog. In battle: D-pad to pick FIGHT/ITEM/RUN & a move, then A to confirm. Walk in tall grass for wild battles. Beat OMEGA-X to win. Progress saves automatically!',
  pixelminer: 'ARROWS / D-pad — dig & move in any direction. Collect gold and gems for points, dig deeper for bonuses. Watch your ENERGY and avoid the lava!',
  dungeon: 'ARROWS / D-pad — move. Grab the glowing KEY, then reach the door to clear the level. Avoid the red guards — three hits and you\'re caught!',
  defender: 'ARROWS / D-pad — fly your ship. SPACE / FIRE — shoot. Destroy the descending alien craft, dodge their bullets and survive the waves.',
  archer: 'UP/DOWN — aim angle. SPACE / TAP / FIRE — loose an arrow (the power meter rises & falls — time it!). Stop enemies before they reach your castle.',
  toprace: 'UP / R1 — gas, DOWN / L1 — brake, stick or arrows — steer. Beat the CPU over 3 laps.',
  war: 'ARROWS / D-pad — fly your plane. SPACE / FIRE — launch missiles at ships. Dodge enemy missiles! Destroy the whole fleet to clear the level.',
  snake: 'ARROWS — steer. Eat food. Avoid walls & tail.',
  tetris: 'D-pad / stick — move & rotate. DOWN or R1 (RB) — fast drop. Gamepad works!',
  breakout: 'ARROWS — move paddle. Break all bricks.',
  shooter: 'ARROWS — move. SPACE — shoot. Clear aliens.',
  runner: 'SPACE / TAP — jump. Tap again in mid-air for a DOUBLE JUMP. Avoid obstacles.',
  pong: 'UP/DOWN — move paddle. Score vs CPU.',
  puzzle: '2048: D-pad slide. Memory / 15 / Connect: D-pad cursor + A to tap.',
  platformer: 'ARROWS — move. SPACE — jump. Collect coins.',
  card: 'SPACE — deal/action. Blackjack: H hit, S stand.',
  racing: 'LEFT/RIGHT or stick — change lanes. R1 speeds up. Dodge traffic.',
};

type PadKind = 'dpad' | 'horizontal' | 'vertical' | 'none';
const TOUCH: Record<string, { pad: PadKind; action?: { label: string; key: string } }> = {
  flappy: { pad: 'none', action: { label: 'FLAP', key: ' ' } },
  runner: { pad: 'none', action: { label: 'JUMP', key: ' ' } },
  platformer: { pad: 'horizontal', action: { label: 'JUMP', key: ' ' } },
  shooter: { pad: 'horizontal', action: { label: 'FIRE', key: ' ' } },
  breakout: { pad: 'horizontal' },
  racing: { pad: 'horizontal' },
  pong: { pad: 'vertical' },
  snake: { pad: 'dpad' },
  pacman: { pad: 'dpad' },
  maze: { pad: 'dpad' },
  wanted: { pad: 'dpad' },
  tetris: { pad: 'dpad', action: { label: 'DROP', key: ' ' } },
  puzzle: { pad: 'dpad' },
  racecareer: { pad: 'dpad', action: { label: 'OK', key: ' ' } },
  zombie: { pad: 'dpad', action: { label: 'FIRE', key: ' ' } },
  asteroids: { pad: 'dpad', action: { label: 'FIRE', key: ' ' } },
  frogger: { pad: 'dpad' },
  card: { pad: 'none', action: { label: 'DEAL', key: ' ' } },
  story: { pad: 'dpad', action: { label: 'A', key: ' ' } },
  pixelminer: { pad: 'dpad' },
  dungeon: { pad: 'dpad' },
  defender: { pad: 'dpad', action: { label: 'FIRE', key: ' ' } },
  archer: { pad: 'vertical', action: { label: 'FIRE', key: ' ' } },
  toprace: { pad: 'dpad' },
  war: { pad: 'dpad', action: { label: 'FIRE', key: ' ' } },
  gallery: { pad: 'none', action: { label: 'FIRE', key: ' ' } },
  whack: { pad: 'dpad', action: { label: 'WHACK', key: ' ' } },
  chess: { pad: 'dpad', action: { label: 'OK', key: ' ' } },
  tictactoe: { pad: 'dpad', action: { label: 'OK', key: ' ' } },
  blackjack: { pad: 'dpad', action: { label: 'OK', key: ' ' } },
  uno: { pad: 'dpad', action: { label: 'A', key: ' ' } },
};

function fireKey(key: string, type: 'keydown' | 'keyup'): void {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

function makePadBtn(label: string, key: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'tc-btn';
  b.textContent = label;
  b.setAttribute('aria-label', key);
  let held = false;
  const press = (e: Event) => {
    e.preventDefault();
    if (held) return;
    held = true;
    fireKey(key, 'keydown');
    b.classList.add('tc-on');
  };
  const release = () => {
    if (!held) return;
    held = false;
    fireKey(key, 'keyup');
    b.classList.remove('tc-on');
  };
  b.addEventListener('pointerdown', press);
  b.addEventListener('pointerup', release);
  b.addEventListener('pointerleave', release);
  b.addEventListener('pointercancel', release);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return b;
}

function buildTouchControls(engineType: string, configId: string): HTMLElement | null {
  let cfg: { pad: PadKind; action?: { label: string; key: string } } | undefined = TOUCH[engineType];
  if (engineType === 'puzzle') {
    // only 2048-style puzzles need a D-pad; the rest are tap-only
    const is2048 = configId === 'puzzle-2' || configId === 'puzzle-8';
    cfg = is2048 ? { pad: 'dpad' } : undefined;
  }
  if (!cfg) return null;
  const wrap = document.createElement('div');
  wrap.className = 'touch-controls';

  if (cfg.pad !== 'none') {
    const pad = document.createElement('div');
    pad.className = 'tc-pad';
    if (cfg.pad === 'dpad') {
      pad.classList.add('tc-dpad');
      const up = makePadBtn('\u25B2', 'ArrowUp');
      up.classList.add('tc-up');
      const left = makePadBtn('\u25C0', 'ArrowLeft');
      left.classList.add('tc-left');
      const right = makePadBtn('\u25B6', 'ArrowRight');
      right.classList.add('tc-right');
      const down = makePadBtn('\u25BC', 'ArrowDown');
      down.classList.add('tc-down');
      pad.append(up, left, right, down);
    } else if (cfg.pad === 'horizontal') {
      pad.classList.add('tc-row');
      pad.append(makePadBtn('\u25C0', 'ArrowLeft'), makePadBtn('\u25B6', 'ArrowRight'));
    } else {
      pad.classList.add('tc-row');
      pad.append(makePadBtn('\u25B2', 'ArrowUp'), makePadBtn('\u25BC', 'ArrowDown'));
    }
    wrap.appendChild(pad);
  }

  if (cfg.action) {
    const actions = document.createElement('div');
    actions.className = 'tc-actions';
    const a = makePadBtn(cfg.action.label, cfg.action.key);
    a.classList.add('tc-action');
    actions.appendChild(a);
    wrap.appendChild(actions);
  }
  return wrap;
}

let activeEngine: GameEngine | null = null;

export function stopActiveEngine(): void {
  activeEngine?.stop();
  activeEngine = null;
}

export async function renderGamePlayer(container: HTMLElement, game: GameDefinition): Promise<void> {
  stopActiveEngine();
  container.innerHTML = '';
  container.className = 'player-view';

  const header = document.createElement('div');
  header.className = 'player-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-retro';
  backBtn.textContent = '◀ BACK';
  backBtn.onclick = () => navigateHome();

  const title = document.createElement('h2');
  title.className = 'player-title';
  title.textContent = game.title;

  const stats = document.createElement('div');
  stats.className = 'player-stats';
  const hs = getHighScore(game.slug);
  stats.innerHTML = `SCORE: <span id="live-score">0</span> &nbsp; HI: <span id="hi-score">${hs}</span>`;

  header.append(backBtn, title, stats);

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas');
  canvasWrap.appendChild(canvas);

  const controls = document.createElement('div');
  controls.className = 'player-controls';

  const restartBtn = document.createElement('button');
  restartBtn.className = 'btn-retro';
  restartBtn.textContent = 'RESTART';

  let muted = isMuted();
  const muteBtn = document.createElement('button');
  muteBtn.className = 'btn-retro';
  muteBtn.textContent = muted ? 'MUTE ON' : 'SOUND';
  muteBtn.onclick = () => {
    muted = !muted;
    setMuted(muted);
    activeEngine?.setMuted(muted);
    muteBtn.textContent = muted ? 'MUTE ON' : 'SOUND';
  };

  const fsBtn = document.createElement('button');
  fsBtn.className = 'btn-retro';
  fsBtn.textContent = 'FULLSCREEN';
  const fsTarget = container as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  fsBtn.onclick = () => {
    const doc = document as Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element };
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      (fsTarget.requestFullscreen?.() ?? fsTarget.webkitRequestFullscreen?.());
    } else {
      (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    }
  };
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? 'EXIT FULL' : 'FULLSCREEN';
  });

  controls.append(restartBtn, muteBtn, fsBtn);

  const supportsLevels = SUPPORTS_LEVELS;
  let playLevel = supportsLevels ? getPlayLevel(game.slug) : 1;
  let unlockedLevel = supportsLevels ? getUnlockedLevel(game.slug) : 1;
  if (supportsLevels) {
    const lvWrap = document.createElement('div');
    lvWrap.className = 'level-control';
    const dec = document.createElement('button');
    dec.className = 'btn-retro';
    dec.textContent = '\u25C0';
    const lbl = document.createElement('span');
    lbl.className = 'level-label';
    const refreshLbl = () => {
      unlockedLevel = getUnlockedLevel(game.slug);
      playLevel = getPlayLevel(game.slug);
      lbl.textContent =
        playLevel >= unlockedLevel && unlockedLevel < MAX_LEVEL
          ? `LV ${playLevel}/20 \u2713`
          : `LV ${playLevel}/20 (${unlockedLevel})`;
    };
    refreshLbl();
    const inc = document.createElement('button');
    inc.className = 'btn-retro';
    inc.textContent = '\u25B6';
    const change = (d: number) => {
      const nl = playLevel + d;
      if (nl < 1 || nl > unlockedLevel) return;
      setPlayLevel(game.slug, nl);
      void renderGamePlayer(container, game);
    };
    dec.onclick = () => change(-1);
    inc.onclick = () => change(1);
    dec.disabled = playLevel <= 1;
    inc.disabled = playLevel >= unlockedLevel;
    lvWrap.append(dec, lbl, inc);
    controls.appendChild(lvWrap);
  }
  const level = playLevel;

  const help = document.createElement('div');
  help.className = 'help-panel';
  const lc = getLevelConfig(game.engine, playLevel);
  const levelHint = supportsLevels
    ? ` Levels: L${playLevel} <strong>${lc.title}</strong> — ${lc.subtitle}. Beat goal <strong>${lc.goalScore}</strong> to unlock next. Gamepad supported!`
    : '';
  help.innerHTML = `<strong>Controls:</strong> ${HELP[game.engine] ?? 'Keyboard + touch supported.'}${levelHint}`;

  const touch = buildTouchControls(game.engine, game.configId);

  container.append(header, canvasWrap, controls);
  if (touch) container.appendChild(touch);
  container.appendChild(help);

  const liveScore = container.querySelector('#live-score')!;
  const hiScoreEl = container.querySelector('#hi-score')!;

  const engine = await loadEngine(game.engine, {
    canvas,
    configId: game.configId,
    slug: game.slug,
    engineType: game.engine,
    level,
    onScoreChange: (s) => {
      liveScore.textContent = String(s);
    },
    onGameOver: (s) => {
      setHighScore(game.slug, s);
      const newHi = getHighScore(game.slug);
      hiScoreEl.textContent = String(newHi);
    },
    onLevelComplete: supportsLevels
      ? (cleared) => {
          const next = completeLevel(game.slug, cleared);
          if (cleared < MAX_LEVEL && next > cleared) setPlayLevel(game.slug, cleared + 1);
          const toast = document.createElement('div');
          toast.className = 'level-toast';
          toast.textContent =
            cleared >= MAX_LEVEL
              ? `LEVEL ${cleared} MASTERED!`
              : `LEVEL ${cleared} CLEAR! LV ${cleared + 1} UNLOCKED`;
          container.appendChild(toast);
          setTimeout(() => {
            toast.remove();
            void renderGamePlayer(container, game);
          }, 2600);
        }
      : undefined,
  });

  activeEngine = engine;
  engine.setMuted(muted);

  restartBtn.onclick = () => {
    engine.restart();
    liveScore.textContent = '0';
  };

  if (engine.handlePointer) {
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      engine.handlePointer!((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    });
  }

  engine.start();
}
