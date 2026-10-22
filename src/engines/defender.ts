import { BaseEngine } from './base';

interface Bullet { x: number; y: number; vy: number; foe: boolean; }
interface Foe { x: number; y: number; vy: number; sway: number; phase: number; hp: number; fireCd: number; }

export class DefenderEngine extends BaseEngine {
  private px = 160;
  private py = 210;
  private bullets: Bullet[] = [];
  private foes: Foe[] = [];
  private spawnCd = 0;
  private fireCd = 0;
  private lives = 3;
  private wave = 1;
  private waveTimer = 0;
  private dead = false;
  private anim = 0;

  protected init(): void {
    this.px = 160;
    this.py = 210;
    this.bullets = [];
    this.foes = [];
    this.spawnCd = 0.5;
    this.fireCd = 0;
    this.lives = 3;
    this.wave = 1;
    this.waveTimer = 0;
    this.dead = false;
    this.score = 0;
    this.ctx.onScoreChange(0);
  }

  protected onTap(): void {
    if (this.dead) this.restart();
  }

  protected onKeyDown(key: string): void {
    if (this.dead && (key === ' ' || key === 'enter')) this.restart();
  }

  protected update(dt: number): void {
    this.anim += dt;
    if (this.dead) return;
    this.waveTimer += dt;
    if (this.waveTimer > 18) { this.waveTimer = 0; this.wave++; }

    const speed = 150;
    if (this.key('arrowleft') || this.key('a')) this.px -= speed * dt;
    if (this.key('arrowright') || this.key('d')) this.px += speed * dt;
    if (this.key('arrowup') || this.key('w')) this.py -= speed * dt;
    if (this.key('arrowdown') || this.key('s')) this.py += speed * dt;
    this.px = Math.max(12, Math.min(this.width - 12, this.px));
    this.py = Math.max(140, Math.min(this.height - 16, this.py));

    this.fireCd -= dt;
    if (this.isAction() && this.fireCd <= 0) {
      this.fireCd = 0.22;
      this.bullets.push({ x: this.px, y: this.py - 10, vy: -340, foe: false });
      this.tone(880, 0.03, 'square', 0.04);
    }

    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      this.spawnCd = Math.max(0.4, 1.3 - this.wave * 0.08);
      this.foes.push({
        x: 20 + Math.random() * (this.width - 40),
        y: -10,
        vy: 28 + this.wave * 4 + Math.random() * 20,
        sway: 20 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        hp: 1 + (Math.random() < this.wave * 0.06 ? 1 : 0),
        fireCd: 1 + Math.random() * 2,
      });
    }

    for (const f of this.foes) {
      f.y += f.vy * dt;
      f.x += Math.sin(this.anim * 2 + f.phase) * f.sway * dt;
      f.fireCd -= dt;
      if (f.fireCd <= 0 && f.y > 0 && f.y < 180) {
        f.fireCd = 1.6 + Math.random() * 2;
        this.bullets.push({ x: f.x, y: f.y + 8, vy: 150, foe: true });
      }
      if (f.y > this.height + 10) { this.loseLife(); f.hp = 0; }
    }

    for (const b of this.bullets) b.y += b.vy * dt;

    // bullet vs foe
    for (const b of this.bullets) {
      if (b.foe) continue;
      for (const f of this.foes) {
        if (f.hp > 0 && Math.abs(b.x - f.x) < 11 && Math.abs(b.y - f.y) < 11) {
          f.hp--;
          b.y = -999;
          if (f.hp <= 0) { this.addScore(10 + this.wave); this.tone(330, 0.07, 'square', 0.05); }
        }
      }
    }
    // foe bullet vs player
    for (const b of this.bullets) {
      if (!b.foe) continue;
      if (Math.abs(b.x - this.px) < 11 && Math.abs(b.y - this.py) < 11) {
        b.y = 9999;
        this.loseLife();
      }
    }
    // foe vs player
    for (const f of this.foes) {
      if (f.hp > 0 && Math.abs(f.x - this.px) < 13 && Math.abs(f.y - this.py) < 13) {
        f.hp = 0;
        this.loseLife();
      }
    }

    this.bullets = this.bullets.filter((b) => b.y > -20 && b.y < this.height + 20);
    this.foes = this.foes.filter((f) => f.hp > 0 && f.y < this.height + 10);
  }

  private loseLife(): void {
    this.lives--;
    this.noise(0.2, 0.14);
    if (this.lives <= 0) {
      this.dead = true;
      this.gameOver();
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    this.clear('#05060f');
    for (let i = 0; i < 30; i++) {
      const sx = (i * 53 + Math.floor(this.anim * 18)) % this.width;
      const sy = (i * 37) % this.height;
      g.fillStyle = i % 3 ? '#1a2340' : '#2a3a60';
      g.fillRect(sx, sy, 1, 2);
    }

    for (const f of this.foes) {
      g.fillStyle = f.hp > 1 ? '#ff6b35' : '#ff3b6b';
      g.fillRect(f.x - 9, f.y - 6, 18, 10);
      g.fillStyle = '#ffe600';
      g.fillRect(f.x - 5, f.y + 4, 3, 3);
      g.fillRect(f.x + 2, f.y + 4, 3, 3);
    }

    for (const b of this.bullets) {
      g.fillStyle = b.foe ? '#ff3b6b' : '#00f5ff';
      g.fillRect(b.x - 1, b.y - 4, 3, 8);
    }

    g.fillStyle = '#00f5ff';
    g.beginPath();
    g.moveTo(this.px, this.py - 11);
    g.lineTo(this.px - 10, this.py + 9);
    g.lineTo(this.px + 10, this.py + 9);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffe600';
    g.fillRect(this.px - 2, this.py - 4, 4, 8);

    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, this.width, 13);
    this.drawText(`SCORE ${this.score}`, 4, 10, '#00f5ff', 7);
    this.drawText(`WAVE ${this.wave}`, 150, 10, '#ffe600', 7);
    this.drawText(`LIVES ${this.lives}`, 230, 10, '#ff3b6b', 7);

    if (this.dead) this.drawOverlay('DEFENSE DOWN', 'TAP / SPACE to replay');
  }
}
