import { BaseEngine } from './base';
import type { EngineContext } from '../types';

interface Hole {
  x: number;
  y: number;
  state: 'empty' | 'up' | 'bonk';
  timer: number;
  kind: 'mole' | 'bomb';
}

const COLS = 3;
const ROWS = 3;
const ROUND = 60;

export class WhackEngine extends BaseEngine {
  private holes: Hole[] = [];
  private spawnT = 0;
  private timeLeft = ROUND;
  private misses = 0;
  private combo = 0;
  private dead = false;
  private padHole = 4;

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
    this.holes = [];
    const ox = 40;
    const oy = 48;
    const gx = (this.width - ox * 2) / (COLS - 1);
    const gy = (this.height - oy - 30) / (ROWS - 1);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        this.holes.push({ x: ox + c * gx, y: oy + r * gy, state: 'empty', timer: 0, kind: 'mole' });
      }
    this.spawnT = 0.6;
    this.timeLeft = ROUND * this.levelCfg.timeMul;
    this.misses = 0;
    this.combo = 0;
    this.dead = false;
    this.score = 0;
  }

  private movePadHole(dc: number, dr: number): void {
    let col = this.padHole % COLS;
    let row = Math.floor(this.padHole / COLS);
    col = Math.max(0, Math.min(COLS - 1, col + dc));
    row = Math.max(0, Math.min(ROWS - 1, row + dr));
    this.padHole = row * COLS + col;
  }

  protected onKeyDown(key: string): void {
    if (this.dead && (key === ' ' || key === 'enter')) this.restart();
    if (this.dead) return;
    if (key === 'arrowleft') this.movePadHole(-1, 0);
    else if (key === 'arrowright') this.movePadHole(1, 0);
    else if (key === 'arrowup') this.movePadHole(0, -1);
    else if (key === 'arrowdown') this.movePadHole(0, 1);
    else if (key === ' ' || key === 'enter') {
      const h = this.holes[this.padHole];
      if (h) this.handlePointer(h.x * this.scale, h.y * this.scale);
    }
  }

  handlePointer(cxp: number, cyp: number): void {
    if (this.dead) {
      this.restart();
      return;
    }
    const x = cxp / this.scale;
    const y = cyp / this.scale;
    let hitSomething = false;
    for (const h of this.holes) {
      if (h.state === 'up' && Math.hypot(h.x - x, h.y - (y + 6)) < 24) {
        hitSomething = true;
        if (h.kind === 'bomb') {
          h.state = 'bonk';
          h.timer = 0.4;
          this.combo = 0;
          this.addScore(-15);
          if (this.score < 0) this.score = 0;
          this.ctx.onScoreChange(this.score);
          this.noise(0.2, 0.1);
          this.tone(120, 0.25);
        } else {
          h.state = 'bonk';
          h.timer = 0.25;
          this.combo++;
          this.addScore(10 + Math.min(20, this.combo * 2));
          this.tone(700 + this.combo * 20, 0.06);
        }
        break;
      }
    }
    if (!hitSomething) {
      this.combo = 0;
    }
  }

  private spawnMole(): void {
    const empty = this.holes.filter((h) => h.state === 'empty');
    if (!empty.length) return;
    const h = empty[Math.floor(Math.random() * empty.length)];
    h.state = 'up';
    h.kind = Math.random() < 0.18 ? 'bomb' : 'mole';
    const fast = 1 - Math.min(0.5, (ROUND - this.timeLeft) / ROUND);
    h.timer = 0.7 + Math.random() * 0.8 * fast;
  }

  protected update(dt: number): void {
    if (this.dead) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.dead = true;
      this.tone(200, 0.3);
      this.gameOver();
      return;
    }

    for (const h of this.holes) {
      if (h.state === 'empty') continue;
      h.timer -= dt;
      if (h.timer <= 0) {
        if (h.state === 'up') {
          if (h.kind === 'mole') {
            this.misses++;
            this.combo = 0;
          }
          h.state = 'empty';
          h.timer = 0.2 + Math.random() * 0.6;
        } else {
          h.state = 'empty';
          h.timer = 0.2 + Math.random() * 0.5;
        }
      }
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnMole();
      const difficulty = 1 - Math.min(0.6, (ROUND - this.timeLeft) / ROUND);
      this.spawnT = (0.45 + Math.random() * 0.6) * difficulty + 0.18;
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#13240f');

    for (const h of this.holes) {
      // hole
      g.fillStyle = '#0a160a';
      g.beginPath();
      g.ellipse(h.x, h.y + 10, 24, 10, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#241a10';
      g.beginPath();
      g.ellipse(h.x, h.y + 10, 20, 7, 0, 0, Math.PI * 2);
      g.fill();

      if (h.state === 'up' || h.state === 'bonk') {
        if (h.kind === 'bomb') {
          g.fillStyle = h.state === 'bonk' ? '#ff5a3c' : '#222';
          g.beginPath();
          g.arc(h.x, h.y, 13, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#ffe600';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(h.x, h.y - 13);
          g.lineTo(h.x + 5, h.y - 20);
          g.stroke();
        } else {
          g.fillStyle = h.state === 'bonk' ? '#ffd0d0' : '#8a5a2b';
          g.beginPath();
          g.arc(h.x, h.y, 14, Math.PI, 0);
          g.fill();
          g.fillRect(h.x - 14, h.y, 28, 12);
          g.fillStyle = '#3a2410';
          g.fillRect(h.x - 6, h.y - 4, 3, 3);
          g.fillRect(h.x + 3, h.y - 4, 3, 3);
          g.fillStyle = '#ff9aa2';
          g.fillRect(h.x - 2, h.y + 1, 4, 3);
        }
      }
    }

    if (!this.dead && this.holes[this.padHole]) {
      const h = this.holes[this.padHole];
      g.strokeStyle = '#39ff14';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(h.x, h.y, 26, 0, Math.PI * 2);
      g.stroke();
    }

    // HUD
    g.fillStyle = '#000';
    g.fillRect(0, 0, this.width, 16);
    this.drawText(`SCORE ${this.score}`, 4, 11, '#ffe600', 7);
    this.drawText(`TIME ${Math.ceil(this.timeLeft)}`, 150, 11, this.timeLeft < 10 ? '#ff3b6b' : '#00f5ff', 7);
    if (this.combo > 1) this.drawText(`x${this.combo}`, this.width - 40, 11, '#39ff14', 7);
    this.drawText('D-pad + A whack — avoid bombs!', this.width / 2 - 88, this.height - 8, '#9ab87f', 6);

    if (this.dead) {
      g.fillStyle = 'rgba(0,0,0,0.8)';
      g.fillRect(0, 0, this.width, this.height);
      this.center('TIME UP!', this.height / 2 - 16, '#ffe600', 14);
      this.center(`SCORE ${this.score}`, this.height / 2 + 6, '#00f5ff', 10);
      this.center('TAP / SPACE TO PLAY AGAIN', this.height / 2 + 28, '#39ff14', 7);
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
