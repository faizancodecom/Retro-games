import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getCardConfig } from '../games/configs';

export class CardEngine extends BaseEngine {
  private cfg = getCardConfig('');
  private deck: number[] = [];
  private playerHand: number[] = [];
  private dealerHand: number[] = [];
  private message = '';
  private phase = 'bet';

  constructor(ctx: EngineContext) {
    super(ctx);
    this.cfg = getCardConfig(ctx.configId);
  }

  private newDeck(): number[] {
    const d: number[] = [];
    for (let s = 0; s < 4; s++)
      for (let v = 1; v <= 13; v++) d.push(v + s * 13);
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  private cardVal(c: number): number {
    const v = ((c - 1) % 13) + 1;
    return v > 10 ? 10 : v;
  }

  private cardLabel(c: number): string {
    const v = ((c - 1) % 13) + 1;
    const suits = ['♠', '♥', '♦', '♣'];
    const s = suits[Math.floor((c - 1) / 13)];
    if (v === 1) return 'A' + s;
    if (v === 11) return 'J' + s;
    if (v === 12) return 'Q' + s;
    if (v === 13) return 'K' + s;
    return v + s;
  }

  protected init(): void {
    this.deck = this.newDeck();
    this.playerHand = [];
    this.dealerHand = [];
    this.message = 'Press SPACE to deal';
    this.phase = 'bet';
    this.score = 0;
  }

  protected update(dt: number): void {
    void dt;
    if (!this.isAction()) return;
    this.keys.delete(' ');
    this.keys.delete('enter');

    if (this.cfg.type === 'blackjack') {
      if (this.phase === 'bet') {
        this.playerHand = [this.deck.pop()!, this.deck.pop()!];
        this.dealerHand = [this.deck.pop()!, this.deck.pop()!];
        this.phase = 'play';
        this.message = 'H=Hit S=Stand';
      } else if (this.phase === 'play') {
        if (this.key('h')) {
          this.playerHand.push(this.deck.pop()!);
          const total = this.playerHand.reduce((s, c) => s + this.cardVal(c), 0);
          if (total > 21) {
            this.message = 'Bust!';
            this.phase = 'end';
            this.gameOver();
          }
        }
        if (this.key('s')) {
          while (this.dealerHand.reduce((s, c) => s + this.cardVal(c), 0) < 17)
            this.dealerHand.push(this.deck.pop()!);
          const p = this.playerHand.reduce((s, c) => s + this.cardVal(c), 0);
          const d = this.dealerHand.reduce((s, c) => s + this.cardVal(c), 0);
          if (p > d || d > 21) {
            this.addScore(100);
            this.message = 'You Win!';
          } else {
            this.message = 'Dealer Wins';
            this.gameOver();
          }
          this.phase = 'end';
        }
      } else {
        this.restart();
      }
    } else if (this.cfg.type === 'war') {
      const p = this.deck.pop()!;
      const d = this.deck.pop()!;
      this.playerHand = [p];
      this.dealerHand = [d];
      if (this.cardVal(p) > this.cardVal(d)) {
        this.addScore(10);
        this.message = 'You Win!';
      } else if (this.cardVal(d) > this.cardVal(p)) {
        this.message = 'You Lose';
        this.gameOver();
      } else this.message = 'War - Tie';
      this.phase = 'end';
    } else if (this.cfg.type === 'higher') {
      const c = this.deck.pop()!;
      this.playerHand = [c];
      if (this.phase === 'bet') {
        this.phase = 'guess';
        this.message = 'U=Up D=Down';
        return;
      }
      const next = this.deck.pop()!;
      const up = this.key('u') || this.key('arrowup');
      const won = up ? this.cardVal(next) > this.cardVal(c) : this.cardVal(next) < this.cardVal(c);
      this.dealerHand = [next];
      if (won) {
        this.addScore(20);
        this.message = 'Correct!';
      } else {
        this.message = 'Wrong!';
        this.gameOver();
      }
      this.phase = 'end';
    } else {
      this.message = 'Poker - Match pairs!';
      this.playerHand = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];
      if (this.playerHand[0] % 13 === this.playerHand[1] % 13) {
        this.addScore(50);
        this.message = 'Pair!';
      }
      this.phase = 'end';
    }
  }

  protected draw(): void {
    this.clear(this.cfg.bg);
    const g = this.ctx2d;
    g.fillStyle = this.cfg.accent;
    this.drawText(this.cfg.title, 40, 16, this.cfg.accent, 8);
    this.drawText(this.message, 20, 40, '#fff', 8);
    this.drawText(`Score: ${this.score}`, 20, 56, '#00f5ff', 8);
    let x = 20;
    for (const c of this.playerHand) {
      g.fillStyle = '#fff';
      g.fillRect(x, 80, 36, 50);
      g.fillStyle = '#000';
      this.drawText(this.cardLabel(c), x + 4, 110, '#000', 8);
      x += 44;
    }
    x = 20;
    for (const c of this.dealerHand) {
      g.fillStyle = '#ddd';
      g.fillRect(x, 150, 36, 50);
      g.fillStyle = '#000';
      this.drawText(this.cardLabel(c), x + 4, 180, '#000', 8);
      x += 44;
    }
    this.drawText('SPACE: action', 20, this.height - 20, '#888', 8);
  }
}
