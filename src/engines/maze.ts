import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getMazeConfig } from '../games/configs';

type Cell = 0 | 1 | 2 | 3; // empty, wall, pellet, power
type GhostMode = 'scatter' | 'chase' | 'frightened';

interface Ghost {
  x: number;
  y: number;
  color: string;
  mode: GhostMode;
  dir: { x: number; y: number };
  eaten: boolean;
}

export class MazeEngine extends BaseEngine {
  private cfg = getMazeConfig('');
  private grid: Cell[][] = [];
  private tile = 10;
  private px = 0;
  private py = 0;
  private pdir = { x: 0, y: 0 };
  private pnext = { x: 0, y: 0 };
  private ghosts: Ghost[] = [];
  private powerTimer = 0;
  private modeTimer = 0;
  private globalMode: GhostMode = 'scatter';
  private pelletsLeft = 0;
  private lives = 3;
  private moveAcc = 0;
  private dead = false;
  private winFlash = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getMazeConfig(ctx.configId);
  }

  protected checkLevelWin(): boolean {
    return this.pelletsLeft <= 0;
  }

  protected init(): void {
    this.lf = this.levelCfg.speed;
    this.cfg = getMazeConfig(this.ctx.configId);
    this.parseLayout();
    this.lives = 3;
    this.score = 0;
    this.dead = false;
    this.powerTimer = 0;
    this.resetPositions();
  }

  private parseLayout(): void {
    this.grid = this.cfg.layout.map((row) =>
      row.split('').map((c): Cell => {
        if (c === '#') return 1;
        if (c === 'o' || c === 'O') return 3;
        return 2;
      })
    );
    this.pelletsLeft = 0;
    for (const row of this.grid)
      for (const c of row) if (c === 2 || c === 3) this.pelletsLeft++;
    this.tile = Math.floor(Math.min(this.width / this.grid[0].length, (this.height - 20) / this.grid.length));
  }

  private resetPositions(): void {
    for (let y = 0; y < this.grid.length; y++)
      for (let x = 0; x < this.grid[0].length; x++) {
        if (this.cfg.layout[y][x] === 'P' || (this.grid[y][x] !== 1 && y > this.grid.length / 2 && x === 9)) {
          this.px = x;
          this.py = y;
        }
      }
  if (this.px === 0 && this.py === 0) {
      outer: for (let y = 0; y < this.grid.length; y++)
        for (let x = 0; x < this.grid[0].length; x++)
          if (this.grid[y][x] === 2) {
            this.px = x;
            this.py = y;
            break outer;
          }
    }
    this.pdir = { x: 0, y: 0 };
    this.pnext = { x: 1, y: 0 };
    const gx = Math.floor(this.grid[0].length / 2);
    const gy = Math.floor(this.grid.length / 2);
    this.ghosts = this.cfg.ghostColors.map((color, i) => ({
      x: gx + i - 1.5,
      y: gy,
      color,
      mode: 'scatter' as GhostMode,
      dir: { x: -1, y: 0 },
      eaten: false,
    }));
  }

  private canMove(x: number, y: number): boolean {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gy < 0 || gy >= this.grid.length || gx < 0 || gx >= this.grid[0].length) return false;
    return this.grid[gy][gx] !== 1;
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }
    if (this.key('arrowleft') || this.key('a')) this.pnext = { x: -1, y: 0 };
    if (this.key('arrowright') || this.key('d')) this.pnext = { x: 1, y: 0 };
    if (this.key('arrowup') || this.key('w')) this.pnext = { x: 0, y: -1 };
    if (this.key('arrowdown') || this.key('s')) this.pnext = { x: 0, y: 1 };

    this.modeTimer += dt;
    if (this.modeTimer > 5) {
      this.modeTimer = 0;
      this.globalMode = this.globalMode === 'scatter' ? 'chase' : 'scatter';
    }
    if (this.powerTimer > 0) {
      this.powerTimer -= dt;
      if (this.powerTimer <= 0)
        this.ghosts.forEach((g) => {
          if (!g.eaten) g.mode = this.globalMode;
        });
    }

    const speed = this.cfg.speed * dt;
    this.moveAcc += speed;
    if (this.moveAcc < 0.08) return;
    this.moveAcc = 0;

    const atCenter = Math.abs(this.px - Math.round(this.px)) < 0.1 && Math.abs(this.py - Math.round(this.py)) < 0.1;
    if (atCenter && this.canMove(this.px + this.pnext.x, this.py + this.pnext.y)) this.pdir = this.pnext;
    if (atCenter && !this.canMove(this.px + this.pdir.x, this.py + this.pdir.y)) this.pdir = { x: 0, y: 0 };

    if (this.canMove(this.px + this.pdir.x * 0.5, this.py + this.pdir.y * 0.5)) {
      this.px += this.pdir.x * 0.5;
      this.py += this.pdir.y * 0.5;
    }

    const gx = Math.round(this.px);
    const gy = Math.round(this.py);
    if (this.grid[gy]?.[gx] === 2) {
      this.grid[gy][gx] = 0;
      this.pelletsLeft--;
      this.addScore(10);
      this.playBeep(400, 0.02);
    }
    if (this.grid[gy]?.[gx] === 3) {
      this.grid[gy][gx] = 0;
      this.pelletsLeft--;
      this.powerTimer = this.cfg.powerDuration;
      this.ghosts.forEach((g) => {
        g.mode = 'frightened';
        g.eaten = false;
      });
      this.addScore(50);
      this.playBeep(200, 0.1);
    }

    for (const ghost of this.ghosts) {
      const mode = this.powerTimer > 0 ? 'frightened' : this.globalMode;
      if (!ghost.eaten) ghost.mode = mode;
      if (Math.random() < 0.3) {
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ].filter((d) => this.canMove(ghost.x + d.x, ghost.y + d.y));
        if (ghost.mode === 'chase' && dirs.length) {
          dirs.sort(
            (a, b) =>
              Math.hypot(this.px - (ghost.x + a.x), this.py - (ghost.y + a.y)) -
              Math.hypot(this.px - (ghost.x + b.x), this.py - (ghost.y + b.y))
          );
        }
        if (ghost.mode === 'frightened' && dirs.length) dirs.sort(() => Math.random() - 0.5);
        ghost.dir = dirs[0] ?? ghost.dir;
      }
      ghost.x += ghost.dir.x * 0.35;
      ghost.y += ghost.dir.y * 0.35;
      const dist = Math.hypot(ghost.x - this.px, ghost.y - this.py);
      if (dist < 0.6) {
        if (ghost.mode === 'frightened') {
          ghost.eaten = true;
          ghost.x = Math.floor(this.grid[0].length / 2);
          ghost.y = Math.floor(this.grid.length / 2);
          this.addScore(200);
          this.playBeep(1000, 0.05);
        } else if (!ghost.eaten) {
          this.lives--;
          if (this.lives <= 0) {
            this.dead = true;
            this.gameOver();
          } else {
            this.resetPositions();
          }
        }
      }
    }

    if (this.pelletsLeft <= 0) {
      this.winFlash += dt;
      if (this.winFlash > 1) {
        this.addScore(500);
        this.tryLevelComplete();
        if (!this.levelCleared) {
          this.parseLayout();
          this.resetPositions();
        }
        this.winFlash = 0;
      }
    }
  }

  protected draw(): void {
    this.clear('#0a0a12');
    const g = this.ctx2d;
    const t = this.tile;
    const ox = (this.width - this.grid[0].length * t) / 2;
    const oy = 16;
    for (let y = 0; y < this.grid.length; y++)
      for (let x = 0; x < this.grid[0].length; x++) {
        const c = this.grid[y][x];
        if (c === 1) {
          g.fillStyle = '#2244aa';
          g.fillRect(ox + x * t, oy + y * t, t, t);
        } else if (c === 2) {
          g.fillStyle = '#ffb897';
          g.fillRect(ox + x * t + t / 2 - 1, oy + y * t + t / 2 - 1, 2, 2);
        } else if (c === 3) {
          g.fillStyle = '#ffb897';
          g.beginPath();
          g.arc(ox + x * t + t / 2, oy + y * t + t / 2, 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    g.fillStyle = this.cfg.playerColor;
    g.beginPath();
    g.arc(ox + this.px * t + t / 2, oy + this.py * t + t / 2, t / 2 - 1, 0.3, Math.PI * 2 - 0.3);
    g.fill();
    for (const ghost of this.ghosts) {
      g.fillStyle = ghost.mode === 'frightened' ? '#2244ff' : ghost.color;
      g.fillRect(ox + ghost.x * t, oy + ghost.y * t, t, t - 2);
      g.fillStyle = '#fff';
      g.fillRect(ox + ghost.x * t + 2, oy + ghost.y * t + 2, 3, 3);
      g.fillRect(ox + ghost.x * t + t - 5, oy + ghost.y * t + 2, 3, 3);
    }
    this.drawText(`SCORE ${this.score}`, 8, 10, '#fff', 8);
    this.drawText(`LIVES ${this.lives}`, this.width - 90, 10, '#ff00aa', 8);
    if (this.dead) this.drawOverlay('GAME OVER', 'SPACE TO RESTART');
  }
}
