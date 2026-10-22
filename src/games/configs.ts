/* eslint-disable @typescript-eslint/no-explicit-any */

export interface FlappyConfig {
  id: string;
  title: string;
  gravity: number;
  flap: number;
  gap: number;
  speed: number;
  bg: string;
  bird: string;
  pipe: string;
  ground: string;
}

export interface MazeConfig {
  id: string;
  title: string;
  layout: string[];
  playerColor: string;
  ghostColors: string[];
  speed: number;
  powerDuration: number;
}

export interface SnakeConfig {
  id: string;
  title: string;
  speed: number;
  grid: number;
  head: string;
  body: string;
  food: string;
  bg: string;
  walls: boolean;
}

export interface TetrisConfig {
  id: string;
  title: string;
  dropSpeed: number;
  colors: string[];
  bg: string;
}

export interface BreakoutConfig {
  id: string;
  title: string;
  rows: number;
  cols: number;
  ballSpeed: number;
  paddleWidth: number;
  colors: string[];
  bg: string;
}

export interface ShooterConfig {
  id: string;
  title: string;
  rows: number;
  enemySpeed: number;
  fireRate: number;
  playerColor: string;
  enemyColor: string;
  bg: string;
  spread: boolean;
}

export interface RunnerConfig {
  id: string;
  title: string;
  speed: number;
  jumpForce: number;
  gravity: number;
  obstacleRate: number;
  playerColor: string;
  groundColor: string;
  bg: string;
}

export interface PongConfig {
  id: string;
  title: string;
  ballSpeed: number;
  paddleSpeed: number;
  aiDifficulty: number;
  playerColor: string;
  aiColor: string;
  bg: string;
  powerUps: boolean;
}

export interface PuzzleConfig {
  id: string;
  title: string;
  type: 'memory' | '2048' | 'fifteen' | 'connect';
  colors: string[];
  bg: string;
  gridSize: number;
}

export interface PlatformerConfig {
  id: string;
  title: string;
  gravity: number;
  jump: number;
  moveSpeed: number;
  levelSeed: number;
  playerColor: string;
  bg: string;
}

export interface CardConfig {
  id: string;
  title: string;
  type: 'blackjack' | 'war' | 'higher' | 'poker';
  bg: string;
  accent: string;
}

export interface RacingConfig {
  id: string;
  title: string;
  speed: number;
  trafficRate: number;
  lanes: number;
  playerColor: string;
  roadColor: string;
  bg: string;
}

const FLAPPY_NAMES = [
  'Flappy Bird', 'Neon Flap', 'Pipe Racer', 'Sky Diver', 'Cyber Flap',
  'Ocean Flap', 'Lava Flap', 'Ice Flap', 'Storm Flap', 'Pixel Flap',
];
const FLAPPY_BGS = ['#1a1a2e', '#0f3460', '#16213e', '#2d132c', '#1b262c', '#0a3d62', '#4a0e0e', '#2c3e50', '#1a1a40', '#0d1b2a'];
const FLAPPY_BIRDS = ['#ffe600', '#00f5ff', '#ff00aa', '#39ff14', '#ff6b35', '#7b68ee', '#ffd700', '#00ced1', '#ff69b4', '#98fb98'];

export const FLAPPY_CONFIGS: FlappyConfig[] = FLAPPY_NAMES.map((title, i) => ({
  id: `flappy-${i + 1}`,
  title,
  gravity: 520 + i * 15,
  flap: -165 - i * 3,
  gap: 62 - Math.min(i, 4) * 2,
  speed: 95 + i * 8,
  bg: FLAPPY_BGS[i],
  bird: FLAPPY_BIRDS[i],
  pipe: i % 2 ? '#39ff14' : '#00f5ff',
  ground: '#2d2d44',
}));

const MAZE_LAYOUTS = [
  [
    '###################',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '#####.###.#.###.#####',
    '    #.#       #.#    ',
    '#####.# ## ## #.#####',
    '  ........#........  ',
    '#####.# ##### #.#####',
    '    #.#       #.#    ',
    '#####.# ##### #.#####',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#..#.....P.....#..#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.##.###.#.###.##.#',
    '#........#........#',
    '###################',
  ],
  [
    '###################',
    '#.................#',
    '#.###.#.#####.#.###',
    '#.....#...#...#...#',
    '###.#####.#.#####.###',
    '#.......#.#.......#',
    '#.#####.#.#.#####.#',
    '#.....#.....#.....#',
    '###.#.#####.#.#.###',
    '#...#.......#.#...#',
    '#.#.#### ####.#.#.#',
    '#.#.............#.#',
    '#.#.###.#.###.#.#.#',
    '#.....#.#.#.....#.#',
    '#####.#.#.#.#####.#',
    '#.......#.......#.#',
    '#.#############.#.#',
    '#...............#.#',
    '###################',
  ],
];

const MAZE_TITLES = [
  'Pac-Man Advanced', 'Ghost Maze', 'Crystal Caverns', 'Neon Labyrinth', 'Pixel Pursuit',
  'Shadow Maze', 'Power Pellet Pro', 'Maze Master', 'Retro Chase', 'Haunted Halls',
  'Cyber Maze', 'Dot Devourer',
];

export const MAZE_CONFIGS: MazeConfig[] = MAZE_TITLES.map((title, i) => ({
  id: `maze-${i + 1}`,
  title,
  layout: MAZE_LAYOUTS[i % MAZE_LAYOUTS.length].map((row) => row.replace(/P/g, '.').replace(/ /g, '#')),
  playerColor: '#ffe600',
  ghostColors: ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'],
  speed: 70 + i * 4,
  powerDuration: 6 - Math.min(i * 0.2, 2),
}));

const SNAKE_TITLES = [
  'Classic Snake', 'Cyber Worm', 'Neon Serpent', 'Pixel Python', 'Viper Rush',
  'Grid Snake', 'Turbo Worm', 'Shadow Snake', 'Laser Worm', 'Retro Reptile',
];
export const SNAKE_CONFIGS: SnakeConfig[] = SNAKE_TITLES.map((title, i) => ({
  id: `snake-${i + 1}`,
  title,
  speed: 6 + i * 0.5,
  grid: 20,
  head: ['#39ff14', '#00f5ff', '#ff00aa', '#ffe600', '#ff6b35'][i % 5],
  body: '#2ecc71',
  food: '#ff00aa',
  bg: '#0a0a12',
  walls: i % 3 !== 0,
}));

const TETRIS_TITLES = ['Tetris', 'Retro Blocks', 'Neon Stack', 'Pixel Blocks', 'Cyber Stack', 'Block Storm', 'Grid Fall', 'Shape Shift'];
export const TETRIS_CONFIGS: TetrisConfig[] = TETRIS_TITLES.map((title, i) => ({
  id: `tetris-${i + 1}`,
  title,
  dropSpeed: 0.8 - i * 0.05,
  colors: ['#00f5ff', '#ff00aa', '#ffe600', '#39ff14', '#ff6b35', '#7b68ee', '#ffd700'],
  bg: '#0a0a12',
}));

const BREAKOUT_TITLES = ['Breakout', 'Brick Blaster', 'Neon Breaker', 'Pixel Smash', 'Wall Breaker', 'Cyber Bricks', 'Star Breaker', 'Block Raid'];
export const BREAKOUT_CONFIGS: BreakoutConfig[] = BREAKOUT_TITLES.map((title, i) => ({
  id: `breakout-${i + 1}`,
  title,
  rows: 5 + (i % 3),
  cols: 8,
  ballSpeed: 180 + i * 10,
  paddleWidth: 48 - i * 2,
  colors: ['#ff00aa', '#00f5ff', '#ffe600', '#39ff14', '#ff6b35'],
  bg: '#0a0a12',
}));

const SHOOTER_TITLES = [
  'Space Invaders', 'Star Raid', 'Galaxy Strike', 'Neon Invaders', 'Pixel Fleet',
  'Cyber Assault', 'Asteroid Zone', 'Laser Storm', 'Orbital Defense', 'Star Blaster',
  'Void Hunter', 'Plasma Raid',
];
export const SHOOTER_CONFIGS: ShooterConfig[] = SHOOTER_TITLES.map((title, i) => ({
  id: `shooter-${i + 1}`,
  title,
  rows: 3 + (i % 3),
  enemySpeed: 25 + i * 5,
  fireRate: 0.35 - i * 0.01,
  playerColor: '#00f5ff',
  enemyColor: ['#ff00aa', '#39ff14', '#ffe600'][i % 3],
  bg: '#0a0a12',
  spread: i > 5,
}));

const RUNNER_TITLES = [
  'Pixel Run', 'Lava Escape', 'Sky Dash', 'Cyber Runner', 'Neon Sprint',
  'Turbo Dash', 'Night Run', 'Star Runner', 'Block Runner', 'Flash Dash',
];
export const RUNNER_CONFIGS: RunnerConfig[] = RUNNER_TITLES.map((title, i) => ({
  id: `runner-${i + 1}`,
  title,
  speed: 180 + i * 15,
  jumpForce: -280 - i * 5,
  gravity: 900,
  obstacleRate: 1.2 - i * 0.05,
  playerColor: '#ffe600',
  groundColor: '#2d2d44',
  bg: ['#1a1a2e', '#4a0e0e', '#0f3460', '#2d132c'][i % 4],
}));

const PONG_TITLES = ['Pong Classic', 'Hyper Pong', 'Neon Pong', 'Wall Ball', 'Turbo Pong', 'Cyber Paddle'];
export const PONG_CONFIGS: PongConfig[] = PONG_TITLES.map((title, i) => ({
  id: `pong-${i + 1}`,
  title,
  ballSpeed: 160 + i * 15,
  paddleSpeed: 200,
  aiDifficulty: 0.4 + i * 0.08,
  playerColor: '#00f5ff',
  aiColor: '#ff00aa',
  bg: '#0a0a12',
  powerUps: i > 2,
}));

const PUZZLE_SPECS: { title: string; type: PuzzleConfig['type'] }[] = [
  { title: 'Memory Match', type: 'memory' },
  { title: '2048 Retro', type: '2048' },
  { title: '15 Puzzle', type: 'fifteen' },
  { title: 'Color Connect', type: 'connect' },
  { title: 'Brain Blocks', type: 'memory' },
  { title: 'Number Merge', type: '2048' },
  { title: 'Tile Slide Pro', type: 'fifteen' },
  { title: 'Dot Link', type: 'connect' },
  { title: 'Match Rush', type: 'memory' },
  { title: 'Merge Pro', type: '2048' },
  { title: 'Slide Quest', type: 'fifteen' },
  { title: 'Link Burst', type: 'connect' },
];
export const PUZZLE_CONFIGS: PuzzleConfig[] = PUZZLE_SPECS.map((s, i) => ({
  id: `puzzle-${i + 1}`,
  title: s.title,
  type: s.type,
  colors: ['#00f5ff', '#ff00aa', '#ffe600', '#39ff14'],
  bg: '#0a0a12',
  gridSize: 4 + (i % 2),
}));

const PLATFORM_TITLES = [
  'Jump Quest', 'Coin Cave', 'Spike Tower', 'Neon Jump', 'Pixel Platform',
  'Sky Hopper', 'Lava Leap', 'Cyber Climb',
];
export const PLATFORMER_CONFIGS: PlatformerConfig[] = PLATFORM_TITLES.map((title, i) => ({
  id: `platformer-${i + 1}`,
  title,
  gravity: 520,
  jump: -220 - i * 5,
  moveSpeed: 100 + i * 5,
  levelSeed: i + 1,
  playerColor: '#ffe600',
  bg: '#1a1a2e',
}));

const CARD_TITLES = ['Blackjack', 'Card War', 'Higher or Lower', 'Pixel Poker', 'Neon 21', 'Cyber War'];
export const CARD_CONFIGS: CardConfig[] = CARD_TITLES.map((title, i) => ({
  id: `card-${i + 1}`,
  title,
  type: (['blackjack', 'war', 'higher', 'poker', 'blackjack', 'war'] as const)[i],
  bg: '#0d2818',
  accent: '#ffd700',
}));

const RACING_TITLES = [
  'Lane Racer', 'Night Drive', 'Turbo Grid', 'Neon Highway', 'Pixel Racer',
  'Cyber Drive', 'Speed Lane', 'Retro Road',
];
export const RACING_CONFIGS: RacingConfig[] = RACING_TITLES.map((title, i) => ({
  id: `racing-${i + 1}`,
  title,
  speed: 120 + i * 20,
  trafficRate: 1.5 - i * 0.08,
  lanes: 3,
  playerColor: '#ff0000',
  roadColor: '#333',
  bg: '#0a0a12',
}));

export function getFlappyConfig(id: string): FlappyConfig {
  return FLAPPY_CONFIGS.find((c) => c.id === id) ?? FLAPPY_CONFIGS[0];
}
export function getMazeConfig(id: string): MazeConfig {
  return MAZE_CONFIGS.find((c) => c.id === id) ?? MAZE_CONFIGS[0];
}
export function getSnakeConfig(id: string): SnakeConfig {
  return SNAKE_CONFIGS.find((c) => c.id === id) ?? SNAKE_CONFIGS[0];
}
export function getTetrisConfig(id: string): TetrisConfig {
  return TETRIS_CONFIGS.find((c) => c.id === id) ?? TETRIS_CONFIGS[0];
}
export function getBreakoutConfig(id: string): BreakoutConfig {
  return BREAKOUT_CONFIGS.find((c) => c.id === id) ?? BREAKOUT_CONFIGS[0];
}
export function getShooterConfig(id: string): ShooterConfig {
  return SHOOTER_CONFIGS.find((c) => c.id === id) ?? SHOOTER_CONFIGS[0];
}
export function getRunnerConfig(id: string): RunnerConfig {
  return RUNNER_CONFIGS.find((c) => c.id === id) ?? RUNNER_CONFIGS[0];
}
export function getPongConfig(id: string): PongConfig {
  return PONG_CONFIGS.find((c) => c.id === id) ?? PONG_CONFIGS[0];
}
export function getPuzzleConfig(id: string): PuzzleConfig {
  return PUZZLE_CONFIGS.find((c) => c.id === id) ?? PUZZLE_CONFIGS[0];
}
export function getPlatformerConfig(id: string): PlatformerConfig {
  return PLATFORMER_CONFIGS.find((c) => c.id === id) ?? PLATFORMER_CONFIGS[0];
}
export function getCardConfig(id: string): CardConfig {
  return CARD_CONFIGS.find((c) => c.id === id) ?? CARD_CONFIGS[0];
}
export function getRacingConfig(id: string): RacingConfig {
  return RACING_CONFIGS.find((c) => c.id === id) ?? RACING_CONFIGS[0];
}
