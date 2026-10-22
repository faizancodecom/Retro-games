import { BaseEngine } from './base';

type Block = [number, number, number, number];
interface Bullet { x: number; y: number; vx: number; vy: number; foe: boolean; }
interface Enemy { x: number; y: number; dx: number; dy: number; hp: number; fireCd: number; }

const HALF = 8;
const BLOCKS: Block[] = [
  [56, 48, 26, 26], [238, 48, 26, 26], [56, 166, 26, 26], [238, 166, 26, 26],
  [147, 107, 26, 26], [147, 40, 26, 16], [147, 184, 26, 16],
];

export class TankEngine extends BaseEngine {
  private px = 160;
  private py = 196;
  private fx = 0;
  private fy = -1;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private hp = 3;
  private wave = 0;
  private spawnCd = 0;
  private fireCd = 0;
  private dead = false;

  protected init(): void {
    this.px = 160;
    this.py = 196;
    this.fx = 0;
    this.fy = -1;
    this.bullets = [];
    this.enemies = [];
    this.hp = 3;
    this.wave = 0;
    this.spawnCd = 0.4;
    this.fireCd = 0;
    this.dead = false;
    this.score = 0;
    this.ctx.onScoreChange(0);
  }

  protected onTap(): void {
    if (this.dead) this.restart();
    else this.fire();
  }

  protected onKeyDown(key: string): void {
    if (this.dead) {
      if (key === ' ' || key === 'enter') this.restart();
      return;
    }
    if (key === ' ' || key === 'enter') this.fire();
  }

  private fire(): void {
    if (this.fireCd > 0) return;
    this.fireCd = 0.4;
    this.bullets.push({ x: this.px + this.fx * 10, y: this.py + this.fy * 10, vx: this.fx * 230, vy: this.fy * 230, foe: false });
    this.tone(440, 0.04, 'square', 0.05);
  }

  private blocked(x: number, y: number): boolean {
    if (x < HALF || y < 16 + HALF || x > this.width - HALF || y > this.height - HALF) return true;
    for (const [bx, by, bw, bh] of BLOCKS)
      if (x + HALF > bx && x - HALF < bx + bw && y + HALF > by && y - HALF < by + bh) return true;
    return false;
  }

  private bulletBlocked(x: number, y: number): boolean {
    if (x < 0 || y < 14 || x > this.width || y > this.height) return true;
    for (const [bx, by, bw, bh] of BLOCKS) if (x > bx && x < bx + bw && y > by && y < by + bh) return true;
    return false;
  }

  protected update(dt: number): void {
    if (this.dead) return;

    const sp = 78;
    let mx = 0;
    let my = 0;
    if (this.key('arrowleft') || this.key('a')) mx = -1;
    else if (this.key('arrowright') || this.key('d')) mx = 1;
    else if (this.key('arrowup') || this.key('w')) my = -1;
    else if (this.key('arrowdown') || this.key('s')) my = 1;
    if (mx || my) {
      this.fx = mx;
      this.fy = my;
      const nx = this.px + mx * sp * dt;
      const ny = this.py + my * sp * dt;
      if (!this.blocked(nx, this.py)) this.px = nx;
      if (!this.blocked(this.px, ny)) this.py = ny;
    }

    this.fireCd -= dt;

    this.spawnCd -= dt;
    if (this.spawnCd <= 0 && this.enemies.length < 3 + Math.floor(this.wave / 2)) {
      this.spawnCd = Math.max(1, 2.4 - this.wave * 0.1);
      const corners: [number, number][] = [[24, 30], [296, 30], [24, 210], [296, 210]];
      const [ex, ey] = corners[Math.floor(Math.random() * corners.length)];
      this.enemies.push({ x: ex, y: ey, dx: 0, dy: 1, hp: 1 + (Math.random() < this.wave * 0.07 ? 1 : 0), fireCd: 1 + Math.random() });
      this.wave++;
    }

    const esp = 38;
    for (const e of this.enemies) {
      const wantX = Math.sign(this.px - e.x);
      const wantY = Math.sign(this.py - e.y);
      const horiz = Math.abs(this.px - e.x) > Math.abs(this.py - e.y);
      let moved = false;
      if (horiz && wantX) {
        const nx = e.x + wantX * esp * dt;
        if (!this.blockedE(nx, e.y)) { e.x = nx; e.dx = wantX; e.dy = 0; moved = true; }
      } else if (!horiz && wantY) {
        const ny = e.y + wantY * esp * dt;
        if (!this.blockedE(e.x, ny)) { e.y = ny; e.dy = wantY; e.dx = 0; moved = true; }
      }
      if (!moved) {
        if (wantY && !this.blockedE(e.x, e.y + wantY * esp * dt)) { e.y += wantY * esp * dt; e.dy = wantY; e.dx = 0; }
        else if (wantX && !this.blockedE(e.x + wantX * esp * dt, e.y)) { e.x += wantX * esp * dt; e.dx = wantX; e.dy = 0; }
      }
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        e.fireCd = 1.6 + Math.random() * 1.5;
        const fx = horiz ? wantX : 0;
        const fy = horiz ? 0 : wantY;
        this.bullets.push({ x: e.x + fx * 10, y: e.y + fy * 10, vx: fx * 170, vy: fy * 170, foe: true });
      }
    }

    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    // resolve hits
    for (const b of this.bullets) {
      if (this.bulletBlocked(b.x, b.y)) { b.x = -999; continue; }
      if (!b.foe) {
        for (const e of this.enemies)
          if (e.hp > 0 && Math.abs(b.x - e.x) < 9 && Math.abs(b.y - e.y) < 9) {
            e.hp--; b.x = -999;
            if (e.hp <= 0) { this.addScore(20); this.tone(300, 0.07, 'square', 0.05); }
          }
      } else if (Math.abs(b.x - this.px) < 9 && Math.abs(b.y - this.py) < 9) {
        b.x = -999; this.damage();
      }
    }
    for (const e of this.enemies)
      if (e.hp > 0 && Math.abs(e.x - this.px) < 14 && Math.abs(e.y - this.py) < 14) { e.hp = 0; this.damage(); }

    this.bullets = this.bullets.filter((b) => b.x > -10 && b.x < this.width + 10 && b.y > 0 && b.y < this.height + 10);
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  private blockedE(x: number, y: number): boolean {
    return this.blocked(x, y);
  }

  private damage(): void {
    this.hp--;
    this.noise(0.25, 0.16);
    if (this.hp <= 0) { this.dead = true; this.gameOver(); }
  }

  private drawTank(x: number, y: number, dx: number, dy: number, body: string): void {
    const g = this.ctx2d;
    g.fillStyle = body;
    g.fillRect(x - HALF, y - HALF, HALF * 2, HALF * 2);
    g.fillStyle = '#0a0a14';
    g.fillRect(x - HALF, y - HALF, 3, HALF * 2);
    g.fillRect(x + HALF - 3, y - HALF, 3, HALF * 2);
    g.fillStyle = '#cfd3e6';
    g.fillRect(x - 3, y - 3, 6, 6);
    g.fillRect(x - 1.5 + dx * 6, y - 1.5 + dy * 6, 3 + Math.abs(dx) * 8, 3 + Math.abs(dy) * 8);
  }

  protected draw(): void {
    const g = this.ctx2d;
    this.clear('#1a1a14');
    g.fillStyle = '#23231a';
    for (let y = 16; y < this.height; y += 16)
      for (let x = 0; x < this.width; x += 16) if ((x + y) % 32 === 0) g.fillRect(x, y, 16, 16);

    for (const [bx, by, bw, bh] of BLOCKS) {
      g.fillStyle = '#6a5a3a';
      g.fillRect(bx, by, bw, bh);
      g.fillStyle = '#4a3f28';
      g.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
    }

    for (const b of this.bullets) {
      g.fillStyle = b.foe ? '#ff3b6b' : '#ffe600';
      g.fillRect(b.x - 2, b.y - 2, 4, 4);
    }

    for (const e of this.enemies) this.drawTank(e.x, e.y, e.dx, e.dy, e.hp > 1 ? '#ff6b35' : '#ff3b6b');
    this.drawTank(this.px, this.py, this.fx, this.fy, '#39ff14');

    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, this.width, 13);
    this.drawText(`SCORE ${this.score}`, 4, 10, '#39ff14', 7);
    this.drawText(`HP ${'#'.repeat(Math.max(0, this.hp))}`, 200, 10, '#ff3b6b', 7);

    if (this.dead) this.drawOverlay('TANK DESTROYED', 'TAP / SPACE to redeploy');
  }
}
