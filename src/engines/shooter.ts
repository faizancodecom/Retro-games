import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getShooterConfig } from '../games/configs';
import { levelBonus, levelSpeed } from './levelScale';

interface Enemy {
  x: number;
  y: number;
  alive: boolean;
}
interface Bullet {
  x: number;
  y: number;
  vy: number;
  friendly: boolean;
}

export class ShooterEngine extends BaseEngine {
  private cfg = getShooterConfig('');
  private playerX = 0;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private fireTimer = 0;
  private enemyDir = 1;
  private enemyMoveTimer = 0;
  private dead = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getShooterConfig(ctx.configId);
  }

  protected init(): void {
    this.playerX = this.width / 2;
    this.enemies = [];
    const cols = 8;
    const rows = this.cfg.rows + levelBonus(this.diffLevel, 1, 4);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        this.enemies.push({ x: 30 + c * 28, y: 30 + r * 22, alive: true });
    this.bullets = [];
    this.fireTimer = 0;
    this.enemyDir = 1;
    this.dead = false;
    this.score = 0;
  }

  protected onTap(): void {
    this.fire();
  }

  private fire(): void {
    if (this.fireTimer > 0) return;
    this.bullets.push({ x: this.playerX, y: this.height - 30, vy: -200, friendly: true });
    if (this.cfg.spread) {
      this.bullets.push({ x: this.playerX - 10, y: this.height - 30, vy: -190, friendly: true });
      this.bullets.push({ x: this.playerX + 10, y: this.height - 30, vy: -190, friendly: true });
    }
    this.fireTimer = this.cfg.fireRate;
    this.playBeep(700, 0.03);
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }
    if (this.key('arrowleft') || this.key('a')) this.playerX -= 150 * dt;
    if (this.key('arrowright') || this.key('d')) this.playerX += 150 * dt;
    this.playerX = Math.max(16, Math.min(this.width - 16, this.playerX));
    if (this.isAction()) this.fire();
    this.fireTimer = Math.max(0, this.fireTimer - dt);

    this.enemyMoveTimer += dt;
    const moveInterval = 0.55 / levelSpeed(this.diffLevel);
    if (this.enemyMoveTimer > moveInterval) {
      this.enemyMoveTimer = 0;
      let edge = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        e.x += this.enemyDir * 8;
        if (e.x < 10 || e.x > this.width - 20) edge = true;
      }
      if (edge) {
        this.enemyDir *= -1;
        for (const e of this.enemies)
          if (e.alive) e.y += 12;
      }
      if (Math.random() < 0.02) {
        const alive = this.enemies.filter((e) => e.alive);
        if (alive.length) {
          const e = alive[Math.floor(Math.random() * alive.length)];
          this.bullets.push({ x: e.x, y: e.y + 10, vy: 120, friendly: false });
        }
      }
    }

    for (const b of this.bullets) b.y += b.vy * dt;
    this.bullets = this.bullets.filter((b) => b.y > 0 && b.y < this.height);

    for (const b of this.bullets) {
      if (b.friendly) {
        for (const e of this.enemies) {
          if (e.alive && Math.hypot(b.x - e.x, b.y - e.y) < 14) {
            e.alive = false;
            b.y = -999;
            this.addScore(100);
            this.playBeep(400);
          }
        }
      } else if (Math.hypot(b.x - this.playerX, b.y - (this.height - 24)) < 12) {
        this.dead = true;
        this.gameOver();
      }
    }

    for (const e of this.enemies) {
      if (e.alive && e.y > this.height - 50) {
        this.dead = true;
        this.gameOver();
      }
    }
    if (this.enemies.every((e) => !e.alive)) {
      this.addScore(500);
      this.tryLevelComplete();
    }
  }

  protected checkLevelWin(): boolean {
    return this.enemies.every((e) => !e.alive);
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    g.fillStyle = this.cfg.playerColor;
    g.fillRect(this.playerX - 12, this.height - 28, 24, 12);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      g.fillStyle = this.cfg.enemyColor;
      g.fillRect(e.x - 10, e.y - 8, 20, 14);
    }
    g.fillStyle = '#ffe600';
    for (const b of this.bullets) g.fillRect(b.x - 1, b.y - 4, 3, 8);
    this.drawText(String(this.score), 8, 8, '#fff', 8);
    if (this.dead) this.drawOverlay('GAME OVER', 'RESTART');
  }
}
