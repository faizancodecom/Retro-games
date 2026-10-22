import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { loadState, saveState } from '../app/storage';

type Cell = '' | 'X' | 'O';
type Mode = 'ai' | '2p';

interface Tally {
  wins: number;
  losses: number;
  draws: number;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export class TicTacToeEngine extends BaseEngine {
  private board: Cell[] = Array(9).fill('');
  private turn: 'X' | 'O' = 'X';
  private mode: Mode = 'ai';
  private over = false;
  private winLine: number[] | null = null;
  private message = '';
  private tally: Tally = { wins: 0, losses: 0, draws: 0 };
  private aiTimer = 0;
  private padIdx = 4;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = 220;
    this.height = 300;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    this.tally = loadState<Tally>('tictactoe', { wins: 0, losses: 0, draws: 0 });
    this.reset();
  }

  private reset(): void {
    this.board = Array(9).fill('');
    this.turn = 'X';
    this.over = false;
    this.winLine = null;
    this.message = this.mode === 'ai' ? 'Your turn (X)' : "X's turn";
    this.score = this.tally.wins;
    this.aiTimer = 0;
    this.padIdx = 4;
  }

  private movePad(dc: number, dr: number): void {
    let col = this.padIdx % 3;
    let row = Math.floor(this.padIdx / 3);
    col = Math.max(0, Math.min(2, col + dc));
    row = Math.max(0, Math.min(2, row + dr));
    this.padIdx = row * 3 + col;
  }

  private tapPadCell(): void {
    const top = 56;
    const size = 200;
    const ox = (this.width - size) / 2;
    const col = this.padIdx % 3;
    const row = Math.floor(this.padIdx / 3);
    const cx = (ox + (col + 0.5) * (size / 3)) * this.scale;
    const cy = (top + (row + 0.5) * (size / 3)) * this.scale;
    this.handlePointer(cx, cy);
  }

  protected onKeyDown(key: string): void {
    if (key === 'm') {
      this.mode = this.mode === 'ai' ? '2p' : 'ai';
      this.reset();
      return;
    }
    if (key === 'r') {
      this.reset();
      return;
    }
    if (this.over) {
      if (key === ' ' || key === 'enter') this.reset();
      return;
    }
    if (key === 'arrowleft') this.movePad(-1, 0);
    else if (key === 'arrowright') this.movePad(1, 0);
    else if (key === 'arrowup') this.movePad(0, -1);
    else if (key === 'arrowdown') this.movePad(0, 1);
    else if (key === ' ' || key === 'enter') this.tapPadCell();
  }

  handlePointer(cx: number, cy: number): void {
    const x = cx / this.scale;
    const y = cy / this.scale;
    if (this.over) {
      this.reset();
      return;
    }
    const top = 56;
    const size = 200;
    const ox = (this.width - size) / 2;
    if (y < top || y > top + size) return;
    const col = Math.floor((x - ox) / (size / 3));
    const row = Math.floor((y - top) / (size / 3));
    if (col < 0 || col > 2 || row < 0 || row > 2) return;
    const idx = row * 3 + col;
    if (this.board[idx]) return;
    if (this.mode === 'ai' && this.turn !== 'X') return;
    this.place(idx);
  }

  private place(idx: number): void {
    this.board[idx] = this.turn;
    this.tone(this.turn === 'X' ? 520 : 360, 0.05);
    if (this.checkEnd()) return;
    this.turn = this.turn === 'X' ? 'O' : 'X';
    this.message = this.mode === 'ai' ? (this.turn === 'X' ? 'Your turn (X)' : 'CPU thinking...') : `${this.turn}'s turn`;
    if (this.mode === 'ai' && this.turn === 'O') this.aiTimer = 0.4;
  }

  private checkEnd(): boolean {
    for (const line of LINES) {
      const [a, b, c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[b] === this.board[c]) {
        this.over = true;
        this.winLine = line;
        const winner = this.board[a];
        if (this.mode === 'ai') {
          if (winner === 'X') {
            this.tally.wins++;
            this.message = 'You win!';
            this.tone(880, 0.12);
          } else {
            this.tally.losses++;
            this.message = 'CPU wins!';
            this.tone(160, 0.2, 'sawtooth');
          }
        } else {
          this.message = `${winner} wins!`;
          this.tone(880, 0.12);
        }
        saveState('tictactoe', this.tally);
        this.score = this.tally.wins;
        return true;
      }
    }
    if (this.board.every((c) => c)) {
      this.over = true;
      this.tally.draws++;
      this.message = 'Draw!';
      saveState('tictactoe', this.tally);
      this.tone(300, 0.1);
      return true;
    }
    return false;
  }

  private minimax(board: Cell[], player: 'X' | 'O'): { score: number; move: number } {
    const winner = this.winnerOf(board);
    if (winner === 'O') return { score: 10, move: -1 };
    if (winner === 'X') return { score: -10, move: -1 };
    if (board.every((c) => c)) return { score: 0, move: -1 };

    let best = player === 'O' ? { score: -Infinity, move: -1 } : { score: Infinity, move: -1 };
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = player;
      const res = this.minimax(board, player === 'O' ? 'X' : 'O');
      board[i] = '';
      if (player === 'O' ? res.score > best.score : res.score < best.score) {
        best = { score: res.score, move: i };
      }
    }
    return best;
  }

  private winnerOf(board: Cell[]): Cell {
    for (const [a, b, c] of LINES)
      if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
    return '';
  }

  protected update(dt: number): void {
    if (this.over) return;
    if (this.mode === 'ai' && this.turn === 'O') {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        const { move } = this.minimax([...this.board], 'O');
        if (move >= 0) this.place(move);
      }
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#0a0a16');

    this.center(this.mode === 'ai' ? 'TIC TAC TOE — vs CPU' : 'TIC TAC TOE — 2P', 16, '#00f5ff', 8);
    this.center(this.message, 36, '#ffe600', 8);

    const top = 56;
    const size = 200;
    const ox = (this.width - size) / 2;
    const cell = size / 3;

    g.strokeStyle = '#ff00aa';
    g.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      g.beginPath();
      g.moveTo(ox + i * cell, top);
      g.lineTo(ox + i * cell, top + size);
      g.moveTo(ox, top + i * cell);
      g.lineTo(ox + size, top + i * cell);
      g.stroke();
    }

    if (!this.over) {
      const pc = this.padIdx % 3;
      const pr = Math.floor(this.padIdx / 3);
      g.strokeStyle = '#39ff14';
      g.lineWidth = 2;
      g.strokeRect(ox + pc * cell + 4, top + pr * cell + 4, cell - 8, cell - 8);
    }

    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      const x = ox + c * cell + cell / 2;
      const y = top + r * cell + cell / 2;
      if (this.board[i] === 'X') {
        g.strokeStyle = '#00f5ff';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x - 18, y - 18);
        g.lineTo(x + 18, y + 18);
        g.moveTo(x + 18, y - 18);
        g.lineTo(x - 18, y + 18);
        g.stroke();
      } else if (this.board[i] === 'O') {
        g.strokeStyle = '#ffe600';
        g.lineWidth = 5;
        g.beginPath();
        g.arc(x, y, 20, 0, Math.PI * 2);
        g.stroke();
      }
    }

    if (this.winLine) {
      const a = this.winLine[0];
      const c = this.winLine[2];
      const ax = ox + (a % 3) * cell + cell / 2;
      const ay = top + Math.floor(a / 3) * cell + cell / 2;
      const cx = ox + (c % 3) * cell + cell / 2;
      const cy = top + Math.floor(c / 3) * cell + cell / 2;
      g.strokeStyle = '#39ff14';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(cx, cy);
      g.stroke();
    }

    this.center(`W ${this.tally.wins}   L ${this.tally.losses}   D ${this.tally.draws}`, top + size + 24, '#fff', 7);
    this.center('M: mode    R: reset', top + size + 40, '#8888aa', 6);
    if (this.over) this.center('TAP TO PLAY AGAIN', top + size + 56, '#39ff14', 7);
  }

  private center(text: string, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    const w = g.measureText(text).width;
    g.fillStyle = color;
    g.fillText(text, this.width / 2 - w / 2, y);
  }
}
