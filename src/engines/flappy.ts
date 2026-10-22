import { playGameSfx } from '../app/gameSfx';
import { BaseEngine } from './base';
import type { EngineContext } from '../types';
import { getHighScore } from '../app/storage';

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

interface Star {
  x: number;
  y: number;
  r: number;
  tw: number;
}

interface Building {
  x: number;
  w: number;
  h: number;
}

type State = 'ready' | 'playing' | 'dying' | 'dead';

const GRAVITY = 1250;
const FLAP_VELOCITY = -360;
const MAX_FALL = 430;
const PIPE_WIDTH = 46;
const PIPE_GAP = 118;
const PIPE_SPEED = 116;
const PIPE_SPACING = 150;
const BIRD_X = 72;
const BIRD_R = 11;

export class FlappyEngine extends BaseEngine {
  private state: State = 'ready';
  private birdY = 0;
  private birdVy = 0;
  private rotation = 0;
  private wingTimer = 0;
  private wingFrame = 0;
  private pipes: Pipe[] = [];
  private groundY = 0;
  private groundScroll = 0;
  private cityScroll = 0;
  private stars: Star[] = [];
  private buildings: Building[] = [];
  private flashAlpha = 0;
  private bobTimer = 0;
  private pipeGap = PIPE_GAP;
  private pipeSpeed = PIPE_SPEED;

  protected checkLevelWin(): boolean {
    return this.score >= this.diffLevel * 3;
  }

  constructor(ctx: EngineContext) {
    super(ctx);
    // Portrait playfield for an authentic Flappy feel.
    this.width = 240;
    this.height = 360;
    this.scale = 2;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    this.ctx2d.imageSmoothingEnabled = false;
    this.groundY = this.height - 56;
  }

  protected init(): void {
    this.state = 'ready';
    this.birdY = this.height * 0.42;
    this.birdVy = 0;
    this.rotation = 0;
    this.wingTimer = 0;
    this.wingFrame = 1;
    this.pipes = [];
    this.groundScroll = 0;
    this.cityScroll = 0;
    this.flashAlpha = 0;
    this.bobTimer = 0;
    this.score = 0;
    this.buildStars();
    this.buildCity();
    this.pipeGap = Math.max(76, PIPE_GAP - this.diffLevel * 3);
    this.pipeSpeed = PIPE_SPEED + this.diffLevel * 7;
  }

  private buildStars(): void {
    this.stars = [];
    for (let i = 0; i < 36; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.groundY - 30),
        r: Math.random() < 0.8 ? 1 : 2,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  private buildCity(): void {
    this.buildings = [];
    let x = 0;
    while (x < this.width + 80) {
      const w = 18 + Math.floor(Math.random() * 22);
      const h = 30 + Math.floor(Math.random() * 60);
      this.buildings.push({ x, w, h });
      x += w + 4;
    }
  }

  private flap(): void {
    if (this.state === 'dying') return;
    if (this.state === 'dead') {
      this.restart();
      return;
    }
    if (this.state === 'ready') {
      this.state = 'playing';
      this.spawnPipe(this.width + 30);
    }
    this.birdVy = FLAP_VELOCITY;
    this.wingFrame = 0;
    this.wingTimer = 0;
    this.playFlap();
  }

  protected onTap(): void {
    this.flap();
  }

  protected onKeyDown(key: string): void {
    if (key === ' ' || key === 'arrowup' || key === 'w' || key === 'enter') {
      this.flap();
    }
  }

  private spawnPipe(x: number): void {
    const margin = 46;
    const gapY = margin + Math.random() * (this.groundY - margin * 2);
    this.pipes.push({ x, gapY, scored: false });
  }

  protected update(dt: number): void {
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);

    if (this.state === 'ready') {
      this.bobTimer += dt;
      this.birdY = this.height * 0.42 + Math.sin(this.bobTimer * 4) * 6;
      this.rotation = Math.sin(this.bobTimer * 4) * 0.12;
      this.cityScroll = (this.cityScroll + 8 * dt) % (this.width + 80);
      this.animateWing(dt, true);
      return;
    }

    if (this.state === 'dead') return;

    // playing or dying
    this.birdVy = Math.min(this.birdVy + GRAVITY * dt, MAX_FALL);
    this.birdY += this.birdVy * dt;

    // rotation: tilt up when rising, dive when falling
    const target = this.birdVy < 0 ? -0.5 : Math.min(1.5, this.birdVy / 320);
    this.rotation += (target - this.rotation) * Math.min(1, dt * 10);
    this.animateWing(dt, this.birdVy < 0);

    if (this.state === 'dying') {
      if (this.birdY + BIRD_R >= this.groundY) {
        this.birdY = this.groundY - BIRD_R;
        this.state = 'dead';
        this.playDie();
        this.gameOver();
      }
      return;
    }

    // === playing ===
    this.groundScroll = (this.groundScroll + this.pipeSpeed * dt) % 24;
    this.cityScroll = (this.cityScroll + 14 * dt) % (this.width + 80);

    for (const p of this.pipes) p.x -= this.pipeSpeed * dt;
    if (this.pipes.length && this.pipes[this.pipes.length - 1].x < this.width - PIPE_SPACING) {
      this.spawnPipe(this.width + 20);
    }
    this.pipes = this.pipes.filter((p) => p.x + PIPE_WIDTH > -10);

    // scoring
    for (const p of this.pipes) {
      if (!p.scored && p.x + PIPE_WIDTH < BIRD_X) {
        p.scored = true;
        this.addScore(1);
        this.playScore();
      }
    }

    // collisions
    if (this.birdY + BIRD_R >= this.groundY) {
      this.birdY = this.groundY - BIRD_R;
      this.die();
      return;
    }
    if (this.birdY - BIRD_R <= 0) {
      this.birdY = BIRD_R;
      this.birdVy = 0;
    }
    for (const p of this.pipes) {
      const topH = p.gapY - this.pipeGap / 2;
      const botY = p.gapY + this.pipeGap / 2;
      const withinX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_WIDTH;
      if (withinX && (this.birdY - BIRD_R < topH || this.birdY + BIRD_R > botY)) {
        this.die();
        return;
      }
    }
  }

  private die(): void {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.birdVy = Math.max(this.birdVy, -120);
    this.flashAlpha = 1;
    this.playHit();
  }

  private animateWing(dt: number, fast: boolean): void {
    this.wingTimer += dt;
    const rate = fast ? 0.06 : 0.18;
    if (this.wingTimer >= rate) {
      this.wingTimer = 0;
      this.wingFrame = (this.wingFrame + 1) % 3;
    }
  }

  protected draw(): void {
    const g = this.ctx2d;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.drawBackground();
    this.drawPipes();
    this.drawGround();
    this.drawBird();

    // death flash
    if (this.flashAlpha > 0) {
      g.fillStyle = `rgba(255,255,255,${this.flashAlpha * 0.6})`;
      g.fillRect(0, 0, this.width, this.height);
    }

    this.drawHud();

    if (this.state === 'ready') this.drawReady();
    if (this.state === 'dead') this.drawGameOver();
  }

  private drawBackground(): void {
    const g = this.ctx2d;
    const grad = g.createLinearGradient(0, 0, 0, this.groundY);
    grad.addColorStop(0, '#0b0b2a');
    grad.addColorStop(0.5, '#15164a');
    grad.addColorStop(1, '#2a1a4a');
    g.fillStyle = grad;
    g.fillRect(0, 0, this.width, this.groundY);

    // moon with glow
    g.save();
    g.shadowColor = '#00f5ff';
    g.shadowBlur = 18;
    g.fillStyle = '#cfffff';
    g.beginPath();
    g.arc(this.width - 46, 52, 18, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = '#15164a';
    g.beginPath();
    g.arc(this.width - 40, 47, 16, 0, Math.PI * 2);
    g.fill();

    // stars
    for (const s of this.stars) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(s.tw + performance.now() / 600));
      g.fillStyle = `rgba(180,240,255,${a})`;
      g.fillRect(s.x, s.y, s.r, s.r);
    }

    // city skyline silhouette (parallax)
    g.fillStyle = '#0e0e26';
    for (const b of this.buildings) {
      const bx = b.x - this.cityScroll;
      const drawX = ((bx % (this.width + 80)) + (this.width + 80)) % (this.width + 80) - 40;
      g.fillRect(drawX, this.groundY - b.h, b.w, b.h);
      // lit windows
      g.fillStyle = 'rgba(0,245,255,0.18)';
      for (let wy = this.groundY - b.h + 4; wy < this.groundY - 4; wy += 8) {
        for (let wx = drawX + 3; wx < drawX + b.w - 3; wx += 7) {
          if ((wx + wy) % 3 === 0) g.fillRect(wx, wy, 2, 3);
        }
      }
      g.fillStyle = '#0e0e26';
    }
  }

  private drawPipes(): void {
    for (const p of this.pipes) {
      const topH = p.gapY - this.pipeGap / 2;
      const botY = p.gapY + this.pipeGap / 2;
      this.drawPipe(p.x, 0, topH, true);
      this.drawPipe(p.x, botY, this.groundY - botY, false);
    }
  }

  private drawPipe(x: number, y: number, h: number, top: boolean): void {
    if (h <= 0) return;
    const g = this.ctx2d;
    g.save();
    g.shadowColor = 'rgba(57,255,20,0.5)';
    g.shadowBlur = 8;
    // body
    g.fillStyle = '#28d017';
    g.fillRect(x, y, PIPE_WIDTH, h);
    g.restore();
    // shading
    g.fillStyle = '#1f9d12';
    g.fillRect(x + PIPE_WIDTH - 8, y, 8, h);
    g.fillStyle = '#5dff3a';
    g.fillRect(x + 3, y, 4, h);
    // cap
    const capH = 14;
    const capY = top ? y + h - capH : y;
    g.fillStyle = '#34e01c';
    g.fillRect(x - 3, capY, PIPE_WIDTH + 6, capH);
    g.fillStyle = '#1f9d12';
    g.fillRect(x - 3 + PIPE_WIDTH - 2, capY, 5, capH);
    g.fillStyle = '#6bff48';
    g.fillRect(x - 1, capY + 2, 4, capH - 4);
  }

  private drawGround(): void {
    const g = this.ctx2d;
    const gy = this.groundY;
    g.fillStyle = '#3a2a5a';
    g.fillRect(0, gy, this.width, this.height - gy);
    // neon top line
    g.fillStyle = '#ff00aa';
    g.fillRect(0, gy, this.width, 3);
    g.fillStyle = '#00f5ff';
    g.fillRect(0, gy + 3, this.width, 1);
    // moving stripes
    g.fillStyle = '#4a3570';
    for (let x = -24 + (24 - this.groundScroll); x < this.width; x += 24) {
      g.fillRect(x, gy + 8, 12, this.height - gy - 12);
    }
  }

  private drawBird(): void {
    const g = this.ctx2d;
    g.save();
    g.translate(BIRD_X, this.birdY);
    g.rotate(this.rotation);

    // glow
    g.shadowColor = '#ffe600';
    g.shadowBlur = 10;
    // body
    g.fillStyle = '#ffe11a';
    g.beginPath();
    g.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;

    // belly
    g.fillStyle = '#ffd000';
    g.beginPath();
    g.arc(0, 3, BIRD_R - 3, 0, Math.PI * 2);
    g.fill();

    // wing (animated)
    const wingY = this.wingFrame === 0 ? -5 : this.wingFrame === 1 ? 0 : 5;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(-3, wingY, 6, 4, -0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#cfd8ff';
    g.beginPath();
    g.ellipse(-3, wingY + 1, 4, 2.5, -0.3, 0, Math.PI * 2);
    g.fill();

    // eye
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(5, -4, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#111';
    g.beginPath();
    g.arc(6.5, -4, 1.8, 0, Math.PI * 2);
    g.fill();

    // beak
    g.fillStyle = '#ff7b00';
    g.beginPath();
    g.moveTo(9, 0);
    g.lineTo(16, 2);
    g.lineTo(9, 5);
    g.closePath();
    g.fill();

    g.restore();
  }

  private drawHud(): void {
    if (this.state === 'ready' || this.state === 'dead') return;
    const txt = String(this.score);
    const size = 20;
    const w = txt.length * size * 0.9;
    const x = this.width / 2 - w / 2;
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillText(txt, x + 2, 50 + 2);
    g.fillStyle = '#fff';
    g.fillText(txt, x, 50);
  }

  private drawReady(): void {
    const g = this.ctx2d;
    this.centerText('FLAPPY', this.height * 0.22, '#ffe600', 18);
    this.centerText('BIRD', this.height * 0.22 + 26, '#00f5ff', 18);
    // prompt box
    const boxW = 150;
    const boxX = this.width / 2 - boxW / 2;
    const boxY = this.height * 0.5;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(boxX, boxY, boxW, 54);
    g.strokeStyle = '#ff00aa';
    g.lineWidth = 2;
    g.strokeRect(boxX, boxY, boxW, 54);
    this.centerText('TAP / SPACE', boxY + 22, '#fff', 9);
    this.centerText('TO FLAP', boxY + 40, '#39ff14', 9);
  }

  private drawGameOver(): void {
    const g = this.ctx2d;
    g.fillStyle = 'rgba(5,5,20,0.65)';
    g.fillRect(0, 0, this.width, this.height);

    const panelW = 184;
    const panelH = 170;
    const px = this.width / 2 - panelW / 2;
    const py = this.height / 2 - panelH / 2;

    g.fillStyle = '#15164a';
    g.fillRect(px, py, panelW, panelH);
    g.strokeStyle = '#00f5ff';
    g.lineWidth = 2;
    g.strokeRect(px, py, panelW, panelH);

    this.centerText('GAME OVER', py + 26, '#ff00aa', 13);

    const best = getHighScore(this.ctx.slug);
    this.drawMedal(px + 34, py + 78);

    g.font = `8px "Press Start 2P", monospace`;
    g.fillStyle = '#8fa';
    g.fillText('SCORE', px + 78, py + 60);
    g.fillStyle = '#fff';
    g.font = `14px "Press Start 2P", monospace`;
    g.fillText(String(this.score), px + 78, py + 80);

    g.font = `8px "Press Start 2P", monospace`;
    g.fillStyle = '#8fa';
    g.fillText('BEST', px + 78, py + 102);
    g.fillStyle = '#ffe600';
    g.font = `14px "Press Start 2P", monospace`;
    g.fillText(String(best), px + 78, py + 122);

    const blink = Math.sin(performance.now() / 250) > 0;
    if (blink) this.centerText('TAP / SPACE', py + panelH - 14, '#39ff14', 8);
  }

  private drawMedal(x: number, y: number): void {
    const g = this.ctx2d;
    let color: string | null = null;
    let label = '';
    if (this.score >= 50) {
      color = '#7df9ff';
      label = 'P';
    } else if (this.score >= 30) {
      color = '#ffd700';
      label = 'G';
    } else if (this.score >= 15) {
      color = '#cfd8e8';
      label = 'S';
    } else if (this.score >= 5) {
      color = '#cd7f32';
      label = 'B';
    }
    if (!color) {
      g.strokeStyle = '#444';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, 16, 0, Math.PI * 2);
      g.stroke();
      return;
    }
    g.save();
    g.shadowColor = color;
    g.shadowBlur = 10;
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, 16, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.arc(x - 4, y - 4, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#111';
    g.font = `10px "Press Start 2P", monospace`;
    g.fillText(label, x - 5, y + 4);
  }

  private centerText(text: string, y: number, color: string, size: number): void {
    const g = this.ctx2d;
    g.font = `${size}px "Press Start 2P", monospace`;
    const w = g.measureText(text).width;
    const x = this.width / 2 - w / 2;
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillText(text, x + 1, y + 1);
    g.fillStyle = color;
    g.fillText(text, x, y);
  }

  // === sound ===
  private playFlap(): void {
    playGameSfx('jump', this.muted);
    this.tone(520, 0.09, 'square', 0.06);
  }
  private playScore(): void {
    this.tone(740, 0.05, 'square', 0.07);
    setTimeout(() => this.tone(990, 0.06, 'square', 0.07), 45);
  }
  private playHit(): void {
    this.tone(170, 0.12, 'sawtooth', 0.09);
  }
  private playDie(): void {
    this.tone(110, 0.25, 'triangle', 0.08);
  }
}
