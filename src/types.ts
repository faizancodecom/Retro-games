export type EngineType =
  | 'flappy'
  | 'maze'
  | 'pacman'
  | 'wanted'
  | 'tictactoe'
  | 'blackjack'
  | 'uno'
  | 'racecareer'
  | 'chess'
  | 'gallery'
  | 'zombie'
  | 'asteroids'
  | 'frogger'
  | 'whack'
  | 'story'
  | 'pixelminer'
  | 'dungeon'
  | 'defender'
  | 'archer'
  | 'toprace'
  | 'war'
  | 'snake'
  | 'tetris'
  | 'breakout'
  | 'shooter'
  | 'runner'
  | 'pong'
  | 'puzzle'
  | 'platformer'
  | 'card'
  | 'racing'

export type Genre =
  | 'Arcade'
  | 'Puzzle'
  | 'Action'
  | 'Shooter'
  | 'Sports'
  | 'Racing'
  | 'Platform'
  | 'Card'
  | 'Strategy'
  | 'Adventure';

export interface GameDefinition {
  slug: string;
  title: string;
  genre: Genre;
  tags: string[];
  engine: EngineType;
  configId: string;
  description: string;
}

export interface GameEngine {
  start(): void;
  stop(): void;
  restart(): void;
  setMuted(muted: boolean): void;
  getScore(): number;
  handlePointer?(x: number, y: number): void;
}

export interface EngineContext {
  canvas: HTMLCanvasElement;
  configId: string;
  slug: string;
  engineType?: EngineType;
  level?: number;
  onScoreChange: (score: number) => void;
  onGameOver: (score: number) => void;
  /** Fired when the player beats the current level objective (unlocks next). */
  onLevelComplete?: (level: number) => void;
}
