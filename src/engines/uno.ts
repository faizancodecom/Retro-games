import { BaseEngine } from './base';
import type { EngineContext } from '../types';

type Kind = 'num' | 'skip' | 'rev' | 'd2' | 'wild' | 'wild4';

interface Card {
  color: number; // 0 red,1 yellow,2 green,3 blue, -1 wild
  kind: Kind;
  value: number; // for num
}

type State = 'menu' | 'play' | 'color' | 'result';

const COLORS = ['#e23b3b', '#e2c93b', '#3bba4e', '#3b7be2'];
const COLOR_NAMES = ['RED', 'YEL', 'GRN', 'BLU'];

export class UnoEngine extends BaseEngine {
  private deck: Card[] = [];
  private discard: Card[] = [];
  private hands: Card[][] = [];
  private numPlayers = 4;
  private current = 0;
  private dir = 1;
  private curColor = 0;
  private state: State = 'menu';
  private message = '';
  private aiTimer = 0;
  private pendingWild = -1;
  private winner = -1;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = 360;
    this.height = 300;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    this.state = 'menu';
    this.message = 'Choose players';
    this.score = 0;
  }

  private buildDeck(): void {
    this.deck = [];
    for (let col = 0; col < 4; col++) {
      this.deck.push({ color: col, kind: 'num', value: 0 });
      for (let v = 1; v <= 9; v++) {
        this.deck.push({ color: col, kind: 'num', value: v });
        this.deck.push({ color: col, kind: 'num', value: v });
      }
      for (let k = 0; k < 2; k++) {
        this.deck.push({ color: col, kind: 'skip', value: 0 });
        this.deck.push({ color: col, kind: 'rev', value: 0 });
        this.deck.push({ color: col, kind: 'd2', value: 0 });
      }
    }
    for (let i = 0; i < 4; i++) {
      this.deck.push({ color: -1, kind: 'wild', value: 0 });
      this.deck.push({ color: -1, kind: 'wild4', value: 0 });
    }
    this.shuffle(this.deck);
  }

  private shuffle(a: Card[]): void {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  private startGame(n: number): void {
    this.numPlayers = n;
    this.buildDeck();
    this.hands = Array.from({ length: n }, () => this.deck.splice(0, 7));
    let top = this.deck.pop()!;
    while (top.color === -1) {
      this.deck.unshift(top);
      top = this.deck.pop()!;
    }
    this.discard = [top];
    this.curColor = top.color;
    this.current = 0;
    this.dir = 1;
    this.state = 'play';
    this.winner = -1;
    this.message = 'Your turn';
    this.applyStartEffect(top);
  }

  private applyStartEffect(top: Card): void {
    if (top.kind === 'skip') this.advance(2);
    else if (top.kind === 'rev') {
      this.dir = -1;
      if (this.numPlayers > 2) this.current = this.numPlayers - 1;
    } else if (top.kind === 'd2') {
      this.drawCards(0, 2);
      this.advance(1);
    }
    this.afterTurnChange();
  }

  private drawPile(): Card {
    if (this.deck.length === 0) {
      const top = this.discard.pop()!;
      this.deck = this.discard;
      this.discard = [top];
      this.shuffle(this.deck);
    }
    return this.deck.pop()!;
  }

  private drawCards(player: number, count: number): void {
    for (let i = 0; i < count; i++) this.hands[player].push(this.drawPile());
  }

  private top(): Card {
    return this.discard[this.discard.length - 1];
  }

  private playable(c: Card): boolean {
    if (c.color === -1) return true;
    if (c.color === this.curColor) return true;
    const t = this.top();
    if (c.kind !== 'num' && c.kind === t.kind) return true;
    if (c.kind === 'num' && t.kind === 'num' && c.value === t.value) return true;
    return false;
  }

  private advance(step: number): void {
    this.current = (this.current + this.dir * step + this.numPlayers * 4) % this.numPlayers;
  }

  private playCard(player: number, idx: number, chosenColor?: number): void {
    const card = this.hands[player].splice(idx, 1)[0];
    this.discard.push(card);
    this.tone(560, 0.05);

    if (card.color !== -1) this.curColor = card.color;

    if (this.hands[player].length === 0) {
      this.winner = player;
      this.state = 'result';
      this.message = player === 0 ? 'YOU WIN!' : `CPU ${player} wins`;
      this.tone(player === 0 ? 880 : 180, 0.18, player === 0 ? 'square' : 'sawtooth');
      if (player === 0) this.score = 1;
      return;
    }

    switch (card.kind) {
      case 'skip':
        this.advance(2);
        break;
      case 'rev':
        this.dir *= -1;
        this.advance(this.numPlayers === 2 ? 2 : 1);
        break;
      case 'd2': {
        const victim = (this.current + this.dir + this.numPlayers) % this.numPlayers;
        this.drawCards(victim, 2);
        this.advance(2);
        break;
      }
      case 'wild':
        this.curColor = chosenColor !== undefined ? chosenColor : this.aiPickColor(player);
        this.advance(1);
        break;
      case 'wild4': {
        const victim = (this.current + this.dir + this.numPlayers) % this.numPlayers;
        this.drawCards(victim, 4);
        this.curColor = chosenColor !== undefined ? chosenColor : this.aiPickColor(player);
        this.advance(2);
        break;
      }
      default:
        this.advance(1);
    }
    this.afterTurnChange();
  }

  private afterTurnChange(): void {
    if (this.state !== 'play') return;
    if (this.current === 0) {
      this.message = 'Your turn';
    } else {
      this.message = `CPU ${this.current}...`;
      this.aiTimer = 0.7;
    }
  }

  private aiPickColor(player: number): number {
    const counts = [0, 0, 0, 0];
    for (const c of this.hands[player]) if (c.color >= 0) counts[c.color]++;
    let best = 0;
    for (let i = 1; i < 4; i++) if (counts[i] > counts[best]) best = i;
    return best;
  }

  private aiTurn(): void {
    const hand = this.hands[this.current];
    let idx = hand.findIndex((c) => c.color !== -1 && this.playable(c));
    if (idx === -1) idx = hand.findIndex((c) => this.playable(c));
    if (idx === -1) {
      // draw and possibly play
      const card = this.drawPile();
      hand.push(card);
      if (this.playable(card)) {
        this.playCard(this.current, hand.length - 1);
      } else {
        this.advance(1);
        this.afterTurnChange();
      }
      return;
    }
    this.playCard(this.current, idx);
  }

  protected update(dt: number): void {
    if (this.state !== 'play') return;
    if (this.current !== 0) {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) this.aiTurn();
    }
  }

  protected onKeyDown(key: string): void {
    if (this.state === 'menu') {
      if (key === '2' || key === 'arrowleft') this.startGame(2);
      if (key === '3' || key === 'arrowup' || key === ' ') this.startGame(3);
      if (key === '4' || key === 'arrowright') this.startGame(4);
    } else if (this.state === 'result') {
      if (key === ' ' || key === 'enter') this.init();
    } else if (this.state === 'play' && this.current === 0) {
      if (key === 'd') this.humanDraw();
    }
  }

  private humanDraw(): void {
    const card = this.drawPile();
    this.hands[0].push(card);
    this.tone(300, 0.05);
    if (!this.playable(card)) {
      this.advance(1);
      this.afterTurnChange();
    } else {
      this.message = 'Play drawn card or another';
    }
  }

  handlePointer(cxp: number, cyp: number): void {
    const x = cxp / this.scale;
    const y = cyp / this.scale;

    if (this.state === 'menu') {
      for (let i = 0; i < 3; i++) {
        const bx = 40 + i * 100;
        if (x > bx && x < bx + 80 && y > 150 && y < 200) this.startGame(i + 2);
      }
      return;
    }
    if (this.state === 'result') {
      this.init();
      return;
    }
    if (this.state === 'color') {
      for (let i = 0; i < 4; i++) {
        const bx = this.width / 2 - 84 + i * 44;
        if (x > bx && x < bx + 40 && y > 130 && y < 170) {
          const idx = this.pendingWild;
          this.pendingWild = -1;
          this.state = 'play';
          this.playCard(0, idx, i);
          return;
        }
      }
      return;
    }
    if (this.state === 'play' && this.current === 0) {
      // draw pile
      if (x > 30 && x < 70 && y > 110 && y < 170) {
        this.humanDraw();
        return;
      }
      // hand
      const hand = this.hands[0];
      const cw = Math.min(38, (this.width - 16) / hand.length);
      const startX = (this.width - cw * hand.length) / 2;
      if (y > this.height - 70) {
        const i = Math.floor((x - startX) / cw);
        if (i >= 0 && i < hand.length && this.playable(hand[i])) {
          if (hand[i].color === -1) {
            this.pendingWild = i;
            this.state = 'color';
            this.message = 'Pick a color';
          } else {
            this.playCard(0, i);
          }
        }
      }
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#101225');

    if (this.state === 'menu') {
      this.center('U N O', 70, '#ffe600', 22);
      this.center('How many players?', 120, '#fff', 8);
      for (let i = 0; i < 3; i++) {
        const bx = 40 + i * 100;
        g.fillStyle = COLORS[i];
        g.fillRect(bx, 150, 80, 50);
        g.fillStyle = '#101225';
        g.font = `20px "Press Start 2P", monospace`;
        g.fillText(String(i + 2), bx + 30, 184);
      }
      this.center('You vs CPU opponents', 230, '#8888aa', 7);
      return;
    }

    // opponents
    for (let p = 1; p < this.numPlayers; p++) {
      const slots = this.numPlayers - 1;
      const w = this.width / slots;
      const x = (p - 1) * w + w / 2;
      const hl = this.current === p;
      this.centerIn(`CPU ${p}`, (p - 1) * w, w, 18, hl ? '#ffe600' : '#fff', 8);
      this.centerIn(`${this.hands[p].length} cards`, (p - 1) * w, w, 32, hl ? '#ffe600' : '#8888aa', 7);
      // mini card backs
      const n = Math.min(this.hands[p].length, 7);
      for (let i = 0; i < n; i++) {
        g.fillStyle = '#222';
        g.fillRect(x - n * 4 + i * 8, 38, 7, 11);
        g.strokeStyle = '#ff00aa';
        g.strokeRect(x - n * 4 + i * 8, 38, 7, 11);
      }
    }

    // direction + color
    this.text(this.dir > 0 ? 'DIR >>' : 'DIR <<', 8, 100, '#00f5ff', 7);
    g.fillStyle = COLORS[this.curColor];
    g.fillRect(this.width - 40, 88, 30, 14);
    this.text(COLOR_NAMES[this.curColor], this.width - 70, 100, '#fff', 6);

    // draw pile
    g.fillStyle = '#222';
    g.fillRect(30, 110, 40, 60);
    g.strokeStyle = '#ff00aa';
    g.lineWidth = 2;
    g.strokeRect(30, 110, 40, 60);
    this.centerIn('DRAW', 30, 40, 144, '#ffe600', 6);

    // discard top
    this.drawCard(this.top(), this.width / 2 - 4, 110, 44, 64, false);

    this.center(this.message, 192, '#ffe600', 8);

    // human hand
    const hand = this.hands[0];
    const cw = Math.min(38, (this.width - 16) / Math.max(1, hand.length));
    const startX = (this.width - cw * hand.length) / 2;
    hand.forEach((c, i) => {
      const playable = this.current === 0 && this.state === 'play' && this.playable(c);
      this.drawCard(c, startX + i * cw, this.height - 64 - (playable ? 6 : 0), cw - 2, 58, !playable);
    });

    if (this.state === 'color') {
      g.fillStyle = 'rgba(0,0,0,0.7)';
      g.fillRect(0, 0, this.width, this.height);
      this.center('PICK A COLOR', 110, '#fff', 9);
      for (let i = 0; i < 4; i++) {
        const bx = this.width / 2 - 84 + i * 44;
        g.fillStyle = COLORS[i];
        g.fillRect(bx, 130, 40, 40);
      }
    }

    if (this.state === 'result') {
      g.fillStyle = 'rgba(0,0,0,0.78)';
      g.fillRect(0, 0, this.width, this.height);
      this.center(this.winner === 0 ? 'YOU WIN!' : `CPU ${this.winner} WINS`, this.height / 2 - 10, this.winner === 0 ? '#39ff14' : '#ff3322', 14);
      if (Math.sin(performance.now() / 250) > 0) this.center('TAP TO PLAY AGAIN', this.height / 2 + 20, '#ffe600', 8);
    }
  }

  private drawCard(c: Card, x: number, y: number, w: number, h: number, dim: boolean): void {
    const g = this.ctx2d;
    g.globalAlpha = dim ? 0.5 : 1;
    g.fillStyle = c.color === -1 ? '#111' : COLORS[c.color];
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#fff';
    g.lineWidth = 1.5;
    g.strokeRect(x, y, w, h);
    g.fillStyle = c.color === -1 ? '#fff' : '#fff';
    let label = '';
    if (c.kind === 'num') label = String(c.value);
    else if (c.kind === 'skip') label = '\u00d8';
    else if (c.kind === 'rev') label = '\u21c4';
    else if (c.kind === 'd2') label = '+2';
    else if (c.kind === 'wild') label = 'W';
    else if (c.kind === 'wild4') label = '+4';
    if (c.color === -1) {
      // wild: 4-color corner
      for (let i = 0; i < 4; i++) {
        g.fillStyle = COLORS[i];
        g.fillRect(x + 3 + (i % 2) * (w / 2 - 3), y + 3 + Math.floor(i / 2) * (h / 2 - 3), w / 2 - 4, h / 2 - 4);
      }
      g.fillStyle = '#fff';
    }
    g.font = `${Math.min(12, w / 2)}px "Press Start 2P", monospace`;
    const tw = g.measureText(label).width;
    g.fillText(label, x + w / 2 - tw / 2, y + h / 2 + 4);
    g.globalAlpha = 1;
  }

  private text(t: string, x: number, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.fillStyle = color;
    g.fillText(t, x, y);
  }

  private center(t: string, y: number, color: string, size: number): void {
    this.centerIn(t, 0, this.width, y, color, size);
  }

  private centerIn(t: string, x0: number, w: number, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    const tw = g.measureText(t).width;
    g.fillStyle = color;
    g.fillText(t, x0 + w / 2 - tw / 2, y);
  }
}
