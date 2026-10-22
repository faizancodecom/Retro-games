import { GENRES, GENRE_COLORS } from '../data/genres';
import { GAME_COUNT } from '../data/registry';
import { isCrtEnabled, setCrtEnabled } from '../app/storage';
import { navigateHome } from '../app/router';
import { subscribePadStatus } from '../app/gamepad';
import { openControllerPanel, updatePadHeaderButton } from './controllerPanel';

export interface HeaderState {
  query: string;
  genre: string;
}

export type HeaderCallback = (state: HeaderState) => void;

let padUnsub: (() => void) | null = null;

export function renderHeader(
  container: HTMLElement,
  state: HeaderState,
  onChange: HeaderCallback,
  onRandom?: () => void
): void {
  padUnsub?.();
  padUnsub = null;

  container.innerHTML = '';
  container.className = 'site-header';

  const top = document.createElement('div');
  top.className = 'header-top';

  const logo = document.createElement('button');
  logo.className = 'logo';
  logo.innerHTML = 'WHY ARE THERE <span>SO MANY</span> GAMES?';
  logo.onclick = () => navigateHome();

  const count = document.createElement('span');
  count.className = 'game-count';
  count.textContent = GAME_COUNT === 1 ? '1 GAME' : `${GAME_COUNT} GAMES`;

  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap';
  const search = document.createElement('input');
  search.className = 'search-input';
  search.type = 'search';
  search.placeholder = 'Search games... flappy, pac, tetris';
  search.value = state.query;
  search.addEventListener('input', () => {
    onChange({ ...state, query: search.value });
  });
  searchWrap.appendChild(search);

  const actions = document.createElement('div');
  actions.className = 'header-actions';

  const padBtn = document.createElement('button');
  padBtn.className = 'btn-retro btn-pad';
  padBtn.type = 'button';
  padBtn.setAttribute('aria-label', 'Controller and key bindings');
  updatePadHeaderButton(padBtn);
  padBtn.onclick = () => openControllerPanel();
  padUnsub = subscribePadStatus(() => updatePadHeaderButton(padBtn));

  const randomBtn = document.createElement('button');
  randomBtn.className = 'btn-retro';
  randomBtn.textContent = 'RANDOM';
  randomBtn.onclick = () => onRandom?.();

  const crtBtn = document.createElement('button');
  crtBtn.className = 'btn-retro';
  crtBtn.textContent = isCrtEnabled() ? 'CRT ON' : 'CRT OFF';
  crtBtn.onclick = () => {
    const next = !isCrtEnabled();
    setCrtEnabled(next);
    document.body.classList.toggle('crt-enabled', next);
    crtBtn.textContent = next ? 'CRT ON' : 'CRT OFF';
  };

  actions.append(padBtn, randomBtn, crtBtn);
  top.append(logo, count, searchWrap, actions);

  const genreBar = document.createElement('div');
  genreBar.className = 'genre-bar';

  const allChip = document.createElement('button');
  allChip.className = `genre-chip${state.genre === 'All' ? ' active' : ''}`;
  allChip.textContent = 'ALL';
  allChip.style.setProperty('--chip-color', '#ffe600');
  allChip.onclick = () => onChange({ ...state, genre: 'All' });
  genreBar.appendChild(allChip);

  for (const genre of GENRES) {
    const chip = document.createElement('button');
    chip.className = `genre-chip${state.genre === genre ? ' active' : ''}`;
    chip.textContent = genre.toUpperCase();
    chip.style.setProperty('--chip-color', GENRE_COLORS[genre]);
    chip.onclick = () => onChange({ ...state, genre });
    genreBar.appendChild(chip);
  }

  container.append(top, genreBar);
}
