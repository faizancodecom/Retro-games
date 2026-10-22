import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { loadState, saveState } from '../app/storage';

interface Card {
  rank: number; // 1-13
  suit: number; // 0-3
}

type Phase = 'bet' | 'player' | 'dealer' | 'result';

interface Save {
  bank: number;
}

const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];

export class BlackjackEngine extends BaseEngine {
  private deck: Card[] = [];
  private player: Card[] = [];
  private dealer: Card[] = [];
  private bank = 200;
  private bet = 20;
  private phase: Phase = 'bet';
  private message = '';
  private hideHole = true;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = 340;
    this.height = 260;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    const s = loadState<Save>('blackjack', { bank: 200 });
    this.bank = s.bank > 0 ? s.bank : 200;
    this.bet = Math.min(20, this.bank);
    this.phase = 'bet';
    this.player = [];
    this.dealer = [];
    this.message = 'Place your bet';
    this.score = this.bank;
  }

  private newShoe(): void {
    this.deck = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) this.deck.push({ rank: r, suit: s });
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  private val(cards: Card[]): number {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
      if (c.rank === 1) {
        aces++;
        total += 11;
      } else total += Math.min(10, c.rank);
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  private deal(): void {
    this.newShoe();
    this.player = [this.deck.pop()!, this.deck.pop()!];
    this.dealer = [this.deck.pop()!, this.deck.pop()!];
    this.hideHole = true;
    this.phase = 'player';
    this.message = 'Hit or Stand';
    this.tone(440, 0.05);
    if (this.val(this.player) === 21) this.stand();
  }

  private hit(): void {
    if (this.phase !== 'player') return;
    this.player.push(this.deck.pop()!);
    this.tone(520, 0.04);
    if (this.val(this.player) > 21) {
      this.finish('bust');
    }
  }

  private stand(): void {
    if (this.phase !== 'player') return;
    this.phase = 'dealer';
    this.hideHole = false;
    while (this.val(this.dealer) < 17) this.dealer.push(this.deck.pop()!);
    const pv = this.val(this.player);
    const dv = this.val(this.dealer);
    if (dv > 21 || pv > dv) this.finish('win');
    else if (pv === dv) this.finish('push');
    else this.finish('lose');
  }

  private finish(kind: 'win' | 'lose' | 'push' | 'bust'): void {
    this.phase = 'result';
    this.hideHole = false;
    const blackjack = this.player.length === 2 && this.val(this.player) === 21;
    if (kind === 'win') {
      const payout = blackjack ? Math.floor(this.bet * 1.5) : this.bet;
      this.bank += payout;
      this.message = blackjack ? `BLACKJACK! +${payout}` : `You win +${this.bet}`;
      this.tone(880, 0.14);
    } else if (kind === 'push') {
      this.message = 'Push (tie)';
      this.tone(400, 0.08);
    } else {
      this.bank -= this.bet;
      this.message = kind === 'bust' ? `Bust! -${this.bet}` : `Dealer wins -${this.bet}`;
      this.tone(160, 0.2, 'sawtooth');
    }
    if (this.bank < 0) this.bank = 0;
    saveState<Save>('blackjack', { bank: this.bank });
    this.score = this.bank;
  }

  private nextRound(): void {
    if (this.bank <= 0) {
      this.bank = 200;
      this.message = 'Bankroll refilled to 200';
      saveState<Save>('blackjack', { bank: this.bank });
    } else {
      this.message = 'Place your bet';
    }
    this.bet = Math.min(this.bet, this.bank);
    if (this.bet < 5) this.bet = Math.min(5, this.bank);
    this.player = [];
    this.dealer = [];
    this.phase = 'bet';
    this.score = this.bank;
  }

  protected onKeyDown(key: string): void {
    if (this.phase === 'bet') {
      if (key === 'arrowup' || key === 'w') this.bet = Math.min(this.bank, this.bet + 5);
      if (key === 'arrowdown' || key === 's') this.bet = Math.max(5, this.bet - 5);
      if (key === ' ' || key === 'enter') this.deal();
    } else if (this.phase === 'player') {
      if (key === 'h' || key === 'x') this.hit();
      if (key === 's' || key === 'y' || key === ' ') this.stand();
    } else if (this.phase === 'result') {
      if (key === ' ' || key === 'enter') this.nextRound();
    }
  }

  handlePointer(cx: number, cy: number): void {
    const x = cx / this.scale;
    const y = cy / this.scale;
    // bottom button row
    if (y < this.height - 40) {
      if (this.phase === 'result') this.nextRound();
      return;
    }
    const third = this.width / 3;
    const slot = Math.floor(x / third);
    if (this.phase === 'bet') {
      if (slot === 0) this.bet = Math.max(5, this.bet - 5);
      else if (slot === 2) this.bet = Math.min(this.bank, this.bet + 5);
      else this.deal();
    } else if (this.phase === 'player') {
      if (slot === 0) this.hit();
      else if (slot === 2) this.stand();
      else this.hit();
    } else if (this.phase === 'result') {
      this.nextRound();
    }
  }

  protected update(): void {
    /* event driven */
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#0b3d2e');

    this.text(`BANK $${this.bank}`, 8, 16, '#ffe600', 8);
    this.text(`BET $${this.bet}`, this.width - 96, 16, '#00f5ff', 8);

    // dealer
    this.text('DEALER', 8, 40, '#fff', 7);
    this.drawHand(this.dealer, 40, this.hideHole);
    if (!this.hideHole) this.text(String(this.val(this.dealer)), this.width - 30, 56, '#fff', 8);

    // player
    this.text('YOU', 8, 130, '#fff', 7);
    this.drawHand(this.player, 130, false);
    if (this.player.length) this.text(String(this.val(this.player)), this.width - 30, 146, '#ffe600', 8);

    this.center(this.message, 210, '#ffe600', 8);

    // buttons
    this.drawButtons();
  }

  private drawButtons(): void {
    const g = this.ctx2d;
    const y = this.height - 36;
    const labels =
      this.phase === 'bet'
        ? ['- BET', 'DEAL', '+ BET']
        : this.phase === 'player'
          ? ['HIT', 'HIT', 'STAND']
          : ['', 'NEXT', ''];
    const third = this.width / 3;
    for (let i = 0; i < 3; i++) {
      if (!labels[i]) continue;
      g.fillStyle = '#12121f';
      g.fillRect(i * third + 4, y, third - 8, 28);
      g.strokeStyle = '#ff00aa';
      g.lineWidth = 2;
      g.strokeRect(i * third + 4, y, third - 8, 28);
      this.centerIn(labels[i], i * third, third, y + 18, '#ffe600', 7);
    }
  }

  private drawHand(cards: Card[], y: number, hideSecond: boolean): void {
    const g = this.ctx2d;
    let x = 8;
    cards.forEach((c, i) => {
      if (hideSecond && i === 1) {
        g.fillStyle = '#1a3a8a';
        g.fillRect(x, y + 8, 34, 48);
        g.strokeStyle = '#00f5ff';
        g.strokeRect(x, y + 8, 34, 48);
        g.fillStyle = '#00f5ff';
        g.fillRect(x + 6, y + 14, 22, 36);
      } else {
        g.fillStyle = '#fafafa';
        g.fillRect(x, y + 8, 34, 48);
        const red = c.suit === 1 || c.suit === 2;
        g.fillStyle = red ? '#d11' : '#111';
        g.font = `9px "Press Start 2P", monospace`;
        g.fillText(this.rankLabel(c.rank), x + 3, y + 22);
        g.font = `12px monospace`;
        g.fillText(SUITS[c.suit], x + 10, y + 44);
      }
      x += 40;
    });
  }

  private rankLabel(r: number): string {
    if (r === 1) return 'A';
    if (r === 11) return 'J';
    if (r === 12) return 'Q';
    if (r === 13) return 'K';
    return String(r);
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
