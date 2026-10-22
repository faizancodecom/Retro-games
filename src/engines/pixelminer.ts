import { BaseEngine } from './base';

const T = 16;
const COLS = 20;
const ROWS = 15;
const SKY = 2;

type Cell = 'sky' | 'dirt' | 'empty' | 'gold' | 'gem' | 'rock' | 'lava';

export class PixelMinerEngine extends BaseEngine {
  private grid: Cell[][] = [];
  private px = 10;
  private py = SKY;
  private dir = 2;
  private moveCd = 0;
  private energy = 100;
  private maxDepth = 0;
  private dead = false;
  private anim = 0;

  protected init(): void {
    this.grid = [];
    for (let y = 0; y < ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < COLS; x++) {
        if (y < SKY) this.grid[y][x] = 'sky';
        else {
          const r = Math.random();
          if (r < 0.05) this.grid[y][x] = 'lava';
          else if (r < 0.13) this.grid[y][x] = 'rock';
          else if (r < 0.2) this.grid[y][x] = 'gold';
          else if (r < 0.25) this.grid[y][x] = 'gem';
          else this.grid[y][x] = 'dirt';
        }
      }
    }
    this.px = 10;
    this.py = SKY;
    this.grid[SKY][10] = 'empty';
    this.dir = 2;
    this.energy = 100;
    this.maxDepth = 0;
    this.dead = false;
    this.score = 0;
    this.ctx.onScoreChange(0);
  }

  protected onTap(): void {
    if (this.dead) this.restart();
  }

  protected onKeyDown(key: string): void {
    if (this.dead && (key === ' ' || key === 'enter')) this.restart();
  }

  protected update(dt: number): void {
    this.anim += dt;
    if (this.dead) return;
    if (this.moveCd > 0) {
      this.moveCd -= dt;
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.key('arrowleft') || this.key('a')) { dx = -1; this.dir = 3; }
    else if (this.key('arrowright') || this.key('d')) { dx = 1; this.dir = 1; }
    else if (this.key('arrowup') || this.key('w')) { dy = -1; this.dir = 0; }
    else if (this.key('arrowdown') || this.key('s')) { dy = 1; this.dir = 2; }
    if (dx === 0 && dy === 0) return;

    const tx = this.px + dx;
    const ty = this.py + dy;
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return;
    this.moveCd = 0.12;
    const cell = this.grid[ty][tx];
    if (cell === 'rock') {
      this.tone(120, 0.04, 'square', 0.03);
      return;
    }
    if (cell === 'lava') {
      this.dead = true;
      this.noise(0.4, 0.18);
      this.gameOver();
      return;
    }
    if (cell === 'gold') { this.addScore(50); this.energy = Math.min(100, this.energy + 4); this.tone(880, 0.06); }
    else if (cell === 'gem') { this.addScore(120); this.energy = Math.min(100, this.energy + 8); this.tone(1180, 0.07); }
    else if (cell === 'dirt') { this.energy -= 1; this.tone(200, 0.02, 'square', 0.03); }
    this.grid[ty][tx] = 'empty';
    this.px = tx;
    this.py = ty;
    this.energy -= 1;
    const depth = this.py - SKY;
    if (depth > this.maxDepth) {
      this.maxDepth = depth;
      this.addScore(depth * 3);
    }
    if (this.energy <= 0) {
      this.energy = 0;
      this.dead = true;
      this.gameOver();
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    this.clear('#0d1b2a');
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const c = this.grid[y][x];
        const sx = x * T;
        const sy = y * T;
        if (c === 'sky') {
          g.fillStyle = y === 0 ? '#102a43' : '#13344f';
          g.fillRect(sx, sy, T, T);
        } else if (c === 'empty') {
          g.fillStyle = '#1a120c';
          g.fillRect(sx, sy, T, T);
        } else if (c === 'dirt') {
          g.fillStyle = '#5a3a22';
          g.fillRect(sx, sy, T, T);
          g.fillStyle = '#4a2f1b';
          g.fillRect(sx + 3, sy + 4, 3, 3);
          g.fillRect(sx + 9, sy + 9, 3, 3);
        } else if (c === 'rock') {
          g.fillStyle = '#4a4a55';
          g.fillRect(sx, sy, T, T);
          g.fillStyle = '#5e5e6a';
          g.fillRect(sx + 4, sy + 4, 8, 8);
        } else if (c === 'gold') {
          g.fillStyle = '#5a3a22';
          g.fillRect(sx, sy, T, T);
          g.fillStyle = '#ffd700';
          g.fillRect(sx + 4, sy + 4, 8, 8);
        } else if (c === 'gem') {
          g.fillStyle = '#5a3a22';
          g.fillRect(sx, sy, T, T);
          g.fillStyle = '#00f5ff';
          g.beginPath();
          g.moveTo(sx + 8, sy + 3);
          g.lineTo(sx + 13, sy + 8);
          g.lineTo(sx + 8, sy + 13);
          g.lineTo(sx + 3, sy + 8);
          g.closePath();
          g.fill();
        } else if (c === 'lava') {
          g.fillStyle = Math.floor(this.anim * 4) % 2 ? '#ff4500' : '#ff7a33';
          g.fillRect(sx, sy, T, T);
        }
      }

    const sx = this.px * T;
    const sy = this.py * T;
    g.fillStyle = '#ffe600';
    g.fillRect(sx + 3, sy + 3, T - 6, T - 6);
    g.fillStyle = '#0a0a14';
    const ex = this.dir === 3 ? 4 : this.dir === 1 ? 8 : 6;
    const ey = this.dir === 0 ? 4 : this.dir === 2 ? 8 : 6;
    g.fillRect(sx + ex, sy + ey, 4, 3);
    g.fillStyle = '#c0392b';
    g.fillRect(sx + 4, sy + 1, T - 8, 3);

    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, this.width, 13);
    this.drawText(`SCORE ${this.score}`, 4, 10, '#ffe600', 7);
    this.drawText(`DEPTH ${this.maxDepth}`, 150, 10, '#00f5ff', 7);
    g.fillStyle = '#330000';
    g.fillRect(232, 4, 84, 6);
    g.fillStyle = this.energy > 30 ? '#39ff14' : '#ff3b6b';
    g.fillRect(232, 4, 0.84 * this.energy, 6);

    if (this.dead) this.drawOverlay('OUT OF ENERGY', 'TAP / SPACE to dig again');
  }
}
