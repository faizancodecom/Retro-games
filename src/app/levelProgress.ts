import { MAX_LEVEL } from './storage';

const UNLOCK_PREFIX = 'retro-arcade-lv-unlock-';
const PLAY_PREFIX = 'retro-arcade-lv-play-';

/** Highest level the player has unlocked (can play 1 … unlocked). */
export function getUnlockedLevel(slug: string): number {
  const v = localStorage.getItem(UNLOCK_PREFIX + slug);
  const n = v ? parseInt(v, 10) : 1;
  return Math.min(MAX_LEVEL, Math.max(1, n || 1));
}

/** Currently selected play level (never above unlocked). */
export function getPlayLevel(slug: string): number {
  const v = localStorage.getItem(PLAY_PREFIX + slug);
  const play = v ? parseInt(v, 10) : 1;
  const unlocked = getUnlockedLevel(slug);
  return Math.min(unlocked, Math.max(1, play || 1));
}

export function setPlayLevel(slug: string, level: number): void {
  const unlocked = getUnlockedLevel(slug);
  const n = Math.min(unlocked, Math.max(1, Math.round(level)));
  localStorage.setItem(PLAY_PREFIX + slug, String(n));
}

/** Call when the player beats the current level — unlocks the next one. */
export function completeLevel(slug: string, completedLevel: number): number {
  const unlocked = getUnlockedLevel(slug);
  if (completedLevel !== unlocked || unlocked >= MAX_LEVEL) return unlocked;
  const next = unlocked + 1;
  localStorage.setItem(UNLOCK_PREFIX + slug, String(next));
  return next;
}

/** @deprecated use getPlayLevel */
export function getGameLevel(slug: string): number {
  return getPlayLevel(slug);
}

/** @deprecated use setPlayLevel — capped to unlocked */
export function setGameLevel(slug: string, level: number): void {
  setPlayLevel(slug, level);
}
