import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getRacingConfig } from '../games/configs';

interface Car {
  x: number;
  y: number;
  lane: number;
}

export class RacingEngine extends BaseEngine {
  private cfg = getRacingConfig('');
  private playerLane = 1;
  private traffic: Car[] = [];
  private trafficTimer = 0;
  private roadOffset = 0;
  private dead = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getRacingConfig(ctx.configId);
  }

  protected init(): void {
    this.playerLane = Math.floor(this.cfg.lanes / 2);
    this.traffic = [];
    this.trafficTimer = 0;
    this.roadOffset = 0;
    this.dead = false;
    this.score = 0;
  }

  private laneX(lane: number): number {
    const roadW = 120;
    const ox = (this.width - roadW) / 2;
    const laneW = roadW / this.cfg.lanes;
    return ox + lane * laneW + laneW / 2;
  }

  protected onKeyDown(key: string): void {
    if (this.dead) {
      if (key === ' ' || key === 'enter') this.restart();
      return;
    }
    if (key === 'arrowleft' || key === 'a') this.playerLane = Math.max(0, this.playerLane - 1);
    else if (key === 'arrowright' || key === 'd') this.playerLane = Math.min(this.cfg.lanes - 1, this.playerLane + 1);
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }

    this.roadOffset += this.cfg.speed * dt;
    this.trafficTimer += dt;
    if (this.trafficTimer > this.cfg.trafficRate) {
      this.trafficTimer = 0;
      this.traffic.push({
        x: this.laneX(Math.floor(Math.random() * this.cfg.lanes)),
        y: -30,
        lane: 0,
      });
    }
    for (const car of this.traffic) car.y += this.cfg.speed * dt;
    this.traffic = this.traffic.filter((c) => c.y < this.height + 30);

    const px = this.laneX(this.playerLane);
    const py = this.height - 50;
    for (const car of this.traffic) {
      if (Math.abs(car.x - px) < 20 && Math.abs(car.y - py) < 24) {
        this.dead = true;
        this.gameOver();
        return;
      }
      if (car.y > this.height) this.addScore(10);
    }
    this.addScore(Math.floor(dt * 5));
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    const roadW = 120;
    const ox = (this.width - roadW) / 2;
    g.fillStyle = this.cfg.roadColor;
    g.fillRect(ox, 0, roadW, this.height);
    g.strokeStyle = '#ffe600';
    for (let i = 0; i < 10; i++) {
      const y = ((i * 30 + this.roadOffset) % (this.height + 30)) - 15;
      g.fillRect(this.width / 2 - 2, y, 4, 15);
    }
    g.fillStyle = '#888';
    for (const car of this.traffic) {
      g.fillRect(car.x - 12, car.y, 24, 20);
    }
    g.fillStyle = this.cfg.playerColor;
    g.fillRect(this.laneX(this.playerLane) - 12, this.height - 50, 24, 20);
    this.drawText(String(this.score), 8, 8, '#fff', 8);
    if (this.dead) this.drawOverlay('CRASH!', 'RESTART');
  }
}
