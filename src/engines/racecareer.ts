import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { loadState, saveState } from '../app/storage';

interface Racer {
  x: number;
  y: number;
  angle: number;
  speed: number;
  prevT: number;
  prog: number; // radians of progress
  isPlayer: boolean;
  color: string;
  aiSpeed: number;
}

interface RaceDef {
  name: string;
  laps: number;
  ai: number;
  aiSpeed: number;
  reward: number;
}

interface Save {
  unlocked: number;
  cash: number;
  bestPos: number[];
  engineLv: number;
  gripLv: number;
  wins: number;
}

type State = 'menu' | 'countdown' | 'race' | 'finish';

const RACES: RaceDef[] = [
  { name: 'Rookie Loop', laps: 2, ai: 2, aiSpeed: 0.48, reward: 200 },
  { name: 'City Sprint', laps: 2, ai: 2, aiSpeed: 0.52, reward: 280 },
  { name: 'Harbor Dash', laps: 3, ai: 3, aiSpeed: 0.55, reward: 340 },
  { name: 'Neon Alley', laps: 3, ai: 3, aiSpeed: 0.58, reward: 400 },
  { name: 'Night Circuit', laps: 3, ai: 3, aiSpeed: 0.62, reward: 480 },
  { name: 'Rain Highway', laps: 3, ai: 3, aiSpeed: 0.66, reward: 560 },
  { name: 'Mountain Pass', laps: 4, ai: 3, aiSpeed: 0.69, reward: 640 },
  { name: 'Desert Run', laps: 4, ai: 4, aiSpeed: 0.72, reward: 720 },
  { name: 'Coastal GP', laps: 4, ai: 4, aiSpeed: 0.75, reward: 820 },
  { name: 'Metro GP', laps: 4, ai: 4, aiSpeed: 0.78, reward: 920 },
  { name: 'Pro Cup', laps: 4, ai: 4, aiSpeed: 0.81, reward: 1050 },
  { name: 'Thunder Track', laps: 5, ai: 4, aiSpeed: 0.84, reward: 1180 },
  { name: 'Cyber Oval', laps: 5, ai: 4, aiSpeed: 0.87, reward: 1320 },
  { name: 'Volcano Ring', laps: 5, ai: 4, aiSpeed: 0.9, reward: 1480 },
  { name: 'Arctic Ice', laps: 5, ai: 5, aiSpeed: 0.93, reward: 1650 },
  { name: 'Sky Bridge', laps: 5, ai: 5, aiSpeed: 0.96, reward: 1820 },
  { name: 'Grand Prix', laps: 6, ai: 5, aiSpeed: 0.99, reward: 2100 },
  { name: 'Hyper League', laps: 6, ai: 5, aiSpeed: 1.02, reward: 2400 },
  { name: 'World Finals', laps: 7, ai: 5, aiSpeed: 1.06, reward: 2800 },
  { name: 'Champion GP', laps: 8, ai: 5, aiSpeed: 1.12, reward: 3500 },
];

const UPGRADE_COST = [0, 400, 900, 1600, 2500];

const CX = 500;
const CY = 360;
const AX = 380;
const AY = 250;
const ROADW = 96;
const TWO_PI = Math.PI * 2;
const AI_COLORS = ['#3b7be2', '#3bba4e', '#e2c93b', '#b03be2'];

export class RaceCareerEngine extends BaseEngine {
  private state: State = 'menu';
  private save: Save = { unlocked: 1, cash: 0, bestPos: [], engineLv: 0, gripLv: 0, wins: 0 };
  private raceIdx = 0;
  private racers: Racer[] = [];
  private player!: Racer;
  private camX = CX;
  private camY = CY;
  private countdown = 3;
  private raceTime = 0;
  private finishPos = 1;
  private finishReward = 0;
  private menuSel = 0;
  private shopMode = false;

  constructor(ctx: EngineContext) {
    super(ctx);
    this.width = 360;
    this.height = 260;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
  }

  protected init(): void {
    this.save = loadState<Save>('racecareer', {
      unlocked: 1,
      cash: 0,
      bestPos: [],
      engineLv: 0,
      gripLv: 0,
      wins: 0,
    });
    if (this.save.engineLv === undefined) this.save.engineLv = 0;
    if (this.save.gripLv === undefined) this.save.gripLv = 0;
    if (this.save.wins === undefined) this.save.wins = 0;
    this.shopMode = false;
    this.state = 'menu';
    this.menuSel = Math.min(this.save.unlocked - 1, RACES.length - 1);
    this.score = this.save.cash;
  }

  private centerPoint(t: number): { x: number; y: number } {
    return { x: CX + AX * Math.cos(t), y: CY + AY * Math.sin(t) };
  }

  private paramAngle(x: number, y: number): number {
    let t = Math.atan2((y - CY) / AY, (x - CX) / AX);
    if (t < 0) t += TWO_PI;
    return t;
  }

  private startRace(idx: number): void {
    this.raceIdx = idx;
    const def = RACES[idx];
    this.racers = [];
    // player at start line (t=0, right side)
    const start = this.centerPoint(0);
    this.player = {
      x: start.x,
      y: start.y - 20,
      angle: Math.PI / 2,
      speed: 0,
      prevT: this.paramAngle(start.x, start.y - 20),
      prog: 0,
      isPlayer: true,
      color: '#e23b3b',
      aiSpeed: 0,
    };
    this.racers.push(this.player);
    for (let i = 0; i < def.ai; i++) {
      const t0 = -0.12 * (i + 1);
      const p = this.centerPoint(t0);
      this.racers.push({
        x: p.x,
        y: p.y + 18,
        angle: Math.PI / 2,
        speed: 60,
        prevT: this.paramAngle(p.x, p.y),
        prog: 0,
        isPlayer: false,
        color: AI_COLORS[i % AI_COLORS.length],
        aiSpeed: def.aiSpeed + (Math.random() - 0.5) * 0.06,
      });
    }
    this.countdown = 3;
    this.raceTime = 0;
    this.state = 'countdown';
    this.camX = this.player.x;
    this.camY = this.player.y;
  }

  protected onKeyDown(key: string): void {
    if (this.state === 'menu') {
      if (key === 'arrowleft' || key === 'a') {
        if (this.shopMode) this.buyUpgrade('engine', -1);
        else this.menuSel = Math.max(0, this.menuSel - 1);
      }
      if (key === 'arrowright' || key === 'd') {
        if (this.shopMode) this.buyUpgrade('engine', 1);
        else this.menuSel = Math.min(this.save.unlocked - 1, this.menuSel + 1);
      }
      if (key === 'arrowup' || key === 'w') {
        if (this.shopMode) this.buyUpgrade('grip', -1);
        else this.menuSel = Math.max(0, this.menuSel - 1);
      }
      if (key === 'arrowdown' || key === 's') {
        if (this.shopMode) this.buyUpgrade('grip', 1);
        else this.menuSel = Math.min(this.save.unlocked - 1, this.menuSel + 1);
      }
      if (key === 'x' || key === 'escape') this.shopMode = !this.shopMode;
      if (key === ' ' || key === 'enter') {
        if (this.shopMode) return;
        if (this.menuSel < this.save.unlocked) this.startRace(this.menuSel);
      }
    } else if (this.state === 'finish') {
      if (key === ' ' || key === 'enter') this.init();
    }
  }

  private buyUpgrade(kind: 'engine' | 'grip', dir: number): void {
    const cur = kind === 'engine' ? this.save.engineLv : this.save.gripLv;
    const next = cur + dir;
    if (next < 0 || next >= UPGRADE_COST.length) return;
    const cost = UPGRADE_COST[next] - UPGRADE_COST[cur];
    if (dir > 0 && this.save.cash < cost) return;
    if (kind === 'engine') this.save.engineLv = next;
    else this.save.gripLv = next;
    if (dir > 0) this.save.cash -= cost;
    else this.save.cash += Math.floor(cost * 0.5);
    saveState('racecareer', this.save);
    this.score = this.save.cash;
    this.tone(660, 0.06);
  }

  handlePointer(cxp: number, cyp: number): void {
    const x = cxp / this.scale;
    const y = cyp / this.scale;
    if (this.state === 'menu') {
      const tileW = 96;
      const gap = 12;
      const totalW = RACES.length * tileW + (RACES.length - 1) * gap;
      let sx = this.width / 2 - totalW / 2;
      // tiles scroll if too wide; clamp start
      sx = Math.max(8, Math.min(sx, this.width - 8));
      for (let i = 0; i < RACES.length; i++) {
        const tx = 8 + i * (tileW + gap);
        if (x > tx && x < tx + tileW && y > 90 && y < 190) {
          if (i < this.save.unlocked) {
            this.menuSel = i;
            this.startRace(i);
          }
        }
      }
    } else if (this.state === 'finish') {
      this.init();
    }
  }

  protected update(dt: number): void {
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.state = 'race';
        this.tone(880, 0.2);
      }
      return;
    }
    if (this.state !== 'race') return;

    this.raceTime += dt;
    this.updatePlayer(dt);
    this.updateAI(dt);

    this.camX += (this.player.x - this.camX) * Math.min(1, dt * 5);
    this.camY += (this.player.y - this.camY) * Math.min(1, dt * 5);

    const def = RACES[this.raceIdx];
    if (this.player.prog >= def.laps * TWO_PI) {
      this.finishRace();
    }
  }

  private offRoad(x: number, y: number): boolean {
    const t = this.paramAngle(x, y);
    const p = this.centerPoint(t);
    return Math.hypot(x - p.x, y - p.y) > ROADW / 2;
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const off = this.offRoad(p.x, p.y);
    const eng = 1 + this.save.engineLv * 0.12;
    const grip = 1 + this.save.gripLv * 0.1;
    const maxSpeed = off ? 90 : 250 * eng;
    const accel = 300 * eng;
    if (this.key('arrowup') || this.key('w')) p.speed += accel * dt;
    else if (this.key('arrowdown') || this.key('s')) p.speed -= accel * dt;
    else p.speed *= 0.97;
    if (off && p.speed > maxSpeed) p.speed -= 200 * dt;
    p.speed = Math.max(-90, Math.min(maxSpeed, p.speed));
    const turn = 2.6 * grip * Math.min(1, Math.abs(p.speed) / 80) * Math.sign(p.speed || 1);
    if (this.key('arrowleft') || this.key('a')) p.angle -= turn * dt;
    if (this.key('arrowright') || this.key('d')) p.angle += turn * dt;
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    this.updateProgress(p);
    if (off && Math.random() < 0.3)
      this.tone(60, 0.03, 'sawtooth', 0.03);
  }

  private updateProgress(r: Racer): void {
    const t = this.paramAngle(r.x, r.y);
    let d = t - r.prevT;
    if (d > Math.PI) d -= TWO_PI;
    if (d < -Math.PI) d += TWO_PI;
    r.prog += d;
    r.prevT = t;
  }

  private updateAI(dt: number): void {
    for (const r of this.racers) {
      if (r.isPlayer) continue;
      // advance along centerline
      const t = r.prevT + r.aiSpeed * dt;
      const p = this.centerPoint(t);
      r.angle = Math.atan2(p.y - r.y, p.x - r.x);
      r.x = p.x;
      r.y = p.y;
      let d = t - r.prevT;
      if (d > Math.PI) d -= TWO_PI;
      if (d < -Math.PI) d += TWO_PI;
      r.prog += d;
      r.prevT = ((t % TWO_PI) + TWO_PI) % TWO_PI;
    }
  }

  private position(): number {
    let pos = 1;
    for (const r of this.racers) if (!r.isPlayer && r.prog > this.player.prog) pos++;
    return pos;
  }

  private playerLap(): number {
    return Math.min(RACES[this.raceIdx].laps, Math.floor(this.player.prog / TWO_PI) + 1);
  }

  private finishRace(): void {
    this.state = 'finish';
    this.finishPos = this.position();
    const def = RACES[this.raceIdx];
    const factor = this.finishPos === 1 ? 1 : this.finishPos === 2 ? 0.6 : this.finishPos === 3 ? 0.35 : 0.15;
    this.finishReward = Math.round(def.reward * factor);
    this.save.cash += this.finishReward;
    const prevBest = this.save.bestPos[this.raceIdx] ?? 99;
    if (this.finishPos < prevBest) this.save.bestPos[this.raceIdx] = this.finishPos;
    if (this.finishPos === 1) {
      this.save.wins++;
      if (this.raceIdx + 1 >= this.save.unlocked && this.raceIdx + 1 < RACES.length)
        this.save.unlocked = this.raceIdx + 2;
    }
    saveState<Save>('racecareer', this.save);
    this.score = this.save.cash;
    this.tone(this.finishPos === 1 ? 880 : 440, 0.2);
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    if (this.state === 'menu') {
      this.drawMenu();
      return;
    }

    this.clear('#0c2a16');
    g.save();
    g.translate(this.width / 2 - this.camX, this.height / 2 - this.camY);
    this.drawTrack();
    for (const r of this.racers) this.drawCar(r);
    g.restore();

    this.drawRaceHud();

    if (this.state === 'countdown') {
      const n = Math.ceil(this.countdown);
      this.center(n > 0 ? String(n) : 'GO!', this.height / 2, '#ffe600', 28);
    }
    if (this.state === 'finish') this.drawFinish();
  }

  private drawTrack(): void {
    const g = this.ctx2d;
    // grass infield already from clear; draw road ring as many quads
    const steps = 60;
    g.strokeStyle = '#2b2b34';
    g.lineWidth = ROADW;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * TWO_PI;
      const p = this.centerPoint(t);
      if (i === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    }
    g.stroke();
    // edge lines
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    for (const off of [-ROADW / 2 + 3, ROADW / 2 - 3]) {
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * TWO_PI;
        const nx = Math.cos(t);
        const ny = Math.sin(t);
        const p = this.centerPoint(t);
        if (i === 0) g.moveTo(p.x + nx * off, p.y + ny * off);
        else g.lineTo(p.x + nx * off, p.y + ny * off);
      }
      g.stroke();
    }
    // start/finish line at t=0
    const sp = this.centerPoint(0);
    g.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? '#fff' : '#111';
      g.fillRect(sp.x - 4, sp.y - ROADW / 2 + i * (ROADW / 5), 8, ROADW / 5);
    }
  }

  private drawCar(r: Racer): void {
    const g = this.ctx2d;
    g.save();
    g.translate(r.x, r.y);
    g.rotate(r.angle);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(-10, -6, 22, 12);
    g.fillStyle = r.color;
    g.fillRect(-11, -7, 22, 14);
    g.fillStyle = '#9fe9ff';
    g.fillRect(2, -5, 5, 10);
    g.restore();
  }

  private drawRaceHud(): void {
    const def = RACES[this.raceIdx];
    this.text(`LAP ${this.playerLap()}/${def.laps}`, 8, 16, '#fff', 8);
    this.text(`POS ${this.position()}/${this.racers.length}`, 8, 30, '#ffe600', 8);
    this.text(`TIME ${this.raceTime.toFixed(1)}`, this.width - 96, 16, '#00f5ff', 7);
    this.text(`$${this.save.cash}`, this.width - 96, 30, '#39ff14', 7);
  }

  private drawMenu(): void {
    this.clear('#0a0a16');
    this.center('TURBO CAREER', 18, '#ffe600', 10);
    this.center(`$${this.save.cash}  WINS ${this.save.wins}`, 34, '#39ff14', 7);
    this.center(`${this.save.unlocked}/${RACES.length} tracks`, 48, '#00f5ff', 6);

    const tileW = 68;
    const gap = 6;
    const rowY = 58;
    const visible = 5;
    const scroll = Math.max(0, Math.min(this.menuSel - 2, RACES.length - visible));
    for (let v = 0; v < visible; v++) {
      const i = scroll + v;
      if (i >= RACES.length) break;
      const tx = 6 + v * (tileW + gap);
      const locked = i >= this.save.unlocked;
      const g = this.ctx2d;
      g.fillStyle = locked ? '#1a1a22' : i === this.menuSel ? '#22243a' : '#15151f';
      g.fillRect(tx, rowY, tileW, 72);
      g.strokeStyle = locked ? '#444' : i === this.menuSel ? '#00f5ff' : '#ff00aa';
      g.lineWidth = 2;
      g.strokeRect(tx, rowY, tileW, 72);
      this.textWrap(RACES[i].name, tx + 4, rowY + 10, tileW - 8, locked ? '#666' : '#fff', 5);
      if (locked) this.text('LOCK', tx + 16, rowY + 48, '#ff3322', 5);
      else {
        this.text(`L${RACES[i].laps}`, tx + 4, rowY + 44, '#888', 5);
        const best = this.save.bestPos[i];
        if (best) this.text(`P${best}`, tx + 28, rowY + 44, '#ffe600', 5);
        this.text(`$${RACES[i].reward}`, tx + 4, rowY + 58, '#39ff14', 5);
      }
    }

    const sy = 138;
    this.ctx2d.fillStyle = this.shopMode ? '#22243a' : '#15151f';
    this.ctx2d.fillRect(8, sy, this.width - 16, 72);
    this.ctx2d.strokeStyle = '#00f5ff';
    this.ctx2d.strokeRect(8, sy, this.width - 16, 72);
    this.text('UPGRADE SHOP (X toggle)', 14, sy + 12, '#ffe600', 6);
    this.text(`ENGINE Lv${this.save.engineLv}`, 14, sy + 28, '#fff', 6);
    this.text(`GRIP Lv${this.save.gripLv}`, 14, sy + 44, '#fff', 6);
    this.text('L/R engine  U/D grip', this.width - 130, sy + 36, '#8888aa', 5);

    this.center('Arrows pick race  SPACE start  Win 1st to unlock', 222, '#8888aa', 5);
    this.center('Progress saved in browser', 236, '#666', 5);
  }

  private drawFinish(): void {
    const g = this.ctx2d;
    g.fillStyle = 'rgba(0,0,0,0.8)';
    g.fillRect(0, 0, this.width, this.height);
    const p = this.finishPos;
    const label = p === 1 ? '1st PLACE!' : p === 2 ? '2nd PLACE' : p === 3 ? '3rd PLACE' : `${p}th PLACE`;
    this.center(label, this.height / 2 - 36, p === 1 ? '#ffe600' : '#fff', 16);
    this.center(`Prize  $${this.finishReward}`, this.height / 2 - 6, '#39ff14', 9);
    this.center(`Total cash  $${this.save.cash}`, this.height / 2 + 14, '#00f5ff', 8);
    if (p !== 1 && this.raceIdx + 1 >= this.save.unlocked)
      this.center('Win 1st place to unlock next track!', this.height / 2 + 30, '#ff6b35', 6);
    if (Math.sin(performance.now() / 250) > 0)
      this.center('SPACE / TAP — CONTINUE', this.height / 2 + 48, '#ffe600', 7);
  }

  private text(t: string, x: number, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.fillStyle = color;
    g.fillText(t, x, y);
  }

  private textWrap(t: string, x: number, y: number, maxW: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.fillStyle = color;
    const words = t.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > maxW && line) {
        g.fillText(line, x, yy);
        line = w;
        yy += size + 4;
      } else line = test;
    }
    if (line) g.fillText(line, x, yy);
  }

  private center(t: string, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    const tw = g.measureText(t).width;
    g.fillStyle = color;
    g.fillText(t, this.width / 2 - tw / 2, y);
  }
}
