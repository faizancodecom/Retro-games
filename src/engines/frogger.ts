import { BaseEngine } from './base';
import type { EngineContext } from '../types';

type RowType = 'safe' | 'road' | 'river' | 'goal';
interface Lane {
  type: RowType;
  dir: number;
  speed: number;
  len: number;
  items: number[];
  color: string;
}

const TOP = 16;
const CELL = 20;
const ROWS = 11;

export class FroggerEngine extends BaseEngine {
  private lanes: Lane[] = [];
  private fx = 160;
  private row = ROWS - 1;
  private lives = 3;
  private bestRow = ROWS - 1;
  private dead = false;
  private flash = 0;
  private goals = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = 320;
    this.height = TOP + ROWS * CELL;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  private goalsNeeded(): number {
    return 1 + Math.floor((this.diffLevel - 1) / 4);
  }

  protected checkLevelWin(): boolean {
    return this.goals >= this.goalsNeeded();
  }

  protected init(): void {
    this.lf = this.levelCfg.speed;
    this.lives = 3;
    this.dead = false;
    this.flash = 0;
    this.goals = 0;
    this.score = 0;
    this.buildLanes();
    this.resetFrog();
  }

  private buildLanes(): void {
    const carColors = ['#ff3b6b', '#ffe600', '#ff6b35', '#00f5ff'];
    this.lanes = [];
    for (let i = 0; i < ROWS; i++) {
      let type: RowType = 'safe';
      if (i === 0) type = 'goal';
      else if (i >= 1 && i <= 4) type = 'river';
      else if (i === 5) type = 'safe';
      else if (i >= 6 && i <= 9) type = 'road';
      else type = 'safe';

      if (type === 'river') {
        const dir = i % 2 === 0 ? 1 : -1;
        const len = CELL * (2 + (i % 2));
        const speed = 26 + i * 5;
        const items: number[] = [];
        const gap = len + 46;
        for (let x = -len; x < this.width + len; x += gap) items.push(x + Math.random() * 20);
        this.lanes.push({ type, dir, speed, len, items, color: '#7a4a22' });
      } else if (type === 'road') {
        const dir = i % 2 === 0 ? -1 : 1;
        const len = CELL - 2;
        const speed = 34 + i * 6;
        const items: number[] = [];
        const gap = len + 60 + (i % 3) * 14;
        for (let x = 0; x < this.width + gap; x += gap) items.push(x + Math.random() * 20);
        this.lanes.push({ type, dir, speed, len, items, color: carColors[i % carColors.length] });
      } else {
        this.lanes.push({ type, dir: 0, speed: 0, len: 0, items: [], color: '' });
      }
    }
  }

  private resetFrog(): void {
    this.fx = this.width / 2;
    this.row = ROWS - 1;
    this.bestRow = ROWS - 1;
  }

  private rowY(i: number): number {
    return TOP + i * CELL;
  }

  protected onKeyDown(key: string): void {
    if (this.dead) {
      if (key === ' ' || key === 'enter') this.restart();
      return;
    }
    if (key === 'arrowup' || key === 'w') this.hop(0, -1);
    else if (key === 'arrowdown' || key === 's') this.hop(0, 1);
    else if (key === 'arrowleft' || key === 'a') this.hop(-1, 0);
    else if (key === 'arrowright' || key === 'd') this.hop(1, 0);
  }

  handlePointer(): void {
    if (this.dead) this.restart();
  }

  private hop(dx: number, dy: number): void {
    if (dx) this.fx = Math.max(10, Math.min(this.width - 10, this.fx + dx * CELL));
    if (dy) {
      const nr = this.row + dy;
      if (nr < 0 || nr > ROWS - 1) return;
      this.row = nr;
      this.tone(520, 0.04);
      if (this.row < this.bestRow) {
        this.bestRow = this.row;
        this.addScore(10);
      }
      if (this.row === 0) this.reachGoal();
    }
  }

  private reachGoal(): void {
    this.goals++;
    this.addScore(50);
    this.tone(880, 0.15);
    this.resetFrog();
    this.tryLevelComplete();
  }

  private die(): void {
    this.lives--;
    this.flash = 0.3;
    this.noise(0.18, 0.09);
    this.tone(150, 0.25);
    if (this.lives <= 0) {
      this.dead = true;
      this.gameOver();
    } else {
      this.resetFrog();
    }
  }

  protected update(dt: number): void {
    if (this.dead) return;
    if (this.flash > 0) this.flash -= dt;

    for (const lane of this.lanes) {
      if (lane.type !== 'road' && lane.type !== 'river') continue;
      for (let k = 0; k < lane.items.length; k++) {
        lane.items[k] += lane.dir * lane.speed * dt;
        if (lane.dir > 0 && lane.items[k] > this.width + lane.len) lane.items[k] = -lane.len;
        if (lane.dir < 0 && lane.items[k] < -lane.len) lane.items[k] = this.width + lane.len;
      }
    }

    const lane = this.lanes[this.row];
    if (lane.type === 'river') {
      let onLog = false;
      for (const x of lane.items) {
        if (this.fx > x && this.fx < x + lane.len) {
          onLog = true;
          this.fx += lane.dir * lane.speed * dt;
          break;
        }
      }
      if (!onLog) {
        this.die();
        return;
      }
      if (this.fx < 4 || this.fx > this.width - 4) {
        this.die();
        return;
      }
    } else if (lane.type === 'road') {
      for (const x of lane.items) {
        if (this.fx + 8 > x && this.fx - 8 < x + lane.len) {
          this.die();
          return;
        }
      }
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#0a0a14');

    for (let i = 0; i < ROWS; i++) {
      const lane = this.lanes[i];
      const y = this.rowY(i);
      if (lane.type === 'goal') g.fillStyle = '#10401a';
      else if (lane.type === 'river') g.fillStyle = '#0d3a63';
      else if (lane.type === 'road') g.fillStyle = '#222';
      else g.fillStyle = '#15401d';
      g.fillRect(0, y, this.width, CELL);
    }

    // goal slots
    g.fillStyle = '#39ff14';
    for (let s = 0; s < 4; s++) {
      g.fillRect(28 + s * 80, this.rowY(0) + 3, 36, CELL - 6);
    }

    // logs / cars
    for (let i = 0; i < ROWS; i++) {
      const lane = this.lanes[i];
      const y = this.rowY(i);
      if (lane.type === 'river') {
        g.fillStyle = lane.color;
        for (const x of lane.items) {
          g.fillRect(x, y + 4, lane.len, CELL - 8);
          g.fillStyle = '#5d3617';
          g.fillRect(x, y + 4, lane.len, 2);
          g.fillStyle = lane.color;
        }
      } else if (lane.type === 'road') {
        for (const x of lane.items) {
          g.fillStyle = lane.color;
          g.fillRect(x, y + 3, lane.len, CELL - 6);
          g.fillStyle = '#ffffff';
          g.fillRect(x + (lane.dir > 0 ? lane.len - 4 : 1), y + 5, 3, 3);
        }
      }
    }

    // frog
    const fy = this.rowY(this.row) + CELL / 2;
    g.fillStyle = this.flash > 0 ? '#ff3b6b' : '#39ff14';
    g.fillRect(this.fx - 7, fy - 7, 14, 14);
    g.fillStyle = '#0a0a14';
    g.fillRect(this.fx - 4, fy - 4, 2, 2);
    g.fillRect(this.fx + 2, fy - 4, 2, 2);

    // HUD
    g.fillStyle = '#000';
    g.fillRect(0, 0, this.width, TOP);
    this.drawText(`SCORE ${this.score}`, 4, 11, '#00f5ff', 7);
    this.drawText(`HOMES ${this.goals}`, 150, 11, '#39ff14', 7);
    for (let i = 0; i < this.lives; i++) {
      g.fillStyle = '#39ff14';
      g.fillRect(this.width - 12 - i * 12, 4, 8, 8);
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
