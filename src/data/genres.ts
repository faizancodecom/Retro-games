import type { Genre } from '../types';

export const GENRES: Genre[] = [
  'Arcade',
  'Puzzle',
  'Action',
  'Shooter',
  'Sports',
  'Racing',
  'Platform',
  'Card',
  'Strategy',
  'Adventure',
];

export const GENRE_COLORS: Record<Genre, string> = {
  Arcade: '#00f5ff',
  Puzzle: '#ffe600',
  Action: '#ff00aa',
  Shooter: '#39ff14',
  Sports: '#ff6b35',
  Racing: '#7b68ee',
  Platform: '#00ced1',
  Card: '#ffd700',
  Strategy: '#da70d6',
  Adventure: '#39ff14',
};
