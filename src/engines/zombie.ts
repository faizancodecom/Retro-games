import { BaseEngine } from './base';
import type { EngineContext } from '../types';

interface Zombie {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  r: number;
  type: 'walker' | 'runner' | 'tank';
}
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
}
interface Pickup {
  x: number;
  y: number;
  kind: 'ammo' | 'health';
  t: number;
}
interface Weapon {
  name: string;
  dmg: number;
  fireRate: number;
  pellets: number;
  spread: number;
  speed: number;
  ammo: number;
  infinite: boolean;
}

const HUD_BOTTOM = 30;

export class ZombieEngine extends BaseEngine {
  private px = 160;
  private py = 110;
  private hp = 100;
  private maxHp = 100;
  private aim = 0;
  private speed = 82;

  private weapons: Weapon[] = [];
  private cur = 0;
  private fireT = 0;

  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private pickups: Pickup[] = [];

  private wave = 1;
  private toSpawn = 0;
  private spawnT = 0;
  private waveBreak = 0;
  private hurt = 0;
  private dead = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = 320;
    this.height = 240;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    this.px = this.width / 2;
    this.py = (this.height - HUD_BOTTOM) / 2 + 10;
    this.hp = this.maxHp = 100;
    this.aim = 0;
    this.weapons = [
      { name: 'PISTOL', dmg: 3, fireRate: 0.3, pellets: 1, spread: 0.04, speed: 320, ammo: Infinity, infinite: true },
      { name: 'SHOTGUN', dmg: 3, fireRate: 0.75, pellets: 6, spread: 0.5, speed: 300, ammo: 16, infinite: false },
      { name: 'RIFLE', dmg: 2, fireRate: 0.1, pellets: 1, spread: 0.06, speed: 420, ammo: 60, infinite: false },
    ];
    this.cur = 0;
    this.fireT = 0;
    this.zombies = [];
    this.bullets = [];
    this.pickups = [];
    this.wave = 1;
    this.waveBreak = 1.5;
    this.toSpawn = this.waveCount();
    this.spawnT = 0;
    this.hurt = 0;
    this.dead = false;
    this.score = 0;
  }

  private waveCount(): number {
    return 4 + this.wave * 2;
  }

  protected onKeyDown(key: string): void {
    if (this.dead) {
      if (key === ' ' || key === 'enter') this.restart();
      return;
    }
    if (key === '1') this.cur = 0;
    else if (key === '2') this.cur = 1;
    else if (key === '3') this.cur = 2;
  }

  handlePointer(cxp: number, cyp: number): void {
    if (this.dead) {
      this.restart();
      return;
    }
    const x = cxp / this.scale;
    const y = cyp / this.scale;
    // tap inventory slots at bottom to switch weapons
    if (y > this.height - HUD_BOTTOM) {
      const slot = Math.floor(x / (this.width / 3));
      if (slot >= 0 && slot < 3) this.cur = slot;
    }
  }

  private fire(): void {
    const w = this.weapons[this.cur];
    if (!w.infinite && w.ammo <= 0) {
      this.tone(160, 0.05, 'square', 0.04); // empty click
      return;
    }
    if (!w.infinite) w.ammo--;
    for (let i = 0; i < w.pellets; i++) {
      const a = this.aim + (Math.random() - 0.5) * w.spread;
      this.bullets.push({
        x: this.px,
        y: this.py,
        vx: Math.cos(a) * w.speed,
        vy: Math.sin(a) * w.speed,
        dmg: w.dmg,
        life: 1.2,
      });
    }
    this.fireT = w.fireRate;
    this.tone(w.name === 'SHOTGUN' ? 240 : w.name === 'RIFLE' ? 700 : 520, 0.04, 'square', 0.05);
    if (w.name === 'SHOTGUN') this.noise(0.06, 0.06);
  }

  protected update(dt: number): void {
    if (this.dead) return;

    // movement
    let mx = 0;
    let my = 0;
    if (this.key('arrowleft') || this.key('a')) mx -= 1;
    if (this.key('arrowright') || this.key('d')) mx += 1;
    if (this.key('arrowup') || this.key('w')) my -= 1;
    if (this.key('arrowdown') || this.key('s')) my += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      this.px += (mx / len) * this.speed * dt;
      this.py += (my / len) * this.speed * dt;
    }
    this.px = Math.max(8, Math.min(this.width - 8, this.px));
    this.py = Math.max(20, Math.min(this.height - HUD_BOTTOM - 8, this.py));

    // aim at nearest zombie
    let near: Zombie | null = null;
    let nd = 1e9;
    for (const z of this.zombies) {
      const d = Math.hypot(z.x - this.px, z.y - this.py);
      if (d < nd) {
        nd = d;
        near = z;
      }
    }
    if (near) this.aim = Math.atan2(near.y - this.py, near.x - this.px);

    // firing (hold fire button / space)
    this.fireT -= dt;
    if (this.fireT <= 0 && this.isAction()) this.fire();

    // bullets
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    for (const b of this.bullets) {
      for (const z of this.zombies) {
        if (z.hp > 0 && Math.hypot(z.x - b.x, z.y - b.y) < z.r) {
          z.hp -= b.dmg;
          b.life = 0;
          if (z.hp <= 0) this.killZombie(z);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.x > -10 && b.x < this.width + 10 && b.y > 10 && b.y < this.height + 10);

    // wave / spawning
    if (this.waveBreak > 0) {
      this.waveBreak -= dt;
    } else if (this.toSpawn > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnZombie();
        this.toSpawn--;
        this.spawnT = Math.max(0.35, 1.1 - this.wave * 0.05);
      }
    } else if (this.zombies.length === 0) {
      this.nextWave();
    }

    // zombies move toward player
    if (this.hurt > 0) this.hurt -= dt;
    for (const z of this.zombies) {
      const a = Math.atan2(this.py - z.y, this.px - z.x);
      z.x += Math.cos(a) * z.speed * dt;
      z.y += Math.sin(a) * z.speed * dt;
      if (Math.hypot(z.x - this.px, z.y - this.py) < z.r + 6) {
        this.hp -= (z.type === 'tank' ? 22 : 14) * dt;
        this.hurt = 0.15;
        if (this.hp <= 0) {
          this.hp = 0;
          this.dead = true;
          this.tone(120, 0.4);
          this.gameOver();
          return;
        }
      }
    }
    this.zombies = this.zombies.filter((z) => z.hp > 0);

    // pickups
    for (const p of this.pickups) p.t += dt;
    this.pickups = this.pickups.filter((p) => {
      if (Math.hypot(p.x - this.px, p.y - this.py) < 12) {
        this.collect(p);
        return false;
      }
      return p.t < 12;
    });
  }

  private collect(p: Pickup): void {
    if (p.kind === 'health') {
      this.hp = Math.min(this.maxHp, this.hp + 25);
      this.tone(640, 0.1);
    } else {
      this.weapons[1].ammo += 8;
      this.weapons[2].ammo += 20;
      this.tone(440, 0.1);
    }
  }

  private killZombie(z: Zombie): void {
    z.hp = 0;
    this.addScore(z.type === 'tank' ? 30 : z.type === 'runner' ? 15 : 10);
    if (Math.random() < 0.22) {
      this.pickups.push({ x: z.x, y: z.y, kind: Math.random() < 0.5 ? 'health' : 'ammo', t: 0 });
    }
  }

  private nextWave(): void {
    this.wave++;
    this.toSpawn = this.waveCount();
    this.waveBreak = 2;
    this.weapons[1].ammo += 6;
    this.weapons[2].ammo += 15;
    this.hp = Math.min(this.maxHp, this.hp + 15);
    this.tone(760, 0.15);
  }

  private spawnZombie(): void {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = Math.random() * this.width;
      y = 16;
    } else if (edge === 1) {
      x = Math.random() * this.width;
      y = this.height - HUD_BOTTOM;
    } else if (edge === 2) {
      x = 4;
      y = 20 + Math.random() * 120;
    } else {
      x = this.width - 4;
      y = 20 + Math.random() * 120;
    }
    let type: Zombie['type'] = 'walker';
    const roll = Math.random();
    if (this.wave >= 3 && roll < 0.18) type = 'tank';
    else if (this.wave >= 2 && roll < 0.45) type = 'runner';
    const hp = type === 'tank' ? 14 + this.wave : type === 'runner' ? 4 : 6 + this.wave * 0.5;
    const speed = type === 'runner' ? 64 : type === 'tank' ? 28 : 40;
    const r = type === 'tank' ? 11 : 7;
    this.zombies.push({ x, y, hp, maxHp: hp, speed, r, type });
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear(this.hurt > 0 ? '#2a0d0d' : '#10130f');
    // arena floor specks
    g.fillStyle = '#171c14';
    for (let i = 0; i < this.width; i += 24) {
      for (let j = 16; j < this.height - HUD_BOTTOM; j += 24) g.fillRect(i, j, 2, 2);
    }

    // pickups
    for (const p of this.pickups) {
      const blink = Math.sin(p.t * 8) > 0;
      g.fillStyle = p.kind === 'health' ? (blink ? '#ff4f7b' : '#ff8aa6') : blink ? '#ffe600' : '#fff07a';
      g.fillRect(p.x - 4, p.y - 4, 8, 8);
      g.fillStyle = '#000';
      g.fillRect(p.x - (p.kind === 'health' ? 3 : 2), p.y - 1, p.kind === 'health' ? 6 : 4, 2);
      if (p.kind === 'health') g.fillRect(p.x - 1, p.y - 3, 2, 6);
    }

    // zombies
    for (const z of this.zombies) {
      g.fillStyle = z.type === 'tank' ? '#2f7a2f' : z.type === 'runner' ? '#7ad14a' : '#4faf4f';
      g.fillRect(z.x - z.r, z.y - z.r, z.r * 2, z.r * 2);
      g.fillStyle = '#c0392b';
      g.fillRect(z.x - z.r + 2, z.y - 2, 3, 2);
      g.fillRect(z.x + 1, z.y - 2, 3, 2);
      if (z.hp < z.maxHp) {
        g.fillStyle = '#000';
        g.fillRect(z.x - z.r, z.y - z.r - 4, z.r * 2, 2);
        g.fillStyle = '#39ff14';
        g.fillRect(z.x - z.r, z.y - z.r - 4, z.r * 2 * (z.hp / z.maxHp), 2);
      }
    }

    // bullets
    g.fillStyle = '#ffe600';
    for (const b of this.bullets) g.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);

    // player
    g.fillStyle = this.hurt > 0 ? '#fff' : '#00f5ff';
    g.fillRect(this.px - 6, this.py - 6, 12, 12);
    g.strokeStyle = '#ffe600';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(this.px, this.py);
    g.lineTo(this.px + Math.cos(this.aim) * 14, this.py + Math.sin(this.aim) * 14);
    g.stroke();

    // top HUD
    g.fillStyle = '#000';
    g.fillRect(0, 0, this.width, 14);
    g.fillStyle = '#330000';
    g.fillRect(6, 4, 80, 6);
    g.fillStyle = '#ff3b6b';
    g.fillRect(6, 4, 80 * (this.hp / this.maxHp), 6);
    this.drawText(`WAVE ${this.wave}`, 100, 11, '#ffe600', 7);
    this.drawText(`SCORE ${this.score}`, 180, 11, '#00f5ff', 7);

    // bottom inventory
    const slotW = this.width / 3;
    for (let i = 0; i < 3; i++) {
      const w = this.weapons[i];
      g.fillStyle = i === this.cur ? '#22324a' : '#11151f';
      g.fillRect(i * slotW + 1, this.height - HUD_BOTTOM, slotW - 2, HUD_BOTTOM - 1);
      g.strokeStyle = i === this.cur ? '#00f5ff' : '#333';
      g.lineWidth = 1;
      g.strokeRect(i * slotW + 1, this.height - HUD_BOTTOM, slotW - 2, HUD_BOTTOM - 1);
      this.drawText(`${i + 1} ${w.name}`, i * slotW + 6, this.height - HUD_BOTTOM + 11, i === this.cur ? '#fff' : '#9aa', 6);
      this.drawText(w.infinite ? 'INF' : `${w.ammo}`, i * slotW + 6, this.height - HUD_BOTTOM + 23, w.infinite || w.ammo > 0 ? '#ffe600' : '#ff5555', 6);
    }

    if (this.waveBreak > 0 && !this.dead) {
      this.center(`WAVE ${this.wave}`, this.height / 2 - 6, '#ffe600', 14);
      this.center('GET READY', this.height / 2 + 14, '#39ff14', 8);
    }

    if (this.dead) {
      g.fillStyle = 'rgba(0,0,0,0.8)';
      g.fillRect(0, 0, this.width, this.height);
      this.center('YOU DIED', this.height / 2 - 16, '#ff3b6b', 15);
      this.center(`WAVE ${this.wave}  SCORE ${this.score}`, this.height / 2 + 6, '#00f5ff', 8);
      this.center('TAP / SPACE TO RETRY', this.height / 2 + 28, '#39ff14', 7);
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
