import { BaseEngine } from './base';

const CX = 160;
const CY = 120;
const OUTRX = 145;
const OUTRY = 96;
const INRX = 80;
const INRY = 46;
const MIDRX = (OUTRX + INRX) / 2;
const MIDRY = (OUTRY + INRY) / 2;
const TOTAL_LAPS = 3;

export class TopRaceEngine extends BaseEngine {
  private x = 140;
  private y = CY - MIDRY;
  private angle = 0;
  private speed = 0;
  private laps = 0;
  private passedHalf = false;
  private lapCd = 0;
  private time = 0;
  private aiTheta = -Math.PI / 2;
  private aiLaps = 0;
  private finished = false;
  private won = false;

  protected init(): void {
    this.x = 140;
    this.y = CY - MIDRY;
    this.angle = 0;
    this.speed = 0;
    this.laps = 0;
    this.passedHalf = false;
    this.lapCd = 0;
    this.time = 0;
    this.aiTheta = -Math.PI / 2;
    this.aiLaps = 0;
    this.finished = false;
    this.won = false;
    this.score = 0;
    this.ctx.onScoreChange(0);
  }

  protected onTap(): void {
    if (this.finished) this.restart();
  }

  protected onKeyDown(key: string): void {
    if (this.finished && (key === ' ' || key === 'enter')) this.restart();
  }

  private onTrack(x: number, y: number): boolean {
    const vo = ((x - CX) / OUTRX) ** 2 + ((y - CY) / OUTRY) ** 2;
    const vi = ((x - CX) / INRX) ** 2 + ((y - CY) / INRY) ** 2;
    return vo <= 1 && vi >= 1;
  }

  protected update(dt: number): void {
    if (this.finished) return;
    this.time += dt;
    if (this.lapCd > 0) this.lapCd -= dt;

    const on = this.onTrack(this.x, this.y);
    const maxSpeed = on ? 170 : 65;
    if (this.key('arrowup') || this.key('w')) this.speed += 220 * dt;
    else if (this.key('arrowdown') || this.key('s')) this.speed -= 220 * dt;
    else this.speed *= 1 - 0.8 * dt;
    if (!on) this.speed *= 1 - 2.2 * dt;
    this.speed = Math.max(-60, Math.min(maxSpeed, this.speed));

    const steer = 2.6;
    const grip = Math.min(1, Math.abs(this.speed) / 40);
    if (this.key('arrowleft') || this.key('a')) this.angle -= steer * dt * grip * Math.sign(this.speed || 1);
    if (this.key('arrowright') || this.key('d')) this.angle += steer * dt * grip * Math.sign(this.speed || 1);

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.x = Math.max(6, Math.min(this.width - 6, this.x));
    this.y = Math.max(6, Math.min(this.height - 6, this.y));

    // bottom checkpoint
    if (Math.abs(this.x - CX) < 30 && this.y > CY + INRY && this.y < CY + OUTRY) this.passedHalf = true;
    // start/finish line (top)
    if (this.lapCd <= 0 && this.passedHalf && Math.abs(this.x - CX) < 26 && this.y > CY - OUTRY && this.y < CY - INRY && Math.cos(this.angle) > 0) {
      this.laps++;
      this.passedHalf = false;
      this.lapCd = 2;
      this.addScore(1000);
      this.tone(880, 0.1);
      if (this.laps >= TOTAL_LAPS) this.finish(true);
    }

    // AI
    this.aiTheta += 0.62 * dt;
    if (this.aiTheta - (-Math.PI / 2) >= (this.aiLaps + 1) * Math.PI * 2) {
      this.aiLaps++;
      if (this.aiLaps >= TOTAL_LAPS && !this.finished) this.finish(false);
    }

    if (this.time > 120) this.finish(this.laps > this.aiLaps);
  }

  private finish(won: boolean): void {
    this.finished = true;
    this.won = won;
    if (won) this.addScore(2000 + Math.max(0, Math.floor((120 - this.time) * 20)));
    this.gameOver();
  }

  protected draw(): void {
    const g = this.ctx2d;
    this.clear('#10331a');
    // track band
    g.fillStyle = '#3a3a44';
    g.beginPath();
    g.ellipse(CX, CY, OUTRX, OUTRY, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#10331a';
    g.beginPath();
    g.ellipse(CX, CY, INRX, INRY, 0, 0, Math.PI * 2);
    g.fill();

    // start line (checkered)
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? '#fff' : '#111';
      g.fillRect(CX - 14 + i * 6, CY - OUTRY, 6, OUTRY - INRY);
    }

    // AI car
    const ax = CX + MIDRX * Math.cos(this.aiTheta);
    const ay = CY + MIDRY * Math.sin(this.aiTheta);
    g.save();
    g.translate(ax, ay);
    g.rotate(this.aiTheta + Math.PI / 2);
    g.fillStyle = '#00f5ff';
    g.fillRect(-5, -8, 10, 16);
    g.restore();

    // player car
    g.save();
    g.translate(this.x, this.y);
    g.rotate(this.angle + Math.PI / 2);
    g.fillStyle = '#ff3b3b';
    g.fillRect(-5, -8, 10, 16);
    g.fillStyle = '#ffe600';
    g.fillRect(-4, -8, 8, 3);
    g.restore();

    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, this.width, 13);
    this.drawText(`LAP ${Math.min(this.laps + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`, 4, 10, '#ffe600', 7);
    this.drawText(`CPU ${Math.min(this.aiLaps, TOTAL_LAPS)}/${TOTAL_LAPS}`, 96, 10, '#00f5ff', 7);
    this.drawText(`${this.time.toFixed(1)}s`, 200, 10, '#fff', 7);
    this.drawText(`SCORE ${this.score}`, 244, 10, '#39ff14', 6);

    if (this.finished) this.drawOverlay(this.won ? 'YOU WIN!' : 'CPU WINS', 'TAP / SPACE to race again');
  }
}
