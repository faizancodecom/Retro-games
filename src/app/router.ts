export type Route =
  | { name: 'home' }
  | { name: 'war' }
  | { name: 'game'; slug: string };

type Listener = (route: Route) => void;

let listeners: Listener[] = [];

function parseHash(): Route {
  const hash = location.hash.slice(1) || '/';
  if (hash === '/war') return { name: 'war' };
  const gameMatch = hash.match(/^\/game\/([^/]+)$/);
  if (gameMatch) return { name: 'game', slug: decodeURIComponent(gameMatch[1]) };
  return { name: 'home' };
}

export function getRoute(): Route {
  return parseHash();
}

export function navigateHome(): void {
  location.hash = '#/';
}

export function navigateWar(): void {
  location.hash = '#/war';
}

export function navigateGame(slug: string): void {
  location.hash = `#/game/${encodeURIComponent(slug)}`;
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function initRouter(): void {
  window.addEventListener('hashchange', () => {
    const route = parseHash();
    listeners.forEach((l) => l(route));
  });
}
