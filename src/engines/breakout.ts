import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getBreakoutConfig } from '../games/configs';
import { levelBonus, levelSpeed } from './levelScale';

export class BreakoutEngine extends BaseEngine {
  private cfg = getBreakoutConfig('');
  private paddleX = 0;
  private ball = { x: 0, y: 0, vx: 0, vy: 0 };
  private bricks: boolean[][] = [];
  private brickW = 0;
  private brickH = 8;
  private dead = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getBreakoutConfig(ctx.configId);
  }

  protected init(): void {
    this.cfg = getBreakoutConfig(this.ctx.configId);
    this.brickW = Math.floor((this.width - 20) / this.cfg.cols);
    const rows = this.cfg.rows + levelBonus(this.diffLevel, 1, 5);
    this.bricks = Array.from({ length: rows }, () => Array(this.cfg.cols).fill(true));
    const spd = this.cfg.ballSpeed * levelSpeed(this.diffLevel);
    this.paddleX = this.width / 2 - Math.max(28, this.cfg.paddleWidth - levelBonus(this.diffLevel, 2, 16)) / 2;
    this.ball = { x: this.width / 2, y: this.height - 40, vx: spd * 0.6, vy: -spd };
    this.dead = false;
    this.score = 0;
  }

  protected checkLevelWin(): boolean {
    return this.bricks.every((row) => row.every((b) => !b));
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }
    const speed = 200;
    if (this.key('arrowleft') || this.key('a')) this.paddleX -= speed * dt;
    if (this.key('arrowright') || this.key('d')) this.paddleX += speed * dt;
    this.paddleX = Math.max(0, Math.min(this.width - this.cfg.paddleWidth, this.paddleX));

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    if (this.ball.x < 4 || this.ball.x > this.width - 4) this.ball.vx *= -1;
    if (this.ball.y < 4) this.ball.vy *= -1;
    if (this.ball.y > this.height) {
      this.dead = true;
      this.gameOver();
      return;
    }
    const py = this.height - 24;
    if (
      this.ball.y + 4 >= py &&
      this.ball.y - 4 <= py + 8 &&
      this.ball.x >= this.paddleX &&
      this.ball.x <= this.paddleX + this.cfg.paddleWidth
    ) {
      this.ball.vy = -Math.abs(this.ball.vy);
      const hit = (this.ball.x - this.paddleX) / this.cfg.paddleWidth - 0.5;
      this.ball.vx = hit * this.cfg.ballSpeed;
      this.playBeep(300);
    }
    const ox = 10;
    const oy = 20;
    for (let r = 0; r < this.cfg.rows; r++)
      for (let c = 0; c < this.cfg.cols; c++) {
        if (!this.bricks[r][c]) continue;
        const bx = ox + c * this.brickW;
        const by = oy + r * this.brickH;
        if (
          this.ball.x + 4 > bx &&
          this.ball.x - 4 < bx + this.brickW &&
          this.ball.y + 4 > by &&
          this.ball.y - 4 < by + this.brickH
        ) {
          this.bricks[r][c] = false;
          this.ball.vy *= -1;
          this.addScore(10);
          this.playBeep(500 + r * 50, 0.03);
        }
      }
    if (this.checkLevelWin()) {
      this.addScore(500);
      this.tryLevelComplete();
    }
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    const ox = 10;
    const oy = 20;
    for (let r = 0; r < this.cfg.rows; r++)
      for (let c = 0; c < this.cfg.cols; c++) {
        if (!this.bricks[r][c]) continue;
        g.fillStyle = this.cfg.colors[(r + c) % this.cfg.colors.length];
        g.fillRect(ox + c * this.brickW, oy + r * this.brickH, this.brickW - 2, this.brickH - 2);
      }
    g.fillStyle = '#00f5ff';
    g.fillRect(this.paddleX, this.height - 24, this.cfg.paddleWidth, 8);
    g.fillStyle = '#ffe600';
    g.beginPath();
    g.arc(this.ball.x, this.ball.y, 4, 0, Math.PI * 2);
    g.fill();
    this.drawText(String(this.score), 8, 8, '#fff', 8);
    if (this.dead) this.drawOverlay('GAME OVER', 'RESTART');
  }
}
