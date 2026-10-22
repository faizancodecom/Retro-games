import { BaseEngine } from './base';
import type { EngineContext } from '../types';

type Color = 'w' | 'b';
interface Castle {
  wk: boolean;
  wq: boolean;
  bk: boolean;
  bq: boolean;
}
interface GState {
  board: string[];
  side: Color;
  castle: Castle;
  ep: number;
}
interface Move {
  from: number;
  to: number;
  promo?: string;
  flag?: 'ep' | 'castleK' | 'castleQ' | 'double';
}
type Mode = 'ai' | '2p';

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const GLYPH: Record<string, string> = {
  p: '\u265F', n: '\u265E', b: '\u265D', r: '\u265C', q: '\u265B', k: '\u265A',
};
const HUD = 34;

export class ChessEngine extends BaseEngine {
  private state: GState = {
    board: [],
    side: 'w',
    castle: { wk: true, wq: true, bk: true, bq: true },
    ep: -1,
  };
  private sq = 30;
  private selected = -1;
  private legal: Move[] = [];
  private mode: Mode = 'ai';
  private over = false;
  private message = '';
  private aiThink = 0;
  private lastMove: Move | null = null;
  private flash = 0;
  private padF = 4;
  private padR = 6;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.sq = 30;
    this.width = this.sq * 8;
    this.height = HUD + this.sq * 8 + 22;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    this.reset();
  }

  private reset(): void {
    const back = 'rnbqkbnr';
    const board = new Array(64).fill('.');
    for (let f = 0; f < 8; f++) {
      board[f] = back[f];
      board[8 + f] = 'p';
      board[48 + f] = 'P';
      board[56 + f] = back[f].toUpperCase();
    }
    this.state = { board, side: 'w', castle: { wk: true, wq: true, bk: true, bq: true }, ep: -1 };
    this.selected = -1;
    this.legal = [];
    this.over = false;
    this.lastMove = null;
    this.message = 'Your move (White)';
    this.score = 0;
    this.aiThink = 0;
    this.padF = 4;
    this.padR = 6;
  }

  private tapPadSquare(): void {
    const cx = (this.padF + 0.5) * this.sq * this.scale;
    const cy = (HUD + (this.padR + 0.5) * this.sq) * this.scale;
    this.handlePointer(cx, cy);
  }

  private colorOf(p: string): Color | null {
    if (p === '.') return null;
    return p === p.toUpperCase() ? 'w' : 'b';
  }

  private inBounds(f: number, r: number): boolean {
    return f >= 0 && f < 8 && r >= 0 && r < 8;
  }

  // --- attack detection ---
  private attacked(board: string[], sq: number, by: Color): boolean {
    const f = sq % 8;
    const r = (sq / 8) | 0;
    // pawns
    const pdir = by === 'w' ? 1 : -1; // white pawns attack toward smaller rank (up); a square is attacked by white pawn sitting at r+1
    for (const df of [-1, 1]) {
      const af = f + df;
      const ar = r + pdir;
      if (this.inBounds(af, ar)) {
        const p = board[ar * 8 + af];
        if (p !== '.' && this.colorOf(p) === by && p.toLowerCase() === 'p') return true;
      }
    }
    // knights
    const kn = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
    for (const [df, dr] of kn) {
      if (this.inBounds(f + df, r + dr)) {
        const p = board[(r + dr) * 8 + (f + df)];
        if (p !== '.' && this.colorOf(p) === by && p.toLowerCase() === 'n') return true;
      }
    }
    // king
    for (let df = -1; df <= 1; df++)
      for (let dr = -1; dr <= 1; dr++) {
        if (!df && !dr) continue;
        if (this.inBounds(f + df, r + dr)) {
          const p = board[(r + dr) * 8 + (f + df)];
          if (p !== '.' && this.colorOf(p) === by && p.toLowerCase() === 'k') return true;
        }
      }
    // sliding: rook/queen
    const orth = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [df, dr] of orth) {
      let nf = f + df;
      let nr = r + dr;
      while (this.inBounds(nf, nr)) {
        const p = board[nr * 8 + nf];
        if (p !== '.') {
          if (this.colorOf(p) === by && (p.toLowerCase() === 'r' || p.toLowerCase() === 'q')) return true;
          break;
        }
        nf += df;
        nr += dr;
      }
    }
    for (const [df, dr] of diag) {
      let nf = f + df;
      let nr = r + dr;
      while (this.inBounds(nf, nr)) {
        const p = board[nr * 8 + nf];
        if (p !== '.') {
          if (this.colorOf(p) === by && (p.toLowerCase() === 'b' || p.toLowerCase() === 'q')) return true;
          break;
        }
        nf += df;
        nr += dr;
      }
    }
    return false;
  }

  private kingSquare(board: string[], color: Color): number {
    const k = color === 'w' ? 'K' : 'k';
    return board.indexOf(k);
  }

  private inCheck(state: GState, color: Color): boolean {
    const ks = this.kingSquare(state.board, color);
    if (ks < 0) return false;
    return this.attacked(state.board, ks, color === 'w' ? 'b' : 'w');
  }

  // --- pseudo-legal move generation ---
  private genPseudo(state: GState): Move[] {
    const moves: Move[] = [];
    const { board, side } = state;
    for (let sq = 0; sq < 64; sq++) {
      const p = board[sq];
      if (p === '.' || this.colorOf(p) !== side) continue;
      const f = sq % 8;
      const r = (sq / 8) | 0;
      const type = p.toLowerCase();
      if (type === 'p') this.pawnMoves(state, sq, f, r, moves);
      else if (type === 'n') this.stepMoves(board, sq, f, r, side, [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], moves);
      else if (type === 'k') {
        this.stepMoves(board, sq, f, r, side, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], moves);
        this.castleMoves(state, moves);
      } else {
        const dirs =
          type === 'r'
            ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
            : type === 'b'
              ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
              : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        this.slideMoves(board, sq, f, r, side, dirs, moves);
      }
    }
    return moves;
  }

  private pawnMoves(state: GState, sq: number, f: number, r: number, moves: Move[]): void {
    const { board, side } = state;
    const dir = side === 'w' ? -1 : 1;
    const startRank = side === 'w' ? 6 : 1;
    const promoRank = side === 'w' ? 0 : 7;
    const one = (r + dir) * 8 + f;
    if (this.inBounds(f, r + dir) && board[one] === '.') {
      this.addPawn(moves, sq, one, r + dir === promoRank, side);
      const two = (r + 2 * dir) * 8 + f;
      if (r === startRank && board[two] === '.') moves.push({ from: sq, to: two, flag: 'double' });
    }
    for (const df of [-1, 1]) {
      const nf = f + df;
      const nr = r + dir;
      if (!this.inBounds(nf, nr)) continue;
      const t = nr * 8 + nf;
      if (board[t] !== '.' && this.colorOf(board[t]) !== side) {
        this.addPawn(moves, sq, t, nr === promoRank, side);
      } else if (t === state.ep) {
        moves.push({ from: sq, to: t, flag: 'ep' });
      }
    }
  }

  private addPawn(moves: Move[], from: number, to: number, promo: boolean, side: Color): void {
    if (promo) {
      const q = side === 'w' ? 'Q' : 'q';
      moves.push({ from, to, promo: q });
    } else moves.push({ from, to });
  }

  private stepMoves(board: string[], sq: number, f: number, r: number, side: Color, offs: number[][], moves: Move[]): void {
    for (const [df, dr] of offs) {
      if (!this.inBounds(f + df, r + dr)) continue;
      const t = (r + dr) * 8 + (f + df);
      if (board[t] === '.' || this.colorOf(board[t]) !== side) moves.push({ from: sq, to: t });
    }
  }

  private slideMoves(board: string[], sq: number, f: number, r: number, side: Color, dirs: number[][], moves: Move[]): void {
    for (const [df, dr] of dirs) {
      let nf = f + df;
      let nr = r + dr;
      while (this.inBounds(nf, nr)) {
        const t = nr * 8 + nf;
        if (board[t] === '.') moves.push({ from: sq, to: t });
        else {
          if (this.colorOf(board[t]) !== side) moves.push({ from: sq, to: t });
          break;
        }
        nf += df;
        nr += dr;
      }
    }
  }

  private castleMoves(state: GState, moves: Move[]): void {
    const { board, side, castle } = state;
    const enemy: Color = side === 'w' ? 'b' : 'w';
    if (side === 'w') {
      if (castle.wk && board[61] === '.' && board[62] === '.' && board[63] === 'R' &&
        !this.attacked(board, 60, enemy) && !this.attacked(board, 61, enemy) && !this.attacked(board, 62, enemy))
        moves.push({ from: 60, to: 62, flag: 'castleK' });
      if (castle.wq && board[59] === '.' && board[58] === '.' && board[57] === '.' && board[56] === 'R' &&
        !this.attacked(board, 60, enemy) && !this.attacked(board, 59, enemy) && !this.attacked(board, 58, enemy))
        moves.push({ from: 60, to: 58, flag: 'castleQ' });
    } else {
      if (castle.bk && board[5] === '.' && board[6] === '.' && board[7] === 'r' &&
        !this.attacked(board, 4, enemy) && !this.attacked(board, 5, enemy) && !this.attacked(board, 6, enemy))
        moves.push({ from: 4, to: 6, flag: 'castleK' });
      if (castle.bq && board[3] === '.' && board[2] === '.' && board[1] === '.' && board[0] === 'r' &&
        !this.attacked(board, 4, enemy) && !this.attacked(board, 3, enemy) && !this.attacked(board, 2, enemy))
        moves.push({ from: 4, to: 2, flag: 'castleQ' });
    }
  }

  private cloneState(s: GState): GState {
    return { board: s.board.slice(), side: s.side, castle: { ...s.castle }, ep: s.ep };
  }

  private makeMove(s: GState, m: Move): GState {
    const ns = this.cloneState(s);
    const b = ns.board;
    const piece = b[m.from];
    const side = s.side;
    ns.ep = -1;
    b[m.to] = piece;
    b[m.from] = '.';
    if (m.flag === 'double') ns.ep = (m.from + m.to) / 2;
    if (m.flag === 'ep') {
      const capSq = m.to + (side === 'w' ? 8 : -8);
      b[capSq] = '.';
    }
    if (m.promo) b[m.to] = m.promo;
    if (m.flag === 'castleK') {
      if (side === 'w') {
        b[61] = 'R';
        b[63] = '.';
      } else {
        b[5] = 'r';
        b[7] = '.';
      }
    }
    if (m.flag === 'castleQ') {
      if (side === 'w') {
        b[59] = 'R';
        b[56] = '.';
      } else {
        b[3] = 'r';
        b[0] = '.';
      }
    }
    // update castling rights
    if (piece === 'K') {
      ns.castle.wk = false;
      ns.castle.wq = false;
    }
    if (piece === 'k') {
      ns.castle.bk = false;
      ns.castle.bq = false;
    }
    if (m.from === 63 || m.to === 63) ns.castle.wk = false;
    if (m.from === 56 || m.to === 56) ns.castle.wq = false;
    if (m.from === 7 || m.to === 7) ns.castle.bk = false;
    if (m.from === 0 || m.to === 0) ns.castle.bq = false;
    ns.side = side === 'w' ? 'b' : 'w';
    return ns;
  }

  private legalMoves(state: GState): Move[] {
    const pseudo = this.genPseudo(state);
    const out: Move[] = [];
    for (const m of pseudo) {
      const ns = this.makeMove(state, m);
      if (!this.inCheck(ns, state.side)) out.push(m);
    }
    return out;
  }

  // --- AI ---
  private evaluate(state: GState): number {
    let score = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = state.board[sq];
      if (p === '.') continue;
      const t = p.toLowerCase();
      const v = VALUE[t];
      const f = sq % 8;
      const r = (sq / 8) | 0;
      const center = 7 - (Math.abs(3.5 - f) + Math.abs(3.5 - r));
      const factor = t === 'p' ? 2 : t === 'n' ? 4 : t === 'b' ? 3 : t === 'k' ? -2 : 1;
      let pos = center * factor;
      if (t === 'p') pos += this.colorOf(p) === 'w' ? (6 - r) * 4 : (r - 1) * 4;
      const total = v + pos;
      score += this.colorOf(p) === 'w' ? total : -total;
    }
    return score;
  }

  private orderMoves(state: GState, moves: Move[]): Move[] {
    return moves
      .map((m) => {
        const cap = state.board[m.to];
        const score = cap !== '.' ? VALUE[cap.toLowerCase()] - VALUE[state.board[m.from].toLowerCase()] / 10 : 0;
        return { m, score: score + (m.promo ? 800 : 0) };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.m);
  }

  private search(state: GState, depth: number, alpha: number, beta: number): number {
    if (depth === 0) return state.side === 'w' ? this.evaluate(state) : -this.evaluate(state);
    const moves = this.legalMoves(state);
    if (moves.length === 0) {
      if (this.inCheck(state, state.side)) return -100000 - depth;
      return 0;
    }
    let best = -Infinity;
    for (const m of this.orderMoves(state, moves)) {
      const score = -this.search(this.makeMove(state, m), depth - 1, -beta, -alpha);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  private bestMove(state: GState): Move | null {
    const moves = this.orderMoves(state, this.legalMoves(state));
    if (!moves.length) return null;
    let best = moves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const depth = 3;
    for (const m of moves) {
      const score = -this.search(this.makeMove(state, m), depth - 1, -Infinity, -alpha);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
      if (score > alpha) alpha = score;
    }
    return best;
  }

  // --- interaction ---
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
    if (this.mode === 'ai' && this.state.side === 'b') return;
    if (key === 'arrowleft') this.padF = Math.max(0, this.padF - 1);
    else if (key === 'arrowright') this.padF = Math.min(7, this.padF + 1);
    else if (key === 'arrowup') this.padR = Math.max(0, this.padR - 1);
    else if (key === 'arrowdown') this.padR = Math.min(7, this.padR + 1);
    else if (key === ' ' || key === 'enter') this.tapPadSquare();
  }

  handlePointer(cxp: number, cyp: number): void {
    if (this.over) {
      this.reset();
      return;
    }
    const x = cxp / this.scale;
    const y = cyp / this.scale;
    if (y < HUD || y > HUD + this.sq * 8) return;
    if (this.mode === 'ai' && this.state.side === 'b') return;
    const f = Math.floor(x / this.sq);
    const r = Math.floor((y - HUD) / this.sq);
    if (!this.inBounds(f, r)) return;
    const sq = r * 8 + f;
    const target = this.legal.find((m) => m.from === this.selected && m.to === sq);
    if (this.selected >= 0 && target) {
      this.applyMove(target);
      return;
    }
    const p = this.state.board[sq];
    if (p !== '.' && this.colorOf(p) === this.state.side) {
      this.selected = sq;
      this.legal = this.legalMoves(this.state).filter((m) => m.from === sq);
    } else {
      this.selected = -1;
      this.legal = [];
    }
  }

  private applyMove(m: Move): void {
    const captured = this.state.board[m.to] !== '.' || m.flag === 'ep';
    this.state = this.makeMove(this.state, m);
    this.lastMove = m;
    this.selected = -1;
    this.legal = [];
    this.flash = 0.3;
    if (captured) this.noise(0.05, 0.06);
    this.tone(captured ? 300 : 480, 0.05);
    this.checkEnd();
    if (!this.over) {
      if (this.mode === 'ai' && this.state.side === 'b') {
        this.message = 'CPU thinking...';
        this.aiThink = 0.35;
      } else {
        this.message = `${this.state.side === 'w' ? 'White' : 'Black'} to move`;
        if (this.inCheck(this.state, this.state.side)) this.message += ' — CHECK!';
      }
    }
  }

  private checkEnd(): void {
    const moves = this.legalMoves(this.state);
    if (moves.length === 0) {
      this.over = true;
      if (this.inCheck(this.state, this.state.side)) {
        const winner = this.state.side === 'w' ? 'Black' : 'White';
        this.message = `Checkmate! ${winner} wins`;
        if (this.mode === 'ai' && winner === 'White') this.score = 1;
        this.tone(880, 0.2);
      } else {
        this.message = 'Stalemate — draw';
        this.tone(300, 0.15);
      }
    }
  }

  protected update(dt: number): void {
    if (this.flash > 0) this.flash -= dt;
    if (this.over) return;
    if (this.mode === 'ai' && this.state.side === 'b') {
      this.aiThink -= dt;
      if (this.aiThink <= 0) {
        const m = this.bestMove(this.state);
        if (m) this.applyMove(m);
      }
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#0a0a14');

    this.center(this.mode === 'ai' ? 'CHESS — vs CPU' : 'CHESS — 2 Player', 14, '#00f5ff', 8);
    this.center(this.message, 28, this.message.includes('CHECK') || this.message.includes('Checkmate') ? '#ff3322' : '#ffe600', 7);

    const light = '#caa46a';
    const dark = '#5a3a22';
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) {
        const x = f * this.sq;
        const y = HUD + r * this.sq;
        g.fillStyle = (f + r) % 2 === 0 ? light : dark;
        g.fillRect(x, y, this.sq, this.sq);
      }

    // last move highlight
    if (this.lastMove) {
      for (const s of [this.lastMove.from, this.lastMove.to]) {
        g.fillStyle = 'rgba(0,245,255,0.28)';
        g.fillRect((s % 8) * this.sq, HUD + ((s / 8) | 0) * this.sq, this.sq, this.sq);
      }
    }
    if (!this.over) {
      g.strokeStyle = '#39ff14';
      g.lineWidth = 2;
      g.strokeRect(this.padF * this.sq + 2, HUD + this.padR * this.sq + 2, this.sq - 4, this.sq - 4);
    }

    // selection + legal targets
    if (this.selected >= 0) {
      g.fillStyle = 'rgba(57,255,20,0.35)';
      g.fillRect((this.selected % 8) * this.sq, HUD + ((this.selected / 8) | 0) * this.sq, this.sq, this.sq);
      for (const m of this.legal) {
        const tx = (m.to % 8) * this.sq + this.sq / 2;
        const ty = HUD + ((m.to / 8) | 0) * this.sq + this.sq / 2;
        g.fillStyle = this.state.board[m.to] !== '.' ? 'rgba(255,0,80,0.6)' : 'rgba(57,255,20,0.6)';
        g.beginPath();
        g.arc(tx, ty, this.state.board[m.to] !== '.' ? this.sq / 2 - 2 : 5, 0, Math.PI * 2);
        g.fill();
      }
    }

    // pieces
    for (let sq = 0; sq < 64; sq++) {
      const p = this.state.board[sq];
      if (p === '.') continue;
      const x = (sq % 8) * this.sq + this.sq / 2;
      const y = HUD + ((sq / 8) | 0) * this.sq + this.sq / 2;
      const white = this.colorOf(p) === 'w';
      g.font = `${this.sq - 4}px serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const glyph = GLYPH[p.toLowerCase()];
      g.fillStyle = white ? '#000' : '#000';
      g.fillText(glyph, x + 0.6, y + 0.6);
      g.fillStyle = white ? '#fafafa' : '#1a1a1a';
      g.fillText(glyph, x, y);
    }
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';

    this.center('M: mode   R: reset', this.height - 6, '#8888aa', 6);

    if (this.over) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(0, HUD, this.width, this.sq * 8);
      this.center(this.message, HUD + this.sq * 4 - 6, '#fff', 8);
      this.center('TAP TO PLAY AGAIN', HUD + this.sq * 4 + 12, '#39ff14', 7);
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
