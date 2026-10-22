import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getHighScore } from '../app/storage';

interface Car {
  x: number;
  y: number;
  angle: number;
  speed: number;
  health: number;
  hitCd: number;
}

interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const WORLD = 1400;
const CELL = 200;
const ROAD = 64;
const CAR_LEN = 22;
const CAR_W = 12;
const COLL_R = 12;

type State = 'playing' | 'dead';

export class WantedEngine extends BaseEngine {
  private player!: Car;
  private police: Car[] = [];
  private buildings: Building[] = [];
  private particles: Particle[] = [];
  private camX = 0;
  private camY = 0;
  private wanted = 1;
  private wantedProgress = 0;
  private spawnTimer = 0;
  private survival = 0;
  private kills = 0;
  private state: State = 'playing';
  private shake = 0;

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
    this.player = { x: WORLD / 2, y: WORLD / 2, angle: -Math.PI / 2, speed: 0, health: 100, hitCd: 0 };
    this.police = [];
    this.particles = [];
    this.wanted = 1;
    this.wantedProgress = 0;
    this.spawnTimer = 1;
    this.survival = 0;
    this.kills = 0;
    this.score = 0;
    this.state = 'playing';
    this.shake = 0;
    this.buildCity();
    this.camX = this.player.x;
    this.camY = this.player.y;
  }

  private buildCity(): void {
    this.buildings = [];
    // City grid: each CELL contains one building, with ROAD-wide gaps between
    // cells forming a clean street network. Buildings never touch the roads.
    for (let bx = 0; bx < WORLD; bx += CELL) {
      for (let by = 0; by < WORLD; by += CELL) {
        const cx = bx + CELL / 2;
        const cy = by + CELL / 2;
        // leave the center block open for the player spawn
        if (Math.hypot(cx - WORLD / 2, cy - WORLD / 2) < CELL) continue;
        this.buildings.push({
          x: bx + ROAD / 2,
          y: by + ROAD / 2,
          w: CELL - ROAD,
          h: CELL - ROAD,
        });
      }
    }
  }

  protected onKeyDown(key: string): void {
    if (this.state === 'dead' && (key === ' ' || key === 'enter')) this.restart();
  }

  protected onTap(): void {
    if (this.state === 'dead') this.restart();
  }

  protected update(dt: number): void {
    if (this.state === 'dead') return;
    this.survival += dt;
    this.score = Math.floor(this.survival * 5) + this.kills * 100;

    this.updatePlayer(dt);
    this.updateWanted(dt);
    this.spawnPolice(dt);
    this.updatePolice(dt);
    this.updateParticles(dt);

    // camera follow
    this.camX += (this.player.x - this.camX) * Math.min(1, dt * 6);
    this.camY += (this.player.y - this.camY) * Math.min(1, dt * 6);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);

    if (this.player.health <= 0) {
      this.state = 'dead';
      this.explode(this.player.x, this.player.y, '#ff3300', 30);
      this.noise(0.5, 0.2);
      this.tone(70, 0.5, 'sawtooth', 0.1);
      this.gameOver();
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const accel = 320;
    const maxSpeed = 240;
    const maxRev = -110;
    if (this.key('arrowup') || this.key('w')) p.speed += accel * dt;
    else if (this.key('arrowdown') || this.key('s')) p.speed -= accel * dt;
    else p.speed *= 0.96;
    p.speed = Math.max(maxRev, Math.min(maxSpeed, p.speed));
    if (Math.abs(p.speed) < 3) p.speed *= 0.8;

    const turn = 2.6 * Math.min(1, Math.abs(p.speed) / 90) * Math.sign(p.speed);
    if (this.key('arrowleft') || this.key('a')) p.angle -= turn * dt;
    if (this.key('arrowright') || this.key('d')) p.angle += turn * dt;
    if (p.hitCd > 0) p.hitCd -= dt;

    this.moveCar(p, dt);

    // tyre smoke when fast
    if (Math.abs(p.speed) > 160 && Math.random() < 0.4) {
      this.particles.push({
        x: p.x - Math.cos(p.angle) * 10,
        y: p.y - Math.sin(p.angle) * 10,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 0.5,
        color: 'rgba(180,180,180,0.5)',
      });
    }
  }

  private moveCar(c: Car, dt: number): void {
    let nx = c.x + Math.cos(c.angle) * c.speed * dt;
    let ny = c.y + Math.sin(c.angle) * c.speed * dt;
    // building collision (AABB vs point with radius)
    for (const b of this.buildings) {
      if (nx > b.x - COLL_R && nx < b.x + b.w + COLL_R && ny > b.y - COLL_R && ny < b.y + b.h + COLL_R) {
        // resolve on the smaller penetration axis
        const left = Math.abs(nx - (b.x - COLL_R));
        const right = Math.abs(nx - (b.x + b.w + COLL_R));
        const top = Math.abs(ny - (b.y - COLL_R));
        const bottom = Math.abs(ny - (b.y + b.h + COLL_R));
        const m = Math.min(left, right, top, bottom);
        if (m === left) nx = b.x - COLL_R;
        else if (m === right) nx = b.x + b.w + COLL_R;
        else if (m === top) ny = b.y - COLL_R;
        else ny = b.y + b.h + COLL_R;
        c.speed *= 0.5;
      }
    }
    nx = Math.max(20, Math.min(WORLD - 20, nx));
    ny = Math.max(20, Math.min(WORLD - 20, ny));
    c.x = nx;
    c.y = ny;
  }

  private updateWanted(dt: number): void {
    this.wantedProgress += dt;
    const threshold = 14;
    if (this.wantedProgress > threshold && this.wanted < 5) {
      this.wanted++;
      this.wantedProgress = 0;
    }
  }

  private spawnPolice(dt: number): void {
    this.spawnTimer -= dt;
    const maxCops = this.wanted + 1;
    if (this.spawnTimer <= 0 && this.police.length < maxCops) {
      this.spawnTimer = Math.max(0.8, 3 - this.wanted * 0.3);
      const ang = Math.random() * Math.PI * 2;
      const dist = 200;
      this.police.push({
        x: this.player.x + Math.cos(ang) * dist,
        y: this.player.y + Math.sin(ang) * dist,
        angle: ang + Math.PI,
        speed: 0,
        health: 100,
        hitCd: 0,
      });
    }
  }

  private updatePolice(dt: number): void {
    const p = this.player;
    for (const cop of this.police) {
      const dx = p.x - cop.x;
      const dy = p.y - cop.y;
      const targetAng = Math.atan2(dy, dx);
      let diff = targetAng - cop.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const copMax = 150 + this.wanted * 18;
      cop.speed += 260 * dt;
      cop.speed = Math.min(copMax, cop.speed);
      if (cop.hitCd > 0) cop.hitCd -= dt;
      this.moveCar(cop, dt);

      // collision with player
      const d = Math.hypot(cop.x - p.x, cop.y - p.y);
      if (d < CAR_LEN) {
        const closing = Math.abs(p.speed) + Math.abs(cop.speed);
        // push apart
        const nx = (cop.x - p.x) / (d || 1);
        const ny = (cop.y - p.y) / (d || 1);
        cop.x += nx * 6;
        cop.y += ny * 6;
        p.x -= nx * 4;
        p.y -= ny * 4;
        if (p.hitCd <= 0) {
          // player gets hurt more if cop is fast and player slow
          const playerRam = Math.abs(p.speed) > 130;
          if (playerRam) {
            cop.health -= 55;
            p.health -= 4;
          } else {
            p.health -= Math.min(22, 6 + closing * 0.05);
            cop.health -= 18;
          }
          p.hitCd = 0.4;
          cop.hitCd = 0.4;
          this.shake = 1;
          this.explode((p.x + cop.x) / 2, (p.y + cop.y) / 2, '#ffaa00', 6);
          this.noise(0.08, 0.1);
          this.tone(140, 0.06, 'sawtooth', 0.06);
        }
      }
    }
    // remove wrecked cops
    for (const cop of this.police) {
      if (cop.health <= 0) {
        this.kills++;
        this.explode(cop.x, cop.y, '#ff5500', 18);
        this.noise(0.3, 0.16);
        this.tone(90, 0.25, 'sawtooth', 0.08);
        this.wantedProgress += 3;
      }
    }
    this.police = this.police.filter((c) => c.health > 0);
    // despawn cops that drift too far
    this.police = this.police.filter(
      (c) => Math.hypot(c.x - this.player.x, c.y - this.player.y) < 700
    );
  }

  private explode(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.5,
        color,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.clear('#10121a');

    const sx = this.shake > 0 ? (Math.random() - 0.5) * 6 * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * 6 * this.shake : 0;
    const offX = this.width / 2 - this.camX + sx;
    const offY = this.height / 2 - this.camY + sy;

    g.save();
    g.translate(offX, offY);

    this.drawGround();
    this.drawBuildings();
    this.drawParticles();
    for (const cop of this.police) this.drawCar(cop, '#1133bb', true);
    this.drawCar(this.player, '#dd2222', false);

    g.restore();

    this.drawHud();
    if (this.state === 'dead') this.drawBusted();
  }

  private drawGround(): void {
    const g = this.ctx2d;
    // grass/lot base
    g.fillStyle = '#181a22';
    g.fillRect(0, 0, WORLD, WORLD);
    // road bands centred on every CELL boundary (the gaps between buildings)
    g.fillStyle = '#2b2e38';
    for (let i = 0; i <= WORLD; i += CELL) {
      g.fillRect(i - ROAD / 2, 0, ROAD, WORLD);
      g.fillRect(0, i - ROAD / 2, WORLD, ROAD);
    }
    // dashed centre lane lines along each road
    g.fillStyle = '#ffd24a';
    for (let i = 0; i <= WORLD; i += CELL) {
      for (let j = 8; j < WORLD; j += 34) {
        g.fillRect(i - 1.5, j, 3, 16);
        g.fillRect(j, i - 1.5, 16, 3);
      }
    }
    // world border
    g.strokeStyle = '#ff00aa';
    g.lineWidth = 6;
    g.strokeRect(0, 0, WORLD, WORLD);
  }

  private drawBuildings(): void {
    const g = this.ctx2d;
    for (const b of this.buildings) {
      g.fillStyle = '#0c0e16';
      g.fillRect(b.x + 3, b.y + 3, b.w, b.h);
      g.fillStyle = '#3a3f55';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = '#262b3c';
      g.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
      // windows
      g.fillStyle = 'rgba(0,245,255,0.25)';
      for (let wy = b.y + 8; wy < b.y + b.h - 6; wy += 14)
        for (let wx = b.x + 8; wx < b.x + b.w - 6; wx += 14) g.fillRect(wx, wy, 7, 8);
    }
  }

  private drawCar(c: Car, color: string, police: boolean): void {
    const g = this.ctx2d;
    g.save();
    g.translate(c.x, c.y);
    g.rotate(c.angle);
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(-CAR_LEN / 2 + 2, -CAR_W / 2 + 2, CAR_LEN, CAR_W);
    // body
    g.fillStyle = color;
    g.fillRect(-CAR_LEN / 2, -CAR_W / 2, CAR_LEN, CAR_W);
    // windshield
    g.fillStyle = '#9fe9ff';
    g.fillRect(CAR_LEN / 2 - 9, -CAR_W / 2 + 2, 5, CAR_W - 4);
    // roof / details
    g.fillStyle = police ? '#0a1a55' : '#7a1010';
    g.fillRect(-CAR_LEN / 2 + 5, -CAR_W / 2 + 2, 8, CAR_W - 4);
    if (police) {
      const t = Math.sin(performance.now() / 90) > 0;
      g.fillStyle = t ? '#ff2222' : '#2255ff';
      g.fillRect(-1, -CAR_W / 2 + 2, 3, CAR_W - 4);
    }
    // headlights
    g.fillStyle = '#fff7c0';
    g.fillRect(CAR_LEN / 2 - 2, -CAR_W / 2 + 1, 2, 3);
    g.fillRect(CAR_LEN / 2 - 2, CAR_W / 2 - 4, 2, 3);
    g.restore();

    // health pip for police
    if (police && c.health < 100) {
      g.fillStyle = '#000';
      g.fillRect(c.x - 10, c.y - CAR_LEN, 20, 3);
      g.fillStyle = c.health > 50 ? '#39ff14' : '#ff5500';
      g.fillRect(c.x - 10, c.y - CAR_LEN, (c.health / 100) * 20, 3);
    }
  }

  private drawParticles(): void {
    const g = this.ctx2d;
    for (const p of this.particles) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      g.fillStyle = p.color;
      g.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    g.globalAlpha = 1;
  }

  private drawHud(): void {
    const g = this.ctx2d;
    // health bar
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(6, 6, 92, 12);
    g.fillStyle = this.player.health > 40 ? '#39ff14' : '#ff3322';
    g.fillRect(8, 8, Math.max(0, this.player.health / 100) * 88, 8);
    g.strokeStyle = '#00f5ff';
    g.lineWidth = 1;
    g.strokeRect(6, 6, 92, 12);
    this.drawText('HP', 100, 16, '#fff', 6);

    // score
    this.drawText(`SCORE ${this.score}`, 6, 32, '#ffe600', 7);
    this.drawText(`WRECKS ${this.kills}`, 6, 44, '#ff7b35', 6);

    // wanted stars
    const sx = this.width - 8;
    for (let i = 0; i < 5; i++) {
      const lit = i < this.wanted;
      this.drawStar(sx - i * 16 - 8, 14, 6, lit ? '#ffe600' : 'rgba(120,120,140,0.4)');
    }
  }

  private drawStar(cx: number, cy: number, r: number, color: string): void {
    const g = this.ctx2d;
    g.fillStyle = color;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r / 2.3;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
  }

  private drawBusted(): void {
    const g = this.ctx2d;
    g.fillStyle = 'rgba(10,0,0,0.7)';
    g.fillRect(0, 0, this.width, this.height);
    const best = getHighScore(this.ctx.slug);
    this.centerText('BUSTED!', this.height / 2 - 34, '#ff2222', 18);
    this.centerText(`SCORE ${this.score}`, this.height / 2, '#fff', 9);
    this.centerText(`WRECKS ${this.kills}   BEST ${best}`, this.height / 2 + 18, '#ffe600', 7);
    if (Math.sin(performance.now() / 250) > 0)
      this.centerText('SPACE / TAP TO RETRY', this.height / 2 + 40, '#39ff14', 7);
  }

  private centerText(text: string, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    const w = g.measureText(text).width;
    g.fillStyle = color;
    g.fillText(text, this.width / 2 - w / 2, y);
  }
}
