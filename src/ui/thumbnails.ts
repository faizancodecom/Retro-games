import type { GameDefinition } from '../types';
import { getPuzzleConfig, getCardConfig } from '../games/configs';

const NEON = [
  '#00f5ff', '#ff00aa', '#ffe600', '#39ff14', '#ff6b35', '#7b68ee',
  '#ff3b6b', '#00ced1', '#ffd700', '#ff69b4', '#a9f0ff', '#2ecc71',
];
const BGS = [
  '#0a0a12', '#10131f', '#15151c', '#1a1a2e', '#0f1b2a', '#13240f',
  '#1c1430', '#0b1026', '#101225', '#0d2818', '#241830', '#05060f',
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function drawThumbnail(canvas: HTMLCanvasElement, game: GameDefinition): void {
  const w = 160;
  const h = 120;
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) return;
  g.imageSmoothingEnabled = false;

  // Deterministic, unique-per-game palette derived from the slug.
  const hash = hashStr(game.slug);
  const i1 = hash % NEON.length;
  const i2 = (i1 + 3 + ((hash >> 5) % 5)) % NEON.length;
  const c1 = NEON[i1];
  const c2 = NEON[i2 === i1 ? (i2 + 1) % NEON.length : i2];
  const bg = BGS[(hash >> 9) % BGS.length];

  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  // faint signature dot pattern so even identical shapes look distinct
  g.fillStyle = 'rgba(255,255,255,0.05)';
  const off = hash % 9;
  for (let y = 4 + off; y < h - 24; y += 14)
    for (let x = 6 + ((hash >> 3) % 9); x < w; x += 16) g.fillRect(x, y, 2, 2);

  const puzzleType = game.engine === 'puzzle' ? getPuzzleConfig(game.configId).type : null;
  const cardType = game.engine === 'card' ? getCardConfig(game.configId).type : null;

  switch (game.engine) {
    case 'flappy':
      g.fillStyle = c2;
      g.fillRect(100, 20, 20, 80);
      g.fillRect(100, 70, 20, 50);
      g.fillStyle = c1;
      g.beginPath();
      g.arc(50, 60, 10, 0, Math.PI * 2);
      g.fill();
      break;
    case 'maze':
    case 'pacman':
      g.fillStyle = '#2244aa';
      for (let i = 0; i < 5; i++) g.fillRect(20 + i * 24, 30, 8, 8);
      g.fillStyle = '#ffb897';
      for (let i = 0; i < 5; i++) g.fillRect(28 + i * 18, 78, 3, 3);
      g.fillStyle = c1;
      g.beginPath();
      g.arc(50, 70, 11, 0.3, Math.PI * 2 - 0.3);
      g.lineTo(50, 70);
      g.fill();
      g.fillStyle = c2;
      g.fillRect(96, 60, 14, 16);
      g.fillStyle = '#fff';
      g.fillRect(99, 64, 3, 4);
      g.fillRect(105, 64, 3, 4);
      break;
    case 'wanted':
      g.fillStyle = '#2a2a35';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#444';
      g.fillRect(60, 0, 40, h);
      g.fillStyle = '#ffe600';
      for (let y = 6; y < h; y += 22) g.fillRect(78, y, 4, 12);
      g.fillStyle = c1;
      g.fillRect(66, 70, 18, 30);
      g.fillStyle = c2;
      g.fillRect(96, 26, 16, 28);
      g.fillStyle = '#ff2222';
      g.fillRect(96, 24, 8, 4);
      g.fillStyle = '#2299ff';
      g.fillRect(104, 24, 8, 4);
      break;
    case 'tictactoe':
      g.strokeStyle = '#ff00aa';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(53, 20); g.lineTo(53, 100); g.moveTo(80, 20); g.lineTo(80, 100);
      g.moveTo(33, 47); g.lineTo(100, 47); g.moveTo(33, 73); g.lineTo(100, 73);
      g.stroke();
      g.strokeStyle = c1; g.lineWidth = 3;
      g.beginPath(); g.moveTo(38, 27); g.lineTo(48, 40); g.moveTo(48, 27); g.lineTo(38, 40); g.stroke();
      g.strokeStyle = c2;
      g.beginPath(); g.arc(66, 60, 8, 0, Math.PI * 2); g.stroke();
      break;
    case 'blackjack':
      g.fillStyle = '#fafafa'; g.fillRect(40, 35, 32, 46);
      g.fillStyle = '#fafafa'; g.fillRect(80, 35, 32, 46);
      g.fillStyle = '#111'; g.font = '12px monospace';
      g.fillText('A', 48, 62); g.fillStyle = '#d11'; g.fillText('K', 88, 62);
      g.fillStyle = c1; g.font = '10px "Press Start 2P", monospace'; g.fillText('21', 60, 100);
      break;
    case 'uno':
      g.fillStyle = '#e23b3b'; g.fillRect(40, 30, 22, 34);
      g.fillStyle = '#3b7be2'; g.fillRect(64, 36, 22, 34);
      g.fillStyle = '#3bba4e'; g.fillRect(88, 30, 22, 34);
      g.fillStyle = '#fff'; g.font = '10px "Press Start 2P", monospace'; g.fillText('UNO', 52, 95);
      break;
    case 'racecareer':
      g.fillStyle = '#2b2b34';
      g.beginPath(); g.ellipse(75, 60, 50, 32, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0c2a16';
      g.beginPath(); g.ellipse(75, 60, 30, 16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = c1; g.fillRect(118, 54, 12, 8);
      break;
    case 'snake':
      g.fillStyle = c1;
      for (let i = 0; i < 4; i++) g.fillRect(40 + i * 14, 50, 12, 12);
      g.fillStyle = c2;
      g.fillRect(90, 50, 10, 10);
      break;
    case 'tetris':
      g.fillStyle = c1;
      g.fillRect(50, 40, 40, 10);
      g.fillStyle = c2;
      g.fillRect(60, 50, 20, 20);
      g.fillStyle = '#ffe600';
      g.fillRect(70, 70, 20, 20);
      break;
    case 'chess': {
      const s = 24;
      const ox = (w - s * 4) / 2;
      const oy = (h - 24 - s * 3) / 2;
      for (let r = 0; r < 3; r++)
        for (let f = 0; f < 4; f++) {
          g.fillStyle = (r + f) % 2 === 0 ? c1 : c2;
          g.fillRect(ox + f * s, oy + r * s, s, s);
        }
      g.fillStyle = '#1a1a1a';
      g.font = '22px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('\u265B', ox + s * 1.5, oy + s * 0.5);
      g.fillStyle = '#fafafa';
      g.fillText('\u265E', ox + s * 2.5, oy + s * 1.5);
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
      break;
    }
    case 'gallery':
      for (let i = 0; i < 3; i++) {
        g.fillStyle = [c2, c1, '#00f5ff'][i];
        g.beginPath();
        g.arc(40 + i * 40, 40 + (i % 2) * 16, 11, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = bg;
        g.beginPath();
        g.arc(40 + i * 40, 40 + (i % 2) * 16, 5, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#ffe600';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(80, 78);
      g.lineTo(96, 78);
      g.moveTo(88, 70);
      g.lineTo(88, 86);
      g.stroke();
      break;
    case 'zombie':
      g.fillStyle = c1;
      g.fillRect(40, 44, 16, 16);
      g.fillRect(96, 56, 16, 16);
      g.fillStyle = '#c0392b';
      g.fillRect(44, 50, 3, 2);
      g.fillRect(50, 50, 3, 2);
      g.fillStyle = '#00f5ff';
      g.fillRect(70, 66, 12, 12);
      g.fillStyle = '#ffe600';
      g.fillRect(82, 70, 14, 3);
      break;
    case 'asteroids':
      g.strokeStyle = c2;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(44, 36); g.lineTo(58, 42); g.lineTo(54, 56); g.lineTo(40, 52); g.closePath();
      g.stroke();
      g.beginPath();
      g.moveTo(104, 70); g.lineTo(116, 76); g.lineTo(110, 88); g.lineTo(98, 82); g.closePath();
      g.stroke();
      g.save();
      g.translate(74, 64);
      g.rotate(-0.5);
      g.strokeStyle = c1;
      g.beginPath();
      g.moveTo(10, 0); g.lineTo(-8, -6); g.lineTo(-4, 0); g.lineTo(-8, 6); g.closePath();
      g.stroke();
      g.restore();
      g.fillStyle = '#ffe600';
      g.fillRect(86, 56, 3, 3);
      break;
    case 'frogger':
      g.fillStyle = '#222';
      g.fillRect(0, 36, w, 20);
      g.fillStyle = '#0d3a63';
      g.fillRect(0, 60, w, 20);
      g.fillStyle = c2;
      g.fillRect(30, 40, 18, 10);
      g.fillRect(96, 40, 18, 10);
      g.fillStyle = '#7a4a22';
      g.fillRect(60, 64, 40, 12);
      g.fillStyle = c1;
      g.fillRect(70, 84, 14, 14);
      g.fillStyle = bg;
      g.fillRect(73, 87, 2, 2);
      g.fillRect(79, 87, 2, 2);
      break;
    case 'whack':
      for (let i = 0; i < 3; i++) {
        const hx = 40 + i * 40;
        g.fillStyle = '#0a160a';
        g.beginPath();
        g.ellipse(hx, 78, 16, 6, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = c1;
      g.beginPath();
      g.arc(80, 60, 14, Math.PI, 0);
      g.fill();
      g.fillRect(66, 60, 28, 12);
      g.fillStyle = '#3a2410';
      g.fillRect(74, 56, 3, 3);
      g.fillRect(83, 56, 3, 3);
      g.fillStyle = c2;
      g.fillRect(30, 30, 8, 18);
      g.fillRect(30, 24, 20, 8);
      break;
    case 'story':
      for (let gy = 0; gy < 2; gy++)
        for (let gx = 0; gx < 5; gx++) {
          g.fillStyle = (gx + gy) % 2 ? '#1f6b2f' : '#2f8a3c';
          g.fillRect(20 + gx * 20, 18 + gy * 14, 20, 14);
        }
      g.fillStyle = '#00f5ff';
      g.fillRect(54, 24, 12, 14);
      g.fillStyle = c2;
      g.fillRect(82, 22, 12, 14);
      g.fillStyle = '#0a0a14';
      g.fillRect(14, 56, w - 28, 30);
      g.strokeStyle = c1;
      g.lineWidth = 2;
      g.strokeRect(16, 58, w - 32, 26);
      g.fillStyle = c2;
      g.fillRect(22, 64, 60, 4);
      g.fillRect(22, 72, 80, 4);
      break;
    case 'pong':
      g.fillStyle = c1;
      g.fillRect(18, 45, 6, 30);
      g.fillStyle = c2;
      g.fillRect(w - 24, 45, 6, 30);
      g.fillStyle = '#fff';
      g.fillRect(w / 2 - 4, 56, 8, 8);
      for (let y = 10; y < h - 24; y += 16) {
        g.fillStyle = '#444';
        g.fillRect(w / 2 - 1, y, 2, 8);
      }
      break;
    case 'shooter':
      g.fillStyle = c2;
      for (let r = 0; r < 2; r++)
        for (let f = 0; f < 4; f++) g.fillRect(40 + f * 20, 26 + r * 16, 12, 8);
      g.fillStyle = c1;
      g.beginPath();
      g.moveTo(75, 78);
      g.lineTo(67, 94);
      g.lineTo(83, 94);
      g.closePath();
      g.fill();
      break;
    case 'runner':
      g.fillStyle = c1;
      g.fillRect(34, 60, 14, 18);
      g.fillStyle = '#2d2d44';
      g.fillRect(0, 84, w, 8);
      g.fillStyle = c2;
      g.fillRect(96, 66, 12, 18);
      break;
    case 'platformer':
      g.fillStyle = '#2d2d44';
      g.fillRect(20, 80, 50, 8);
      g.fillRect(90, 56, 50, 8);
      g.fillStyle = c1;
      g.fillRect(36, 62, 14, 18);
      g.fillStyle = c2;
      g.fillRect(110, 44, 8, 8);
      break;
    case 'puzzle':
      g.font = '10px "Press Start 2P", monospace';
      if (puzzleType === '2048') {
        g.fillStyle = c2;
        g.fillRect(36, 34, 28, 28);
        g.fillStyle = c1;
        g.fillRect(70, 34, 28, 28);
        g.fillStyle = '#111';
        g.fillText('2', 46, 53);
        g.fillText('4', 80, 53);
      } else if (puzzleType === 'memory') {
        for (let r = 0; r < 2; r++)
          for (let col = 0; col < 3; col++) {
            const fx = 36 + col * 30;
            const fy = 30 + r * 30;
            g.fillStyle = r === 0 && col === 1 ? c1 : '#2a2a44';
            g.fillRect(fx, fy, 24, 24);
            if (r === 0 && col === 1) {
              g.fillStyle = '#111';
              g.fillText('?', fx + 7, fy + 17);
            }
          }
      } else if (puzzleType === 'fifteen') {
        const nums = ['1', '2', '3', '4', '5', '6', '7', '', '8'];
        for (let i = 0; i < 9; i++) {
          const fx = 42 + (i % 3) * 26;
          const fy = 28 + Math.floor(i / 3) * 24;
          if (!nums[i]) continue;
          g.fillStyle = c1;
          g.fillRect(fx, fy, 22, 20);
          g.fillStyle = '#111';
          g.fillText(nums[i], fx + 6, fy + 15);
        }
      } else if (puzzleType === 'connect') {
        const dots: [number, number, string][] = [
          [40, 38, c1], [60, 38, c1], [80, 38, c1], [50, 60, c2], [70, 60, c2], [100, 50, c1],
        ];
        g.strokeStyle = c1;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(40, 38); g.lineTo(80, 38);
        g.stroke();
        for (const [dx, dy, col] of dots) {
          g.fillStyle = col;
          g.beginPath();
          g.arc(dx, dy, 6, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        for (let r = 0; r < 2; r++)
          for (let col = 0; col < 3; col++) {
            g.fillStyle = (r + col) % 2 ? c1 : c2;
            g.fillRect(42 + col * 26, 30 + r * 24, 22, 20);
          }
      }
      break;
    case 'card':
      if (cardType === 'higher') {
        g.fillStyle = '#fafafa';
        g.fillRect(58, 34, 44, 56);
        g.fillStyle = '#111';
        g.font = '16px monospace';
        g.fillText('7', 74, 68);
        g.fillStyle = c1;
        g.beginPath();
        g.moveTo(120, 40); g.lineTo(112, 54); g.lineTo(128, 54); g.closePath();
        g.fill();
        g.fillStyle = c2;
        g.beginPath();
        g.moveTo(120, 86); g.lineTo(112, 72); g.lineTo(128, 72); g.closePath();
        g.fill();
        g.fillStyle = c1;
        g.font = '8px "Press Start 2P", monospace';
        g.fillText('HI/LO', 50, 104);
      } else if (cardType === 'poker') {
        for (let i = 0; i < 5; i++) {
          g.save();
          g.translate(50 + i * 16, 64);
          g.rotate((i - 2) * 0.16);
          g.fillStyle = '#fafafa';
          g.fillRect(-12, -22, 24, 40);
          g.fillStyle = i % 2 ? '#d11' : '#111';
          g.font = '9px monospace';
          g.fillText('AKQJ1'[i], -8, -8);
          g.restore();
        }
        g.fillStyle = c1;
        g.font = '8px "Press Start 2P", monospace';
        g.fillText('POKER', 50, 104);
      } else {
        // war
        g.save();
        g.translate(60, 60);
        g.rotate(-0.18);
        g.fillStyle = '#fafafa';
        g.fillRect(-18, -26, 34, 50);
        g.fillStyle = '#d11';
        g.font = '12px monospace';
        g.fillText('A', -12, 4);
        g.restore();
        g.save();
        g.translate(96, 60);
        g.rotate(0.18);
        g.fillStyle = '#fafafa';
        g.fillRect(-18, -26, 34, 50);
        g.fillStyle = '#111';
        g.font = '12px monospace';
        g.fillText('K', -12, 4);
        g.restore();
        g.fillStyle = c1;
        g.font = '9px "Press Start 2P", monospace';
        g.fillText('WAR', 58, 100);
      }
      break;
    case 'racing':
      g.fillStyle = '#333';
      g.fillRect(50, 0, 60, h);
      g.fillStyle = '#ffe600';
      for (let y = 6; y < h; y += 24) g.fillRect(78, y, 4, 14);
      g.fillStyle = '#888';
      g.fillRect(60, 30, 18, 16);
      g.fillStyle = c1;
      g.fillRect(82, 76, 18, 16);
      break;
    case 'pixelminer':
      g.fillStyle = '#13344f';
      g.fillRect(0, 18, w, 14);
      g.fillStyle = '#5a3a22';
      g.fillRect(0, 32, w, h - 56);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = i % 2 ? '#ffd700' : c1;
        g.fillRect(20 + i * 28, 50 + (i % 3) * 14, 9, 9);
      }
      g.fillStyle = '#1a120c';
      g.fillRect(70, 32, 16, 40);
      g.fillStyle = '#ffe600';
      g.fillRect(72, 50, 12, 12);
      g.fillStyle = '#c0392b';
      g.fillRect(72, 46, 12, 3);
      break;
    case 'dungeon':
      g.strokeStyle = c2;
      g.lineWidth = 3;
      g.strokeRect(18, 24, w - 36, h - 60);
      g.fillStyle = c2;
      g.fillRect(60, 44, 12, 10);
      g.fillRect(90, 60, 12, 10);
      g.fillStyle = '#ffe600';
      g.beginPath();
      g.arc(40, 40, 5, 0, Math.PI * 2);
      g.fill();
      g.fillRect(44, 39, 8, 2);
      g.fillStyle = c1;
      g.fillRect(116, 56, 14, 22);
      g.fillStyle = '#00f5ff';
      g.fillRect(30, 70, 10, 12);
      break;
    case 'defender':
      g.fillStyle = c2;
      g.fillRect(40, 30, 16, 9);
      g.fillRect(96, 24, 16, 9);
      g.fillRect(120, 40, 16, 9);
      g.fillStyle = '#00f5ff';
      g.beginPath();
      g.moveTo(72, 70); g.lineTo(62, 90); g.lineTo(82, 90); g.closePath();
      g.fill();
      g.fillStyle = c1;
      g.fillRect(70, 50, 4, 14);
      break;
    case 'archer':
      g.fillStyle = '#3a5a2a';
      g.fillRect(0, 82, w, h - 82);
      g.fillStyle = '#8a8a9a';
      g.fillRect(16, 44, 26, 38);
      g.fillRect(16, 38, 6, 8);
      g.fillRect(30, 38, 6, 8);
      g.strokeStyle = c1;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(44, 56, 10, -1.1, 1.1);
      g.stroke();
      g.strokeStyle = c2;
      g.beginPath();
      g.moveTo(44, 56); g.lineTo(96, 44);
      g.stroke();
      g.fillStyle = '#ff3b6b';
      g.fillRect(120, 60, 12, 20);
      break;
    case 'toprace':
      g.fillStyle = '#3a3a44';
      g.beginPath(); g.ellipse(75, 56, 60, 34, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = bg;
      g.beginPath(); g.ellipse(75, 56, 30, 14, 0, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#fff' : '#111'; g.fillRect(70 + i * 3, 20, 3, 10); }
      g.fillStyle = '#ff3b3b';
      g.fillRect(96, 50, 8, 12);
      g.fillStyle = c1;
      g.fillRect(46, 50, 8, 12);
      break;
    case 'war':
      g.fillStyle = '#0d3a5c';
      g.fillRect(0, 30, w, h - 50);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = '#8a4a2a';
        g.fillRect(30 + i * 40, 50, 24, 10);
        g.fillStyle = '#c0392b';
        g.fillRect(34 + i * 40, 44, 16, 8);
      }
      g.fillStyle = '#00f5ff';
      g.beginPath();
      g.moveTo(80, 90);
      g.lineTo(68, 108);
      g.lineTo(92, 108);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffe600';
      g.fillRect(76, 96, 8, 4);
      break;
    default:
      g.fillStyle = c1;
      g.fillRect(30, 40, 100, 40);
      g.fillStyle = c2;
      g.fillRect(60, 55, 40, 20);
  }

  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(0, h - 24, w, 24);
  g.fillStyle = '#fff';
  g.font = '8px "Press Start 2P", monospace';
  const label = game.title.length > 14 ? game.title.slice(0, 12) + '..' : game.title;
  g.fillText(label, 8, h - 10);
}
