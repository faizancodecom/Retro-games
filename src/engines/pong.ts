import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getPongConfig } from '../games/configs';

export class PongEngine extends BaseEngine {
  private cfg = getPongConfig('');
  private playerY = 0;
  private aiY = 0;
  private ball = { x: 0, y: 0, vx: 0, vy: 0 };
  private paddleH = 40;
  private playerScore = 0;
  private aiScore = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getPongConfig(ctx.configId);
  }

  protected init(): void {
    this.playerY = this.height / 2 - this.paddleH / 2;
    this.aiY = this.height / 2 - this.paddleH / 2;
    this.resetBall(1);
    this.playerScore = 0;
    this.aiScore = 0;
    this.score = 0;
  }

  private resetBall(dir: number): void {
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      vx: dir * this.cfg.ballSpeed,
      vy: (Math.random() - 0.5) * this.cfg.ballSpeed,
    };
  }

  protected update(dt: number): void {
    if (this.key('arrowup') || this.key('w')) this.playerY -= this.cfg.paddleSpeed * dt;
    if (this.key('arrowdown') || this.key('s')) this.playerY += this.cfg.paddleSpeed * dt;
    this.playerY = Math.max(0, Math.min(this.height - this.paddleH, this.playerY));

    const target = this.ball.y - this.paddleH / 2;
    this.aiY += (target - this.aiY) * this.cfg.aiDifficulty * dt * 3;
    this.aiY = Math.max(0, Math.min(this.height - this.paddleH, this.aiY));

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    if (this.ball.y < 4 || this.ball.y > this.height - 4) this.ball.vy *= -1;

    const px = 8;
    const ax = this.width - 16;
    if (this.ball.x < px + 8 && this.ball.y > this.playerY && this.ball.y < this.playerY + this.paddleH) {
      this.ball.vx = Math.abs(this.ball.vx);
      this.ball.vy += (this.ball.y - (this.playerY + this.paddleH / 2)) * 2;
      this.playBeep(400);
    }
    if (this.ball.x > ax - 8 && this.ball.y > this.aiY && this.ball.y < this.aiY + this.paddleH) {
      this.ball.vx = -Math.abs(this.ball.vx);
      this.playBeep(400);
    }
    if (this.ball.x < 0) {
      this.aiScore++;
      this.resetBall(1);
    }
    if (this.ball.x > this.width) {
      this.playerScore++;
      this.addScore(1);
      this.resetBall(-1);
    }
    this.score = this.playerScore;
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    g.fillStyle = this.cfg.playerColor;
    g.fillRect(8, this.playerY, 8, this.paddleH);
    g.fillStyle = this.cfg.aiColor;
    g.fillRect(this.width - 16, this.aiY, 8, this.paddleH);
    g.fillStyle = '#ffe600';
    g.beginPath();
    g.arc(this.ball.x, this.ball.y, 5, 0, Math.PI * 2);
    g.fill();
    this.drawText(`${this.playerScore} - ${this.aiScore}`, this.width / 2 - 30, 8, '#fff', 8);
  }
}
