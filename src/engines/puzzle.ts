import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getPuzzleConfig } from '../games/configs';

export class PuzzleEngine extends BaseEngine {
  private cfg = getPuzzleConfig('');
  private grid: number[][] = [];
  private flipped: number[] = [];
  private matched: Set<number> = new Set();
  private tiles2048: number[][] = [];
  private gameWon = false;
  private moves = 0;
  private padR = 0;
  private padC = 0;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getPuzzleConfig(ctx.configId);
  }

  protected init(): void {
    this.cfg = getPuzzleConfig(this.ctx.configId);
    this.gameWon = false;
    this.moves = 0;
    this.score = 0;
    this.padR = 0;
    this.padC = 0;
    const n = this.cfg.gridSize;
    switch (this.cfg.type) {
      case 'memory':
        this.initMemory(n);
        break;
      case '2048':
        this.init2048(n);
        break;
      case 'fifteen':
        this.initFifteen(n);
        break;
      case 'connect':
        this.initConnect(n);
        break;
    }
  }

  private initMemory(n: number): void {
    const pairs = (n * n) / 2;
    const vals = Array.from({ length: pairs }, (_, i) => i).flatMap((v) => [v, v]);
    for (let i = vals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
    this.grid = [];
    for (let r = 0; r < n; r++) {
      this.grid[r] = vals.slice(r * n, (r + 1) * n);
    }
    this.flipped = [];
    this.matched = new Set();
  }

  private init2048(n: number): void {
    this.tiles2048 = Array.from({ length: n }, () => Array(n).fill(0));
    this.spawn2048();
    this.spawn2048();
  }

  private spawn2048(): void {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < this.tiles2048.length; r++)
      for (let c = 0; c < this.tiles2048[r].length; c++)
        if (!this.tiles2048[r][c]) empty.push({ r, c });
    if (!empty.length) return;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    this.tiles2048[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  private initFifteen(n: number): void {
    const vals = Array.from({ length: n * n - 1 }, (_, i) => i + 1);
    vals.push(0);
    for (let i = vals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
    this.grid = [];
    for (let r = 0; r < n; r++) this.grid[r] = vals.slice(r * n, (r + 1) * n);
  }

  private initConnect(n: number): void {
    this.grid = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => Math.floor(Math.random() * 4))
    );
    this.matched = new Set();
  }

  private collapseConnect(): void {
    const n = this.cfg.gridSize;
    for (let c = 0; c < n; c++) {
      const vals: number[] = [];
      for (let r = 0; r < n; r++) if (this.grid[r][c] >= 0) vals.push(this.grid[r][c]);
      const gap = n - vals.length;
      for (let r = 0; r < gap; r++) this.grid[r][c] = Math.floor(Math.random() * 4);
      for (let r = 0; r < vals.length; r++) this.grid[gap + r][c] = vals[r];
    }
  }

  private clickCell(r: number, c: number): void {
    const n = this.cfg.gridSize;
    if (r < 0 || c < 0 || r >= n || c >= n) return;
    this.moves++;

    switch (this.cfg.type) {
      case 'memory': {
        const idx = r * n + c;
        if (this.matched.has(idx) || this.flipped.includes(idx)) return;
        this.flipped.push(idx);
        if (this.flipped.length === 2) {
          const [a, b] = this.flipped;
          const ar = Math.floor(a / n);
          const ac = a % n;
          const br = Math.floor(b / n);
          const bc = b % n;
          if (this.grid[ar][ac] === this.grid[br][bc]) {
            this.matched.add(a);
            this.matched.add(b);
            this.addScore(20);
            this.playBeep(600);
            if (this.matched.size === n * n) this.gameWon = true;
          }
          setTimeout(() => {
            this.flipped = this.flipped.filter((x) => !this.matched.has(x));
          }, 500);
        }
        break;
      }
      case 'fifteen': {
        const empty: { r: number; c: number }[] = [];
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++)
            if (this.grid[y][x] === 0) empty.push({ r: y, c: x });
        const e = empty[0];
        if ((Math.abs(e.r - r) === 1 && e.c === c) || (Math.abs(e.c - c) === 1 && e.r === r)) {
          this.grid[e.r][e.c] = this.grid[r][c];
          this.grid[r][c] = 0;
          this.addScore(1);
          if (this.checkFifteenWin()) {
            this.gameWon = true;
            this.addScore(500);
          }
        }
        break;
      }
      case 'connect': {
        const val = this.grid[r][c];
        if (val < 0) return;
        const stack = [{ r, c }];
        const group = new Set<number>();
        while (stack.length) {
          const { r: cr, c: cc } = stack.pop()!;
          if (cr < 0 || cc < 0 || cr >= n || cc >= n) continue;
          const i = cr * n + cc;
          if (group.has(i) || this.grid[cr][cc] !== val) continue;
          group.add(i);
          stack.push({ r: cr - 1, c: cc }, { r: cr + 1, c: cc }, { r: cr, c: cc - 1 }, { r: cr, c: cc + 1 });
        }
        if (group.size >= 3) {
          group.forEach((i) => {
            const cr = Math.floor(i / n);
            const cc = i % n;
            this.grid[cr][cc] = -1;
          });
          this.addScore(group.size * 5);
          this.playBeep(500);
          this.collapseConnect();
          if (!this.grid.flat().some((v) => v >= 0)) {
            this.gameWon = true;
            this.addScore(100);
          }
        }
        break;
      }
    }
  }

  private checkFifteenWin(): boolean {
    const n = this.cfg.gridSize;
    let v = 1;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (r === n - 1 && c === n - 1) return this.grid[r][c] === 0;
        if (this.grid[r][c] !== v++) return false;
      }
    return true;
  }

  private move2048(dir: string): void {
    const n = this.tiles2048.length;
    const merge = (line: number[]) => {
      const filtered = line.filter((x) => x);
      const out: number[] = [];
      for (let i = 0; i < filtered.length; i++) {
        if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
          out.push(filtered[i] * 2);
          this.addScore(filtered[i] * 2);
          i++;
        } else out.push(filtered[i]);
      }
      while (out.length < n) out.push(0);
      return out;
    };
    const old = JSON.stringify(this.tiles2048);
    if (dir === 'left')
      for (let r = 0; r < n; r++) this.tiles2048[r] = merge(this.tiles2048[r]);
    if (dir === 'right')
      for (let r = 0; r < n; r++) this.tiles2048[r] = merge([...this.tiles2048[r]].reverse()).reverse();
    if (dir === 'up')
      for (let c = 0; c < n; c++) {
        const col = merge(this.tiles2048.map((row) => row[c]));
        for (let r = 0; r < n; r++) this.tiles2048[r][c] = col[r];
      }
    if (dir === 'down')
      for (let c = 0; c < n; c++) {
        const col = merge(this.tiles2048.map((row) => row[c]).reverse()).reverse();
        for (let r = 0; r < n; r++) this.tiles2048[r][c] = col[r];
      }
    if (JSON.stringify(this.tiles2048) !== old) this.spawn2048();
    if (this.tiles2048.flat().includes(2048)) this.gameWon = true;
  }

  protected onKeyDown(key: string): void {
    if (this.cfg.type === '2048') return;
    const n = this.cfg.gridSize;
    if (key === 'arrowleft') this.padC = Math.max(0, this.padC - 1);
    else if (key === 'arrowright') this.padC = Math.min(n - 1, this.padC + 1);
    else if (key === 'arrowup') this.padR = Math.max(0, this.padR - 1);
    else if (key === 'arrowdown') this.padR = Math.min(n - 1, this.padR + 1);
    else if (key === ' ' || key === 'enter') this.tapPadCell();
  }

  private tapPadCell(): void {
    const n = this.cfg.gridSize;
    const size = Math.min(this.width, this.height - 30) / n;
    const ox = (this.width - size * n) / 2;
    const oy = 24;
    const cx = (ox + (this.padC + 0.5) * size) * this.scale;
    const cy = (oy + (this.padR + 0.5) * size) * this.scale;
    this.handlePointer!(cx, cy);
  }

  protected update(_dt: number): void {
    if (this.cfg.type === '2048') {
      if (this.key('arrowleft') || this.key('a')) {
        this.move2048('left');
        this.keys.delete('arrowleft');
      }
      if (this.key('arrowright') || this.key('d')) {
        this.move2048('right');
        this.keys.delete('arrowright');
      }
      if (this.key('arrowup') || this.key('w')) {
        this.move2048('up');
        this.keys.delete('arrowup');
      }
      if (this.key('arrowdown') || this.key('s')) {
        this.move2048('down');
        this.keys.delete('arrowdown');
      }
    }
  }

  handlePointer(canvasX: number, canvasY: number): void {
    const n = this.cfg.gridSize;
    const size = Math.min(this.width, this.height - 30) / n;
    const ox = (this.width - size * n) / 2;
    const oy = 24;
    const x = canvasX / this.scale;
    const y = canvasY / this.scale;
    const c = Math.floor((x - ox) / size);
    const r = Math.floor((y - oy) / size);
    this.clickCell(r, c);
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    const n = this.cfg.gridSize;
    const size = Math.min(this.width, this.height - 30) / n;
    const ox = (this.width - size * n) / 2;
    const oy = 24;

    if (this.cfg.type === 'connect') {
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const v = this.grid[r][c];
          g.fillStyle = v < 0 ? '#1a1a28' : this.cfg.colors[v % this.cfg.colors.length];
          g.fillRect(ox + c * size + 1, oy + r * size + 1, size - 2, size - 2);
        }
      this.drawText('TAP 3+ same color', 8, this.height - 10, '#888', 6);
    } else if (this.cfg.type === 'memory' || this.cfg.type === 'fifteen') {
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const idx = r * n + c;
          const show =
            this.cfg.type === 'fifteen' ||
            this.matched.has(idx) ||
            this.flipped.includes(idx);
          g.fillStyle = show ? this.cfg.colors[this.grid[r][c] % this.cfg.colors.length] : '#333';
          g.fillRect(ox + c * size + 1, oy + r * size + 1, size - 2, size - 2);
          if (show && this.cfg.type === 'fifteen' && this.grid[r][c])
            this.drawText(String(this.grid[r][c]), ox + c * size + size / 3, oy + r * size + size / 2, '#000', 8);
        }
    } else if (this.cfg.type === '2048') {
      for (let r = 0; r < this.tiles2048.length; r++)
        for (let c = 0; c < this.tiles2048[r].length; c++) {
          const v = this.tiles2048[r][c];
          g.fillStyle = v ? this.cfg.colors[Math.log2(v) % this.cfg.colors.length] : '#222';
          g.fillRect(ox + c * size + 1, oy + r * size + 1, size - 2, size - 2);
          if (v) this.drawText(String(v), ox + c * size + size / 4, oy + r * size + size / 2, '#fff', 8);
        }
    }
    if (this.cfg.type !== '2048') {
      g.strokeStyle = '#39ff14';
      g.lineWidth = 2;
      g.strokeRect(ox + this.padC * size + 2, oy + this.padR * size + 2, size - 4, size - 4);
    }

    this.drawText(String(this.score), 8, 8, '#fff', 8);
    if (this.gameWon) this.drawOverlay('YOU WIN!', '');
  }
}