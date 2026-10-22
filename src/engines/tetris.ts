import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getTetrisConfig } from '../games/configs';
import { playGameSfx } from '../app/gameSfx';
import { levelSpeed } from './levelScale';
import { readGamepadMove } from '../app/gamepad';

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];

export class TetrisEngine extends BaseEngine {
  private cfg = getTetrisConfig('');
  private board: number[][] = [];
  private piece: number[][] = [];
  private px = 0;
  private py = 0;
  private colorIdx = 0;
  private dropTimer = 0;
  private cols = 10;
  private rows = 20;
  private cell = 10;
  private dead = false;
  private linesCleared = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getTetrisConfig(ctx.configId);
  }

  protected init(): void {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.cell = Math.floor((this.height - 20) / this.rows);
    this.spawn();
    this.dead = false;
    this.score = 0;
    this.dropTimer = 0;
    this.linesCleared = 0;
  }

  protected checkLevelWin(): boolean {
    return this.linesCleared >= this.diffLevel * 4;
  }

  private spawn(): void {
    const idx = Math.floor(Math.random() * SHAPES.length);
    this.piece = SHAPES[idx].map((r) => [...r]);
    this.colorIdx = idx % this.cfg.colors.length;
    this.px = Math.floor(this.cols / 2) - 1;
    this.py = 0;
    if (this.collides(this.px, this.py, this.piece)) this.dead = true;
  }

  private collides(x: number, y: number, shape: number[][]): boolean {
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const bx = x + c;
        const by = y + r;
        if (bx < 0 || bx >= this.cols || by >= this.rows) return true;
        if (by >= 0 && this.board[by][bx]) return true;
      }
    return false;
  }

  private merge(): void {
    for (let r = 0; r < this.piece.length; r++)
      for (let c = 0; c < this.piece[r].length; c++) {
        if (!this.piece[r][c]) continue;
        const by = this.py + r;
        const bx = this.px + c;
        if (by >= 0) this.board[by][bx] = this.colorIdx + 1;
      }
    let cleared = 0;
    this.board = this.board.filter((row) => {
      if (row.every((v) => v)) {
        cleared++;
        return false;
      }
      return true;
    });
    while (this.board.length < this.rows) this.board.unshift(Array(this.cols).fill(0));
    if (cleared) {
      this.linesCleared += cleared;
      this.addScore(cleared * 100 * cleared);
      playGameSfx('clear', this.muted);
      this.playBeep(500 + cleared * 100);
      this.tryLevelComplete();
    }
    this.spawn();
  }

  private rotate(): void {
    const rot = this.piece[0].map((_, i) => this.piece.map((row) => row[i]).reverse());
    if (!this.collides(this.px, this.py, rot)) this.piece = rot;
  }

  protected update(dt: number): void {
    if (this.dead) {
      if (this.isAction()) this.restart();
      return;
    }
    if (this.key('arrowleft') || this.key('a')) {
      if (!this.collides(this.px - 1, this.py, this.piece)) this.px--;
    }
    if (this.key('arrowright') || this.key('d')) {
      if (!this.collides(this.px + 1, this.py, this.piece)) this.px++;
    }
    if (this.key('arrowup') || this.key('w')) this.rotate();
    const pad = readGamepadMove();
    if (this.key('arrowdown') || this.key('s') || pad.accelerate) this.dropTimer = 999;

    this.dropTimer += dt;
    const dropRate = this.cfg.dropSpeed / levelSpeed(this.diffLevel);
    if (this.dropTimer >= dropRate) {
      this.dropTimer = 0;
      if (!this.collides(this.px, this.py + 1, this.piece)) this.py++;
      else {
        this.merge();
        if (this.dead) this.gameOver();
      }
    }
  }

  private playfieldOrigin(): { ox: number; oy: number; pw: number; ph: number } {
    const pw = this.cols * this.cell;
    const ph = this.rows * this.cell;
    return {
      ox: (this.width - pw) / 2,
      oy: 16,
      pw,
      ph,
    };
  }

  private drawPlayfieldFrame(g: CanvasRenderingContext2D, ox: number, oy: number, pw: number, ph: number): void {
    g.fillStyle = '#080a14';
    g.fillRect(ox, oy, pw, ph);

    g.strokeStyle = 'rgba(0, 245, 255, 0.14)';
    g.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      const gx = ox + x * this.cell;
      g.beginPath();
      g.moveTo(gx, oy);
      g.lineTo(gx, oy + ph);
      g.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      const gy = oy + y * this.cell;
      g.beginPath();
      g.moveTo(ox, gy);
      g.lineTo(ox + pw, gy);
      g.stroke();
    }

    g.strokeStyle = '#ff00aa';
    g.lineWidth = 3;
    g.strokeRect(ox - 0.5, oy - 0.5, pw + 1, ph + 1);
    g.strokeStyle = '#00f5ff';
    g.lineWidth = 1;
    g.strokeRect(ox + 2, oy + 2, pw - 4, ph - 4);

    g.fillStyle = 'rgba(0, 0, 0, 0.35)';
    g.fillRect(0, 0, this.width, oy);
    g.fillRect(0, oy + ph, this.width, this.height - oy - ph);
    g.fillRect(0, oy, ox, ph);
    g.fillRect(ox + pw, oy, this.width - ox - pw, ph);
  }

  private drawCell(
    g: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    col: number,
    row: number,
    color: string
  ): void {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    const x = ox + col * this.cell;
    const y = oy + row * this.cell;
    const pad = 1;
    const s = this.cell - pad * 2;
    g.fillStyle = color;
    g.fillRect(x + pad, y + pad, s, s);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fillRect(x + pad, y + pad, s, 2);
    g.fillRect(x + pad, y + pad, 2, s);
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    const { ox, oy, pw, ph } = this.playfieldOrigin();
    this.drawPlayfieldFrame(g, ox, oy, pw, ph);

    g.save();
    g.beginPath();
    g.rect(ox, oy, pw, ph);
    g.clip();

    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) {
        const v = this.board[y][x];
        if (v) {
          this.drawCell(g, ox, oy, x, y, this.cfg.colors[(v - 1) % this.cfg.colors.length]);
        }
      }

    const cur = this.cfg.colors[this.colorIdx];
    for (let r = 0; r < this.piece.length; r++)
      for (let c = 0; c < this.piece[r].length; c++) {
        if (!this.piece[r][c]) continue;
        this.drawCell(g, ox, oy, this.px + c, this.py + r, cur);
      }
    g.restore();

    this.drawText(String(this.score), 8, 8, '#fff', 8);
    this.drawText(`LINES ${this.linesCleared}`, 8, 20, '#ffe600', 6);
    if (this.dead) this.drawOverlay('GAME OVER', 'RESTART');
  }
}
