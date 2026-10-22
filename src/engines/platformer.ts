import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getPlatformerConfig } from '../games/configs';

interface Platform {
  x: number;
  y: number;
  w: number;
}

export class PlatformerEngine extends BaseEngine {
  private cfg = getPlatformerConfig('');
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private platforms: Platform[] = [];
  private coins: { x: number; y: number; taken: boolean }[] = [];
  private spikes: { x: number; y: number }[] = [];
  private dead = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getPlatformerConfig(ctx.configId);
  }

  protected init(): void {
    this.px = 20;
    this.py = this.height - 60;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.score = 0;
    const seed = this.cfg.levelSeed;
    this.platforms = [
      { x: 0, y: this.height - 16, w: this.width },
      { x: 60 + seed * 5, y: 170, w: 60 },
      { x: 150, y: 130, w: 50 },
      { x: 220, y: 90, w: 70 },
      { x: 40, y: 100, w: 40 },
    ];
    this.coins = this.platforms.slice(1).map((p) => ({
      x: p.x + p.w / 2,
      y: p.y - 12,
      taken: false,
    }));
    this.spikes = [
      { x: 100 + seed * 3, y: this.height - 24 },
      { x: 200, y: this.height - 24 },
    ];
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }
    if (this.key('arrowleft') || this.key('a')) this.vx = -this.cfg.moveSpeed;
    else if (this.key('arrowright') || this.key('d')) this.vx = this.cfg.moveSpeed;
    else this.vx = 0;
    if ((this.key(' ') || this.isAction()) && this.onGround()) {
      this.vy = this.cfg.jump;
      this.playBeep(500);
    }
    this.vy += this.cfg.gravity * dt;
    this.px += this.vx * dt;
    this.py += this.vy * dt;
    if (this.px < 0) this.px = 0;
    if (this.px > this.width - 12) this.px = this.width - 12;

    let grounded = false;
    for (const p of this.platforms) {
      if (
        this.px + 10 > p.x &&
        this.px < p.x + p.w &&
        this.py + 14 >= p.y &&
        this.py + 14 <= p.y + 12 &&
        this.vy >= 0
      ) {
        this.py = p.y - 14;
        this.vy = 0;
        grounded = true;
      }
    }
    if (this.py > this.height) {
      this.dead = true;
      this.gameOver();
    }
    for (const c of this.coins) {
      if (!c.taken && Math.hypot(this.px + 6 - c.x, this.py + 6 - c.y) < 14) {
        c.taken = true;
        this.addScore(50);
        this.playBeep(880);
      }
    }
    for (const s of this.spikes) {
      if (Math.hypot(this.px + 6 - s.x, this.py + 6 - s.y) < 12) {
        this.dead = true;
        this.gameOver();
      }
    }
    void grounded;
  }

  private onGround(): boolean {
    for (const p of this.platforms) {
      if (Math.abs(this.py + 14 - p.y) < 2 && this.px + 10 > p.x && this.px < p.x + p.w) return true;
    }
    return false;
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    g.fillStyle = '#444';
    for (const p of this.platforms) g.fillRect(p.x, p.y, p.w, 8);
    g.fillStyle = '#ffe600';
    for (const c of this.coins) {
      if (!c.taken) g.fillRect(c.x - 4, c.y - 4, 8, 8);
    }
    g.fillStyle = '#ff0000';
    for (const s of this.spikes) {
      g.beginPath();
      g.moveTo(s.x - 6, s.y + 8);
      g.lineTo(s.x, s.y);
      g.lineTo(s.x + 6, s.y + 8);
      g.fill();
    }
    g.fillStyle = this.cfg.playerColor;
    g.fillRect(this.px, this.py, 12, 14);
    this.drawText(String(this.score), 8, 8, '#fff', 8);
    if (this.dead) this.drawOverlay('GAME OVER', 'RESTART');
  }
}
