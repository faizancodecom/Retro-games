import type { GameDefinition } from '../types';
import { GENRE_COLORS } from '../data/genres';
import { navigateGame } from '../app/router';
import { drawThumbnail } from './thumbnails';

const PAGE_SIZE = 24;

export function renderGameGrid(
  container: HTMLElement,
  games: GameDefinition[],
  page: number,
  onPageChange: (page: number) => void
): void {
  container.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const slice = games.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const info = document.createElement('p');
  info.className = 'results-info';
  info.textContent =
    games.length === 0
      ? 'NO GAMES FOUND — TRY ANOTHER SEARCH'
      : `SHOWING ${slice.length} OF ${games.length} GAMES`;
  container.appendChild(info);

  const grid = document.createElement('div');
  grid.className = 'game-grid';

  for (const game of slice) {
    const card = document.createElement('article');
    card.className = 'game-card';
    card.style.setProperty('--card-accent', GENRE_COLORS[game.genre]);

    const thumb = document.createElement('canvas');
    thumb.className = 'card-thumb';
    drawThumbnail(thumb, game);

    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = game.title;
    const genre = document.createElement('span');
    genre.className = 'card-genre';
    genre.textContent = game.genre;
    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = game.description;

    body.append(title, genre, desc);
    card.append(thumb, body);
    card.onclick = () => navigateGame(game.slug);
    grid.appendChild(card);
  }

  container.appendChild(grid);

  if (totalPages > 1) {
    const pag = document.createElement('div');
    pag.className = 'pagination';
    if (currentPage > 0) {
      const prev = document.createElement('button');
      prev.className = 'btn-retro';
      prev.textContent = '◀ PREV';
      prev.onclick = () => onPageChange(currentPage - 1);
      pag.appendChild(prev);
    }
    const label = document.createElement('span');
    label.style.color = '#888';
    label.textContent = ` PAGE ${currentPage + 1} / ${totalPages} `;
    pag.appendChild(label);
    if (currentPage < totalPages - 1) {
      const next = document.createElement('button');
      next.className = 'btn-retro';
      next.textContent = 'NEXT ▶';
      next.onclick = () => onPageChange(currentPage + 1);
      pag.appendChild(next);
    }
    container.appendChild(pag);
  }
}
