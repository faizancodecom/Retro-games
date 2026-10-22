import { BaseEngine } from './base';
import type { EngineContext } from '../types';

interface Target {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  points: number;
  hit: boolean;
}

const COLORS = ['#ff00aa', '#00f5ff', '#ffe600', '#39ff14', '#ff6b35'];

export class GalleryEngine extends BaseEngine {
  private targets: Target[] = [];
  private spawnT = 0;
  private mag = 6;
  private ammo = 6;
  private reloading = false;
  private reloadT = 0;
  private lives = 3;
  private combo = 1;
  private marker = { x: 0, y: 0, t: 0 };
  private dead = false;

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
    this.lf = this.levelCfg.speed;
    this.targets = [];
    this.spawnT = 0;
    this.ammo = this.mag;
    this.reloading = false;
    this.reloadT = 0;
    this.lives = 3;
    this.combo = 1;
    this.marker.t = 0;
    this.dead = false;
    this.score = 0;
  }

  protected onKeyDown(key: string): void {
    if (this.dead) {
      if (key === ' ' || key === 'enter') this.restart();
      return;
    }
    if (key === 'r') this.startReload();
  }

  handlePointer(cxp: number, cyp: number): void {
    if (this.dead) {
      this.restart();
      return;
    }
    this.shoot(cxp / this.scale, cyp / this.scale);
  }

  private startReload(): void {
    if (this.reloading || this.ammo === this.mag) return;
    this.reloading = true;
    this.reloadT = 1.1;
    this.tone(220, 0.08, 'sawtooth', 0.05);
  }

  private shoot(x: number, y: number): void {
    if (this.reloading) return;
    if (this.ammo <= 0) {
      this.startReload();
      return;
    }
    this.ammo--;
    this.marker = { x, y, t: 0.25 };
    this.tone(900, 0.04, 'square', 0.06);
    this.noise(0.04, 0.05);
    let best = -1;
    let bestD = 1e9;
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i];
      if (t.hit) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < t.r + 7 && d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      const t = this.targets[best];
      t.hit = true;
      const gained = t.points * this.combo;
      this.addScore(gained);
      this.combo = Math.min(8, this.combo + 1);
      this.tone(1200, 0.07);
    } else {
      this.combo = 1;
    }
    if (this.ammo <= 0) this.startReload();
  }

  protected update(dt: number): void {
    if (this.dead) return;
    if (this.marker.t > 0) this.marker.t -= dt;

    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloading = false;
        this.ammo = this.mag;
        this.tone(520, 0.06);
      }
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = Math.max(0.35, (1.3 - this.score / 600) / this.levelCfg.spawnMul);
      this.spawnTarget();
    }

    for (const t of this.targets) {
      if (t.hit) {
        t.y += 120 * dt; // fall when hit
        t.vy = 0;
      } else {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        if (t.y < 24) t.vy = Math.abs(t.vy);
        if (t.y > 150) t.vy = -Math.abs(t.vy);
      }
    }

    this.targets = this.targets.filter((t) => {
      if (t.hit) return t.y < this.height + 20;
      const escaped = t.x < -30 || t.x > this.width + 30;
      if (escaped) this.loseLife();
      return !escaped;
    });

    if (this.lives <= 0 && !this.dead) {
      this.dead = true;
      this.tone(140, 0.3);
      this.gameOver();
    }
  }

  private loseLife(): void {
    this.lives--;
    this.combo = 1;
    this.tone(200, 0.12);
  }

  private spawnTarget(): void {
    const fromLeft = Math.random() < 0.5;
    const r = 8 + Math.random() * 8;
    const speed = 45 + Math.random() * 55 + this.score / 40;
    const points = r < 11 ? 25 : r < 14 ? 15 : 10;
    this.targets.push({
      x: fromLeft ? -20 : this.width + 20,
      y: 36 + Math.random() * 100,
      vx: (fromLeft ? 1 : -1) * speed,
      vy: (Math.random() - 0.5) * 40,
      r,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      points,
      hit: false,
    });
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#0b1026');
    // sky gradient bands
    g.fillStyle = '#141a3a';
    g.fillRect(0, 0, this.width, 24);
    // ground
    g.fillStyle = '#1a2a18';
    g.fillRect(0, 168, this.width, this.height - 168);
    g.fillStyle = '#22361f';
    for (let i = 0; i < this.width; i += 18) {
      g.fillRect(i, 168, 9, 6);
    }

    for (const t of this.targets) {
      g.fillStyle = t.hit ? '#555' : t.color;
      g.beginPath();
      g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0b1026';
      g.beginPath();
      g.arc(t.x, t.y, t.r * 0.55, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = t.hit ? '#888' : '#fff';
      g.beginPath();
      g.arc(t.x, t.y, t.r * 0.25, 0, Math.PI * 2);
      g.fill();
    }

    if (this.marker.t > 0) {
      g.strokeStyle = '#ffe600';
      g.lineWidth = 2;
      const m = this.marker;
      g.beginPath();
      g.moveTo(m.x - 8, m.y);
      g.lineTo(m.x + 8, m.y);
      g.moveTo(m.x, m.y - 8);
      g.lineTo(m.x, m.y + 8);
      g.stroke();
    }

    // HUD
    this.drawText(`SCORE ${this.score}`, 6, 12, '#00f5ff', 7);
    this.drawText(`x${this.combo}`, this.width - 34, 12, '#ffe600', 7);
    // ammo bullets
    for (let i = 0; i < this.mag; i++) {
      g.fillStyle = i < this.ammo ? '#ffe600' : '#444';
      g.fillRect(6 + i * 8, this.height - 14, 5, 10);
    }
    // lives
    for (let i = 0; i < this.lives; i++) {
      g.fillStyle = '#ff3b6b';
      g.fillRect(this.width - 14 - i * 12, this.height - 14, 9, 9);
    }
    if (this.reloading) this.drawText('RELOADING...', this.width / 2 - 48, this.height - 6, '#ff6b35', 7);
    else this.drawText('TAP / CLICK targets', this.width / 2 - 60, this.height - 6, '#88aacc', 6);

    if (this.dead) {
      g.fillStyle = 'rgba(0,0,0,0.78)';
      g.fillRect(0, 0, this.width, this.height);
      this.center('GAME OVER', this.height / 2 - 14, '#ff3b6b', 14);
      this.center(`SCORE ${this.score}`, this.height / 2 + 6, '#00f5ff', 9);
      this.center('TAP / SPACE TO RETRY', this.height / 2 + 28, '#39ff14', 7);
    }
  }

  private center(t: string, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.textAlign = 'left';
    const tw = g.measureText(t).width;
    g.fillStyle = color;
    g.fillText(t, this.width / 2 - tw / 2, y);
  }
}
