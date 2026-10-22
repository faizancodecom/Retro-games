import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getSnakeConfig } from '../games/configs';
import { levelSpeed } from './levelScale';

type Dir = { x: number; y: number };

export class SnakeEngine extends BaseEngine {
  private cfg = getSnakeConfig('');
  private cell = 0;
  private snake: { x: number; y: number }[] = [];
  private dir: Dir = { x: 1, y: 0 };
  private nextDir: Dir = { x: 1, y: 0 };
  private food = { x: 0, y: 0 };
  private tick = 0;
  private dead = false;
  private foodEaten = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getSnakeConfig(ctx.configId);
  }

  protected init(): void {
    this.cell = Math.floor(this.width / this.cfg.grid);
    const mid = Math.floor(this.cfg.grid / 2);
    this.snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.spawnFood();
    this.tick = 0;
    this.dead = false;
    this.score = 0;
    this.foodEaten = 0;
  }

  protected checkLevelWin(): boolean {
    const need = 4 + this.diffLevel * 2;
    return this.foodEaten >= need;
  }

  private spawnFood(): void {
    const free: { x: number; y: number }[] = [];
    for (let x = 0; x < this.cfg.grid; x++)
      for (let y = 0; y < this.cfg.grid; y++)
        if (!this.snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    this.food = free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }
    if (this.key('arrowup') || this.key('w')) this.setDir(0, -1);
    if (this.key('arrowdown') || this.key('s')) this.setDir(0, 1);
    if (this.key('arrowleft') || this.key('a')) this.setDir(-1, 0);
    if (this.key('arrowright') || this.key('d')) this.setDir(1, 0);

    this.tick += dt;
    const spd = this.cfg.speed * levelSpeed(this.diffLevel);
    if (this.tick < 1 / spd) return;
    this.tick = 0;
    this.dir = this.nextDir;
    const head = this.snake[0];
    const nh = { x: head.x + this.dir.x, y: head.y + this.dir.y };
    if (this.cfg.walls) {
      if (nh.x < 0 || nh.y < 0 || nh.x >= this.cfg.grid || nh.y >= this.cfg.grid) {
        this.dead = true;
        this.gameOver();
        return;
      }
    } else {
      nh.x = (nh.x + this.cfg.grid) % this.cfg.grid;
      nh.y = (nh.y + this.cfg.grid) % this.cfg.grid;
    }
    if (this.snake.some((s) => s.x === nh.x && s.y === nh.y)) {
      this.dead = true;
      this.gameOver();
      return;
    }
    this.snake.unshift(nh);
    if (nh.x === this.food.x && nh.y === this.food.y) {
      this.foodEaten++;
      this.addScore(10);
      this.spawnFood();
      this.playBeep(660);
      this.tryLevelComplete();
    } else {
      this.snake.pop();
    }
  }

  private setDir(x: number, y: number): void {
    if (this.dir.x + x === 0 && this.dir.y + y === 0) return;
    this.nextDir = { x, y };
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    const cs = this.cell;
    g.fillStyle = this.cfg.food;
    g.fillRect(this.food.x * cs + 1, this.food.y * cs + 1, cs - 2, cs - 2);
    this.snake.forEach((s, i) => {
      g.fillStyle = i === 0 ? this.cfg.head : this.cfg.body;
      g.fillRect(s.x * cs + 1, s.y * cs + 1, cs - 2, cs - 2);
    });
    this.drawText(String(this.score), 8, 12, '#fff', 8);
    this.drawText(`EAT ${4 + this.diffLevel * 2}`, 8, 24, '#ffe600', 6);
    if (this.dead) this.drawOverlay('GAME OVER', 'SPACE TO RESTART');
  }
}
