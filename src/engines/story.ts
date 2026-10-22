import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { loadState, saveState } from '../app/storage';

const TILE = 16;
const COLS = 20;
const ROWS = 15;

type Rect = [number, number, number, number]; // x,y,w,h
interface NPC {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
  lines: string[];
  trainer?: boolean;
  boss?: boolean;
  enemy?: EnemySpec;
}
interface Portal {
  x: number;
  y: number;
  toMap: number;
  toX: number;
  toY: number;
}
interface EnemySpec {
  name: string;
  color: string;
  level: number;
}
interface AreaDef {
  name: string;
  floor: string;
  walls: Rect[];
  water: Rect[];
  grass: Rect[];
  portals: Portal[];
  npcs: NPC[];
  encounters: EnemySpec[];
  encRate: number;
}

interface Move {
  name: string;
  pow: number;
}
interface Battler {
  name: string;
  color: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  moves: Move[];
}

interface SaveData {
  started: boolean;
  map: number;
  x: number;
  y: number;
  dir: number;
  level: number;
  xp: number;
  hp: number;
  potions: number;
  beaten: Record<string, boolean>;
  bossDown: boolean;
}

const PLAYER_MOVES: Move[] = [
  { name: 'TACKLE', pow: 5 },
  { name: 'FLAME', pow: 9 },
];

function makeAreas(): AreaDef[] {
  return [
    {
      name: 'NEON TOWN',
      floor: '#27273e',
      walls: [
        [3, 2, 2, 2], [3, 2, 1, 1], [10, 2, 2, 2], [3, 10, 2, 2], [13, 10, 2, 2],
        [16, 5, 1, 4],
      ],
      water: [[16, 11, 3, 2]],
      grass: [],
      portals: [{ x: 9, y: 13, toMap: 1, toX: 9, toY: 12 }],
      npcs: [
        {
          id: 'prof',
          x: 7,
          y: 6,
          color: '#ffe600',
          name: 'PROF. BIT',
          lines: [
            'PROF. BIT: Welcome to the NET, kid!',
            'Rogue data-beasts roam the wild grass.',
            'Take EMBER, your loyal pixel-mon!',
            'Head NORTH through the door to ROUTE 01.',
            'Beat the OMEGA-X virus in the CAVE to win!',
          ],
        },
        {
          id: 'townguy',
          x: 13,
          y: 12,
          color: '#00f5ff',
          name: 'KID',
          lines: ['KID: Tall grass = wild battles.', 'Press A to talk, fight, and pick options!'],
        },
      ],
      encounters: [],
      encRate: 0,
    },
    {
      name: 'ROUTE 01',
      floor: '#1c3a22',
      walls: [[5, 5, 3, 1], [12, 5, 3, 1], [9, 8, 2, 1]],
      water: [],
      grass: [[2, 2, 4, 2], [11, 2, 5, 2], [2, 7, 4, 2], [12, 7, 4, 2], [2, 11, 5, 2], [11, 11, 5, 2]],
      portals: [
        { x: 9, y: 1, toMap: 2, toX: 9, toY: 12 },
        { x: 9, y: 13, toMap: 0, toX: 9, toY: 12 },
      ],
      npcs: [
        {
          id: 'rival',
          x: 9,
          y: 6,
          color: '#ff6b35',
          name: 'RIVAL JAX',
          lines: ['RIVAL JAX: Think you can reach the CAVE?', 'Prove it! Battle me!'],
          trainer: true,
          enemy: { name: 'BYTEBUG', color: '#00f5ff', level: 4 },
        },
      ],
      encounters: [
        { name: 'GLITCHLET', color: '#39ff14', level: 2 },
        { name: 'BYTEBUG', color: '#00f5ff', level: 3 },
      ],
      encRate: 0.14,
    },
    {
      name: 'DATA CAVE',
      floor: '#241830',
      walls: [[2, 3, 4, 1], [14, 3, 4, 1], [7, 6, 6, 1], [2, 9, 3, 1], [15, 9, 3, 1]],
      water: [[8, 10, 4, 2]],
      grass: [[2, 4, 4, 2], [14, 4, 4, 2], [2, 11, 4, 2], [14, 11, 4, 2]],
      portals: [{ x: 9, y: 13, toMap: 1, toX: 9, toY: 2 }],
      npcs: [
        {
          id: 'boss',
          x: 9,
          y: 3,
          color: '#ff3b6b',
          name: 'OMEGA-X',
          lines: ['OMEGA-X: I am the virus that broke the NET.', 'You and EMBER end here!'],
          trainer: true,
          boss: true,
          enemy: { name: 'OMEGA-X', color: '#ff3b6b', level: 10 },
        },
      ],
      encounters: [
        { name: 'VOLTFANG', color: '#ffe600', level: 6 },
        { name: 'CRYOMAW', color: '#7ad1ff', level: 7 },
      ],
      encRate: 0.16,
    },
  ];
}

export class StoryEngine extends BaseEngine {
  private areas: AreaDef[] = makeAreas();
  private grid: number[][] = [];
  private map = 0;
  private px = 9;
  private py = 7;
  private dir = 2; // 0 up,1 right,2 down,3 left
  private moveCd = 0;
  private walkPhase = 0;

  private dialog: string[] = [];
  private dialogAfter: (() => void) | null = null;

  private mode: 'world' | 'battle' = 'world';
  private bPhase: 'menu' | 'fight' = 'menu';
  private menuIdx = 0;
  private player: Battler = this.freshPlayer(1);
  private foe: Battler | null = null;
  private foeFlash = 0;
  private plyFlash = 0;
  private battleCtx: { trainer: boolean; npcId?: string; boss?: boolean } = { trainer: false };

  private clvl = 1; // story (creature) level — distinct from base.level difficulty
  private xp = 0;
  private potions = 3;
  private beaten: Record<string, boolean> = {};
  private bossDown = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = COLS * TILE;
    this.height = ROWS * TILE;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  private freshPlayer(lvl: number): Battler {
    return {
      name: 'EMBER',
      color: '#ff6b35',
      level: lvl,
      maxHp: 20 + lvl * 6,
      hp: 20 + lvl * 6,
      atk: 4 + lvl * 2,
      moves: PLAYER_MOVES,
    };
  }

  protected init(): void {
    const s = loadState<SaveData>('story-rpg', {
      started: false,
      map: 0,
      x: 9,
      y: 7,
      dir: 2,
      level: 1,
      xp: 0,
      hp: 26,
      potions: 3,
      beaten: {},
      bossDown: false,
    });
    this.map = s.map;
    this.px = s.x;
    this.py = s.y;
    this.dir = s.dir;
    this.clvl = s.level;
    this.xp = s.xp;
    this.potions = s.potions;
    this.beaten = { ...s.beaten };
    this.bossDown = s.bossDown;
    this.player = this.freshPlayer(this.clvl);
    this.player.hp = Math.min(this.player.maxHp, s.hp || this.player.maxHp);
    this.mode = 'world';
    this.dialog = [];
    this.dialogAfter = null;
    this.foe = null;
    this.buildGrid();
    this.score = this.clvl;
    this.ctx.onScoreChange(this.score);
    if (!s.started) {
      this.queue(
        ['A new NET adventure begins!', 'Find PROF. BIT in NEON TOWN.'],
        () => {
          this.persist(true);
        }
      );
    }
  }

  private buildGrid(): void {
    const a = this.areas[this.map];
    this.grid = [];
    for (let y = 0; y < ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < COLS; x++) {
        this.grid[y][x] = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? 1 : 0;
      }
    }
    const fill = (r: Rect, v: number) => {
      for (let y = r[1]; y < r[1] + r[3]; y++)
        for (let x = r[0]; x < r[0] + r[2]; x++)
          if (y > 0 && x > 0 && y < ROWS - 1 && x < COLS - 1) this.grid[y][x] = v;
    };
    a.walls.forEach((r) => fill(r, 1));
    a.water.forEach((r) => fill(r, 3));
    a.grass.forEach((r) => fill(r, 2));
    a.portals.forEach((p) => (this.grid[p.y][p.x] = 4));
  }

  private persist(started = true): void {
    const data: SaveData = {
      started,
      map: this.map,
      x: this.px,
      y: this.py,
      dir: this.dir,
      level: this.clvl,
      xp: this.xp,
      hp: this.player.hp,
      potions: this.potions,
      beaten: this.beaten,
      bossDown: this.bossDown,
    };
    saveState('story-rpg', data);
  }

  private queue(lines: string[], after?: () => void): void {
    this.dialog = [...lines];
    this.dialogAfter = after ?? null;
  }

  // ---------- input ----------
  protected onKeyDown(key: string): void {
    if (key === 'enter' || key === ' ') {
      this.pressA();
      return;
    }
    if (this.dialog.length > 0) return;
    if (this.mode === 'battle' && this.dialog.length === 0) {
      if (key === 'arrowup' || key === 'w' || key === 'arrowleft' || key === 'a') this.menuIdx = (this.menuIdx + 3) % 4;
      else if (key === 'arrowdown' || key === 's' || key === 'arrowright' || key === 'd') this.menuIdx = (this.menuIdx + 1) % 4;
      else if (key === 'x' || key === 'escape') this.bPhase = 'menu';
    }
  }

  handlePointer(): void {
    this.pressA();
  }

  private pressA(): void {
    if (this.dialog.length > 0) {
      this.dialog.shift();
      this.tone(420, 0.03, 'square', 0.04);
      if (this.dialog.length === 0) {
        const fn = this.dialogAfter;
        this.dialogAfter = null;
        if (fn) fn();
      }
      return;
    }
    if (this.mode === 'world') {
      this.interact();
    } else {
      this.battleConfirm();
    }
  }

  private dirVec(d: number): [number, number] {
    return d === 0 ? [0, -1] : d === 1 ? [1, 0] : d === 2 ? [0, 1] : [-1, 0];
  }

  private interact(): void {
    const [dx, dy] = this.dirVec(this.dir);
    const tx = this.px + dx;
    const ty = this.py + dy;
    const npc = this.areas[this.map].npcs.find((n) => n.x === tx && n.y === ty);
    if (!npc) return;
    const isBeaten = npc.trainer && this.beaten[npc.id];
    if (npc.trainer && !isBeaten && npc.enemy) {
      this.queue([...npc.lines], () => this.startBattle(npc.enemy!, true, npc.id, npc.boss));
    } else {
      const lines = isBeaten ? [`${npc.name}: You're strong. The path is yours!`] : [...npc.lines];
      this.queue(lines);
    }
  }

  // ---------- battle ----------
  private startBattle(spec: EnemySpec, trainer: boolean, npcId?: string, boss?: boolean): void {
    this.foe = this.makeBattler(spec, !!boss);
    this.battleCtx = { trainer, npcId, boss };
    this.mode = 'battle';
    this.bPhase = 'menu';
    this.menuIdx = 0;
    const intro = trainer ? `${spec.name} challenges you!` : `A wild ${spec.name} appeared!`;
    this.queue([intro, `Go, ${this.player.name}!`]);
    this.tone(300, 0.12, 'square', 0.05);
  }

  private makeBattler(spec: EnemySpec, boss: boolean): Battler {
    const lvl = spec.level;
    return {
      name: spec.name,
      color: spec.color,
      level: lvl,
      maxHp: (boss ? 30 : 16) + lvl * 5,
      hp: (boss ? 30 : 16) + lvl * 5,
      atk: 3 + lvl * 2,
      moves: boss
        ? [{ name: 'CORRUPT', pow: 11 }, { name: 'SLAM', pow: 7 }]
        : [{ name: 'STRIKE', pow: 5 }, { name: 'BITE', pow: 7 }],
    };
  }

  private battleConfirm(): void {
    if (!this.foe) return;
    if (this.bPhase === 'menu') {
      // menu: 0 FIGHT, 1 ITEM, 2 RUN, 3 FIGHT(dup as bottom-right) -> map 4 cells
      if (this.menuIdx === 0) {
        this.bPhase = 'fight';
        this.menuIdx = 0;
      } else if (this.menuIdx === 1) {
        this.useItem();
      } else if (this.menuIdx === 2) {
        this.tryRun();
      } else {
        this.bPhase = 'fight';
        this.menuIdx = 0;
      }
    } else {
      if (this.menuIdx === 2) {
        this.bPhase = 'menu';
        this.menuIdx = 0;
        return;
      }
      if (this.menuIdx === 3) return;
      this.doPlayerMove(this.player.moves[this.menuIdx]);
    }
  }

  private dmg(att: Battler, move: Move, def: Battler): number {
    const base = move.pow + att.atk * 0.5;
    const variance = 0.85 + Math.random() * 0.3;
    return Math.max(1, Math.round(base * variance - def.level * 0.6));
  }

  private doPlayerMove(move: Move): void {
    if (!this.foe) return;
    const f = this.foe;
    const d = this.dmg(this.player, move, f);
    f.hp = Math.max(0, f.hp - d);
    this.foeFlash = 0.25;
    this.tone(640, 0.05);
    if (f.hp <= 0) {
      this.queue([`${this.player.name} used ${move.name}!`, `${f.name} fainted!`], () => this.winBattle());
    } else {
      const em = f.moves[Math.floor(Math.random() * f.moves.length)];
      const d2 = this.dmg(f, em, this.player);
      this.player.hp = Math.max(0, this.player.hp - d2);
      const after = this.player.hp <= 0 ? () => this.loseBattle() : () => (this.bPhase = 'menu');
      this.queue([`${this.player.name} used ${move.name}!`, `Foe ${f.name} used ${em.name}!`], () => {
        this.plyFlash = 0.25;
        after();
      });
    }
  }

  private useItem(): void {
    if (!this.foe) return;
    if (this.potions <= 0) {
      this.queue(['No POTIONS left!'], () => (this.bPhase = 'menu'));
      return;
    }
    this.potions--;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 22);
    this.tone(720, 0.1);
    const f = this.foe;
    const em = f.moves[Math.floor(Math.random() * f.moves.length)];
    const d2 = this.dmg(f, em, this.player);
    this.player.hp = Math.max(0, this.player.hp - d2);
    const after = this.player.hp <= 0 ? () => this.loseBattle() : () => (this.bPhase = 'menu');
    this.queue(['You used a POTION! +22 HP', `Foe ${f.name} used ${em.name}!`], after);
  }

  private tryRun(): void {
    if (this.battleCtx.trainer) {
      this.queue(["Can't flee a trainer battle!"], () => (this.bPhase = 'menu'));
      return;
    }
    if (Math.random() < 0.7) {
      this.queue(['Got away safely!'], () => this.endBattle());
    } else {
      const f = this.foe!;
      const em = f.moves[Math.floor(Math.random() * f.moves.length)];
      const d2 = this.dmg(f, em, this.player);
      this.player.hp = Math.max(0, this.player.hp - d2);
      const after = this.player.hp <= 0 ? () => this.loseBattle() : () => (this.bPhase = 'menu');
      this.queue(["Couldn't escape!", `Foe ${f.name} used ${em.name}!`], after);
    }
  }

  private winBattle(): void {
    const f = this.foe!;
    const gain = f.level * 2 + 4;
    this.xp += gain;
    const ups: string[] = [`You won! +${gain} XP`];
    while (this.xp >= this.clvl * 6) {
      this.xp -= this.clvl * 6;
      this.clvl++;
      const keepHp = this.player.hp;
      this.player = this.freshPlayer(this.clvl);
      this.player.hp = Math.min(this.player.maxHp, keepHp + 8);
      ups.push(`${this.player.name} grew to Lv ${this.clvl}!`);
      this.tone(900, 0.12);
    }
    this.score = this.clvl;
    this.ctx.onScoreChange(this.score);
    if (this.battleCtx.trainer && this.battleCtx.npcId) this.beaten[this.battleCtx.npcId] = true;
    if (this.battleCtx.boss) {
      this.bossDown = true;
      ups.push('OMEGA-X is purged!', 'You SAVED the NET!', 'THE END — you win! (keep playing)');
    }
    this.persist(true);
    this.queue(ups, () => this.endBattle());
  }

  private loseBattle(): void {
    this.queue([`${this.player.name} fainted!`, 'You rush back to NEON TOWN...'], () => {
      this.clvl = Math.max(1, this.clvl);
      this.player = this.freshPlayer(this.clvl);
      this.map = 0;
      this.px = 9;
      this.py = 7;
      this.dir = 2;
      this.buildGrid();
      this.persist(true);
      this.endBattle();
    });
  }

  private endBattle(): void {
    this.mode = 'world';
    this.foe = null;
  }

  // ---------- world update ----------
  protected update(dt: number): void {
    if (this.foeFlash > 0) this.foeFlash -= dt;
    if (this.plyFlash > 0) this.plyFlash -= dt;
    this.walkPhase += dt;
    if (this.mode !== 'world' || this.dialog.length > 0) return;
    if (this.moveCd > 0) {
      this.moveCd -= dt;
      return;
    }
    let nd = -1;
    if (this.key('arrowup') || this.key('w')) nd = 0;
    else if (this.key('arrowright') || this.key('d')) nd = 1;
    else if (this.key('arrowdown') || this.key('s')) nd = 2;
    else if (this.key('arrowleft') || this.key('a')) nd = 3;
    if (nd < 0) return;
    this.dir = nd;
    const [dx, dy] = this.dirVec(nd);
    const tx = this.px + dx;
    const ty = this.py + dy;
    this.moveCd = 0.14;
    if (!this.walkable(tx, ty)) return;
    this.px = tx;
    this.py = ty;
    this.tone(180, 0.015, 'square', 0.02);

    const tile = this.grid[ty][tx];
    if (tile === 4) {
      this.usePortal(tx, ty);
      return;
    }
    if (tile === 2) {
      const a = this.areas[this.map];
      if (a.encounters.length && Math.random() < a.encRate) {
        const spec = a.encounters[Math.floor(Math.random() * a.encounters.length)];
        const lvl = spec.level + Math.floor(Math.random() * 2);
        this.startBattle({ ...spec, level: lvl }, false);
      }
    }
    if (Math.random() < 0.05) this.persist(true);
  }

  private walkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    const t = this.grid[y][x];
    if (t === 1 || t === 3) return false;
    if (this.areas[this.map].npcs.some((n) => n.x === x && n.y === y)) return false;
    return true;
  }

  private usePortal(x: number, y: number): void {
    const p = this.areas[this.map].portals.find((q) => q.x === x && q.y === y);
    if (!p) return;
    this.map = p.toMap;
    this.px = p.toX;
    this.py = p.toY;
    this.buildGrid();
    this.moveCd = 0.2;
    this.tone(520, 0.08);
    this.persist(true);
  }

  // ---------- draw ----------
  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (this.mode === 'battle') this.drawBattle();
    else this.drawWorld();
    if (this.dialog.length > 0) this.drawDialog(this.dialog[0]);
  }

  private drawWorld(): void {
    const g = this.ctx2d;
    const a = this.areas[this.map];
    this.clear(a.floor);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const t = this.grid[y][x];
        const sx = x * TILE;
        const sy = y * TILE;
        if (t === 1) {
          g.fillStyle = '#14233f';
          g.fillRect(sx, sy, TILE, TILE);
          g.fillStyle = '#1c5c2c';
          g.fillRect(sx + 2, sy + 1, TILE - 4, TILE - 5);
          g.fillStyle = '#0e3a1a';
          g.fillRect(sx + 6, sy + TILE - 5, 4, 4);
        } else if (t === 2) {
          g.fillStyle = '#1f6b2f';
          g.fillRect(sx, sy, TILE, TILE);
          g.fillStyle = '#2f8a3c';
          for (let i = 0; i < 3; i++) g.fillRect(sx + 2 + i * 5, sy + 4 + (i % 2) * 4, 3, 6);
        } else if (t === 3) {
          g.fillStyle = '#15406b';
          g.fillRect(sx, sy, TILE, TILE);
          g.fillStyle = '#2a6aa0';
          g.fillRect(sx + 2, sy + 3 + (Math.floor(this.walkPhase * 3) % 2) * 3, TILE - 4, 2);
        } else if (t === 4) {
          g.fillStyle = '#caa46a';
          g.fillRect(sx, sy, TILE, TILE);
          g.fillStyle = '#7a5a2a';
          g.fillRect(sx + 3, sy + 2, TILE - 6, TILE - 4);
        }
      }

    for (const n of a.npcs) {
      const sx = n.x * TILE;
      const sy = n.y * TILE;
      const down = n.trainer && this.beaten[n.id];
      g.fillStyle = down ? '#555' : n.color;
      g.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      g.fillStyle = '#0a0a14';
      g.fillRect(sx + 4, sy + 6, 2, 2);
      g.fillRect(sx + TILE - 6, sy + 6, 2, 2);
      if (n.boss && !down) {
        g.fillStyle = '#ff3b6b';
        g.fillRect(sx + 4, sy - 2, TILE - 8, 2);
      }
    }

    // player
    const sx = this.px * TILE;
    const sy = this.py * TILE;
    g.fillStyle = '#00f5ff';
    g.fillRect(sx + 3, sy + 2, TILE - 6, TILE - 4);
    g.fillStyle = '#0a0a14';
    const [fx, fy] = this.dirVec(this.dir);
    g.fillRect(sx + 6 + fx * 2, sy + 6 + fy * 2, 3, 3);

    // HUD
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, this.width, 14);
    this.text(a.name, 4, 10, '#ffe600', 7);
    this.text(`Lv${this.clvl}  HP ${this.player.hp}/${this.player.maxHp}`, 150, 10, '#39ff14', 6);
    if (this.bossDown) this.text('NET SAVED', this.width - 70, 10, '#00f5ff', 6);
  }

  private drawBattle(): void {
    const g = this.ctx2d;
    const f = this.foe!;
    // bg
    const grd = g.createLinearGradient(0, 0, 0, this.height);
    grd.addColorStop(0, '#2a1840');
    grd.addColorStop(1, '#101225');
    g.fillStyle = grd;
    g.fillRect(0, 0, this.width, this.height);
    // platforms
    g.fillStyle = '#3a2a55';
    g.beginPath();
    g.ellipse(232, 92, 44, 14, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(86, 168, 52, 16, 0, 0, Math.PI * 2);
    g.fill();

    // foe creature
    if (this.foeFlash <= 0 || Math.floor(this.foeFlash * 20) % 2 === 0) this.drawCreature(232, 78, 18, f.color, false);
    // player creature (back)
    this.drawCreature(86, 150, 24, this.player.color, true);
    if (this.plyFlash > 0 && Math.floor(this.plyFlash * 20) % 2 === 0) {
      g.fillStyle = 'rgba(255,80,80,0.25)';
      g.fillRect(0, 0, this.width, this.height);
    }

    this.drawHpBox(132, 24, f.name, f.level, f.hp, f.maxHp);
    this.drawHpBox(14, 120, this.player.name, this.player.level, this.player.hp, this.player.maxHp);

    if (this.dialog.length === 0) {
      // action box
      g.fillStyle = '#0a0a14';
      g.fillRect(0, this.height - 56, this.width, 56);
      g.strokeStyle = '#00f5ff';
      g.lineWidth = 2;
      g.strokeRect(2, this.height - 54, this.width - 4, 52);
      if (this.bPhase === 'menu') {
        const labels = ['FIGHT', 'ITEM', 'RUN', 'FIGHT'];
        this.drawMenu(labels);
        this.text(`POTIONS x${this.potions}`, 200, this.height - 8, '#ffe600', 6);
      } else {
        this.drawMenu([this.player.moves[0].name, this.player.moves[1].name, 'BACK', '-']);
      }
    }
  }

  private drawMenu(labels: string[]): void {
    const cells = [
      [16, this.height - 42],
      [120, this.height - 42],
      [16, this.height - 22],
      [120, this.height - 22],
    ];
    for (let i = 0; i < 4; i++) {
      if (labels[i] === '-') continue;
      const sel = i === this.menuIdx;
      this.text(`${sel ? '\u25B6' : ' '}${labels[i]}`, cells[i][0], cells[i][1], sel ? '#ffe600' : '#cfd3e6', 7);
    }
  }

  private drawHpBox(x: number, y: number, name: string, lvl: number, hp: number, maxHp: number): void {
    const g = this.ctx2d;
    g.fillStyle = '#0a0a14';
    g.fillRect(x, y, 110, 26);
    g.strokeStyle = '#7a7aa0';
    g.lineWidth = 1;
    g.strokeRect(x, y, 110, 26);
    this.text(`${name} Lv${lvl}`, x + 4, y + 10, '#fff', 6);
    g.fillStyle = '#330000';
    g.fillRect(x + 4, y + 15, 100, 5);
    const frac = Math.max(0, hp / maxHp);
    g.fillStyle = frac > 0.5 ? '#39ff14' : frac > 0.2 ? '#ffe600' : '#ff3b6b';
    g.fillRect(x + 4, y + 15, 100 * frac, 5);
  }

  private drawCreature(cx: number, cy: number, r: number, color: string, back: boolean): void {
    const g = this.ctx2d;
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0a0a14';
    if (back) {
      g.fillRect(cx - r * 0.5, cy - r * 0.3, r, 3);
    } else {
      g.fillRect(cx - r * 0.5, cy - 3, 3, 3);
      g.fillRect(cx + r * 0.3, cy - 3, 3, 3);
      g.fillRect(cx - 3, cy + 4, 6, 2);
    }
    // ears
    g.fillStyle = color;
    g.fillRect(cx - r * 0.8, cy - r, 4, 6);
    g.fillRect(cx + r * 0.6, cy - r, 4, 6);
  }

  private drawDialog(line: string): void {
    const g = this.ctx2d;
    g.fillStyle = '#0a0a14';
    g.fillRect(6, this.height - 52, this.width - 12, 46);
    g.strokeStyle = '#00f5ff';
    g.lineWidth = 2;
    g.strokeRect(8, this.height - 50, this.width - 16, 42);
    this.wrap(line, 16, this.height - 36, this.width - 32, 10);
    if (Math.floor(this.walkPhase * 2) % 2 === 0) this.text('\u25BC', this.width - 24, this.height - 12, '#ffe600', 7);
  }

  private wrap(text: string, x: number, y: number, maxW: number, lh: number): void {
    const g = this.ctx2d;
    g.font = `7px "Press Start 2P", monospace`;
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > maxW && line) {
        g.fillStyle = '#fff';
        g.fillText(line, x, yy);
        line = w;
        yy += lh;
      } else line = test;
    }
    g.fillStyle = '#fff';
    g.fillText(line, x, yy);
  }

  private text(t: string, x: number, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.fillStyle = color;
    g.fillText(t, x, y);
  }
}
