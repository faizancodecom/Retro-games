import type { EngineContext, GameEngine } from '../types';
import { isMuted } from '../app/storage';
import { playGameSfx } from '../app/gameSfx';
import { getLevelConfig, type LevelConfig } from './levelConfig';

export abstract class BaseEngine implements GameEngine {
  protected ctx: EngineContext;
  protected width = 320;
  protected height = 240;
  protected scale = 2;
  protected ctx2d!: CanvasRenderingContext2D;
  protected running = false;
  protected paused = false;
  protected score = 0;
  protected muted = isMuted();
  protected raf = 0;
  protected lastTime = 0;
  protected keys = new Set<string>();
  protected touchActive = false;
  protected diffLevel = 1;
  protected lf = 1;
  protected levelCleared = false;
  protected levelCfg!: LevelConfig;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
    this.diffLevel = Math.max(1, ctx.level ?? 1);
    this.levelCfg = getLevelConfig(ctx.engineType ?? 'default', this.diffLevel);
    this.lf = this.levelCfg.speed;
    const c = ctx.canvas;
    c.width = this.width * this.scale;
    c.height = this.height * this.scale;
    const g = c.getContext('2d');
    if (!g) throw new Error('No 2d context');
    this.ctx2d = g;
    this.ctx2d.imageSmoothingEnabled = false;
    this.bindInput(c);
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const wasDown = this.keys.has(k);
      this.keys.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      if (!wasDown) this.onKeyDown(k);
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    canvas.addEventListener('pointerdown', () => {
      this.touchActive = true;
      this.onTap();
    });
    canvas.addEventListener('pointerup', () => {
      this.touchActive = false;
    });
    this.cleanupInput = () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.paused = true;
    });
  }

  private cleanupInput: (() => void) | null = null;

  protected onTap(): void {}

  protected onKeyDown(_key: string): void {}

  protected key(k: string): boolean {
    return this.keys.has(k) || this.keys.has(k.toLowerCase());
  }

  protected isAction(): boolean {
    return this.key(' ') || this.key('enter') || this.touchActive;
  }

  start(): void {
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.init();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.cleanupInput?.();
  }

  restart(): void {
    cancelAnimationFrame(this.raf);
    this.score = 0;
    this.levelCleared = false;
    this.ctx.onScoreChange(0);
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.init();
    this.loop(this.lastTime);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  getScore(): number {
    return this.score;
  }

  protected abstract init(): void;
  protected abstract update(dt: number): void;
  protected abstract draw(): void;

  protected levelGoalScore(): number {
    return this.levelCfg.goalScore;
  }

  protected applyLevelConfig(): void {
    this.levelCfg = getLevelConfig(this.ctx.engineType ?? 'default', this.diffLevel);
    this.lf = this.levelCfg.speed;
  }

  /** Override for games with non-score win (clear maze, all bricks, etc.). */
  protected checkLevelWin(): boolean {
    return this.score >= this.levelGoalScore();
  }

  protected tryLevelComplete(): void {
    if (this.levelCleared || !this.ctx.onLevelComplete) return;
    if (!this.checkLevelWin()) return;
    this.levelCleared = true;
    playGameSfx('clear', this.muted);
    this.tone(1200, 0.14, 'square', 0.08);
    this.ctx.onLevelComplete(this.diffLevel);
  }

  protected addScore(n: number): void {
    if (n <= 0) return;
    this.score += n;
    this.ctx.onScoreChange(this.score);
    if (n >= 8) playGameSfx('score', this.muted);
    this.tryLevelComplete();
  }

  protected drawLevelGoalHud(): void {
    if (!this.ctx.onLevelComplete) return;
    const goal = this.levelGoalScore();
    const title = this.levelCfg.title.slice(0, 8);
    this.drawText(`L${this.diffLevel} ${title}`, 4, this.height - 18, '#00f5ff', 5);
    this.drawText(`GOAL ${goal}`, 4, this.height - 8, '#ffe600', 6);
    if (this.levelCleared) {
      this.drawText('CLEAR!', this.width - 48, this.height - 8, '#39ff14', 6);
    }
  }

  protected gameOver(): void {
    this.running = false;
    playGameSfx('gameover', this.muted);
    this.ctx.onGameOver(this.score);
  }

  protected clear(color = '#0a0a12'): void {
    const g = this.ctx2d;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = color;
    g.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    g.restore();
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }

  private static audioCtx: AudioContext | null = null;

  protected getAudio(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!BaseEngine.audioCtx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        BaseEngine.audioCtx = new Ctor();
      }
      if (BaseEngine.audioCtx.state === 'suspended') void BaseEngine.audioCtx.resume();
      return BaseEngine.audioCtx;
    } catch {
      return null;
    }
  }

  protected tone(freq: number, dur = 0.08, type: OscillatorType = 'square', vol = 0.07): void {
    const ac = this.getAudio();
    if (!ac) return;
    try {
      const o = ac.createOscillator();
      const gain = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(gain);
      gain.connect(ac.destination);
      const t = ac.currentTime;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur);
    } catch {
      /* ignore */
    }
  }

  protected playBeep(freq = 440, dur = 0.05, type: OscillatorType = 'square'): void {
    this.tone(freq, dur, type, 0.07);
  }

  protected noise(dur = 0.15, vol = 0.12): void {
    const ac = this.getAudio();
    if (!ac) return;
    try {
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const gain = ac.createGain();
      gain.gain.value = vol;
      src.connect(gain);
      gain.connect(ac.destination);
      src.start();
    } catch {
      /* ignore */
    }
  }

  private loop = (time: number): void => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    if (!this.paused) {
      this.update(dt * this.lf);
      this.draw();
      this.drawLevelGoalHud();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  protected drawText(text: string, x: number, y: number, color = '#fff', size = 8): void {
    const g = this.ctx2d;
    g.fillStyle = color;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.fillText(text, x, y);
  }

  protected drawOverlay(msg: string, sub?: string): void {
    this.clear('rgba(0,0,0,0.85)');
    this.drawText(msg, this.width / 2 - msg.length * 4, this.height / 2 - 10, '#00f5ff', 10);
    if (sub) this.drawText(sub, this.width / 2 - sub.length * 3, this.height / 2 + 10, '#ffe600', 8);
  }
}
