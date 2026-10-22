import './styles/theme.css';
import './styles/layout.css';
import { initRouter, subscribe, getRoute, navigateGame } from './app/router';
import { filterGames } from './app/search';
import { isCrtEnabled } from './app/storage';
import { GAMES, getGameBySlug } from './data/registry';
import { renderHeader, type HeaderState } from './ui/header';
import { renderGameGrid } from './ui/gameGrid';
import { renderGamePlayer, stopActiveEngine } from './ui/gamePlayer';
import { renderFooter } from './ui/footer';
import { initGamepad } from './app/gamepad';
import { playGameSfx } from './app/gameSfx';

const app = document.querySelector<HTMLDivElement>('#app')!;
const headerEl = document.createElement('header');
const mainEl = document.createElement('main');
const footerEl = document.createElement('footer');
mainEl.className = 'main-content';

let headerState: HeaderState = { query: '', genre: 'All' };
let page = 0;

document.body.classList.toggle('crt-enabled', isCrtEnabled());

function showPadToast(name: string): void {
  const existing = document.querySelector('.pad-toast');
  existing?.remove();
  const t = document.createElement('div');
  t.className = 'pad-toast';
  t.textContent = `Controller: ${name.length > 24 ? name.slice(0, 22) + '…' : name}`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('pad-toast-out'), 2200);
  setTimeout(() => t.remove(), 2800);
}

function getFilteredGames() {
  return filterGames(GAMES, headerState.query, headerState.genre);
}

function renderWarPage(): void {
  stopActiveEngine();
  mainEl.innerHTML = '';
  mainEl.className = 'main-content war-page-root';

  const banner = document.createElement('section');
  banner.className = 'war-hero';
  banner.innerHTML = `
    <h1>OCEAN WAR</h1>
    <p>Fly your fighter over the open ocean. Fire missiles at enemy warships and dodge their barrage. Clear the fleet to unlock the next level!</p>
    <button type="button" class="btn-retro" id="war-home-btn">◀ ALL GAMES</button>
  `;
  mainEl.appendChild(banner);
  banner.querySelector('#war-home-btn')?.addEventListener('click', () => {
    location.hash = '#/';
  });

  const host = document.createElement('div');
  host.id = 'war-player-host';
  mainEl.appendChild(host);

  const game = getGameBySlug('ocean-war');
  if (game) void renderGamePlayer(host, game);
  else host.innerHTML = '<p class="not-found">Ocean War failed to load.</p>';
}

function renderHome(): void {
  stopActiveEngine();
  mainEl.innerHTML = '';

  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.innerHTML = `
    <h1>WHY ARE THERE SO MANY GAMES?</h1>
    <p>Cyber-night arcade — Story RPG, Pac-Man, Tetris, racers, puzzles & more. 20 levels each, full gamepad support.</p>
  `;
  mainEl.appendChild(hero);

  const gridHost = document.createElement('div');
  gridHost.id = 'game-grid-host';
  mainEl.appendChild(gridHost);

  const games = getFilteredGames();
  renderGameGrid(gridHost, games, page, (p) => {
    page = p;
    renderHome();
  });
}

function render(): void {
  const route = getRoute();
  renderHeader(
    headerEl,
    headerState,
    (s) => {
      headerState = s;
      page = 0;
      render();
    },
    () => {
      const games = getFilteredGames();
      const pick = games[Math.floor(Math.random() * games.length)] ?? GAMES[0];
      navigateGame(pick.slug);
    }
  );

  if (route.name === 'home') {
    mainEl.className = 'main-content';
    renderHome();
  } else if (route.name === 'war') {
    renderWarPage();
  } else {
    mainEl.className = 'main-content';
    const game = getGameBySlug(route.slug);
    mainEl.innerHTML = '';
    if (!game) {
      mainEl.innerHTML = `<div class="not-found">GAME NOT FOUND: ${route.slug}<br><br><button class="btn-retro" id="go-home">GO HOME</button></div>`;
      mainEl.querySelector('#go-home')?.addEventListener('click', () => {
        location.hash = '#/';
      });
    } else {
      void renderGamePlayer(mainEl, game);
    }
  }
}

app.append(headerEl, mainEl, footerEl);
renderFooter(footerEl);
initRouter();
initGamepad((name) => {
  playGameSfx('pad');
  showPadToast(name);
});
subscribe(() => render());
render();
