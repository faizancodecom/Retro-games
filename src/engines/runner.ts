import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getRunnerConfig } from '../games/configs';
import { playGameSfx } from '../app/gameSfx';
import { levelSpeed } from './levelScale';

interface Obstacle {
  x: number;
  h: number;
}

export class RunnerEngine extends BaseEngine {
  private cfg = getRunnerConfig('');
  private playerY = 0;
  private playerVy = 0;
  private jumpsUsed = 0;
  private maxJumps = 2;
  private obstacles: Obstacle[] = [];
  private obsTimer = 0;
  private dead = false;
  private surviveT = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getRunnerConfig(ctx.configId);
  }

  private jump(): void {
    if (this.jumpsUsed >= this.maxJumps) return;
    // air (double) jump is slightly weaker so it feels like a boost
    const force = this.jumpsUsed === 0 ? this.cfg.jumpForce : this.cfg.jumpForce * 0.85;
    this.playerVy = force;
    this.jumpsUsed++;
    playGameSfx('jump', this.muted);
  }

  protected onTap(): void {
    if (this.dead) {
      this.restart();
      return;
    }
    this.jump();
  }

  protected onKeyDown(key: string): void {
    if (this.dead) return;
    if (key === ' ' || key === 'arrowup' || key === 'w' || key === 'enter') this.jump();
  }

  protected init(): void {
    this.playerY = this.height - 40;
    this.playerVy = 0;
    this.jumpsUsed = 0;
    this.obstacles = [];
    this.obsTimer = 0;
    this.dead = false;
    this.score = 0;
    this.surviveT = 0;
  }

  protected checkLevelWin(): boolean {
    return this.surviveT >= 18 + this.diffLevel * 6;
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }

    this.playerVy += this.cfg.gravity * dt;
    this.playerY += this.playerVy * dt;
    const ground = this.height - 40;
    if (this.playerY >= ground) {
      this.playerY = ground;
      this.playerVy = 0;
      this.jumpsUsed = 0;
    }

    this.surviveT += dt;
    this.tryLevelComplete();
    const spd = this.cfg.speed * levelSpeed(this.diffLevel);
    const rate = Math.max(0.55, this.cfg.obstacleRate - this.diffLevel * 0.04);
    this.obsTimer += dt;
    if (this.obsTimer > rate) {
      this.obsTimer = 0;
      this.obstacles.push({ x: this.width + 10, h: 20 + Math.random() * 25 });
    }
    for (const o of this.obstacles) o.x -= spd * dt;
    this.obstacles = this.obstacles.filter((o) => o.x > -30);

    const px = 40;
    const py = this.playerY;
    for (const o of this.obstacles) {
      if (px + 10 > o.x && px - 10 < o.x + 16 && py + 12 > ground - o.h) {
        this.dead = true;
        this.gameOver();
        return;
      }
      if (o.x + 16 < px - 20 && !(o as Obstacle & { scored?: boolean }).scored) {
        (o as Obstacle & { scored?: boolean }).scored = true;
        this.addScore(5);
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x > -50);
    if (Math.random() < dt * 2) this.addScore(1);
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    const ground = this.height - 40;
    g.fillStyle = this.cfg.groundColor;
    g.fillRect(0, ground, this.width, 40);
    for (const o of this.obstacles) {
      g.fillStyle = '#ff00aa';
      g.fillRect(o.x, ground - o.h, 16, o.h);
    }
    g.fillStyle = this.cfg.playerColor;
    g.fillRect(30, this.playerY - 14, 20, 14);
    this.drawText(String(this.score), 8, 8, '#fff', 8);
    if (this.dead) this.drawOverlay('GAME OVER', 'TAP RESTART');
  }
}
