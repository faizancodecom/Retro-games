export function renderFooter(container: HTMLElement): void {
  container.innerHTML = '';
  container.className = 'site-footer';

  const inner = document.createElement('div');
  inner.className = 'footer-inner';
  inner.innerHTML = `
    <p class="footer-credits">Created by <strong>Faizan</strong></p>
    <p class="footer-tagline">Why Are There So Many Games? — retro cyber arcade</p>
  `;
  container.appendChild(inner);
}
