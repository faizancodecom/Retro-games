import { BaseEngine } from './base';

interface Arrow { x: number; y: number; vx: number; vy: number; }
interface Enemy { x: number; hp: number; speed: number; kind: number; }

const GROUND = 200;
const CASTLE_X = 34;
const GRAVITY = 320;

export class ArcherEngine extends BaseEngine {
  private angle = -0.6;
  private powerT = 0.3;
  private powerDir = 1;
  private arrows: Arrow[] = [];
  private enemies: Enemy[] = [];
  private spawnCd = 1;
  private fireCd = 0;
  private castleHp = 5;
  private wave = 1;
  private waveTimer = 0;
  private dead = false;

  protected init(): void {
    this.angle = -0.6;
    this.powerT = 0.3;
    this.powerDir = 1;
    this.arrows = [];
    this.enemies = [];
    this.spawnCd = 1;
    this.fireCd = 0;
    this.castleHp = 5;
    this.wave = 1;
    this.waveTimer = 0;
    this.dead = false;
    this.score = 0;
    this.ctx.onScoreChange(0);
  }

  protected onTap(): void {
    if (this.dead) this.restart();
    else this.fire();
  }

  protected onKeyDown(key: string): void {
    if (this.dead) {
      if (key === ' ' || key === 'enter') this.restart();
      return;
    }
    if (key === ' ' || key === 'enter') this.fire();
  }

  private fire(): void {
    if (this.fireCd > 0) return;
    this.fireCd = 0.35;
    const spd = 150 + this.powerT * 250;
    this.arrows.push({
      x: CASTLE_X + 6,
      y: 150,
      vx: Math.cos(this.angle) * spd,
      vy: Math.sin(this.angle) * spd,
    });
    this.tone(520, 0.05, 'square', 0.05);
  }

  protected update(dt: number): void {
    if (this.dead) return;

    if (this.key('arrowup') || this.key('w')) this.angle = Math.max(-1.45, this.angle - 1.4 * dt);
    if (this.key('arrowdown') || this.key('s')) this.angle = Math.min(-0.05, this.angle + 1.4 * dt);

    this.powerT += this.powerDir * 1.3 * dt;
    if (this.powerT >= 1) { this.powerT = 1; this.powerDir = -1; }
    if (this.powerT <= 0) { this.powerT = 0; this.powerDir = 1; }

    this.fireCd -= dt;
    this.waveTimer += dt;
    if (this.waveTimer > 16) { this.waveTimer = 0; this.wave++; }

    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      this.spawnCd = Math.max(0.7, 2.0 - this.wave * 0.12);
      const tough = Math.random() < this.wave * 0.08;
      this.enemies.push({
        x: this.width + 8,
        hp: tough ? 3 : 1,
        speed: 16 + this.wave * 2 + Math.random() * 8,
        kind: tough ? 1 : 0,
      });
    }

    for (const a of this.arrows) {
      a.vy += GRAVITY * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
    }

    for (const e of this.enemies) {
      e.x -= e.speed * dt;
      if (e.x < CASTLE_X) {
        e.hp = 0;
        this.castleHp--;
        this.noise(0.25, 0.16);
        if (this.castleHp <= 0) { this.dead = true; this.gameOver(); }
      }
    }

    for (const a of this.arrows) {
      if (a.y > GROUND) continue;
      for (const e of this.enemies) {
        if (e.hp > 0 && Math.abs(a.x - e.x) < 12 && a.y > GROUND - 32 && a.y < GROUND) {
          e.hp--;
          a.y = GROUND + 99;
          if (e.hp <= 0) { this.addScore(e.kind ? 30 : 12); this.tone(330, 0.06, 'square', 0.05); }
          break;
        }
      }
    }

    this.arrows = this.arrows.filter((a) => a.x < this.width + 20 && a.y < GROUND + 4 && a.x > 0);
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  protected draw(): void {
    const g = this.ctx2d;
    this.clear('#1a2740');
    // sky gradient strip
    g.fillStyle = '#24365a';
    g.fillRect(0, 0, this.width, 70);
    // ground
    g.fillStyle = '#3a5a2a';
    g.fillRect(0, GROUND, this.width, this.height - GROUND);
    g.fillStyle = '#2c4720';
    g.fillRect(0, GROUND, this.width, 4);

    // castle
    g.fillStyle = '#8a8a9a';
    g.fillRect(6, 150, 40, GROUND - 150);
    for (let i = 0; i < 4; i++) { g.fillRect(6 + i * 11, 144, 7, 8); }
    g.fillStyle = '#5a5a6a';
    g.fillRect(20, 175, 12, GROUND - 175);

    // archer + aim line
    const ax = CASTLE_X + 6;
    const ay = 150;
    g.fillStyle = '#ffe600';
    g.fillRect(ax - 3, ay - 8, 6, 8);
    g.strokeStyle = 'rgba(0,245,255,0.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(ax + Math.cos(this.angle) * 26, ay + Math.sin(this.angle) * 26);
    g.stroke();

    for (const e of this.enemies) {
      g.fillStyle = e.kind ? '#ff6b35' : '#ff3b6b';
      g.fillRect(e.x - 6, GROUND - 18, 12, 18);
      g.fillStyle = '#0a0a14';
      g.fillRect(e.x - 3, GROUND - 14, 2, 2);
      g.fillRect(e.x + 1, GROUND - 14, 2, 2);
      if (e.kind) { g.fillStyle = '#ffe600'; g.fillRect(e.x - 6, GROUND - 21, 12, 2); }
    }

    g.strokeStyle = '#ffe600';
    g.lineWidth = 2;
    for (const a of this.arrows) {
      const len = 8;
      const m = Math.hypot(a.vx, a.vy) || 1;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(a.x - (a.vx / m) * len, a.y - (a.vy / m) * len);
      g.stroke();
    }

    // power meter
    g.fillStyle = '#222';
    g.fillRect(this.width - 14, 30, 8, 80);
    g.fillStyle = this.powerT > 0.75 ? '#ff3b6b' : '#39ff14';
    g.fillRect(this.width - 14, 110 - this.powerT * 80, 8, this.powerT * 80);

    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, this.width, 13);
    this.drawText(`SCORE ${this.score}`, 4, 10, '#ffe600', 7);
    this.drawText(`WAVE ${this.wave}`, 150, 10, '#00f5ff', 7);
    this.drawText(`CASTLE ${'#'.repeat(Math.max(0, this.castleHp))}`, 215, 10, '#ff3b6b', 7);

    if (this.dead) this.drawOverlay('CASTLE FELL', 'TAP / SPACE to defend again');
  }
}
