import type { EngineType } from '../types';

export const LEVEL_COUNT = 20;

export const LEVEL_NAMES = [
  'ROOKIE', 'CADET', 'SCOUT', 'PILOT', 'DRIVER',
  'FIGHTER', 'HUNTER', 'RAIDER', 'STRIKER', 'ACE',
  'VETERAN', 'ELITE', 'CHAMPION', 'MASTER', 'LEGEND',
  'MYTHIC', 'PHANTOM', 'TITAN', 'OMEGA', 'SUPREME',
] as const;

export interface LevelConfig {
  level: number;
  title: string;
  subtitle: string;
  speed: number;
  goalScore: number;
  spawnMul: number;
  timeMul: number;
  aiMul: number;
}

const TWIST: Record<string, string[]> = {
  default: [
    'Warm-up round', 'Pick up the pace', 'More hazards', 'Tighter timing', 'Double trouble',
    'Speed surge', 'Chaos mode', 'Expert lane', 'Bullet rain', 'No mercy',
    'Night shift', 'Red alert', 'Overload', 'Critical mass', 'Final stretch',
    'Boss energy', 'Ultra fast', 'Insane grid', 'Near impossible', 'Supreme trial',
  ],
  flappy: [
    'Wide skies', 'Narrow gaps', 'Fast pipes', 'Tight corridors', 'Pipe storm',
    'Low altitude', 'Hyperspeed', 'Gap master', 'Bird hell', 'Sky ace',
    'Vertical maze', 'Razor gaps', 'Turbo flap', 'Pipe labyrinth', 'Death zone',
    'Cloud breaker', 'Jet stream', 'Orbital flap', 'Void flyer', 'Sky supreme',
  ],
  pacman: [
    'Slow ghosts', 'More dots', 'Quick ghosts', 'Power hunt', 'Ghost alley',
    'Maze runner', 'Chomp fever', 'Fright night', 'Ghost squad', 'Pellet panic',
    'Corner traps', 'Speed chomp', 'Ghost maze', 'Power rush', 'Haunted halls',
    'Dot king', 'Ghost lord', 'Maze master', 'Spirit storm', 'Pac supreme',
  ],
  shooter: [
    'Light fleet', 'Dense rows', 'Fast drop', 'Spread fire', 'Alien swarm',
    'Tight aim', 'Barrage', 'Elite squad', 'Bullet hell', 'Invasion',
    'Close contact', 'Rapid fire', 'Armada', 'Last stand', 'Orbital raid',
    'Star war', 'Void strike', 'Omega fleet', 'Final wave', 'Space supreme',
  ],
  snake: [
    'Short tail', 'Open grid', 'Wall maze', 'Fast worm', 'Long hunt',
    'Tight turns', 'Speed snake', 'Mega grid', 'Viper run', 'Serpent ace',
    'Double food', 'Rapid grow', 'Trap zone', 'Hyper worm', 'Cobra lane',
    'Neon bite', 'Turbo coil', 'Mega viper', 'Death coil', 'Snake supreme',
  ],
  puzzle: [
    'Easy grid', 'More tiles', 'Timed brain', 'Big board', 'Memory test',
    'Logic rush', 'Pattern pro', 'Tile storm', 'Mind maze', 'Brain ace',
    'Number crunch', 'Color flood', 'Slide master', 'Tile hunt', 'Match pro',
    'Link chain', 'Grid king', 'Puzzle lord', 'Brain burn', 'Logic supreme',
  ],
  war: [
    'Patrol boats', 'More ships', 'Fast shells', 'Fleet line', 'Ocean raid',
    'Missile rain', 'Heavy hulls', 'Air strike', 'Naval ace', 'Torpedo lane',
    'Battle group', 'Iron fleet', 'Sky hunter', 'Deep water', 'War lord',
    'Carrier hunt', 'Storm seas', 'Final fleet', 'Ocean king', 'War supreme',
  ],
  story: [
    'Town tour', 'Route 01', 'Wild grass', 'Rival fight', 'Data cave',
    'New moves', 'Tough wilds', 'Item hunt', 'Boss path', 'Net quest',
    'Elite beasts', 'Deep cave', 'Omega hunt', 'Master quest', 'Legend path',
    'Final rival', 'Omega-X', 'Net saved', 'Hero path', 'Story supreme',
  ],
};

function twists(engine: string, level: number): string {
  const list = TWIST[engine] ?? TWIST.default;
  return list[(level - 1) % list.length];
}

export function getLevelConfig(engine: EngineType | 'default', level: number): LevelConfig {
  const lv = Math.min(LEVEL_COUNT, Math.max(1, level));
  const idx = lv - 1;
  const speed = 1 + idx * 0.12;
  const baseGoal = 30 + lv * 28;

  const goalByEngine: Partial<Record<EngineType, number>> = {
    flappy: lv * 3,
    snake: (4 + lv * 2) * 10,
    tetris: lv * 4 * 100,
    runner: (18 + lv * 6) * 5,
    breakout: 500 + lv * 80,
    shooter: 400 + lv * 120,
    gallery: (8 + lv * 2) * 15,
    frogger: (1 + Math.floor(idx / 4)) * 200,
    whack: 120 + lv * 40,
    war: (2 + lv * 2) * 25,
    zombie: lv * 150,
    asteroids: 300 + lv * 100,
    pong: (3 + Math.floor(idx / 2)) * 50,
    racing: (20 + lv * 4) * 10,
    platformer: lv * 50,
    wanted: lv * 200,
    maze: 400 + lv * 100,
    puzzle: 150 + lv * 60,
    card: 100 + lv * 50,
    chess: lv * 100,
    tictactoe: lv * 80,
    blackjack: 200 + lv * 100,
    dungeon: lv * 75,
    pixelminer: 80 + lv * 45,
    defender: 250 + lv * 90,
    archer: 200 + lv * 70,
    toprace: 500 + lv * 200,
    racecareer: 300 + lv * 150,
    uno: 150 + lv * 80,
    story: lv * 50,
  };

  return {
    level: lv,
    title: LEVEL_NAMES[idx],
    subtitle: twists(engine, lv),
    speed,
    goalScore: goalByEngine[engine as EngineType] ?? baseGoal,
    spawnMul: 1 + idx * 0.065,
    timeMul: Math.max(0.35, 1 - idx * 0.028),
    aiMul: 0.45 + idx * 0.028,
  };
}
