/** Shared retro SFX — used across all games via BaseEngine. */
export type SfxId =
  | 'score'
  | 'jump'
  | 'land'
  | 'slide'
  | 'step'
  | 'hit'
  | 'clear'
  | 'gameover'
  | 'guard'
  | 'near'
  | 'boost'
  | 'pad'
  | 'popup';

let ctx: AudioContext | null = null;

function ac(muted: boolean): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.08,
  when = 0
): void {
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(audio.destination);
  const t = audio.currentTime + when;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur);
}

function noise(audio: AudioContext, dur: number, vol = 0.1): void {
  const n = Math.floor(audio.sampleRate * dur);
  const buf = audio.createBuffer(1, n, audio.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = audio.createBufferSource();
  src.buffer = buf;
  const g = audio.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(audio.destination);
  src.start();
}

export function playGameSfx(id: SfxId, muted = false): void {
  const audio = ac(muted);
  if (!audio) return;
  switch (id) {
    case 'score':
      tone(audio, 660, 0.05, 'square', 0.05);
      tone(audio, 880, 0.06, 'square', 0.04, 0.04);
      break;
    case 'jump':
      tone(audio, 280, 0.08, 'sawtooth', 0.07);
      tone(audio, 520, 0.1, 'square', 0.05, 0.04);
      break;
    case 'land':
      tone(audio, 180, 0.06, 'triangle', 0.08);
      noise(audio, 0.04, 0.06);
      break;
    case 'slide':
      noise(audio, 0.12, 0.09);
      tone(audio, 140, 0.14, 'sawtooth', 0.05);
      break;
    case 'step':
      tone(audio, 120 + Math.random() * 40, 0.03, 'triangle', 0.035);
      break;
    case 'hit':
      tone(audio, 90, 0.2, 'sawtooth', 0.1);
      noise(audio, 0.15, 0.12);
      break;
    case 'clear':
      tone(audio, 523, 0.1, 'square', 0.06);
      tone(audio, 659, 0.1, 'square', 0.06, 0.08);
      tone(audio, 784, 0.14, 'square', 0.07, 0.16);
      break;
    case 'gameover':
      tone(audio, 220, 0.25, 'sawtooth', 0.09);
      tone(audio, 110, 0.35, 'triangle', 0.08, 0.12);
      break;
    case 'guard':
      tone(audio, 440, 0.08, 'square', 0.05);
      tone(audio, 330, 0.1, 'square', 0.05, 0.06);
      break;
    case 'near':
      tone(audio, 880, 0.06, 'sine', 0.06);
      break;
    case 'boost':
      tone(audio, 400, 0.05, 'sawtooth', 0.06);
      tone(audio, 600, 0.08, 'square', 0.05, 0.04);
      break;
    case 'pad':
      tone(audio, 520, 0.06, 'sine', 0.06);
      tone(audio, 780, 0.08, 'sine', 0.05, 0.05);
      tone(audio, 1040, 0.1, 'sine', 0.04, 0.1);
      break;
    case 'popup':
      tone(audio, 1200, 0.04, 'square', 0.04);
      break;
    default:
      break;
  }
}
