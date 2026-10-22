const PREFIX = 'retro-arcade-hs-';

export function getHighScore(slug: string): number {
  const v = localStorage.getItem(PREFIX + slug);
  return v ? parseInt(v, 10) || 0 : 0;
}

export function setHighScore(slug: string, score: number): void {
  const current = getHighScore(slug);
  if (score > current) {
    localStorage.setItem(PREFIX + slug, String(score));
  }
}

export const MAX_LEVEL = 20;

export function isMuted(): boolean {
  return localStorage.getItem('retro-arcade-muted') === '1';
}

export function setMuted(muted: boolean): void {
  localStorage.setItem('retro-arcade-muted', muted ? '1' : '0');
}

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('retro-arcade-state-' + key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem('retro-arcade-state-' + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function isCrtEnabled(): boolean {
  const v = localStorage.getItem('retro-arcade-crt');
  return v === null ? true : v === '1';
}

export function setCrtEnabled(enabled: boolean): void {
  localStorage.setItem('retro-arcade-crt', enabled ? '1' : '0');
}
