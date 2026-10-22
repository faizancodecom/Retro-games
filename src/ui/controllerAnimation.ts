/** Pixel-style controller connect celebration overlay. */
export function showControllerConnectAnimation(controllerName: string): void {
  const existing = document.querySelector('.pad-connect-overlay');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'pad-connect-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  const canvas = document.createElement('canvas');
  canvas.className = 'pad-connect-canvas';
  canvas.width = 200;
  canvas.height = 140;

  const label = document.createElement('p');
  label.className = 'pad-connect-label';
  label.textContent = 'CONTROLLER LINKED';

  const name = document.createElement('p');
  name.className = 'pad-connect-name';
  const short = controllerName.length > 28 ? controllerName.slice(0, 26) + '…' : controllerName;
  name.textContent = short;

  overlay.append(canvas, label, name);
  document.body.appendChild(overlay);

  const g = canvas.getContext('2d');
  if (!g) return;
  g.imageSmoothingEnabled = false;

  let frame = 0;
  const start = performance.now();
  const duration = 2800;

  const drawPad = (pulse: number) => {
    g.clearRect(0, 0, 200, 140);
    const cx = 100;
    const cy = 72;
    const glow = 0.4 + Math.sin(pulse * 8) * 0.35;

    g.fillStyle = `rgba(0, 245, 255, ${glow * 0.25})`;
    g.beginPath();
    g.ellipse(cx, cy, 78, 48, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#1a1a2e';
    g.fillRect(cx - 70, cy - 28, 140, 56);
    g.strokeStyle = '#00f5ff';
    g.lineWidth = 3;
    g.strokeRect(cx - 70, cy - 28, 140, 56);

    g.fillStyle = '#2a2a44';
    g.fillRect(cx - 52, cy - 8, 36, 28);
    g.fillRect(cx + 16, cy - 8, 36, 28);

    g.fillStyle = '#00f5ff';
    g.fillRect(cx - 44, cy + 2, 10, 10);
    g.fillRect(cx - 28, cy + 2, 10, 10);
    g.fillRect(cx + 24, cy + 2, 10, 10);
    g.fillRect(cx + 40, cy + 2, 10, 10);

    g.fillStyle = '#ffe600';
    g.beginPath();
    g.arc(cx - 8, cy + 10, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff3b6b';
    g.beginPath();
    g.arc(cx + 12, cy + 10, 9, 0, Math.PI * 2);
    g.fill();

    const leds = ['#39ff14', '#00f5ff', '#ff00aa', '#ffe600'];
    for (let i = 0; i < 4; i++) {
      const on = Math.sin(pulse * 6 + i * 1.4) > 0.2;
      g.fillStyle = on ? leds[i] : '#222';
      g.fillRect(cx - 58 + i * 12, cy - 22, 8, 4);
    }

    g.fillStyle = '#00f5ff';
    g.font = '10px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillText('P1', cx, cy - 38);
  };

  const tick = (now: number) => {
    frame++;
    const t = (now - start) / 1000;
    drawPad(t);
    if (now - start < duration) {
      requestAnimationFrame(tick);
    } else {
      overlay.classList.add('pad-connect-out');
      setTimeout(() => overlay.remove(), 450);
    }
  };
  requestAnimationFrame(tick);
}
