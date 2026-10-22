import { BaseEngine } from './base';
import type { EngineContext } from '../types';

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  size: 3 | 2 | 1;
  spin: number;
  rot: number;
  shape: number[];
}
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class AsteroidsEngine extends BaseEngine {
  private sx = 160;
  private sy = 120;
  private svx = 0;
  private svy = 0;
  private angle = -Math.PI / 2;
  private thrusting = false;
  private rocks: Rock[] = [];
  private bullets: Bullet[] = [];
  private fireT = 0;
  private lives = 3;
  private wave = 1;
  private dead = false;
  private invuln = 0;
  private respawn = 0;

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
    this.sx = this.width / 2;
    this.sy = this.height / 2;
    this.svx = 0;
    this.svy = 0;
    this.angle = -Math.PI / 2;
    this.bullets = [];
    this.fireT = 0;
    this.lives = 3;
    this.wave = 1;
    this.dead = false;
    this.invuln = 1.5;
    this.respawn = 0;
    this.score = 0;
    this.spawnWave();
  }

  private spawnWave(): void {
    this.rocks = [];
    const count = 3 + this.wave;
    for (let i = 0; i < count; i++) {
      const edge = Math.random();
      const x = edge < 0.5 ? Math.random() * this.width : Math.random() < 0.5 ? 0 : this.width;
      const y = edge < 0.5 ? (Math.random() < 0.5 ? 0 : this.height) : Math.random() * this.height;
      this.rocks.push(this.makeRock(x, y, 3));
    }
  }

  private makeRock(x: number, y: number, size: 3 | 2 | 1): Rock {
    const speed = (28 + Math.random() * 26) * (1 + (3 - size) * 0.35);
    const a = Math.random() * Math.PI * 2;
    const shape: number[] = [];
    const pts = 9;
    for (let i = 0; i < pts; i++) shape.push(0.7 + Math.random() * 0.45);
    return {
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: size === 3 ? 22 : size === 2 ? 13 : 7,
      size,
      spin: (Math.random() - 0.5) * 2,
      rot: 0,
      shape,
    };
  }

  protected onKeyDown(key: string): void {
    if (this.dead) {
      if (key === ' ' || key === 'enter') this.restart();
    }
  }

  private fire(): void {
    if (this.respawn > 0) return;
    this.bullets.push({
      x: this.sx + Math.cos(this.angle) * 10,
      y: this.sy + Math.sin(this.angle) * 10,
      vx: Math.cos(this.angle) * 300 + this.svx,
      vy: Math.sin(this.angle) * 300 + this.svy,
      life: 0.8,
    });
    this.fireT = 0.22;
    this.tone(680, 0.05, 'square', 0.05);
  }

  protected update(dt: number): void {
    if (this.dead) return;

    if (this.respawn > 0) {
      this.respawn -= dt;
      if (this.respawn <= 0) {
        this.sx = this.width / 2;
        this.sy = this.height / 2;
        this.svx = 0;
        this.svy = 0;
        this.angle = -Math.PI / 2;
        this.invuln = 1.5;
      }
    } else {
      if (this.key('arrowleft') || this.key('a')) this.angle -= 3.4 * dt;
      if (this.key('arrowright') || this.key('d')) this.angle += 3.4 * dt;
      this.thrusting = this.key('arrowup') || this.key('w');
      if (this.thrusting) {
        this.svx += Math.cos(this.angle) * 200 * dt;
        this.svy += Math.sin(this.angle) * 200 * dt;
        if (Math.random() < 0.3) this.tone(110, 0.03, 'sawtooth', 0.03);
      }
      // drag + speed cap
      this.svx *= 1 - 0.5 * dt;
      this.svy *= 1 - 0.5 * dt;
      const sp = Math.hypot(this.svx, this.svy);
      const max = 220;
      if (sp > max) {
        this.svx = (this.svx / sp) * max;
        this.svy = (this.svy / sp) * max;
      }
      this.sx = this.wrap(this.sx + this.svx * dt, this.width);
      this.sy = this.wrap(this.sy + this.svy * dt, this.height);

      this.fireT -= dt;
      if (this.fireT <= 0 && this.isAction()) this.fire();
      if (this.invuln > 0) this.invuln -= dt;
    }

    // bullets
    for (const b of this.bullets) {
      b.x = this.wrap(b.x + b.vx * dt, this.width);
      b.y = this.wrap(b.y + b.vy * dt, this.height);
      b.life -= dt;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    // rocks
    for (const r of this.rocks) {
      r.x = this.wrap(r.x + r.vx * dt, this.width);
      r.y = this.wrap(r.y + r.vy * dt, this.height);
      r.rot += r.spin * dt;
    }

    // bullet-rock collisions
    const newRocks: Rock[] = [];
    for (const r of this.rocks) {
      let hit = false;
      for (const b of this.bullets) {
        if (b.life > 0 && Math.hypot(r.x - b.x, r.y - b.y) < r.r) {
          hit = true;
          b.life = 0;
          break;
        }
      }
      if (hit) {
        this.addScore(r.size === 3 ? 20 : r.size === 2 ? 50 : 100);
        this.noise(0.08, 0.06);
        if (r.size > 1) {
          const ns = (r.size - 1) as 2 | 1;
          newRocks.push(this.makeRock(r.x, r.y, ns), this.makeRock(r.x, r.y, ns));
        }
      } else {
        newRocks.push(r);
      }
    }
    this.rocks = newRocks;
    this.bullets = this.bullets.filter((b) => b.life > 0);

    // ship-rock collision
    if (this.respawn <= 0 && this.invuln <= 0) {
      for (const r of this.rocks) {
        if (Math.hypot(r.x - this.sx, r.y - this.sy) < r.r + 6) {
          this.loseLife();
          break;
        }
      }
    }

    if (this.rocks.length === 0) {
      this.wave++;
      this.spawnWave();
      this.tone(760, 0.15);
    }
  }

  private loseLife(): void {
    this.lives--;
    this.noise(0.25, 0.1);
    this.tone(140, 0.3);
    if (this.lives <= 0) {
      this.dead = true;
      this.gameOver();
    } else {
      this.respawn = 1.2;
    }
  }

  private wrap(v: number, max: number): number {
    if (v < 0) return v + max;
    if (v >= max) return v - max;
    return v;
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#05060f');
    // stars
    g.fillStyle = '#1b2240';
    for (let i = 0; i < 40; i++) {
      const x = (i * 71) % this.width;
      const y = (i * 53) % this.height;
      g.fillRect(x, y, 1, 1);
    }

    // rocks
    g.strokeStyle = '#b9c3e6';
    g.lineWidth = 1.5;
    for (const r of this.rocks) {
      g.beginPath();
      for (let i = 0; i < r.shape.length; i++) {
        const a = r.rot + (i / r.shape.length) * Math.PI * 2;
        const rad = r.r * r.shape[i];
        const px = r.x + Math.cos(a) * rad;
        const py = r.y + Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke();
    }

    // bullets
    g.fillStyle = '#ffe600';
    for (const b of this.bullets) g.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);

    // ship
    if (this.respawn <= 0 && !(this.invuln > 0 && Math.floor(this.invuln * 10) % 2 === 0)) {
      g.save();
      g.translate(this.sx, this.sy);
      g.rotate(this.angle);
      g.strokeStyle = '#00f5ff';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(10, 0);
      g.lineTo(-8, -6);
      g.lineTo(-4, 0);
      g.lineTo(-8, 6);
      g.closePath();
      g.stroke();
      if (this.thrusting) {
        g.strokeStyle = '#ff6b35';
        g.beginPath();
        g.moveTo(-4, 0);
        g.lineTo(-12 - Math.random() * 4, 0);
        g.stroke();
      }
      g.restore();
    }

    // HUD
    this.drawText(`SCORE ${this.score}`, 6, 12, '#00f5ff', 7);
    this.drawText(`WAVE ${this.wave}`, this.width - 70, 12, '#ffe600', 7);
    for (let i = 0; i < this.lives; i++) {
      g.strokeStyle = '#00f5ff';
      g.lineWidth = 1.5;
      const lx = 8 + i * 12;
      g.beginPath();
      g.moveTo(lx, this.height - 6);
      g.lineTo(lx - 4, this.height - 16);
      g.lineTo(lx + 4, this.height - 16);
      g.closePath();
      g.stroke();
    }

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
