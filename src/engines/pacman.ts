import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getHighScore } from '../app/storage';

interface Vec {
  x: number;
  y: number;
}

interface Ghost {
  x: number;
  y: number;
  dir: Vec;
  homeX: number;
  homeY: number;
  cornerX: number;
  cornerY: number;
  color: string;
  kind: 'blinky' | 'pinky' | 'inky' | 'clyde';
  frightened: boolean;
  eaten: boolean;
}

const COLS = 18;
const ROWS = 21;
const TILE = 11;
const HUD = 16;

const UP: Vec = { x: 0, y: -1 };
const DOWN: Vec = { x: 0, y: 1 };
const LEFT: Vec = { x: -1, y: 0 };
const RIGHT: Vec = { x: 1, y: 0 };
const STOP: Vec = { x: 0, y: 0 };

type State = 'ready' | 'playing' | 'dying' | 'dead';

export class PacmanEngine extends BaseEngine {
  private walls: boolean[][] = [];
  private pellets: boolean[][] = [];
  private power: boolean[][] = [];
  private pelletsLeft = 0;

  private pac!: { x: number; y: number; dir: Vec; next: Vec };
  private ghosts: Ghost[] = [];

  private state: State = 'ready';
  private lives = 3;
  private level = 1;
  private mouth = 0;
  private frightTimer = 0;
  private modeTimer = 0;
  private chasePhase = false;
  private eatCombo = 0;
  private readyTimer = 0;
  private dyingTimer = 0;
  private blink = 0;
  private waka = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = COLS * TILE;
    this.height = ROWS * TILE + HUD;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    this.buildMaze();
    this.lives = 3;
    this.level = this.diffLevel;
    this.score = 0;
    this.levelCleared = false;
    this.resetActors();
    this.state = 'ready';
    this.readyTimer = 0;
  }

  private buildMaze(): void {
    this.walls = [];
    this.pellets = [];
    this.power = [];
    for (let r = 0; r < ROWS; r++) {
      this.walls[r] = [];
      this.pellets[r] = [];
      this.power[r] = [];
      for (let c = 0; c < COLS; c++) {
        const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
        // Corridors run along rows/cols where index % 3 === 1, leaving 2x2 wall blocks.
        const corridor = r % 3 === 1 || c % 3 === 1;
        const wall = border || !corridor;
        this.walls[r][c] = wall;
        this.pellets[r][c] = !wall;
        this.power[r][c] = false;
      }
    }
    // power pellets near the four corners
    const corners: Vec[] = [
      { x: 1, y: 1 },
      { x: COLS - 2, y: 1 },
      { x: 1, y: ROWS - 2 },
      { x: COLS - 2, y: ROWS - 2 },
    ];
    for (const p of corners)
      if (!this.walls[p.y][p.x]) {
        this.power[p.y][p.x] = true;
        this.pellets[p.y][p.x] = false;
      }

    // clear pellets where actors start
    const clears: Vec[] = [
      { x: 7, y: 19 },
      { x: 7, y: 7 },
      { x: 10, y: 7 },
      { x: 7, y: 10 },
      { x: 10, y: 10 },
    ];
    for (const p of clears) this.pellets[p.y][p.x] = false;

    // keep only pellets reachable from pac start (robust against any pocket)
    this.floodReachable(7, 19);

    this.pelletsLeft = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (this.pellets[r][c] || this.power[r][c]) this.pelletsLeft++;
  }

  private floodReachable(sx: number, sy: number): void {
    const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const stack: Vec[] = [{ x: sx, y: sy }];
    seen[sy][sx] = true;
    while (stack.length) {
      const { x, y } = stack.pop()!;
      for (const d of [UP, DOWN, LEFT, RIGHT]) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (seen[ny][nx] || this.walls[ny][nx]) continue;
        seen[ny][nx] = true;
        stack.push({ x: nx, y: ny });
      }
    }
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (!seen[r][c]) {
          this.pellets[r][c] = false;
          this.power[r][c] = false;
        }
  }

  private resetActors(): void {
    this.pac = { x: 7, y: 19, dir: { ...LEFT }, next: { ...LEFT } };
    const defs: Omit<Ghost, 'x' | 'y' | 'dir' | 'frightened' | 'eaten'>[] = [
      { kind: 'blinky', color: '#ff0000', homeX: 7, homeY: 7, cornerX: COLS - 2, cornerY: 1 },
      { kind: 'pinky', color: '#ffb8ff', homeX: 10, homeY: 7, cornerX: 1, cornerY: 1 },
      { kind: 'inky', color: '#00ffff', homeX: 7, homeY: 10, cornerX: COLS - 2, cornerY: ROWS - 2 },
      { kind: 'clyde', color: '#ffb852', homeX: 10, homeY: 10, cornerX: 1, cornerY: ROWS - 2 },
    ];
    this.ghosts = defs.map((d) => ({
      ...d,
      x: d.homeX,
      y: d.homeY,
      dir: { ...UP },
      frightened: false,
      eaten: false,
    }));
    this.frightTimer = 0;
    this.modeTimer = 0;
    this.chasePhase = false;
  }

  private isWall(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    return this.walls[y][x];
  }

  protected onKeyDown(key: string): void {
    if (this.state === 'dead') {
      this.restart();
      return;
    }
    if (this.state === 'ready') this.state = 'playing';
    if (key === 'arrowup' || key === 'w') this.pac.next = { ...UP };
    if (key === 'arrowdown' || key === 's') this.pac.next = { ...DOWN };
    if (key === 'arrowleft' || key === 'a') this.pac.next = { ...LEFT };
    if (key === 'arrowright' || key === 'd') this.pac.next = { ...RIGHT };
  }

  protected onTap(): void {
    if (this.state === 'dead') this.restart();
    else if (this.state === 'ready') this.state = 'playing';
  }

  protected update(dt: number): void {
    this.blink += dt;
    this.mouth = (this.mouth + dt * 10) % (Math.PI * 2);

    if (this.state === 'ready') {
      this.readyTimer += dt;
      this.pollDirKeys();
      return;
    }
    if (this.state === 'dead') return;
    if (this.state === 'dying') {
      this.dyingTimer += dt;
      if (this.dyingTimer > 1.2) {
        this.lives--;
        if (this.lives <= 0) {
          this.state = 'dead';
          this.gameOver();
        } else {
          this.resetActors();
          this.state = 'ready';
          this.readyTimer = 0;
        }
      }
      return;
    }

    this.pollDirKeys();

    // global scatter/chase schedule
    this.modeTimer += dt;
    const phaseLen = this.chasePhase ? 18 : 6;
    if (this.modeTimer > phaseLen) {
      this.modeTimer = 0;
      this.chasePhase = !this.chasePhase;
    }
    if (this.frightTimer > 0) {
      this.frightTimer -= dt;
      if (this.frightTimer <= 0) {
        this.ghosts.forEach((g) => (g.frightened = false));
        this.eatCombo = 0;
      }
    }

    const pacSpeed = 6 + (this.level - 1) * 0.4;
    this.moveActor(this.pac, this.pac.dir, this.pac.next, pacSpeed * dt, true);

    // eat
    const px = Math.round(this.pac.x);
    const py = Math.round(this.pac.y);
    if (Math.abs(this.pac.x - px) < 0.2 && Math.abs(this.pac.y - py) < 0.2) {
      if (this.pellets[py]?.[px]) {
        this.pellets[py][px] = false;
        this.pelletsLeft--;
        this.addScore(10);
        this.waka = !this.waka;
        this.tone(this.waka ? 360 : 240, 0.05, 'square', 0.05);
      } else if (this.power[py]?.[px]) {
        this.power[py][px] = false;
        this.pelletsLeft--;
        this.addScore(50);
        this.frightTimer = Math.max(3, 7 - this.level * 0.5);
        this.eatCombo = 0;
        this.ghosts.forEach((g) => {
          if (!g.eaten) {
            g.frightened = true;
            g.dir = { x: -g.dir.x, y: -g.dir.y };
          }
        });
        this.playBeep(180, 0.12);
      }
    }

    // ghosts
    const baseGhost = 5.4 + (this.level - 1) * 0.3;
    for (const g of this.ghosts) {
      let speed = baseGhost;
      if (g.frightened) speed = baseGhost * 0.55;
      if (g.eaten) speed = baseGhost * 1.6;
      this.moveGhost(g, speed * dt);
    }

    // collisions
    for (const g of this.ghosts) {
      const d = Math.hypot(g.x - this.pac.x, g.y - this.pac.y);
      if (d < 0.6) {
        if (g.eaten) continue;
        if (g.frightened) {
          g.eaten = true;
          g.frightened = false;
          this.eatCombo++;
          this.addScore(200 * this.eatCombo);
          this.playBeep(1000, 0.06);
        } else {
          this.state = 'dying';
          this.dyingTimer = 0;
          this.playBeep(120, 0.4);
          return;
        }
      }
      if (g.eaten && Math.hypot(g.x - g.homeX, g.y - g.homeY) < 0.4) {
        g.eaten = false;
      }
    }

    if (this.pelletsLeft <= 0) {
      this.addScore(100);
      this.tryLevelComplete();
      if (!this.levelCleared) {
        this.state = 'ready';
        this.readyTimer = 0;
      }
    }
  }

  protected checkLevelWin(): boolean {
    return this.pelletsLeft <= 0;
  }

  private pollDirKeys(): void {
    if (this.key('arrowup') || this.key('w')) this.pac.next = { ...UP };
    if (this.key('arrowdown') || this.key('s')) this.pac.next = { ...DOWN };
    if (this.key('arrowleft') || this.key('a')) this.pac.next = { ...LEFT };
    if (this.key('arrowright') || this.key('d')) this.pac.next = { ...RIGHT };
  }

  private moveActor(
    a: { x: number; y: number; dir: Vec },
    dir: Vec,
    next: Vec | null,
    step: number,
    isPac: boolean
  ): void {
    const eps = step + 0.001;
    const cx = Math.round(a.x);
    const cy = Math.round(a.y);
    const aligned = Math.abs(a.x - cx) < eps && Math.abs(a.y - cy) < eps;
    if (aligned) {
      a.x = cx;
      a.y = cy;
      if (next && (next.x || next.y) && !this.isWall(cx + next.x, cy + next.y)) {
        a.dir = { ...next };
        dir = a.dir;
      }
      if (this.isWall(cx + dir.x, cy + dir.y)) {
        if (isPac) a.dir = { ...STOP };
        return;
      }
    }
    a.x += a.dir.x * step;
    a.y += a.dir.y * step;
  }

  private moveGhost(g: Ghost, step: number): void {
    const eps = step + 0.001;
    const cx = Math.round(g.x);
    const cy = Math.round(g.y);
    const aligned = Math.abs(g.x - cx) < eps && Math.abs(g.y - cy) < eps;
    if (aligned) {
      g.x = cx;
      g.y = cy;
      const target = this.ghostTarget(g);
      const options = [UP, DOWN, LEFT, RIGHT].filter(
        (d) => !this.isWall(cx + d.x, cy + d.y) && !(d.x === -g.dir.x && d.y === -g.dir.y)
      );
      const choices = options.length ? options : [{ x: -g.dir.x, y: -g.dir.y }];
      let best = choices[0];
      if (g.frightened) {
        best = choices[Math.floor(Math.random() * choices.length)];
      } else {
        let bestDist = Infinity;
        for (const d of choices) {
          const dist = Math.hypot(cx + d.x - target.x, cy + d.y - target.y);
          if (dist < bestDist) {
            bestDist = dist;
            best = d;
          }
        }
      }
      g.dir = { ...best };
    }
    g.x += g.dir.x * step;
    g.y += g.dir.y * step;
  }

  private ghostTarget(g: Ghost): Vec {
    if (g.eaten) return { x: g.homeX, y: g.homeY };
    if (!this.chasePhase) return { x: g.cornerX, y: g.cornerY };
    const pac = this.pac;
    switch (g.kind) {
      case 'blinky':
        return { x: pac.x, y: pac.y };
      case 'pinky':
        return { x: pac.x + pac.dir.x * 4, y: pac.y + pac.dir.y * 4 };
      case 'inky':
        return { x: pac.x + pac.dir.x * 2, y: pac.y + pac.dir.y * 2 };
      case 'clyde': {
        const d = Math.hypot(g.x - pac.x, g.y - pac.y);
        return d > 6 ? { x: pac.x, y: pac.y } : { x: g.cornerX, y: g.cornerY };
      }
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#000010');

    // HUD
    this.drawText(`SCORE ${this.score}`, 4, 11, '#fff', 7);
    this.drawText(`LV ${this.level}`, this.width - 42, 11, '#00f5ff', 7);

    // maze
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE;
        const y = r * TILE + HUD;
        if (this.walls[r][c]) {
          g.fillStyle = '#0b1b6b';
          g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          g.fillStyle = '#2244dd';
          g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        } else if (this.pellets[r][c]) {
          g.fillStyle = '#ffd8b0';
          g.fillRect(x + TILE / 2 - 1, y + TILE / 2 - 1, 2, 2);
        } else if (this.power[r][c]) {
          if (Math.sin(this.blink * 6) > -0.3) {
            g.fillStyle = '#ffd8b0';
            g.beginPath();
            g.arc(x + TILE / 2, y + TILE / 2, 3.5, 0, Math.PI * 2);
            g.fill();
          }
        }
      }

    this.drawPac();
    for (const gh of this.ghosts) this.drawGhost(gh);

    // lives
    for (let i = 0; i < this.lives; i++) {
      const lx = 6 + i * 12;
      const ly = this.height - 7;
      g.fillStyle = '#ffe600';
      g.beginPath();
      g.arc(lx, ly, 4, 0.3, Math.PI * 2 - 0.3);
      g.lineTo(lx, ly);
      g.fill();
    }

    if (this.state === 'ready') {
      this.banner('READY!', '#ffe600');
    } else if (this.state === 'dead') {
      this.gameOverPanel();
    }
  }

  private pacAngle(): number {
    const d = this.pac.dir;
    if (d.x === 1) return 0;
    if (d.x === -1) return Math.PI;
    if (d.y === -1) return -Math.PI / 2;
    if (d.y === 1) return Math.PI / 2;
    return 0;
  }

  private drawPac(): void {
    const g = this.ctx2d;
    const cx = this.pac.x * TILE + TILE / 2;
    const cy = this.pac.y * TILE + TILE / 2 + HUD;
    const open = this.state === 'dying' ? 0.05 + this.dyingTimer * 0.9 : Math.abs(Math.sin(this.mouth)) * 0.32 + 0.05;
    const ang = this.pacAngle();
    g.save();
    g.translate(cx, cy);
    g.rotate(ang);
    g.fillStyle = '#ffe600';
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, TILE / 2, open * Math.PI, (2 - open) * Math.PI);
    g.closePath();
    g.fill();
    g.restore();
  }

  private drawGhost(gh: Ghost): void {
    const g = this.ctx2d;
    const x = gh.x * TILE + TILE / 2;
    const y = gh.y * TILE + TILE / 2 + HUD;
    const r = TILE / 2;
    let body = gh.color;
    if (gh.frightened) body = Math.sin(this.blink * 12) > 0 && this.frightTimer < 2 ? '#fff' : '#2233ff';
    if (gh.eaten) {
      // just eyes
      this.ghostEyes(x, y, gh.dir, '#fff');
      return;
    }
    g.fillStyle = body;
    g.beginPath();
    g.arc(x, y - 1, r, Math.PI, 0);
    g.lineTo(x + r, y + r - 1);
    for (let i = 0; i < 3; i++) {
      g.lineTo(x + r - (r * 2 * (i + 0.5)) / 3, y + r - 4);
      g.lineTo(x + r - (r * 2 * (i + 1)) / 3, y + r - 1);
    }
    g.closePath();
    g.fill();
    if (gh.frightened) {
      g.fillStyle = '#fff';
      g.fillRect(x - 3, y - 2, 2, 2);
      g.fillRect(x + 1, y - 2, 2, 2);
    } else {
      this.ghostEyes(x, y, gh.dir, '#fff');
    }
  }

  private ghostEyes(x: number, y: number, dir: Vec, white: string): void {
    const g = this.ctx2d;
    g.fillStyle = white;
    g.beginPath();
    g.arc(x - 2.5, y - 2, 2, 0, Math.PI * 2);
    g.arc(x + 2.5, y - 2, 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0033ff';
    g.fillRect(x - 3.5 + dir.x * 1.2, y - 3 + dir.y * 1.2, 2, 2);
    g.fillRect(x + 1.5 + dir.x * 1.2, y - 3 + dir.y * 1.2, 2, 2);
  }

  private banner(text: string, color: string): void {
    const g = this.ctx2d;
    g.font = `12px "Press Start 2P", monospace`;
    const w = g.measureText(text).width;
    g.fillStyle = color;
    g.fillText(text, this.width / 2 - w / 2, this.height / 2 + 24);
  }

  private gameOverPanel(): void {
    const g = this.ctx2d;
    g.fillStyle = 'rgba(0,0,16,0.78)';
    g.fillRect(0, 0, this.width, this.height);
    const best = getHighScore(this.ctx.slug);
    this.centerText('GAME OVER', this.height / 2 - 30, '#ff0000', 13);
    this.centerText(`SCORE ${this.score}`, this.height / 2, '#fff', 9);
    this.centerText(`BEST ${best}`, this.height / 2 + 18, '#ffe600', 9);
    if (Math.sin(performance.now() / 250) > 0)
      this.centerText('TAP / KEY TO RETRY', this.height / 2 + 42, '#39ff14', 7);
  }

  private centerText(text: string, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    const w = g.measureText(text).width;
    g.fillStyle = color;
    g.fillText(text, this.width / 2 - w / 2, y);
  }
}
