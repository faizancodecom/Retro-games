import type { GameDefinition } from '../types';

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (t.includes(q)) return true;
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

export function filterGames(
  games: GameDefinition[],
  query: string,
  genre: string | null
): GameDefinition[] {
  const q = query.trim();
  return games.filter((g) => {
    if (genre && genre !== 'All' && g.genre !== genre) return false;
    if (!q) return true;
    const haystack = [g.title, g.slug, g.genre, g.description, ...g.tags].join(' ');
    return fuzzyMatch(haystack, q);
  });
}
