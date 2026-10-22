import { BaseEngine } from './base';

const T = 16;
const COLS = 20;
const ROWS = 15;

interface Guard {
  x: number;
  y: number;
  cd: number;
}

export class DungeonEngine extends BaseEngine {
  private walls: boolean[][] = [];
  private px = 1;
  private py = 1;
  private moveCd = 0;
  private keyX = 0;
  private keyY = 0;
  private hasKey = false;
  private doorX = 0;
  private doorY = 0;
  private guards: Guard[] = [];
  private lives = 3;
  private level = 1;
  private dead = false;
  private flash = 0;

  protected checkLevelWin(): boolean {
    return this.hasKey && this.px === this.doorX && this.py === this.doorY;
  }

  protected init(): void {
    this.lf = this.levelCfg.speed;
    this.lives = 3;
    this.level = this.diffLevel;
    this.dead = false;
    this.score = 0;
    this.ctx.onScoreChange(0);
    this.buildLevel();
  }

  private free(x: number, y: number): boolean {
    return x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1 && !this.walls[y][x];
  }

  private randCell(): [number, number] {
    for (let i = 0; i < 200; i++) {
      const x = 1 + Math.floor(Math.random() * (COLS - 2));
      const y = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (this.free(x, y)) return [x, y];
    }
    return [1, 1];
  }

  private buildLevel(): void {
    this.walls = [];
    for (let y = 0; y < ROWS; y++) {
      this.walls[y] = [];
      for (let x = 0; x < COLS; x++)
        this.walls[y][x] = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
    }
    const blocks = 16 + this.level * 3;
    for (let i = 0; i < blocks; i++) {
      const x = 2 + Math.floor(Math.random() * (COLS - 4));
      const y = 2 + Math.floor(Math.random() * (ROWS - 4));
      this.walls[y][x] = true;
    }
    this.px = 1;
    this.py = 1;
    this.walls[1][1] = false;
    this.walls[1][2] = false;
    this.walls[2][1] = false;
    this.hasKey = false;
    [this.keyX, this.keyY] = this.randCell();
    [this.doorX, this.doorY] = this.randCell();
    this.walls[this.doorY][this.doorX] = false;
    this.guards = [];
    const n = 1 + this.level;
    for (let i = 0; i < n; i++) {
      const [gx, gy] = this.randCell();
      this.guards.push({ x: gx, y: gy, cd: 0 });
    }
    this.moveCd = 0.2;
  }

  protected onTap(): void {
    if (this.dead) this.restart();
  }

  protected onKeyDown(key: string): void {
    if (this.dead && (key === ' ' || key === 'enter')) this.restart();
  }

  protected update(dt: number): void {
    if (this.flash > 0) this.flash -= dt;
    if (this.dead) return;

    if (this.moveCd > 0) this.moveCd -= dt;
    else {
      let dx = 0;
      let dy = 0;
      if (this.key('arrowleft') || this.key('a')) dx = -1;
      else if (this.key('arrowright') || this.key('d')) dx = 1;
      else if (this.key('arrowup') || this.key('w')) dy = -1;
      else if (this.key('arrowdown') || this.key('s')) dy = 1;
      if (dx || dy) {
        this.moveCd = 0.11;
        if (this.free(this.px + dx, this.py + dy)) {
          this.px += dx;
          this.py += dy;
          this.tone(220, 0.015, 'square', 0.02);
        }
      }
    }

    if (!this.hasKey && this.px === this.keyX && this.py === this.keyY) {
      this.hasKey = true;
      this.addScore(25);
      this.tone(900, 0.08);
    }
    if (this.hasKey && this.px === this.doorX && this.py === this.doorY) {
      this.addScore(75);
      this.tone(1200, 0.12);
      this.tryLevelComplete();
      if (this.levelCleared) return;
      this.level++;
      this.buildLevel();
      return;
    }

    for (const gd of this.guards) {
      gd.cd -= dt;
      if (gd.cd <= 0) {
        gd.cd = Math.max(0.18, 0.5 - this.level * 0.02);
        const options: [number, number][] = [];
        const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [mx, my] of dirs) if (this.free(gd.x + mx, gd.y + my)) options.push([mx, my]);
        if (options.length) {
          // 65% chase toward player, else random
          let best = options[Math.floor(Math.random() * options.length)];
          if (Math.random() < 0.65) {
            let bd = Infinity;
            for (const [mx, my] of options) {
              const d = Math.abs(gd.x + mx - this.px) + Math.abs(gd.y + my - this.py);
              if (d < bd) { bd = d; best = [mx, my]; }
            }
          }
          gd.x += best[0];
          gd.y += best[1];
        }
      }
      if (gd.x === this.px && gd.y === this.py) this.hit();
    }
  }

  private hit(): void {
    this.lives--;
    this.flash = 0.4;
    this.noise(0.25, 0.15);
    if (this.lives <= 0) {
      this.dead = true;
      this.gameOver();
    } else {
      this.px = 1;
      this.py = 1;
      this.moveCd = 0.3;
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    this.clear('#0a0712');
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const sx = x * T;
        const sy = y * T;
        if (this.walls[y][x]) {
          g.fillStyle = '#3a2f55';
          g.fillRect(sx, sy, T, T);
          g.fillStyle = '#4a3d6b';
          g.fillRect(sx + 1, sy + 1, T - 2, 3);
        } else {
          g.fillStyle = (x + y) % 2 ? '#161024' : '#1a1330';
          g.fillRect(sx, sy, T, T);
        }
      }

    // door
    g.fillStyle = this.hasKey ? '#39ff14' : '#7a5a2a';
    g.fillRect(this.doorX * T + 2, this.doorY * T + 1, T - 4, T - 2);
    g.fillStyle = '#caa46a';
    g.fillRect(this.doorX * T + T - 6, this.doorY * T + 7, 2, 3);

    // key
    if (!this.hasKey) {
      g.fillStyle = '#ffe600';
      const kx = this.keyX * T + 8;
      const ky = this.keyY * T + 8;
      g.beginPath();
      g.arc(kx - 2, ky, 4, 0, Math.PI * 2);
      g.fill();
      g.fillRect(kx, ky - 1, 6, 2);
      g.fillRect(kx + 5, ky - 1, 2, 4);
    }

    // guards
    for (const gd of this.guards) {
      g.fillStyle = '#ff3b6b';
      g.fillRect(gd.x * T + 2, gd.y * T + 2, T - 4, T - 4);
      g.fillStyle = '#ffe600';
      g.fillRect(gd.x * T + 4, gd.y * T + 5, 3, 3);
      g.fillRect(gd.x * T + T - 7, gd.y * T + 5, 3, 3);
    }

    // player
    g.fillStyle = '#00f5ff';
    g.fillRect(this.px * T + 3, this.py * T + 2, T - 6, T - 4);
    if (this.hasKey) {
      g.fillStyle = '#ffe600';
      g.fillRect(this.px * T + 6, this.py * T - 2, 4, 3);
    }

    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, this.width, 13);
    this.drawText(`LV ${this.level}`, 4, 10, '#ffe600', 7);
    this.drawText(`SCORE ${this.score}`, 70, 10, '#00f5ff', 7);
    this.drawText(`LIVES ${this.lives}`, 220, 10, '#ff3b6b', 7);
    this.drawText(this.hasKey ? 'KEY! reach door' : 'find the KEY', 90, this.height - 6, '#888', 6);

    if (this.flash > 0) {
      g.fillStyle = `rgba(255,0,0,${this.flash * 0.5})`;
      g.fillRect(0, 0, this.width, this.height);
    }
    if (this.dead) this.drawOverlay('CAUGHT!', 'TAP / SPACE to retry');
  }
}
