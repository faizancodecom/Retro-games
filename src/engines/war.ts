import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { levelSpeed } from './levelScale';

interface Ship {
  x: number;
  y: number;
  hp: number;
  fireCd: number;
  sway: number;
}

interface Missile {
  x: number;
  y: number;
  vy: number;
  foe: boolean;
}

export class WarEngine extends BaseEngine {
  private px = 160;
  private py = 210;
  private hp = 3;
  private missiles: Missile[] = [];
  private ships: Ship[] = [];
  private fireCd = 0;
  private wave = 1;
  private shipsLeft = 0;
  private dead = false;
  private anim = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = 320;
    this.height = 240;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    this.px = this.width / 2;
    this.py = this.height - 28;
    this.hp = 3;
    this.missiles = [];
    this.wave = this.diffLevel;
    this.dead = false;
    this.score = 0;
    this.spawnWave();
    this.ctx.onScoreChange(0);
  }

  private spawnWave(): void {
    this.ships = [];
    const count = 2 + Math.min(16, this.diffLevel * 2);
    this.shipsLeft = count;
    for (let i = 0; i < count; i++) {
      this.ships.push({
        x: 40 + (i % 5) * 52 + Math.random() * 12,
        y: 30 + Math.floor(i / 5) * 36 + Math.random() * 10,
        hp: 1 + (this.wave > 8 && i % 3 === 0 ? 1 : 0),
        fireCd: 0.5 + Math.random() * 2,
        sway: Math.random() * Math.PI * 2,
      });
    }
  }

  protected checkLevelWin(): boolean {
    return this.ships.length === 0;
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
    this.fireCd = 0.22;
    this.missiles.push({ x: this.px, y: this.py - 8, vy: -320, foe: false });
    this.tone(720, 0.04, 'square', 0.05);
  }

  protected update(dt: number): void {
    this.anim += dt;
    if (this.dead) return;

    const spd = 140 * levelSpeed(this.diffLevel);
    if (this.key('arrowleft') || this.key('a')) this.px -= spd * dt;
    if (this.key('arrowright') || this.key('d')) this.px += spd * dt;
    if (this.key('arrowup') || this.key('w')) this.py -= spd * 0.6 * dt;
    if (this.key('arrowdown') || this.key('s')) this.py += spd * 0.4 * dt;
    this.px = Math.max(16, Math.min(this.width - 16, this.px));
    this.py = Math.max(80, Math.min(this.height - 20, this.py));

    this.fireCd -= dt;

    for (const s of this.ships) {
      s.x += Math.sin(this.anim * 1.2 + s.sway) * 18 * dt;
      s.x = Math.max(24, Math.min(this.width - 24, s.x));
      s.fireCd -= dt;
      if (s.fireCd <= 0) {
        s.fireCd = Math.max(0.8, 2.2 - this.wave * 0.08) + Math.random();
        this.missiles.push({ x: s.x, y: s.y + 10, vy: 90 + this.wave * 6, foe: true });
      }
    }

    for (const m of this.missiles) m.y += m.vy * dt;

    for (const m of this.missiles) {
      if (!m.foe) {
        for (const s of this.ships) {
          if (Math.abs(m.x - s.x) < 14 && Math.abs(m.y - s.y) < 10) {
            s.hp--;
            m.y = -999;
            this.tone(400, 0.05);
            if (s.hp <= 0) {
              this.addScore(25 + this.wave * 2);
              this.shipsLeft--;
            }
          }
        }
      } else if (Math.abs(m.x - this.px) < 12 && Math.abs(m.y - this.py) < 10) {
        m.y = 9999;
        this.damage();
      }
    }

    this.ships = this.ships.filter((s) => s.hp > 0);
    this.missiles = this.missiles.filter((m) => m.y > -20 && m.y < this.height + 20);

    if (this.ships.length === 0) {
      this.tryLevelComplete();
    }
  }

  private damage(): void {
    this.hp--;
    this.noise(0.2, 0.14);
    if (this.hp <= 0) {
      this.dead = true;
      this.gameOver();
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#0a2848');

    // ocean
    const grd = g.createLinearGradient(0, 40, 0, this.height);
    grd.addColorStop(0, '#1a5a8a');
    grd.addColorStop(1, '#0d3a5c');
    g.fillStyle = grd;
    g.fillRect(0, 30, this.width, this.height - 30);
    for (let i = 0; i < 8; i++) {
      const wx = (i * 47 + this.anim * 22) % (this.width + 40) - 20;
      const wy = 50 + (i % 3) * 40;
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(wx, wy, 30, 3);
    }

    // ships
    for (const s of this.ships) {
      g.fillStyle = '#8a4a2a';
      g.fillRect(s.x - 14, s.y + 4, 28, 8);
      g.fillStyle = '#c0392b';
      g.fillRect(s.x - 10, s.y - 2, 20, 8);
      g.fillStyle = '#444';
      g.fillRect(s.x - 2, s.y - 10, 4, 10);
    }

    // missiles
    for (const m of this.missiles) {
      g.fillStyle = m.foe ? '#ff3b6b' : '#ffe600';
      g.fillRect(m.x - 2, m.y - 4, 4, 8);
    }

    // player plane
    g.fillStyle = '#00f5ff';
    g.beginPath();
    g.moveTo(this.px, this.py - 12);
    g.lineTo(this.px - 12, this.py + 8);
    g.lineTo(this.px + 12, this.py + 8);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffe600';
    g.fillRect(this.px - 3, this.py - 4, 6, 8);

    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, this.width, 14);
    this.drawText(`SCORE ${this.score}`, 4, 10, '#ffe600', 7);
    this.drawText(`WAVE ${this.wave}`, 120, 10, '#fff', 7);
    this.drawText(`SHIPS ${this.ships.length}`, 210, 10, '#ff6b35', 7);
    this.drawText(`HP ${'#'.repeat(Math.max(0, this.hp))}`, 4, this.height - 8, '#39ff14', 6);

    if (this.dead) this.drawOverlay('PLANE DOWN', 'TAP / SPACE to retry');
    if (this.levelCleared) this.drawOverlay('LEVEL CLEAR!', 'All fleets destroyed');
  }
}
